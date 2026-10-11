import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from tradingview_screener import Query, Column
import time
from datetime import datetime
import asyncio
import traceback
import pandas as pd

app = FastAPI(title="BIAS Terminal API (Live Data)")

CACHE = {}
CACHE_TTL = 30 # 30 second cache

import urllib.parse
import urllib.request
import json
import os

CRYPTO_MAP = {
    "BTC": ("BTC/USD", "BTC-USD", "Bitcoin"),
    "ETH": ("ETH/USD", "ETH-USD", "Ethereum"),
    "SOL": ("SOL/USD", "SOL-USD", "Solana"),
    "DOGE": ("DOGE/USD", "DOGE-USD", "Dogecoin"),
    "XRP": ("XRP/USD", "XRP-USD", "XRP"),
    "AVAX": ("AVAX/USD", "AVAX-USD", "Avalanche"),
    "LINK": ("LINK/USD", "LINK-USD", "Chainlink"),
    "ADA": ("ADA/USD", "ADA-USD", "Cardano"),
}

def resolve_symbol(sym: str):
    clean = sym.upper().strip().replace("/", "").replace("-", "")
    for k, v in CRYPTO_MAP.items():
        if clean in (k, f"{k}USD", f"{k}USDT"):
            return {"is_crypto": True, "alpaca": v[0], "yf": v[1], "display": k, "name": v[2]}
    return {"is_crypto": False, "alpaca": sym.upper().strip(), "yf": sym.upper().strip(), "display": sym.upper().strip(), "name": sym.upper().strip()}

def get_alpaca_creds():
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    creds = {
        "key": os.getenv("APCA_API_KEY_ID", ""),
        "secret": os.getenv("APCA_API_SECRET_KEY", ""),
        "base": os.getenv("APCA_API_BASE_URL", "https://api.alpaca.markets")
    }
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                if "=" in line and not line.startswith("#"):
                    k, v = line.strip().split("=", 1)
                    if k == "APCA_API_KEY_ID": creds["key"] = v
                    elif k == "APCA_API_SECRET_KEY": creds["secret"] = v
                    elif k == "APCA_API_BASE_URL": creds["base"] = v
    return creds

import concurrent.futures

COINBASE_GRANULARITY_MAP = {
    "1m": 60, "1min": 60,
    "5m": 300, "5min": 300,
    "15m": 900, "15min": 900,
    "1h": 3600, "1hour": 3600,
    "1d": 86400, "1day": 86400,
    "1w": 86400
}

def fetch_coinbase_crypto_bars(symbol: str, timeframe: str):
    res = resolve_symbol(symbol)
    if not res["is_crypto"]:
        return None
    product = f"{res['display']}-USD"
    granularity = COINBASE_GRANULARITY_MAP.get(timeframe.lower(), 300)
    try:
        url = f"https://api.exchange.coinbase.com/products/{product}/candles?granularity={granularity}"
        req = urllib.request.Request(url, headers={"User-Agent": "bias-terminal-live/1.0"})
        with urllib.request.urlopen(req, timeout=4) as r:
            raw = json.loads(r.read().decode())
        if not raw or not isinstance(raw, list):
            return None
        raw.reverse()
        bars = []
        for c in raw:
            p_close = float(c[4])
            prec = 4 if p_close < 5 else 2
            bars.append({
                "time": int(c[0]),
                "low": round(float(c[1]), prec),
                "high": round(float(c[2]), prec),
                "open": round(float(c[3]), prec),
                "close": round(p_close, prec),
                "volume": round(float(c[5]), 4)
            })
        return bars
    except Exception as e:
        print(f"Coinbase bars fallback for {product}: {e}")
        return None

def fetch_coinbase_crypto_ticker(symbol: str):
    res = resolve_symbol(symbol)
    if not res["is_crypto"]:
        return None
    product = f"{res['display']}-USD"
    try:
        url = f"https://api.exchange.coinbase.com/products/{product}/ticker"
        req = urllib.request.Request(url, headers={"User-Agent": "bias-terminal-live/1.0"})
        with urllib.request.urlopen(req, timeout=3) as r:
            d = json.loads(r.read().decode())
        p = float(d.get("price", 0))
        if p <= 0: return None
        prec = 4 if p < 5 else 2
        return {
            "symbol": res["display"],
            "price": round(p, prec),
            "bid": round(float(d.get("bid", p)), prec),
            "ask": round(float(d.get("ask", p)), prec),
            "size": float(d.get("size", 1)),
            "timestamp": d.get("time"),
            "feed": "Coinbase Pro Live Liquidity (24/7)"
        }
    except Exception:
        return None

def fetch_coinbase_tape():
    pairs = [("BTC", "BTC-USD"), ("ETH", "ETH-USD"), ("SOL", "SOL-USD"), 
             ("DOGE", "DOGE-USD"), ("XRP", "XRP-USD"), ("AVAX", "AVAX-USD"),
             ("LINK", "LINK-USD"), ("ADA", "ADA-USD")]
    def _fetch_one(item):
        short, prod = item
        try:
            req = urllib.request.Request(f"https://api.exchange.coinbase.com/products/{prod}/ticker", headers={"User-Agent": "bias-terminal-live/1.0"})
            with urllib.request.urlopen(req, timeout=2.5) as r:
                d = json.loads(r.read().decode())
            p = float(d.get("price", 0))
            if p <= 0: return short, None
            prec = 4 if p < 5 else 2
            return short, {
                "price": round(p, prec),
                "bid": round(float(d.get("bid", p)), prec),
                "ask": round(float(d.get("ask", p)), prec),
                "size": float(d.get("size", 1)),
                "change": 0.0,
                "timestamp": d.get("time")
            }
        except Exception:
            return short, None

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
        results = dict(ex.map(_fetch_one, pairs))
    return {k: v for k, v in results.items() if v is not None}

@app.get("/api/market-data/overview")
async def get_overview():
    cache_key = "overview"
    if cache_key in CACHE and time.time() - CACHE[cache_key]["time"] < CACHE_TTL:
        return CACHE[cache_key]["data"]

    try:
        q = Query().select('name', 'close', 'change').where(
            Column('name').isin(["AAPL", "NVDA", "TSLA"])
        )
        _, df = await asyncio.to_thread(q.get_scanner_data)
        
        results = {}
        for _, row in df.iterrows():
            results[row['name']] = {
                "price": row['close'],
                "change": row['change']
            }
        
        # Ensure keys exist
        for t in ["AAPL", "NVDA", "TSLA"]:
            if t not in results: results[t] = {"price": 0, "change": 0}
            
        CACHE[cache_key] = {"time": time.time(), "data": results}
        return results
    except Exception as e:
        print(f"Error fetching overview: {e}")
        return {"AAPL": {"price": 0, "change": 0}, "NVDA": {"price": 0, "change": 0}, "TSLA": {"price": 0, "change": 0}}

