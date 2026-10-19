import os
import json
import time

STATE_FILE = os.path.join(os.path.dirname(__file__), "paper_state.json")
DEFAULT_CASH = 100000.0

def load_paper_state():
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r") as f:
                return json.load(f)
        except Exception:
            pass
    state = {
        "account_number": "PAPER-SIM-100K",
        "cash": DEFAULT_CASH,
        "positions": {},
        "order_history": [],
        "created_at": time.time()
    }
    save_paper_state(state)
    return state

def save_paper_state(state):
    try:
        with open(STATE_FILE, "w") as f:
            json.dump(state, f, indent=2)
    except Exception as e:
        print(f"Error saving paper state: {e}")

def get_paper_account(current_prices=None):
    state = load_paper_state()
    current_prices = current_prices or {}
    cash = state.get("cash", DEFAULT_CASH)
    positions = state.get("positions", {})
    
    total_market_val = 0.0
    for sym, pos in positions.items():
        qty = float(pos.get("qty", 0))
        entry = float(pos.get("avg_entry_price", 0))
        curr = float(current_prices.get(sym, entry))
        mult = 100.0 if pos.get("is_option") else 1.0
        total_market_val += curr * qty * mult

    portfolio_val = round(cash + total_market_val, 2)
    buying_power = round(cash * 2.0, 2)

    return {
        "connected": True,
        "account_number": state.get("account_number", "PAPER-SIM-100K"),
        "status": "ACTIVE",
        "cash": round(cash, 2),
        "buying_power": buying_power,
        "portfolio_value": portfolio_val,
        "currency": "USD",
        "is_paper": True,
        "mode": "PAPER_SIMULATION"
    }

def get_paper_positions(current_prices=None):
    state = load_paper_state()
    current_prices = current_prices or {}
    positions = state.get("positions", {})
    
    formatted = []
    total_upl = 0.0
    total_val = 0.0

    for sym, pos in positions.items():
        qty = float(pos.get("qty", 0))
        entry = float(pos.get("avg_entry_price", 0))
        curr = float(current_prices.get(sym, entry))
        side = pos.get("side", "BUY").upper()
        is_opt = bool(pos.get("is_option"))
        is_fx = bool(pos.get("is_forex")) or (("/" in sym or sym.endswith("=X")) and any(c in sym for c in ["EUR", "GBP", "JPY", "CHF", "AUD", "CAD"]))
        is_crypto = bool(pos.get("is_crypto")) or (sym in ["BTC", "ETH", "SOL", "DOGE", "XRP", "AVAX", "LINK", "ADA", "AAVE"] or (sym.endswith("USD") and not is_opt and len(sym) <= 8))
        pip_mult = float(pos.get("pip_mult", 100 if "JPY" in sym else 10000))
        lot_units = float(pos.get("lot_units", 100000.0)) if is_fx else 1.0
        mult = 100.0 if is_opt else (lot_units if is_fx else 1.0)
        
        category = "CRYPTO" if is_crypto else ("FOREX" if is_fx else ("OPTION" if is_opt else "EQUITY"))
        asset_class = "crypto" if is_crypto else ("forex" if is_fx else ("us_option" if is_opt else "us_equity"))
        
        mkt_val = round(curr * qty * mult, 2)
        if side in ["BUY", "LONG"]:
            upl = round((curr - entry) * qty * mult, 2)
            upl_pct = round(((curr - entry) / entry) * 100, 2) if entry > 0 else 0.0
            pips_gain = round((curr - entry) * pip_mult, 1) if is_fx else None
        else:
            upl = round((entry - curr) * qty * mult, 2)
            upl_pct = round(((entry - curr) / entry) * 100, 2) if entry > 0 else 0.0
            pips_gain = round((entry - curr) * pip_mult, 1) if is_fx else None

        total_upl += upl
        total_val += mkt_val

        formatted.append({
            "symbol": sym,
            "qty": int(qty) if qty.is_integer() else qty,
            "side": "LONG" if side in ["BUY", "LONG"] else "SHORT",
            "avg_entry_price": round(entry, 4 if is_fx else 2),
            "current_price": round(curr, 4 if is_fx else 2),
            "market_value": mkt_val,
            "unrealized_pl": upl,
            "unrealized_pl_pct": upl_pct,
            "change_today": upl_pct,
            "pips_gain": pips_gain,
            "take_profit": pos.get("take_profit"),
            "stop_loss": pos.get("stop_loss"),
            "entry_time": pos.get("entry_time"),
            "is_option": is_opt,
            "is_crypto": is_crypto,
            "is_forex": is_fx,
            "category": category,
            "asset_class": asset_class,
            "lot_units": lot_units,
            "underlying": pos.get("underlying") or sym,
            "option_type": pos.get("option_type"),
            "strike": pos.get("strike"),
            "expiry": pos.get("expiry"),
            "multiplier": int(mult)
        })

    return {
        "connected": True,
        "positions": formatted,
        "total_unrealized_pl": round(total_upl, 2),
        "total_market_value": round(total_val, 2),
        "count": len(formatted),
        "is_paper": True
    }

