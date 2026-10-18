import os
import time
import json
import logging
import urllib.request
import urllib.parse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

logger = logging.getLogger("SolanaDexEngine")

STATE_FILE = os.path.join(os.path.dirname(__file__), "solana_dex_state.json")

SOL_MINT = "So11111111111111111111111111111111111111112"
USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"

# ---- Forensic Anti-Rug Gate thresholds ----
MAX_DEV_HOLDING_PCT = 5.0       # Reject if creator/dev wallet holds > 5% of supply
MAX_TOP10_HOLDING_PCT = 30.0    # Reject if top-10 non-pool wallets hold > 30% of supply
MIN_LP_LOCKED_PCT = 80.0        # Reject if an LP token exists and < 80% is burned/locked
WHALE_TICKET_SOL = 10.0         # Institutional order size threshold (in SOL equivalent)
WHALE_PRIORITY_SCORE = 80       # Auto-sniper prioritizes whale_score >= 80

_FORENSICS_CACHE: Dict[str, Dict[str, Any]] = {}
_FORENSICS_TTL_OK = 600.0       # Authorities/holders change slowly: cache 10 min
_FORENSICS_TTL_ERR = 60.0       # Retry failed lookups after 1 min
_SOL_PRICE_CACHE: Dict[str, float] = {"price": 0.0, "ts": 0.0}


def _http_json(url: str, timeout: float = 8.0) -> Any:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode())


def get_sol_price_usd() -> float:
    """Live SOL/USD from DexScreener (cached 60s). Falls back to last known / conservative default."""
    now = time.time()
    if _SOL_PRICE_CACHE["price"] > 0 and now - _SOL_PRICE_CACHE["ts"] < 60:
        return _SOL_PRICE_CACHE["price"]
    try:
        data = _http_json(f"https://api.dexscreener.com/latest/dex/tokens/{SOL_MINT}", timeout=5)
        for p in data.get("pairs", []) or []:
            if p.get("chainId") == "solana" and p.get("baseToken", {}).get("address") == SOL_MINT:
                px = float(p.get("priceUsd") or 0.0)
                if px > 0:
                    _SOL_PRICE_CACHE.update({"price": px, "ts": now})
                    return px
    except Exception as e:
        logger.warning(f"SOL price fetch error: {e}")
    return _SOL_PRICE_CACHE["price"] or 150.0


def _empty_forensics(source: str, error: str) -> Dict[str, Any]:
    return {
        "forensic_status": "UNVERIFIED",
        "forensic_source": source,
        "forensic_error": error,
        "forensic_failures": [],
        "mint_revoked": None,
        "freeze_revoked": None,
        "lp_burned_pct": None,
        "lp_model": "UNKNOWN",
        "dev_holding_pct": None,
        "top10_holding_pct": None,
    }


def _apply_gates(f: Dict[str, Any]) -> Dict[str, Any]:
    """Evaluate the 5 Forensic Anti-Rug gates and set forensic_status PASSED / FAILED."""
    failures: List[str] = []
    if f.get("mint_revoked") is False:
        failures.append("Mint authority ACTIVE")
    if f.get("freeze_revoked") is False:
        failures.append("Freeze / honeypot risk")
    lp = f.get("lp_burned_pct")
    if lp is not None and lp < MIN_LP_LOCKED_PCT:
        failures.append(f"LP only {lp:.0f}% burned/locked")
    dev = f.get("dev_holding_pct")
    if dev is not None and dev > MAX_DEV_HOLDING_PCT:
        failures.append(f"Dev holds {dev:.1f}%")
    top10 = f.get("top10_holding_pct")
    if top10 is not None and top10 > MAX_TOP10_HOLDING_PCT:
        failures.append(f"Top 10 hold {top10:.1f}%")
    f["forensic_failures"] = failures
    if failures:
        f["forensic_status"] = "FAILED"
    elif f.get("mint_revoked") is None or f.get("freeze_revoked") is None:
        f["forensic_status"] = "UNVERIFIED"
    else:
        f["forensic_status"] = "PASSED"
    return f


