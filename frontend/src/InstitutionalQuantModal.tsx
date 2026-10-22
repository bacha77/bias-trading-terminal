import { useState, useEffect, useCallback } from 'react';
import { 
  X, RefreshCw, ShieldCheck, Zap, Activity, Target, 
  Layers, Lock, BarChart2, Compass, Cpu, CheckCircle2, AlertTriangle, Sparkles
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

interface ConfluenceData {
  symbol: string;
  timestamp: string;
  confluence_score: number;
  max_score: number;
  bias: string;
  trade_verdict: string;
  verdict_color: string;
  execution_permitted: boolean;
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
  isOpen: boolean;
  onClose: () => void;
}

const WATCHLIST = ['SPY', 'QQQ', 'NVDA', 'TSLA', 'AAPL', 'AMD', 'MSFT', 'META'];

export function InstitutionalQuantModal({ isOpen, onClose }: Props) {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('SPY');
  const [confluence, setConfluence] = useState<ConfluenceData | null>(null);
  const [radar, setRadar] = useState<RadarItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [radarLoading, setRadarLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'ANALYSIS' | 'RADAR'>('ANALYSIS');
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

  useEffect(() => {
    if (isOpen) {
      fetchConfluence(selectedSymbol);
      fetchRadar();
    }
  }, [isOpen, selectedSymbol, fetchConfluence, fetchRadar]);

  if (!isOpen) return null;

  const score = confluence?.confluence_score || 0;
  const isApproved = confluence?.execution_permitted ?? false;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 font-sans text-slate-100 overflow-hidden">
      <div className="relative w-full h-full flex flex-col bg-slate-950 overflow-hidden">
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Cpu size={24} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-wide bg-gradient-to-r from-indigo-300 via-purple-200 to-cyan-300 bg-clip-text text-transparent">
                  INSTITUTIONAL QUANT ALPHA MATRIX
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-indigo-400/40 bg-indigo-500/20 text-indigo-300">
                  CITADEL · JANE STREET · RENAISSANCE
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Structural market mechanics replacing retail indicator churn with 4 quantitative alpha pillars
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Nav Tabs */}
            <div className="flex bg-slate-900/90 p-0.5 rounded-lg border border-slate-800 text-xs font-mono">
              <button
                onClick={() => setActiveTab('ANALYSIS')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  activeTab === 'ANALYSIS'
                    ? 'bg-indigo-600 text-white font-bold shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                SINGLE TICKER
              </button>
              <button
                onClick={() => setActiveTab('RADAR')}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                  activeTab === 'RADAR'
                    ? 'bg-indigo-600 text-white font-bold shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>RADAR SCAN</span>
                {radar.length > 0 && (
                  <span className="text-[10px] bg-indigo-400/20 text-indigo-300 px-1.5 py-0.2 rounded-full">
                    {radar.length}
                  </span>
                )}
              </button>
            </div>

            <button
              onClick={() => {
                fetchConfluence(selectedSymbol);
                fetchRadar();
              }}
              disabled={loading || radarLoading}
              className="p-2 text-slate-400 hover:text-white rounded-lg border border-slate-800 hover:bg-slate-800/60 transition-all"
              title="Refresh Institutional Data"
            >
              <RefreshCw size={16} className={loading || radarLoading ? 'animate-spin text-indigo-400' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-rose-400 rounded-lg border border-slate-800 hover:bg-slate-800/60 transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Watchlist Quick Switcher */}
        <div className="px-6 py-2.5 bg-slate-900/40 border-b border-slate-800/60 flex items-center gap-2 overflow-x-auto text-xs font-mono">
          <span className="text-slate-500 font-bold flex items-center gap-1">
            <Compass size={12} /> SYMBOLS:
          </span>
          {WATCHLIST.map((sym) => (
            <button
              key={sym}
              onClick={() => setSelectedSymbol(sym)}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                selectedSymbol === sym
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/60 font-bold shadow-[0_0_10px_rgba(99,102,241,0.25)]'
                  : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
            >
              {sym}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {activeTab === 'ANALYSIS' ? (
            loading && !confluence ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3">
                <RefreshCw size={28} className="animate-spin text-indigo-400" />
                <span className="text-xs font-mono text-slate-400">
                  Computing 4-Pillar Institutional Confluence for {selectedSymbol}...
                </span>
              </div>
            ) : confluence ? (
              <>
                {/* Master Verdict Banner */}
                <div className={`p-5 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-4 ${
                  isApproved 
                    ? 'bg-emerald-950/20 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                    : 'bg-amber-950/20 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                }`}>
                  <div className="flex items-center gap-4">
                    {/* Circular Score Gauge */}
                    <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-slate-900/80 border-2 border-slate-800">
                      <div className="text-center font-mono">
                        <div className={`text-2xl font-black ${
                          score >= 75 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-slate-400'
                        }`}>
                          {score}
                        </div>
                        <div className="text-[9px] text-slate-500 font-bold">/ 100 PTS</div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                          Institutional Verdict:
                        </span>
                        <span className={`text-xs font-black font-mono px-2 py-0.5 rounded ${
                          isApproved ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                          {confluence.trade_verdict}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-slate-200 mt-1">
                        Bias: <span className="text-indigo-400 font-mono">{confluence.bias}</span> · Spot Price: <span className="text-white font-mono">${confluence.pillars.pillar_1_dealer_gex.spot_price.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 max-w-2xl font-mono leading-relaxed">
                        {confluence.summary_memo}
                      </p>
                    </div>
                  </div>

                  {/* Execution Gate Badge & Trigger */}
                  <div className="flex flex-col items-end gap-2">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-xs font-bold ${
                      isApproved 
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400'
                    }`}>
                      {isApproved ? <ShieldCheck size={14} className="text-emerald-400" /> : <Lock size={14} className="text-amber-400" />}
                      <span>{isApproved ? 'EXECUTION PERMITTED (>= 75 PTS)' : 'EXECUTION LOCKED (< 75 PTS)'}</span>
                    </div>

                    <button
                      onClick={() => executeQuantOptionTrade(selectedSymbol)}
                      disabled={triggerExecuting || !isApproved}
                      className={`px-4 py-2 rounded-xl font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md ${
                        isApproved && !triggerExecuting
                          ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer active:scale-95'
                          : 'bg-slate-800/80 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                      }`}
                    >
                      {triggerExecuting ? (
                        <>
                          <RefreshCw size={13} className="animate-spin text-slate-950" />
                          <span>ROUTING OCC ORDER...</span>
                        </>
                      ) : (
                        <>
                          <Zap size={13} className={isApproved ? "fill-slate-950 text-slate-950" : ""} />
                          <span>EXECUTE QUANT OPTION</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400/80">
                      <Sparkles size={10} />
                      <span>OCC Options Only · +40% TP / -25% SL</span>
                    </div>
                  </div>
                </div>

                {/* Execution Result Banner */}
                {executionResult && (
                  <div className={`p-3.5 rounded-xl border font-mono text-xs animate-in fade-in duration-200 flex items-start justify-between gap-3 ${
                    executionResult.executed_count > 0 || (executionResult.executed_trades && executionResult.executed_trades.length > 0)
                      ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                      : 'bg-indigo-950/40 border-indigo-500/40 text-indigo-200'
                  }`}>
                    <div className="flex items-start gap-2.5">
                      {executionResult.executed_count > 0 ? (
                        <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-1">
                        <div className="font-bold">
                          {executionResult.executed_count > 0 
                            ? `QUANT ALPHA OPTION ORDER SUBMITTED (${executionResult.executed_count} EXECUTED)` 
                            : `CYCLE COMPLETE (${executionResult.scanned || 0} ASSETS SCANNED)`}
                        </div>
                        {executionResult.executed_trades && executionResult.executed_trades.length > 0 ? (
                          <div className="space-y-1 pt-1">
                            {executionResult.executed_trades.map((t: any, idx: number) => (
                              <div key={idx} className="bg-slate-950/60 p-2 rounded border border-emerald-500/30 text-[10px]">
                                <span className="font-bold text-white">{t.side} {t.strike} {t.symbol}</span> · Entry: ${Number(t.price).toFixed(2)} · TP: ${Number(t.tp).toFixed(2)} · SL: ${Number(t.sl).toFixed(2)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-300">
                            {executionResult.reason || executionResult.message || `No qualifying confluence setup met strict 4-pillar threshold for immediate execution.`}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setExecutionResult(null)}
                      className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}

                {/* 4 Pillars Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Pillar 1: Citadel Dealer Gamma (GEX) */}
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          <Activity size={16} />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                            Pillar 1: Citadel Dealer Gamma (GEX)
                          </h3>
                          <span className="text-[10px] font-mono text-slate-400">
                            Mandatory delta-neutral hedging pins & walls
                          </span>
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-sm font-bold text-blue-400">
                          {confluence.pillars.pillar_1_dealer_gex.score}
                        </span>
                        <span className="text-[10px] text-slate-500"> / 25 pts</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-3 font-mono text-xs">
                      <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                        <span className="text-[10px] text-slate-500 block">CALL WALL</span>
                        <span className="font-bold text-rose-400">${confluence.pillars.pillar_1_dealer_gex.call_wall.toFixed(2)}</span>
                        <span className="text-[9px] text-slate-500 block">+{confluence.pillars.pillar_1_dealer_gex.dist_to_call_wall_pct}%</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                        <span className="text-[10px] text-slate-500 block">PUT WALL</span>
                        <span className="font-bold text-emerald-400">${confluence.pillars.pillar_1_dealer_gex.put_wall.toFixed(2)}</span>
                        <span className="text-[9px] text-slate-500 block">-{confluence.pillars.pillar_1_dealer_gex.dist_to_put_wall_pct}%</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                        <span className="text-[10px] text-slate-500 block">NET GEX</span>
                        <span className="font-bold text-cyan-400">${confluence.pillars.pillar_1_dealer_gex.net_gex_millions.toFixed(1)}M</span>
                        <span className="text-[9px] text-slate-500 block">Dealer Gamma</span>
                      </div>
                    </div>

                    <div className="mt-3 p-2.5 rounded-lg bg-blue-950/20 border border-blue-500/20 text-xs font-mono text-blue-200/90 leading-relaxed">
                      {confluence.pillars.pillar_1_dealer_gex.rationale}
                    </div>
                  </div>

                  {/* Pillar 2: Jane Street Variance Risk Premium (VRP) */}
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          <BarChart2 size={16} />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                            Pillar 2: Jane Street Volatility (VRP)
                          </h3>
                          <span className="text-[10px] font-mono text-slate-400">
                            IV vs Realized Vol (RV) theta decay pricing
                          </span>
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-sm font-bold text-purple-400">
                          {confluence.pillars.pillar_2_variance_risk_premium.score}
                        </span>
                        <span className="text-[10px] text-slate-500"> / 25 pts</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-3 font-mono text-xs">
                      <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                        <span className="text-[10px] text-slate-500 block">IMPLIED VOL (IV)</span>
                        <span className="font-bold text-purple-300">{confluence.pillars.pillar_2_variance_risk_premium.implied_vol_atm.toFixed(1)}%</span>
                        <span className="text-[9px] text-slate-500 block">Market pricing</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                        <span className="text-[10px] text-slate-500 block">REALIZED VOL (RV)</span>
                        <span className="font-bold text-slate-300">{confluence.pillars.pillar_2_variance_risk_premium.realized_vol_30d.toFixed(1)}%</span>
                        <span className="text-[9px] text-slate-500 block">30d Actual</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                        <span className="text-[10px] text-slate-500 block">IV RANK</span>
                        <span className={`font-bold ${confluence.pillars.pillar_2_variance_risk_premium.iv_rank_pct > 65 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {confluence.pillars.pillar_2_variance_risk_premium.iv_rank_pct.toFixed(1)}%
                        </span>
                        <span className="text-[9px] text-slate-500 block">52w Percentile</span>
                      </div>
                    </div>

                    <div className="mt-3 p-2.5 rounded-lg bg-purple-950/20 border border-purple-500/20 text-xs font-mono text-purple-200/90 leading-relaxed">
                      {confluence.pillars.pillar_2_variance_risk_premium.rationale}
                    </div>
                  </div>

                  {/* Pillar 3: Renaissance Credit Lead-Lag */}
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Layers size={16} />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                            Pillar 3: Renaissance Credit Lead-Lag
                          </h3>
                          <span className="text-[10px] font-mono text-slate-400">
                            Junk Bonds ($HYG) front-running equities
                          </span>
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-sm font-bold text-amber-400">
                          {confluence.pillars.pillar_3_credit_lead_lag.score}
                        </span>
                        <span className="text-[10px] text-slate-500"> / 25 pts</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-3 font-mono text-xs">
                      <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                        <span className="text-[10px] text-slate-500 block">HYG (JUNK BONDS)</span>
                        <span className={`font-bold ${confluence.pillars.pillar_3_credit_lead_lag.hyg_4h_change_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {confluence.pillars.pillar_3_credit_lead_lag.hyg_4h_change_pct >= 0 ? '+' : ''}{confluence.pillars.pillar_3_credit_lead_lag.hyg_4h_change_pct.toFixed(2)}%
                        </span>
                        <span className="text-[9px] text-slate-500 block">4h Momentum</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                        <span className="text-[10px] text-slate-500 block">SPY (EQUITIES)</span>
                        <span className={`font-bold ${confluence.pillars.pillar_3_credit_lead_lag.spy_4h_change_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {confluence.pillars.pillar_3_credit_lead_lag.spy_4h_change_pct >= 0 ? '+' : ''}{confluence.pillars.pillar_3_credit_lead_lag.spy_4h_change_pct.toFixed(2)}%
                        </span>
                        <span className="text-[9px] text-slate-500 block">4h Momentum</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                        <span className="text-[10px] text-slate-500 block">CREDIT SPREAD</span>
                        <span className="font-bold text-amber-300">
                          {confluence.pillars.pillar_3_credit_lead_lag.credit_divergence_spread > 0 ? '+' : ''}{confluence.pillars.pillar_3_credit_lead_lag.credit_divergence_spread.toFixed(2)}%
                        </span>
                        <span className="text-[9px] text-slate-500 block">Z-Score Delta</span>
                      </div>
                    </div>

                    <div className="mt-3 p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/20 text-xs font-mono text-amber-200/90 leading-relaxed">
                      {confluence.pillars.pillar_3_credit_lead_lag.rationale}
                    </div>
                  </div>

                  {/* Pillar 4: Dark Pool Liquidity Sweep */}
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <Target size={16} />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                            Pillar 4: Dark Pool Liquidity Sweep
                          </h3>
                          <span className="text-[10px] font-mono text-slate-400">
                            Stop-loss hunting & volume absorption
                          </span>
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-sm font-bold text-emerald-400">
                          {confluence.pillars.pillar_4_liquidity_sweep.score}
                        </span>
                        <span className="text-[10px] text-slate-500"> / 25 pts</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-3 font-mono text-xs">
                      <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                        <span className="text-[10px] text-slate-500 block">VOLUME EXPANSION</span>
                        <span className={`font-bold ${confluence.pillars.pillar_4_liquidity_sweep.volume_ratio >= 1.5 ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {confluence.pillars.pillar_4_liquidity_sweep.volume_ratio.toFixed(1)}x
                        </span>
                        <span className="text-[9px] text-slate-500 block">vs 20-bar avg</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                        <span className="text-[10px] text-slate-500 block">SWEEP PATTERN</span>
                        <span className="font-bold text-slate-200 truncate block">
                          {confluence.pillars.pillar_4_liquidity_sweep.sweep_pattern.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[9px] text-slate-500 block">Order Flow</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                        <span className="text-[10px] text-slate-500 block">INVALIDATION (STOP)</span>
                        <span className="font-bold text-rose-400">${confluence.pillars.pillar_4_liquidity_sweep.invalidation_level.toFixed(2)}</span>
                        <span className="text-[9px] text-slate-500 block">Strict Risk Level</span>
                      </div>
                    </div>

                    <div className="mt-3 p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-xs font-mono text-emerald-200/90 leading-relaxed">
                      {confluence.pillars.pillar_4_liquidity_sweep.rationale}
                    </div>
                  </div>

                </div>
              </>
            ) : null
          ) : (
            /* RADAR SCAN TAB */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 uppercase font-mono">
                    High-Liquidity Institutional Universe Radar
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Sorted by Institutional Confluence Score. Setups with &gt;= 75 pts qualify for autonomous execution.
                  </p>
                </div>
                {radarLoading && (
                  <div className="flex items-center gap-2 text-xs font-mono text-indigo-400">
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Scanning market...</span>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Symbol</th>
                      <th className="py-3 px-4">Price</th>
                      <th className="py-3 px-4">Confluence Score</th>
                      <th className="py-3 px-4">Verdict</th>
                      <th className="py-3 px-4">Call Wall</th>
                      <th className="py-3 px-4">Put Wall</th>
                      <th className="py-3 px-4">IV Rank</th>
                      <th className="py-3 px-4">Credit Lead</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {radar.map((item) => (
                      <tr 
                        key={item.symbol} 
                        className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedSymbol(item.symbol);
                          setActiveTab('ANALYSIS');
                        }}
                      >
                        <td className="py-3 px-4 font-bold text-white flex items-center gap-1.5">
                          <span>{item.symbol}</span>
                          {item.execution_permitted && (
                            <Zap size={12} className="text-emerald-400 fill-emerald-400 animate-pulse" />
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-300">${item.spot_price.toFixed(2)}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            item.confluence_score >= 75 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                              : item.confluence_score >= 60
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {item.confluence_score} / 100
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-[11px] font-bold ${
                            item.execution_permitted ? 'text-emerald-400' : 'text-slate-400'
                          }`}>
                            {item.trade_verdict}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-rose-400">${item.call_wall.toFixed(2)}</td>
                        <td className="py-3 px-4 text-emerald-400">${item.put_wall.toFixed(2)}</td>
                        <td className="py-3 px-4 text-slate-300">{item.iv_rank.toFixed(0)}%</td>
                        <td className="py-3 px-4 text-slate-300">{item.credit_state.replace(/_/g, ' ')}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSymbol(item.symbol);
                              setActiveTab('ANALYSIS');
                            }}
                            className="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 hover:bg-indigo-500/30 transition-all text-[11px]"
                          >
                            Inspect
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

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Autonomous Institutional Gatekeeper Active (Minimum Execution Score: 70/100)</span>
          </div>
          <div>
            Data: CBOE Options Gamma · High-Yield Credit (HYG) · Realized Volatility · Dark Pool Sweeps
          </div>
        </div>

      </div>
    </div>
  );
}