def execute_paper_bracket_order(
    symbol: str, 
    qty: float, 
    side: str, 
    entry_price: float, 
    take_profit: float, 
    stop_loss: float,
    is_option: bool = False,
    option_details: dict = None,
    is_forex: bool = False,
    forex_details: dict = None
):
    state = load_paper_state()
    sym = symbol.upper().strip()
    qty = float(qty)
    entry_price = float(entry_price)
    
    # Options have 100x multiplier; Forex uses standard interbank lot sizing (1.0 Lot = 100,000 units)
    is_opt = is_option or bool(option_details) or (len(sym) >= 10 and any(c in sym for c in ["C", "P"]) and any(char.isdigit() for char in sym))
    is_fx = is_forex or bool(forex_details) or ("/" in sym and len(sym) <= 8)
    lot_units = 100000.0 if is_fx else 1.0
    mult = 100.0 if is_opt else (lot_units if is_fx else 1.0)
    
    # Cost in USD (for forex: 1.0 lot has nominal margin requirement of $1,000 per lot @ 100:1 leverage)
    cost = round(qty * 1000.0, 2) if is_fx else round(qty * entry_price * mult, 2)
    current_cash = state.get("cash", DEFAULT_CASH)
    
    # Update position
    positions = state.get("positions", {})
    side_clean = side.upper()

    pos_data = {
        "symbol": sym,
        "qty": qty,
        "side": side_clean,
        "avg_entry_price": entry_price,
        "take_profit": take_profit,
        "stop_loss": stop_loss,
        "entry_time": time.time(),
        "is_option": is_opt,
        "is_forex": is_fx,
        "lot_units": lot_units,
        "pip_mult": 100 if "JPY" in sym else 10000,
        "multiplier": int(mult)
    }
    if option_details:
        pos_data.update(option_details)
    if forex_details:
        pos_data.update(forex_details)
        
    positions[sym] = pos_data

    # Deduct cash for buys
    if side_clean in ["BUY", "LONG"]:
        state["cash"] = max(0.0, current_cash - cost)

    order_ticket = {
        "order_id": f"paper_{int(time.time()*1000)}",
        "timestamp": time.time(),
        "time_str": time.strftime("%H:%M:%S"),
        "symbol": sym,
        "qty": qty,
        "side": side_clean,
        "entry_price": entry_price,
        "take_profit": take_profit,
        "stop_loss": stop_loss,
        "is_option": is_opt,
        "multiplier": int(mult),
        "total_cost": cost,
        "status": "FILLED"
    }

    history = state.get("order_history", [])
    history.insert(0, order_ticket)
    state["order_history"] = history[:50]
    state["positions"] = positions

    save_paper_state(state)
    return order_ticket

