import urllib.request, json, sys, os
sys.path.insert(0, os.path.abspath('.'))
import solana_dex_engine

mint_c = "DtcicPCKTKeAh7TDEzTym3hXeoHAoMiBdYJhMYxZpump"
amount_c = 106195702574
url_c = f"https://api.jup.ag/swap/v1/quote?inputMint={mint_c}&outputMint={solana_dex_engine.SOL_MINT}&amount={amount_c}&slippageBps=300"
req_c = urllib.request.Request(url_c, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req_c, timeout=6) as r:
    d_c = json.loads(r.read().decode())
    out_sol_c = int(d_c.get("outAmount", 0)) / 1e9
    print(f"Jupiter quote for CBUCKS: {out_sol_c:.4f} SOL (~${out_sol_c * solana_dex_engine.get_sol_price_usd():.2f} USD)")