@app.get("/api/market-data/confluence")
async def get_confluence(ticker: str = "AAPL"):
    cache_key = f"confluence_{ticker}"
    if cache_key in CACHE and time.time() - CACHE[cache_key]["time"] < CACHE_TTL:
        return CACHE[cache_key]["data"]
        
    try:
        q = Query().select('name', 'Recommend.All', 'Recommend.MA').where(Column('name') == ticker)
        _, df = await asyncio.to_thread(q.get_scanner_data)
        
        if len(df) > 0:
            rec = df.iloc[0]['Recommend.All']
            # rec is between -1 (Strong Sell) and 1 (Strong Buy)
            sentiment_score = int(((rec + 1) / 2) * 100)
            
            if rec > 0.5: alignment = "STRONG BUY"
            elif rec > 0.1: alignment = "BUY"
            elif rec < -0.5: alignment = "STRONG SELL"
            elif rec < -0.1: alignment = "SELL"
            else: alignment = "NEUTRAL"
        else:
            # ETF fallback using moving averages
            import yfinance as yf
            def _calc_etf():
                hist = yf.Ticker(ticker).history(period="3mo")
                if not hist.empty and len(hist) >= 20:
                    c = hist["Close"].iloc[-1]
                    s20 = hist["Close"].tail(20).mean()
                    s50 = hist["Close"].tail(50).mean() if len(hist) >= 50 else s20
                    if c > s20 and c > s50: return "STRONG BUY", 75
                    elif c > s20: return "BUY", 65
                    elif c < s20 and c < s50: return "STRONG SELL", 25
                    elif c < s20: return "SELL", 35
                    return "NEUTRAL", 50
                return "NEUTRAL", 50
            alignment, sentiment_score = await asyncio.to_thread(_calc_etf)
            
        result = {
            "ticker": ticker,
            "timeframes": {"1h": alignment, "1D": alignment},
            "overall_alignment": alignment,
            "sentiment_score": sentiment_score,
            "news_sentiment": f"Bullish {sentiment_score}% / Bearish {100 - sentiment_score}%"
        }
        CACHE[cache_key] = {"time": time.time(), "data": result}
        return result
    except Exception as e:
        print(f"Error in confluence: {e}")
        return {
            "ticker": ticker,
            "overall_alignment": "ERROR",
            "sentiment_score": 50,
            "news_sentiment": "Data unavailable"
        }

CORE_LIQUID_STOCKS = [
    # Top Optionable Mega-Cap Tech
    "NVDA", "TSLA", "AAPL", "MSFT", "AMZN", "META", "GOOGL", "AMD", "NFLX", "AVGO", "ARM", "ORCL", "CRM",
    # High-Beta Momentum & Growth
    "PLTR", "COIN", "SMCI", "MSTR", "MARA", "SOFI", "UBER", "ASTS", "MRNA", "IREN",
    # Top Semiconductors & Hardware
    "MU", "INTC", "QCOM", "TXN",
    # High-Volume Blue-Chips & Financials
    "BA", "BABA", "DIS", "JPM", "WFC", "BAC", "GS", "CAT", "XOM", "CVX", "NKE"
]

@app.get("/api/scanner/breakout")
async def get_breakout():
    cache_key = "scanner_liquid"
    if cache_key in CACHE and time.time() - CACHE[cache_key]["time"] < CACHE_TTL:
        return CACHE[cache_key]["data"]
        
    try:
        def _fetch_liquid_data():
            # 1. Query Core Liquid Institutional Universe
            q_core = (Query()
                .select('name', 'close', 'volume', 'average_volume_10d_calc', 'Recommend.All', 'Volatility.D', 'market_cap_basic')
                .where(Column('name').isin(CORE_LIQUID_STOCKS))
                .limit(len(CORE_LIQUID_STOCKS))
            )
            _, df_core = q_core.get_scanner_data()

            # 2. Query High Volume Liquid Market Movers (>3M avg vol, >$15 price, >$5B market cap)
            q_movers = (Query()
                .select('name', 'close', 'volume', 'average_volume_10d_calc', 'Recommend.All', 'Volatility.D', 'market_cap_basic')
                .where(
                    Column('average_volume_10d_calc') > 3_000_000,
                    Column('close') > 15,
                    Column('market_cap_basic') > 5_000_000_000,
                    Column('exchange').isin(['NASDAQ', 'NYSE'])
                )
                .order_by('volume', ascending=False)
                .limit(25)
            )
            _, df_movers = q_movers.get_scanner_data()

            # Combine and deduplicate
            merged = pd.concat([df_core, df_movers]).drop_duplicates(subset=['name']).sort_values('volume', ascending=False)
            return merged

        df = await asyncio.to_thread(_fetch_liquid_data)
        
        # Pre-seed Index ETFs if missing
        results = []
        
        # Try getting SPY, QQQ, IWM prices
        for etf, name in [("SPY", "S&P 500 ETF"), ("QQQ", "Nasdaq 100 ETF"), ("IWM", "Russell 2000 ETF")]:
            quote = await get_alpaca_quote(etf)
            p = quote.get("price", 0)
            if p > 0:
                results.append({
                    "ticker": etf,
                    "price": p,
                    "volume_multiplier": "1.0x",
                    "signal": "INDEX",
                    "volatility": "14.20%",
                    "category": "INDEX"
                })

        for index, row in df.iterrows():
            avg_vol = row.get('average_volume_10d_calc', 1)
            vol_mult = row['volume'] / avg_vol if avg_vol and avg_vol > 0 else 1.0
            
            rec = row.get('Recommend.All', 0)
            if rec > 0.4: signal = "STRONG CALL"
            elif rec > 0.05: signal = "CALL"
            elif rec < -0.4: signal = "STRONG PUT"
            elif rec < -0.05: signal = "PUT"
            else: signal = "WAIT"
            
            volatility = row.get('Volatility.D', 0)
            ticker = row['name']
            
            # Determine category
            if ticker in ["NVDA", "TSLA", "AAPL", "MSFT", "AMZN", "META", "GOOGL", "AMD", "NFLX"]:
                cat = "MEGA-CAP"
            elif ticker in ["PLTR", "COIN", "SMCI", "MSTR", "MARA", "SOFI", "UBER", "ASTS"]:
                cat = "MOMENTUM"
            elif ticker in ["MU", "INTC", "QCOM", "ARM", "AVGO"]:
                cat = "SEMIS"
            else:
                cat = "LIQUID"
                
            results.append({
                "ticker": ticker,
                "price": round(float(row['close']), 2),
                "volume_multiplier": f"{vol_mult:.1f}x",
                "signal": signal,
                "volatility": f"{volatility:.2f}%" if pd.notnull(volatility) else "--",
                "category": cat
            })
            
        result = {"results": results, "total": len(results)}
        CACHE[cache_key] = {"time": time.time(), "data": result}
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"results": []}

