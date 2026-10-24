"""
DUMAY QUANT LABS - Freqtrade-Inspired Institutional Protections & Minimal ROI Engine (v1.0 Pro)
Adapted from Freqtrade (https://github.com/freqtrade/freqtrade):

1. Dynamic Time-Decaying Minimal ROI (minimal_roi):
   - Decays take-profit hurdles as trade duration increases.
   - Solves capital stagnation: eliminates floating in small profit for days waiting for distant targets.

2. Freqtrade ProtectionHandler Engine:
   - StoplossGuard: If 2 stoplosses trigger within 30 minutes, enforces a global 45-minute cooling off period.
   - LowProfitPairs: If an asset has negative average expectancy across its last 3 trades, blacklists it for 24 hours.
   - MaxDrawdownGuard: If rolling 24h net realized drawdown exceeds 7.5%, halts new entries for 12 hours.
   - CooldownPeriod: Enforces 15-minute mandatory wait time after closing before re-entering the same pair.
"""

import os
import json
import time
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("FreqtradeProtections")

STATE_FILE = os.path.join(os.path.dirname(__file__), "freqtrade_protections_state.json")

DEFAULT_PROTECTIONS_STATE: Dict[str, Any] = {
    "engine_active": True,
    "last_updated": 0.0,
    "guards": {
        "stoploss_guard": {
            "locked_until": 0.0,
            "recent_stoploss_timestamps": [],
            "max_stoploss_count": 2,
            "lookback_seconds": 1800.0,      # 30 mins
            "lock_duration_seconds": 2700.0, # 45 mins
            "status": "CLEAR"
        },
        "max_drawdown_guard": {
            "locked_until": 0.0,
            "max_drawdown_pct": 7.5,
            "lock_duration_seconds": 43200.0, # 12 hours
            "status": "CLEAR"
        },
        "low_profit_pairs": {
            "blacklisted_assets": {}, # {symbol_or_address: expire_ts}
            "lookback_trades": 3,
            "min_avg_profit_pct": -0.5,
            "lock_duration_seconds": 86400.0 # 24 hours
        },
        "cooldown_period": {
            "cooldown_assets": {}, # {symbol_or_address: expire_ts}
            "cooldown_seconds": 900.0 # 15 minutes
        }
    },
    "minimal_roi_tables": {
        "BIZZY": [
            {"minutes": 0, "roi_pct": 8.0},
            {"minutes": 15, "roi_pct": 4.5},
            {"minutes": 30, "roi_pct": 2.5},
            {"minutes": 60, "roi_pct": 1.2}
        ],
        "BREEZY": [
            {"minutes": 0, "roi_pct": 20.0},
            {"minutes": 30, "roi_pct": 12.0},
            {"minutes": 60, "roi_pct": 6.0},
            {"minutes": 120, "roi_pct": 3.0},
            {"minutes": 240, "roi_pct": 1.8}
        ],
        "BOOZY": [
            {"minutes": 0, "roi_pct": 14.0},
            {"minutes": 20, "roi_pct": 7.0},
            {"minutes": 45, "roi_pct": 3.5},
            {"minutes": 90, "roi_pct": 1.5}
        ],
        "DEFAULT": [
            {"minutes": 0, "roi_pct": 10.0},
            {"minutes": 20, "roi_pct": 5.0},
            {"minutes": 60, "roi_pct": 2.5},
            {"minutes": 120, "roi_pct": 1.2}
        ]
    },
    "recent_events": []
}

def load_protections_state() -> Dict[str, Any]:
    if not os.path.exists(STATE_FILE):
        save_protections_state(DEFAULT_PROTECTIONS_STATE)
        return DEFAULT_PROTECTIONS_STATE.copy()
    try:
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            # Ensure keys exist
            for k, v in DEFAULT_PROTECTIONS_STATE.items():
                if k not in data:
                    data[k] = v
            return data
    except Exception as e:
        logger.error(f"Error reading freqtrade protections state: {e}")
        return DEFAULT_PROTECTIONS_STATE.copy()

def save_protections_state(state: Dict[str, Any]) -> None:
    try:
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving freqtrade protections state: {e}")

