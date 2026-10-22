import { useState, useEffect, useCallback } from 'react';
import { 
  RefreshCw, ShieldCheck, Zap, Activity, Target, 
  Layers, Lock, BarChart2, Compass, Cpu, ArrowLeft,
  CheckCircle2, AlertTriangle, Sparkles, X
} from 'lucide-react';
import { API_BASE } from './config';

interface Pillar1GEX {
  symbol: string;
  spot_price: number;
  net_gex_millions: number;
  regime: string;
  call_wall: number;
  put_wall: number;
  zero_gamma_level: number;
  dist_to_call_wall_pct: number;
  dist_to_put_wall_pct: number;
  score: number;
  edge_verdict: string;
  rationale: string;
}

interface Pillar2VRP {
  symbol: string;
  realized_vol_30d: number;
  implied_vol_atm: number;
  variance_risk_premium: number;
  iv_rank_pct: number;
  score: number;
  strategy_recommendation: string;
  rationale: string;
}

interface Pillar3Credit {
  hyg_4h_change_pct: number;
  spy_4h_change_pct: number;
  credit_divergence_spread: number;
  divergence_state: string;
  score: number;
  rationale: string;
}

interface Pillar4Sweep {
  symbol: string;
  swing_low: number;
  swing_high: number;
  volume_ratio: number;
  lower_wick_ratio: number;
  upper_wick_ratio: number;
  sweep_pattern: string;
  invalidation_level: number;
  target_level: number;
  score: number;
  rationale: string;
}

interface RelativeStrengthItem {
  symbol: string;
  spot: number;
  daily_return_pct: number;
  alpha_vs_spy_pct: number;
  rank: number;
  tier: string;
  recommendation: string;
}

interface RelativeStrengthData {
  benchmark: string;
  benchmark_return_pct: number;
  leaders: string[];
  laggards: string[];
  rankings: RelativeStrengthItem[];
}

interface ConfluenceData {
  symbol: string;
  timestamp: string;
  confluence_score: number;
  max_score: number;
  bias: string;
  trade_verdict: string;
  verdict_color: string;
  execution_permitted: boolean;
  trend_metrics?: {
    spot: number;
    vwap: number;
    ema20: number;
    trend: string;
    dist_vwap_pct: number;
    sigma?: number;
    z_score?: number;
    upper_2s?: number;
    upper_1s?: number;
    lower_1s?: number;
    lower_2s?: number;
    band_zone?: string;
  };
  volatility_parity?: {
    symbol: string;
    spot: number;
    atr_usd: number;
    atr_pct: number;
    sizing_scalar: number;
    allocated_usd: number;
    recommended_contracts: number;
  };
  defined_risk_spread?: {
    symbol: string;
    spread_type: string;
    long_strike: number;
    short_strike: number;
    strike_width: number;
    est_debit_cost: number;
    max_risk_usd: number;
    max_profit_usd: number;
    max_roi_pct: string;
    theta_decay_reduction: string;
    rationale: string;
  };
  pillars: {
    pillar_1_dealer_gex: Pillar1GEX;
    pillar_2_variance_risk_premium: Pillar2VRP;
    pillar_3_credit_lead_lag: Pillar3Credit;
    pillar_4_liquidity_sweep: Pillar4Sweep;
  };
  summary_memo: string;
}

interface RadarItem {
  symbol: string;
  confluence_score: number;
  bias: string;
  trade_verdict: string;
  execution_permitted: boolean;
  spot_price: number;
  call_wall: number;
  put_wall: number;
  iv_rank: number;
  credit_state: string;
  sweep_pattern: string;
}

interface Props {
  selectedSymbol: string;
  onSelectSymbol: (sym: string) => void;
  onReturnToOverview?: () => void;
  tape?: Record<string, any>;
  overview?: Record<string, any>;
}

const UNIVERSE = [
  'SPY', 'QQQ', 'IWM', 'NVDA', 'TSLA', 'AAPL', 'AMD', 'MSFT', 
  'META', 'AMZN', 'GOOGL', 'PLTR', 'COIN', 'MSTR', 'AVGO', 'SMCI', 
  'NFLX', 'ARM', 'MU', 'INTC', 'JPM', 'XLE', 'XLK', 'XLF'
];

