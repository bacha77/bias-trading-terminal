import urllib.request
import json
import sys
import os
sys.path.insert(0, os.path.abspath('.'))
import solana_dex_engine

mint = "FhTRVAkQeiaLRJHYc13DBNhgw9N8ZPacvonaKfXxpump" # MOMO
amount_lamports = 46311225335

url = f"https://api.jup.ag/swap/v1/quote?inputMint={mint}&outputMint={solana_dex_engine.SOL_MINT}&amount={amount_lamports}&slippageBps=300"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
try:
    with urllib.request.urlopen(req, timeout=6) as r:
        d = json.loads(r.read().decode())
        out_sol = int(d.get("outAmount", 0)) / 1e9
        print(f"Jupiter quote for MOMO: {out_sol:.4f} SOL (~${out_sol * solana_dex_engine.get_sol_price_usd():.2f} USD)")
except Exception as e:
    print("Jupiter quote error:", e)

# Also check WORTHLESS
mint_w = "87sEXKPMBeoryaqFQQnq1Yq6mUvjeNzhiFGxJbRjpump"
amount_w = 356451523972
url_w = f"https://api.jup.ag/swap/v1/quote?inputMint={mint_w}&outputMint={solana_dex_engine.SOL_MINT}&amount={amount_w}&slippageBps=300"
req_w = urllib.request.Request(url_w, headers={"User-Agent": "Mozilla/5.0"})
try:
    with urllib.request.urlopen(req_w, timeout=6) as r:
        d_w = json.loads(r.read().decode())
        out_sol_w = int(d_w.get("outAmount", 0)) / 1e9
        print(f"Jupiter quote for WORTHLESS: {out_sol_w:.4f} SOL (~${out_sol_w * solana_dex_engine.get_sol_price_usd():.2f} USD)")
except Exception as e:
    print("Jupiter quote error for WORTHLESS:", e)
