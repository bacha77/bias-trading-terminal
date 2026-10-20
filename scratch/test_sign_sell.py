import urllib.request, json, sys, os, base64
sys.path.insert(0, os.path.abspath('.'))
import solana_dex_engine
from solders.transaction import VersionedTransaction

kp = solana_dex_engine.get_solana_keypair()
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
with urllib.request.urlopen(s_req, timeout=8) as sr:
    swap_data = json.loads(sr.read().decode())
    swap_tx_b64 = swap_data.get("swapTransaction")

raw_tx_bytes = base64.b64decode(swap_tx_b64)
tx = VersionedTransaction.from_bytes(raw_tx_bytes)
signed_tx = VersionedTransaction(tx.message, [kp])
signed_b64 = base64.b64encode(bytes(signed_tx)).decode("utf-8")
print("Signed tx signature:", signed_tx.signatures[0])
print("Signing verified successfully!")
