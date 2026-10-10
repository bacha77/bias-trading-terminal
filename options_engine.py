"""
B.I.A.S. Options Engine
Options analytics from Yahoo Finance chains (free, ~15 min delayed).

Conventions:
- GEX assumes dealers are long calls / short puts (standard SpotGamma-style convention):
  call gamma counts positive, put gamma counts negative.
- GEX unit: $ notional change in dealer delta per 1% move in the underlying.
"""
import math
from datetime import datetime, date

import numpy as np
import pandas as pd
import yfinance as yf
from scipy.stats import norm

RISK_FREE = 0.04
MAX_GEX_EXPIRIES = 6       # expiries aggregated for gamma exposure
MAX_GEX_DTE = 45           # ignore expiries further out than this for GEX


# ---------------------------------------------------------------- helpers
def _num(x, nd=2):
    """JSON-safe float."""
    try:
        if x is None or (isinstance(x, float) and (math.isnan(x) or math.isinf(x))):
            return None
        return round(float(x), nd)
    except Exception:
        return None


def _dte(exp: str) -> float:
    d = (datetime.strptime(exp, "%Y-%m-%d").date() - date.today()).days
    # Options expire at the close; give same-day expiries a fraction of a day
    return max(d, 0) + 0.25


def _bs_gamma(S, K, T, iv):
    """Vectorised Black-Scholes gamma."""
    S = np.asarray(S, dtype=float)
    with np.errstate(divide="ignore", invalid="ignore"):
        d1 = (np.log(S / K) + (RISK_FREE + 0.5 * iv ** 2) * T) / (iv * np.sqrt(T))
        g = norm.pdf(d1) / (S * iv * np.sqrt(T))
    return np.nan_to_num(g)


def _bs_price(S, K, T, iv, is_call):
    with np.errstate(divide="ignore", invalid="ignore"):
        sq = iv * np.sqrt(T)
        d1 = (np.log(S / K) + (RISK_FREE + 0.5 * iv ** 2) * T) / sq
        d2 = d1 - sq
        disc = np.exp(-RISK_FREE * T)
        call = S * norm.cdf(d1) - K * disc * norm.cdf(d2)
        put = K * disc * norm.cdf(-d2) - S * norm.cdf(-d1)
    return np.where(is_call, call, put)


def _solve_iv(S, K, T, price, is_call):
    """Vectorised bisection IV solver (Yahoo's IV field is unreliable for 0DTE/ITM)."""
    K = np.asarray(K, float); price = np.asarray(price, float)
    lo = np.full_like(K, 0.005); hi = np.full_like(K, 5.0)
    for _ in range(60):
        mid = (lo + hi) / 2
        p = _bs_price(S, K, T, mid, is_call)
        hi = np.where(p > price, mid, hi)
        lo = np.where(p > price, lo, mid)
    iv = (lo + hi) / 2
    intrinsic = np.maximum(0, (S - K) if is_call else (K - S))
    bad = (price <= intrinsic * 1.0001) | (price <= 0) | (iv > 4.9) | (iv < 0.006)
    return np.where(bad, np.nan, iv)


def _clean_chain(df: pd.DataFrame, spot: float, T: float, is_call: bool) -> pd.DataFrame:
    df = df.copy()
    for c in ["bid", "ask", "lastPrice", "volume", "openInterest", "impliedVolatility"]:
        if c not in df:
            df[c] = 0
        df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0)
    df["mid"] = np.where((df["bid"] > 0) & (df["ask"] > 0), (df["bid"] + df["ask"]) / 2, df["lastPrice"])
    solved = _solve_iv(spot, df["strike"].values, T, df["mid"].values, is_call)
    yahoo = df["impliedVolatility"].where(df["impliedVolatility"] > 0.03, np.nan).values
    df["impliedVolatility"] = np.nan_to_num(np.where(np.isnan(solved), yahoo, solved))
    return df


def _atm_iv(calls, puts, spot):
    vals = []
    for df in (calls, puts):
        d = df[(df["impliedVolatility"] > 0.01) & (df["bid"] > 0)]
        if len(d):
            row = d.iloc[(d["strike"] - spot).abs().argsort()[:1]]
            vals.append(float(row["impliedVolatility"].iloc[0]))
    return float(np.mean(vals)) if vals else None


def _iv_near(df, target):
    d = df[(df["impliedVolatility"] > 0.01) & (df["bid"] > 0)]
    if not len(d):
        return None
    return float(d.iloc[(d["strike"] - target).abs().argsort()[:1]]["impliedVolatility"].iloc[0])