def _solana_forensics(mint: str) -> Dict[str, Any]:
    """On-chain forensics for an SPL token via the RugCheck report API."""
    try:
        r = _http_json(f"https://api.rugcheck.xyz/v1/tokens/{mint}/report", timeout=10)
    except Exception as e:
        return _empty_forensics("rugcheck", str(e))

    tok = r.get("token") or {}
    supply = float(tok.get("supply") or 0)
    markets = r.get("markets") or []
    known = r.get("knownAccounts") or {}

    # Accounts that belong to liquidity pools / lockers must not count as "whale" holders
    pool_accounts = set()
    for m in markets:
        for k in ("pubkey", "liquidityA", "liquidityB"):
            if m.get(k):
                pool_accounts.add(m[k])
        for k in ("liquidityAAccount", "liquidityBAccount"):
            owner = (m.get(k) or {}).get("owner")
            if owner:
                pool_accounts.add(owner)
    for addr, info in known.items():
        if str((info or {}).get("type", "")).upper() in ("AMM", "LOCKER"):
            pool_accounts.add(addr)

    holders = [h for h in (r.get("topHolders") or [])
               if h.get("address") not in pool_accounts and h.get("owner") not in pool_accounts]
    top10 = round(sum(float(h.get("pct") or 0) for h in holders[:10]), 1)

    creator_bal = float(r.get("creatorBalance") or 0)
    dev_pct = round(creator_bal / supply * 100, 2) if supply > 0 else None

    # LP burned/locked: only classic AMM pools issue an LP token. CLMM/DLMM pools have none.
    lp_pcts = []
    for m in markets:
        lp = m.get("lp") or {}
        lp_mint = lp.get("lpMint") or ""
        if lp_mint and not lp_mint.startswith("1111111111") and lp.get("lpLockedPct") is not None:
            lp_pcts.append(float(lp.get("lpLockedPct") or 0))
    lp_pct = round(max(lp_pcts), 1) if lp_pcts else None

    f = {
        "forensic_source": "rugcheck",
        "forensic_error": None,
        "mint_revoked": not r.get("mintAuthority"),
        "freeze_revoked": not r.get("freezeAuthority"),
        "lp_burned_pct": lp_pct,
        "lp_model": "LP_TOKEN" if lp_pct is not None else "CONCENTRATED (no LP token)",
        "dev_holding_pct": dev_pct,
        "top10_holding_pct": top10,
        "rugged": bool(r.get("rugged")),
    }
    f = _apply_gates(f)
    if f["rugged"]:
        f["forensic_failures"].append("Flagged RUGGED by RugCheck")
        f["forensic_status"] = "FAILED"
    return f


def _base_forensics(contract: str) -> Dict[str, Any]:
    """On-chain forensics for a Base (chain 8453) ERC-20 via GoPlus Security."""
    url = f"https://api.gopluslabs.io/api/v1/token_security/8453?contract_addresses={contract}"
    try:
        data = _http_json(url, timeout=10)
        res = (data.get("result") or {})
        t = res.get(contract.lower()) or next(iter(res.values()), None)
        if not t:
            return _empty_forensics("goplus", data.get("message") or "no result")
    except Exception as e:
        return _empty_forensics("goplus", str(e))

    def flag(k: str) -> bool:
        return str(t.get(k, "0")) == "1"

    # Freeze equivalent on EVM: honeypot, pausable transfers, blacklist, or cannot sell
    freeze_risk = any(flag(k) for k in ("is_honeypot", "transfer_pausable", "is_blacklisted", "cannot_sell_all"))
    holders = [h for h in (t.get("holders") or []) if str(h.get("is_contract", "0")) != "1" and str(h.get("is_locked", "0")) != "1"]
    top10 = round(sum(float(h.get("percent") or 0) for h in holders[:10]) * 100, 1)

    dead = ("0x000000000000000000000000000000000000dead", "0x0000000000000000000000000000000000000000")
    lp_holders = t.get("lp_holders") or []
    lp_pct = None
    lp_model = "UNKNOWN"
    if lp_holders and any(h.get("NFT_list") for h in lp_holders):
        # Uniswap v3 / Aerodrome Slipstream: liquidity is NFT positions, no burnable LP token
        lp_model = "CONCENTRATED (NFT positions)"
    elif lp_holders:
        lp_model = "LP_TOKEN"
        lp_pct = round(sum(float(h.get("percent") or 0) for h in lp_holders
                           if str(h.get("is_locked", "0")) == "1" or str(h.get("address", "")).lower() in dead) * 100, 1)

    f = {
        "forensic_source": "goplus",
        "forensic_error": None,
        "mint_revoked": not flag("is_mintable"),
        "freeze_revoked": not freeze_risk,
        "lp_burned_pct": lp_pct,
        "lp_model": lp_model,
        "dev_holding_pct": round(float(t.get("creator_percent") or 0) * 100, 2),
        "top10_holding_pct": top10,
        "sell_tax_pct": round(float(t.get("sell_tax") or 0) * 100, 1),
    }
    return _apply_gates(f)


def is_forensics_cached(address: str, chain: str) -> bool:
    hit = _FORENSICS_CACHE.get(f"{chain}:{address}")
    if not hit:
        return False
    ttl = _FORENSICS_TTL_ERR if hit["data"].get("forensic_error") else _FORENSICS_TTL_OK
    return time.time() - hit["ts"] < ttl


def get_token_forensics(address: str, chain: str = "solana") -> Dict[str, Any]:
    """Cached Forensic Anti-Rug Suite lookup (BullX / GMGN model)."""
    key = f"{chain}:{address}"
    now = time.time()
    hit = _FORENSICS_CACHE.get(key)
    if hit:
        ttl = _FORENSICS_TTL_ERR if hit["data"].get("forensic_error") else _FORENSICS_TTL_OK
        if now - hit["ts"] < ttl:
            return hit["data"]
    data = _base_forensics(address) if chain == "base" else _solana_forensics(address)
    _FORENSICS_CACHE[key] = {"ts": now, "data": data}
    return data


