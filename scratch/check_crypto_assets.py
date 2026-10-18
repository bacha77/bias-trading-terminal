import urllib.request
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from server import get_alpaca_creds

creds = get_alpaca_creds()
url = f"{creds['base'].rstrip('/')}/v2/assets?asset_class=crypto&status=active"
req = urllib.request.Request(url, headers={
    "APCA-API-KEY-ID": creds["key"],
    "APCA-API-SECRET-KEY": creds["secret"]
})
with urllib.request.urlopen(req) as resp:
    assets = json.loads(resp.read().decode())
    print(f"Total active crypto assets on Alpaca: {len(assets)}")
    for a in assets:
        print(f"  {a['symbol']}: tradable={a['tradable']}, fractionable={a.get('fractionable')}")