def close_paper_position(symbol: str, exit_price: float = None):
    state = load_paper_state()
    sym = symbol.upper().strip()
    positions = state.get("positions", {})
    
    if sym not in positions:
        return {"status": "NOT_FOUND", "message": f"No open paper position for {sym}"}

    pos = positions.pop(sym)
    qty = float(pos.get("qty", 0))
    entry = float(pos.get("avg_entry_price", 0))
    exit_p = float(exit_price) if exit_price else entry
    side = pos.get("side", "BUY")
    is_opt = bool(pos.get("is_option"))
    mult = 100.0 if is_opt else 1.0

    if side in ["BUY", "LONG"]:
        realized_pl = round((exit_p - entry) * qty * mult, 2)
        proceeds = round(qty * exit_p * mult, 2)
        state["cash"] = round(state.get("cash", DEFAULT_CASH) + proceeds, 2)
    else:
        realized_pl = round((entry - exit_p) * qty * mult, 2)
        proceeds = round((entry - exit_p) * qty * mult, 2)
        state["cash"] = round(state.get("cash", DEFAULT_CASH) + proceeds, 2)

    order_ticket = {
        "order_id": f"paper_close_{int(time.time()*1000)}",
        "timestamp": time.time(),
        "time_str": time.strftime("%H:%M:%S"),
        "symbol": sym,
        "qty": qty,
        "side": "CLOSE",
        "exit_price": exit_p,
        "realized_pl": realized_pl,
        "is_option": is_opt,
        "multiplier": int(mult),
        "status": "CLOSED"
    }

    history = state.get("order_history", [])
    history.insert(0, order_ticket)
    state["order_history"] = history[:50]
    state["positions"] = positions

    save_paper_state(state)
    return {"status": "SUCCESS", "message": f"Closed paper position {sym} at ${exit_p}. Realized P&L: ${realized_pl}", "ticket": order_ticket}

def flatten_eod_options(current_prices=None):
    """
    Auto-flattens all open options contracts at 15:50 ET to guarantee zero overnight holding.
    """
    state = load_paper_state()
    current_prices = current_prices or {}
    positions = state.get("positions", {})
    option_keys = [k for k, p in positions.items() if p.get("is_option")]
    
    closed_tickets = []
    for sym in option_keys:
        exit_p = current_prices.get(sym)
        res = close_paper_position(sym, exit_p)
        if res.get("ticket"):
            ticket = res["ticket"]
            ticket["close_reason"] = "SAME_DAY_EOD_1550_AUTO_CLOSE"
            closed_tickets.append(ticket)
            
    return {
        "status": "SUCCESS",
        "flattened_count": len(closed_tickets),
        "tickets": closed_tickets,
        "message": f"Successfully auto-flattened {len(closed_tickets)} open option positions at 15:50 ET (No overnight decay risk)."
    }

def flatten_all_paper_positions(current_prices=None):
    state = load_paper_state()
    current_prices = current_prices or {}
    positions = list(state.get("positions", {}).keys())
    
    for sym in positions:
        exit_p = current_prices.get(sym)
        close_paper_position(sym, exit_p)

    return {"status": "SUCCESS", "message": f"Liquidated and flattened {len(positions)} paper positions."}

