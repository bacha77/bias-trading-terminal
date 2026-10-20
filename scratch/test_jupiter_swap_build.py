import urllib.request
import json
import sys
import os
sys.path.insert(0, os.path.abspath('.'))
import solana_dex_engine

kp = solana_dex_engine.get_solana_keypair()
print("Pubkey:", kp.pubkey() if kp else "No keypair")

mint = "FhTRVAkQeiaLRJHYc13DBNhgw9N8ZPacvonaKfXxpump" # MOMO
amount_lamports = 46311225335

url = f"https://api.jup.ag/swap/v1/quote?inputMint={mint}&outputMint={solana_dex_engine.SOL_MINT}&amount={amount_lamports}&slippageBps=300"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req, timeout=6) as r:
    quote = json.loads(r.read().decode())

swap_url = "https://api.jup.ag/swap/v1/swap"
swap_payload = {
    "quoteResponse": quote,
    "userPublicKey": str(kp.pubkey()),
    "wrapAndUnwrapSol": True,
    "dynamicComputeUnitLimit": True,
    "prioritizationFeeLamports": "auto"
}
s_req = urllib.request.Request(
    swap_url,
    data=json.dumps(swap_payload).encode("utf-8"),
    headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"},
    method="POST"
)
try:
    with urllib.request.urlopen(s_req, timeout=8) as sr:
        swap_data = json.loads(sr.read().decode())
        print("Swap tx received! Length:", len(swap_data.get("swapTransaction", "")))
except urllib.error.HTTPError as e:
    print("HTTP error:", e.code, e.read().decode())
except Exception as e:
    print("Other error:", e)
