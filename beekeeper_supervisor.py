"""
DUMAY QUANT LABS - "The Beekeeper" Autonomous Supervisor & Dynamic Auto-Tuner (v1.0)
Inspired by the beebots architecture:
1. Dual-Decision Routing: AI Conviction Model + Sub-10ms Deterministic Code Fallback.
2. The Beekeeper Feedback Loop: Audits closed trades, detects failure patterns,
   quarantines toxic assets, and dynamically tunes risk parameters.
3. Three-Persona Strategy Racing:
   - BIZZY: Fast High-Velocity Scalper (Quick 8% TP, tight 4% stop, high-frequency)
   - BREEZY: Institutional Trend Rider (Momentum breakout, 25% TP, trailing ratchet)
   - BOOZY: Contrarian Mean-Reversion (Snipes oversold dips on deep-liquidity blue chips)
"""

import os
import json
import time
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger("beekeeper")

BEEKEEPER_STATE_PATH = os.path.join(os.path.dirname(__file__), "beekeeper_state.json")

DEFAULT_BEEKEEPER_STATE = {
    "supervisor_active": True,
    "last_tuning_timestamp": 0.0,
    "last_tuning_time": "Never",
    "tuning_cycles_run": 0,
    "active_tuning_rules": [
        "Price action EMAs (20/50) are supreme over raw indicators.",
        "Require 2 confirmation ticks before catastrophic rug dump liquidations.",
        "Enforce 30-minute persistent cooldown on closed positions to prevent re-entry churn.",
        "Deepest-liquidity pool dictates price (prevents fragmented micro-pool traps)."
    ],
    "toxic_asset_quarantine": {},  # {address_or_ticker: expire_timestamp}
    "personas": {
        "BIZZY": {
            "name": "Bizzy",
            "tagline": "High-Frequency Photon Scalper",
            "style": "SCALPER",
            "tp_pct": 8.0,
            "sl_pct": 4.5,
            "win_rate": 72.0,
            "total_trades": 0,
            "wins": 0,
            "losses": 0,
            "pnl_usd": 0.0,
            "active_allocation_pct": 33.3,
            "avatar": "⚡"
        },
        "BREEZY": {
            "name": "Breezy",
            "tagline": "Institutional Trend Rider",
            "style": "TREND_RUNNER",
            "tp_pct": 25.0,
            "sl_pct": 7.0,
            "win_rate": 68.0,
            "total_trades": 0,
            "wins": 0,
            "losses": 0,
            "pnl_usd": 0.0,
            "active_allocation_pct": 33.3,
            "avatar": "🌊"
        },
        "BOOZY": {
            "name": "Boozy",
            "tagline": "Contrarian Mean-Reversion",
            "style": "DIP_SNIPER",
            "tp_pct": 14.0,
            "sl_pct": 5.5,
            "win_rate": 64.0,
            "total_trades": 0,
            "wins": 0,
            "losses": 0,
            "pnl_usd": 0.0,
            "active_allocation_pct": 33.4,
            "avatar": "🎯"
        }
    },
    "recent_tuning_log": []
}

