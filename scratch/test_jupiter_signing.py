import urllib.request
import json
import base64
from solders.keypair import Keypair
from solders.transaction import VersionedTransaction

print("Testing solders imports...")
kp = Keypair()
print(f"Generated test Keypair: {kp.pubkey()}")

SOL_MINT = "So11111111111111111111111111111111111111112"
USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
lamports = 10_000_000 # 0.01 SOL

url = f"https://api.jup.ag/swap/v1/quote?inputMint={SOL_MINT}&outputMint={USDC_MINT}&amount={lamports}&slippageBps=100"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
try:
    with urllib.request.urlopen(req, timeout=8) as r:
        q = json.loads(r.read().decode())
        print(f"Jupiter quote success! In: {q.get('inAmount')} lamports, Out: {q.get('outAmount')} USDC units")
        
        # Test Jupiter Swap endpoint serialization
        swap_url = "https://api.jup.ag/swap/v1/swap"
        swap_payload = {
            "quoteResponse": q,
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
            s_data = json.loads(sr.read().decode())
            swap_tx_b64 = s_data.get("swapTransaction")
            print(f"Jupiter swap transaction received! Length: {len(swap_tx_b64)} chars")
            
            # Test VersionedTransaction deserialization and signing
            raw_tx_bytes = base64.b64decode(swap_tx_b64)
            tx = VersionedTransaction.from_bytes(raw_tx_bytes)
            print(f"VersionedTransaction successfully deserialized from bytes! Version: {tx.message}")
            
            # Sign transaction with Keypair
            signed_tx = VersionedTransaction(tx.message, [kp])
            signed_bytes = bytes(signed_tx)
            signed_b64 = base64.b64encode(signed_bytes).decode("utf-8")
            print(f"VersionedTransaction successfully SIGNED with keypair! Signed tx length: {len(signed_b64)}")
            print(f"Tx signature: {signed_tx.signatures[0]}")
            print("Jupiter On-Chain Signing Pipeline Validated 100%!")
except Exception as e:
    print(f"Error during Jupiter test: {e}")
