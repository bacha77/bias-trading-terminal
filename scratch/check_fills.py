import urllib.request
import json
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from server import get_alpaca_creds

creds = get_alpaca_creds()
url = f"{creds['base'].rstrip('/')}/v2/account/activities?activity_types=FILL&limit=15"
req = urllib.request.Request(url, headers={
    "APCA-API-KEY-ID": creds["key"],
    "APCA-API-SECRET-KEY": creds["secret"]
})
with urllib.request.urlopen(req) as resp:
    fills = json.loads(resp.read().decode())
    for f in fills:
        print(f"{f['transaction_time']}: {f['side']} {f['qty']} {f['symbol']} @ ${f['price']}")