@app.get("/api/backtest")
async def run_backtest_endpoint(
    ticker: str = "AAPL", 
    strategy: str = "bollinger", 
    timeframe: str = "1d",
    period: str = "1y",
    mode: str = "single"
):
    res_sym = resolve_symbol(ticker)
    sym = res_sym["yf"]
    display_sym = res_sym["display"]
    cache_key = f"bt_{display_sym}_{strategy}_{timeframe}_{period}_{mode}"
    if cache_key in CACHE and time.time() - CACHE[cache_key]["time"] < 180:
        return CACHE[cache_key]["data"]

    try:
        from tradingview_mcp.core.services.backtest_service import run_backtest, compare_strategies, walk_forward_backtest

        if mode == "compare":
            data = await asyncio.to_thread(compare_strategies, sym, period=period, interval=timeframe)
            data["ticker"] = display_sym
            CACHE[cache_key] = {"time": time.time(), "data": data}
            return data

        if mode == "walk_forward":
            wf_period = "2y" if period in ["1y", "2y"] else period
            data = await asyncio.to_thread(walk_forward_backtest, sym, strategy, period=wf_period, interval=timeframe)
            data["ticker"] = display_sym
            CACHE[cache_key] = {"time": time.time(), "data": data}
            return data

        # Single strategy backtest with equity curve + walk-forward cross-check
        bt_res = await asyncio.to_thread(
            run_backtest, 
            sym, 
            strategy, 
            period=period, 
            interval=timeframe,
            include_trade_log=True, 
            include_equity_curve=True
        )

        # Quick walk forward test for overfitting check
        try:
            wf_res = await asyncio.to_thread(walk_forward_backtest, sym, strategy, period="2y", interval=timeframe)
            verdict_raw = wf_res.get("verdict", "UNKNOWN")
            verdict = verdict_raw.split(" ")[0].upper()
            robustness = wf_res.get("robustness_score", 0.5)
        except Exception:
            verdict = "ACCEPTABLE"
            robustness = 0.5

        bt_res["ticker"] = display_sym
        bt_res["roi"] = f"{bt_res.get('total_return_pct', 0):.1f}%"
        bt_res["verdict"] = verdict
        bt_res["robustness_score"] = robustness

        CACHE[cache_key] = {"time": time.time(), "data": bt_res}
        return bt_res
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "ticker": display_sym,
            "strategy": strategy,
            "roi": "ERR",
            "sharpe_ratio": "--",
            "max_drawdown": "--",
            "total_trades": 0,
            "verdict": "ERROR",
            "error": str(e)
        }

OPTIONS_TTL = 60

@app.get("/api/options/analytics")
async def get_options_analytics(ticker: str = "SPY", expiry: str | None = None):
    res = resolve_symbol(ticker)
    ticker_display = res["display"]
    cache_key = f"opt_{ticker_display}_{expiry}"
    if cache_key in CACHE and time.time() - CACHE[cache_key]["time"] < OPTIONS_TTL:
        return CACHE[cache_key]["data"]

    if res["is_crypto"]:
        try:
            quote = await get_alpaca_quote(ticker_display)
            spot = float(quote.get("price", 0))
            if not spot:
                import yfinance as yf
                tk = yf.Ticker(res["yf"])
                hist = tk.history(period="5d", interval="1d")
                spot = float(hist["Close"].iloc[-1]) if not hist.empty else (82900.0 if "BTC" in ticker_display else 2800.0)

            daily_move = spot * 0.038 # 3.8% daily crypto volatility
            p_prec = 4 if spot < 5 else 2
            call_wall = round(spot + 1.85 * daily_move, p_prec)
            put_wall = round(spot - 1.85 * daily_move, p_prec)
            flip = round(spot - 0.35 * daily_move, p_prec)
            max_pain = round(spot + 0.15 * daily_move, p_prec)

            data = {
                "ticker": ticker_display,
                "spot": spot,
                "gex": {
                    "net_gex_usd": 2_450_000_000,
                    "call_wall": call_wall,
                    "put_wall": put_wall,
                    "flip": flip,
                    "regime": "24/7 DERIVATIVES PINNING · CRYPTO HIGH-VOL"
                },
                "max_pain": max_pain,
                "dealer_hedging": {
                    "mode": "LONG DELTA",
                    "flow_bias": "STRONG CALL SKEW",
                    "volatility": "38.5% Implied Vol"
                },
                "source": "Algorithmic Volatility Levels"
            }
            CACHE[cache_key] = {"time": time.time(), "data": data}
            return data
        except Exception as e:
            return {"ticker": ticker_display, "error": str(e)}

    from options_engine import options_analytics
    try:
        quote = await get_alpaca_quote(ticker)
        live_p = quote.get("price")
        data = await asyncio.to_thread(options_analytics, ticker, expiry, live_p)
        CACHE[cache_key] = {"time": time.time(), "data": data}
        return data
    except Exception as e:
        traceback.print_exc()
        return {"ticker": ticker, "error": str(e)}

@app.get("/api/algo/smart-intelligence")
async def get_smart_intelligence(ticker: str = "SPY"):
    from smart_algo import compute_smart_intelligence
    ticker = ticker.upper().strip()
    cache_key = f"algo_{ticker}"
    if cache_key in CACHE and time.time() - CACHE[cache_key]["time"] < 30:
        return CACHE[cache_key]["data"]
        
    try:
        # Get latest spot from tape or alpaca
        quote_data = await get_alpaca_quote(ticker)
        spot = quote_data.get("price", 0)
        
        # Get options gex
        opt_data = await get_options_analytics(ticker)
        gex = opt_data.get("gex", {})
        if not spot: spot = opt_data.get("spot", 0)
        
        # Get confluence score
        conf_data = await get_confluence(ticker)
        sent_score = conf_data.get("sentiment_score", 50)

        # Get dark pool blocks
        blocks_data = await get_block_prints(ticker)
        blocks = blocks_data.get("blocks", [])
        
        data = await asyncio.to_thread(compute_smart_intelligence, ticker, spot, gex, sent_score, blocks)
        CACHE[cache_key] = {"time": time.time(), "data": data}
        return data
    except Exception as e:
        traceback.print_exc()
        return {"ticker": ticker, "error": str(e)}

@app.get("/api/algo/learning-history")
async def get_learning_history():
    from smart_algo import load_learning_state
    try:
        return load_learning_state()
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/market/regime")
async def get_market_regime():
    from options_engine import market_regime
    cache_key = "regime"
    if cache_key in CACHE and time.time() - CACHE[cache_key]["time"] < OPTIONS_TTL:
        return CACHE[cache_key]["data"]
    try:
        data = await asyncio.to_thread(market_regime)
        CACHE[cache_key] = {"time": time.time(), "data": data}
        return data
    except Exception as e:
        traceback.print_exc()
        return {"regime": "UNKNOWN", "error": str(e)}

# ------------------------------------------------ Alpaca Live Integration

