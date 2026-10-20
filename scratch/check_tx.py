import urllib.request
import json

req = urllib.request.Request(
    'https://api.mainnet-beta.solana.com',
    data=json.dumps({
        'jsonrpc': '2.0',
        'id': 1,
        'method': 'getSignaturesForAddress',
        'params': ['HWDJGvchEvVUHLPXwZwZsfrY135KhpN8zsmkaLe9xZq8', {'limit': 5}]
    }).encode(),
    headers={'Content-Type': 'application/json'}
)
with urllib.request.urlopen(req) as r:
    data = json.loads(r.read().decode())
sigs = [x['signature'] for x in data.get('result', [])]

for sig in sigs:
    req2 = urllib.request.Request(
        'https://api.mainnet-beta.solana.com',
        data=json.dumps({
            'jsonrpc': '2.0', 'id': 1,
            'method': 'getTransaction',
            'params': [sig, {'encoding': 'jsonParsed', 'maxSupportedTransactionVersion': 0}]
        }).encode(),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req2) as r2:
        d = json.loads(r2.read().decode())
        meta = d.get('result', {}).get('meta', {})
        logs = meta.get('logMessages', [])
        is_swap = any('swap' in l.lower() or 'jupiter' in l.lower() or 'pump' in l.lower() or 'raydium' in l.lower() for l in logs)
        print(f"Sig: {sig[:20]} | is_swap: {is_swap} | preBalances: {meta.get('preBalances', [])[:2]} | postBalances: {meta.get('postBalances', [])[:2]}")
        for l in logs:
            if 'Instruction: Swap' in l or 'Program log: Instruction' in l or 'Transfer' in l:
                print("  ", l)
