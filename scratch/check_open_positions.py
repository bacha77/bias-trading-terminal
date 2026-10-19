import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import urllib.request
import json
from server import get_alpaca_creds

creds = get_alpaca_creds()
base = creds["base"].rstrip("/")
req = urllib.request.Request(
    f"{base}/v2/positions",
    headers={"APCA-API-KEY-ID": creds["key"], "APCA-API-SECRET-KEY": creds["secret"]}
)
with urllib.request.urlopen(req) as resp:
    positions = json.loads(resp.read().decode())
    print(f"Total open positions: {len(positions)}")
    for p in positions:
        print(f"Symbol: {p.get('symbol')} | Asset Class: {p.get('asset_class')} | Qty: {p.get('qty')} | Market Val: {p.get('market_value')} | Side: {p.get('side')}")