def compute_whale_flow(vol_1h: float, buys_1h: int, sells_1h: int, buys_5m: int, sells_5m: int,
                       price_change_1h: float, sol_price: float) -> Dict[str, Any]:
    """
    Smart Money & Whale Inflow Detector (GMGN model) from real DexScreener order flow.
    DexScreener exposes volume + buy/sell counts (not individual fills), so the
    institutional ticket size is estimated as average USD per trade in the last hour.
    """
    total_1h = buys_1h + sells_1h
    total_5m = buys_5m + sells_5m
    buy_ratio_1h = (buys_1h / total_1h * 100) if total_1h else 50.0
    buy_ratio_5m = (buys_5m / total_5m * 100) if total_5m else 50.0
    avg_trade_usd = vol_1h / total_1h if total_1h else 0.0
    whale_ticket_usd = WHALE_TICKET_SOL * sol_price
    avg_trade_sol = avg_trade_usd / sol_price if sol_price > 0 else 0.0

    score = 0.0
    score += max(0.0, min(40.0, (buy_ratio_1h - 50.0) / 40.0 * 40.0))          # buy dominance (1h)
    score += max(0.0, min(35.0, avg_trade_usd / whale_ticket_usd * 35.0))       # ticket size
    score += 15.0 if buy_ratio_5m >= 60.0 and total_5m >= 10 else 0.0           # live 5m velocity
    score += 10.0 if price_change_1h > 0 else 0.0                               # price confirming flow
    score = int(round(min(100.0, score)))

    if avg_trade_usd >= whale_ticket_usd and buy_ratio_1h >= 60.0:
        flow = "WHALE ACCUMULATION"
    elif buy_ratio_1h > 75.0 and price_change_1h > 0:
        flow = "SMART MONEY INFLOW"
    else:
        flow = "ORGANIC FLOW"

    return {
        "whale_flow": flow,
        "whale_score": score,
        "avg_trade_usd": round(avg_trade_usd, 2),
        "avg_trade_sol": round(avg_trade_sol, 2),
        "buy_ratio_5m": round(buy_ratio_5m, 1),
    }

RISK_PROFILES: Dict[str, Dict[str, Any]] = {
    "SCALPER": {
        "key": "SCALPER",
        "name": "Quick Scalper",
        "stop_loss_pct": -0.05,        # -5% Stop Loss
        "take_profit_tp1_pct": 0.20,   # +20% Take Profit (Scale out 66% principal)
        "moonbag_trail_pct": 0.10,     # -10% Trailing from Peak
        "badge": "⚡ SCALPER (-5% SL / +20% TP)",
        "description": "High turnover & fast wins. Tighter stop with rapid cashout."
    },
    "MOONBAG": {
        "key": "MOONBAG",
        "name": "Standard Moonbag",
        "stop_loss_pct": -0.08,        # -8% Stop Loss
        "take_profit_tp1_pct": 0.50,   # +50% Take Profit (Scale out 66% principal)
        "moonbag_trail_pct": 0.15,     # -15% Trailing from High-Water Mark Peak
        "badge": "🛡️ MOONBAG (-8% SL / +50% TP)",
        "description": "Balanced asymmetry. Recovers 100% principal at +50%, lets 34% ride."
    },
    "HUNTER_10X": {
        "key": "HUNTER_10X",
        "name": "10x Moon Hunter",
        "stop_loss_pct": -0.12,        # -12% Stop Loss
        "take_profit_tp1_pct": 1.00,   # +100% (2x) Take Profit
        "moonbag_trail_pct": 0.25,     # -25% Trailing from Peak
        "badge": "🚀 10X HUNTER (-12% SL / +100% TP)",
        "description": "Multi-bagger runner. Wider breathing room for parabolic surges."
    }
}

DEFAULT_DEX_STATE = {
    "dex_armed": False,
    "sniper_amount_usd": 100.0,
    "max_dex_positions": 3,
    "active_chain": "solana",          # "solana" or "base"
    "risk_profile": "MOONBAG",         # "SCALPER", "MOONBAG", "HUNTER_10X"
    "stop_loss_pct": -0.08,
    "take_profit_tp1_pct": 0.50,
    "moonbag_trail_pct": 0.15,
    "active_positions": [],
    "closed_trades": [],
    "scanned_tokens": [],
    "last_scan_time": 0,
    "last_status_message": "DEX Sniper Standby. Ready to scan new Solana & Base listings."
}

def load_dex_state() -> Dict[str, Any]:
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r") as f:
                data = json.load(f)
                merged = {**DEFAULT_DEX_STATE, **data}
                # Sync risk profile thresholds if needed
                prof_key = merged.get("risk_profile", "MOONBAG")
                if prof_key in RISK_PROFILES:
                    merged["stop_loss_pct"] = RISK_PROFILES[prof_key]["stop_loss_pct"]
                    merged["take_profit_tp1_pct"] = RISK_PROFILES[prof_key]["take_profit_tp1_pct"]
                    merged["moonbag_trail_pct"] = RISK_PROFILES[prof_key]["moonbag_trail_pct"]
                return merged
        except Exception as e:
            logger.error(f"Error loading dex state: {e}")
    return DEFAULT_DEX_STATE.copy()

