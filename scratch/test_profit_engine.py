import math

def simulate_profit_scaling(peak_pnl, current_pnl, qty, is_trimmed):
    # Rule 1: Breakeven Defense (+15% peak)
    if peak_pnl >= 0.15 and peak_pnl < 0.35:
        if current_pnl <= 0.02:
            return "EXIT_BREAKEVEN", qty
            
    # Rule 2: Scale Trim 50% (+35% gain)
    if current_pnl >= 0.35 and qty >= 2 and not is_trimmed:
        trim_qty = int(math.ceil(qty / 2))
        return "SCALE_TRIM_50%", trim_qty
        
    # Rule 3: High-Water Mark Trailing Stop on Runner
    if peak_pnl >= 0.35:
        if peak_pnl >= 1.00:
            floor = peak_pnl - 0.22
        elif peak_pnl >= 0.60:
            floor = peak_pnl - 0.18
        else:
            floor = max(0.20, peak_pnl - 0.14)
            
        if current_pnl <= floor:
            return f"RUNNER_EXIT_AT_FLOOR_{round(floor*100)}%", qty
            
    # Stop Loss Trigger (-28%)
    if current_pnl <= -0.28:
        return "STOP_LOSS_CLOSED", qty
        
    return "HOLD", 0

scenarios = [
    ("Scenario 1: Small profit (+8%), no exit", 0.08, 0.08, 2, False),
    ("Scenario 2: Peaked at +18%, dropped to +1% -> Breakeven protection", 0.18, 0.01, 2, False),
    ("Scenario 3: Surged to +40% with 4 contracts -> 50% scale trim", 0.40, 0.40, 4, False),
    ("Scenario 4: Runner peaked at +75%, pulled back to +55% -> Locked in floor", 0.75, 0.55, 2, True),
    ("Scenario 5: Multi-bagger peaked at +150%, pulled back to +125% -> Trailing lock", 1.50, 1.25, 2, True),
    ("Scenario 6: Trade turned against us to -30% -> Stop loss triggered", 0.05, -0.30, 2, False),
]

print("=" * 65)
print("TESTING MULTI-STAGE PROFIT-TAKING & TRAILING STOP LOGIC")
print("=" * 65)
for desc, peak, curr, qty, trimmed in scenarios:
    action, q = simulate_profit_scaling(peak, curr, qty, trimmed)
    print(f"{desc}")
    print(f"  -> Outcome: {action} (Contracts: {q})")
print("=" * 65)
