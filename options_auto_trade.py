"""
B.I.A.S. Options Auto-Trade Engine
Specialized module for automated options trading on Alpaca & Paper Simulation:
- Routes Options Contracts (Calls/Puts) instead of buying equity shares.
- Uses standard OCC option symbol formatting (e.g. SPY261016C00585000).
- Intraday Bracket Protection: +40% Take Profit, -25% Stop Loss.
- End-Of-Day (EOD) 15:50 ET Auto-Flatten: Guaranteed same-day close to eliminate overnight theta decay, gap risk, and assignment.
"""

import math
import time
from datetime import datetime, date, timedelta, timezone
from typing import Dict, Any, Optional, List

try:
    from zoneinfo import ZoneInfo
    ET_ZONE = ZoneInfo("America/New_York")
except Exception:
    ET_ZONE = timezone(timedelta(hours=-4))

LIQUID_OPTIONS_TICKERS = {
    # Index & Macro ETFs
    "SPY", "QQQ", "IWM", "DIA", "SMH", "XLF", "XLE", "XLK", "TLT", "IBIT", "GLD", "SLV",
    # Mega-Cap Tech Giants
    "NVDA", "AAPL", "TSLA", "MSFT", "AMZN", "META", "GOOGL", "NFLX", "ORCL", "CRM",
    # AI, Semis & Hardware
    "AMD", "AVGO", "TSM", "SMCI", "MU", "ARM", "INTC", "QCOM", "TXN",
    # High-Beta Momentum & Crypto Proxies
    "PLTR", "COIN", "MSTR", "MARA", "SOFI", "UBER", "HOOD", "AFRM", "APP", "RDDT", "SHOP", "SNOW", "DKNG",
    # Financials & Blue Chips
    "JPM", "BAC", "GS", "V", "MA", "DIS", "BABA", "BA", "XOM", "CAT", "LLY"
}

def get_current_et_time() -> datetime:
    return datetime.now(ET_ZONE)

def get_next_expiry_date(ticker: str) -> date:
    """
    Returns the nearest viable expiration date.
    SPY, QQQ, and IWM have daily expirations (0DTE allowed if before 15:30 ET).
    Other tickers expire on Fridays.
    """
    now_et = get_current_et_time()
    today = now_et.date()
    weekday = now_et.weekday() # 0 = Monday, 4 = Friday
    
    # If SPY, QQQ, or IWM: Only allow 0DTE during morning momentum (before 11:30 AM ET)
    # After 11:30 AM ET, 0DTE extrinsic value decays too rapidly (theta burn), so roll to next expiry.
    if ticker.upper() in ["SPY", "QQQ", "IWM"] and weekday < 5:
        if now_et.hour < 11 or (now_et.hour == 11 and now_et.minute < 30):
            return today
    
    # Otherwise find nearest Friday (at least 1-2 days out for safe theta management)
    days_until_friday = (4 - weekday) % 7
    if days_until_friday == 0 and (now_et.hour > 11 or (now_et.hour == 11 and now_et.minute >= 30)):
        # If it's already Friday midday/afternoon, roll to next Friday
        days_until_friday = 7
    elif days_until_friday == 0 and weekday == 4:
        # Friday morning momentum only
        days_until_friday = 0
    elif days_until_friday == 0:
        days_until_friday = 7

    target = today + timedelta(days=days_until_friday)
    return target

def build_occ_symbol(ticker: str, expiry: date, option_type: str, strike: float) -> str:
    """
    Builds standard OCC option symbol:
    ROOT (up to 6 chars) + YYMMDD + (C/P) + 8-digit price (5 whole, 3 decimals).
    Example: SPY expiring Oct 16, 2026, Call at $585.50 -> SPY261016C00585500
    """
    root = ticker.upper().strip()
    yymmdd = expiry.strftime("%y%m%d")
    call_put = "C" if option_type.upper().startswith("C") else "P"
    
    strike_int = int(round(strike * 1000))
    strike_str = f"{strike_int:08d}"
    
    return f"{root}{yymmdd}{call_put}{strike_str}"

def get_atm_strike(spot: float, option_type: str, ticker: str) -> float:
    """
    Calculates the most liquid At-The-Money (or 1-tick OTM) strike.
    """
    is_call = option_type.upper().startswith("C")
    
    # Determine strike increment
    if spot >= 400:
        step = 1.0 # SPY, QQQ, high-dollar ETFs
    elif spot >= 150:
        step = 1.0 # NVDA, AAPL, TSLA
    elif spot >= 50:
        step = 0.50
    else:
        step = 0.50

    if is_call:
        # For call: pick strike closest to spot or first strike just above/at spot
        raw_strike = math.floor(spot / step) * step if (spot % step) < (step * 0.4) else math.ceil(spot / step) * step
    else:
        # For put: pick strike closest to spot or first strike just below/at spot
        raw_strike = math.ceil(spot / step) * step if (spot % step) > (step * 0.6) else math.floor(spot / step) * step

    return round(raw_strike, 2)

