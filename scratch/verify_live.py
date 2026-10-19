import urllib.request
import json

url = 'https://bias-api-105092699964.us-central1.run.app/api/dex/positions'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, timeout=10) as resp:
    d = json.loads(resp.read().decode())
    pnl = d.get('pnl_summary', {})
    print('STATUS:', d.get('status'))
    print('ACTIVE POSITIONS:', len(d.get('active_positions', [])))
    print('CLOSED TRADES:', len(d.get('closed_trades', [])))
    print('WINS:', pnl.get('wins'))
    print('LOSSES:', pnl.get('losses'))
    print('CLOSED WIN RATE:', f"{pnl.get('win_rate')}%")
    print('TOTAL REALIZED BANKED:', f"${pnl.get('total_realized_usd')}")
