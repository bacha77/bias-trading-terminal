import sys, os
sys.path.insert(0, os.path.abspath('.'))
import solana_dex_engine

w = solana_dex_engine.get_solana_wallet_status()
print(f"Liquid SOL Balance: {w['balance_sol']:.4f} SOL (~${w['balance_usd']:.2f} USD)")

pos = solana_dex_engine.sync_live_positions_from_chain()
print(f"Remaining on-chain positions: {[p['symbol'] for p in pos]}")
for p in pos:
    print(f"  {p['symbol']}: {p['tokens_held']:.2f} tokens (~${p['current_value_usd']:.2f} USD)")
