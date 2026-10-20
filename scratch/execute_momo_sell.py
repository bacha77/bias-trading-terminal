import sys, os
sys.path.insert(0, os.path.abspath('.'))
import solana_dex_engine

mint = "FhTRVAkQeiaLRJHYc13DBNhgw9N8ZPacvonaKfXxpump" # MOMO
raw_amt = 46311225335

print("Attempting to liquidate MOMO back to SOL on Jupiter...")
res = solana_dex_engine.execute_jupiter_onchain_sell(mint, raw_amt, slippage_bps=350)
print("Result:", res)
