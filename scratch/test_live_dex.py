import urllib.request
import json

res = urllib.request.urlopen('https://bias-api-105092699964.us-central1.run.app/api/dex/new-listings')
data = json.loads(res.read())
print('Live Cloud Run DEX Listings Count:', data['count'])
for l in data['listings'][:3]:
    print(f"[{l['safety_score']}/100] {l['symbol']} | ${l['price_usd']} | Liq: ${l['liquidity_usd']:,.0f} | 5m: {l['price_change_5m']}%")
