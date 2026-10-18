import urllib.request
import json
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from server import get_alpaca_creds

creds = get_alpaca_creds()
url = f"{creds['base'].rstrip('/')}/v2/orders?status=all&limit=10"
req = urllib.request.Request(url, headers={
    "APCA-API-KEY-ID": creds["key"],
    "APCA-API-SECRET-KEY": creds["secret"]
})
with urllib.request.urlopen(req) as resp:
    orders = json.loads(resp.read().decode())
    for o in orders:
        print(f"{o['symbol']}: {o['side']} qty={o['qty']} status={o['status']} sub={o['submitted_at']} fill={o.get('filled_at')}")
