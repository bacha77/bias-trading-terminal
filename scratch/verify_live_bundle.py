import urllib.request
import re

req = urllib.request.Request('https://bias-trading-terminal-app.web.app/', headers={'Cache-Control': 'no-cache', 'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp:
    html = resp.read().decode()

m = re.search(r'src="(/assets/index-[^"]+\.js)"', html)
if m:
    js_url = 'https://bias-trading-terminal-app.web.app' + m.group(1)
    print('Live JS Bundle:', js_url)
    req2 = urllib.request.Request(js_url, headers={'Cache-Control': 'no-cache', 'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req2) as resp2:
        js = resp2.read().decode()
    print('Contains DUMAY B.I.A.S.:', 'DUMAY B.I.A.S.' in js)
    print('Contains SOLANA DEX SNIPER:', 'SOLANA DEX SNIPER' in js)
    print('Contains TELEGRAM ALERTS:', 'TELEGRAM ALERTS' in js)
    print('Contains RISK SIMULATOR:', 'RISK SIMULATOR' in js)
    print('Contains PERFORMANCE:', 'PERFORMANCE' in js)
else:
    print('No bundle found in HTML:', html)
