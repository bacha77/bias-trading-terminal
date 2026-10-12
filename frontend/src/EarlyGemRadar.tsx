import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Flame, RefreshCw, ExternalLink, Copy, Check, 
  ShieldCheck, ShieldAlert, Search, Zap, X, BookOpen,
  TrendingUp, DollarSign, Target, Award
} from 'lucide-react';
import { HelpButton } from './CardExplainerModal';
import { API_BASE } from './config';

export interface NarrativeSector {
  category: string;
  volume_share_pct: number;
  volume_24h: number;
  gem_count: number;
  avg_velocity: number;
  runner_count: number;
  top_token: string;
  trend: string;
}

export interface GemToken {
  symbol: string;
  name: string;
  address: string;
  chain: string;
  dex: string;
  price_usd: number;
  liquidity: number;
  volume_24h: number;
  volume_5m: number;
  fdv: number;
  age_hours: number;
  velocity: number;
  buys_5m: number;
  sells_5m: number;
  buy_ratio_5m: number;
  chg_5m: number;
  chg_1h: number;
  chg_24h: number;
  safety_score: number;
  url?: string;
  category: 'MEME' | 'AI AGENT' | 'DePIN / COMPUTE' | 'RWA' | 'UTILITY / L2' | string;
  verdict?: 'PARABOLIC' | 'PRIME_RUNNER' | 'DUMP_RISK' | 'ACCUMULATING' | 'NEUTRAL';
  verdict_label?: string;
  lifecycle_stage?: {
    stage: string;
    code: 'PHASE_1' | 'PHASE_2' | 'PHASE_3' | 'RISK_DUMP' | 'NEUTRAL';
    label: string;
    desc: string;
  };
  profit_ladder?: {
    tp1: number;
    tp2: number;
    tp3: number;
    sl: number;
    rr: string;
  };
  audit_url?: string;
  bubblemaps_url?: string;
}

const fmtCurrency = (val: number) => {
  if (!val || val === 0) return '$0';
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
  return `$${val.toFixed(2)}`;
};

const fmtPrice = (p: number) => {
  if (!p) return '$0.00';
  if (p < 0.00001) return `$${p.toExponential(2)}`;
  if (p < 0.01) return `$${p.toFixed(6)}`;
  if (p < 1) return `$${p.toFixed(4)}`;
  return `$${p.toFixed(2)}`;
};