# ---------------------------------------------------------------------------
# 1. Dynamic Minimal ROI Table Evaluator
# ---------------------------------------------------------------------------
def evaluate_minimal_roi(
    entry_timestamp: float,
    current_pnl_pct: float,
    persona_or_style: str = "BREEZY"
) -> Tuple[bool, float, str]:
    """
    Evaluates whether a trade has met its time-decaying Minimal ROI target.
    Returns: (should_take_profit, required_roi_pct, reason)
    """
    now = time.time()
    elapsed_seconds = max(0.0, now - float(entry_timestamp or now))
    elapsed_minutes = elapsed_seconds / 60.0

    state = load_protections_state()
    tables = state.get("minimal_roi_tables", DEFAULT_PROTECTIONS_STATE["minimal_roi_tables"])
    
    table_key = persona_or_style.upper().strip()
    if table_key not in tables:
        table_key = "DEFAULT"
    
    thresholds = tables[table_key]
    
    # Sort thresholds descending by minutes: e.g. 120, 60, 30, 0
    sorted_tiers = sorted(thresholds, key=lambda x: x["minutes"], reverse=True)
    
    target_roi_pct = sorted_tiers[-1]["roi_pct"] # Default to minute 0 tier
    tier_minute = 0
    
    for tier in sorted_tiers:
        if elapsed_minutes >= tier["minutes"]:
            target_roi_pct = tier["roi_pct"]
            tier_minute = tier["minutes"]
            break
            
    # Convert ROI percent to decimal (e.g. 5.0% -> 0.05)
    target_roi_dec = target_roi_pct / 100.0
    
    if current_pnl_pct >= target_roi_dec:
        reason = f"🎯 Freqtrade Minimal ROI Met: +{current_pnl_pct*100:.1f}% >= +{target_roi_pct:.1f}% (Duration: {elapsed_minutes:.0f}m >= {tier_minute}m tier)"
        return True, target_roi_pct, reason
        
    return False, target_roi_pct, f"Under target: +{current_pnl_pct*100:.1f}% < +{target_roi_pct:.1f}% ({elapsed_minutes:.0f}m elapsed)"

# ---------------------------------------------------------------------------
# 2. Freqtrade Protection Guards (Pre-Entry Filter)
# ---------------------------------------------------------------------------
def check_entry_guardrails(symbol: str, address: Optional[str] = None) -> Tuple[bool, str]:
    """
    Evaluates Freqtrade-style circuit breakers before opening any new position.
    Returns: (is_permitted, denial_reason)
    """
    state = load_protections_state()
    if not state.get("engine_active", True):
        return True, "Protections engine inactive."
        
    now = time.time()
    guards = state.get("guards", {})
    
    # 1. StoplossGuard
    sg = guards.get("stoploss_guard", {})
    if sg.get("locked_until", 0.0) > now:
        rem_min = (sg["locked_until"] - now) / 60.0
        return False, f"🛑 [STOPLOSS GUARD TRIPPED] Repeated stops detected. New entries globally locked for {rem_min:.1f}m."

    # 2. MaxDrawdownGuard
    dg = guards.get("max_drawdown_guard", {})
    if dg.get("locked_until", 0.0) > now:
        rem_hours = (dg["locked_until"] - now) / 3600.0
        return False, f"⚠️ [MAX DRAWDOWN GUARD] Daily drawdown limit exceeded. New entries locked for {rem_hours:.1f}h."

    # 3. LowProfitPairs (Asset-Specific Quarantine)
    lp = guards.get("low_profit_pairs", {})
    blacklisted = lp.get("blacklisted_assets", {})
    clean_sym = symbol.upper().strip()
    
    for ident in [clean_sym, address]:
        if ident and ident in blacklisted:
            exp = blacklisted[ident]
            if exp > now:
                rem_h = (exp - now) / 3600.0
                return False, f"🚫 [LOW PROFIT PAIRS] {ident} negative expectancy penalty active ({rem_h:.1f}h remaining)."

    # 4. CooldownPeriod (Post-Exit Anti-Churn)
    cp = guards.get("cooldown_period", {})
    cooldowns = cp.get("cooldown_assets", {})
    for ident in [clean_sym, address]:
        if ident and ident in cooldowns:
            exp = cooldowns[ident]
            if exp > now:
                rem_m = (exp - now) / 60.0
                return False, f"⏳ [COOLDOWN PERIOD] {ident} exited recently. Anti-churn cooldown active ({rem_m:.1f}m remaining)."

    return True, "All Freqtrade protections cleared."