def estimate_option_premium(spot: float, strike: float, dte_days: float, is_call: bool, iv: float = 0.22) -> float:
    """
    Estimate intraday option premium using simplified Black-Scholes ATM approximation.
    Ensures minimum realistic bid-ask mid price for order limits.
    """
    t_years = max(dte_days, 0.2) / 365.0
    sigma = max(iv, 0.15)
    
    # Intrinsic value
    intrinsic = max(0.0, (spot - strike) if is_call else (strike - spot))
    
    # Approximate ATM time value: 0.4 * S * sigma * sqrt(T)
    time_val = 0.3989 * spot * sigma * math.sqrt(t_years)
    
    total = intrinsic + time_val
    # Clamp to realistic penny-increment price
    premium = max(0.40, round(total, 2))
    return premium

def generate_options_bracket_setup(
    ticker: str,
    spot: float,
    bias: str,
    confidence: float = 75.0,
    contract_qty: int = 1,
    atr_metrics: Optional[Dict[str, Any]] = None,
    iv: float = 0.25
) -> Dict[str, Any]:
    """
    Generates an institutional Options-Only bracket order setup.
    Instead of buying equity shares, selects high-liquidity ATM Calls/Puts.
    Uses Volatility-Adjusted (ATR & IV) dynamic profit targets and stops.
    """
    sym = ticker.upper().strip()
    is_bull = "BULL" in bias.upper() or bias.upper() in ["BUY", "LONG"]
    option_type = "CALL" if is_bull else "PUT"
    
    expiry = get_next_expiry_date(sym)
    strike = get_atm_strike(spot, option_type, sym)
    occ_symbol = build_occ_symbol(sym, expiry, option_type, strike)
    
    now_et = get_current_et_time()
    dte_days = max(0.1, (expiry - now_et.date()).days)
    
    # 1. Estimate base option premium with Black-Scholes approximation
    est_premium = estimate_option_premium(spot, strike, dte_days, is_call=is_bull, iv=iv)
    
    # 2. Dynamic Volatility-Conditioned Bracket Percentages:
    # High-IV / High-ATR names (TSLA, NVDA, COIN) need wider breath to avoid stop hunts.
    # Low-IV compression names (SPY, XLF, DIA) use tighter stops and realistic targets.
    atr_pct = atr_metrics.get("atr_pct", 1.5) if atr_metrics else 1.5
    vol_regime = atr_metrics.get("regime", "NORMAL EQUILIBRIUM") if atr_metrics else "NORMAL EQUILIBRIUM"

    if "HIGH" in vol_regime or iv > 0.45 or atr_pct > 2.5:
        tp_mult = 1.65 # +65% target for high-beta expansion
        sl_mult = 0.68 # -32% stop to absorb intraday noise
        tp_label = "+65.0%"
        sl_label = "-32.0%"
    elif "LOW" in vol_regime or iv < 0.18 or atr_pct < 1.0:
        tp_mult = 1.30 # +30% target in tight compression
        sl_mult = 0.82 # -18% strict capital preservation stop
        tp_label = "+30.0%"
        sl_label = "-18.0%"
    else:
        tp_mult = 1.45 # +45% target in normal equilibrium
        sl_mult = 0.75 # -25% stop
        tp_label = "+45.0%"
        sl_label = "-25.0%"

    tp_premium = round(est_premium * tp_mult, 2)
    sl_premium = round(est_premium * sl_mult, 2)
    
    total_cost = round(est_premium * 100 * contract_qty, 2)
    max_loss = round((est_premium - sl_premium) * 100 * contract_qty, 2)
    max_profit = round((tp_premium - est_premium) * 100 * contract_qty, 2)
    
    # 3. Dynamic Trailing Step (0.5x ATR equivalent on premium)
    trailing_step = round(max(0.15, (est_premium * 0.10)), 2)

    return {
        "instrument": "OPTION",
        "ticker": sym,
        "occ_symbol": occ_symbol,
        "contract_symbol": occ_symbol,
        "symbol": occ_symbol,
        "option_type": option_type,
        "strike": strike,
        "expiry_str": expiry.strftime("%Y-%m-%d"),
        "expiry": expiry.strftime("%Y-%m-%d"),
        "dte_days": int(dte_days),
        "contracts": contract_qty,
        "multiplier": 100,
        "spot_price": spot,
        "limit_premium": est_premium,
        "estimated_premium": est_premium,
        "take_profit_premium": tp_premium,
        "take_profit_price": tp_premium,
        "stop_loss_premium": sl_premium,
        "stop_loss_price": sl_premium,
        "take_profit_pct": tp_label,
        "stop_loss_pct": sl_label,
        "volatility_regime": vol_regime,
        "trailing_step": trailing_step,
        "total_cost": total_cost,
        "max_risk_dollars": max_loss,
        "max_reward_dollars": max_profit,
        "same_day_exit_time": "15:50 ET",
        "same_day_rule": "MANDATORY_EOD_FLATTEN",
        "action_headline": f"BUY {contract_qty}x {sym} ${strike:.2f} {option_type} Exp {expiry.strftime('%m/%d')} @ ${est_premium:.2f} ({tp_label} / {sl_label})",
        "confidence": confidence
    }
