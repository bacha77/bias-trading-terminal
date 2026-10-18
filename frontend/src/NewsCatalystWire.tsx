import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Radio, Zap, Flame, ExternalLink, RefreshCw,
  TrendingUp, TrendingDown, Minus, ArrowRight, ShieldAlert,
  Sparkles, Crosshair, Info, ArrowDown, ArrowUp
} from 'lucide-react';
import { API_BASE } from './config';
import { HelpButton } from './CardExplainerModal';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface NewsCatalystWireProps {
  currentTicker: string;
  onSelectTicker: (ticker: string) => void;
}

export function NewsCatalystWire({ currentTicker, onSelectTicker }: NewsCatalystWireProps) {
  const [wireScope, setWireScope] = useState<'ACTIVE' | 'ALL'>('ACTIVE');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [criticalOnly, setCriticalOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [articles, setArticles] = useState<any[]>([]);
  const [tickerImpact, setTickerImpact] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  const feedRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (feedRef.current) {
      feedRef.current.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  const scrollToTop = () => {
    if (feedRef.current) {
      feedRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const fetchNews = useCallback(async () => {
    setLoading(true);
    try {
      const tickerParam = wireScope === 'ACTIVE' ? currentTicker : 'ALL';
      const [feedRes, impactRes] = await Promise.all([
        fetch(`${API_BASE}/api/news/catalysts?ticker=${encodeURIComponent(tickerParam)}&limit=30`),
        fetch(`${API_BASE}/api/news/ticker-impact?ticker=${encodeURIComponent(currentTicker)}`)
      ]);

      if (feedRes.ok) {
        const feedData = await feedRes.json();
        setArticles(feedData.articles || []);
      }
      if (impactRes.ok) {
        const impactData = await impactRes.json();
        setTickerImpact(impactData);
      }
      const d = new Date();
      setLastRefreshed(d.toTimeString().split(' ')[0]);
    } catch (err) {
      console.error('Error fetching news catalysts:', err);
    } finally {
      setLoading(false);
    }
  }, [wireScope, currentTicker]);

  useEffect(() => {
    fetchNews();
    const iv = setInterval(fetchNews, 25000); // 25s institutional refresh
    return () => clearInterval(iv);
  }, [fetchNews]);

  // Filtered Articles
  const filteredArticles = useMemo(() => {
    return articles.filter((art) => {
      if (criticalOnly && art.impact_rating !== 'CRITICAL') {
        return false;
      }
      if (categoryFilter !== 'ALL' && art.category !== categoryFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesHeadline = art.headline.toLowerCase().includes(q);
        const matchesSummary = art.summary.toLowerCase().includes(q);
        const matchesSymbols = (art.primary_targets || []).some((p: any) => p.ticker.toLowerCase().includes(q)) ||
                               (art.infected_stocks || []).some((i: any) => i.ticker.toLowerCase().includes(q));
        if (!matchesHeadline && !matchesSummary && !matchesSymbols) {
          return false;
        }
      }
      return true;
    });
  }, [articles, criticalOnly, categoryFilter, searchQuery]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#070b14] border border-[#1a2333] rounded-xl overflow-hidden shadow-2xl font-mono text-xs">
      {/* ── Top Header Bar ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between p-3.5 bg-[#0b1220]/90 border-b border-[#1a2333] gap-2.5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <Radio size={16} className="text-emerald-400 animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-white tracking-wider text-sm flex items-center gap-1">
                INSTITUTIONAL NEWS WIRE
              </span>
              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                LIVE
              </span>
              <HelpButton cardId="newsWire" />
            </div>
            <p className="text-[10px] text-gray-400 font-sans">
              Market-moving catalysts, financial NLP & contagion domino modeling
            </p>
          </div>
        </div>

        {/* Ticker Scope Toggle & Controls */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-[#070b14] p-0.5 rounded-lg border border-[#1e293b]">
            <button
              onClick={() => setWireScope('ACTIVE')}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                wireScope === 'ACTIVE'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
              title={`Show news strictly relevant to ${currentTicker}`}
            >
              <Crosshair size={11} />
              ${currentTicker} ONLY
            </button>
            <button
              onClick={() => setWireScope('ALL')}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                wireScope === 'ALL'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Global real-time market wire"
            >
              <Flame size={11} />
              ALL MARKET
            </button>
          </div>

          <button
            onClick={fetchNews}
            disabled={loading}
            className="p-1.5 rounded-lg bg-[#0e1726] border border-[#1e293b] text-gray-300 hover:text-white hover:bg-[#131f33] transition-all disabled:opacity-50"
            title="Refresh news feed"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin text-emerald-400' : ''} />
          </button>
        </div>
      </div>

      {/* ── Active Ticker Catalyst Impact Header Strip ─────────────── */}
      {tickerImpact && (
        <div className="p-3 bg-gradient-to-r from-[#0b1426] via-[#09101f] to-[#0b1426] border-b border-[#1a2333] flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-white font-bold text-xs">
                ${tickerImpact.ticker} CATALYST BIAS:
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-extrabold flex items-center gap-1 ${
                  tickerImpact.overall_bias === 'BULLISH'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : tickerImpact.overall_bias === 'BEARISH'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}
              >
                {tickerImpact.overall_bias === 'BULLISH' && <TrendingUp size={12} />}
                {tickerImpact.overall_bias === 'BEARISH' && <TrendingDown size={12} />}
                {tickerImpact.overall_bias === 'NEUTRAL' && <Minus size={12} />}
                {tickerImpact.overall_bias} ({tickerImpact.conviction_pct}%)
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-gray-400">
              <span>{tickerImpact.articles_count} catalysts parsed</span>
              <span>·</span>
              <span className="text-emerald-400/90 font-mono">
                synced {lastRefreshed || 'live'}
              </span>
            </div>
          </div>

          {/* Quick Infected Domino Ticker Pills */}
          {tickerImpact.infected_domino_stocks && tickerImpact.infected_domino_stocks.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              <span className="text-[10px] text-gray-400 font-bold flex items-center gap-0.5">
                <Zap size={10} className="text-amber-400" />
                INFECTED PEERS:
              </span>
              {tickerImpact.infected_domino_stocks.slice(0, 5).map((inf: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => onSelectTicker(inf.ticker)}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all flex items-center gap-1 hover:scale-105 ${
                    inf.bias === 'BULLISH'
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 hover:border-emerald-400'
                      : 'bg-rose-950/40 border-rose-500/30 text-rose-300 hover:border-rose-400'
                  }`}
                  title={`${inf.relationship}: ${inf.rationale} (Click to trade ${inf.ticker})`}
                >
                  <span>${inf.ticker}</span>
                  <span className="text-[8px] opacity-75">
                    {inf.bias === 'BULLISH' ? '▲' : '▼'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Filter Pills & Search Bar ──────────────────────────────── */}
      <div className="px-3 py-2 bg-[#080d18] border-b border-[#162030] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => { setCriticalOnly(!criticalOnly); }}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all border flex items-center gap-1 ${
              criticalOnly
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 animate-pulse'
                : 'bg-[#0f172a] border-[#1e293b] text-gray-400 hover:text-white'
            }`}
          >
            <ShieldAlert size={10} className={criticalOnly ? 'text-rose-400' : ''} />
            CRITICAL ONLY
          </button>

          {['ALL', 'MACRO', 'EARNINGS', 'UPGRADE_DOWNGRADE', 'M_AND_A', 'REGULATORY'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all border ${
                categoryFilter === cat
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-[#0f172a] border-[#1e293b] text-gray-400 hover:text-gray-200'
              }`}
            >
              {cat === 'UPGRADE_DOWNGRADE' ? 'UPGRADES' : cat.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <input
            type="text"
            placeholder="Filter keyword / ticker..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#0b1220] border border-[#1e293b] rounded px-2 py-0.5 text-[11px] text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 w-36"
          />
          <button
            onClick={scrollToTop}
            title="Scroll to top of news wire"
            className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-emerald-500/20 text-[10px] text-gray-400 hover:text-emerald-300 border border-white/10 transition-all flex items-center gap-0.5 cursor-pointer"
          >
            <ArrowUp size={10} /> Top
          </button>
          <button
            onClick={scrollToBottom}
            title="Scroll all the way down to bottom of news wire"
            className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-emerald-500/20 text-[10px] text-gray-400 hover:text-emerald-300 border border-white/10 transition-all flex items-center gap-0.5 cursor-pointer"
          >
            <ArrowDown size={10} /> Bottom
          </button>
        </div>
      </div>

      {/* ── Feed Container / Articles List ──────────────────────────── */}
      <div ref={feedRef} className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {loading && articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
            <RefreshCw size={24} className="animate-spin text-emerald-400" />
            <p className="text-xs">Parsing real-time market wires & catalyst attribution...</p>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-500 border border-dashed border-[#1e293b] rounded-xl p-4">
            <Info size={20} className="mb-1 text-gray-400" />
            <p className="text-xs font-bold text-gray-400">No breaking catalysts match current filter</p>
            <p className="text-[10px] text-gray-500">Switch to "ALL MARKET" or reset category filters</p>
          </div>
        ) : (
          filteredArticles.map((art) => {
            const isCritical = art.impact_rating === 'CRITICAL';
            const isHigh = art.impact_rating === 'HIGH';
            const isBull = art.sentiment === 'BULLISH';
            const isBear = art.sentiment === 'BEARISH';

            return (
              <div
                key={art.id}
                className={`p-3.5 rounded-xl border transition-all hover:border-gray-500/40 ${
                  isCritical
                    ? 'bg-gradient-to-br from-[#1a0f18] via-[#0c1322] to-[#0c1322] border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.12)]'
                    : isHigh
                    ? 'bg-gradient-to-br from-[#18140f] via-[#0c1322] to-[#0c1322] border-amber-500/30'
                    : 'bg-[#0a101d] border-[#182335]'
                }`}
              >
                {/* Card Top Meta Strip */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2 pb-1.5 border-b border-white/5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Impact Badge */}
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold flex items-center gap-0.5 ${
                        isCritical
                          ? 'bg-rose-500 text-black animate-pulse'
                          : isHigh
                          ? 'bg-amber-500 text-black'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      }`}
                    >
                      {isCritical && <ShieldAlert size={10} />}
                      {art.impact_rating}
                    </span>

                    {/* Category */}
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#141f33] text-gray-300 border border-[#1e2d44]">
                      {art.category.replace('_', ' ')}
                    </span>

                    {/* Source & Relative Time */}
                    <span className="text-[10px] text-gray-400">
                      {art.source} · {art.relative_time}
                    </span>
                  </div>

                  {/* Sentiment Badge */}
                  <div className="flex items-center gap-1">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold flex items-center gap-1 ${
                        isBull
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : isBear
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          : 'bg-gray-800 text-gray-300 border border-gray-700'
                      }`}
                    >
                      {isBull && <TrendingUp size={11} />}
                      {isBear && <TrendingDown size={11} />}
                      {art.sentiment} ({art.confidence}%)
                    </span>
                  </div>
                </div>

                {/* Headline */}
                <a
                  href={art.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block font-bold text-white text-xs sm:text-[13px] hover:text-emerald-300 transition-colors leading-snug mb-1.5 group"
                >
                  <span className="group-hover:underline">{art.headline}</span>
                  <ExternalLink size={10} className="inline ml-1 text-gray-400 group-hover:text-emerald-400" />
                </a>

                {/* Summary */}
                {art.summary && (
                  <p className="text-[11px] text-gray-300 font-sans leading-relaxed mb-2.5 opacity-90 line-clamp-2">
                    {art.summary}
                  </p>
                )}

                {/* 🎯 Primary Targets Strip */}
                {art.primary_targets && art.primary_targets.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mb-2 p-1.5 rounded-lg bg-[#070d18] border border-white/5">
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                      🎯 Primary Impact:
                    </span>
                    {art.primary_targets.map((pt: any, i: number) => (
                      <button
                        key={i}
                        onClick={() => onSelectTicker(pt.ticker)}
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold border transition-all flex items-center gap-1 hover:scale-105 ${
                          pt.bias === 'BULLISH'
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                            : pt.bias === 'BEARISH'
                            ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                            : 'bg-gray-800 border-gray-700 text-gray-200'
                        }`}
                        title={`Click to load ${pt.ticker} in terminal`}
                      >
                        <span>${pt.ticker}</span>
                        <span className="text-[9px] opacity-80">
                          {pt.bias === 'BULLISH' ? '🟢 BULL' : pt.bias === 'BEARISH' ? '🔴 BEAR' : '⚖ CHOP'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* ⚡ INFECTED STOCKS (Contagion Domino Effect) */}
                {art.infected_stocks && art.infected_stocks.length > 0 && (
                  <div className="mb-2.5 p-2 rounded-lg bg-[#08101e] border border-amber-500/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-extrabold text-amber-300 flex items-center gap-1">
                        <Zap size={11} className="text-amber-400 animate-pulse" />
                        INFECTED STOCKS (Domino Contagion Effect)
                      </span>
                      <span className="text-[9px] text-gray-400">
                        Click ticker to chart
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {art.infected_stocks.map((inf: any, idx: number) => (
                        <div
                          key={idx}
                          onClick={() => onSelectTicker(inf.ticker)}
                          className={`p-1.5 rounded-md border flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] ${
                            inf.bias === 'BULLISH'
                              ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-400'
                              : 'bg-rose-950/20 border-rose-500/30 hover:border-rose-400'
                          }`}
                          title={`Contagion Rationale: ${inf.rationale}`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-[11px] text-white">
                              ${inf.ticker}
                            </span>
                            <span className="text-[9px] text-gray-400 truncate max-w-[110px]">
                              {inf.relationship}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <span
                              className={`text-[9px] font-bold px-1 rounded ${
                                inf.bias === 'BULLISH' ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                              }`}
                            >
                              {inf.bias === 'BULLISH' ? '▲ BULLISH' : '▼ BEARISH'}
                            </span>
                            <ArrowRight size={10} className="text-gray-500" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 💡 B.I.A.S. Tactical Action Plan */}
                {art.action_plan && (
                  <div className="p-2 rounded-lg bg-[#060b14] border-l-2 border-emerald-500 text-[10px] text-gray-300 flex items-start gap-1.5">
                    <Sparkles size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white mr-1">B.I.A.S. Action Plan:</span>
                      <span>{art.action_plan}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
