import urllib.request
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from server import get_alpaca_creds

creds = get_alpaca_creds()
base = creds["base"].rstrip("/")
url = f"{base}/v2/orders"
headers = {
    "APCA-API-KEY-ID": creds["key"],
    "APCA-API-SECRET-KEY": creds["secret"],
    "Content-Type": "application/json"
}

# 1. Test notional order (e.g. $10 of BTC/USD)
order_notional = {
    "symbol": "BTC/USD",
    "notional": "10.00",
    "side": "buy",
    "type": "market",
    "time_in_force": "gtc"
}
req = urllib.request.Request(url, data=json.dumps(order_notional).encode("utf-8"), headers=headers, method="POST")
try:
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        print("Notional Market Order SUCCESS:")
        print(f"  Order ID: {res.get('id')}, Status: {res.get('status')}, Symbol: {res.get('symbol')}, Notional: {res.get('notional')}")
except urllib.error.HTTPError as he:
    print("Notional Market Order FAILED:", he.read().decode())

# 2. Check if order appears in open/filled orders
time_req = urllib.request.Request(f"{base}/v2/orders?limit=3", headers=headers)
with urllib.request.urlopen(time_req) as resp:
    orders = json.loads(resp.read().decode())
    for o in orders:
        print(f"Recent order: {o['symbol']} {o['side']} {o.get('notional') or o.get('qty')} status={o['status']}")
