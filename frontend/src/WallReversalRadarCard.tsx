import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ShieldAlert, Target, TrendingDown, TrendingUp, 
  Compass, RefreshCw,
  Search, ArrowLeft, Crosshair, BarChart3, Flame
} from 'lucide-react';
import { API_BASE } from './config';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface WallReversalRadarProps {
  ticker: string;
  spotPrice?: number | null;
  gex?: {
    call_wall?: number | null;
    put_wall?: number | null;
    flip?: number | null;
    net_gex_usd?: number | null;
    regime?: string | null;
  };
  maxPain?: number | null;
  onSelectTicker?: (ticker: string) => void;
  scannerBreakouts?: any[];
}

export function WallReversalRadarCard({
  ticker,
  spotPrice,
  gex,
  maxPain: _maxPain,
  onSelectTicker,
}: WallReversalRadarProps) {
  const [marketReversals, setMarketReversals] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterTab, setFilterTab] = useState<'ALL' | 'CRITICAL' | 'CALL_FADES' | 'PUT_BOUNCES'>('ALL');
  const [search, setSearch] = useState<string>('');
  const [selectedDetailTicker, setSelectedDetailTicker] = useState<string | null>(null);

  // Fetch all pre-computed market-wide reversals from smart terminal algo
  const fetchReversals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/scanner/reversals`);
      const data = await res.json();
      if (data && data.reversals) {
        setMarketReversals(data.reversals);
      }
    } catch (e) {
      console.error('Failed to fetch market reversals:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReversals();
    const interval = setInterval(fetchReversals, 20000); // 20s live sync
    return () => clearInterval(interval);
  }, [fetchReversals]);

  // Active symbol for detailed inspection (defaults to currently selected chart ticker)
  const activeTicker = selectedDetailTicker || ticker;

  // Find active ticker data from marketReversals or fallback to current props
  const activeData = useMemo(() => {
    const found = marketReversals.find(r => r.ticker === activeTicker);
    if (found) return found;

    // Fallback using gex props
    const s = Number(spotPrice || 0);
    const cw = gex?.call_wall ? Number(gex.call_wall) : null;
    const pw = gex?.put_wall ? Number(gex.put_wall) : null;
    const flip = gex?.flip ? Number(gex.flip) : null;
    const distCw = cw && s > 0 ? Math.abs((cw - s) / s) * 100 : 99;
    const distPw = pw && s > 0 ? Math.abs((s - pw) / s) * 100 : 99;
    const isCall = distCw <= distPw;

    return {
      ticker: activeTicker,
      spot: s,
      change: 0.0,
      call_wall: cw,
      put_wall: pw,
      flip: flip,
      closest_wall: isCall ? 'CALL_WALL' : 'PUT_WALL',
      closest_dist_pct: isCall ? distCw : distPw,
      target_wall_strike: isCall ? cw : pw,
      sig_type: isCall ? 'SHORT_FADE' : 'LONG_BOUNCE',
      tone: isCall ? 'red' : 'green',
      score: 75,
      action: isCall ? 'FADE RESISTANCE / BUY PUTS' : 'BUY FLOOR / LONG BOUNCE',
      ideal_entry: isCall ? `$${s.toFixed(2)} - $${cw?.toFixed(2)}` : `$${pw?.toFixed(2)} - $${s.toFixed(2)}`,
      stop_loss: isCall ? `$${((cw || s) * 1.0025).toFixed(2)}` : `$${((pw || s) * 0.9975).toFixed(2)}`,
      target: flip ? `$${flip.toFixed(2)} (Flip Pivot)` : `$${(s * 0.98).toFixed(2)}`,
      risk_reward: '1 : 4.2',
      catalyst: isCall 
        ? `Approaching Resistance Call Wall at $${cw?.toFixed(2)}. Dealers forced to sell stock on test.`
        : `Testing Support Put Wall at $${pw?.toFixed(2)}. Dealer short-covering provides cushion.`
    };
  }, [marketReversals, activeTicker, spotPrice, gex]);

  // Filtered list of market reversals
  const filteredList = useMemo(() => {
    return marketReversals.filter(item => {
      const matchesSearch = !search || item.ticker.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;
      if (filterTab === 'ALL') return true;
      if (filterTab === 'CRITICAL') return Number(item.closest_dist_pct || 99) <= 0.35;
      if (filterTab === 'CALL_FADES') return item.sig_type === 'SHORT_FADE';
      if (filterTab === 'PUT_BOUNCES') return item.sig_type === 'LONG_BOUNCE';
      return true;
    });
  }, [marketReversals, search, filterTab]);

  const criticalCount = useMemo(() => {
    return marketReversals.filter(r => Number(r.closest_dist_pct || 99) <= 0.35).length;
  }, [marketReversals]);

  // Handle clicking a ticker in the reversal feed
  const handleSelectTicker = (sym: string) => {
    setSelectedDetailTicker(sym);
    if (onSelectTicker) {
      onSelectTicker(sym); // Immediately loads symbol into the main chart!
    }
  };

  // Channel progress calculation for active detail symbol (0% = at Put Wall, 100% = at Call Wall)
  const channelPct = useMemo(() => {
    const s = Number(activeData?.spot || 0);
    const cw = Number(activeData?.call_wall || 0);
    const pw = Number(activeData?.put_wall || 0);
    if (!s || !cw || !pw || cw <= pw) return 50;
    const progress = ((s - pw) / (cw - pw)) * 100;
    return Math.max(0, Math.min(100, progress));
  }, [activeData]);

  return (
    <div className="flex flex-col gap-3 font-sans">
      {/* Top Header & Mode Toggle */}
      <div className="flex justify-between items-center pb-2 border-b border-white/5">
        <div className="flex items-center gap-1.5">
          <Compass size={14} className="text-neon-gold animate-spin-slow" />
          <span className="text-xs font-bold font-mono tracking-wider text-white">
            WALL REVERSAL RADAR
          </span>
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-neon-red/20 text-neon-red border border-neon-red/40 flex items-center gap-1">
            <Flame size={10} /> {criticalCount} CRITICAL
          </span>
        </div>

        <div className="flex items-center gap-2">
          {selectedDetailTicker && (
            <button
              onClick={() => setSelectedDetailTicker(null)}
              className="text-[10px] font-mono text-slate-400 hover:text-white flex items-center gap-1 px-1.5 py-0.5 rounded border border-white/10 hover:border-white/30 transition-all cursor-pointer"
              title="Return to full market-wide reversal list"
            >
              <ArrowLeft size={10} /> All Symbols
            </button>
          )}
          <button
            onClick={fetchReversals}
            disabled={loading}
            className="text-slate-400 hover:text-neon-gold p-1 transition-colors cursor-pointer disabled:opacity-50"
            title="Scan market now for live wall reversals"
          >
            <RefreshCw size={11} className={loading ? 'animate-spin text-neon-gold' : ''} />
          </button>
        </div>
      </div>

      {/* VIEW 1: Market-Wide All Symbols Reversal Feed (When not drilling into 1 symbol) */}
      {!selectedDetailTicker ? (
        <div className="flex flex-col gap-2.5">
          {/* Search & Filter Chips */}
          <div className="flex flex-col gap-1.5">
            <div className="relative flex items-center">
              <Search size={12} className="absolute left-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search symbol (SPY, NVDA, EUR/USD...)"
                value={search}
                onChange={(e) => setSearch(e.target.value.toUpperCase())}
                className="w-full bg-black/50 border border-white/10 rounded-md pl-7 pr-2 py-1 text-xs font-mono text-white placeholder-slate-500 outline-none focus:border-neon-gold"
              />
            </div>

            <div className="flex gap-1 overflow-x-auto pb-0.5 text-[9px] font-mono no-scrollbar">
              {[
                { id: 'ALL', label: `ALL (${marketReversals.length})` },
                { id: 'CRITICAL', label: `🔥 CRITICAL (<0.35%)` },
                { id: 'CALL_FADES', label: `🔴 CALL FADES` },
                { id: 'PUT_BOUNCES', label: `🟢 PUT BOUNCES` }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilterTab(tab.id as any)}
                  className={`px-2 py-0.5 rounded border transition-all shrink-0 cursor-pointer ${
                    filterTab === tab.id
                      ? tab.id === 'CRITICAL'
                        ? 'border-neon-red bg-neon-red/20 text-neon-red font-bold shadow-[0_0_8px_rgba(255,42,109,0.3)]'
                        : tab.id === 'CALL_FADES'
                        ? 'border-neon-red/70 bg-neon-red/15 text-neon-red font-bold'
                        : tab.id === 'PUT_BOUNCES'
                        ? 'border-neon-green/70 bg-neon-green/15 text-neon-green font-bold'
                        : 'border-neon-gold bg-neon-gold/15 text-neon-gold font-bold shadow-[0_0_6px_rgba(255,215,0,0.2)]'
                      : 'border-white/5 text-slate-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between text-[9px] font-mono text-slate-500 px-1 border-b border-white/5 pb-1">
            <span>SYMBOL / SPOT / MOVE</span>
            <span>WALL PROXIMITY / ACTION PLAN</span>
          </div>

          {/* List of Reversal Candidates */}
          <div className="flex flex-col gap-1.5 max-h-[460px] overflow-y-auto pr-0.5">
            {loading && marketReversals.length === 0 ? (
              <div className="text-center text-slate-500 italic py-10 font-mono text-xs">
                Scanning 40+ symbols for dealer gamma wall proximity...
              </div>
            ) : filteredList.length === 0 ? (
              <div className="text-center text-slate-500 italic py-10 font-mono text-xs">
                No symbols currently match this reversal filter.
              </div>
            ) : filteredList.map((item, idx) => {
              const isShort = item.sig_type === 'SHORT_FADE';
              const dist = Number(item.closest_dist_pct || 0);
              const isCritical = dist <= 0.25;
              const isCurrentChart = ticker === item.ticker;

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectTicker(item.ticker)}
                  title={`Click to load ${item.ticker} live candlestick chart & view reversal playbook`}
                  className={`text-left p-2.5 rounded-lg border transition-all flex justify-between items-center cursor-pointer ${
                    isCurrentChart
                      ? 'border-neon-gold/80 bg-neon-gold/10 shadow-[0_0_12px_rgba(255,215,0,0.15)]'
                      : isCritical
                      ? 'bg-white/[0.04] border-neon-red/40 hover:border-neon-red hover:bg-neon-red/10'
                      : 'bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.04]'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="font-bold text-xs text-white">{item.ticker}</span>
                      <span className="text-[11px] text-slate-300 font-normal">
                        ${Number(item.spot).toFixed(Number(item.spot) < 10 ? 4 : 2)}
                      </span>
                      <span className={`text-[10px] font-bold px-1 rounded ${
                        Number(item.change || 0) >= 0 ? 'bg-neon-green/20 text-neon-green' : 'bg-neon-red/20 text-neon-red'
                      }`}>
                        {Number(item.change || 0) > 0 ? '+' : ''}{Number(item.change || 0).toFixed(2)}%
                      </span>
                      {item.asset_class === 'FOREX' && (
                        <span className="text-[8px] px-1 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          FX
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] font-mono text-slate-400 mt-0.5 flex items-center gap-1.5">
                      <span>Wall: <strong className="text-white">${Number(item.target_wall_strike).toFixed(Number(item.spot) < 10 ? 4 : 2)}</strong></span>
                      <span>·</span>
                      <span className={isCritical ? 'text-neon-red font-bold' : 'text-slate-300'}>
                        {dist.toFixed(2)}% away
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 font-mono">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase flex items-center gap-1 ${
                      isShort
                        ? 'bg-neon-red/20 text-neon-red border-neon-red/40'
                        : 'bg-neon-green/20 text-neon-green border-neon-green/40'
                    }`}>
                      {isShort ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
                      {isShort ? 'FADE SHORT' : 'BOUNCE LONG'}
                    </span>
                    <span className="text-[9px] text-slate-400 flex items-center gap-1">
                      <BarChart3 size={9} /> {item.score}% Readiness
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* VIEW 2: Single-Symbol Deep Dive Execution Card (When a symbol is selected) */
        <div className="flex flex-col gap-3">
          {/* Active Symbol Header Banner */}
          <div className="p-3 rounded-lg border bg-black/40 border-white/10 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold font-mono text-white">{activeData.ticker}</span>
                <span className="text-sm font-mono text-slate-300">
                  ${Number(activeData.spot).toFixed(Number(activeData.spot) < 10 ? 4 : 2)}
                </span>
                <span className={`text-xs font-mono font-bold px-1 rounded ${
                  Number(activeData.change || 0) >= 0 ? 'bg-neon-green/20 text-neon-green' : 'bg-neon-red/20 text-neon-red'
                }`}>
                  {Number(activeData.change || 0) > 0 ? '+' : ''}{Number(activeData.change || 0).toFixed(2)}%
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                Targeting Wall: <strong>${Number(activeData.target_wall_strike).toFixed(Number(activeData.spot) < 10 ? 4 : 2)}</strong> ({Number(activeData.closest_dist_pct).toFixed(2)}% away)
              </div>
            </div>

            <div className="flex flex-col items-end gap-1">
              <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                activeData.sig_type === 'SHORT_FADE' 
                  ? 'bg-neon-red/20 text-neon-red border-neon-red shadow-[0_0_8px_rgba(255,42,109,0.3)] animate-pulse'
                  : 'bg-neon-green/20 text-neon-green border-neon-green shadow-[0_0_8px_rgba(0,255,163,0.3)] animate-pulse'
              }`}>
                {activeData.sig_type === 'SHORT_FADE' ? '🔴 FADE RESISTANCE' : '🟢 BOUNCE SUPPORT'}
              </span>
              <span className="text-[9px] font-mono text-neon-gold font-bold">
                {activeData.score}% Reversal Score
              </span>
            </div>
          </div>

          {/* Interactive Visual Channel Gauge */}
          <div className="p-3 rounded-lg border border-white/5 bg-black/30 flex flex-col gap-2">
            <div className="flex justify-between items-center text-[10px] font-mono">
              <div className="flex flex-col">
                <span className="text-neon-red font-bold flex items-center gap-1">
                  <ShieldAlert size={10} /> PUT WALL (FLOOR)
                </span>
                <span className="text-white font-bold text-xs">
                  ${Number(activeData.put_wall || 0).toFixed(Number(activeData.spot) < 10 ? 4 : 2)}
                </span>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-neon-gold font-bold text-[9px]">SPOT</span>
                <span className="text-white text-xs font-bold">
                  ${Number(activeData.spot || 0).toFixed(Number(activeData.spot) < 10 ? 4 : 2)}
                </span>
              </div>

              <div className="flex flex-col items-end">
                <span className="text-neon-green font-bold flex items-center gap-1">
                  CALL WALL (CEILING) <Target size={10} />
                </span>
                <span className="text-white font-bold text-xs">
                  ${Number(activeData.call_wall || 0).toFixed(Number(activeData.spot) < 10 ? 4 : 2)}
                </span>
              </div>
            </div>

            {/* Visual Needle Channel Bar */}
            <div className="relative w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
              <div className="absolute left-0 top-0 bottom-0 w-[15%] bg-neon-red/25 border-r border-neon-red/40" />
              <div className="absolute right-0 top-0 bottom-0 w-[15%] bg-neon-green/25 border-l border-neon-green/40" />
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-neon-gold/50 -translate-x-1/2" />
              <div 
                className="absolute top-0 bottom-0 w-2.5 rounded-full bg-white shadow-[0_0_8px_#ffffff] -translate-x-1/2 transition-all duration-500"
                style={{ left: `${channelPct}%` }}
              />
            </div>

            <div className="flex justify-between text-[8px] font-mono text-slate-500 px-0.5">
              <span>Support Floor</span>
              <span>Gamma Flip Pivot</span>
              <span>Resistance Ceiling</span>
            </div>
          </div>

          {/* Actionable Reversal Playbook Plan */}
          <div className={`p-3 rounded-lg border flex flex-col gap-2 ${
            activeData.sig_type === 'SHORT_FADE' ? 'border-neon-red/40 bg-neon-red/5' : 'border-neon-green/40 bg-neon-green/5'
          }`}>
            <div className="flex justify-between items-center pb-1.5 border-b border-white/5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-300 font-bold flex items-center gap-1.5">
                {activeData.sig_type === 'SHORT_FADE' ? <TrendingDown size={12} className="text-neon-red" /> : <TrendingUp size={12} className="text-neon-green" />}
                Execution Parameters
              </div>
              <span className="text-[10px] font-mono font-bold text-white">
                {activeData.action}
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
              {activeData.catalyst}
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[10px]">
              <div className="p-2 rounded bg-black/40 border border-white/5">
                <span className="text-slate-500 text-[9px] uppercase block">Ideal Entry</span>
                <span className="text-white font-bold">{activeData.ideal_entry}</span>
              </div>
              <div className="p-2 rounded bg-black/40 border border-white/5">
                <span className="text-slate-500 text-[9px] uppercase block">Stop Loss Invalidation</span>
                <span className="text-neon-red font-bold">{activeData.stop_loss}</span>
              </div>
              <div className="p-2 rounded bg-black/40 border border-white/5">
                <span className="text-slate-500 text-[9px] uppercase block">Take Profit Target</span>
                <span className="text-neon-green font-bold">{activeData.target}</span>
              </div>
              <div className="p-2 rounded bg-black/40 border border-white/5">
                <span className="text-slate-500 text-[9px] uppercase block">Risk / Reward</span>
                <span className="text-neon-gold font-bold">{activeData.risk_reward}</span>
              </div>
            </div>
          </div>

          {/* Direct Button: Load this Symbol into Chart */}
          <button
            onClick={() => onSelectTicker && onSelectTicker(activeData.ticker)}
            className="w-full py-2 rounded-lg bg-neon-gold/15 border border-neon-gold/40 hover:bg-neon-gold/25 hover:border-neon-gold text-neon-gold font-mono font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(255,215,0,0.15)]"
          >
            <Crosshair size={13} />
            LOAD {activeData.ticker} IN MULTI-CHART GRID
          </button>
        </div>
      )}
    </div>
  );
}