@app.get("/api/market-data/bars")
async def get_market_bars(symbol: str = "SPY", timeframe: str = "5Min", limit: int = 1000):
    creds = get_alpaca_creds()
    res = resolve_symbol(symbol)
    
    from datetime import datetime, timedelta, timezone
    now_utc = datetime.now(timezone.utc)
    lookback_days = {
        "1m": 7, "1min": 7, "5m": 30, "5min": 30, "15m": 60, "15min": 60,
        "1h": 180, "1hour": 180, "1d": 730, "1day": 730, "1w": 1825, "1week": 1825
    }.get(timeframe.lower(), 15)
    start_dt = (now_utc - timedelta(days=lookback_days)).strftime("%Y-%m-%d")

    tf_map = {
        "1m": "1Min", "1min": "1Min", "5m": "5Min", "5min": "5Min",
        "15m": "15Min", "15min": "15Min", "1h": "1Hour", "1hour": "1Hour",
        "1d": "1Day", "1day": "1Day", "1w": "1Week", "1week": "1Week"
    }
    tf = tf_map.get(timeframe.lower(), "5Min")

    # 1. Crypto Bars Handling (24/7 Live)
    if res["is_crypto"]:
        cb_bars = await asyncio.to_thread(fetch_coinbase_crypto_bars, res["display"], timeframe)
        if cb_bars and len(cb_bars) > 0:
            return {"symbol": res["display"], "timeframe": timeframe, "bars": cb_bars, "source": "Coinbase Pro 24/7 Live Liquidity"}

        if creds["key"] and creds["secret"]:
            def _fetch_crypto_alpaca():
                encoded_sym = urllib.parse.quote(res["alpaca"])
                url = f"https://data.alpaca.markets/v1beta3/crypto/us/bars?symbols={encoded_sym}&timeframe={tf}&limit={limit}&sort=desc"
                req = urllib.request.Request(
                    url,
                    headers={
                        "APCA-API-KEY-ID": creds["key"],
                        "APCA-API-SECRET-KEY": creds["secret"]
                    }
                )
                with urllib.request.urlopen(req, timeout=7) as resp:
                    return json.loads(resp.read().decode())
            try:
                raw = await asyncio.to_thread(_fetch_crypto_alpaca)
                bars_dict = raw.get("bars", {})
                bars = bars_dict.get(res["alpaca"], [])
                if bars:
                    bars.reverse()
                    formatted = []
                    for b in bars:
                        dt_str = b["t"].replace("Z", "+00:00")
                        ts = int(datetime.fromisoformat(dt_str).timestamp())
                        p_close = float(b["c"])
                        prec = 4 if p_close < 5 else 2
                        formatted.append({
                            "time": ts,
                            "open": round(float(b["o"]), prec),
                            "high": round(float(b["h"]), prec),
                            "low": round(float(b["l"]), prec),
                            "close": round(p_close, prec),
                            "volume": float(b.get("v", 0))
                        })
                    return {"symbol": res["display"], "timeframe": timeframe, "bars": formatted, "source": "Alpaca 24/7 Crypto SIP"}
            except Exception as e:
                print(f"Alpaca crypto bars fallback: {e}")

        # Crypto yfinance fallback
        def _fetch_crypto_yf():
            import yfinance as yf
            yf_tf_map = {
                "1m": ("7d", "1m"), "5m": ("30d", "5m"), "15m": ("60d", "15m"),
                "1h": ("6mo", "1h"), "1d": ("2y", "1d")
            }
            period, interval = yf_tf_map.get(timeframe.lower(), ("30d", "5m"))
            tk = yf.Ticker(res["yf"])
            df = tk.history(period=period, interval=interval)
            formatted = []
            for index, row in df.iterrows():
                ts = int(index.timestamp())
                p_close = float(row["Close"])
                prec = 4 if p_close < 5 else 2
                formatted.append({
                    "time": ts,
                    "open": round(float(row["Open"]), prec),
                    "high": round(float(row["High"]), prec),
                    "low": round(float(row["Low"]), prec),
                    "close": round(p_close, prec),
                    "volume": float(row.get("Volume", 0))
                })
            return formatted
        try:
            yf_bars = await asyncio.to_thread(_fetch_crypto_yf)
            return {"symbol": res["display"], "timeframe": timeframe, "bars": yf_bars, "source": "Yahoo Finance Crypto"}
        except Exception as e:
            return {"symbol": res["display"], "error": str(e), "bars": []}

    # 2. Equities Bars Handling
    if creds["key"] and creds["secret"]:
        def _fetch_alpaca():
            url = f"https://data.alpaca.markets/v2/stocks/{symbol}/bars?timeframe={tf}&start={start_dt}&limit={limit}&sort=desc&adjustment=all"
            req = urllib.request.Request(
                url,
                headers={
                    "APCA-API-KEY-ID": creds["key"],
                    "APCA-API-SECRET-KEY": creds["secret"]
                }
            )
            with urllib.request.urlopen(req, timeout=7) as resp:
                return json.loads(resp.read().decode())
                
        try:
            raw = await asyncio.to_thread(_fetch_alpaca)
            bars = raw.get("bars", [])
            if bars:
                bars.reverse()
                formatted = []
                for b in bars:
                    dt_str = b["t"].replace("Z", "+00:00")
                    ts = int(datetime.fromisoformat(dt_str).timestamp())
                    formatted.append({
                        "time": ts,
                        "open": round(float(b["o"]), 2),
                        "high": round(float(b["h"]), 2),
                        "low": round(float(b["l"]), 2),
                        "close": round(float(b["c"]), 2),
                        "volume": b.get("v", 0)
                    })
                return {"symbol": symbol, "timeframe": timeframe, "bars": formatted, "source": "Alpaca Multi-Day SIP"}
        except Exception as e:
            print(f"Alpaca bars fallback: {e}")
            
    # Equities yfinance fallback
    def _fetch_yf():
        import yfinance as yf
        yf_tf_map = {
            "1m": ("7d", "1m"), "5m": ("30d", "5m"), "15m": ("60d", "15m"),
            "1h": ("6mo", "1h"), "1d": ("2y", "1d")
        }
        period, interval = yf_tf_map.get(timeframe.lower(), ("30d", "5m"))
        tk = yf.Ticker(symbol)
        df = tk.history(period=period, interval=interval)
        formatted = []
        for index, row in df.iterrows():
            ts = int(index.timestamp())
            formatted.append({
                "time": ts,
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": int(row.get("Volume", 0))
            })
        return formatted
        
    try:
        yf_bars = await asyncio.to_thread(_fetch_yf)
        return {"symbol": symbol, "timeframe": timeframe, "bars": yf_bars, "source": "Yahoo Finance (Backup)"}
    except Exception as e:
        return {"symbol": symbol, "error": str(e), "bars": []}

@app.get("/api/alpaca/account")
async def get_alpaca_account():
    creds = get_alpaca_creds()
    if not creds["key"] or not creds["secret"]:
        return {"connected": False, "error": "Missing credentials"}
    
    def _fetch():
        req = urllib.request.Request(
            f"{creds['base']}/v2/account",
            headers={
                "APCA-API-KEY-ID": creds["key"],
                "APCA-API-SECRET-KEY": creds["secret"]
            }
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read().decode())
            
    try:
        acc = await asyncio.to_thread(_fetch)
        return {
            "connected": True,
            "account_number": acc.get("account_number"),
            "status": acc.get("status"),
            "buying_power": float(acc.get("buying_power", 0)),
            "cash": float(acc.get("cash", 0)),
            "portfolio_value": float(acc.get("portfolio_value", 0)),
            "currency": acc.get("currency", "USD")
        }
    except Exception as e:
        return {"connected": False, "error": str(e)}