# ---------------------------------------------------------------- main analytics
def options_analytics(ticker: str, expiry: str | None = None, spot_override: float | None = None) -> dict:
    ticker = ticker.upper().strip()
    tk = yf.Ticker(ticker)

    hist = tk.history(period="3mo", interval="1d", auto_adjust=False)
    if hist.empty:
        raise ValueError(f"No price history for {ticker}")
        
    valid_close = hist["Close"].dropna()
    if spot_override and float(spot_override) > 0:
        spot = float(spot_override)
    elif not valid_close.empty:
        spot = float(valid_close.iloc[-1])
    else:
        spot = 500.0
        
    prev = float(valid_close.iloc[-2]) if len(valid_close) > 1 else spot

    # Realized vol (20d close-to-close, annualised)
    rets = np.log(hist["Close"] / hist["Close"].shift(1)).dropna()
    rv20 = float(rets.tail(20).std() * math.sqrt(252)) if len(rets) >= 20 else None

    expiries = list(tk.options or [])
    if not expiries:
        raise ValueError(f"{ticker} has no listed options")
    # default focus: first expiry at least 1 day out (0DTE pricing is too noisy)
    non0 = [e for e in expiries if _dte(e) >= 1]
    focus = expiry if expiry in expiries else (non0[0] if non0 else expiries[0])

    # ---- load chains (focus + GEX window + term structure)
    gex_exps = [e for e in expiries if _dte(e) <= MAX_GEX_DTE][:MAX_GEX_EXPIRIES] or expiries[:1]
    term_exps = expiries[:5]
    for target in (30, 60, 90):
        best = min(expiries, key=lambda e: abs(_dte(e) - target))
        if best not in term_exps:
            term_exps.append(best)
    needed = list(dict.fromkeys([focus] + gex_exps + term_exps))
    chains = {}
    for e in needed:
        try:
            oc = tk.option_chain(e)
            T = _dte(e) / 365
            chains[e] = (_clean_chain(oc.calls, spot, T, True), _clean_chain(oc.puts, spot, T, False))
        except Exception:
            continue
    if focus not in chains:
        raise ValueError(f"Could not load chain for {ticker} {focus}")

    calls, puts = chains[focus]
    T_focus = _dte(focus) / 365

    # ---- ATM IV / expected move
    atm_iv = _atm_iv(calls, puts, spot)
    atm_strike = float(calls.iloc[(calls["strike"] - spot).abs().argsort()[:1]]["strike"].iloc[0])
    c_atm = calls[calls["strike"] == atm_strike]
    p_atm = puts[puts["strike"] == atm_strike]
    straddle = None
    if len(c_atm) and len(p_atm):
        straddle = float(c_atm["mid"].iloc[0] + p_atm["mid"].iloc[0])
    exp_move = straddle * 0.85 if straddle else (spot * atm_iv * math.sqrt(T_focus) if atm_iv else None)

    # ---- skew (≈ 5% OTM wings)
    put_wing = _iv_near(puts, spot * 0.95)
    call_wing = _iv_near(calls, spot * 1.05)
    skew = (put_wing - call_wing) if (put_wing and call_wing) else None

    # ---- put/call ratios (focus expiry)
    cv, pv = calls["volume"].sum(), puts["volume"].sum()
    coi, poi = calls["openInterest"].sum(), puts["openInterest"].sum()
    pcr_vol = pv / cv if cv else None
    pcr_oi = poi / coi if coi else None

    # ---- max pain (focus expiry)
    strikes = np.unique(np.concatenate([calls["strike"].values, puts["strike"].values]))
    pain = []
    for K in strikes:
        c_pain = (np.maximum(0, K - calls["strike"].values) * calls["openInterest"].values).sum()
        p_pain = (np.maximum(0, puts["strike"].values - K) * puts["openInterest"].values).sum()
        pain.append(c_pain + p_pain)
    max_pain = float(strikes[int(np.argmin(pain))]) if len(pain) else None

    # ---- gamma exposure across GEX window
    rows = []
    for e in gex_exps:
        if e not in chains:
            continue
        T = _dte(e) / 365
        for df, sign in ((chains[e][0], 1), (chains[e][1], -1)):
            d = df[(df["openInterest"] > 0) & (df["impliedVolatility"] > 0.01)]
            for K, oi, iv in zip(d["strike"].values, d["openInterest"].values, d["impliedVolatility"].values):
                rows.append((K, oi, iv, T, sign))
    gex_strikes, call_wall, put_wall, flip, net_gex = [], None, None, None, None
    if rows:
        arr = np.array(rows, dtype=float)
        K, OI, IV, T, SIGN = arr.T
        per = _bs_gamma(spot, K, T, IV) * OI * 100 * spot * spot * 0.01 * SIGN
        net_gex = float(per.sum())

        g = pd.DataFrame({"strike": K, "gex": per, "sign": SIGN})
        by_strike = g.groupby("strike")["gex"].sum()
        calls_g = g[g["sign"] > 0].groupby("strike")["gex"].sum()
        puts_g = g[g["sign"] < 0].groupby("strike")["gex"].sum()
        # Walls = biggest open-interest strikes above / below spot (true positioning)
        oi_c = pd.concat([chains[e][0][["strike", "openInterest"]] for e in gex_exps if e in chains])
        oi_p = pd.concat([chains[e][1][["strike", "openInterest"]] for e in gex_exps if e in chains])
        oi_c = oi_c[(oi_c["strike"] > spot) & (oi_c["strike"] < spot * 1.1)].groupby("strike")["openInterest"].sum()
        oi_p = oi_p[(oi_p["strike"] < spot) & (oi_p["strike"] > spot * 0.9)].groupby("strike")["openInterest"].sum()
        if len(oi_c):
            call_wall = float(oi_c.idxmax())
        else:
            all_c = pd.concat([chains[e][0][["strike", "openInterest"]] for e in gex_exps if e in chains])
            all_c = all_c[all_c["strike"] >= spot].groupby("strike")["openInterest"].sum()
            if len(all_c): call_wall = float(all_c.idxmax())
            elif len(calls_g): call_wall = float(calls_g.idxmax())

        if len(oi_p):
            put_wall = float(oi_p.idxmax())
        else:
            all_p = pd.concat([chains[e][1][["strike", "openInterest"]] for e in gex_exps if e in chains])
            all_p = all_p[all_p["strike"] <= spot].groupby("strike")["openInterest"].sum()
            if len(all_p): put_wall = float(all_p.idxmax())
            elif len(puts_g): put_wall = float(puts_g.idxmin())

        window = by_strike[(by_strike.index > spot * 0.9) & (by_strike.index < spot * 1.1)]
        gex_strikes = [{"strike": _num(k), "gex": _num(v / 1e6, 2)} for k, v in window.items()]

        # Gamma flip: re-price total GEX on a grid of hypothetical spots
        grid = np.linspace(spot * 0.85, spot * 1.15, 121)
        totals = np.array([(_bs_gamma(s, K, T, IV) * OI * 100 * s * s * 0.01 * SIGN).sum() for s in grid])
        cross = np.where(np.diff(np.sign(totals)) != 0)[0]
        if len(cross):
            # pick the crossing closest to spot, interpolate linearly
            i = cross[np.argmin(np.abs(grid[cross] - spot))]
            x0, x1, y0, y1 = grid[i], grid[i + 1], totals[i], totals[i + 1]
            flip = float(x0 - y0 * (x1 - x0) / (y1 - y0))

    # ---- term structure
    term = []
    for e in term_exps:
        if e in chains:
            iv = _atm_iv(chains[e][0], chains[e][1], spot)
            if iv:
                term.append({"expiry": e, "dte": int(_dte(e)), "iv": _num(iv * 100, 1)})
    term_shape = None
    if len(term) >= 2:
        term_shape = "BACKWARDATION" if term[0]["iv"] > term[-1]["iv"] else "CONTANGO"

    # ---- unusual activity (vol > OI, sized by notional)
    unusual = []
    for e in gex_exps:
        if e not in chains or _dte(e) < 1:
            continue
        for df, typ in ((chains[e][0], "CALL"), (chains[e][1], "PUT")):
            d = df[(df["volume"] >= 500) & (df["volume"] > df["openInterest"]) & (df["mid"] > 0.05)]
            for _, r in d.iterrows():
                side = "ASK" if r["lastPrice"] >= r["mid"] else "BID"
                unusual.append({
                    "type": typ, "strike": _num(r["strike"]), "expiry": e,
                    "volume": int(r["volume"]), "oi": int(r["openInterest"]),
                    "vol_oi": _num(r["volume"] / max(r["openInterest"], 1), 1),
                    "notional": _num(r["volume"] * r["mid"] * 100, 0),
                    "iv": _num(r["impliedVolatility"] * 100, 1), "side": side,
                })
    unusual.sort(key=lambda x: x["notional"] or 0, reverse=True)
    unusual = unusual[:12]
    bull_flow = sum(u["notional"] for u in unusual if (u["type"] == "CALL") == (u["side"] == "ASK"))
    bear_flow = sum(u["notional"] for u in unusual) - bull_flow

    # ---- chain table (focus, ±8% strikes)
    lo, hi = spot * 0.92, spot * 1.08
    cm = calls[(calls["strike"] >= lo) & (calls["strike"] <= hi)].set_index("strike")
    pm = puts[(puts["strike"] >= lo) & (puts["strike"] <= hi)].set_index("strike")
    chain = []
    for k in sorted(set(cm.index) | set(pm.index)):
        c = cm.loc[k] if k in cm.index else None
        p = pm.loc[k] if k in pm.index else None
        if isinstance(c, pd.DataFrame): c = c.iloc[0]
        if isinstance(p, pd.DataFrame): p = p.iloc[0]
        chain.append({
            "strike": _num(k),
            "c_bid": _num(c["bid"]) if c is not None else None, "c_ask": _num(c["ask"]) if c is not None else None,
            "c_vol": int(c["volume"]) if c is not None else 0, "c_oi": int(c["openInterest"]) if c is not None else 0,
            "c_iv": _num(c["impliedVolatility"] * 100, 1) if c is not None else None,
            "p_bid": _num(p["bid"]) if p is not None else None, "p_ask": _num(p["ask"]) if p is not None else None,
            "p_vol": int(p["volume"]) if p is not None else 0, "p_oi": int(p["openInterest"]) if p is not None else 0,
            "p_iv": _num(p["impliedVolatility"] * 100, 1) if p is not None else None,
        })

    # ---- playbook (rule-based verdict)
    notes, score = [], 0
    gamma_regime = None
    if flip is not None:
        if spot > flip:
            gamma_regime = "POSITIVE GAMMA"
            notes.append(f"Spot above gamma flip {flip:.2f}: dealers dampen moves, expect mean reversion / pinning.")
        else:
            gamma_regime = "NEGATIVE GAMMA"
            notes.append(f"Spot below gamma flip {flip:.2f}: dealers amplify moves, expect trend / vol expansion.")
    elif net_gex is not None:
        gamma_regime = "POSITIVE GAMMA" if net_gex > 0 else "NEGATIVE GAMMA"

    # ~30-day ATM IV (interpolated from term structure) is the fair comparison to 20d realized vol
    iv30 = None
    if term:
        dtes = np.array([t["dte"] for t in term], float)
        ivs = np.array([t["iv"] for t in term], float) / 100
        iv30 = float(np.interp(30, dtes, ivs))
    iv_rv = (iv30 / rv20) if (iv30 and rv20) else None
    premium = None
    if iv_rv:
        if iv_rv > 1.25:
            premium = "RICH"
            notes.append(f"IV/RV {iv_rv:.2f}: premium expensive, favor selling (spreads, iron condors).")
        elif iv_rv < 0.9:
            premium = "CHEAP"
            notes.append(f"IV/RV {iv_rv:.2f}: premium cheap, favor buying (long calls/puts, debit spreads).")
        else:
            premium = "FAIR"
            notes.append(f"IV/RV {iv_rv:.2f}: premium fairly priced, use debit spreads to define risk.")

    if pcr_vol is not None:
        if pcr_vol > 1.2: score -= 1; notes.append(f"Put/Call volume {pcr_vol:.2f}: heavy hedging/bearish flow (contrarian bounce risk).")
        elif pcr_vol < 0.6: score += 1; notes.append(f"Put/Call volume {pcr_vol:.2f}: call-heavy, bullish speculation.")
    if bull_flow or bear_flow:
        if bull_flow > bear_flow * 1.5: score += 1; notes.append("Unusual flow skewed bullish (calls bought / puts sold).")
        elif bear_flow > bull_flow * 1.5: score -= 1; notes.append("Unusual flow skewed bearish (puts bought / calls sold).")
    if max_pain:
        dist = (max_pain - spot) / spot * 100
        notes.append(f"Max pain {max_pain:.2f} ({dist:+.1f}% from spot) for {focus}: pin magnet into expiry.")
    if call_wall and put_wall:
        notes.append(f"Range map: put wall {put_wall:.2f} (support), call wall {call_wall:.2f} (resistance).")

    day_chg = (spot - prev) / prev * 100
    if day_chg > 0.3: score += 1
    elif day_chg < -0.3: score -= 1

    bias = "BULLISH" if score >= 2 else "LEAN BULLISH" if score == 1 else "BEARISH" if score <= -2 else "LEAN BEARISH" if score == -1 else "NEUTRAL"
    if gamma_regime == "POSITIVE GAMMA" and premium == "RICH":
        strategy = "Sell premium inside walls (iron condor / credit spreads)"
    elif gamma_regime == "NEGATIVE GAMMA" and premium in ("CHEAP", "FAIR"):
        strategy = f"Buy directional {'calls' if score > 0 else 'puts' if score < 0 else 'straddles'} (vol expansion)"
    elif "BULL" in bias:
        strategy = "Bull call debit spread toward call wall"
    elif "BEAR" in bias:
        strategy = "Bear put debit spread toward put wall"
    else:
        strategy = "Stand aside / wait for flip break"

    return {
        "ticker": ticker,
        "spot": _num(spot), "change_pct": _num(day_chg),
        "expiries": expiries[:12], "expiry": focus, "dte": int(_dte(focus)),
        "atm_iv": _num(atm_iv * 100 if atm_iv else None, 1),
        "rv20": _num(rv20 * 100 if rv20 else None, 1),
        "iv30": _num(iv30 * 100 if iv30 else None, 1),
        "iv_rv": _num(iv_rv), "premium": premium,
        "expected_move": _num(exp_move), "expected_move_pct": _num(exp_move / spot * 100 if exp_move else None),
        "straddle": _num(straddle),
        "skew": {"put_wing": _num(put_wing * 100 if put_wing else None, 1),
                 "atm": _num(atm_iv * 100 if atm_iv else None, 1),
                 "call_wing": _num(call_wing * 100 if call_wing else None, 1),
                 "skew": _num(skew * 100 if skew else None, 1)},
        "pcr_vol": _num(pcr_vol), "pcr_oi": _num(pcr_oi),
        "max_pain": _num(max_pain),
        "gex": {"net": _num(net_gex / 1e9 if net_gex is not None else None, 2),  # $bn per 1%
                "flip": _num(flip), "call_wall": _num(call_wall), "put_wall": _num(put_wall),
                "regime": gamma_regime, "strikes": gex_strikes,
                "expiries_used": gex_exps},
        "term": term, "term_shape": term_shape,
        "unusual": unusual,
        "flow": {"bullish": _num(bull_flow, 0), "bearish": _num(bear_flow, 0)},
        "chain": chain,
        "playbook": {"bias": bias, "score": score, "strategy": strategy, "notes": notes},
        "updated": datetime.now().strftime("%H:%M:%S"),
    }


