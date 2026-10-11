import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Flame, RefreshCw, ExternalLink, Copy, Check, 
  ShieldCheck, Search, Zap, Eye, X
} from 'lucide-react';
import { API_BASE } from './config';

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
  category: 'MEME' | 'AI AGENT' | 'UTILITY';
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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  
  // Filters
  const [selectedChain, setSelectedChain] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [highVelocityOnly, setHighVelocityOnly] = useState<boolean>(false);
  const [minLiq, setMinLiq] = useState<number>(5000);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  // Modal / Preview state
  const [previewToken, setPreviewToken] = useState<GemToken | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const fetchGems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/crypto/gem-radar?chain=${selectedChain}&min_liquidity=${minLiq}`);
      const data = await res.json();
      if (data && data.gems) {
        setGems(data.gems);
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
  }, [gems, selectedChain, selectedCategory, highVelocityOnly, searchQuery]);

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
                EARLY GEM & MEME RADAR
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                24/7 ON-CHAIN
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              Autonomous On-Chain Screener · Volume Velocity, Smart Contract Audits & Holder Concentration
            </p>
          </div>
        </div>

        {/* View Toggle & Refresh */}
        <div className="flex items-center gap-2 text-xs font-mono ml-auto">
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
            { id: 'all', label: 'ALL TYPES' },
            { id: 'MEME', label: '🔥 MEMES' },
            { id: 'AI AGENT', label: '🤖 AI AGENTS' },
            { id: 'UTILITY', label: '⚙️ UTILITY' },
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
          {highVelocityOnly ? '🔥 >3x VELOCITY (ON)' : '⚡ VELOCITY FILTER'}
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
              Scanning 40,000+ DEX pools on Solana & Base for breakout momentum...
            </div>
          ) : filteredGems.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 font-mono italic">
              No gems found matching the active filters. Try lowering the liquidity threshold or resetting velocity filter.
            </div>
          ) : (
            filteredGems.map((g) => {
              const isHighVelocity = g.velocity >= 3.0;
              const isParabolic = g.velocity >= 10.0;
              return (
                <div
                  key={g.address}
                  className={`rounded-xl border p-3 flex flex-col justify-between transition-all duration-300 relative overflow-hidden group ${
                    isParabolic
                      ? 'bg-gradient-to-br from-amber-500/10 via-black/80 to-purple-950/20 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)] hover:border-amber-400'
                      : isHighVelocity
                      ? 'bg-black/60 border-neon-green/30 hover:border-neon-green/60 shadow-[0_0_10px_rgba(0,255,163,0.06)]'
                      : 'bg-black/40 border-white/10 hover:border-white/30'
                  }`}
                >
                  {/* Top Bar: Token Identity & Chain */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-bold text-xs text-white shrink-0 font-mono">
                          {g.symbol.slice(0, 3)}
                        </div>
                        <div className="overflow-hidden">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-white font-mono truncate">{g.symbol}</span>
                            <span className={`text-[8px] px-1 py-0.2 rounded font-bold uppercase tracking-wider shrink-0 ${
                              g.category === 'AI AGENT' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' :
                              g.category === 'UTILITY' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' :
                              'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}>
                              {g.category}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">{g.name}</div>
                        </div>
                      </div>

                      {/* Chain Badge */}
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 font-mono uppercase font-bold shrink-0">
                        {g.chain} · {g.dex}
                      </span>
                    </div>

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
                        <span className={`font-bold ${isParabolic ? 'text-neon-gold flex items-center gap-1' : isHighVelocity ? 'text-neon-green' : 'text-slate-300'}`}>
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

                    {/* 5m Buy Pressure & Safety Indicator */}
                    <div className="mb-2.5">
                      <div className="flex justify-between text-[9px] font-mono mb-0.5 text-slate-400">
                        <span>5M BUY FLOW: <strong className={g.buy_ratio_5m >= 60 ? 'text-neon-green' : 'text-slate-300'}>{g.buy_ratio_5m}%</strong></span>
                        <span className="text-slate-500">{g.buys_5m}B / {g.sells_5m}S</span>
                      </div>
                      <div className="h-1.5 w-full bg-neon-red/30 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-neon-green rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, Math.max(0, g.buy_ratio_5m))}%` }} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom: Safety Score, Age & Action Buttons */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
                    <div className="flex items-center gap-1">
                      <ShieldCheck size={12} className={g.safety_score >= 80 ? 'text-neon-green' : g.safety_score >= 60 ? 'text-neon-gold' : 'text-slate-500'} />
                      <span className={g.safety_score >= 80 ? 'text-neon-green font-bold' : 'text-slate-400'}>
                        {g.safety_score}/100
                      </span>
                      <span className="text-slate-600">· {g.age_hours < 1 ? `${Math.round(g.age_hours * 60)}m` : `${g.age_hours}h`}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Copy CA */}
                      <button
                        onClick={() => copyToClipboard(g.address)}
                        className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                        title="Copy Contract Address"
                      >
                        {copiedAddress === g.address ? <Check size={12} className="text-neon-green" /> : <Copy size={12} />}
                      </button>

                      {/* Interactive Preview Modal */}
                      <button
                        onClick={() => setPreviewToken(g)}
                        className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-slate-200 text-[10px] font-bold flex items-center gap-1"
                        title="Preview Live Chart"
                      >
                        <Eye size={10} /> Chart
                      </button>

                      {/* External DexScreener Link */}
                      {g.url && (
                        <a
                          href={g.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded hover:bg-white/10 text-amber-400 hover:text-amber-300 transition-colors"
                          title="Open on DexScreener"
                        >
                          <ExternalLink size={12} />
                        </a>
                      )}
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
                <th className="py-2.5 px-3">Token</th>
                <th className="py-2.5 px-2">Chain</th>
                <th className="py-2.5 px-2">Price</th>
                <th className="py-2.5 px-2">5m Chg</th>
                <th className="py-2.5 px-2">1h Chg</th>
                <th className="py-2.5 px-2">Velocity (V/L)</th>
                <th className="py-2.5 px-2">Liquidity</th>
                <th className="py-2.5 px-2">24h Vol</th>
                <th className="py-2.5 px-2">5m Buy Flow</th>
                <th className="py-2.5 px-2">Safety</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredGems.map((g) => (
                <tr key={g.address} className="hover:bg-white/[0.03] transition-colors">
                  <td className="py-2 px-3">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      {g.symbol}
                      <span className="text-[9px] px-1 py-0.2 rounded bg-white/10 text-slate-400">{g.category}</span>
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
                  <td className="py-2 px-2 text-white font-bold">{fmtCurrency(g.volume_24h)}</td>
                  <td className="py-2 px-2">
                    <span className={g.buy_ratio_5m >= 60 ? 'text-neon-green font-bold' : 'text-slate-300'}>
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
                        onClick={() => copyToClipboard(g.address)}
                        className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                        title="Copy CA"
                      >
                        {copiedAddress === g.address ? <Check size={12} className="text-neon-green" /> : <Copy size={12} />}
                      </button>
                      <button
                        onClick={() => setPreviewToken(g)}
                        className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] font-bold"
                      >
                        Chart
                      </button>
                      {g.url && (
                        <a href={g.url} target="_blank" rel="noopener noreferrer" className="p-1 hover:text-amber-300 text-amber-400">
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= Interactive Live Chart Modal Preview ================= */}
      {previewToken && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="glass-panel w-full max-w-5xl h-[85vh] flex flex-col border border-amber-500/40 bg-black/95 shadow-[0_0_40px_rgba(245,158,11,0.25)] rounded-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-amber-300 font-mono">
                  {previewToken.symbol.slice(0, 3)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg text-white font-mono">{previewToken.symbol}</h3>
                    <span className="text-xs text-slate-400 font-normal">({previewToken.name})</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-white/10 text-slate-300 border border-white/10">
                      {previewToken.chain} · {previewToken.dex}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                    <span>CA: {previewToken.address.slice(0, 8)}...{previewToken.address.slice(-6)}</span>
                    <button 
                      onClick={() => copyToClipboard(previewToken.address)} 
                      className="hover:text-white text-slate-400 flex items-center gap-1"
                    >
                      {copiedAddress === previewToken.address ? <Check size={11} className="text-neon-green" /> : <Copy size={11} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right font-mono hidden sm:block">
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

            {/* Embedded Live DexScreener Chart */}
            <div className="flex-1 bg-black w-full h-full relative">
              <iframe
                src={`https://dexscreener.com/${previewToken.chain}/${previewToken.address}?embed=1&theme=dark&trades=0&info=0`}
                title={`${previewToken.symbol} DexScreener Live Chart`}
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
