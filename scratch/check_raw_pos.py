import urllib.request
import json
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from server import get_alpaca_creds

creds = get_alpaca_creds()
url = f"{creds['base'].rstrip('/')}/v2/positions"
req = urllib.request.Request(url, headers={
    "APCA-API-KEY-ID": creds["key"],
    "APCA-API-SECRET-KEY": creds["secret"]
})
with urllib.request.urlopen(req) as resp:
    raw = json.loads(resp.read().decode())
    for p in raw:
        print(f"{p['symbol']}: qty={p.get('qty')} plpc={p.get('unrealized_plpc')} pl={p.get('unrealized_pl')} mkt_val={p.get('market_value')}")