def check_paper_bracket_triggers(current_prices: dict, ratchet_enabled: bool = True):
    """
    Evaluates open positions against Take Profit and Stop Loss limits.
    Includes Institutional Breakeven Ratchet:
    - At +20% gain: Ratchets Stop Loss to Breakeven (+2% fee buffer)
    - At +30% gain: Ratchets Stop Loss to Lock in +15% profit
    """
    state = load_paper_state()
    positions = dict(state.get("positions", {}))
    triggered = []
    ratchet_events = []
    updated_positions = False

    for sym, pos in positions.items():
        curr = current_prices.get(sym)
        if not curr:
            continue
        curr = float(curr)
        entry = float(pos.get("avg_entry_price", curr))
        tp = float(pos.get("take_profit") or 0)
        sl = float(pos.get("stop_loss") or 0)
        side = pos.get("side", "BUY")

        # Institutional 3-Tier Dynamic Breakeven & Profit Lock Ratchet
        if ratchet_enabled and entry > 0:
            gain_pct = ((curr - entry) / entry) if side in ["BUY", "LONG"] else ((entry - curr) / entry)
            curr_ratchet = int(pos.get("ratchet_level", 0))
            is_opt = bool(pos.get("is_option"))

            # Options have larger percentage swings than equities; calibrate thresholds
            t1_thresh = 0.15 if is_opt else 0.015  # Tier 1: +15% options gain -> Breakeven (+2%)
            t2_thresh = 0.28 if is_opt else 0.030  # Tier 2: +28% options gain -> Lock +12%
            t3_thresh = 0.45 if is_opt else 0.050  # Tier 3: +45% options gain -> Lock +25%
            t4_thresh = 0.70 if is_opt else 0.080  # Tier 4: +70% options gain -> Lock +50% runner
            t5_thresh = 1.00 if is_opt else 0.120  # Tier 5: +100% options gain -> Lock (Peak - 22%)

            # Tier 5: Multi-bagger Runner (+100%+ gain) -> Trail 22% below current peak
            if gain_pct >= t5_thresh:
                trail_mult = (gain_pct - 0.22)
                new_sl = round(entry * (1.0 + trail_mult if side in ["BUY", "LONG"] else 1.0 - trail_mult), 2)
                if (side in ["BUY", "LONG"] and new_sl > sl) or (side not in ["BUY", "LONG"] and (sl == 0 or new_sl < sl)):
                    pos["stop_loss"] = new_sl
                    pos["ratchet_level"] = 5
                    pos["ratchet_status"] = f"MULTI_BAGGER_TRAIL_+{round(trail_mult*100, 1)}%"
                    updated_positions = True
                    ratchet_events.append({"symbol": sym, "level": 5, "new_sl": new_sl, "gain_pct": round(gain_pct * 100, 1)})
            # Tier 4: High expansion (+70% gain) -> Lock in +50% profit
            elif gain_pct >= t4_thresh and curr_ratchet < 4:
                new_sl = round(entry * (1.50 if side in ["BUY", "LONG"] else 0.50), 2)
                if (side in ["BUY", "LONG"] and new_sl > sl) or (side not in ["BUY", "LONG"] and (sl == 0 or new_sl < sl)):
                    pos["stop_loss"] = new_sl
                    pos["ratchet_level"] = 4
                    pos["ratchet_status"] = "PROFIT_LOCKED_+50%_RUNNER"
                    updated_positions = True
                    ratchet_events.append({"symbol": sym, "level": 4, "new_sl": new_sl, "gain_pct": round(gain_pct * 100, 1)})
            # Tier 3: Expansion (+45% gain) -> Lock in +25% profit
            elif gain_pct >= t3_thresh and curr_ratchet < 3:
                new_sl = round(entry * (1.25 if side in ["BUY", "LONG"] else 0.75), 2)
                if (side in ["BUY", "LONG"] and new_sl > sl) or (side not in ["BUY", "LONG"] and (sl == 0 or new_sl < sl)):
                    pos["stop_loss"] = new_sl
                    pos["ratchet_level"] = 3
                    pos["ratchet_status"] = "PROFIT_LOCKED_+25%_RUNNER"
                    updated_positions = True
                    ratchet_events.append({"symbol": sym, "level": 3, "new_sl": new_sl, "gain_pct": round(gain_pct * 100, 1)})
            # Tier 2: Solid expansion (+28% gain) -> Lock in +12% profit
            elif gain_pct >= t2_thresh and curr_ratchet < 2:
                new_sl = round(entry * (1.12 if side in ["BUY", "LONG"] else 0.88), 2)
                if (side in ["BUY", "LONG"] and new_sl > sl) or (side not in ["BUY", "LONG"] and (sl == 0 or new_sl < sl)):
                    pos["stop_loss"] = new_sl
                    pos["ratchet_level"] = 2
                    pos["ratchet_status"] = "LOCKED_+12%"
                    updated_positions = True
                    ratchet_events.append({"symbol": sym, "level": 2, "new_sl": new_sl, "gain_pct": round(gain_pct * 100, 1)})
            # Tier 1: Initial surge (+15% gain) -> Move to Breakeven (+2% fee & slippage cushion)
            elif gain_pct >= t1_thresh and curr_ratchet < 1:
                new_sl = round(entry * (1.02 if side in ["BUY", "LONG"] else 0.98), 2)
                if (side in ["BUY", "LONG"] and new_sl > sl) or (side not in ["BUY", "LONG"] and (sl == 0 or new_sl < sl)):
                    pos["stop_loss"] = new_sl
                    pos["ratchet_level"] = 1
                    pos["ratchet_status"] = "BREAKEVEN_+2%"
                    updated_positions = True
                    ratchet_events.append({"symbol": sym, "level": 1, "new_sl": new_sl, "gain_pct": round(gain_pct * 100, 1)})

        sl = float(pos.get("stop_loss") or 0)
        hit_tp = False
        hit_sl = False

        if side in ["BUY", "LONG"]:
            if tp > 0 and curr >= tp: hit_tp = True
            elif sl > 0 and curr <= sl: hit_sl = True
        else:
            if tp > 0 and curr <= tp: hit_tp = True
            elif sl > 0 and curr >= sl: hit_sl = True

        if hit_tp:
            res = close_paper_position(sym, curr)
            triggered.append({"symbol": sym, "reason": "TAKE_PROFIT_HIT", "price": curr, "result": res})
        elif hit_sl:
            close_reason = "PROFIT_LOCK_HIT" if pos.get("ratchet_level", 0) >= 2 else ("BREAKEVEN_STOP_HIT" if pos.get("ratchet_level", 0) == 1 else "STOP_LOSS_HIT")
            res = close_paper_position(sym, curr)
            triggered.append({"symbol": sym, "reason": close_reason, "price": curr, "result": res})

    if updated_positions:
        state["positions"] = positions
        save_paper_state(state)

    return {"triggered": triggered, "ratchets": ratchet_events}

