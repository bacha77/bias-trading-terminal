import urllib.request
import json

# 1. DexScreener Top Solana Tokens
url = 'https://api.dexscreener.com/token-boosts/top/v1'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req, timeout=8) as resp:
        data = json.loads(resp.read().decode())
    sol_tokens = [t for t in data if t.get('chainId') == 'solana']
    print(f'Top Boosted Solana Tokens: {len(sol_tokens)}')
    for t in sol_tokens[:5]:
        print(t.get('tokenAddress'), t.get('url'))
except Exception as e:
    print('DexScreener Boosts error:', e)

# 2. Dexscreener Search Solana Pairs
url2 = 'https://api.dexscreener.com/latest/dex/search?q=solana'
req2 = urllib.request.Request(url2, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req2, timeout=8) as resp:
        data2 = json.loads(resp.read().decode())
    pairs = data2.get('pairs', [])
    print(f'Found {len(pairs)} pairs on Dexscreener')
    for p in pairs[:5]:
        base = p.get('baseToken', {}).get('symbol')
        quote = p.get('quoteToken', {}).get('symbol')
        px = p.get('priceUsd')
        vol = p.get('volume', {}).get('h24')
        liq = p.get('liquidity', {}).get('usd')
        print(f"{base}/{quote} | Price: ${px} | Vol 24h: ${vol} | Liq: ${liq}")
except Exception as e:
    print('DexScreener search error:', e)

# 3. Test Jupiter Quote API
# Quote 0.1 SOL -> USDC
sol_mint = 'So11111111111111111111111111111111111111112'
usdc_mint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
amount_lamports = 100_000_000 # 0.1 SOL
jup_url = f'https://quote-api.jup.ag/v6/quote?inputMint={sol_mint}&outputMint={usdc_mint}&amount={amount_lamports}&slippageBps=150'
req3 = urllib.request.Request(jup_url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req3, timeout=8) as resp:
        jup_data = json.loads(resp.read().decode())
    out_amount = int(jup_data.get('outAmount', 0)) / 1_000_000
    price_impact = jup_data.get('priceImpactPct')
    print(f"Jupiter Quote 0.1 SOL -> USDC: {out_amount:.2f} USDC (Impact: {price_impact}%)")
except Exception as e:
    print('Jupiter Quote error:', e)
