import React, { useState, createContext, useContext } from 'react';
import { X, CheckCircle2, TrendingUp, Zap, Target, BookOpen } from 'lucide-react';

export interface CardExplanation {
  id: string;
  title: string;
  category: string;
  summary: string;
  whatItDoes: string;
  keyNumbers: { label: string; meaning: string }[];
  howToTrade: string[];
  proTip?: string;
}

export const CARD_KNOWLEDGE: Record<string, CardExplanation> = {
  algo: {
    id: 'algo',
    title: 'AI Quant Board · Smart Algo v5.0 Pro',
    category: 'MACHINE LEARNING & GEX ENGINE',
    summary: '6-factor empirical Bayesian Online Stochastic Gradient Descent (SGD) options engine.',
    whatItDoes: 'Continuously synthesizes market maker GEX obligations, dark pool prints, 0DTE vanna decay, 25-delta IV skew, and Cumulative Volume Delta (CVD) to generate machine-actionable bracket orders.',
    keyNumbers: [
      { label: 'Model Conf %', meaning: 'Bayesian posterior probability of trade conviction. Over 80% signifies high institutional confluence.' },
      { label: '25Δ IV Skew', meaning: 'Difference between 25-delta Put IV and Call IV. >3.8% = smart money panic hedging; <0.2% = call euphoria.' },
      { label: 'CVD Ratio %', meaning: 'Net aggressive market order volume delta. Positive = Ask sweeps (buyers); Negative = Bid hits (sellers).' },
      { label: '0DTE Hedging Velocity', meaning: 'Estimated rate ($M/hr) dealers must buy or sell underlying shares to stay delta-neutral.' },
      { label: 'ATR(14) Volatility Stops', meaning: 'Regime-scaled stop-loss and take-profit distances preventing premature stop-outs during volatility sweeps.' },
      { label: 'Kelly Optimal %', meaning: 'Half-Kelly mathematical position sizing. Never allocate more than this percentage of your portfolio.' }
    ],
    howToTrade: [
      'Bullish Execution: Spot above Gamma Flip + Markov "DEALER PINNING" + CVD > +10% -> Enter recommended Call Debit Spread toward Call Wall.',
      'Bearish Execution: Spot below Gamma Flip + Markov "GAMMA EXPANSION" + Skew > +3.5% -> Enter Put Debit Spread targeting Put Wall.',
      '0DTE Power Hour: Between 14:00 and 16:00 ET, check Pin Risk alert. If price is within 0.5% of a Wall, take profits as price pins to the strike.',
      'Click the 1-Click Bracket Order button to route directly to Alpaca with stop loss and take profit attached.'
    ],
    proTip: 'When 25Δ Skew spikes above 4.0% while price is green, DO NOT buy calls. Smart money is quietly paying top dollar for put protection before a dip.'
  },
  metrics: {
    id: 'metrics',
    title: 'Key Metrics Strip (GEX & Volatility)',
    category: 'STRUCTURAL OPTIONS BENCHMARKS',
    summary: 'Core institutional levels derived from options open interest and Black-Scholes gamma.',
    whatItDoes: 'Maps the structural boundaries that dictate where market makers must buy, sell, or pin the underlying stock.',
    keyNumbers: [
      { label: 'Expected Move (±$X)', meaning: 'Derived from ATM straddle price. 68% of price action will stay within this range into expiration.' },
      { label: 'Gamma Flip ($)', meaning: 'The volatility switch level. Above it, dealers dampen volatility; below it, dealers amplify volatility.' },
      { label: 'Net GEX ($B)', meaning: 'Net dollar delta change per 1% move. Positive = stabilizing/grinding up; Negative = explosive downside cascade risk.' },
      { label: 'Call Wall ($)', meaning: 'Highest Call open interest strike. Serves as hard resistance and upside take-profit magnet.' },
      { label: 'Put Wall ($)', meaning: 'Highest Put open interest strike. Serves as major institutional liquidity support floor.' },
      { label: 'Max Pain ($)', meaning: 'Strike where the greatest number of expiring contracts expire worthless, maximizing dealer profit.' },
      { label: 'Put/Call Vol & OI', meaning: 'Volume and open interest ratio. >1.2 indicates heavy downside hedging; <0.6 indicates aggressive call speculation.' }
    ],
    howToTrade: [
      'Spot above Gamma Flip: Buy dips near support and target the Call Wall. Take profits as spot approaches within $0.50 of Call Wall.',
      'Spot below Gamma Flip: Switch strictly to puts or cash. Downside moves will be fast and slippery.',
      'Max Pain Magnet: On Friday expirations, price often gravitates towards Max Pain between 13:00 and 16:00 ET.'
    ],
    proTip: 'If price is at the Put Wall and Net GEX is strongly positive, look for an immediate bounce trade with an ultra-tight stop right under the Put Wall.'
  },
  breakout: {
    id: 'breakout',
    title: 'Institutional Breakout Scanner',
    category: 'MOMENTUM & VOLUME ANOMALIES',
    summary: 'Real-time scanner tracking 50+ mega-cap and momentum leaders for unusual volume sweeps.',
    whatItDoes: 'Monitors the SIP tape and flags volume spikes before retail and news channels notice the breakout.',
    keyNumbers: [
      { label: 'Volume Spike (e.g. 2.8x)', meaning: 'Current intraday volume compared to 20-day historical average. >= 1.8x indicates institutional positioning.' },
      { label: 'STRONG CALL', meaning: 'High relative volume + bullish candle structure + positive options call flow.' },
      { label: 'STRONG PUT', meaning: 'High relative volume + breakdown below VWAP + heavy institutional put buying.' },
      { label: 'INDEX Signal', meaning: 'Broad market ETF sweep (SPY, QQQ, IWM) indicating institutional macro rotation.' }
    ],
    howToTrade: [
      'Filter by category (Mega-Cap, Semis, Momentum, Calls, Puts) to isolate the fastest moving market leaders.',
      'Select any ticker row to instantly load its options chain, GEX chart, and AI Quant setup.',
      'Enter trades early when volume multiplier crosses 1.8x to 2.2x and flow confirms.'
    ],
    proTip: 'Breakouts with >= 1.8x volume automatically dispatch real-time dark-mode email alerts directly to your inbox.'
  },
  chart: {
    id: 'chart',
    title: 'Multi-Chart Matrix & Execution Canvas',
    category: 'INTERACTIVE TECHNICAL VISUALIZATION',
    summary: 'Hardware-accelerated candlestick charting with overlaid institutional GEX levels.',
    whatItDoes: 'Displays price action alongside key options levels, moving averages (EMA 9/21/50/200), and Bollinger Bands.',
    keyNumbers: [
      { label: 'Cyan Horizontal Line', meaning: 'Call Wall (Major resistance ceiling).' },
      { label: 'Gold Dotted Line', meaning: 'Gamma Flip (Volatility boundary).' },
      { label: 'Red Horizontal Line', meaning: 'Put Wall (Major liquidity floor).' },
      { label: 'Purple Horizontal Line', meaning: 'Max Pain strike for the active expiration.' }
    ],
    howToTrade: [
      'Toggle 1M, 5M, 15M, 1H, and 1D timeframes to confirm trend alignment across multiple horizons.',
      'Use Dual Split or Quad Matrix view to monitor SPY, QQQ, NVDA, and TSLA simultaneously on one screen.',
      'Watch for candle wicks testing the dotted GEX lines—these provide the highest risk-reward reversal entries.'
    ]
  },
  chain: {
    id: 'chain',
    title: 'Options Chain & Greeks',
    category: 'DERIVATIVES PRICING TABLE',
    summary: 'Real-time Black-Scholes pricing and open interest table across strikes within +/- 8% of spot.',
    whatItDoes: 'Provides granular bid, ask, mid-market pricing, contract volume, and open interest for precise contract selection.',
    keyNumbers: [
      { label: 'Bid / Ask / Mid', meaning: 'The market spread. Look for tight spreads (under $0.05) for minimum slippage.' },
      { label: 'Volume > OI', meaning: 'When contract volume exceeds open interest, fresh institutional positions are being opened today.' },
      { label: 'IV %', meaning: 'Implied Volatility priced into that strike. High IV = expensive premium; Low IV = cheap premium.' }
    ],
    howToTrade: [
      'For directional momentum: Buy 0.40 to 0.50 Delta contracts (ATM) with tight bid-ask spreads.',
      'For defined-risk trades: Open Debit Spreads by buying ATM and selling OTM near the Call or Put Wall.',
      'Avoid strikes with Volume < 100 contracts due to poor liquidity and wide execution spreads.'
    ]
  },
  gex: {
    id: 'gex',
    title: 'Gamma Exposure · Dealer Positioning (GEX Ladder)',
    category: 'MARKET MAKER LIQUIDITY MAP',
    summary: 'Bar chart breakdown of net dealer gamma exposure by strike price across active expirations.',
    whatItDoes: 'Reveals where market makers have obligations to buy stock to hedge sold calls and sell stock to hedge sold puts.',
    keyNumbers: [
      { label: 'Green Bars (Right)', meaning: 'Positive dealer gamma (dealers long calls). Suppresses volatility and forces price mean-reversion.' },
      { label: 'Red Bars (Left)', meaning: 'Negative dealer gamma. Dealers must short into declines and buy into rallies, magnifying price swings.' },
      { label: 'Tallest Green Bar', meaning: 'The Call Wall. The hardest ceiling on the chart.' },
      { label: 'Tallest Red Bar', meaning: 'The Put Wall. The primary floor on the chart.' }
    ],
    howToTrade: [
      'Between the walls, price oscillates like a pinball. Buy call spreads near the Put Wall; sell near the Call Wall.',
      'If price breaches the Call Wall on massive volume, a Gamma Squeeze occurs as dealers scramble to cover short delta.'
    ]
  },
  unusual: {
    id: 'unusual',
    title: 'Unusual Options Flow',
    category: 'SMART MONEY SWEEP TRACKER',
    summary: 'Real-time feed of large institutional orders ($100K to $1M+) where Volume > Open Interest.',
    whatItDoes: 'Exposes where institutional whale traders and hedge funds are placing aggressive directional bets.',
    keyNumbers: [
      { label: 'Side: ASK', meaning: 'Aggressive buyer paid the full ask price (Bullish for calls, Bearish for puts).' },
      { label: 'Side: BID', meaning: 'Seller dumped contracts at the bid price.' },
      { label: 'Notional ($)', meaning: 'Total dollar amount invested in the trade. Trades >= $500K represent significant conviction.' }
    ],
    howToTrade: [
      'Look for repetitive sweeps on the ASK at the same strike within 5 minutes (institutional block accumulation).',
      'Align unusual call sweeps with a spot price above the Gamma Flip for high-probability momentum entries.'
    ]
  },
  volsurface: {
    id: 'volsurface',
    title: 'Vol Surface & Skew Term Structure',
    category: 'IMPLIED VOLATILITY PRICING',
    summary: 'Term structure and 25-delta volatility smile analysis across the options calendar.',
    whatItDoes: 'Compares Implied Volatility (IV) to 20-day Realized Volatility (RV) to determine if options are cheap or expensive.',
    keyNumbers: [
      { label: 'Contango', meaning: 'Near-term IV is lower than long-term IV. Normal, calm, healthy market regime.' },
      { label: 'Backwardation', meaning: 'Near-term IV spikes above long-term IV. High near-term panic, earnings, or macro catalyst.' },
      { label: 'IV/RV Ratio > 1.25', meaning: 'Premium is RICH / expensive. Favor selling credit spreads or iron condors.' },
      { label: 'IV/RV Ratio < 0.90', meaning: 'Premium is CHEAP. Favor buying long options or debit spreads.' }
    ],
    howToTrade: [
      'In Contango + Low IV/RV: Buy debit spreads or straight calls for clean directional expansion.',
      'In Backwardation + High IV/RV: Avoid buying naked options due to rapid volatility crush (IV crush).'
    ]
  },
  darkpool: {
    id: 'darkpool',
    title: 'Dark Pool & FINRA ADF Blocks Feed',
    category: 'OFF-EXCHANGE INSTITUTIONAL TAPE',
    summary: 'Live feed of large institutional trades (>$80,000 notional) executed off public exchanges.',
    whatItDoes: 'Tracks block prints reported to FINRA Alternative Display Facilities (ADF) by pension funds and hedge funds.',
    keyNumbers: [
      { label: 'Notional >= $500K', meaning: 'Institutional block print highlighted in gold.' },
      { label: 'Dark Pool % > 45%', meaning: 'Heavy off-exchange accumulation. Often precedes sustained multi-day directional trends.' },
      { label: 'Repeated Price Level', meaning: 'Institutional defense zone. If $100M+ prints at $585.00, institutions will defend that price.' }
    ],
    howToTrade: [
      'Note price levels with heavy block volume. Use them as institutional support/resistance benchmarks.',
      'If price drops to a major dark pool print level and holds, enter call debit spreads with stops just below that print.'
    ]
  },
  backtest: {
    id: 'backtest',
    title: 'Strategy Lab & Backtest Engine',
    category: 'QUANTITATIVE RISK & HISTORICAL LAB',
    summary: 'Institutional backtesting engine verifying win rates and Sharpe ratios across 6 algorithmic strategies.',
    whatItDoes: 'Simulates trades on real historical price and volatility data to mathematically validate edges before risking capital.',
    keyNumbers: [
      { label: 'Win Rate %', meaning: 'Percentage of winning trades. Look for strategies >= 70%.' },
      { label: 'Sharpe Ratio', meaning: 'Risk-adjusted return. Above 1.5 is strong; above 2.0 is elite institutional grade.' },
      { label: 'Max Drawdown %', meaning: 'Maximum historical account drop. Keep below -10% for capital safety.' },
      { label: 'Walk-Forward Audit', meaning: 'Validates that the strategy was not overfitted to historical data.' }
    ],
    howToTrade: [
      'Select any strategy from the Leaderboard to view its interactive equity curve and full trade log.',
      'Use the Multi-Factor Bayesian Adaptive strategy during normal markets, and 0DTE Gamma Squeeze in high-volatility sessions.'
    ]
  },
  playbook: {
    id: 'playbook',
    title: 'Institutional Playbook & Decision Engine',
    category: 'RULE-BASED TRADING VERDICTS',
    summary: 'Synthesizes GEX, IV/RV, volume ratios, and technical trend into a clear, actionable directive.',
    whatItDoes: 'Translates complex options mathematics into plain English rules: Bullish, Bearish, or Neutral.',
    keyNumbers: [
      { label: 'Playbook Bias', meaning: 'BULLISH, LEAN BULLISH, NEUTRAL, LEAN BEARISH, or BEARISH.' },
      { label: 'Strategy Verdict', meaning: 'Exact structure to execute (e.g. "Bull Call Debit Spread toward Call Wall").' }
    ],
    howToTrade: [
      'Follow the recommended playbook strategy when bias matches the Smart Algo Markov State.',
      'If playbook says "Stand aside / wait for flip break", preserve capital and do not force trades.'
    ]
  },
  regime: {
    id: 'regime',
    title: 'Market Regime (Positive vs Negative Gamma)',
    category: 'MACRO VOLATILITY CLIMATE',
    summary: 'Macro view of whether dealer hedging is stabilizing the broad market or accelerating moves.',
    whatItDoes: 'Classifies the global market state across SPY, QQQ, and indexes into Positive Gamma, Negative Gamma, or Transition.',
    keyNumbers: [
      { label: 'Positive Gamma Regime', meaning: 'Dealers buy dips, sell rallies. Volatility is suppressed. Ideal for credit spreads and dip-buying.' },
      { label: 'Negative Gamma Regime', meaning: 'Dealers sell declines, buy rallies. Volatility explodes. Ideal for debit spreads and trend-following.' }
    ],
    howToTrade: [
      'Always check the regime before opening multi-day positions.',
      'In Negative Gamma, tighten stop-losses and reduce position sizes by 50%.'
    ]
  },
  gemradar: {
    id: 'gemradar',
    title: 'Early Gem & Meme Crypto Radar',
    category: 'ON-CHAIN 24/7 DERIVATIVES & SPOT',
    summary: 'Real-time scanner tracking real-world asset (RWA), AI, DeFi, and meme tokens before major CEX listings.',
    whatItDoes: 'Monitors on-chain liquidity, social momentum, and volume-to-market-cap velocity.',
    keyNumbers: [
      { label: 'Vol/MCap Ratio', meaning: '>30% indicates massive token velocity and early whale accumulation.' },
      { label: 'Audited & Liquidity Locked', meaning: 'Safety verification protecting against rug-pulls and scam contracts.' }
    ],
    howToTrade: [
      'Click any token to inspect its real-time TradingView chart, contract address, and decentralized liquidity pool.',
      'Allocate small capital (1-2% max) to early gems to capture asymmetric upside.'
    ]
  },
  forex_matrix: {
    id: 'forex_matrix',
    title: 'Currency Strength Matrix (CSM) & Interbank Edge',
    category: '24/5 FOREIGN EXCHANGE LIQUIDITY ENGINE',
    summary: 'Real-time relative strength index measuring 24h currency momentum across the 8 major central banks.',
    whatItDoes: 'Pairs the single strongest currency against the single weakest currency, maximizing directional trend probability and eliminating choppy consolidations.',
    keyNumbers: [
      { label: 'Strength % (0-100%)', meaning: '>65% signifies institutional accumulation; <35% signifies institutional selling/distribution.' },
      { label: 'Central Bank Benchmark Rate', meaning: 'The base policy interest rate. Determines carry trade yield differentials.' },
      { label: 'Top Directional Pairing', meaning: 'Algorithmic buy/sell recommendation matching the strongest against the weakest currency.' },
      { label: 'Quarter-Points (00, 20, 50, 80)', meaning: 'Psychological interbank round-number price levels where commercial limit orders reside.' }
    ],
    howToTrade: [
      'Rule 1: Never buy a weak currency or sell a strong currency.',
      'Rule 2: Click the "Load [Pair]" button to instantly inspect the top algorithmic currency recommendation.',
      'Rule 3: Execute bracket orders during London or New York Killzones when directional volume is at peak.'
    ],
    proTip: 'When a strong currency has a higher central bank interest rate than a weak currency, commercial banks pile on multi-billion dollar carry trades that trend cleanly for days.'
  },
  forex_adr: {
    id: 'forex_adr',
    title: '14-Day ADR Pip Meter & Range Exhaustion',
    category: 'STATISTICAL VOLATILITY LIMITS',
    summary: 'Tracks daily pip movement against the 14-day Average Daily Range (ADR).',
    whatItDoes: 'Prevents you from buying at the top of a daily move or selling at the bottom when institutional volume has already spent its daily energy.',
    keyNumbers: [
      { label: "Today's Range (Pips)", meaning: 'High minus Low in pips traversed during the active session.' },
      { label: '14-Day ADR (Pips)', meaning: 'The mathematical 14-day mean daily travel for this pair in pips.' },
      { label: 'ADR Exhaustion %', meaning: '>90% indicates exhausted move (reversal risk); <50% indicates early compression with room to run.' },
      { label: 'Asian Range (00:00-06:00 ET)', meaning: 'Overnight accumulation boundaries. A sweep outside the high or low often marks the true high/low of the day.' }
    ],
    howToTrade: [
      'If ADR > 90%: DO NOT enter breakout trades. Take profits or look for reversal back toward the median flip.',
      'If ADR < 50% during London/NY Open: Enter trend-following bracket orders targeting the remaining ADR pips.',
      'Place stop loss right behind the nearest Quarter-Point or Asian Range boundary.'
    ],
    proTip: 'Over 82% of daily high/lows are locked in within 90% of the 14-day ADR. Chasing breakouts after 90% exhaustion is the #1 mistake retail forex traders make.'
  },
  forex_killzone: {
    id: 'forex_killzone',
    title: 'Interbank Session Killzones & 24/5 Timing',
    category: 'TIME & LIQUIDITY INSTITUTIONAL WINDOWS',
    summary: 'Tracks global session overlaps (London Open, NY Open, Asian Accumulation) and ICT Judas Swings.',
    whatItDoes: 'Identifies the precise 2-hour daily windows when central banks and commercial order desks inject peak volume.',
    keyNumbers: [
      { label: 'London Open Killzone (03:00 - 05:00 ET)', meaning: '38% of global volume. Prime window where Asian Range liquidity is swept and the day\'s true trend begins.' },
      { label: 'New York Open Killzone (08:00 - 10:00 ET)', meaning: '31% volume + high-impact US macro catalyst releases (CPI, NFP, Fed).' },
      { label: 'London / NY Overlap (08:00 - 12:00 ET)', meaning: 'Peak daily liquidity (~55% of all daily FX volume). Tightest spreads and smoothest trends.' },
      { label: 'Asian Session Accumulation', meaning: 'Range-bound accumulation that establishes liquidity pools for the London Open.' }
    ],
    howToTrade: [
      'Focus 90% of your trading activity between 03:00-05:00 ET (London) and 08:00-11:00 ET (New York).',
      'Watch for an Asian Range false breakout (Judas Swing) in the first 30 minutes of London Open, then enter in the opposite direction.'
    ],
    proTip: 'Never hold large unbracketed positions into 17:00 ET Friday close to avoid weekend gap risk across geopolitical headlines.'
  }
};