# ---------------------------------------------------------------- market regime
def market_regime() -> dict:
    syms = ["^VIX9D", "^VIX", "^VIX3M", "SPY"]
    df = yf.download(syms, period="1y", interval="1d", progress=False, auto_adjust=False)["Close"]
    df = df.ffill()
    last = df.iloc[-1]
    vix9d, vix, vix3m, spy = (float(last[s]) for s in syms)
    vix_pct = float((df["^VIX"] < vix).mean() * 100)
    ratio = vix / vix3m if vix3m else None
    short_ratio = vix9d / vix if vix else None
    spy_series = df["SPY"]
    spy_vs_50 = float((spy / spy_series.tail(50).mean() - 1) * 100)
    spy_vs_200 = float((spy / spy_series.tail(200).mean() - 1) * 100)

    if ratio and ratio > 1.0:
        regime, note = "STRESS", "VIX curve inverted (backwardation): fear is elevated, hedge or buy puts, avoid naked short premium."
    elif ratio and ratio > 0.92 or vix > 22:
        regime, note = "RISK-OFF", "VIX curve flattening: reduce size, prefer defined-risk spreads."
    else:
        regime, note = "RISK-ON", "VIX curve in contango: calm tape, premium selling and trend-following calls work best."
    if short_ratio and short_ratio > 1.05:
        note += " VIX9D > VIX: near-term event risk priced in."

    trend = "UPTREND" if spy_vs_50 > 0 and spy_vs_200 > 0 else "DOWNTREND" if spy_vs_50 < 0 and spy_vs_200 < 0 else "CHOP"
    return {
        "regime": regime, "note": note, "trend": trend,
        "vix9d": _num(vix9d), "vix": _num(vix), "vix3m": _num(vix3m),
        "vix_percentile": _num(vix_pct, 0),
        "term_ratio": _num(ratio, 3), "short_ratio": _num(short_ratio, 3),
        "spy": _num(spy), "spy_vs_50": _num(spy_vs_50), "spy_vs_200": _num(spy_vs_200),
        "updated": datetime.now().strftime("%H:%M:%S"),
    }
