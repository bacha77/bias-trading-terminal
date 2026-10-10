import React, { useState, useEffect } from 'react';
import { TradingChart } from './TradingChart';
import { ErrorBoundary } from './ErrorBoundary';
import { MultiTimeframeRibbon } from './MultiTimeframeRibbon';
import { 
  BarChart3, 
  Columns, 
  Square, 
  LayoutGrid, 
  Maximize2, 
  Minimize2, 
  ChevronDown
} from 'lucide-react';

interface MultiChartGridProps {
  primaryTicker: string;
  onSelectPrimaryTicker: (ticker: string) => void;
  tape: Record<string, { price: number; change: number; timestamp?: string }>;
  primaryGex?: {
    flip?: number | null;
    call_wall?: number | null;
    put_wall?: number | null;
    regime?: string | null;
  };
  primaryMaxPain?: number | null;
  isExpandedCanvas: boolean;
  setIsExpandedCanvas: (expanded: boolean) => void;
}

const POPULAR_TICKERS = ['SPY', 'QQQ', 'NVDA', 'AAPL', 'TSLA', 'MSFT', 'AMD', 'META', 'AMZN', 'IWM'];

export function MultiChartGrid({
  primaryTicker,
  onSelectPrimaryTicker,
  tape,
  primaryGex,
  primaryMaxPain,
  isExpandedCanvas,
  setIsExpandedCanvas,
}: MultiChartGridProps) {
  const [layout, setLayout] = useState<'single' | 'dual' | 'quad'>('single');

  // Secondary slot tickers
  const [slot2, setSlot2] = useState<string>(primaryTicker === 'QQQ' ? 'SPY' : 'QQQ');
  const [slot3, setSlot3] = useState<string>('NVDA');
  const [slot4, setSlot4] = useState<string>('AAPL');

  // Quick picker dropdown state per slot
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [customInput, setCustomInput] = useState<string>('');

  // Global Timeframe Sync (optional)
  const [syncedTimeframe, setSyncedTimeframe] = useState<string | null>(null);

  // Keep slot 2 different from primary if primary changes to slot 2
  useEffect(() => {
    if (slot2 === primaryTicker) {
      setSlot2(primaryTicker === 'QQQ' ? 'SPY' : 'QQQ');
    }
  }, [primaryTicker]);

  const handleCustomSubmit = (slotIdx: number, e: React.FormEvent) => {
    e.preventDefault();
    const sym = customInput.toUpperCase().trim();
    if (!sym) return;
    if (slotIdx === 0) onSelectPrimaryTicker(sym);
    else if (slotIdx === 1) setSlot2(sym);
    else if (slotIdx === 2) setSlot3(sym);
    else if (slotIdx === 3) setSlot4(sym);
    setCustomInput('');
    setOpenDropdown(null);
  };

  const setSlotTicker = (slotIdx: number, sym: string) => {
    if (slotIdx === 0) onSelectPrimaryTicker(sym);
    else if (slotIdx === 1) setSlot2(sym);
    else if (slotIdx === 2) setSlot3(sym);
    else if (slotIdx === 3) setSlot4(sym);
    setOpenDropdown(null);
  };

  // Render slot control bar
  const renderSlotHeader = (slotIdx: number, currentTicker: string, isPrimary: boolean) => {
    const live = tape[currentTicker];
    const isOpen = openDropdown === slotIdx;

    return (
      <div className="flex items-center justify-between px-2.5 py-1.5 bg-black/70 border-b border-white/10 text-xs font-mono">
        <div className="flex items-center gap-2">
          {/* Ticker dropdown pill */}
          <div className="relative">
            <button
              onClick={() => {
                setOpenDropdown(isOpen ? null : slotIdx);
                setCustomInput('');
              }}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold transition-all"
            >
              <span className="text-neon-green">{currentTicker}</span>
              <ChevronDown size={11} className="text-slate-400" />
            </button>

            {/* Quick Picker Menu */}
            {isOpen && (
              <div className="absolute top-8 left-0 z-50 w-52 bg-slate-950 border border-white/20 rounded-lg p-2 shadow-2xl backdrop-blur-xl">
                <form onSubmit={(e) => handleCustomSubmit(slotIdx, e)} className="mb-2">
                  <div className="flex gap-1">
                    <input
                      type="text"
                      placeholder="CUSTOM TICKER..."
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value.toUpperCase())}
                      className="w-full bg-black/60 border border-white/20 rounded px-2 py-1 text-[11px] text-white font-mono uppercase outline-none focus:border-neon-green"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="px-2 py-1 bg-neon-green text-black font-bold text-[10px] rounded hover:opacity-90"
                    >
                      GO
                    </button>
                  </div>
                </form>
                <div className="text-[9px] text-slate-400 uppercase font-bold mb-1 px-1">Quick Select:</div>
                <div className="grid grid-cols-4 gap-1">
                  {POPULAR_TICKERS.map((sym) => (
                    <button
                      key={sym}
                      onClick={() => setSlotTicker(slotIdx, sym)}
                      className={`px-1.5 py-1 rounded text-[10px] font-mono border text-center transition-all ${
                        currentTicker === sym
                          ? 'border-neon-green bg-neon-green/20 text-neon-green font-bold'
                          : 'border-white/10 hover:border-white/30 text-slate-300 hover:text-white'
                      }`}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Primary Badge or Make Primary Button */}
          {isPrimary ? (
            <span className="px-1.5 py-0.2 rounded bg-neon-green/20 border border-neon-green/50 text-neon-green text-[9px] font-bold tracking-wider">
              MAIN SYNC
            </span>
          ) : (
            <button
              onClick={() => onSelectPrimaryTicker(currentTicker)}
              title="Sync terminal (Scanner, Dark Pool, Smart Algo) to this ticker"
              className="px-1.5 py-0.2 rounded bg-neon-gold/10 hover:bg-neon-gold/20 border border-neon-gold/40 text-neon-gold text-[9px] font-bold transition-all flex items-center gap-1"
            >
              ★ Make Main
            </button>
          )}

          {/* Live Price Tag */}
          {live?.price && (
            <span className="text-slate-300 font-bold text-[11px]">
              ${Number(live.price).toFixed(2)}
              <span className={`ml-1 text-[10px] ${live.change >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                {live.change >= 0 ? '+' : ''}{Number(live.change).toFixed(2)}%
              </span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-[10px] text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse"></span>
          SIP 0-DELAY
        </div>
      </div>
    );
  };

  // Determine heights
  const singleHeight = isExpandedCanvas ? 660 : 560;
  const dualHeight = isExpandedCanvas ? 600 : 520;
  const quadHeight = isExpandedCanvas ? 540 : 480;

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Top Multi-Chart Command Toolbar */}
      <div className="flex flex-wrap justify-between items-center pb-2.5 mb-2 border-b border-white/10 gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <BarChart3 size={15} className="text-neon-green" />
            <span className="font-mono font-bold text-xs text-white tracking-wide flex items-center gap-1.5">
              CHART MATRIX
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-slate-300 border border-white/10 font-normal">
                {layout === 'single' ? '1-PANE' : layout === 'dual' ? '2-PANE SPLIT' : '4-PANE QUAD'}
              </span>
            </span>
          </div>

          {/* Institutional Multi-Timeframe Alignment Ribbon */}
          <div className="hidden md:flex pl-2 border-l border-white/10">
            <MultiTimeframeRibbon ticker={primaryTicker} />
          </div>
        </div>

        {/* Layout & Canvas Switchers */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Timeframe Sync Pill */}
          <div className="hidden sm:flex items-center bg-black/60 rounded-lg p-0.5 border border-white/10 text-[10px] font-mono">
            <span className="px-2 text-slate-400">SYNC TF:</span>
            {['1m', '5m', '15m', '1d'].map((tf) => (
              <button
                key={tf}
                onClick={() => setSyncedTimeframe(syncedTimeframe === tf ? null : tf)}
                className={`px-2 py-0.5 rounded uppercase transition-all ${
                  syncedTimeframe === tf
                    ? 'bg-neon-green/20 text-neon-green font-bold border border-neon-green/40 shadow-[0_0_6px_rgba(0,255,163,0.2)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Grid Layout Toggles */}
          <div className="flex bg-black/60 rounded-lg p-0.5 border border-white/10 gap-0.5">
            <button
              onClick={() => setLayout('single')}
              title="Single Chart View (Focused on Main Ticker)"
              className={`px-2 py-1 rounded text-[11px] font-mono flex items-center gap-1 transition-all ${
                layout === 'single'
                  ? 'bg-neon-green/20 text-neon-green border border-neon-green/40 shadow-[0_0_8px_rgba(0,255,163,0.2)] font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Square size={12} /> 1
            </button>
            <button
              onClick={() => setLayout('dual')}
              title="Dual Split View (2 Charts Side-by-Side)"
              className={`px-2 py-1 rounded text-[11px] font-mono flex items-center gap-1 transition-all ${
                layout === 'dual'
                  ? 'bg-neon-green/20 text-neon-green border border-neon-green/40 shadow-[0_0_8px_rgba(0,255,163,0.2)] font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Columns size={12} /> 2
            </button>
            <button
              onClick={() => setLayout('quad')}
              title="Quad Matrix (4 Charts 2x2 Surveillance)"
              className={`px-2 py-1 rounded text-[11px] font-mono flex items-center gap-1 transition-all ${
                layout === 'quad'
                  ? 'bg-neon-green/20 text-neon-green border border-neon-green/40 shadow-[0_0_8px_rgba(0,255,163,0.2)] font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid size={12} /> 4
            </button>
          </div>

          {/* Full Terminal Canvas Expand Toggle */}
          <button
            onClick={() => setIsExpandedCanvas(!isExpandedCanvas)}
            title={isExpandedCanvas ? "Restore standard 3-panel terminal layout" : "Expand chart matrix across full screen canvas"}
            className={`px-2.5 py-1 text-[11px] font-mono rounded border flex items-center gap-1.5 transition-all ${
              isExpandedCanvas
                ? 'border-neon-gold text-neon-gold bg-neon-gold/15 font-bold shadow-[0_0_10px_rgba(255,215,0,0.2)]'
                : 'border-white/10 text-slate-300 hover:text-white bg-white/5'
            }`}
          >
            {isExpandedCanvas ? (
              <>
                <Minimize2 size={12} /> Standard Matrix
              </>
            ) : (
              <>
                <Maximize2 size={12} /> Full Canvas
              </>
            )}
          </button>
        </div>
      </div>

      {/* Render Single View */}
      {layout === 'single' && (
        <div className="flex-1 flex flex-col">
          <ErrorBoundary fallbackTitle="Main Chart Render Error">
            <TradingChart
              ticker={primaryTicker}
              livePrice={tape[primaryTicker]?.price}
              gex={primaryGex}
              maxPain={primaryMaxPain}
              height={singleHeight}
              timeframeOverride={syncedTimeframe || undefined}
            />
          </ErrorBoundary>
        </div>
      )}

      {/* Render Dual Split View (2 Charts) */}
      {layout === 'dual' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1">
          {/* Chart 1: Primary Ticker */}
          <div className="rounded-lg border border-white/10 bg-black/40 overflow-hidden flex flex-col">
            {renderSlotHeader(0, primaryTicker, true)}
            <div className="flex-1 p-2">
              <ErrorBoundary fallbackTitle="Slot 1 Chart Error">
                <TradingChart
                  ticker={primaryTicker}
                  livePrice={tape[primaryTicker]?.price}
                  gex={primaryGex}
                  maxPain={primaryMaxPain}
                  height={dualHeight}
                  compact={true}
                  timeframeOverride={syncedTimeframe || undefined}
                />
              </ErrorBoundary>
            </div>
          </div>

          {/* Chart 2: Slot 2 */}
          <div className="rounded-lg border border-white/10 bg-black/40 overflow-hidden flex flex-col">
            {renderSlotHeader(1, slot2, false)}
            <div className="flex-1 p-2">
              <ErrorBoundary fallbackTitle="Slot 2 Chart Error">
                <TradingChart
                  ticker={slot2}
                  livePrice={tape[slot2]?.price}
                  height={dualHeight}
                  compact={true}
                  timeframeOverride={syncedTimeframe || undefined}
                />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      )}

      {/* Render Quad Matrix View (4 Charts: 2x2) */}
      {layout === 'quad' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
          {/* Slot 1: Primary */}
          <div className="rounded-lg border border-white/10 bg-black/40 overflow-hidden flex flex-col">
            {renderSlotHeader(0, primaryTicker, true)}
            <div className="flex-1 p-1.5">
              <ErrorBoundary fallbackTitle="Quad Slot 1 Chart Error">
                <TradingChart
                  ticker={primaryTicker}
                  livePrice={tape[primaryTicker]?.price}
                  gex={primaryGex}
                  maxPain={primaryMaxPain}
                  height={quadHeight}
                  compact={true}
                  timeframeOverride={syncedTimeframe || undefined}
                />
              </ErrorBoundary>
            </div>
          </div>

          {/* Slot 2 */}
          <div className="rounded-lg border border-white/10 bg-black/40 overflow-hidden flex flex-col">
            {renderSlotHeader(1, slot2, false)}
            <div className="flex-1 p-1.5">
              <ErrorBoundary fallbackTitle="Quad Slot 2 Chart Error">
                <TradingChart
                  ticker={slot2}
                  livePrice={tape[slot2]?.price}
                  height={quadHeight}
                  compact={true}
                  timeframeOverride={syncedTimeframe || undefined}
                />
              </ErrorBoundary>
            </div>
          </div>

          {/* Slot 3 */}
          <div className="rounded-lg border border-white/10 bg-black/40 overflow-hidden flex flex-col">
            {renderSlotHeader(2, slot3, false)}
            <div className="flex-1 p-1.5">
              <ErrorBoundary fallbackTitle="Quad Slot 3 Chart Error">
                <TradingChart
                  ticker={slot3}
                  livePrice={tape[slot3]?.price}
                  height={quadHeight}
                  compact={true}
                  timeframeOverride={syncedTimeframe || undefined}
                />
              </ErrorBoundary>
            </div>
          </div>

          {/* Slot 4 */}
          <div className="rounded-lg border border-white/10 bg-black/40 overflow-hidden flex flex-col">
            {renderSlotHeader(3, slot4, false)}
            <div className="flex-1 p-1.5">
              <ErrorBoundary fallbackTitle="Quad Slot 4 Chart Error">
                <TradingChart
                  ticker={slot4}
                  livePrice={tape[slot4]?.price}
                  height={quadHeight}
                  compact={true}
                  timeframeOverride={syncedTimeframe || undefined}
                />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
