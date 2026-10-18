import urllib.request
import json
import time

BASE_URL = "https://bias-api-901493256178.us-central1.run.app"

endpoints = [
    ("Copilot Status", "/api/copilot/status"),
    ("Alpaca Account", "/api/alpaca/account"),
    ("Alpaca Positions", "/api/alpaca/positions"),
    ("Paper Positions", "/api/paper/positions"),
    ("Alpaca Tape (SPY, QQQ)", "/api/alpaca/tape?symbols=SPY,QQQ,NVDA"),
    ("Breakout Scanner", "/api/scanner/breakout"),
    ("Reversals Scanner", "/api/scanner/reversals"),
    ("Macro Rates", "/api/macro/rates"),
    ("Market Regime", "/api/market/regime"),
    ("Crypto Gem Radar", "/api/crypto/gem-radar?chain=all&min_liquidity=5000"),
    ("Smart Intelligence (SPY)", "/api/algo/smart-intelligence?ticker=SPY"),
    ("Pairs Arbitrage", "/api/algo/pairs-arbitrage"),
    ("Multi-Timeframe (SPY)", "/api/algo/multi-timeframe?ticker=SPY"),
    ("Options Analytics (SPY)", "/api/options/analytics?ticker=SPY")
]

results = []
print("=" * 60)
print("RUNNING COMPREHENSIVE ENDPOINT AUDIT ON BIAS TERMINAL")
print("=" * 60)

for name, path in endpoints:
    url = f"{BASE_URL}{path}"
    start = time.time()
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Terminal-Audit/1.0"})
        with urllib.request.urlopen(req, timeout=12) as resp:
            code = resp.status
            elapsed = round((time.time() - start) * 1000, 1)
            raw = resp.read().decode()
            data = json.loads(raw)
            status_str = "PASS" if code == 200 else f"HTTP {code}"
            
            # Additional detail extraction
            detail = ""
            if "status" in path:
                detail = f"Armed: {data.get('armed')}, Msg: {data.get('last_status_message')[:35]}..."
            elif "positions" in path:
                cnt = len(data.get("positions", [])) if isinstance(data.get("positions"), list) else len(data.get("positions", {}))
                detail = f"{cnt} positions reported"
            elif "tape" in path:
                detail = f"{len(data.get('tape', {}))} tickers active in tape"
            elif "breakout" in path or "reversals" in path:
                detail = f"{data.get('total', 0)} setups detected"
            
            print(f"[{status_str}] {name:26} ({elapsed}ms) {detail}")
            results.append((name, True, elapsed, None))
    except Exception as e:
        elapsed = round((time.time() - start) * 1000, 1)
        print(f"[FAIL] {name:26} ({elapsed}ms) Error: {str(e)[:50]}")
        results.append((name, False, elapsed, str(e)))

print("=" * 60)
passed = sum(1 for r in results if r[1])
total = len(results)
print(f"AUDIT SUMMARY: {passed}/{total} ENDPOINTS FUNCTIONING NORMALLY")
print("=" * 60)