// Help Context for opening the modal from anywhere
interface HelpModalContextType {
  openHelp: (cardId: string) => void;
  closeHelp: () => void;
}

const HelpModalContext = createContext<HelpModalContextType>({
  openHelp: () => {},
  closeHelp: () => {},
});

export const useCardHelp = () => useContext(HelpModalContext);

export function CardHelpProvider({ children }: { children: React.ReactNode }) {
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  const openHelp = (cardId: string) => setActiveCardId(cardId);
  const closeHelp = () => setActiveCardId(null);

  const card = activeCardId ? CARD_KNOWLEDGE[activeCardId] || CARD_KNOWLEDGE.algo : null;

  return (
    <HelpModalContext.Provider value={{ openHelp, closeHelp }}>
      {children}

      {/* Global Card Explainer Modal */}
      {card && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0b0f19] border border-cyan-500/40 rounded-xl max-w-2xl w-full p-5 shadow-2xl font-mono text-xs flex flex-col gap-4 relative animate-in zoom-in-95 duration-200 border-t-2 border-t-neon-green">
            {/* Header */}
            <div className="flex justify-between items-start pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-neon-green/20 border border-neon-green/40 flex items-center justify-center text-neon-green shrink-0 shadow-[0_0_12px_rgba(0,255,163,0.2)]">
                  <BookOpen size={16} />
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-cyan-400 font-bold">
                    {card.category}
                  </div>
                  <h3 className="text-base font-bold text-white tracking-wide">
                    {card.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={closeHelp}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="Close Explainer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Summary Banner */}
            <div className="bg-white/[0.03] p-3 rounded-lg border border-white/5 text-slate-300 font-sans text-xs leading-relaxed">
              <strong className="text-white block font-mono text-[11px] mb-1">🔍 What This Card Does:</strong>
              {card.whatItDoes}
            </div>

            {/* Numbers & Metrics Grid */}
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                <Target size={12} className="text-neon-gold" /> Key Numbers & What They Mean
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {card.keyNumbers.map((num, i) => (
                  <div key={i} className="bg-black/50 p-2 rounded border border-white/5 flex flex-col gap-0.5">
                    <span className="font-bold text-neon-green text-[10px]">{num.label}</span>
                    <span className="text-slate-300 font-sans text-[10px] leading-tight">{num.meaning}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* How to Trade Section */}
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                <TrendingUp size={12} className="text-neon-green" /> How to Trade This Card
              </div>
              <ul className="flex flex-col gap-1.5 bg-black/40 p-2.5 rounded border border-white/5">
                {card.howToTrade.map((step, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-slate-300 font-sans text-[11px] leading-snug">
                    <CheckCircle2 size={12} className="text-neon-green shrink-0 mt-0.5" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pro Tip Callout */}
            {card.proTip && (
              <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-lg flex items-start gap-2 text-amber-200 font-sans text-[10px] leading-tight">
                <Zap size={14} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-mono uppercase text-amber-400 block text-[9px]">Institutional Pro Tip:</strong>
                  {card.proTip}
                </div>
              </div>
            )}

            {/* Close Button Footer */}
            <div className="pt-2 border-t border-white/10 flex justify-end">
              <button
                onClick={closeHelp}
                className="py-1.5 px-4 rounded bg-neon-green text-black font-bold text-xs hover:opacity-90 transition-all cursor-pointer shadow-[0_0_10px_rgba(0,255,163,0.2)]"
              >
                Got It, Return to Terminal
              </button>
            </div>
          </div>
        </div>
      )}
    </HelpModalContext.Provider>
  );
}

// Standalone interactive Question Mark button component
export function HelpButton({ cardId, title = "Explain this card" }: { cardId: string; title?: string }) {
  const { openHelp } = useCardHelp();

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        openHelp(cardId);
      }}
      title={title}
      className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/5 border border-white/20 text-slate-400 hover:text-cyan-300 hover:border-cyan-400/60 hover:bg-cyan-500/20 hover:shadow-[0_0_8px_rgba(6,182,212,0.4)] transition-all cursor-pointer text-[10px] font-mono shrink-0 ml-1.5 group"
    >
      <span className="group-hover:scale-110 transition-transform font-bold">?</span>
    </button>
  );
}
