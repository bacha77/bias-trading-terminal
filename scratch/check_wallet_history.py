import urllib.request
import json
import datetime

req = urllib.request.Request(
    'https://api.mainnet-beta.solana.com',
    data=json.dumps({
        'jsonrpc': '2.0',
        'id': 1,
        'method': 'getSignaturesForAddress',
        'params': ['HWDJGvchEvVUHLPXwZwZsfrY135KhpN8zsmkaLe9xZq8', {'limit': 15}]
    }).encode(),
    headers={'Content-Type': 'application/json'}
)

with urllib.request.urlopen(req) as r:
    data = json.loads(r.read().decode())

for tx in data.get('result', []):
    ts = tx.get('blockTime')
    time_str = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S') if ts else 'N/A'
    print(f"Sig: {tx.get('signature')[:24]}... Time: {time_str} Err: {tx.get('err')}")