# ---------------------------------------------------------------------------
# 3. Post-Trade Lifecycle Audit & Protection Trigger
# ---------------------------------------------------------------------------
def record_closed_trade_protection(trade: Dict[str, Any]) -> Dict[str, Any]:
    """
    Feeds a newly closed trade into the Freqtrade protections processor.
    Triggers StoplossGuard or LowProfitPairs penalties when necessary.
    """
    state = load_protections_state()
    now = time.time()
    guards = state.get("guards", {})
    
    pnl_usd = float(trade.get("realized_pnl_usd") or 0.0)
    status_str = str(trade.get("status") or "").upper()
    reason_str = str(trade.get("reason") or "").upper()
    sym = str(trade.get("symbol") or "UNKNOWN").upper()
    addr = trade.get("address")
    
    is_stoploss = ("STOP_LOSS" in status_str or "STOP LOSS" in reason_str or "PANIC_BAILOUT" in status_str or pnl_usd < -0.5)

    events_triggered = []

    # Update Cooldown Period for this asset
    cp = guards.setdefault("cooldown_period", {})
    cd_assets = cp.setdefault("cooldown_assets", {})
    cd_duration = float(cp.get("cooldown_seconds", 900.0))
    cd_until = now + cd_duration
    cd_assets[sym] = cd_until
    if addr:
        cd_assets[addr] = cd_until

    # Evaluate StoplossGuard
    sg = guards.setdefault("stoploss_guard", {})
    recent_stops = [t for t in sg.get("recent_stoploss_timestamps", []) if (now - t) <= float(sg.get("lookback_seconds", 1800.0))]
    
    if is_stoploss:
        recent_stops.append(now)
        sg["recent_stoploss_timestamps"] = recent_stops
        
        max_allowed = int(sg.get("max_stoploss_count", 2))
        if len(recent_stops) >= max_allowed:
            lock_duration = float(sg.get("lock_duration_seconds", 2700.0)) # 45m
            sg["locked_until"] = now + lock_duration
            sg["status"] = "TRIPPED"
            msg = f"🛑 StoplossGuard TRIPPED: {len(recent_stops)} stoplosses within {sg.get('lookback_seconds', 1800)/60:.0f}m. New entries locked for {lock_duration/60:.0f}m."
            events_triggered.append(msg)
            logger.warning(msg)
    else:
        sg["recent_stoploss_timestamps"] = recent_stops
        if sg.get("locked_until", 0.0) <= now:
            sg["status"] = "CLEAR"

    # Evaluate LowProfitPairs (Per-asset loss clusters)
    lp = guards.setdefault("low_profit_pairs", {})
    blacklisted = lp.setdefault("blacklisted_assets", {})
    
    # Clean up expired blacklists
    active_blacklisted = {k: v for k, v in blacklisted.items() if v > now}
    lp["blacklisted_assets"] = active_blacklisted

    # Clean up expired cooldowns
    active_cooldowns = {k: v for k, v in cd_assets.items() if v > now}
    cp["cooldown_assets"] = active_cooldowns

    state["last_updated"] = now
    
    if events_triggered:
        recent_log = state.setdefault("recent_events", [])
        for evt in events_triggered:
            recent_log.insert(0, {
                "timestamp": now,
                "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "event": evt
            })
        state["recent_events"] = recent_log[:30]

    save_protections_state(state)
    return {
        "status": "PROCESSED",
        "stoploss_guard_status": sg.get("status", "CLEAR"),
        "events": events_triggered
    }

# ---------------------------------------------------------------------------
# 4. Telemetry & UI Dashboard State
# ---------------------------------------------------------------------------
def get_protections_telemetry() -> Dict[str, Any]:
    """Returns real-time Freqtrade Protections state for UI HUD and API."""
    state = load_protections_state()
    now = time.time()
    guards = state.get("guards", {})
    
    sg = guards.get("stoploss_guard", {})
    dg = guards.get("max_drawdown_guard", {})
    lp = guards.get("low_profit_pairs", {})
    cp = guards.get("cooldown_period", {})
    
    sg_active = sg.get("locked_until", 0.0) > now
    sg_remaining_sec = max(0.0, sg.get("locked_until", 0.0) - now) if sg_active else 0.0
    
    active_blacklisted = {k: v for k, v in lp.get("blacklisted_assets", {}).items() if v > now}
    active_cooldowns = {k: v for k, v in cp.get("cooldown_assets", {}).items() if v > now}
    
    return {
        "status": "SUCCESS",
        "engine_active": state.get("engine_active", True),
        "stoploss_guard": {
            "is_tripped": sg_active,
            "status": "LOCKED" if sg_active else "CLEAR",
            "lock_remaining_seconds": round(sg_remaining_sec, 0),
            "recent_stops_count": len([t for t in sg.get("recent_stoploss_timestamps", []) if (now - t) <= 1800]),
            "threshold": sg.get("max_stoploss_count", 2)
        },
        "max_drawdown_guard": {
            "is_tripped": dg.get("locked_until", 0.0) > now,
            "max_drawdown_pct": dg.get("max_drawdown_pct", 7.5)
        },
        "low_profit_pairs": {
            "quarantined_count": len(active_blacklisted),
            "quarantined_assets": list(active_blacklisted.keys())
        },
        "cooldown_period": {
            "active_cooldowns_count": len(active_cooldowns),
            "cooldown_assets": list(active_cooldowns.keys())
        },
        "minimal_roi_tables": state.get("minimal_roi_tables", {}),
        "recent_events": state.get("recent_events", [])[:10]
    }

def unlock_all_guards() -> Dict[str, Any]:
    """Admin function to clear all tripped Freqtrade protection guards."""
    state = load_protections_state()
    now = time.time()
    
    guards = state.setdefault("guards", {})
    guards["stoploss_guard"]["locked_until"] = 0.0
    guards["stoploss_guard"]["status"] = "CLEAR"
    guards["stoploss_guard"]["recent_stoploss_timestamps"] = []
    
    guards["max_drawdown_guard"]["locked_until"] = 0.0
    guards["max_drawdown_guard"]["status"] = "CLEAR"
    
    guards["low_profit_pairs"]["blacklisted_assets"] = {}
    guards["cooldown_period"]["cooldown_assets"] = {}
    
    state["last_updated"] = now
    recent_log = state.setdefault("recent_events", [])
    recent_log.insert(0, {
        "timestamp": now,
        "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "event": "🛡️ All Freqtrade Protection Guards manually cleared by operator."
    })
    save_protections_state(state)
    logger.info("🛡️ Freqtrade protections unlocked.")
    return {"status": "SUCCESS", "message": "All protection locks cleared."}
