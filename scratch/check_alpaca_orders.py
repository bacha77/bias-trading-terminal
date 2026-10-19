import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import urllib.request
import json
from server import get_alpaca_creds

creds = get_alpaca_creds()
base = creds["base"].rstrip("/")
req = urllib.request.Request(
    f"{base}/v2/orders?status=all&limit=30",
    headers={"APCA-API-KEY-ID": creds["key"], "APCA-API-SECRET-KEY": creds["secret"]}
)
with urllib.request.urlopen(req) as resp:
    orders = json.loads(resp.read().decode())
    print(f"Total orders returned: {len(orders)}")
    for o in orders:
        print(f"{o.get('created_at')} | {o.get('symbol')} | {o.get('side')} | {o.get('status')} | {o.get('filled_qty')}/{o.get('qty') or o.get('notional')} | type={o.get('type')} | asset_class={o.get('asset_class')}")