def get_pnl_analytics() -> dict:
    """
    Computes real-time PnL analytics, win rate, daily income, and trade performance.
    """
    from datetime import datetime, timezone, timedelta
    try:
        from zoneinfo import ZoneInfo
        et = datetime.now(ZoneInfo("America/New_York"))
    except Exception:
        et = datetime.now(timezone.utc) - timedelta(hours=4)
        
    today_prefix = et.strftime("%Y-%m-%d")

    state = load_paper_state()
    history = state.get("order_history", [])
    closed_orders = [o for o in history if o.get("side") == "CLOSE" and "realized_pl" in o]

    today_pnl = 0.0
    today_wins = 0
    today_losses = 0
    today_gains_total = 0.0
    today_losses_total = 0.0

    total_pnl = 0.0
    total_wins = 0
    total_losses = 0
    total_gains = 0.0
    total_loss_sum = 0.0

    for o in closed_orders:
        pl = float(o.get("realized_pl", 0.0))
        total_pnl += pl
        if pl > 0:
            total_wins += 1
            total_gains += pl
        elif pl < 0:
            total_losses += 1
            total_loss_sum += abs(pl)

        # Check if trade closed today (using timestamp or date)
        ts = o.get("timestamp", 0)
        trade_date = datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d")
        if trade_date == today_prefix:
            today_pnl += pl
            if pl > 0:
                today_wins += 1
                today_gains_total += pl
            elif pl < 0:
                today_losses += 1
                today_losses_total += abs(pl)

    today_total_trades = today_wins + today_losses
    today_win_rate = round((today_wins / today_total_trades) * 100, 1) if today_total_trades > 0 else 0.0

    all_total_trades = total_wins + total_losses
    all_win_rate = round((total_wins / all_total_trades) * 100, 1) if all_total_trades > 0 else 0.0
    profit_factor = round(total_gains / total_loss_sum, 2) if total_loss_sum > 0 else (round(total_gains, 2) if total_gains > 0 else 1.0)

    avg_win = round(total_gains / total_wins, 2) if total_wins > 0 else 0.0
    avg_loss = round(total_loss_sum / total_losses, 2) if total_losses > 0 else 0.0

    return {
        "today_realized_pnl": round(today_pnl, 2),
        "today_trades": today_total_trades,
        "today_wins": today_wins,
        "today_losses": today_losses,
        "today_win_rate": today_win_rate,
        "total_realized_pnl": round(total_pnl, 2),
        "total_trades": all_total_trades,
        "total_wins": total_wins,
        "total_losses": total_losses,
        "all_time_win_rate": all_win_rate,
        "profit_factor": profit_factor,
        "avg_win": avg_win,
        "avg_loss": avg_loss,
        "date_et": today_prefix
    }