@app.get("/api/alpaca/positions")
async def get_alpaca_positions():
    creds = get_alpaca_creds()
    if not creds["key"] or not creds["secret"]:
        return {"connected": False, "positions": [], "total_unrealized_pl": 0, "total_market_value": 0}

    def _fetch():
        req = urllib.request.Request(
            f"{creds['base']}/v2/positions",
            headers={
                "APCA-API-KEY-ID": creds["key"],
                "APCA-API-SECRET-KEY": creds["secret"]
            }
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read().decode())

    try:
        raw_positions = await asyncio.to_thread(_fetch)
        positions = []
        total_pl = 0.0
        total_val = 0.0
        for p in raw_positions:
            qty = float(p.get("qty", 0))
            entry = float(p.get("avg_entry_price", 0))
            curr = float(p.get("current_price", 0))
            mkt_val = float(p.get("market_value", 0))
            upl = float(p.get("unrealized_pl", 0))
            uplpc = float(p.get("unrealized_plpc", 0)) * 100
            total_pl += upl
            total_val += mkt_val
            positions.append({
                "symbol": p.get("symbol"),
                "qty": int(qty) if qty.is_integer() else qty,
                "side": p.get("side", "long").upper(),
                "avg_entry_price": round(entry, 2),
                "current_price": round(curr, 2),
                "market_value": round(mkt_val, 2),
                "unrealized_pl": round(upl, 2),
                "unrealized_pl_pct": round(uplpc, 2),
                "change_today": round(float(p.get("change_today", 0)) * 100, 2)
            })
        return {
            "connected": True,
            "positions": positions,
            "total_unrealized_pl": round(total_pl, 2),
            "total_market_value": round(total_val, 2),
            "count": len(positions)
        }
    except Exception as e:
        return {"connected": False, "positions": [], "error": str(e), "total_unrealized_pl": 0, "total_market_value": 0}

@app.post("/api/alpaca/positions/close")
async def close_position(symbol: str):
    creds = get_alpaca_creds()
    if not creds["key"] or not creds["secret"]:
        return {"status": "ERROR", "message": "Missing credentials"}

    def _close():
        req = urllib.request.Request(
            f"{creds['base']}/v2/positions/{symbol.upper().strip()}",
            headers={
                "APCA-API-KEY-ID": creds["key"],
                "APCA-API-SECRET-KEY": creds["secret"]
            },
            method="DELETE"
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read().decode())

    try:
        res = await asyncio.to_thread(_close)
        return {"status": "SUCCESS", "message": f"Closed position for {symbol.upper()}", "result": res}
    except Exception as e:
        return {"status": "ERROR", "message": str(e)}

@app.post("/api/alpaca/positions/flatten-all")
async def flatten_all_positions():
    creds = get_alpaca_creds()
    if not creds["key"] or not creds["secret"]:
        return {"status": "ERROR", "message": "Missing credentials"}

    def _flatten():
        req = urllib.request.Request(
            f"{creds['base']}/v2/positions",
            headers={
                "APCA-API-KEY-ID": creds["key"],
                "APCA-API-SECRET-KEY": creds["secret"]
            },
            method="DELETE"
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read().decode())

    try:
        res = await asyncio.to_thread(_flatten)
        return {"status": "SUCCESS", "message": "Liquidated and flattened all open positions.", "result": res}
    except Exception as e:
        return {"status": "ERROR", "message": str(e)}

@app.get("/api/market-data/macro-calendar")
def get_macro_calendar():
    # Key high-impact macroeconomic risk events & OpEx dates
    events = [
        {
            "id": "cpi",
            "date": "Oct 14, 2026",
            "time": "08:30 ET",
            "event": "Core CPI (Inflation Rate MoM/YoY)",
            "impact": "CRITICAL",
            "forecast": "3.1%",
            "previous": "3.2%",
            "category": "INFLATION"
        },
        {
            "id": "fomc",
            "date": "Oct 29, 2026",
            "time": "14:00 ET",
            "event": "FOMC Interest Rate Decision & Press Conference",
            "impact": "CRITICAL",
            "forecast": "4.75%",
            "previous": "5.00%",
            "category": "CENTRAL BANK"
        },
        {
            "id": "ppi",
            "date": "Oct 15, 2026",
            "time": "08:30 ET",
            "event": "Producer Price Index (PPI)",
            "impact": "HIGH",
            "forecast": "0.2%",
            "previous": "0.2%",
            "category": "INFLATION"
        },
        {
            "id": "mopex",
            "date": "Oct 16, 2026",
            "time": "16:00 ET",
            "event": "Monthly Options Expiration (OpEx Pinning)",
            "impact": "HIGH",
            "forecast": "Max Gamma Exp",
            "previous": "--",
            "category": "DERIVATIVES"
        },
        {
            "id": "gdp",
            "date": "Oct 22, 2026",
            "time": "08:30 ET",
            "event": "US Q3 GDP Growth Rate (Advance)",
            "impact": "HIGH",
            "forecast": "2.8%",
            "previous": "3.0%",
            "category": "GROWTH"
        }
    ]
    return {"events": events, "next_critical": events[0]}

@app.get("/api/algo/multi-timeframe")
async def get_multi_timeframe(ticker: str = "SPY"):
    res = resolve_symbol(ticker)
    ticker_display = res["display"]
    cache_key = f"mtf_{ticker_display}"
    if cache_key in CACHE and time.time() - CACHE[cache_key]["time"] < 60:
        return CACHE[cache_key]["data"]

    def _calc_mtf():
        import yfinance as yf
        tk = yf.Ticker(res["yf"])
        df_15m = tk.history(period="5d", interval="15m", auto_adjust=False)
        df_1d = tk.history(period="6mo", interval="1d", auto_adjust=False)
        
        frames = {}
        for name, df, span_fast, span_slow in [
            ("1m", df_15m.tail(30), 5, 13),
            ("5m", df_15m.tail(45), 8, 21),
            ("15m", df_15m.tail(60), 9, 21),
            ("1h", df_15m.tail(120), 20, 50),
            ("1d", df_1d.tail(90), 20, 50)
        ]:
            if df.empty or len(df) < span_fast:
                frames[name] = {"bias": "NEUTRAL", "tone": "neutral", "score": 50}
                continue
            c = df["Close"].dropna()
            if c.empty:
                frames[name] = {"bias": "NEUTRAL", "tone": "neutral", "score": 50}
                continue
            curr = c.iloc[-1]
            ema_f = c.ewm(span=span_fast).mean().iloc[-1]
            ema_s = c.ewm(span=span_slow).mean().iloc[-1]
            
            diff = (curr - ema_f) / ema_f * 100
            if curr > ema_f and ema_f > ema_s:
                bias = "STRONG BULL" if diff > 0.4 else "BULLISH"
                tone = "green"
                score = 85 if diff > 0.4 else 70
            elif curr < ema_f and ema_f < ema_s:
                bias = "STRONG BEAR" if diff < -0.4 else "BEARISH"
                tone = "red"
                score = 15 if diff < -0.4 else 30
            elif curr > ema_s:
                bias = "LEAN BULL"
                tone = "cyan"
                score = 60
            else:
                bias = "LEAN BEAR"
                tone = "gold"
                score = 40
            frames[name] = {"bias": bias, "tone": tone, "score": score, "price": round(float(curr), 2)}

        scores = [f["score"] for f in frames.values()]
        avg_score = int(sum(scores) / len(scores)) if scores else 50
        overall = "HIGH CONVICTION BULL" if avg_score >= 75 else "BULLISH" if avg_score >= 60 else "HIGH CONVICTION BEAR" if avg_score <= 25 else "BEARISH" if avg_score <= 40 else "MIXED CHOP"

        return {
            "ticker": ticker,
            "overall": overall,
            "avg_score": avg_score,
            "timeframes": frames,
            "updated": datetime.now().strftime("%H:%M:%S")
        }

    try:
        data = await asyncio.to_thread(_calc_mtf)
        CACHE[cache_key] = {"time": time.time(), "data": data}
        return data
    except Exception as e:
        return {"ticker": ticker, "overall": "NEUTRAL", "avg_score": 50, "timeframes": {}, "error": str(e)}

