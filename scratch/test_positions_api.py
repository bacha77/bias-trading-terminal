import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import asyncio
from server import get_alpaca_positions

async def main():
    res = await get_alpaca_positions()
    print("Keys returned:", res.keys())
    print("Counts:", {
        "count": res.get("count"),
        "crypto_count": res.get("crypto_count"),
        "options_count": res.get("options_count"),
        "equity_count": res.get("equity_count"),
        "copilot_armed": res.get("copilot_armed"),
        "crypto_armed": res.get("crypto_armed")
    })
    for p in res.get("positions", []):
        print(f"  [{p.get('category')}] {p.get('symbol')} | Qty: {p.get('qty')} | MktVal: ${p.get('market_value')} | is_crypto: {p.get('is_crypto')} | is_option: {p.get('is_option')}")

if __name__ == "__main__":
    asyncio.run(main())
