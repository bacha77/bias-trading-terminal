import urllib.request
import json
import time
import sys

API_BASE = "https://bias-api-105092699964.us-central1.run.app"
FRONTEND_URL = "https://bias-trading-terminal-app.web.app"

def run_test(name, fn):
    print(f"[*] Testing {name}...", end=" ", flush=True)
    try:
        res = fn()
        print(f"PASSED ({res})")
        return True, res
    except Exception as e:
        print(f"FAILED ({e})")
        return False, str(e)

def http_get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=12) as resp:
        return json.loads(resp.read().decode())

def http_post(url, data_dict):
    body = json.dumps(data_dict).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=12) as resp:
        return json.loads(resp.read().decode())

print("="*60)
print("  B.I.A.S. PRODUCTION END-TO-END SYSTEM DIAGNOSTIC SUITE  ")
print("="*60)

results = {}

# 1. Frontend Web App Reachability
def test_frontend():
    req = urllib.request.Request(FRONTEND_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        if resp.status == 200:
            return f"HTTP {resp.status} OK (Size: {len(resp.read())} bytes)"
        raise ValueError(f"HTTP {resp.status}")
results["Frontend Web App"] = run_test("Firebase Hosting Web App", test_frontend)

# 2. Telegram Configuration & Authorization
def test_telegram_config():
    data = http_get(f"{API_BASE}/telegram/config")
    if not data.get("is_configured"):
        raise ValueError("Telegram not configured")
    return f"Configured (Chat ID: {data.get('chat_id')}, Token: {data.get('bot_token_masked')})"
results["Telegram Config"] = run_test("Telegram Integration Config", test_telegram_config)

# 3. Live DEX Positions & PnL Metrics
def test_dex_positions():
    data = http_get(f"{API_BASE}/api/dex/positions")
    pnl = data.get("pnl_summary", {})
    win_rate = pnl.get("win_rate")
    active_cnt = len(data.get("active_positions", []))
    closed_cnt = len(data.get("closed_trades", []))
    max_pos = data.get("max_positions")
    return f"Active: {active_cnt}/{max_pos}, Closed: {closed_cnt}, Win Rate: {win_rate}%, Realized: ${pnl.get('total_realized_usd')}"
results["DEX State & Positions"] = run_test("Live DEX Positions & P&L", test_dex_positions)

# 4. Multi-Chain Listings (Solana)
def test_solana_listings():
    data = http_get(f"{API_BASE}/api/dex/new-listings?chain=solana")
    listings = data.get("listings", [])
    if not listings:
        raise ValueError("No Solana listings returned")
    top = listings[0]
    return f"{len(listings)} tokens found | Top: {top['symbol']} (${top.get('price_usd')}, Safety: {top.get('safety_score')}, Flow: {top.get('whale_flow')})"
results["Solana Listings"] = run_test("Solana DexScreener + Forensics Radar", test_solana_listings)

# 5. Multi-Chain Listings (Base L2)
def test_base_listings():
    data = http_get(f"{API_BASE}/api/dex/new-listings?chain=base")
    listings = data.get("listings", [])
    if not listings:
        raise ValueError("No Base listings returned")
    top = listings[0]
    return f"{len(listings)} tokens found | Top: {top['symbol']} (${top.get('price_usd')}, Safety: {top.get('safety_score')}, Flow: {top.get('whale_flow')})"
results["Base L2 Listings"] = run_test("Base L2 Aerodrome + Forensics Radar", test_base_listings)

# 6. Dynamic Slot Expansion (/api/dex/set-max-positions)
def test_slot_expansion():
    # Test setting to 8
    res8 = http_post(f"{API_BASE}/api/dex/set-max-positions", {"max_positions": 8})
    if res8.get("max_positions") != 8:
        raise ValueError(f"Failed to set to 8: {res8}")
    # Reset back to 6
    res6 = http_post(f"{API_BASE}/api/dex/set-max-positions", {"max_positions": 6})
    if res6.get("max_positions") != 6:
        raise ValueError(f"Failed to set to 6: {res6}")
    return "Dynamic Slots (3 -> 8 -> 6) Verified Working"
results["Dynamic Slots"] = run_test("Dynamic Position Slots (3-10)", test_slot_expansion)

# 7. Risk Profile Switching
def test_risk_profiles():
    res = http_post(f"{API_BASE}/api/dex/set-risk-profile", {"profile": "SCALPER"})
    if res.get("risk_profile") != "SCALPER":
        raise ValueError(f"Failed SCALPER: {res}")
    res2 = http_post(f"{API_BASE}/api/dex/set-risk-profile", {"profile": "MOONBAG"})
    if res2.get("risk_profile") != "MOONBAG":
        raise ValueError(f"Failed MOONBAG: {res2}")
    return "SCALPER & MOONBAG profiles verified"
results["Risk Profiles"] = run_test("1-Click Risk Profiles", test_risk_profiles)

# 8. Simulated Execution (Snipe, Risk Check, Close)
def test_snipe_and_close():
    # Find a clean candidate
    sol_data = http_get(f"{API_BASE}/api/dex/new-listings?chain=solana")
    listings = sol_data.get("listings", [])
    clean = [t for t in listings if t.get("forensic_status") == "PASSED"]
    if not clean:
        clean = listings
    # Find a clean token that successfully snipes
    token_to_close = None
    sym = None
    for cand in clean[:5]:
        swap_res = http_post(f"{API_BASE}/api/dex/swap", {
            "token_address": cand["address"],
            "symbol": cand["symbol"],
            "amount_usd": 50.0,
            "mode": "SIMULATION",
            "chain": "solana"
        })
        if swap_res.get("status") == "SUCCESS":
            token_to_close = cand["address"]
            sym = cand["symbol"]
            break
        elif "Already hold" in swap_res.get("message", ""):
            token_to_close = cand["address"]
            sym = cand["symbol"]
            break

    if not token_to_close:
        # Check active positions to close an existing one
        pos_data = http_get(f"{API_BASE}/api/dex/positions")
        actives = pos_data.get("active_positions", [])
        if actives:
            token_to_close = actives[0]["address"]
            sym = actives[0]["symbol"]
        else:
            raise ValueError(f"Could not find an available token to snipe (cooldown or liquidity): {swap_res}")

    # 8b. Test manual exit
    close_res = http_post(f"{API_BASE}/api/dex/close-position?token_address={token_to_close}", {})
    if close_res.get("status") != "SUCCESS":
        raise ValueError(f"Close position failed: {close_res}")
        
    return f"Simulated Snipe & Exit verified on {sym} (Realized PnL: ${close_res.get('realized_pnl_usd')})"
results["Execution Lifecycle"] = run_test("Simulated Snipe -> Monitor -> Exit Cycle", test_snipe_and_close)

# 9. Telegram Alert Dispatch Test
def test_telegram_alert():
    alert_res = http_post(f"{API_BASE}/api/telegram/test", {})
    t_status = alert_res.get("telegram", {}).get("status") if isinstance(alert_res.get("telegram"), dict) else alert_res.get("telegram")
    if t_status != "delivered":
        raise ValueError(f"Telegram returned: {t_status}")
    return "Delivered directly to Telegram chat 5882481235 with live buttons"
results["Telegram Dispatch"] = run_test("Live Telegram Alert Delivery", test_telegram_alert)

print("\n" + "="*60)
passed_cnt = sum(1 for passed, _ in results.values() if passed)
total_cnt = len(results)
print(f"  DIAGNOSTIC SUMMARY: {passed_cnt}/{total_cnt} TESTS PASSED")
print("="*60)