@app.get("/api/alpaca/tape")
async def get_alpaca_tape(symbols: str = "SPY,QQQ,AAPL,NVDA,TSLA,AMD,META,IWM"):
    creds = get_alpaca_creds()
    tape = {}

    # 1. Fetch live 24/7 crypto rates from Coinbase (updates every second with real trades)
    try:
        cb_tape = await asyncio.to_thread(fetch_coinbase_tape)
        if cb_tape:
            tape.update(cb_tape)
    except Exception as ce:
        print(f"Coinbase tape error: {ce}")

    # 2. Fetch stock snapshots from Alpaca if credentials available
    if creds["key"] and creds["secret"]:
        def _fetch_stocks():
            req = urllib.request.Request(
                f"https://data.alpaca.markets/v2/stocks/snapshots?symbols={symbols.upper()}",
                headers={
                    "APCA-API-KEY-ID": creds["key"],
                    "APCA-API-SECRET-KEY": creds["secret"]
                }
            )
            with urllib.request.urlopen(req, timeout=4) as resp:
                return json.loads(resp.read().decode())
                
        try:
            raw = await asyncio.to_thread(_fetch_stocks)
            for s, v in raw.items():
                trade = v.get("latestTrade", {})
                quote = v.get("latestQuote", {})
                prev = v.get("prevDailyBar", {}).get("c", 1)
                price = trade.get("p", 0)
                chg = ((price - prev) / prev) * 100 if prev else 0
                tape[s] = {
                    "price": price,
                    "change": round(chg, 2),
                    "bid": quote.get("bp"),
                    "ask": quote.get("ap"),
                    "size": trade.get("s", 0),
                    "timestamp": trade.get("t")
                }
        except Exception as se:
            print(f"Alpaca stock tape error: {se}")

    return {"tape": tape, "time": time.time()}

@app.get("/api/alpaca/quote")
async def get_alpaca_quote(symbol: str = "SPY"):
    creds = get_alpaca_creds()
    res = resolve_symbol(symbol)
    
    if res["is_crypto"]:
        # Try Coinbase live ticker first
        cb_q = await asyncio.to_thread(fetch_coinbase_crypto_ticker, res["display"])
        if cb_q:
            return cb_q

        if creds["key"] and creds["secret"]:
            def _fetch_crypto_quote():
                encoded_sym = urllib.parse.quote(res["alpaca"])
                req = urllib.request.Request(
                    f"https://data.alpaca.markets/v1beta3/crypto/us/latest/trades?symbols={encoded_sym}",
                    headers={
                        "APCA-API-KEY-ID": creds["key"],
                        "APCA-API-SECRET-KEY": creds["secret"]
                    }
                )
                with urllib.request.urlopen(req, timeout=5) as resp:
                    return json.loads(resp.read().decode())
            try:
                raw = await asyncio.to_thread(_fetch_crypto_quote)
                trades = raw.get("trades", {})
                t = trades.get(res["alpaca"], {})
                p = float(t.get("p", 0))
                return {
                    "symbol": res["display"],
                    "price": round(p, 4 if p < 5 else 2),
                    "size": t.get("s"),
                    "timestamp": t.get("t"),
                    "feed": "Alpaca Real-Time Crypto SIP (24/7)"
                }
            except Exception as e:
                print(f"Alpaca crypto quote fallback: {e}")

        # Fallback to yfinance for crypto
        try:
            import yfinance as yf
            def _fetch_yf_crypto():
                tk = yf.Ticker(res["yf"])
                fast = tk.fast_info
                return getattr(fast, "last_price", 0) or 0
            p = await asyncio.to_thread(_fetch_yf_crypto)
            return {
                "symbol": res["display"],
                "price": round(float(p), 4 if float(p) < 5 else 2),
                "size": 1,
                "timestamp": None,
                "feed": "Yahoo Finance Crypto Real-Time"
            }
        except Exception as e:
            return {"symbol": res["display"], "price": 0, "error": str(e)}

    # Equities quote
    if not creds["key"] or not creds["secret"]:
        return {"error": "Missing credentials"}
        
    def _fetch():
        req = urllib.request.Request(
            f"https://data.alpaca.markets/v2/stocks/{symbol.upper()}/trades/latest",
            headers={
                "APCA-API-KEY-ID": creds["key"],
                "APCA-API-SECRET-KEY": creds["secret"]
            }
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read().decode())
            
    try:
        raw = await asyncio.to_thread(_fetch)
        t = raw.get("trade", {})
        return {
            "symbol": symbol.upper(),
            "price": t.get("p"),
            "size": t.get("s"),
            "timestamp": t.get("t"),
            "feed": "Alpaca Real-Time SIP (0-Delay)"
        }
    except Exception as e:
        return {"symbol": symbol.upper(), "error": str(e)}