export function EarlyGemRadar() {
  const [gems, setGems] = useState<GemToken[]>([]);
  const [narrativeDominance, setNarrativeDominance] = useState<NarrativeSector[]>([]);
  const [dominantNarrative, setDominantNarrative] = useState<string>('MEME');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  
  // Filters
  const [selectedChain, setSelectedChain] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [highVelocityOnly, setHighVelocityOnly] = useState<boolean>(false);
  const [runnerFilter, setRunnerFilter] = useState<'ALL' | 'RUNNERS_ONLY' | 'SAFE_ONLY'>('ALL');
  const [minLiq, setMinLiq] = useState<number>(5000);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  // Modal / Preview state
  const [previewToken, setPreviewToken] = useState<GemToken | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [showPlaybook, setShowPlaybook] = useState<boolean>(false);
  const [simPosition, setSimPosition] = useState<number>(500);

  const fetchGems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/crypto/gem-radar?chain=${selectedChain}&min_liquidity=${minLiq}`);
      const data = await res.json();
      if (data && data.gems) {
        setGems(data.gems);
        if (data.narrative_dominance) {
          setNarrativeDominance(data.narrative_dominance);
        }
        if (data.dominant_narrative) {
          setDominantNarrative(data.dominant_narrative);
        }
        setLastUpdated(data.timestamp || new Date().toLocaleTimeString());
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err: any) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [selectedChain, minLiq]);

  // Initial fetch and auto-refresh every 25 seconds
  useEffect(() => {
    fetchGems();
    const interval = setInterval(fetchGems, 25000);
    return () => clearInterval(interval);
  }, [fetchGems]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(text);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const filteredGems = useMemo(() => {
    return gems.filter((g) => {
      // Chain filter
      if (selectedChain !== 'all' && g.chain.toLowerCase() !== selectedChain.toLowerCase()) {
        return false;
      }
      // Category filter
      if (selectedCategory !== 'all' && g.category !== selectedCategory) {
        return false;
      }
      // Runner / Safe filter
      if (runnerFilter === 'RUNNERS_ONLY' && g.verdict !== 'PRIME_RUNNER' && g.verdict !== 'PARABOLIC') {
        return false;
      }
      if (runnerFilter === 'SAFE_ONLY' && g.safety_score < 90) {
        return false;
      }
      // High velocity toggle
      if (highVelocityOnly && g.velocity < 3.0) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSym = g.symbol.toLowerCase().includes(q);
        const matchesName = g.name.toLowerCase().includes(q);
        const matchesAddr = g.address.toLowerCase().includes(q);
        if (!matchesSym && !matchesName && !matchesAddr) return false;
      }
      return true;
    });
  }, [gems, selectedChain, selectedCategory, runnerFilter, highVelocityOnly, searchQuery]);

  return (
    <section className="glass-panel p-4 flex flex-col gap-4 border border-amber-500/30 bg-gradient-to-b from-black/80 to-[#070b14]/90 shadow-[0_0_30px_rgba(245,158,11,0.08)] rounded-xl mt-2">
      
      {/* ================= Header ================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
            <Flame size={18} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white font-mono flex items-center gap-1.5">
                EARLY GEM & NARRATIVE RADAR
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                24/7 ON-CHAIN
              </span>
              <HelpButton cardId="gemradar" title="Explain Early Gem & Meme Crypto Radar" />
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              Algorithmic Breakout Detection · Narrative Capital Rotation, Lifecycle Stages & Automated Profit-Taking Ladders
            </p>
          </div>
        </div>

        {/* View Toggle, Playbook & Refresh */}
        <div className="flex items-center gap-2 text-xs font-mono ml-auto">
          <button
            onClick={() => setShowPlaybook(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-purple-500/40 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 font-bold transition-all shadow-[0_0_10px_rgba(168,85,247,0.15)]"
            title="Open High-Probability Crypto Narrative Playbook"
          >
            <BookOpen size={12} className="text-purple-400" />
            <span className="text-[10px]">ALPHA PLAYBOOK</span>
          </button>

          <span className="text-slate-500 text-[10px] hidden sm:inline">Upd {lastUpdated || '--:--:--'}</span>
          <div className="flex bg-black/60 p-0.5 rounded border border-white/10">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2 py-1 rounded text-[10px] font-bold ${viewMode === 'grid' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-white'}`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-2 py-1 rounded text-[10px] font-bold ${viewMode === 'table' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-white'}`}
            >
              Table
            </button>
          </div>
          <button
            onClick={fetchGems}
            disabled={loading}
            className="flex items-center gap-1 px-2.5 py-1 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 font-bold transition-all"
            title="Scan DEX for latest breakout coins"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin text-amber-400' : ''} />
            <span className="text-[10px]">SCAN</span>
          </button>
        </div>
      </div>

      {/* ================= Narrative Sector Dominance Ribbon ================= */}
      {narrativeDominance.length > 0 && (
        <div className="bg-black/60 p-3 rounded-xl border border-white/10 flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-bold text-[11px] flex items-center gap-1">
                <TrendingUp size={13} /> NARRATIVE CAPITAL ROTATION:
              </span>
              <span className="text-[11px] text-slate-300">
                Hot Money is concentrating in <strong className="text-neon-green">{dominantNarrative}</strong> ({narrativeDominance[0]?.volume_share_pct}% flow)
              </span>
            </div>
            <span className="text-[10px] text-slate-400">Click a sector below to filter radar</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {narrativeDominance.map((sec) => {
              const isSelected = selectedCategory === sec.category;
              return (
                <button
                  key={sec.category}
                  onClick={() => setSelectedCategory(isSelected ? 'all' : sec.category)}
                  className={`p-2 rounded-lg border text-left font-mono transition-all duration-200 flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                      : 'bg-black/40 border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[11px] text-white truncate">{sec.category}</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-white/10 text-slate-300">{sec.trend}</span>
                  </div>
                  <div className="flex items-baseline justify-between text-[10px]">
                    <span className="text-slate-400">Share: <strong className={sec.volume_share_pct >= 30 ? 'text-neon-green' : 'text-white'}>{sec.volume_share_pct}%</strong></span>
                    <span className="text-slate-500 text-[9px]">{sec.gem_count} gems</span>
                  </div>
                  <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden mt-1.5">
                    <div 
                      className={`h-full ${sec.volume_share_pct >= 40 ? 'bg-neon-green' : sec.volume_share_pct >= 20 ? 'bg-amber-400' : 'bg-cyan-400'}`}
                      style={{ width: `${Math.min(100, sec.volume_share_pct)}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= Command / Filter Bar ================= */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
        {/* Chain Filters */}
        <div className="flex bg-black/50 p-0.5 rounded-lg border border-white/10 shrink-0">
          {[
            { id: 'all', label: '🌐 ALL' },
            { id: 'solana', label: '🚀 SOLANA' },
            { id: 'base', label: '🔵 BASE' },
            { id: 'ethereum', label: '🦄 ETH' },
            { id: 'bsc', label: '🟡 BSC' },
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedChain(c.id)}
              className={`px-2.5 py-1 text-[11px] rounded transition-all font-bold ${
                selectedChain === c.id
                  ? 'bg-amber-400 text-black shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Category Filters */}
        <div className="flex bg-black/50 p-0.5 rounded-lg border border-white/10 shrink-0">
          {[
            { id: 'all', label: 'ALL NARRATIVES' },
            { id: 'MEME', label: '🔥 MEMES' },
            { id: 'AI AGENT', label: '🤖 AI AGENTS' },
            { id: 'DePIN / COMPUTE', label: '⚡ DePIN / COMPUTE' },
            { id: 'RWA', label: '🏦 RWA' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 text-[11px] rounded transition-all font-bold ${
                selectedCategory === cat.id
                  ? 'bg-neon-green text-black shadow-[0_0_8px_rgba(0,255,163,0.3)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Signal Mode Filter */}
        <div className="flex bg-black/50 p-0.5 rounded-lg border border-white/10 shrink-0">
          <button
            onClick={() => setRunnerFilter('ALL')}
            className={`px-2 py-1 text-[10px] rounded font-bold ${runnerFilter === 'ALL' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            ALL SIGNALS
          </button>
          <button
            onClick={() => setRunnerFilter(runnerFilter === 'RUNNERS_ONLY' ? 'ALL' : 'RUNNERS_ONLY')}
            className={`px-2 py-1 text-[10px] rounded font-bold transition-all flex items-center gap-1 ${
              runnerFilter === 'RUNNERS_ONLY' ? 'bg-neon-green/20 text-neon-green border border-neon-green/40 shadow-[0_0_8px_rgba(0,255,163,0.2)]' : 'text-slate-400 hover:text-white'
            }`}
          >
            🚀 RUNNERS ONLY
          </button>
          <button
            onClick={() => setRunnerFilter(runnerFilter === 'SAFE_ONLY' ? 'ALL' : 'SAFE_ONLY')}
            className={`px-2 py-1 text-[10px] rounded font-bold transition-all flex items-center gap-1 ${
              runnerFilter === 'SAFE_ONLY' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            🛡️ 90+ SAFE
          </button>
        </div>

        {/* High Velocity Pill */}
        <button
          onClick={() => setHighVelocityOnly(!highVelocityOnly)}
          className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            highVelocityOnly
              ? 'bg-neon-red/20 border-neon-red text-neon-red shadow-[0_0_10px_rgba(255,42,109,0.3)]'
              : 'border-white/10 bg-black/40 text-slate-400 hover:border-white/20 hover:text-white'
          }`}
        >
          <Zap size={12} className={highVelocityOnly ? 'animate-bounce text-neon-red' : ''} />
          {highVelocityOnly ? '🔥 >3x VELOCITY (ON)' : '⚡ >3x VELOCITY'}
        </button>

        {/* Min Liquidity Selector */}
        <select
          value={minLiq}
          onChange={(e) => setMinLiq(Number(e.target.value))}
          className="bg-black/50 border border-white/10 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 font-mono outline-none focus:border-amber-400"
        >
          <option value={5000}>Min Liq: $5K+</option>
          <option value={15000}>Min Liq: $15K+</option>
          <option value={50000}>Min Liq: $50K+ (Safer)</option>
        </select>

        {/* Search Input */}
        <div className="relative ml-auto flex-1 min-w-[150px] max-w-[240px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search coin / CA..."
            className="w-full bg-black/50 border border-white/10 rounded-lg pl-8 pr-2 py-1 text-xs text-white font-mono outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* ================= Error Banner ================= */}
      {error && (
        <div className="p-3 bg-neon-red/10 border border-neon-red/40 rounded-lg text-neon-red text-xs font-mono flex items-center justify-between">
          <span>⚠ Failed to fetch on-chain radar: {error}</span>
          <button onClick={fetchGems} className="underline font-bold">Retry</button>
        </div>
      )}

      {/* ================= Token Grid View ================= */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {loading && gems.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 font-mono italic">
              Scanning 40,000+ DEX pools across Solana, Base, and RWA/DePIN for high-conviction breakout setups...
            </div>
          ) : filteredGems.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 font-mono italic">
              No gems found matching the active filters. Try resetting the runner filter or lowering the liquidity threshold.
            </div>
          ) : (
            filteredGems.map((g) => {
              const isParabolic = g.verdict === 'PARABOLIC';
              const isRunner = g.verdict === 'PRIME_RUNNER';
              const isDump = g.verdict === 'DUMP_RISK';
              const isAccum = g.verdict === 'ACCUMULATING';

              return (
                <div
                  key={g.address}
                  className={`rounded-xl border p-3 flex flex-col justify-between transition-all duration-300 relative overflow-hidden group ${
                    isParabolic
                      ? 'bg-gradient-to-br from-amber-500/10 via-black/80 to-purple-950/20 border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:border-amber-400'
                      : isRunner
                      ? 'bg-gradient-to-br from-neon-green/10 via-black/80 to-cyan-950/20 border-neon-green/50 shadow-[0_0_15px_rgba(0,255,163,0.12)] hover:border-neon-green'
                      : isDump
                      ? 'bg-black/50 border-neon-red/40 opacity-80 hover:opacity-100'
                      : 'bg-black/40 border-white/10 hover:border-white/30'
                  }`}
                >
                  <div>
                    {/* Top Automated Signal Verdict Banner */}
                    <div className="mb-2 flex items-center justify-between">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border flex items-center gap-1 uppercase tracking-wider ${
                        isParabolic ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.3)] animate-pulse' :
                        isRunner ? 'bg-neon-green/20 border-neon-green text-neon-green shadow-[0_0_8px_rgba(0,255,163,0.25)]' :
                        isDump ? 'bg-neon-red/20 border-neon-red/50 text-neon-red' :
                        isAccum ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' :
                        'bg-white/5 border-white/10 text-slate-400'
                      }`}>
                        {isParabolic && '🔥 PARABOLIC BREAKOUT'}
                        {isRunner && '🚀 PRIME RUNNER'}
                        {isDump && '⚠️ DUMP IN PROGRESS'}
                        {isAccum && '👀 ACCUMULATING'}
                        {!isParabolic && !isRunner && !isDump && !isAccum && '⚖️ CONSOLIDATING'}
                      </span>

                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 font-mono uppercase font-bold shrink-0">
                        {g.chain} · {g.dex}
                      </span>
                    </div>

                    {/* Token Identity */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-bold text-xs text-white shrink-0 font-mono">
                          {g.symbol.slice(0, 3)}
                        </div>
                        <div className="overflow-hidden">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-white font-mono truncate">{g.symbol}</span>
                            <span className={`text-[8px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider shrink-0 border ${
                              g.category === 'AI AGENT' ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' :
                              g.category === 'DePIN / COMPUTE' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' :
                              g.category === 'RWA' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                              'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            }`}>
                              {g.category}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">{g.name}</div>
                        </div>
                      </div>
                    </div>

                    {/* Lifecycle Stage Badge */}
                    {g.lifecycle_stage && (
                      <div className="mb-2 px-2 py-1 rounded-md bg-white/[0.03] border border-white/5 flex items-center justify-between text-[9px] font-mono">
                        <span className="text-slate-400">LIFECYCLE:</span>
                        <span className={`font-bold ${
                          g.lifecycle_stage.code === 'PHASE_2' ? 'text-neon-green' :
                          g.lifecycle_stage.code === 'PHASE_1' ? 'text-cyan-300' :
                          g.lifecycle_stage.code === 'PHASE_3' ? 'text-amber-400' :
                          'text-neon-red'
                        }`}>
                          {g.lifecycle_stage.label}
                        </span>
                      </div>
                    )}

                    {/* Price & 5m / 1h Returns */}
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-base font-bold font-mono text-white tracking-wide">
                        {fmtPrice(g.price_usd)}
                      </span>
                      <div className="flex gap-1.5 text-[10px] font-mono font-bold">
                        <span className={g.chg_5m >= 0 ? 'text-neon-green' : 'text-neon-red'}>
                          5m: {g.chg_5m >= 0 ? '+' : ''}{g.chg_5m.toFixed(1)}%
                        </span>
                        <span className={g.chg_1h >= 0 ? 'text-neon-green' : 'text-neon-red'}>
                          1h: {g.chg_1h >= 0 ? '+' : ''}{g.chg_1h.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Core Quant Metrics Strip */}
                    <div className="grid grid-cols-2 gap-1.5 p-2 rounded-lg bg-black/40 border border-white/5 text-[10px] font-mono mb-2.5">
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase">VELOCITY (V/L)</span>
                        <span className={`font-bold ${isParabolic ? 'text-neon-gold flex items-center gap-1' : isRunner ? 'text-neon-green' : 'text-slate-300'}`}>
                          {g.velocity.toFixed(1)}x {isParabolic && '🔥'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase">LIQUIDITY</span>
                        <span className="font-bold text-white">{fmtCurrency(g.liquidity)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase">24H VOLUME</span>
                        <span className="font-bold text-white">{fmtCurrency(g.volume_24h)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase">FDV / MCAP</span>
                        <span className="font-bold text-slate-300">{fmtCurrency(g.fdv)}</span>
                      </div>
                    </div>

                    {/* 5m Buy Pressure Progress Bar */}
                    <div className="mb-2.5">
                      <div className="flex justify-between text-[9px] font-mono mb-0.5 text-slate-400">
                        <span>5M BUY FLOW: <strong className={g.buy_ratio_5m >= 60 ? 'text-neon-green' : isDump ? 'text-neon-red' : 'text-slate-300'}>{g.buy_ratio_5m}%</strong></span>
                        <span className="text-slate-500">{g.buys_5m}B / {g.sells_5m}S</span>
                      </div>
                      <div className="h-1.5 w-full bg-neon-red/40 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            g.buy_ratio_5m >= 65 ? 'bg-neon-green shadow-[0_0_6px_#00ffa3]' :
                            g.buy_ratio_5m >= 45 ? 'bg-cyan-400' : 'bg-neon-red'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, g.buy_ratio_5m))}%` }} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom: Safety Score, Age & 1-Click Action Suite */}
                  <div className="pt-2 border-t border-white/5 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <div className="flex items-center gap-1">
                        {g.safety_score >= 80 ? (
                          <ShieldCheck size={12} className="text-neon-green" />
                        ) : (
                          <ShieldAlert size={12} className="text-neon-gold" />
                        )}
                        <span className={g.safety_score >= 80 ? 'text-neon-green font-bold' : 'text-slate-400'}>
                          {g.safety_score}/100
                        </span>
                        <span className="text-slate-600">· {g.age_hours < 1 ? `${Math.round(g.age_hours * 60)}m` : `${g.age_hours}h`}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* 1-Click RugCheck / TokenSniffer */}
                        {g.audit_url && (
                          <a
                            href={g.audit_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-1.5 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold flex items-center gap-0.5 transition-colors"
                            title="Verify Mint, Freeze & LP Lock Audit"
                          >
                            🛡️ Audit
                          </a>
                        )}

                        {/* 1-Click BubbleMaps Cluster */}
                        {g.bubblemaps_url && (
                          <a
                            href={g.bubblemaps_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-1.5 py-0.5 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-bold flex items-center gap-0.5 transition-colors"
                            title="Inspect Top Holder Clusters"
                          >
                            🫧 Bubbles
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Row */}
                    <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-white/5">
                      <button
                        onClick={() => copyToClipboard(g.address)}
                        className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
                        title="Copy Contract Address"
                      >
                        {copiedAddress === g.address ? <Check size={11} className="text-neon-green" /> : <Copy size={11} />}
                        <span className="text-[9px]">{copiedAddress === g.address ? 'Copied' : `${g.address.slice(0, 4)}...${g.address.slice(-3)}`}</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setPreviewToken(g)}
                          className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold flex items-center gap-1 border border-amber-500/30 transition-all"
                        >
                          <Target size={11} /> Plan Trade
                        </button>
                        {g.url && (
                          <a
                            href={g.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                            title="Open DexScreener"
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ================= Table View ================= */}
      {viewMode === 'table' && (
        <div className="overflow-x-auto rounded-lg border border-white/10 bg-black/40">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-white/5 border-b border-white/10 text-[10px] text-slate-400 uppercase">
              <tr>
                <th className="py-2.5 px-3">Signal</th>
                <th className="py-2.5 px-2">Lifecycle</th>
                <th className="py-2.5 px-2">Token</th>
                <th className="py-2.5 px-2">Chain</th>
                <th className="py-2.5 px-2">Price</th>
                <th className="py-2.5 px-2">5m Chg</th>
                <th className="py-2.5 px-2">1h Chg</th>
                <th className="py-2.5 px-2">Velocity</th>
                <th className="py-2.5 px-2">Liquidity</th>
                <th className="py-2.5 px-2">5m Buy Flow</th>
                <th className="py-2.5 px-2">Safety</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredGems.map((g) => {
                const isParabolic = g.verdict === 'PARABOLIC';
                const isRunner = g.verdict === 'PRIME_RUNNER';
                const isDump = g.verdict === 'DUMP_RISK';
                return (
                  <tr key={g.address} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-2 px-3">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                        isParabolic ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                        isRunner ? 'bg-neon-green/20 text-neon-green border-neon-green/40' :
                        isDump ? 'bg-neon-red/20 text-neon-red border-neon-red/40' :
                        'bg-white/5 text-slate-400 border-white/10'
                      }`}>
                        {isParabolic && '🔥 PARABOLIC'}
                        {isRunner && '🚀 RUNNER'}
                        {isDump && '⚠️ DUMP'}
                        {!isParabolic && !isRunner && !isDump && '⚖️ CHOP'}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <span className={`text-[9px] font-bold ${
                        g.lifecycle_stage?.code === 'PHASE_2' ? 'text-neon-green' :
                        g.lifecycle_stage?.code === 'PHASE_1' ? 'text-cyan-300' :
                        g.lifecycle_stage?.code === 'PHASE_3' ? 'text-amber-400' :
                        'text-slate-400'
                      }`}>
                        {g.lifecycle_stage?.label || 'Neutral'}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        {g.symbol}
                        <span className="text-[8px] px-1 py-0.2 rounded bg-white/10 text-slate-400">{g.category}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[120px]">{g.name}</div>
                    </td>
                    <td className="py-2 px-2 uppercase text-[10px] text-slate-300 font-bold">{g.chain}</td>
                    <td className="py-2 px-2 font-bold text-white">{fmtPrice(g.price_usd)}</td>
                    <td className={`py-2 px-2 font-bold ${g.chg_5m >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                      {g.chg_5m >= 0 ? '+' : ''}{g.chg_5m.toFixed(1)}%
                    </td>
                    <td className={`py-2 px-2 font-bold ${g.chg_1h >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                      {g.chg_1h >= 0 ? '+' : ''}{g.chg_1h.toFixed(1)}%
                    </td>
                    <td className={`py-2 px-2 font-bold ${g.velocity >= 3.0 ? 'text-neon-gold' : 'text-slate-300'}`}>
                      {g.velocity.toFixed(1)}x
                    </td>
                    <td className="py-2 px-2 text-slate-300">{fmtCurrency(g.liquidity)}</td>
                    <td className="py-2 px-2">
                      <span className={g.buy_ratio_5m >= 60 ? 'text-neon-green font-bold' : isDump ? 'text-neon-red font-bold' : 'text-slate-300'}>
                        {g.buy_ratio_5m}%
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${g.safety_score >= 80 ? 'bg-neon-green/20 text-neon-green border border-neon-green/30' : 'bg-white/10 text-slate-300'}`}>
                        {g.safety_score}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPreviewToken(g)}
                          className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold flex items-center gap-1 border border-amber-500/30"
                        >
                          <Target size={10} /> Plan
                        </button>
                        {g.url && (
                          <a href={g.url} target="_blank" rel="noopener noreferrer" className="p-1 hover:text-amber-300 text-amber-400">
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= Interactive Live Chart & Profit-Ladder Modal ================= */}
      {previewToken && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
          <div className="glass-panel w-full max-w-6xl h-[90vh] flex flex-col border border-amber-500/40 bg-[#070b14] shadow-[0_0_50px_rgba(245,158,11,0.25)] rounded-2xl overflow-hidden">
            {/* Modal Top Header */}
            <div className="p-3 sm:p-4 border-b border-white/10 flex items-center justify-between bg-black/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-amber-300 font-mono text-sm">
                  {previewToken.symbol.slice(0, 3)}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-lg text-white font-mono">{previewToken.symbol}</h3>
                    <span className="text-xs text-slate-400 font-normal">({previewToken.name})</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-white/10 text-slate-300 border border-white/10">
                      {previewToken.chain} · {previewToken.dex}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      {previewToken.category}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      previewToken.verdict === 'PRIME_RUNNER' ? 'bg-neon-green/20 text-neon-green border-neon-green/40' :
                      previewToken.verdict === 'PARABOLIC' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                      previewToken.verdict === 'DUMP_RISK' ? 'bg-neon-red/20 text-neon-red border-neon-red/40' :
                      'bg-white/10 text-slate-300 border-white/10'
                    }`}>
                      {previewToken.verdict_label}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400 mt-0.5">
                    <span>CA: {previewToken.address.slice(0, 8)}...{previewToken.address.slice(-6)}</span>
                    <button 
                      onClick={() => copyToClipboard(previewToken.address)} 
                      className="hover:text-white text-slate-400 flex items-center gap-1"
                    >
                      {copiedAddress === previewToken.address ? <Check size={11} className="text-neon-green" /> : <Copy size={11} />}
                    </button>
                    {previewToken.audit_url && (
                      <a href={previewToken.audit_url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline flex items-center gap-0.5">
                        🛡️ RugCheck <ExternalLink size={10} />
                      </a>
                    )}
                    {previewToken.bubblemaps_url && (
                      <a href={previewToken.bubblemaps_url} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline flex items-center gap-0.5">
                        🫧 BubbleMaps <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right font-mono hidden md:block">
                  <div className="text-base font-bold text-white">{fmtPrice(previewToken.price_usd)}</div>
                  <div className="text-[11px] text-slate-400">
                    Liq: <strong className="text-white">{fmtCurrency(previewToken.liquidity)}</strong> · 
                    Vol: <strong className="text-white">{fmtCurrency(previewToken.volume_24h)}</strong>
                  </div>
                </div>
                {previewToken.url && (
                  <a
                    href={previewToken.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 text-xs font-mono font-bold flex items-center gap-1.5"
                  >
                    DexScreener <ExternalLink size={12} />
                  </a>
                )}
                <button
                  onClick={() => setPreviewToken(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body: Split Live Chart + Quant Profit-Ladder Execution Card */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-black">
              {/* Left / Top: Live Embedded DexScreener Chart */}
              <div className="flex-1 h-[45vh] lg:h-full bg-black relative border-b lg:border-b-0 lg:border-r border-white/10">
                <iframe
                  src={`https://dexscreener.com/${previewToken.chain}/${previewToken.address}?embed=1&theme=dark&trades=0&info=0`}
                  title={`${previewToken.symbol} DexScreener Live Chart`}
                  className="w-full h-full border-0"
                />
              </div>

              {/* Right: Institutional Profit-Ladder & Trade Plan Panel */}
              <div className="w-full lg:w-[380px] p-4 flex flex-col gap-3 overflow-y-auto bg-[#0a0f1d] border-l border-white/5 font-mono text-xs">
                
                {/* Lifecycle Stage Header */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>NARRATIVE LIFECYCLE STAGE</span>
                    <span className="text-amber-400 font-bold">STAGE {previewToken.lifecycle_stage?.code === 'PHASE_1' ? '1/4' : previewToken.lifecycle_stage?.code === 'PHASE_2' ? '2/4' : previewToken.lifecycle_stage?.code === 'PHASE_3' ? '3/4' : 'RISK'}</span>
                  </div>
                  <div className={`font-bold text-sm ${
                    previewToken.lifecycle_stage?.code === 'PHASE_2' ? 'text-neon-green' :
                    previewToken.lifecycle_stage?.code === 'PHASE_1' ? 'text-cyan-300' :
                    previewToken.lifecycle_stage?.code === 'PHASE_3' ? 'text-amber-400' :
                    'text-neon-red'
                  }`}>
                    {previewToken.lifecycle_stage?.label}
                  </div>
                  <p className="text-[11px] text-slate-300 font-sans mt-1">
                    {previewToken.lifecycle_stage?.desc}
                  </p>
                </div>

                {/* Automated Profit Ladder (The Anti-Roundtrip Rule) */}
                <div className="p-3 rounded-xl bg-black/60 border border-amber-500/30 flex flex-col gap-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                    <span className="text-amber-400 font-bold flex items-center gap-1 text-[11px]">
                      <Target size={13} /> PROFIT-TAKING LADDER
                    </span>
                    <span className="text-[10px] text-slate-400">R:R {previewToken.profit_ladder?.rr || '3.5 : 1'}</span>
                  </div>

                  {/* Entry */}
                  <div className="flex items-center justify-between p-2 rounded bg-white/[0.03]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">CURRENT ENTRY</span>
                      <span className="font-bold text-white text-xs">{fmtPrice(previewToken.price_usd)}</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300">Market Price</span>
                  </div>

                  {/* TP 1: 2x Take Out Principal */}
                  <div className="flex items-center justify-between p-2 rounded bg-emerald-500/10 border border-emerald-500/30">
                    <div>
                      <span className="text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                        🎯 TP 1: 2.0x (+100%)
                      </span>
                      <span className="font-bold text-white text-xs">{fmtPrice(previewToken.profit_ladder?.tp1 || previewToken.price_usd * 2)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-bold text-emerald-300 block">SELL 50%</span>
                      <span className="text-[8px] text-slate-400">100% Principal Out</span>
                    </div>
                  </div>

                  {/* TP 2: 3.5x Profit Harvest */}
                  <div className="flex items-center justify-between p-2 rounded bg-cyan-500/10 border border-cyan-500/30">
                    <div>
                      <span className="text-cyan-400 font-bold text-[10px] flex items-center gap-1">
                        🎯 TP 2: 3.5x (+250%)
                      </span>
                      <span className="font-bold text-white text-xs">{fmtPrice(previewToken.profit_ladder?.tp2 || previewToken.price_usd * 3.5)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-bold text-cyan-300 block">SELL 25%</span>
                      <span className="text-[8px] text-slate-400">Bank Pure Profit</span>
                    </div>
                  </div>

                  {/* TP 3: 5.0x Moonbag */}
                  <div className="flex items-center justify-between p-2 rounded bg-purple-500/10 border border-purple-500/30">
                    <div>
                      <span className="text-purple-400 font-bold text-[10px] flex items-center gap-1">
                        🚀 TP 3: 5.0x (+400%)
                      </span>
                      <span className="font-bold text-white text-xs">{fmtPrice(previewToken.profit_ladder?.tp3 || previewToken.price_usd * 5)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-bold text-purple-300 block">RIDE MOONBAG (25%)</span>
                      <span className="text-[8px] text-slate-400">Trail 1h swing low</span>
                    </div>
                  </div>

                  {/* Stop Loss Floor */}
                  <div className="flex items-center justify-between p-2 rounded bg-neon-red/10 border border-neon-red/30">
                    <div>
                      <span className="text-neon-red font-bold text-[10px]">🛑 INVALIDATION FLOOR (-25%)</span>
                      <span className="font-bold text-white text-xs">{fmtPrice(previewToken.profit_ladder?.sl || previewToken.price_usd * 0.75)}</span>
                    </div>
                    <span className="text-[9px] text-neon-red font-bold">Hard Cut</span>
                  </div>
                </div>

                {/* Interactive Position Payout Simulator */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                      <DollarSign size={13} className="text-neon-green" /> PAYOUT SIMULATOR
                    </span>
                    <div className="flex gap-1">
                      {[100, 250, 500, 1000].map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setSimPosition(amt)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            simPosition === amt ? 'bg-neon-green text-black' : 'bg-white/10 text-slate-300 hover:text-white'
                          }`}
                        >
                          ${amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                    <div className="p-1.5 rounded bg-black/40 border border-white/5">
                      <span className="text-slate-500 block text-[9px]">AT 2.0x (TP 1)</span>
                      <span className="font-bold text-emerald-400">+${simPosition.toFixed(0)}</span>
                      <span className="text-[8px] text-slate-400 block">(Full principal returned)</span>
                    </div>
                    <div className="p-1.5 rounded bg-black/40 border border-white/5">
                      <span className="text-slate-500 block text-[9px]">AT 3.5x (TP 2)</span>
                      <span className="font-bold text-cyan-400">+${(simPosition * 0.875).toFixed(0)}</span>
                      <span className="text-[8px] text-slate-400 block">(Net profit harvested)</span>
                    </div>
                    <div className="col-span-2 p-1.5 rounded bg-black/40 border border-white/5 flex items-center justify-between">
                      <div>
                        <span className="text-slate-500 block text-[9px]">TOTAL ESTIMATED VALUE AT TP3:</span>
                        <span className="font-bold text-neon-green text-xs">${(simPosition * 3.25).toFixed(0)} Net Return</span>
                      </div>
                      <span className="text-[9px] px-2 py-1 rounded bg-neon-green/20 text-neon-green font-bold">
                        +{((3.25 - 1) * 100).toFixed(0)}% ROI
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= Strategic Alpha Playbook Modal ================= */}
      {showPlaybook && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="glass-panel w-full max-w-3xl flex flex-col border border-purple-500/40 bg-[#070b14] shadow-[0_0_50px_rgba(168,85,247,0.25)] rounded-2xl overflow-hidden max-h-[90vh]">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/50 flex items-center justify-center text-purple-400">
                  <Award size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white font-mono flex items-center gap-2">
                    CRYPTO NARRATIVE ALPHA PLAYBOOK
                  </h3>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Institutional Rules for Asymmetric On-Chain Breakouts & Zero-Loss Capital Protection
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPlaybook(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 overflow-y-auto text-xs font-mono text-slate-300">
              {/* Step 1 */}
              <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30">
                <div className="flex items-center gap-2 font-bold text-sm text-purple-300 mb-1">
                  <span>1. THE BARBELL PORTFOLIO RULE (PRESERVE PRINCIPAL)</span>
                </div>
                <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                  Never risk your entire balance on microcap tokens. Hold <strong>70%–80%</strong> of your portfolio in core reserves (SOL, BTC, USDC). Allocate only <strong>20%–30%</strong> into a diversified basket of 5 to 10 narrative runners (2% to 3% per coin). One 10x carry covers all small losses.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-300 mb-1">
                  <span>2. THE 4-FILTER ENTRY CHECKLIST (NEVER BUY WITHOUT ALL 4)</span>
                </div>
                <ul className="text-[11px] text-slate-300 font-sans space-y-1.5 list-disc pl-4 mt-2">
                  <li><strong>Velocity Multiplier $\ge 3.0x$:</strong> 24h volume must be at least 3× liquidity pool size (proves active capital turnover).</li>
                  <li><strong>5-Minute Buy Pressure $\ge 60\%$:</strong> Buys must strongly outnumber sells on live ticks.</li>
                  <li><strong>Safety Score $\ge 70$ & Audit Passed:</strong> Mint authority revoked, freeze disabled, LP burned or locked {'>'}90%.</li>
                  <li><strong>Holder Distribution Clean:</strong> Check Bubblemaps — top 10 holders must own under 20%–25% of supply to avoid insider dumps.</li>
                </ul>
              </div>

              {/* Step 3 */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-center gap-2 font-bold text-sm text-amber-300 mb-1">
                  <span>3. THE ANTI-ROUNDTRIP PROFIT FORMULA (HOW TO NEVER LOSE GAINS)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                  <div className="p-2 rounded bg-black/40 border border-white/10">
                    <strong className="text-emerald-400 block text-xs">AT 2.0x (+100%)</strong>
                    <span className="text-[11px] text-slate-300">Sell 50% immediately. Your original investment is back in USDC. Position is now 100% risk-free.</span>
                  </div>
                  <div className="p-2 rounded bg-black/40 border border-white/10">
                    <strong className="text-cyan-400 block text-xs">AT 3.5x (+250%)</strong>
                    <span className="text-[11px] text-slate-300">Sell 25% to lock in real cash profits.</span>
                  </div>
                  <div className="p-2 rounded bg-black/40 border border-white/10">
                    <strong className="text-purple-400 block text-xs">AT 5.0x+ (MOONBAG)</strong>
                    <span className="text-[11px] text-slate-300">Let the remaining 25% ride with a trailing stop under the 1-hour swing low.</span>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                <div className="flex items-center gap-2 font-bold text-sm text-cyan-300 mb-1">
                  <span>4. NARRATIVE LIFECYCLES: ROTATE BEFORE THE DUMP</span>
                </div>
                <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                  Crypto narratives last 2 to 6 weeks. When a token reaches <strong>Phase 3 (Retail Euphoria / Tier-1 CEX Listings)</strong>, smart money sells to late buyers. Never "marry" a narrative coin. Take your profits and rotate into the next emerging sector shown in the Narrative Dominance Ribbon.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}