export function InstitutionalQuantWorkspace({ selectedSymbol, onSelectSymbol, onReturnToOverview, tape, overview }: Props) {
  const [confluence, setConfluence] = useState<ConfluenceData | null>(null);
  const [radar, setRadar] = useState<RadarItem[]>([]);
  const [relativeStrength, setRelativeStrength] = useState<RelativeStrengthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [radarLoading, setRadarLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'WORKSPACE' | 'RADAR'>('WORKSPACE');
  const [triggerExecuting, setTriggerExecuting] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<any | null>(null);

  const executeQuantOptionTrade = async (sym: string) => {
    try {
      setTriggerExecuting(true);
      setExecutionResult(null);
      const res = await fetch(`${API_BASE}/api/institutional/trigger-options?symbol=${sym}`, {
        method: 'POST'
      });
      const data = await res.json();
      setExecutionResult(data);
      fetchConfluence(sym);
    } catch (err) {
      console.error('Trigger options error:', err);
      setExecutionResult({ status: 'ERROR', message: String(err) });
    } finally {
      setTriggerExecuting(false);
    }
  };

  const fetchConfluence = useCallback(async (sym: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/institutional/confluence?symbol=${sym}`);
      if (res.ok) {
        const data = await res.json();
        setConfluence(data);
      }
    } catch (err) {
      console.error('Failed to fetch institutional confluence:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRadar = useCallback(async () => {
    try {
      setRadarLoading(true);
      const res = await fetch(`${API_BASE}/api/institutional/radar`);
      if (res.ok) {
        const data = await res.json();
        setRadar(data.radar || []);
      }
    } catch (err) {
      console.error('Failed to fetch institutional radar:', err);
    } finally {
      setRadarLoading(false);
    }
  }, []);

  const fetchRelativeStrength = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/institutional/relative-strength`);
      if (res.ok) {
        const data = await res.json();
        setRelativeStrength(data.relative_strength || null);
      }
    } catch (err) {
      console.error('Failed to fetch relative strength:', err);
    }
  }, []);

  useEffect(() => {
    fetchConfluence(selectedSymbol);
    fetchRadar();
    fetchRelativeStrength();
  }, [selectedSymbol, fetchConfluence, fetchRadar, fetchRelativeStrength]);

  const score = confluence?.confluence_score || 0;
  const isApproved = confluence?.execution_permitted ?? false;

  return (
    <div className="w-full min-w-0 max-w-full space-y-4 font-sans text-slate-100 animate-in fade-in duration-200 overflow-x-hidden">
      
      {/* Institutional Top Control Bar */}
      <div className="w-full min-w-0 max-w-full glass-panel px-4 sm:px-5 py-3 border border-indigo-500/30 bg-gradient-to-r from-slate-950 via-indigo-950/20 to-slate-950 flex flex-wrap items-center justify-between gap-4 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          {onReturnToOverview && (
            <button
              onClick={onReturnToOverview}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-mono transition-all"
            >
              <ArrowLeft size={14} />
              <span>OVERVIEW DESK</span>
            </button>
          )}

          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <Cpu size={20} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-wide text-white">
                INSTITUTIONAL QUANT ALPHA MATRIX
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-indigo-400/40 bg-indigo-500/20 text-indigo-300 font-bold">
                CITADEL · JANE STREET · RENAISSANCE
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Live quantitative order flow &amp; microstructure models fully integrated with the terminal
            </p>
          </div>
        </div>

        {/* View Switcher & Action Controls */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setActiveTab('WORKSPACE')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'WORKSPACE'
                  ? 'bg-indigo-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ACTIVE TICKER ({selectedSymbol})
            </button>
            <button
              onClick={() => setActiveTab('RADAR')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === 'RADAR'
                  ? 'bg-indigo-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>UNIVERSE SCANNER</span>
              {radar.length > 0 && (
                <span className="text-[10px] bg-indigo-400/30 text-indigo-200 px-1.5 py-0.2 rounded-full font-bold">
                  {radar.length}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={() => {
              fetchConfluence(selectedSymbol);
              fetchRadar();
              fetchRelativeStrength();
            }}
            disabled={loading || radarLoading}
            className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-mono transition-all"
            title="Refresh Quant Stream"
          >
            <RefreshCw size={13} className={loading || radarLoading ? 'animate-spin text-indigo-400' : ''} />
            <span>SYNC</span>
          </button>
        </div>
      </div>

      {/* Universe Quick Ticker Bar (Full Width with isolated horizontal scroll) */}
      <div className="w-full min-w-0 max-w-full glass-panel px-4 py-2 border border-slate-800 bg-slate-950/70 flex items-center gap-3 rounded-xl overflow-hidden shadow-md">
        <span className="text-slate-400 font-bold flex items-center gap-1 shrink-0 text-xs font-mono">
          <Compass size={13} className="text-indigo-400" /> SELECT TICKER:
        </span>
        <div className="flex-1 min-w-0 overflow-x-auto flex items-center gap-1.5 py-1 scrollbar-thin">
          {UNIVERSE.map((sym) => {
            const item = tape?.[sym] || overview?.[sym];
            const p = item?.price;
            const c = item?.change;
            const isSelected = selectedSymbol === sym;
            return (
              <button
                key={sym}
                onClick={() => onSelectSymbol(sym)}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer font-mono text-xs flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? 'bg-indigo-500/30 text-white border border-indigo-400 font-bold shadow-[0_0_12px_rgba(99,102,241,0.35)] ring-1 ring-indigo-400'
                    : 'bg-slate-900/80 text-slate-300 border border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
              >
                <span className="font-bold">{sym}</span>
                {p !== undefined && p !== null && (
                  <span className="text-[11px] text-slate-300 font-normal">
                    ${Number(p).toFixed(Number(p) < 10 ? 4 : 2)}
                  </span>
                )}
                {c !== undefined && c !== null && (
                  <span className={`text-[10px] font-bold ${Number(c) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {Number(c) > 0 ? '+' : ''}{Number(c).toFixed(2)}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'WORKSPACE' ? (
        loading && !confluence ? (
          <div className="h-72 w-full glass-panel border border-slate-800 rounded-xl flex flex-col items-center justify-center gap-3">
            <RefreshCw size={32} className="animate-spin text-indigo-400" />
            <span className="text-xs font-mono text-slate-400">
              Evaluating Citadel GEX, Jane Street VRP, Renaissance Credit &amp; Dark Pool Sweeps for {selectedSymbol}...
            </span>
          </div>
        ) : confluence ? (
          <div className="space-y-4">
            
            {/* Master Executive Verdict Banner (Full Width) */}
            <div className={`w-full min-w-0 max-w-full p-4 sm:p-5 rounded-xl border flex flex-col xl:flex-row items-center justify-between gap-4 sm:gap-6 transition-all ${
              isApproved 
                ? 'bg-emerald-950/25 border-emerald-500/50 shadow-[0_0_25px_rgba(16,185,129,0.15)]'
                : 'bg-amber-950/25 border-amber-500/50 shadow-[0_0_25px_rgba(245,158,11,0.15)]'
            }`}>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                {/* Score Gauge */}
                <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-slate-950/90 border-2 border-slate-800 shrink-0 shadow-inner">
                  <div className="text-center font-mono">
                    <div className={`text-3xl font-black ${
                      score >= 75 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-slate-400'
                    }`}>
                      {score}
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase">/ 100 PTS</div>
                  </div>
                </div>

                <div className="space-y-1.5 text-center sm:text-left min-w-0">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                    <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                      INSTITUTIONAL VERDICT:
                    </span>
                    <span className={`text-sm font-black font-mono px-3 py-0.5 rounded border ${
                      isApproved 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' 
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    }`}>
                      {confluence.trade_verdict}
                    </span>
                  </div>
                  
                  <div className="text-sm font-bold text-slate-200 flex flex-wrap items-center gap-2">
                    <span>Active Symbol: <span className="text-white font-mono font-black text-base">{selectedSymbol}</span></span>
                    <span>· Spot: <span className="text-cyan-300 font-mono">${confluence.pillars.pillar_1_dealer_gex.spot_price.toFixed(2)}</span></span>
                    {confluence.trend_metrics?.vwap ? (
                      <span>· 15m VWAP: <span className="text-amber-300 font-mono">${confluence.trend_metrics.vwap.toFixed(2)}</span> (<span className={confluence.trend_metrics.trend.includes('BULL') ? 'text-emerald-400 font-bold' : confluence.trend_metrics.trend.includes('BEAR') ? 'text-rose-400 font-bold' : 'text-slate-400 font-bold'}>{confluence.trend_metrics.trend.replace(/_/g, ' ')}</span>)</span>
                    ) : null}
                    <span>· Bias: <span className="text-indigo-400 font-mono">{confluence.bias}</span></span>
                  </div>

                  <p className="text-xs text-slate-300 font-mono max-w-4xl leading-relaxed">
                    {confluence.summary_memo}
                  </p>
                </div>
              </div>

              {/* Execution Gate Status */}
              <div className="flex flex-col items-center xl:items-end gap-2.5 shrink-0">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-mono text-xs font-bold ${
                  isApproved 
                    ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.35)]'
                    : 'bg-slate-900 border-slate-700 text-slate-300'
                }`}>
                  {isApproved ? <ShieldCheck size={16} className="text-emerald-400" /> : <Lock size={16} className="text-amber-400" />}
                  <span>{isApproved ? 'AUTONOMOUS EXECUTION PERMITTED' : 'EXECUTION LOCKED (< 70 PTS)'}</span>
                </div>
                
                {/* 1-Click Trigger Button for Institutional Quant Alpha Matrix */}
                <button
                  onClick={() => executeQuantOptionTrade(selectedSymbol)}
                  disabled={triggerExecuting || !isApproved}
                  className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg ${
                    isApproved && !triggerExecuting
                      ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.4)] cursor-pointer active:scale-95'
                      : 'bg-slate-800/80 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                  }`}
                >
                  {triggerExecuting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin text-slate-950" />
                      <span>ROUTING OCC BRACKET ORDER...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={14} className={isApproved ? "fill-slate-950 text-slate-950" : ""} />
                      <span>EXECUTE QUANT ALPHA OPTION BRACKET</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400/80">
                  <Sparkles size={11} />
                  <span>100% OCC Options Only · +40% TP / -25% SL · EOD 15:50 ET Auto-Close</span>
                </div>
              </div>
            </div>

            {/* Execution Result Banner */}
            {executionResult && (
              <div className={`p-4 rounded-xl border font-mono text-xs animate-in fade-in duration-200 flex items-start justify-between gap-4 ${
                executionResult.executed_count > 0 || (executionResult.executed_trades && executionResult.executed_trades.length > 0)
                  ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                  : 'bg-indigo-950/40 border-indigo-500/40 text-indigo-200'
              }`}>
                <div className="flex items-start gap-3">
                  {executionResult.executed_count > 0 ? (
                    <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle size={18} className="text-indigo-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <div className="font-bold flex items-center gap-2">
                      <span>
                        {executionResult.executed_count > 0 
                          ? `QUANT ALPHA OPTION ORDER SUBMITTED (${executionResult.executed_count} EXECUTED)` 
                          : `CYCLE EVALUATION COMPLETE (${executionResult.scanned || 0} ASSETS SCANNED)`}
                      </span>
                    </div>
                    {executionResult.executed_trades && executionResult.executed_trades.length > 0 ? (
                      <div className="space-y-1 pt-1">
                        {executionResult.executed_trades.map((t: any, idx: number) => (
                          <div key={idx} className="bg-slate-950/60 p-2.5 rounded-lg border border-emerald-500/30 text-[11px] space-y-1">
                            <div className="font-bold text-white flex items-center gap-2">
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                                {t.side} {t.strike}
                              </span>
                              <span>{t.symbol}</span>
                              <span className="text-slate-400">Exp {t.expiry}</span>
                            </div>
                            <div className="text-slate-300 text-[10px]">
                              Entry: ${Number(t.price).toFixed(2)} | TP: ${Number(t.tp).toFixed(2)} (+40%) | SL: ${Number(t.sl).toFixed(2)} (-25%) | Rule: {t.eod_rule}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-300">
                        {executionResult.reason || executionResult.message || `No qualifying confluence setup met strict 4-pillar threshold for immediate execution.`}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setExecutionResult(null)}
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* 3 Institutional Tactical Pillars: Two Sigma Relative Strength, AQR VWAP Bands, Jane Street Defined-Risk Spreads */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 min-w-0 max-w-full font-mono">
              
              {/* Card 1: Two Sigma / Millennium Relative Strength Alpha Leader/Laggard Stream */}
              <div className="glass-panel p-4 rounded-xl border border-indigo-500/30 bg-gradient-to-b from-indigo-950/20 via-slate-950 to-slate-950 shadow-md flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <Layers size={15} />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-white">RELATIVE STRENGTH BASKET</h3>
                        <p className="text-[10px] text-slate-400">Two Sigma / Millennium Leader-Laggard</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                      VS {relativeStrength?.benchmark || 'SPY'} ({relativeStrength?.benchmark_return_pct !== undefined ? `${relativeStrength.benchmark_return_pct >= 0 ? '+' : ''}${relativeStrength.benchmark_return_pct}%` : '0.0%'})
                    </span>
                  </div>

                  <div className="pt-3 space-y-2 text-xs">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-emerald-400 mb-1 flex items-center justify-between">
                        <span>Top Alpha Leaders (Call Eligible)</span>
                        <span>Alpha Spread</span>
                      </div>
                      <div className="space-y-1">
                        {relativeStrength?.rankings?.filter(r => r.tier === 'LEADER').map(r => (
                          <div 
                            key={r.symbol} 
                            onClick={() => onSelectSymbol(r.symbol)}
                            className={`px-2 py-1 rounded flex items-center justify-between text-xs border cursor-pointer transition-all ${r.symbol === selectedSymbol ? 'bg-emerald-500/25 border-emerald-400 text-white font-bold ring-1 ring-emerald-400' : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'}`}
                          >
                            <span className="font-bold flex items-center gap-1.5">
                              <span className="text-emerald-400 font-mono">#{r.rank}</span> {r.symbol}
                            </span>
                            <span className="font-bold text-emerald-400">+{r.alpha_vs_spy_pct.toFixed(2)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-1">
                      <div className="text-[10px] uppercase font-bold text-rose-400 mb-1 flex items-center justify-between">
                        <span>Bottom Alpha Laggards (Put Eligible)</span>
                        <span>Alpha Spread</span>
                      </div>
                      <div className="space-y-1">
                        {relativeStrength?.rankings?.filter(r => r.tier === 'LAGGARD').map(r => (
                          <div 
                            key={r.symbol} 
                            onClick={() => onSelectSymbol(r.symbol)}
                            className={`px-2 py-1 rounded flex items-center justify-between text-xs border cursor-pointer transition-all ${r.symbol === selectedSymbol ? 'bg-rose-500/25 border-rose-400 text-white font-bold ring-1 ring-rose-400' : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'}`}
                          >
                            <span className="font-bold flex items-center gap-1.5">
                              <span className="text-rose-400 font-mono">#{r.rank}</span> {r.symbol}
                            </span>
                            <span className="font-bold text-rose-400">{r.alpha_vs_spy_pct.toFixed(2)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: AQR / Market Maker VWAP Volatility Bands & Reload Zones */}
              <div className="glass-panel p-4 rounded-xl border border-teal-500/30 bg-gradient-to-b from-teal-950/20 via-slate-950 to-slate-950 shadow-md flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-teal-500/20 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
                        <Target size={15} />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-white">INSTITUTIONAL VWAP BANDS</h3>
                        <p className="text-[10px] text-slate-400">AQR Multi-Sigma Volatility Envelope</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      confluence?.trend_metrics?.band_zone?.includes('OPTIMAL') 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                        : confluence?.trend_metrics?.band_zone?.includes('EXTENSION') 
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}>
                      {confluence?.trend_metrics?.band_zone?.replace(/\(.*?\)/, '').trim() || 'EQUILIBRIUM'}
                    </span>
                  </div>

                  <div className="pt-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400 text-[11px]">Upper Band (+2.0σ Extension):</span>
                      <span className="font-bold text-rose-400 font-mono">${confluence?.trend_metrics?.upper_2s?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400 text-[11px]">Upper Value Band (+1.0σ):</span>
                      <span className="font-bold text-amber-300 font-mono">${confluence?.trend_metrics?.upper_1s?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex items-center justify-between bg-teal-500/10 p-2 rounded-lg border border-teal-500/30">
                      <span className="text-teal-300 text-[11px] font-bold">15m Session VWAP (Mean):</span>
                      <span className="font-black text-white font-mono">${confluence?.trend_metrics?.vwap?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400 text-[11px]">Lower Value Band (-1.0σ):</span>
                      <span className="font-bold text-amber-300 font-mono">${confluence?.trend_metrics?.lower_1s?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400 text-[11px]">Lower Band (-2.0σ Flush):</span>
                      <span className="font-bold text-emerald-400 font-mono">${confluence?.trend_metrics?.lower_2s?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 pt-1 text-center font-mono">
                      Current Z-Score: <span className="font-bold text-cyan-300">{confluence?.trend_metrics?.z_score !== undefined ? `${confluence.trend_metrics.z_score >= 0 ? '+' : ''}${confluence.trend_metrics.z_score}σ` : '0.0σ'}</span> distance from VWAP
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Bridgewater Volatility Parity & Jane Street Defined-Risk Spreads */}
              <div className="glass-panel p-4 rounded-xl border border-amber-500/30 bg-gradient-to-b from-amber-950/20 via-slate-950 to-slate-950 shadow-md flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <ShieldCheck size={15} />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-white">DEFINED-RISK VERTICAL SPREAD</h3>
                        <p className="text-[10px] text-slate-400">Jane Street Theta Shield &amp; Risk Parity</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      -55% THETA BURN
                    </span>
                  </div>

                  <div className="pt-3 space-y-2 text-xs">
                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Structure:</span>
                        <span className="font-bold text-indigo-300 font-mono">{confluence?.defined_risk_spread?.spread_type?.replace(/_/g, ' ') || 'DEBIT SPREAD'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Strikes:</span>
                        <span className="font-mono text-white font-bold">
                          Long ${confluence?.defined_risk_spread?.long_strike?.toFixed(1) || '0.0'} / Short ${confluence?.defined_risk_spread?.short_strike?.toFixed(1) || '0.0'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Max Risk Per Contract:</span>
                        <span className="font-bold text-rose-400 font-mono">${confluence?.defined_risk_spread?.max_risk_usd?.toFixed(0) || '0'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Max Profit Potential:</span>
                        <span className="font-bold text-emerald-400 font-mono">${confluence?.defined_risk_spread?.max_profit_usd?.toFixed(0) || '0'} ({confluence?.defined_risk_spread?.max_roi_pct || '+0%'})</span>
                      </div>
                    </div>

                    <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-800 space-y-1">
                      <div className="text-[10px] uppercase font-bold text-amber-400">Bridgewater Risk-Parity Sizing:</div>
                      <div className="flex items-center justify-between text-[11px] text-slate-300">
                        <span>14d ATR: {confluence?.volatility_parity?.atr_pct?.toFixed(2) || '1.80'}%</span>
                        <span>Scalar: {confluence?.volatility_parity?.sizing_scalar?.toFixed(2) || '1.00'}x</span>
                        <span className="font-bold text-white">Qty: {confluence?.volatility_parity?.recommended_contracts || 1} Contracts</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* 4 Quantitative Alpha Pillars - Full Responsive Multi-Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-3.5 min-w-0 max-w-full">
              
              {/* Pillar 1: Citadel Dealer Gamma (GEX) */}
              <div className="glass-panel p-4 rounded-xl border border-blue-500/30 bg-gradient-to-b from-blue-950/20 via-slate-950 to-slate-950 flex flex-col justify-between hover:border-blue-500/50 transition-all shadow-md">
                <div>
                  <div className="flex items-center justify-between border-b border-blue-500/20 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <Activity size={16} />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                          Pillar 1: Citadel GEX
                        </h3>
                        <span className="text-[10px] font-mono text-slate-400">Dealer Gamma Hedging</span>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-sm font-bold text-blue-400">
                        {confluence.pillars.pillar_1_dealer_gex.score}
                      </span>
                      <span className="text-[10px] text-slate-500"> / 25</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 font-mono text-xs">
                    <div className="p-2 rounded bg-black/50 border border-white/5">
                      <span className="text-[10px] text-slate-500 block">CALL WALL</span>
                      <span className="font-bold text-rose-400">${confluence.pillars.pillar_1_dealer_gex.call_wall.toFixed(2)}</span>
                      <span className="text-[9px] text-slate-500 block">+{confluence.pillars.pillar_1_dealer_gex.dist_to_call_wall_pct}%</span>
                    </div>
                    <div className="p-2 rounded bg-black/50 border border-white/5">
                      <span className="text-[10px] text-slate-500 block">PUT WALL</span>
                      <span className="font-bold text-emerald-400">${confluence.pillars.pillar_1_dealer_gex.put_wall.toFixed(2)}</span>
                      <span className="text-[9px] text-slate-500 block">-{confluence.pillars.pillar_1_dealer_gex.dist_to_put_wall_pct}%</span>
                    </div>
                    <div className="p-2 rounded bg-black/50 border border-white/5 col-span-2">
                      <span className="text-[10px] text-slate-500 block">DEALER NET GAMMA</span>
                      <span className="font-bold text-cyan-300">${confluence.pillars.pillar_1_dealer_gex.net_gex_millions.toFixed(1)}M GEX</span>
                      <span className="text-[9px] text-slate-400 block">{confluence.pillars.pillar_1_dealer_gex.regime}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 p-2.5 rounded bg-blue-950/30 border border-blue-500/20 text-xs font-mono text-blue-200/90 leading-relaxed">
                  {confluence.pillars.pillar_1_dealer_gex.rationale}
                </div>
              </div>

              {/* Pillar 2: Jane Street Variance Risk Premium (VRP) */}
              <div className="glass-panel p-4 rounded-xl border border-purple-500/30 bg-gradient-to-b from-purple-950/20 via-slate-950 to-slate-950 flex flex-col justify-between hover:border-purple-500/50 transition-all shadow-md">
                <div>
                  <div className="flex items-center justify-between border-b border-purple-500/20 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        <BarChart2 size={16} />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                          Pillar 2: Jane Street VRP
                        </h3>
                        <span className="text-[10px] font-mono text-slate-400">Volatility Mispricing</span>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-sm font-bold text-purple-400">
                        {confluence.pillars.pillar_2_variance_risk_premium.score}
                      </span>
                      <span className="text-[10px] text-slate-500"> / 25</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 font-mono text-xs">
                    <div className="p-2 rounded bg-black/50 border border-white/5">
                      <span className="text-[10px] text-slate-500 block">IMPLIED VOL (IV)</span>
                      <span className="font-bold text-purple-300">{confluence.pillars.pillar_2_variance_risk_premium.implied_vol_atm.toFixed(1)}%</span>
                      <span className="text-[9px] text-slate-500 block">ATM Option</span>
                    </div>
                    <div className="p-2 rounded bg-black/50 border border-white/5">
                      <span className="text-[10px] text-slate-500 block">REALIZED VOL</span>
                      <span className="font-bold text-slate-300">{confluence.pillars.pillar_2_variance_risk_premium.realized_vol_30d.toFixed(1)}%</span>
                      <span className="text-[9px] text-slate-500 block">30d Actual</span>
                    </div>
                    <div className="p-2 rounded bg-black/50 border border-white/5 col-span-2">
                      <span className="text-[10px] text-slate-500 block">IV RANK &amp; SPREAD</span>
                      <span className="font-bold text-amber-300">{confluence.pillars.pillar_2_variance_risk_premium.iv_rank_pct.toFixed(1)}% IVR</span>
                      <span className="text-[9px] text-slate-400 block">VRP Spread: +{confluence.pillars.pillar_2_variance_risk_premium.variance_risk_premium}%</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 p-2.5 rounded bg-purple-950/30 border border-purple-500/20 text-xs font-mono text-purple-200/90 leading-relaxed">
                  {confluence.pillars.pillar_2_variance_risk_premium.rationale}
                </div>
              </div>

              {/* Pillar 3: Renaissance Credit Lead-Lag */}
              <div className="glass-panel p-4 rounded-xl border border-amber-500/30 bg-gradient-to-b from-amber-950/20 via-slate-950 to-slate-950 flex flex-col justify-between hover:border-amber-500/50 transition-all shadow-md">
                <div>
                  <div className="flex items-center justify-between border-b border-amber-500/20 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Layers size={16} />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                          Pillar 3: Credit Lead
                        </h3>
                        <span className="text-[10px] font-mono text-slate-400">HYG Bonds vs SPY</span>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-sm font-bold text-amber-400">
                        {confluence.pillars.pillar_3_credit_lead_lag.score}
                      </span>
                      <span className="text-[10px] text-slate-500"> / 25</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 font-mono text-xs">
                    <div className="p-2 rounded bg-black/50 border border-white/5">
                      <span className="text-[10px] text-slate-500 block">HYG (JUNK BONDS)</span>
                      <span className={`font-bold ${confluence.pillars.pillar_3_credit_lead_lag.hyg_4h_change_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {confluence.pillars.pillar_3_credit_lead_lag.hyg_4h_change_pct >= 0 ? '+' : ''}{confluence.pillars.pillar_3_credit_lead_lag.hyg_4h_change_pct.toFixed(2)}%
                      </span>
                      <span className="text-[9px] text-slate-500 block">4h Flow</span>
                    </div>
                    <div className="p-2 rounded bg-black/50 border border-white/5">
                      <span className="text-[10px] text-slate-500 block">SPY (EQUITIES)</span>
                      <span className={`font-bold ${confluence.pillars.pillar_3_credit_lead_lag.spy_4h_change_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {confluence.pillars.pillar_3_credit_lead_lag.spy_4h_change_pct >= 0 ? '+' : ''}{confluence.pillars.pillar_3_credit_lead_lag.spy_4h_change_pct.toFixed(2)}%
                      </span>
                      <span className="text-[9px] text-slate-500 block">4h Equity</span>
                    </div>
                    <div className="p-2 rounded bg-black/50 border border-white/5 col-span-2">
                      <span className="text-[10px] text-slate-500 block">DIVERGENCE STATE</span>
                      <span className="font-bold text-amber-300">{confluence.pillars.pillar_3_credit_lead_lag.divergence_state.replace(/_/g, ' ')}</span>
                      <span className="text-[9px] text-slate-400 block">Credit Spread: {confluence.pillars.pillar_3_credit_lead_lag.credit_divergence_spread > 0 ? '+' : ''}{confluence.pillars.pillar_3_credit_lead_lag.credit_divergence_spread.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 p-2.5 rounded bg-amber-950/30 border border-amber-500/20 text-xs font-mono text-amber-200/90 leading-relaxed">
                  {confluence.pillars.pillar_3_credit_lead_lag.rationale}
                </div>
              </div>

              {/* Pillar 4: Dark Pool Liquidity Sweep */}
              <div className="glass-panel p-4 rounded-xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 via-slate-950 to-slate-950 flex flex-col justify-between hover:border-emerald-500/50 transition-all shadow-md">
                <div>
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Target size={16} />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                          Pillar 4: Stop-Hunt
                        </h3>
                        <span className="text-[10px] font-mono text-slate-400">Dark Pool Absorption</span>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-sm font-bold text-emerald-400">
                        {confluence.pillars.pillar_4_liquidity_sweep.score}
                      </span>
                      <span className="text-[10px] text-slate-500"> / 25</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 font-mono text-xs">
                    <div className="p-2 rounded bg-black/50 border border-white/5">
                      <span className="text-[10px] text-slate-500 block">VOLUME EXPANSION</span>
                      <span className={`font-bold ${confluence.pillars.pillar_4_liquidity_sweep.volume_ratio >= 1.5 ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {confluence.pillars.pillar_4_liquidity_sweep.volume_ratio.toFixed(1)}x
                      </span>
                      <span className="text-[9px] text-slate-500 block">vs baseline</span>
                    </div>
                    <div className="p-2 rounded bg-black/50 border border-white/5">
                      <span className="text-[10px] text-slate-500 block">INVALIDATION (STOP)</span>
                      <span className="font-bold text-rose-400">${confluence.pillars.pillar_4_liquidity_sweep.invalidation_level.toFixed(2)}</span>
                      <span className="text-[9px] text-slate-500 block">Risk Invalidation</span>
                    </div>
                    <div className="p-2 rounded bg-black/50 border border-white/5 col-span-2">
                      <span className="text-[10px] text-slate-500 block">SWEEP ORDER FLOW</span>
                      <span className="font-bold text-emerald-300">{confluence.pillars.pillar_4_liquidity_sweep.sweep_pattern.replace(/_/g, ' ')}</span>
                      <span className="text-[9px] text-slate-400 block">Target: ${confluence.pillars.pillar_4_liquidity_sweep.target_level.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 p-2.5 rounded bg-emerald-950/30 border border-emerald-500/20 text-xs font-mono text-emerald-200/90 leading-relaxed">
                  {confluence.pillars.pillar_4_liquidity_sweep.rationale}
                </div>
              </div>

            </div>

          </div>
        ) : null
      ) : (
        /* UNIVERSE SCANNER TAB (Full Width Table) */
        <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase font-mono">
                Full-Universe Institutional Confluence Radar
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Ranked by Confluence Score. Setups scoring &gt;= 75 points qualify for autonomous firm execution.
              </p>
            </div>
            {radarLoading && (
              <div className="flex items-center gap-2 text-xs font-mono text-indigo-400">
                <RefreshCw size={14} className="animate-spin" />
                <span>Scanning feeds...</span>
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/50">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Symbol</th>
                  <th className="py-3 px-4">Spot</th>
                  <th className="py-3 px-4">Confluence Score</th>
                  <th className="py-3 px-4">Verdict</th>
                  <th className="py-3 px-4">Call Wall</th>
                  <th className="py-3 px-4">Put Wall</th>
                  <th className="py-3 px-4">IV Rank</th>
                  <th className="py-3 px-4">Credit Lead</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {radar.map((item) => (
                  <tr 
                    key={item.symbol} 
                    className="hover:bg-slate-800/50 transition-colors cursor-pointer"
                    onClick={() => {
                      onSelectSymbol(item.symbol);
                      setActiveTab('WORKSPACE');
                    }}
                  >
                    <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                      <span className="text-sm">{item.symbol}</span>
                      {item.execution_permitted && (
                        <Zap size={13} className="text-emerald-400 fill-emerald-400 animate-pulse" />
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">${item.spot_price.toFixed(2)}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded font-bold ${
                        item.confluence_score >= 75 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                          : item.confluence_score >= 60
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {item.confluence_score} / 100
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`font-bold ${item.execution_permitted ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {item.trade_verdict}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-rose-400">${item.call_wall.toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-emerald-400">${item.put_wall.toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-slate-300">{item.iv_rank.toFixed(0)}%</td>
                    <td className="py-3.5 px-4 text-slate-300">{item.credit_state.replace(/_/g, ' ')}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSymbol(item.symbol);
                          setActiveTab('WORKSPACE');
                        }}
                        className="px-3 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 hover:bg-indigo-500/40 transition-all font-bold"
                      >
                        Load Workspace →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