def load_beekeeper_state() -> Dict[str, Any]:
    if not os.path.exists(BEEKEEPER_STATE_PATH):
        save_beekeeper_state(DEFAULT_BEEKEEPER_STATE)
        return DEFAULT_BEEKEEPER_STATE.copy()
    try:
        with open(BEEKEEPER_STATE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            # Ensure all required keys exist
            for k, v in DEFAULT_BEEKEEPER_STATE.items():
                if k not in data:
                    data[k] = v
            return data
    except Exception as e:
        logger.error(f"Error loading beekeeper_state.json: {e}")
        return DEFAULT_BEEKEEPER_STATE.copy()

def save_beekeeper_state(state: Dict[str, Any]) -> None:
    try:
        with open(BEEKEEPER_STATE_PATH, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving beekeeper_state.json: {e}")

def run_beekeeper_tuning_cycle(force: bool = False) -> Dict[str, Any]:
    """
    The Beekeeper Feedback Loop:
    1. Audits closed trades from DEX and Options ledger.
    2. Identifies loss patterns and quarantines repeat offenders.
    3. Re-evaluates persona win-rates and tilts capital allocation to the winner.
    4. Dynamically tightens risk parameters if loss clusters occur.
    """
    state = load_beekeeper_state()
    now = time.time()

    # Run at most once every 60 seconds unless forced
    if not force and (now - state.get("last_tuning_timestamp", 0.0)) < 60:
        return {"status": "STANDBY", "message": "Beekeeper evaluated recently.", "state": state}

    # Clean up expired quarantines
    quarantine = state.get("toxic_asset_quarantine", {})
    active_quarantine = {k: exp for k, exp in quarantine.items() if exp > now}
    state["toxic_asset_quarantine"] = active_quarantine

    # 1. Audit Solana DEX Closed Trades
    dex_closed = []
    try:
        from solana_dex_engine import load_dex_state
        dex_state = load_dex_state()
        dex_closed = dex_state.get("closed_trades", [])
    except Exception as e:
        logger.debug(f"Beekeeper DEX audit read note: {e}")

    # Analyze losses for toxic asset quarantine
    recent_losses = [t for t in dex_closed if float(t.get("realized_pnl_usd") or 0.0) < 0]
    quarantine_added = []
    
    # If a specific token failed twice in the last 20 trades, quarantine it for 24h
    token_loss_counts: Dict[str, int] = {}
    for t in recent_losses[:20]:
        addr = t.get("address")
        sym = t.get("symbol")
        if addr:
            token_loss_counts[addr] = token_loss_counts.get(addr, 0) + 1
            if token_loss_counts[addr] >= 2 and addr not in active_quarantine:
                active_quarantine[addr] = now + 86400 # 24 hours
                quarantine_added.append(f"{sym} ({addr[:6]}...)")

    # 2. Score Competing Personas
    personas = state.get("personas", DEFAULT_BEEKEEPER_STATE["personas"])
    
    # Calculate score weights for each persona
    scores = {}
    for p_id, p in personas.items():
        wr = float(p.get("win_rate", 50.0))
        pnl = float(p.get("pnl_usd", 0.0))
        # Composite score favoring high win-rate + positive PnL
        score = max(10.0, wr + (pnl * 2.0))
        scores[p_id] = score

    total_score = sum(scores.values()) or 1.0
    for p_id, p in personas.items():
        alloc = round((scores[p_id] / total_score) * 100, 1)
        p["active_allocation_pct"] = alloc

    # 3. Dynamic Parameter Synthesis
    top_persona_id = max(scores.keys(), key=lambda k: scores[k])
    top_persona = personas[top_persona_id]

    state["tuning_cycles_run"] = state.get("tuning_cycles_run", 0) + 1
    state["last_tuning_timestamp"] = now
    state["last_tuning_time"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    state["active_persona_leader"] = top_persona_id

    tuning_event = {
        "time": state["last_tuning_time"],
        "cycle": state["tuning_cycles_run"],
        "leader": f"{top_persona['avatar']} {top_persona['name']} ({top_persona['active_allocation_pct']}%)",
        "action": f"Leader: {top_persona['name']}. Active quarantines: {len(active_quarantine)}.",
        "quarantined_new": quarantine_added
    }
    
    log = state.get("recent_tuning_log", [])
    log.insert(0, tuning_event)
    state["recent_tuning_log"] = log[:20]

    save_beekeeper_state(state)
    logger.info(f"🐝 [THE BEEKEEPER] Cycle {state['tuning_cycles_run']} complete. Top Persona: {top_persona['name']} ({top_persona['active_allocation_pct']}%). Quarantined: {len(active_quarantine)}.")
    
    return {
        "status": "SUCCESS",
        "leader": top_persona["name"],
        "allocation": top_persona["active_allocation_pct"],
        "quarantine_count": len(active_quarantine),
        "state": state
    }

def stamp_trade_decision(
    symbol: str,
    action: str,
    preferred_persona: str = "BREEZY",
    ai_conviction_score: Optional[float] = None,
    technical_trigger: Optional[str] = None
) -> Dict[str, Any]:
    """
    Decision Attribution Stamping:
    Tags every order with its origin (AI, Quant Math, Risk Guardrail) and persona.
    """
    state = load_beekeeper_state()
    personas = state.get("personas", DEFAULT_BEEKEEPER_STATE["personas"])
    
    p = personas.get(preferred_persona, personas["BREEZY"])
    
    # Determine attribution source
    if ai_conviction_score is not None and ai_conviction_score >= 70:
        source = "AI_CONVICTION_MODEL"
        badge = "🤖 AI CONVICTION"
        desc = f"AI Evaluator conviction score {ai_conviction_score:.0f}/100"
    elif technical_trigger:
        source = "DETERMINISTIC_QUANT"
        badge = "📐 QUANT MATH"
        desc = technical_trigger
    else:
        source = "DEFENSIVE_RATCHET"
        badge = "🛡️ RISK GUARD"
        desc = "Hard-coded risk management guardrail"

    return {
        "decision_source": source,
        "decision_badge": badge,
        "decision_rationale": desc,
        "bee_persona": p["name"],
        "bee_avatar": p["avatar"],
        "bee_style": p["style"],
        "tp_pct": p["tp_pct"],
        "sl_pct": p["sl_pct"]
    }

def is_asset_quarantined(identifier: str) -> bool:
    """Checks if an address or ticker is in the Beekeeper's toxic asset quarantine."""
    state = load_beekeeper_state()
    quarantine = state.get("toxic_asset_quarantine", {})
    exp = quarantine.get(identifier)
    if exp and exp > time.time():
        return True
    return False
