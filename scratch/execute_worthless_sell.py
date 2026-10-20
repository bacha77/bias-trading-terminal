import sys, os
sys.path.insert(0, os.path.abspath('.'))
import solana_dex_engine

mint = "87sEXKPMBeoryaqFQQnq1Yq6mUvjeNzhiFGxJbRjpump" # WORTHLESS
raw_amt = 356451523972

print("Attempting to liquidate WORTHLESS back to SOL on Jupiter...")
res = solana_dex_engine.execute_jupiter_onchain_sell(mint, raw_amt, slippage_bps=350)
print("Result:", res)
