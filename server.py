import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from tradingview_screener import Query, Column
import time
from datetime import datetime
import asyncio
import traceback
import pandas as pd

app = FastAPI(title="BIAS Terminal API (Live Data)")

CACHE = {}
CACHE_TTL = 30 # 30 second cache

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
async def run_backtest(ticker: str = "AAPL", strategy: str = "bollinger", timeframe: str = "1d"):
    try:
        from tradingview_mcp.core.services.backtest_service import walk_forward_backtest
        res = await asyncio.to_thread(walk_forward_backtest, ticker, strategy, interval=timeframe)
        
        return {
            "ticker": res.get("symbol", ticker),
            "strategy": res.get("strategy_label", strategy),
            "roi": f"{res.get('avg_test_return_pct', 0):.1f}%",
            "sharpe_ratio": round(res.get('oos_sharpe_ratio', 0), 1),
            "max_drawdown": f"{res.get('oos_max_drawdown_pct', 0):.1f}%",
            "total_trades": res.get('oos_total_trades', 0),
            "verdict": res.get("verdict", "UNKNOWN").split(" ")[0] # extract just the first word e.g. "OVERFITTED"
        }
    except Exception as e:
        print(f"Error in backtest: {e}")
        return {
            "ticker": ticker,
            "strategy": strategy,
            "roi": "ERR",
            "sharpe_ratio": "--",
            "max_drawdown": "--",
            "total_trades": 0,
            "verdict": "ERROR"
        }

OPTIONS_TTL = 60

@app.get("/api/options/analytics")
async def get_options_analytics(ticker: str = "SPY", expiry: str | None = None):
    from options_engine import options_analytics
    ticker = ticker.upper().strip()
    cache_key = f"opt_{ticker}_{expiry}"
    if cache_key in CACHE and time.time() - CACHE[cache_key]["time"] < OPTIONS_TTL:
        return CACHE[cache_key]["data"]
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
import os
import urllib.request
import json

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

@app.get("/api/market-data/bars")
async def get_market_bars(symbol: str = "SPY", timeframe: str = "5Min", limit: int = 1000):
    creds = get_alpaca_creds()
    symbol = symbol.upper().strip()
    
    from datetime import datetime, timedelta, timezone
    now_utc = datetime.now(timezone.utc)
    lookback_days = {
        "1m": 7,        # 7 days of 1-minute bars
        "1min": 7,
        "5m": 30,       # 30 days of 5-minute bars
        "5min": 30,
        "15m": 60,      # 60 days of 15-minute bars
        "15min": 60,
        "1h": 180,      # 180 days of hourly bars
        "1hour": 180,
        "1d": 730,      # 2 full years of daily candles
        "1day": 730,
        "1w": 1825,     # 5 years of weekly candles
        "1week": 1825
    }.get(timeframe.lower(), 15)
    start_dt = (now_utc - timedelta(days=lookback_days)).strftime("%Y-%m-%d")
    
    # Try Alpaca real-time SIP bars first
    if creds["key"] and creds["secret"]:
        def _fetch_alpaca():
            tf_map = {
                "1m": "1Min", "1min": "1Min", "5m": "5Min", "5min": "5Min",
                "15m": "15Min", "15min": "15Min", "1h": "1Hour", "1hour": "1Hour",
                "1d": "1Day", "1day": "1Day", "1w": "1Week", "1week": "1Week"
            }
            tf = tf_map.get(timeframe.lower(), "5Min")
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
                bars.reverse() # Sort chronologically past -> present
                formatted = []
                for b in bars:
                    # Convert ISO timestamp to unix epoch in seconds
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
            
    # Fallback to yfinance if Alpaca fails or has no data
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
    ticker = ticker.upper().strip()
    cache_key = f"mtf_{ticker}"
    if cache_key in CACHE and time.time() - CACHE[cache_key]["time"] < 60:
        return CACHE[cache_key]["data"]

    def _calc_mtf():
        import yfinance as yf
        tk = yf.Ticker(ticker)
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
    if not creds["key"] or not creds["secret"]:
        return {"error": "Missing credentials"}
        
    def _fetch():
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
        raw = await asyncio.to_thread(_fetch)
        tape = {}
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
        return {"tape": tape, "time": time.time()}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/alpaca/quote")
async def get_alpaca_quote(symbol: str = "SPY"):
    creds = get_alpaca_creds()
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
    symbol = symbol.upper().strip()
    if not creds["key"] or not creds["secret"]:
        return {"symbol": symbol, "blocks": []}

    def _fetch_trades():
        url = f"https://data.alpaca.markets/v2/stocks/{symbol}/trades?limit=100&sort=desc"
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
        trades = raw.get("trades", [])
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
                    "symbol": symbol,
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

    def _submit_order():
        base = creds["base"].rstrip("/")
        url = f"{base}/v2/orders"
        body = {
            "symbol": req_body.symbol.upper(),
            "qty": str(req_body.qty),
            "side": req_body.side.lower(),
            "type": "limit",
            "time_in_force": "day",
            "limit_price": str(round(req_body.limit_price, 2)),
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

if __name__ == "__main__":
    print("Starting LIVE B.I.A.S. Terminal API on port 8000...")
    uvicorn.run(app, host="127.0.0.1", port=8000)
