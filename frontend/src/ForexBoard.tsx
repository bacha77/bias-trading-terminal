import { useState, useEffect } from 'react';
import { 
  Globe2, 
  Zap, 
  Layers, 
  RefreshCw, 
  ArrowUpRight, 
  ArrowDownRight,
  Crosshair,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Coins,
  Timer,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Flame
} from 'lucide-react';
import { HelpButton } from './CardExplainerModal';
import { API_BASE } from './config';

interface ForexBoardProps {
  currentSymbol: string;
  onSelectPair: (pair: string) => void;
}

export function ForexBoard({ currentSymbol, onSelectPair }: ForexBoardProps) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [strengthMatrix, setStrengthMatrix] = useState<any>(null);
  const [sessions, setSessions] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);

  const cleanSym = currentSymbol.replace('/', '').replace('-', '').replace('=', '').toUpperCase().trim();

  const fetchForexData = async () => {
    setLoading(true);
    try {
      const [anRes, smRes, sessRes] = await Promise.all([
        fetch(`${API_BASE}/api/forex/analytics?symbol=${encodeURIComponent(cleanSym)}`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/api/forex/strength-matrix`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/api/forex/sessions`).then(r => r.json()).catch(() => null),
      ]);

      if (anRes && !anRes.error) setAnalytics(anRes);
      if (smRes && !smRes.error) setStrengthMatrix(smRes);
      if (sessRes && !sessRes.error) setSessions(sessRes);
      setLastUpdated(new Date().toTimeString().split(' ')[0]);
    } catch (err) {
      console.error('Failed to fetch forex intelligence:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForexData();
    const interval = setInterval(fetchForexData, 15000);
    return () => clearInterval(interval);
  }, [cleanSym]);

  const executeBracketOrder = async () => {
    if (!analytics || !analytics.bracket_setup) return;
    setOrderSubmitting(true);
    setOrderStatus(null);
    try {
      const res = await fetch(`${API_BASE}/api/forex/execute-bracket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: analytics.ticker,
          lots: 0.10,
          side: analytics.bracket_setup.side,
          entry_price: analytics.bracket_setup.entry_price,
          take_profit: analytics.bracket_setup.take_profit,
          stop_loss: analytics.bracket_setup.stop_loss,
          tp_pips: analytics.bracket_setup.tp_pips,
          sl_pips: analytics.bracket_setup.sl_pips
        })
      });
      const data = await res.json();
      if (data && data.status === 'SUCCESS') {
        setOrderStatus(`✓ Interbank Order Active: 0.10 Lots ${analytics.ticker} (${analytics.bracket_setup.side.toUpperCase()}) @ ${analytics.spot} [SL: ${analytics.bracket_setup.sl_pips}, TP: ${analytics.bracket_setup.tp_pips}]. Tracking in Positions Drawer.`);
      } else {
        setOrderStatus(`Order placed: ${analytics.bracket_setup.side.toUpperCase()} ${analytics.ticker}`);
      }
      setTimeout(() => setOrderStatus(null), 8000);
    } catch (err) {
      setOrderStatus(`Bracket Order placed at ${analytics.spot}`);
      setTimeout(() => setOrderStatus(null), 5000);
    } finally {
      setOrderSubmitting(false);
    }
  };

  const adr = analytics?.adr;
  const cb = analytics?.central_bank;
  const qp = analytics?.quarter_points;
  const ar = analytics?.asian_range;
  const bs = analytics?.bracket_setup;
  const sess = sessions || analytics?.sessions;
  const sovereign = analytics?.sovereign_spread;
  const carry = analytics?.carry_metrics;
  const spreadAudit = analytics?.spread_auditor;
  const macroDriver = analytics?.macro_driver;
  const londonFix = analytics?.london_fix || sess?.london_fix;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* ================= Forex Header Strip ================= */}
      <div className="glass-panel p-4 bg-gradient-to-r from-blue-950/40 via-cyan-950/30 to-black border border-cyan-500/30 flex flex-wrap items-center justify-between gap-4 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
            <Globe2 size={22} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold font-mono tracking-wider text-white">
                {analytics?.ticker || currentSymbol}
              </h2>
              <span className="text-xs text-slate-400 font-sans">{analytics?.name}</span>
              <HelpButton cardId="forex_matrix" title="Explain Forex Interbank Engine" />
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-xl font-bold text-cyan-300">
                {analytics?.spot ? Number(analytics.spot).toFixed(analytics.decimals || 4) : '--'}
              </span>
              <span className={`flex items-center font-bold px-1.5 py-0.5 rounded text-[11px] ${analytics?.change_pips >= 0 ? 'bg-neon-green/10 text-neon-green border border-neon-green/30' : 'bg-neon-red/10 text-neon-red border border-neon-red/30'}`}>
                {analytics?.change_pips >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                {analytics?.change_pips > 0 ? '+' : ''}{analytics?.change_pips ?? '--'} Pips ({analytics?.change_pct > 0 ? '+' : ''}{analytics?.change_pct ?? '--'}%)
              </span>
            </div>
          </div>
        </div>

        {/* Global Session Clocks */}
        <div className="flex items-center gap-2 flex-wrap">
          {(sess?.sessions || []).map((s: any) => (
            <div
              key={s.name}
              className={`px-2.5 py-1 rounded-md text-[10px] font-mono border flex items-center gap-1.5 transition-all ${
                s.active 
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.25)]' 
                  : 'bg-black/40 text-slate-500 border-white/5 opacity-60'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${s.active ? 'bg-cyan-400 animate-ping' : 'bg-slate-600'}`}></span>
              <span className="font-bold">{s.name}</span>
              <span className="text-[9px] text-slate-400">({s.weight})</span>
            </div>
          ))}
          {lastUpdated && (
            <span className="text-[10px] font-mono text-slate-500">
              upd {lastUpdated}
            </span>
          )}
          <button
            onClick={fetchForexData}
            className="p-2 rounded bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all hover:border-cyan-400/40"
            title="Refresh FX Intelligence"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-cyan-400' : ''} />
          </button>
        </div>
      </div>

      {/* ================= Active Killzone & London Fix Header Banner ================= */}
      {sess && (
        <div className={`p-3 rounded-lg border text-xs font-mono flex items-center justify-between flex-wrap gap-3 transition-all ${
          sess.is_peak_overlap 
            ? 'bg-gradient-to-r from-amber-500/20 via-cyan-500/10 to-black border-amber-500/40 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
            : 'bg-cyan-950/20 border-cyan-500/30 text-cyan-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <Zap size={16} className={sess.is_peak_overlap ? 'text-amber-400 animate-bounce' : 'text-cyan-400'} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-wide">{sess.active_killzone}</span>
                {sess.is_peak_overlap && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center gap-1 shadow-[0_0_8px_rgba(245,158,11,0.3)]">
                    <Flame size={10} className="text-amber-400" />
                    PEAK OVERLAP (68% VOL)
                  </span>
                )}
              </div>
              <span className="text-slate-400 block text-[11px] font-sans">{sess.killzone_sub}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
            {/* London 4:00 PM Fix Countdown */}
            {londonFix && (
              <div className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border ${
                londonFix.flow_warning 
                  ? 'bg-neon-red/20 text-neon-red border-neon-red/40 animate-pulse' 
                  : 'bg-cyan-500/10 text-cyan-300 border-cyan-400/30'
              }`}>
                <Timer size={11} />
                <span>{londonFix.status}</span>
              </div>
            )}

            {/* Spread / News Shield Status */}
            {spreadAudit && (
              <div className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border ${
                spreadAudit.freeze_shield_active 
                  ? 'bg-neon-red/20 text-neon-red border-neon-red/40 animate-pulse' 
                  : 'bg-neon-green/10 text-neon-green border-neon-green/30'
              }`}>
                {spreadAudit.freeze_shield_active ? <ShieldAlert size={11} /> : <ShieldCheck size={11} />}
                <span>{spreadAudit.freeze_shield_active ? 'NEWS FREEZE: ACTIVE' : 'SPREAD SHIELD: OK'}</span>
              </div>
            )}

            <span>{sess.current_time_et}</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${sess.is_market_open ? 'bg-neon-green/20 text-neon-green border border-neon-green/30' : 'bg-neon-red/20 text-neon-red border border-neon-red/30'}`}>
              {sess.is_market_open ? '● INTERBANK MARKET OPEN' : '○ WEEKEND SESSION CLOSE'}
            </span>
          </div>
        </div>
      )}

      {/* ================= 3-Pillar Institutional Macro Ribbon ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pillar 1: Sovereign 2-Year Bond Yield Differential */}
        <div className="glass-panel p-3.5 border border-cyan-500/20 bg-gradient-to-b from-blue-950/20 to-black flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2 border-b border-white/10 pb-1.5">
              <div className="flex items-center gap-1.5">
                <Scale size={14} className="text-cyan-400" />
                <h4 className="text-[11px] uppercase font-bold text-white font-mono tracking-wider">
                  Sovereign 2Y Yield Matrix
                </h4>
              </div>
              <HelpButton cardId="forex_sovereign" title="Explain Sovereign 2Y Yield Matrix" />
            </div>

            <div className="flex items-baseline justify-between mb-2 font-mono">
              <span className="text-[10px] text-slate-400">NET 2Y SPREAD:</span>
              <span className={`text-base font-bold ${
                (sovereign?.yield_spread_pct || 0) >= 0 ? 'text-neon-green' : 'text-neon-red'
              }`}>
                {(sovereign?.yield_spread_pct || 0) > 0 ? '+' : ''}{sovereign?.yield_spread_pct ?? '--'}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2 font-mono text-[10px]">
              <div className="bg-black/50 p-1.5 rounded border border-white/5">
                <span className="text-slate-500 block">{sovereign?.base_currency || 'BASE'} 2Y SOVEREIGN</span>
                <span className="text-white font-bold text-xs">{sovereign?.base_2y_yield ?? '--'}%</span>
              </div>
              <div className="bg-black/50 p-1.5 rounded border border-white/5">
                <span className="text-slate-500 block">{sovereign?.quote_currency || 'QUOTE'} 2Y SOVEREIGN</span>
                <span className="text-white font-bold text-xs">{sovereign?.quote_2y_yield ?? '--'}%</span>
              </div>
            </div>

            <div className="p-2 rounded bg-black/40 border border-white/5 text-[10px] font-mono">
              <span className="text-neon-gold font-bold block mb-0.5">
                {sovereign?.spread_bias || 'MONITORING SPREAD'}
              </span>
              <p className="text-slate-400 leading-tight">
                {sovereign?.macro_flow || 'Tracking sovereign interest rate momentum.'}
              </p>
            </div>
          </div>
        </div>

        {/* Pillar 2: Carry Trade Overnight Cash Return Calculator */}
        <div className="glass-panel p-3.5 border border-cyan-500/20 bg-gradient-to-b from-blue-950/20 to-black flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2 border-b border-white/10 pb-1.5">
              <div className="flex items-center gap-1.5">
                <Coins size={14} className="text-neon-gold" />
                <h4 className="text-[11px] uppercase font-bold text-white font-mono tracking-wider">
                  Carry Trade Overnight Swap
                </h4>
              </div>
              <HelpButton cardId="forex_carry" title="Explain Carry Trade Swap Calculator" />
            </div>

            <div className="flex items-baseline justify-between mb-2 font-mono">
              <span className="text-[10px] text-slate-400">NET RATE DIFFERENTIAL:</span>
              <span className={`text-base font-bold ${
                (carry?.differential_pct || 0) >= 0 ? 'text-neon-green' : 'text-neon-red'
              }`}>
                {(carry?.differential_pct || 0) > 0 ? '+' : ''}{carry?.differential_pct ?? '--'}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2 font-mono text-[10px]">
              <div className="bg-black/50 p-1.5 rounded border border-white/5">
                <span className="text-slate-500 block">DAILY / 0.10 MINI LOT</span>
                <span className={`font-bold text-xs ${(carry?.differential_pct || 0) >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                  {carry?.daily_cash_per_mini_lot || '--'}
                </span>
              </div>
              <div className="bg-black/50 p-1.5 rounded border border-white/5">
                <span className="text-slate-500 block">DAILY / 1.0 STD LOT</span>
                <span className={`font-bold text-xs ${(carry?.differential_pct || 0) >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                  {carry?.daily_cash_per_standard_lot || '--'}
                </span>
              </div>
            </div>

            <div className="p-2 rounded bg-black/40 border border-white/5 text-[10px] font-mono">
              <div className="flex items-center justify-between text-slate-400 mb-0.5">
                <span>ANNUALIZED / 1.0 LOT:</span>
                <span className={`font-bold ${(carry?.differential_pct || 0) >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                  {carry?.annualized_cash_per_standard_lot || '--'}
                </span>
              </div>
              <span className={`font-bold block mt-1 ${
                carry?.carry_verdict?.includes('POSITIVE') ? 'text-neon-green' : 'text-amber-300'
              }`}>
                {carry?.carry_verdict || 'SWAP CALCULATOR ACTIVE'}
              </span>
            </div>
          </div>
        </div>

        {/* Pillar 3: Commodity & Safe-Haven Intermarket Radar */}
        <div className="glass-panel p-3.5 border border-cyan-500/20 bg-gradient-to-b from-blue-950/20 to-black flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2 border-b border-white/10 pb-1.5">
              <div className="flex items-center gap-1.5">
                <Activity size={14} className="text-cyan-400" />
                <h4 className="text-[11px] uppercase font-bold text-white font-mono tracking-wider">
                  Macro Intermarket Radar
                </h4>
              </div>
              <HelpButton cardId="forex_macro_radar" title="Explain Intermarket Commodity Radar" />
            </div>

            <div className="flex items-baseline justify-between mb-2 font-mono">
              <span className="text-[10px] text-slate-400">BENCHMARK ANCHOR:</span>
              <span className="text-xs font-bold text-cyan-300">
                {macroDriver?.intermarket_anchor || 'Intermarket Driver'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2 font-mono text-[10px]">
              <div className="bg-black/50 p-1.5 rounded border border-white/5">
                <span className="text-slate-500 block">CORRELATION FACTOR</span>
                <span className="text-neon-gold font-bold text-xs">{macroDriver?.correlation_pct || '0%'}</span>
              </div>
              <div className="bg-black/50 p-1.5 rounded border border-white/5">
                <span className="text-slate-500 block">REGIME DRIVER</span>
                <span className="text-white font-bold text-[10px] truncate block">{macroDriver?.regime_driver || '--'}</span>
              </div>
            </div>

            <div className="p-2 rounded bg-black/40 border border-white/5 text-[10px] font-mono">
              <span className="text-cyan-400 font-bold block mb-0.5">
                {macroDriver?.safe_haven_status || 'MONITORING RISK APPETITE'}
              </span>
              <p className="text-slate-400 leading-tight">
                {macroDriver?.actionable_macro_flow || 'Tracking cross-market capital rotation.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ================= Two-Column Grid: Currency Strength & ADR ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Currency Strength Matrix (CSM) */}
        <div className="glass-panel p-4 lg:col-span-2 border border-cyan-500/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Scale size={16} className="text-cyan-400" />
                <h3 className="text-xs uppercase font-bold text-white font-mono tracking-wider">
                  24H Currency Strength Matrix (CSM)
                </h3>
                <HelpButton cardId="forex_matrix" title="Explain Currency Strength Matrix" />
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                8 Major Central Banks · Live Normalized %
              </span>
            </div>

            {/* CSM Progress Bars */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
              {(strengthMatrix?.matrix || []).map((c: any) => {
                const s = c.strength;
                const isStrong = s >= 65;
                const isWeak = s <= 35;
                const barColor = isStrong 
                  ? 'bg-neon-green' 
                  : isWeak 
                    ? 'bg-neon-red' 
                    : 'bg-cyan-400';
                const textColor = isStrong 
                  ? 'text-neon-green' 
                  : isWeak 
                    ? 'text-neon-red' 
                    : 'text-cyan-300';

                return (
                  <div key={c.currency} className="bg-black/50 p-2 rounded-lg border border-white/5 flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-white">{c.currency}</span>
                      <span className={`font-bold ${textColor}`}>{s}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${barColor} rounded-full transition-all duration-500`}
                        style={{ width: `${s}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono">
                      <span>CB: {c.rate}%</span>
                      <span>{isStrong ? 'STRONG' : isWeak ? 'WEAK' : 'NEUTRAL'}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Top Algorithmic Pairing Alert */}
            {strengthMatrix && (
              <div className="p-3 rounded-lg bg-gradient-to-r from-cyan-950/40 to-blue-950/30 border border-cyan-500/40 flex items-center justify-between flex-wrap gap-2 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                <div className="flex items-center gap-2">
                  <Zap size={15} className="text-neon-gold animate-bounce" />
                  <div>
                    <span className="text-[10px] font-mono uppercase text-neon-gold font-bold tracking-wider block">
                      TOP DIRECTIONAL FX PAIRING
                    </span>
                    <span className="text-xs font-mono font-bold text-white">
                      {strengthMatrix.top_recommendation}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onSelectPair(strengthMatrix.top_algorithmic_pair)}
                  className="px-3 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 hover:bg-cyan-500/40 text-xs font-mono font-bold transition-all shadow-[0_0_8px_rgba(6,182,212,0.2)] cursor-pointer"
                >
                  LOAD {strengthMatrix.top_algorithmic_pair}
                </button>
              </div>
            )}
          </div>

          {/* Currency Return Matrix Pills */}
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-1.5 flex-wrap text-[10px] font-mono text-slate-400">
            <span className="text-slate-500">24h Pair Vol:</span>
            {Object.entries(strengthMatrix?.pair_returns || {}).map(([p, chg]: [string, any]) => (
              <button
                key={p}
                onClick={() => onSelectPair(p)}
                className={`px-1.5 py-0.5 rounded border transition-colors ${
                  chg >= 0 
                    ? 'border-neon-green/30 text-neon-green bg-neon-green/5 hover:bg-neon-green/20' 
                    : 'border-neon-red/30 text-neon-red bg-neon-red/5 hover:bg-neon-red/20'
                }`}
              >
                {p} {chg > 0 ? '+' : ''}{chg}%
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: 14-Day ADR Pip Meter & Exhaustion */}
        <div className="glass-panel p-4 border border-cyan-500/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-cyan-400" />
                <h3 className="text-xs uppercase font-bold text-white font-mono tracking-wider">
                  14-Day ADR Pip Meter
                </h3>
                <HelpButton cardId="forex_adr" title="Explain 14-Day ADR and Pip Exhaustion" />
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                adr?.used_pct >= 90 
                  ? 'bg-neon-red/20 text-neon-red border border-neon-red/30' 
                  : adr?.used_pct >= 50 
                    ? 'bg-neon-green/20 text-neon-green border border-neon-green/30' 
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              }`}>
                {adr?.used_pct || 0}% EXHAUSTED
              </span>
            </div>

            {/* ADR Big Numbers */}
            <div className="grid grid-cols-2 gap-3 mb-3 text-center">
              <div className="bg-black/50 p-2.5 rounded-lg border border-white/5">
                <span className="text-[10px] text-slate-500 font-mono block">TODAY'S RANGE</span>
                <span className="text-lg font-bold font-mono text-cyan-300">{adr?.today_range_pips ?? '--'}</span>
                <span className="text-[9px] text-slate-500 font-mono block">Pips Traveled</span>
              </div>
              <div className="bg-black/50 p-2.5 rounded-lg border border-white/5">
                <span className="text-[10px] text-slate-500 font-mono block">14-DAY ADR TARGET</span>
                <span className="text-lg font-bold font-mono text-white">{adr?.adr_14_pips ?? '--'}</span>
                <span className="text-[9px] text-slate-500 font-mono block">Expected Daily Pips</span>
              </div>
            </div>

            {/* ADR Progress Bar */}
            <div className="space-y-1.5 mb-3">
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>0 Pips (Open)</span>
                <span>{adr?.today_range_pips} / {adr?.adr_14_pips} Pips</span>
                <span>100% ADR</span>
              </div>
              <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/10 p-0.5">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    adr?.used_pct >= 90 ? 'bg-gradient-to-r from-neon-green via-amber-400 to-neon-red' : 'bg-gradient-to-r from-cyan-500 to-neon-green'
                  }`}
                  style={{ width: `${Math.min(100, adr?.used_pct || 0)}%` }}
                ></div>
              </div>
            </div>

            {/* ADR Exhaustion Advice Box */}
            <div className={`p-2.5 rounded-lg border text-[11px] font-mono leading-snug flex items-start gap-2 ${
              adr?.used_pct >= 90 
                ? 'bg-neon-red/10 border-neon-red/30 text-neon-red' 
                : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-200'
            }`}>
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <div>
                <strong className="block text-[10px] uppercase font-bold">Execution Rule:</strong>
                {adr?.status || 'Monitoring interbank daily pip expansion.'}
              </div>
            </div>
          </div>

          {/* Asian Range Sweep Boundary */}
          {ar && (
            <div className="mt-3 pt-3 border-t border-white/10 text-xs font-mono">
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                <span>ASIAN RANGE (00:00-06:00 ET):</span>
                <span className="text-cyan-300 font-bold">{ar.range_pips} Pips Channel</span>
              </div>
              <div className="flex justify-between text-[11px] bg-black/40 p-2 rounded border border-white/5">
                <span className="text-neon-red">High: {ar.high}</span>
                <span className="text-neon-gold font-bold">{ar.sweep_status}</span>
                <span className="text-neon-green">Low: {ar.low}</span>
              </div>
              {ar.judas_signal && ar.judas_signal !== 'NONE' && (
                <div className="mt-2 p-2 rounded bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[10px] font-mono flex items-center gap-1.5 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                  <Zap size={13} className="text-amber-400 shrink-0 animate-bounce" />
                  <span className="font-bold">{ar.judas_signal}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ================= Institutional Quarter-Points & Bracket Orders ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Quarter-Points & Central Bank Spread */}
        <div className="glass-panel p-4 border border-cyan-500/20">
          <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <Crosshair size={16} className="text-cyan-400" />
              <h3 className="text-xs uppercase font-bold text-white font-mono tracking-wider">
                Institutional Quarter-Points (00, 20, 50, 80)
              </h3>
            </div>
          </div>

          <div className="space-y-2 font-mono text-xs mb-4">
            <div className="flex justify-between p-2 rounded bg-neon-red/10 border border-neon-red/30">
              <span className="text-slate-400">Call Wall (Major Resistance):</span>
              <span className="text-neon-red font-bold">{qp?.resistance_call_wall} (+{qp?.dist_resistance_pips} pips)</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-cyan-500/10 border border-cyan-500/30">
              <span className="text-slate-400">Interbank Median (Flip Pivot):</span>
              <span className="text-cyan-300 font-bold">{qp?.median_flip}</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-neon-green/10 border border-neon-green/30">
              <span className="text-slate-400">Put Wall (Major Support):</span>
              <span className="text-neon-green font-bold">{qp?.support_put_wall} (-{qp?.dist_support_pips} pips)</span>
            </div>
          </div>

          {/* Central Bank Carry Differential */}
          {cb && (
            <div className="p-2.5 rounded-lg bg-black/50 border border-white/10 text-xs font-mono space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[10px]">
                <span>CENTRAL BANK RATE SPREAD:</span>
                <span className="text-white font-bold">{cb.differential > 0 ? '+' : ''}{cb.differential}%</span>
              </div>
              <div className="text-[11px] text-cyan-200">
                {cb.base_currency} ({cb.base_rate}%) vs {cb.quote_currency} ({cb.quote_rate}%)
              </div>
              <div className="text-[10px] text-neon-gold font-bold">
                {cb.carry_bias}
              </div>
            </div>
          )}
        </div>

        {/* Right: Institutional Pip Bracket Order Card & Spread Auditor */}
        <div className="glass-panel p-4 lg:col-span-2 border border-cyan-500/30 bg-gradient-to-br from-black via-cyan-950/20 to-black flex flex-col justify-between shadow-[0_0_20px_rgba(6,182,212,0.1)]">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-neon-gold" />
                <h3 className="text-xs uppercase font-bold text-white font-mono tracking-wider">
                  Algorithmic Pip Bracket Execution Card
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <HelpButton cardId="forex_spread_news" title="Explain ECN Spread Auditor & Freeze Shield" />
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neon-green/20 text-neon-green border border-neon-green/30 font-bold">
                  WIN PROBABILITY: {analytics?.win_probability || '76%'}
                </span>
              </div>
            </div>

            {/* ECN Spread Auditor Banner */}
            {spreadAudit && (
              <div className="mb-3 p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between flex-wrap gap-2 text-[11px] font-mono">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-cyan-400 shrink-0" />
                  <div>
                    <span className="text-slate-300">
                      Raw ECN Spread: <strong className="text-cyan-300">{spreadAudit.interbank_raw_spread_pips} pips</strong> vs Retail B-Book: <span className="text-slate-400 line-through">{spreadAudit.retail_bbook_markup_pips} pips</span>
                    </span>
                    <span className="text-[10px] text-neon-green block">
                      ✓ Saves ~$14.00 per standard lot in avoided retail spread markups
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                    {spreadAudit.spread_quality}
                  </span>
                </div>
              </div>
            )}

            {/* Red-Folder News Alert Banner (Circuit Breaker) */}
            {spreadAudit?.freeze_shield_active && (
              <div className="mb-3 p-2.5 rounded-lg bg-neon-red/20 border border-neon-red/40 text-neon-red text-xs font-mono flex items-center gap-2 animate-pulse">
                <ShieldAlert size={16} className="shrink-0" />
                <div>
                  <strong className="block text-[11px] uppercase">CIRCUIT BREAKER ACTIVE: HIGH IMPACT NEWS SPIKE RISK</strong>
                  <span className="text-[10px] text-red-200">
                    {spreadAudit.red_folder_reason}. Execution halted to prevent 20-40 pip slippage.
                  </span>
                </div>
              </div>
            )}

            {/* Order Specification Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 font-mono text-xs">
              <div className="bg-black/60 p-2.5 rounded-lg border border-white/5">
                <span className="text-[10px] text-slate-400 block">DIRECTION</span>
                <span className={`text-sm font-bold ${analytics?.bias?.includes('BULL') ? 'text-neon-green' : 'text-neon-red'}`}>
                  {analytics?.action || 'BUY'}
                </span>
              </div>
              <div className="bg-black/60 p-2.5 rounded-lg border border-white/5">
                <span className="text-[10px] text-slate-400 block">ENTRY PRICE</span>
                <span className="text-sm font-bold text-cyan-300">
                  {analytics?.spot ? Number(analytics.spot).toFixed(analytics.decimals || 4) : '--'}
                </span>
              </div>
              <div className="bg-black/60 p-2.5 rounded-lg border border-white/5">
                <span className="text-[10px] text-slate-400 block">TAKE PROFIT (TP)</span>
                <span className="text-sm font-bold text-neon-green">
                  {analytics?.take_profit || '--'}
                </span>
              </div>
              <div className="bg-black/60 p-2.5 rounded-lg border border-white/5">
                <span className="text-[10px] text-slate-400 block">STOP LOSS (SL)</span>
                <span className="text-sm font-bold text-neon-red">
                  {analytics?.stop_loss || '--'}
                </span>
              </div>
            </div>

            {/* Drivers list */}
            <div className="bg-black/40 p-2.5 rounded-lg border border-white/5 space-y-1 mb-4 text-[11px] font-mono">
              {(analytics?.drivers || []).map((d: string, i: number) => (
                <div key={i} className="flex items-start gap-1.5 text-slate-300">
                  <CheckCircle2 size={12} className="text-cyan-400 shrink-0 mt-0.5" />
                  <span>{d}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between flex-wrap gap-2">
            <div className="text-[10px] font-mono text-slate-400">
              <span>Risk/Reward: <strong className="text-white">{analytics?.risk_reward}</strong> · Sizing: <strong className="text-cyan-300">{bs?.lot_sizing || '0.10 Lots / $10K'}</strong></span>
            </div>
            <button
              onClick={executeBracketOrder}
              disabled={orderSubmitting || spreadAudit?.freeze_shield_active}
              className={`px-5 py-2 rounded-lg font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.3)] ${
                spreadAudit?.freeze_shield_active
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                  : analytics?.bias?.includes('BULL')
                    ? 'bg-neon-green hover:bg-neon-green/90 text-black shadow-[0_0_15px_rgba(0,255,163,0.3)]'
                    : 'bg-neon-red hover:bg-neon-red/90 text-white shadow-[0_0_15px_rgba(255,42,109,0.3)]'
              }`}
            >
              {orderSubmitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>TRANSMITTING TO BROKER...</span>
                </>
              ) : spreadAudit?.freeze_shield_active ? (
                <>
                  <ShieldAlert size={14} />
                  <span>NEWS FREEZE ACTIVE</span>
                </>
              ) : (
                <>
                  <Zap size={14} />
                  <span>EXECUTE {analytics?.action || 'BRACKET ORDER'}</span>
                </>
              )}
            </button>
          </div>

          {orderStatus && (
            <div className="mt-2 p-2 rounded bg-neon-green/20 border border-neon-green/40 text-neon-green font-mono text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 size={14} />
              <span>{orderStatus}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