def save_dex_state(state: Dict[str, Any]) -> None:
    try:
        with open(STATE_FILE, "w") as f:
            json.dump(state, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving dex state: {e}")

def set_dex_risk_profile(profile_key: str) -> Dict[str, Any]:
    prof = RISK_PROFILES.get(profile_key.upper(), RISK_PROFILES["MOONBAG"])
    state = load_dex_state()
    state["risk_profile"] = prof["key"]
    state["stop_loss_pct"] = prof["stop_loss_pct"]
    state["take_profit_tp1_pct"] = prof["take_profit_tp1_pct"]
    state["moonbag_trail_pct"] = prof["moonbag_trail_pct"]
    save_dex_state(state)
    return {"status": "SUCCESS", "risk_profile": prof["key"], "details": prof}

def get_jupiter_quote(output_mint: str, input_mint: str = SOL_MINT, amount_sol: float = 0.5, slippage_bps: int = 150) -> Dict[str, Any]:
    """
    Get live swap quote from Jupiter API v1/v6.
    """
    lamports = int(amount_sol * 1_000_000_000)
    url = f"https://api.jup.ag/swap/v1/quote?inputMint={input_mint}&outputMint={output_mint}&amount={lamports}&slippageBps={slippage_bps}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    try:
        with urllib.request.urlopen(req, timeout=6) as resp:
            quote_data = json.loads(resp.read().decode())
            return {"success": True, "quote": quote_data}
    except Exception as e:
        logger.error(f"Jupiter quote error for {output_mint}: {e}")
        return {"success": False, "error": str(e)}

_LISTINGS_CACHE: Dict[str, Any] = {}

def fetch_new_solana_listings(chain: str = "solana", min_liquidity: float = 20000.0, min_vol_24h: float = 30000.0, force_refresh: bool = False) -> List[Dict[str, Any]]:
    """
    Scans DexScreener for top boosted & trending new listings on Solana or Base L2.
    Applies Automated Anti-Rug & Forensic Filters (Mint Revoked, Freeze Revoked, LP Burn, Dev %)
    and Smart Money / Whale Inflow Velocity analysis.
    """
    global _LISTINGS_CACHE
    chain_key = chain.lower().strip()
    cache_entry = _LISTINGS_CACHE.get(chain_key, {"timestamp": 0.0, "listings": []})
    now = time.time()
    if not force_refresh and (now - cache_entry["timestamp"]) < 40.0 and cache_entry["listings"]:
        return cache_entry["listings"]

    results: List[Dict[str, Any]] = []
    pairs: List[Dict[str, Any]] = []
    
    if chain_key == "base":
        # Base L2: Aerodrome is the #1 DEX on Base with highest meme & utility volume
        search_urls = [
            "https://api.dexscreener.com/latest/dex/search?q=Aerodrome",
            "https://api.dexscreener.com/latest/dex/search?q=Virtual"
        ]
        for s_url in search_urls:
            try:
                req = urllib.request.Request(s_url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=6) as resp:
                    s_data = json.loads(resp.read().decode())
                    for p in s_data.get("pairs", []):
                        if p.get("chainId") == "base":
                            pairs.append(p)
            except Exception as e:
                logger.warning(f"Dexscreener Base search error: {e}")
    else:
        # Solana: Fetch top boosted tokens & search
        boost_url = "https://api.dexscreener.com/token-boosts/top/v1"
        token_addresses = []
        try:
            req = urllib.request.Request(boost_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=6) as resp:
                boost_data = json.loads(resp.read().decode())
                for item in boost_data:
                    if item.get("chainId") == "solana":
                        addr = item.get("tokenAddress")
                        if addr and addr not in token_addresses:
                            token_addresses.append(addr)
        except Exception as e:
            logger.warning(f"Dexscreener boosts fetch error for solana: {e}")

        if len(token_addresses) < 12:
            search_url = "https://api.dexscreener.com/latest/dex/search?q=SOL"
            try:
                req = urllib.request.Request(search_url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=6) as resp:
                    search_data = json.loads(resp.read().decode())
                    for p in search_data.get("pairs", []):
                        if p.get("chainId") == "solana":
                            addr = p.get("baseToken", {}).get("address")
                            if addr and addr not in token_addresses and addr not in [SOL_MINT, USDC_MINT]:
                                token_addresses.append(addr)
            except Exception as e:
                logger.warning(f"Dexscreener search fetch error for solana: {e}")

        batch_addrs = token_addresses[:25]
        if batch_addrs:
            pair_query_url = f"https://api.dexscreener.com/latest/dex/tokens/{','.join(batch_addrs)}"
            try:
                req = urllib.request.Request(pair_query_url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=8) as resp:
                    pair_data = json.loads(resp.read().decode())
                    pairs = pair_data.get("pairs", [])
            except Exception as e:
                logger.error(f"Error querying token pairs for solana: {e}")

    sol_price = get_sol_price_usd()
    seen_bases = set()
    for p in pairs:
        if p.get("chainId") != chain_key:
            continue
            
        base_tok = p.get("baseToken", {})
        base_addr = base_tok.get("address", "")
        base_sym = base_tok.get("symbol", "UNKNOWN").upper()
        base_name = base_tok.get("name", base_sym)
        
        if base_addr in seen_bases or base_sym in ["SOL", "WSOL", "USDC", "USDT", "WETH", "ETH"]:
            continue
            
        liq_usd = float(p.get("liquidity", {}).get("usd") or 0.0)
        vol_24h = float(p.get("volume", {}).get("h24") or 0.0)
        vol_1h = float(p.get("volume", {}).get("h1") or 0.0)
        price_usd = float(p.get("priceUsd") or 0.0)
        fdv = float(p.get("fdv") or p.get("marketCap") or 0.0)
        
        txns = p.get("txns", {})
        m5_tx = txns.get("m5", {})
        h1_tx = txns.get("h1", {})
        
        buys_1h = int(h1_tx.get("buys") or 0)
        sells_1h = int(h1_tx.get("sells") or 0)
        buys_5m = int(m5_tx.get("buys") or 0)
        sells_5m = int(m5_tx.get("sells") or 0)
        total_1h_tx = buys_1h + sells_1h
        buy_ratio_1h = (buys_1h / total_1h_tx * 100) if total_1h_tx > 0 else 50.0
        
        price_change_5m = float(p.get("priceChange", {}).get("m5") or 0.0)
        price_change_1h = float(p.get("priceChange", {}).get("h1") or 0.0)
        price_change_24h = float(p.get("priceChange", {}).get("h24") or 0.0)
        
        # Anti-Rug Filters
        is_clean_liq = liq_usd >= min_liquidity
        is_active_vol = vol_24h >= min_vol_24h
        
        # Market-structure Safety Score (0 to 100); on-chain forensics adjust it below
        safety_score = 50
        if liq_usd >= 100000: safety_score += 18
        elif liq_usd >= 50000: safety_score += 10
        if buy_ratio_1h >= 60: safety_score += 14
        if vol_24h >= 250000: safety_score += 14
        if price_change_5m >= 0: safety_score += 4
        safety_score = min(98, max(30, safety_score))
        
        # Smart Money & Whale Inflow Detection (GMGN Model)
        whale = compute_whale_flow(vol_1h, buys_1h, sells_1h, buys_5m, sells_5m, price_change_1h, sol_price)

        pair_addr = p.get("pairAddress", "")
        pair_url = p.get("url", f"https://dexscreener.com/{chain_key}/{base_addr}")
        embed_chart_url = f"https://dexscreener.com/{chain_key}/{pair_addr}?embed=1&theme=dark&trades=0&info=0"
        
        if is_clean_liq and is_active_vol:
            seen_bases.add(base_addr)
            results.append({
                "address": base_addr,
                "symbol": base_sym,
                "name": base_name,
                "chain": chain_key,
                "price_usd": price_usd,
                "market_cap": fdv,
                "liquidity_usd": liq_usd,
                "volume_24h": vol_24h,
                "volume_1h": vol_1h,
                "price_change_5m": price_change_5m,
                "price_change_1h": price_change_1h,
                "price_change_24h": price_change_24h,
                "buy_ratio_1h": round(buy_ratio_1h, 1),
                "txns_1h": total_1h_tx,
                "dex": p.get("dexId", "raydium").upper(),
                "pair_address": pair_addr,
                "pair_url": pair_url,
                "embed_chart_url": embed_chart_url,
                "safety_score": safety_score,
                # Smart Money
                **whale,
            })

    # On-Chain Forensic Anti-Rug Suite: run all lookups in parallel (cached per token)
    if results:
        # GoPlus free tier is 1 token/call with a tight burst limit, so on Base only a few
        # uncached tokens are looked up per scan. The rest stay UNVERIFIED (never auto-sniped)
        # and are verified progressively on later scans thanks to the 10-min cache.
        workers = 2 if chain_key == "base" else 8
        budget = 6 if chain_key == "base" else len(results)
        jobs = []
        for t in results:
            if is_forensics_cached(t["address"], chain_key) or budget > 0:
                if not is_forensics_cached(t["address"], chain_key):
                    budget -= 1
                jobs.append(t["address"])
            else:
                jobs.append(None)
        pending = _empty_forensics("goplus", "queued - verifying on next scan")
        with ThreadPoolExecutor(max_workers=workers) as pool:
            forensics = list(pool.map(lambda a: get_token_forensics(a, chain_key) if a else dict(pending), jobs))
        vetted: List[Dict[str, Any]] = []
        for tok, f in zip(results, forensics):
            tok.update(f)
            if f["forensic_status"] == "FAILED":
                # Hard reject: mint/freeze active, LP unlocked, dev dump risk, or concentrated float
                continue
            if f["forensic_status"] == "PASSED":
                tok["safety_score"] = min(99, tok["safety_score"] + 6)
            else:
                tok["safety_score"] = min(tok["safety_score"], 60)
            tok["status"] = "VERIFIED_LIQUIDITY" if (f["forensic_status"] == "PASSED" and tok["safety_score"] >= 70) else "WATCHLIST"
            vetted.append(tok)
        rejected = len(results) - len(vetted)
        if rejected:
            logger.info(f"Forensic suite rejected {rejected}/{len(results)} {chain_key} tokens")
        results = vetted
            
    results.sort(key=lambda x: (x["forensic_status"] == "PASSED", x["safety_score"], x["volume_1h"]), reverse=True)
    if results:
        _LISTINGS_CACHE[chain_key] = {"timestamp": now, "listings": results}
    return results

def execute_dex_snipe(token_address: str, symbol: str, amount_usd: float = 100.0, mode: str = "SIMULATION", chain: str = "solana") -> Dict[str, Any]:
    """
    Executes a DEX Snipe swap order using Jupiter API on Solana or virtual routing on Base.
    """
    state = load_dex_state()
    active_pos = state.get("active_positions", [])
    max_pos = int(state.get("max_dex_positions", 3))
    
    if len(active_pos) >= max_pos:
        return {"status": "ERROR", "message": f"DEX position limit reached ({len(active_pos)}/{max_pos})."}
        
    for p in active_pos:
        if p.get("address") == token_address:
            return {"status": "ERROR", "message": f"Already hold an active position in {symbol}."}

    # Forensic gate: never snipe a token that fails the anti-rug suite
    forensics = get_token_forensics(token_address, chain)
    if forensics.get("forensic_status") == "FAILED":
        return {"status": "ERROR", "message": f"Forensic gate blocked {symbol}: {'; '.join(forensics.get('forensic_failures', []))}"}
            
    sol_price_est = get_sol_price_usd()
    amount_sol = amount_usd / sol_price_est
    quote_res = get_jupiter_quote(output_mint=token_address, amount_sol=amount_sol) if chain == "solana" else {"success": False}
    
    entry_px = 0.0
    out_tokens = 0.0
    if quote_res.get("success"):
        q = quote_res["quote"]
        out_lamports = int(q.get("outAmount", 0))
        out_tokens = out_lamports / (10 ** 6)
        entry_px = amount_usd / max(0.0000001, out_tokens)
    else:
        try:
            req = urllib.request.Request(f"https://api.dexscreener.com/latest/dex/tokens/{token_address}", headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=5) as r:
                d = json.loads(r.read().decode())
                pairs = d.get("pairs", [])
                if pairs:
                    entry_px = float(pairs[0].get("priceUsd") or 0.001)
                    out_tokens = amount_usd / max(0.0000001, entry_px)
        except Exception:
            entry_px = 0.01
            out_tokens = amount_usd / entry_px

    now_ts = time.time()
    ticket_id = f"dex_{symbol}_{int(now_ts)}"
    
    pos_record = {
        "id": ticket_id,
        "address": token_address,
        "symbol": symbol,
        "chain": chain,
        "entry_price": entry_px,
        "current_price": entry_px,
        "amount_usd": amount_usd,
        "tokens_held": out_tokens,
        "timestamp": now_ts,
        "time": datetime.now().strftime("%H:%M:%S"),
        "high_water_mark": entry_px,
        "stage": "INITIAL_RUN",
        "risk_profile": state.get("risk_profile", "MOONBAG"),
        "forensic_status": forensics.get("forensic_status"),
        "embed_chart_url": f"https://dexscreener.com/{chain}/{token_address}?embed=1&theme=dark&trades=0&info=0",
        "pair_url": f"https://dexscreener.com/{chain}/{token_address}",
        "unrealized_pnl_pct": 0.0,
        "unrealized_pnl_usd": 0.0,
        "mode": mode,
        "status": "ACTIVE"
    }
    
    active_pos.append(pos_record)
    state["active_positions"] = active_pos
    save_dex_state(state)
    
    try:
        from desk_notifier import dispatch_desk_alert
        dispatch_desk_alert(
            f"🪐 DEX SNIPER: {symbol} ({chain.upper()})",
            f"Sniped ${amount_usd:.0f} USD @ ${entry_px:,.6f} | Profile: {state.get('risk_profile', 'MOONBAG')} | Mode: {mode}",
            "CRYPTO_TRADE",
            metadata={"token": symbol, "chain": chain, "entry": f"${entry_px:,.6f}", "size": f"${amount_usd:.0f}"}
        )
    except Exception as e:
        logger.error(f"Desk alert error on dex snipe: {e}")
        
    return {
        "status": "SUCCESS",
        "ticket": pos_record,
        "message": f"Successfully sniped {symbol} on {chain.upper()} for ${amount_usd:.2f} USD."
    }

def update_dex_positions_risk_cycle() -> Dict[str, Any]:
    """
    Autonomous Risk Ratchet for DEX Positions:
    Supports dynamic Risk Profiles (Scalper -5%/+20%, Moonbag -8%/+50%, 10x Hunter -12%/+100%).
    """
    state = load_dex_state()
    active_pos = state.get("active_positions", [])
    if not active_pos:
        return {"status": "NO_POSITIONS"}
        
    addrs = [p["address"] for p in active_pos]
    query_url = f"https://api.dexscreener.com/latest/dex/tokens/{','.join(addrs)}"
    prices: Dict[str, float] = {}
    
    try:
        req = urllib.request.Request(query_url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=6) as resp:
            data = json.loads(resp.read().decode())
            for p in data.get("pairs", []):
                a = p.get("baseToken", {}).get("address")
                px = float(p.get("priceUsd") or 0.0)
                if a and px > 0 and a not in prices:
                    prices[a] = px
    except Exception as e:
        logger.error(f"Error updating dex prices: {e}")
        return {"status": "PRICE_FETCH_ERROR"}

    prof_key = state.get("risk_profile", "MOONBAG")
    prof = RISK_PROFILES.get(prof_key, RISK_PROFILES["MOONBAG"])
    sl_thresh = float(prof["stop_loss_pct"])
    tp1_thresh = float(prof["take_profit_tp1_pct"])
    moonbag_trail = float(prof["moonbag_trail_pct"])
    
    remaining_pos = []
    closed_pos = state.get("closed_trades", [])
    
    for pos in active_pos:
        addr = pos["address"]
        cur_px = prices.get(addr, pos.get("current_price", pos["entry_price"]))
        entry_px = pos["entry_price"]
        hwm = max(pos.get("high_water_mark", entry_px), cur_px)
        pos["high_water_mark"] = hwm
        pos["current_price"] = cur_px
        
        pnl_pct = (cur_px - entry_px) / entry_px if entry_px > 0 else 0.0
        pos["unrealized_pnl_pct"] = round(pnl_pct * 100, 2)
        pos["unrealized_pnl_usd"] = round((cur_px - entry_px) * pos.get("tokens_held", 0), 2)
        
        # 1. Hard Stop Loss
        if pnl_pct <= sl_thresh:
            exit_ticket = {
                **pos,
                "exit_price": cur_px,
                "exit_time": datetime.now().strftime("%H:%M:%S"),
                "reason": f"Stop Loss Triggered ({pnl_pct*100:.1f}%)",
                "realized_pnl_pct": f"{pnl_pct*100:+.1f}%",
                "realized_pnl_usd": pos["unrealized_pnl_usd"],
                "status": "STOP_LOSS_CLOSED"
            }
            closed_pos.insert(0, exit_ticket)
            try:
                from desk_notifier import dispatch_desk_alert
                dispatch_desk_alert(
                    f"🛑 DEX STOP LOSS: {pos['symbol']}",
                    f"Closed at {pnl_pct*100:.1f}% (${pos['unrealized_pnl_usd']:.2f}) | Capital preserved",
                    "STOP_LOSS",
                    metadata={"token": pos["symbol"], "loss": f"{pnl_pct*100:.1f}%"}
                )
            except Exception:
                pass
            continue
            
        # 2. Stage 1 TP: Principal Recovery
        if pos.get("stage") == "INITIAL_RUN" and pnl_pct >= tp1_thresh:
            pos["stage"] = "MOONBAG_RUNNER"
            banked_gain = round(float(pos.get("amount_usd", 100.0)) * pnl_pct * 0.66, 2)
            pos["tokens_held"] = pos["tokens_held"] * 0.34
            tp_ticket = {
                **pos,
                "exit_price": cur_px,
                "exit_time": datetime.now().strftime("%H:%M:%S"),
                "reason": f"Principal Banked (+{pnl_pct*100:.1f}%) · 34% Moonbag",
                "realized_pnl_pct": f"+{pnl_pct*100:.1f}%",
                "realized_pnl_usd": banked_gain,
                "status": "TAKE_PROFIT_CLOSED"
            }
            closed_pos.insert(0, tp_ticket)
            try:
                from desk_notifier import dispatch_desk_alert
                dispatch_desk_alert(
                    f"💰 DEX PRINCIPAL RECOVERED: {pos['symbol']}",
                    f"Surged +{pnl_pct*100:.1f}%. Cashed out 100% of initial principal (+${banked_gain:.2f} banked). 34% moonbag riding risk-free!",
                    "TAKE_PROFIT",
                    metadata={"token": pos["symbol"], "gain": f"+{pnl_pct*100:.1f}%", "banked": f"+${banked_gain:.2f}"}
                )
            except Exception:
                pass
                
        # 3. Trailing Moonbag Runner Stop
        if pos.get("stage") == "MOONBAG_RUNNER":
            trail_floor = hwm * (1.0 - moonbag_trail)
            if cur_px <= trail_floor:
                exit_ticket = {
                    **pos,
                    "exit_price": cur_px,
                    "exit_time": datetime.now().strftime("%H:%M:%S"),
                    "reason": f"Moonbag Trailing Stop Locked (Peak: ${hwm:,.6f})",
                    "realized_pnl_pct": f"{pnl_pct*100:+.1f}%",
                    "realized_pnl_usd": pos["unrealized_pnl_usd"],
                    "status": "MOONBAG_PROFIT_CLOSED"
                }
                closed_pos.insert(0, exit_ticket)
                try:
                    from desk_notifier import dispatch_desk_alert
                    dispatch_desk_alert(
                        f"🚀 MOONBAG PROFIT LOCKED: {pos['symbol']}",
                        f"Locked profit at +{pnl_pct*100:.1f}%. Runner peak reached ${hwm:,.6f}.",
                        "TAKE_PROFIT",
                        metadata={"token": pos["symbol"], "gain": f"+{pnl_pct*100:.1f}%"}
                    )
                except Exception:
                    pass
                continue
                
        remaining_pos.append(pos)
        
    state["active_positions"] = remaining_pos
    state["closed_trades"] = closed_pos[:50]
    save_dex_state(state)
    return {"status": "SUCCESS", "active_count": len(remaining_pos), "closed_count": len(closed_pos)}

def run_autonomous_dex_snipe_cycle() -> Dict[str, Any]:
    """
    Called by background worker every 25 seconds.
    """
    risk_res = update_dex_positions_risk_cycle()
    state = load_dex_state()
    if not state.get("dex_armed"):
        return {"status": "STANDBY", "risk": risk_res}
        
    active_pos = state.get("active_positions", [])
    max_pos = int(state.get("max_dex_positions", 3))
    if len(active_pos) >= max_pos:
        return {"status": "MAX_POSITIONS_REACHED", "active": len(active_pos), "risk": risk_res}
        
    chain = state.get("active_chain", "solana")
    listings = fetch_new_solana_listings(chain=chain)
    held_addrs = {p["address"] for p in active_pos}
    # Only tokens that PASSED every on-chain forensic gate are eligible for autonomous entries
    candidates = [tok for tok in listings
                  if tok["address"] not in held_addrs
                  and tok.get("forensic_status") == "PASSED"
                  and tok.get("safety_score", 0) >= 75]
    if not candidates:
        return {"status": "NO_CLEAN_CANDIDATES", "risk": risk_res}

    # Whale-priority: whale_score >= 80 first, then safety, then whale score
    candidates.sort(key=lambda t: (t.get("whale_score", 0) >= WHALE_PRIORITY_SCORE, t.get("safety_score", 0), t.get("whale_score", 0)), reverse=True)
    top_pick = candidates[0]
    amount = float(state.get("sniper_amount_usd", 100.0))
    snipe_res = execute_dex_snipe(top_pick["address"], top_pick["symbol"], amount_usd=amount, mode="SIMULATION", chain=chain)
    return {"status": "AUTO_SNIPED", "token": top_pick["symbol"], "snipe": snipe_res, "risk": risk_res}

def get_dex_pnl_summary(state: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Computes real-time P&L analytics for the Solana DEX Sniper engine:
    Net PnL, Unrealized floating PnL, Realized banked PnL, Win Rate, and Capital Deployed.
    """
    if state is None:
        state = load_dex_state()
        
    active_pos = state.get("active_positions", [])
    closed = state.get("closed_trades", [])
    
    total_unrealized_usd = sum(float(p.get("unrealized_pnl_usd", 0.0)) for p in active_pos)
    total_realized_usd = sum(float(t.get("realized_pnl_usd", 0.0)) for t in closed)
    net_pnl_usd = round(total_realized_usd + total_unrealized_usd, 2)
    
    capital_deployed = sum(float(p.get("amount_usd", 100.0)) for p in active_pos)
    total_capital_base = max(100.0, capital_deployed + sum(float(t.get("amount_usd", 100.0)) for t in closed))
    net_pnl_pct = round((net_pnl_usd / total_capital_base) * 100, 2) if total_capital_base > 0 else 0.0
    
    wins = sum(1 for t in closed if float(t.get("realized_pnl_usd", 0.0)) > 0 or "PROFIT" in t.get("status", "") or "TAKE_PROFIT" in t.get("reason", ""))
    losses = sum(1 for t in closed if float(t.get("realized_pnl_usd", 0.0)) < 0 or "STOP_LOSS" in t.get("status", ""))
    closed_count = len(closed)
    win_rate = round((wins / max(1, closed_count)) * 100, 1) if closed_count > 0 else 0.0
    
    return {
        "net_pnl_usd": net_pnl_usd,
        "net_pnl_pct": net_pnl_pct,
        "total_unrealized_usd": round(total_unrealized_usd, 2),
        "total_realized_usd": round(total_realized_usd, 2),
        "capital_deployed_usd": round(capital_deployed, 2),
        "active_positions_count": len(active_pos),
        "closed_trades_count": closed_count,
        "wins": wins,
        "losses": losses,
        "win_rate": win_rate
    }