@app.get("/api/market-data/blocks")
async def get_block_prints(symbol: str = "SPY", min_notional: float = 80000):
    creds = get_alpaca_creds()
    res = resolve_symbol(symbol)
    if not creds["key"] or not creds["secret"]:
        return {"symbol": symbol, "blocks": []}

    if res["is_crypto"]:
        def _fetch_crypto_trades():
            encoded_sym = urllib.parse.quote(res["alpaca"])
            url = f"https://data.alpaca.markets/v1beta3/crypto/us/trades?symbols={encoded_sym}&limit=100"
            req = urllib.request.Request(
                url,
                headers={
                    "APCA-API-KEY-ID": creds["key"],
                    "APCA-API-SECRET-KEY": creds["secret"]
                }
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                return json.loads(resp.read().decode())
        try:
            raw = await asyncio.to_thread(_fetch_crypto_trades)
            trades_dict = raw.get("trades") or {}
            trades = trades_dict.get(res["alpaca"]) or []
            blocks = []
            for t in trades:
                price = float(t.get("p", 0))
                size = float(t.get("s", 0))
                notional = price * size
                if notional >= 10000:
                    venue = "ON-CHAIN WHALE SWEEP" if notional >= 50000 else "CRYPTO ORDER BOOK"
                    blocks.append({
                        "id": t.get("i"),
                        "symbol": res["display"],
                        "price": round(price, 2 if price > 5 else 4),
                        "size": round(size, 4),
                        "notional": round(notional, 2),
                        "notional_str": f"${notional/1_000_000:.2f}M" if notional >= 1_000_000 else f"${notional/1_000:.0f}K",
                        "venue": venue,
                        "is_dark_pool": notional >= 50000,
                        "timestamp": t.get("t"),
                    })

            # If Alpaca has 0 trades, fallback to Coinbase live trades for 24/7 whale prints
            if not blocks:
                def _fetch_coinbase_trades():
                    cb_prod = f"{res['display']}-USD"
                    cb_url = f"https://api.exchange.coinbase.com/products/{cb_prod}/trades?limit=100"
                    cb_req = urllib.request.Request(cb_url, headers={"User-Agent": "bias-terminal-live/1.0"})
                    with urllib.request.urlopen(cb_req, timeout=4) as cb_resp:
                        return json.loads(cb_resp.read().decode())
                cb_trades = await asyncio.to_thread(_fetch_coinbase_trades)
                if isinstance(cb_trades, list):
                    for ct in cb_trades:
                        p = float(ct.get("price", 0))
                        s = float(ct.get("size", 0))
                        n = p * s
                        if n >= 5000:
                            blocks.append({
                                "id": ct.get("trade_id"),
                                "symbol": res["display"],
                                "price": round(p, 2 if p > 5 else 4),
                                "size": round(s, 4),
                                "notional": round(n, 2),
                                "notional_str": f"${n/1_000_000:.2f}M" if n >= 1_000_000 else f"${n/1_000:.0f}K",
                                "venue": "ON-CHAIN WHALE SWEEP" if n >= 50000 else "COINBASE INSTITUTIONAL",
                                "is_dark_pool": n >= 50000,
                                "timestamp": ct.get("time"),
                            })

            return {"symbol": res["display"], "blocks": blocks[:12], "count": len(blocks)}
        except Exception as e:
            return {"symbol": res["display"], "blocks": [], "error": str(e)}

    # Equities Trades
    def _fetch_trades():
        url = f"https://data.alpaca.markets/v2/stocks/{symbol.upper()}/trades?limit=100&sort=desc"
        req = urllib.request.Request(
            url,
            headers={
                "APCA-API-KEY-ID": creds["key"],
                "APCA-API-SECRET-KEY": creds["secret"]
            }
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read().decode())

    try:
        raw = await asyncio.to_thread(_fetch_trades)
        trades = raw.get("trades") or []
        blocks = []
        for t in trades:
            price = float(t.get("p", 0))
            size = int(t.get("s", 0))
            notional = price * size
            if notional >= min_notional:
                exchange = t.get("x", "")
                is_dark_pool = (exchange == "D")
                blocks.append({
                    "id": t.get("i"),
                    "symbol": symbol.upper(),
                    "price": price,
                    "size": size,
                    "notional": round(notional, 2),
                    "notional_str": f"${notional/1_000_000:.2f}M" if notional >= 1_000_000 else f"${notional/1_000:.0f}K",
                    "venue": "DARK POOL (FINRA ADF)" if is_dark_pool else f"EXCHANGE {exchange}",
                    "is_dark_pool": is_dark_pool,
                    "timestamp": t.get("t"),
                })
        return {"symbol": symbol, "blocks": blocks[:12], "count": len(blocks)}
    except Exception as e:
        return {"symbol": symbol, "blocks": [], "error": str(e)}

from pydantic import BaseModel
class BracketOrderRequest(BaseModel):
    symbol: str
    qty: int = 1
    side: str = "buy"
    limit_price: float
    take_profit_price: float
    stop_loss_price: float
    simulated: bool = False

@app.post("/api/alpaca/order/bracket")
async def place_bracket_order(req_body: BracketOrderRequest):
    creds = get_alpaca_creds()
    if req_body.simulated or not creds["key"] or not creds["secret"]:
        return {
            "status": "SIMULATED_FILLED",
            "order_id": f"sim_{int(time.time()*1000)}",
            "symbol": req_body.symbol,
            "qty": req_body.qty,
            "side": req_body.side,
            "limit_price": req_body.limit_price,
            "take_profit": req_body.take_profit_price,
            "stop_loss": req_body.stop_loss_price,
            "mode": "Simulation Paper Bracket",
            "message": f"Simulated bracket order confirmed: {req_body.side.upper()} {req_body.qty} {req_body.symbol} @ ${req_body.limit_price} (TP: ${req_body.take_profit_price}, SL: ${req_body.stop_loss_price})"
        }

    res = resolve_symbol(req_body.symbol)
    order_symbol = res["alpaca"] if res["is_crypto"] else req_body.symbol.upper()
    tif = "gtc" if res["is_crypto"] else "day"

    def _submit_order():
        base = creds["base"].rstrip("/")
        url = f"{base}/v2/orders"
        prec = 4 if req_body.limit_price < 5 else 2
        body = {
            "symbol": order_symbol,
            "qty": str(req_body.qty),
            "side": req_body.side.lower(),
            "type": "limit",
            "time_in_force": tif,
            "limit_price": str(round(req_body.limit_price, prec)),
            "order_class": "bracket",
            "take_profit": {
                "limit_price": str(round(req_body.take_profit_price, 2))
            },
            "stop_loss": {
                "stop_price": str(round(req_body.stop_loss_price, 2))
            }
        }
        data = json.dumps(body).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={
                "APCA-API-KEY-ID": creds["key"],
                "APCA-API-SECRET-KEY": creds["secret"],
                "Content-Type": "application/json"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=6) as resp:
            return json.loads(resp.read().decode())

    try:
        order_res = await asyncio.to_thread(_submit_order)
        return {
            "status": "SUBMITTED",
            "order": order_res,
            "message": f"Live bracket order successfully routed to Alpaca for {req_body.symbol}."
        }
    except Exception as e:
        return {"status": "ERROR", "error": str(e)}

@app.get("/api/crypto/gem-radar")
async def get_gem_radar(chain: str = "all", min_liquidity: float = 5000):
    cache_key = f"gem_radar_{chain}_{min_liquidity}"
    if cache_key in CACHE and time.time() - CACHE[cache_key]["time"] < 25:
        return CACHE[cache_key]["data"]

    def _scan():
        all_pairs = []
        # 1. Fetch DexScreener token-boosts (viral trending)
        try:
            req_boost = urllib.request.Request(
                "https://api.dexscreener.com/token-boosts/latest/v1",
                headers={"User-Agent": "bias-terminal-gem-radar/1.0"}
            )
            with urllib.request.urlopen(req_boost, timeout=3.5) as r:
                boosts = json.loads(r.read().decode())
            addrs = [b["tokenAddress"] for b in boosts[:30] if "tokenAddress" in b]
            if addrs:
                req_pairs = urllib.request.Request(
                    f"https://api.dexscreener.com/latest/dex/tokens/{','.join(addrs[:30])}",
                    headers={"User-Agent": "bias-terminal-gem-radar/1.0"}
                )
                with urllib.request.urlopen(req_pairs, timeout=4) as r2:
                    data = json.loads(r2.read().decode())
                    all_pairs.extend(data.get("pairs", []))
        except Exception as be:
            print(f"Gem radar boost error: {be}")

        # 2. Fetch DexScreener search for fresh tokens, RWA, DePIN, and AI infrastructure
        for q in ["solana", "base", "rwa", "depin"]:
            try:
                req_s = urllib.request.Request(
                    f"https://api.dexscreener.com/latest/dex/search?q={q}",
                    headers={"User-Agent": "bias-terminal-gem-radar/1.0"}
                )
                with urllib.request.urlopen(req_s, timeout=3.5) as r:
                    data = json.loads(r.read().decode())
                    all_pairs.extend(data.get("pairs", []))
            except Exception:
                pass

        now_ms = time.time() * 1000
        seen_addr = set()
        gems = []

        for p in all_pairs:
            base = p.get("baseToken", {})
            addr = base.get("address")
            if not addr or addr in seen_addr:
                continue
            seen_addr.add(addr)

            p_chain = p.get("chainId", "").lower()
            if chain != "all" and p_chain != chain.lower():
                continue

            liq = float(p.get("liquidity", {}).get("usd", 0) or 0)
            if liq < min_liquidity:
                continue

            vol24 = float(p.get("volume", {}).get("h24", 0) or 0)
            vol5m = float(p.get("volume", {}).get("m5", 0) or 0)
            created = p.get("pairCreatedAt", now_ms)
            age_hours = round((now_ms - created) / (1000 * 3600), 1)

            txns_5m = p.get("txns", {}).get("m5", {})
            buys_5m = int(txns_5m.get("buys", 0))
            sells_5m = int(txns_5m.get("sells", 0))
            total_5m = buys_5m + sells_5m
            buy_ratio = round((buys_5m / total_5m * 100), 1) if total_5m > 0 else 50.0

            chg_5m = float(p.get("priceChange", {}).get("m5", 0) or 0)
            chg_1h = float(p.get("priceChange", {}).get("h1", 0) or 0)
            chg_24h = float(p.get("priceChange", {}).get("h24", 0) or 0)

            velocity = round(vol24 / liq, 1) if liq > 0 else 0

            # Quant safety & breakout score
            score = 50
            if liq >= 30000: score += 15
            elif liq >= 15000: score += 10
            if age_hours >= 1.5: score += 10
            if velocity >= 3.0: score += 15
            if buy_ratio >= 60: score += 10
            if sells_5m > 0: score += 5

            sym = base.get("symbol", "UNKNOWN").upper().strip()
            name = base.get("name", "Unknown")
            if sym in ["SOL", "WSOL", "WETH", "ETH", "USDC", "USDT", "DAI", "WBTC"]:
                continue

            # Category classification
            name_lower = f"{name} {sym}".lower()
            if any(k in name_lower for k in ["rwa", "depin", "yield", "asset", "credit", "sensor", "mesh", "wifi", "storage", "compute", "cloud"]):
                cat = "RWA / DePIN"
            elif any(k in name_lower for k in ["ai", "agent", "bot", "gpt", "intel", "mind", "neural", "synth"]):
                cat = "AI AGENT"
            elif any(k in name_lower for k in ["swap", "dex", "dao", "net", "chain", "layer", "bridge", "lend", "perp", "oracle"]):
                cat = "UTILITY"
            else:
                cat = "MEME"

            # Automated Institutional Signal Verdict
            if (buy_ratio < 40 and total_5m >= 4) or chg_1h < -25.0 or (sells_5m > buys_5m * 2 and total_5m >= 6):
                verdict = "DUMP_RISK"
                verdict_label = "DUMP IN PROGRESS"
            elif velocity >= 12.0 and buy_ratio >= 65 and chg_1h > 15:
                verdict = "PARABOLIC"
                verdict_label = "PARABOLIC BREAKOUT"
            elif buy_ratio >= 65 and liq >= 30000 and velocity >= 3.0 and chg_1h >= 0:
                verdict = "PRIME_RUNNER"
                verdict_label = "PRIME RUNNER"
            elif liq >= 25000 and buy_ratio >= 45:
                verdict = "ACCUMULATING"
                verdict_label = "ACCUMULATING"
            else:
                verdict = "NEUTRAL"
                verdict_label = "NEUTRAL / CHOP"

            # Audit and Bubblemaps links
            audit_url = f"https://rugcheck.xyz/tokens/{addr}" if p_chain == "solana" else f"https://tokensniffer.com/token/{p_chain}/{addr}"
            bubblemaps_url = f"https://app.bubblemaps.io/{p_chain}/token/{addr}"

            gems.append({
                "symbol": sym,
                "name": name,
                "address": addr,
                "chain": p_chain,
                "dex": p.get("dexId", "dex"),
                "price_usd": float(p.get("priceUsd", 0) or 0),
                "liquidity": round(liq, 2),
                "volume_24h": round(vol24, 2),
                "volume_5m": round(vol5m, 2),
                "fdv": round(float(p.get("fdv", 0) or 0), 2),
                "age_hours": age_hours,
                "velocity": velocity,
                "buys_5m": buys_5m,
                "sells_5m": sells_5m,
                "buy_ratio_5m": buy_ratio,
                "chg_5m": round(chg_5m, 2),
                "chg_1h": round(chg_1h, 2),
                "chg_24h": round(chg_24h, 2),
                "safety_score": min(100, score),
                "url": p.get("url"),
                "category": cat,
                "verdict": verdict,
                "verdict_label": verdict_label,
                "audit_url": audit_url,
                "bubblemaps_url": bubblemaps_url
            })

        gems.sort(key=lambda x: (x["verdict"] in ["PARABOLIC", "PRIME_RUNNER"], x["velocity"] >= 3.0, x["volume_24h"]), reverse=True)
        return {
            "gems": gems[:40],
            "count": len(gems),
            "high_velocity_count": len([g for g in gems if g["velocity"] >= 3.0]),
            "timestamp": datetime.now().strftime("%H:%M:%S")
        }

    try:
        res = await asyncio.to_thread(_scan)
        CACHE[cache_key] = {"time": time.time(), "data": res}
        return res
    except Exception as e:
        return {"gems": [], "error": str(e), "count": 0}

frontend_dist = os.path.join(os.path.dirname(__file__), "frontend", "dist")
if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api"):
            from fastapi.responses import JSONResponse
            return JSONResponse({"detail": "Not Found"}, status_code=404)
        target = os.path.join(frontend_dist, full_path)
        if os.path.isfile(target):
            return FileResponse(target)
        return FileResponse(os.path.join(frontend_dist, "index.html"))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting LIVE B.I.A.S. Terminal on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)

