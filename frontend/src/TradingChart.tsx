import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, ColorType, CandlestickSeries, LineSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, IPriceLine, UTCTimestamp, AutoscaleInfo } from 'lightweight-charts';
import { BarChart3, Layers, ZoomIn, ZoomOut, Maximize2, RefreshCcw, Activity } from 'lucide-react';
import { API_BASE } from './config';

interface BarWithVolume {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function calculateSessionVwap(bars: BarWithVolume[]) {
  let cumVol = 0;
  let cumPV = 0;
  let cumDevSq = 0;
  let currentDay = -1;

  const vwapData: { time: UTCTimestamp; value: number }[] = [];
  const upperData: { time: UTCTimestamp; value: number }[] = [];
  const lowerData: { time: UTCTimestamp; value: number }[] = [];

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    const vol = bar.volume && bar.volume > 0 ? bar.volume : 1000;
    const tp = (bar.high + bar.low + bar.close) / 3;

    // Reset daily at 00:00 UTC / 86400s boundary
    const barDay = Math.floor(Number(bar.time) / 86400);
    if (barDay !== currentDay) {
      currentDay = barDay;
      cumVol = 0;
      cumPV = 0;
      cumDevSq = 0;
    }

    cumVol += vol;
    cumPV += tp * vol;
    const vwapVal = cumPV / cumVol;

    // Variance & 2-sigma standard deviation
    cumDevSq += vol * Math.pow(tp - vwapVal, 2);
    const variance = cumDevSq / cumVol;
    const stdDev = Math.sqrt(Math.max(0, variance));

    const t = bar.time;
    const r2 = (n: number) => Math.round(n * 100) / 100;

    vwapData.push({ time: t, value: r2(vwapVal) });
    upperData.push({ time: t, value: r2(vwapVal + 2 * stdDev) });
    lowerData.push({ time: t, value: r2(vwapVal - 2 * stdDev) });
  }

  return { vwapData, upperData, lowerData };
}

export interface ChartProps {
  ticker: string;
  livePrice?: number | null;
  gex?: {
    flip?: number | null;
    call_wall?: number | null;
    put_wall?: number | null;
    regime?: string | null;
  };
  maxPain?: number | null;
  height?: number;
  compact?: boolean;
  timeframeOverride?: string;
}

export function TradingChart({ 
  ticker, 
  livePrice, 
  gex, 
  maxPain,
  height,
  compact = false,
  timeframeOverride
}: ChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const vwapSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const vwapUpperSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const vwapLowerSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const lastBarRef = useRef<{ time: number; open: number; high: number; low: number; close: number } | null>(null);

  // Price line refs
  const callWallLineRef = useRef<IPriceLine | null>(null);
  const putWallLineRef = useRef<IPriceLine | null>(null);
  const flipLineRef = useRef<IPriceLine | null>(null);
  const maxPainLineRef = useRef<IPriceLine | null>(null);

  const [timeframe, setTimeframe] = useState(timeframeOverride || '1m');
  const [viewMode, setViewMode] = useState<'levels' | 'tv'>('levels');
  const [loading, setLoading] = useState(false);
  const [zoomMode, setZoomMode] = useState<'candles' | 'gex'>('candles'); // Default to 'candles' so candles autoscale snugly and are 100% visible!
  const [barsSummary, setBarsSummary] = useState<string>('');
  const [showVwap, setShowVwap] = useState<boolean>(true);
  const [currentVwap, setCurrentVwap] = useState<{ vwap: number; upper: number; lower: number } | null>(null);

  // Crosshair HUD state
  const [hoverBar, setHoverBar] = useState<{ open: number; high: number; low: number; close: number; time: number } | null>(null);

  // Self-fetch GEX analytics when not provided by parent (e.g. secondary charts in multi-grid)
  const [internalGex, setInternalGex] = useState<{
    flip?: number | null;
    call_wall?: number | null;
    put_wall?: number | null;
    regime?: string | null;
  } | null>(null);
  const [internalMaxPain, setInternalMaxPain] = useState<number | null>(null);

  useEffect(() => {
    if (gex && (gex.call_wall || gex.put_wall || gex.flip)) {
      setInternalGex(null);
      return;
    }
    let active = true;
    fetch(`${API_BASE}/api/options/analytics?ticker=${encodeURIComponent(ticker)}`)
      .then(res => res.json())
      .then(data => {
        if (active && data && data.gex) {
          setInternalGex(data.gex);
          setInternalMaxPain(data.max_pain ?? null);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [ticker, gex]);

  const effectiveGex = (gex && (gex.call_wall || gex.put_wall || gex.flip)) ? gex : internalGex;
  const effectiveMaxPain = maxPain ?? internalMaxPain;

  const chartHeight = height || (compact ? 330 : 460);

  // Sync timeframe override when changed by global sync
  useEffect(() => {
    if (timeframeOverride) {
      setTimeframe(timeframeOverride);
    }
  }, [timeframeOverride]);

  // 1. Initialize Chart Canvas ONCE (zero flicker, full mousewheel/touch zoom & scroll enabled)
  useEffect(() => {
    if (viewMode !== 'levels' || !chartContainerRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
      candleSeriesRef.current = null;
      lastBarRef.current = null;
    }

    const container = chartContainerRef.current;
    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: '#070a13' },
        textColor: '#94a3b8',
        fontSize: 11,
        fontFamily: 'monospace',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.04)' },
      },
      crosshair: {
        vertLine: { color: '#00ffa3', width: 1, style: 2 },
        horzLine: { color: '#00ffa3', width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.12)',
        scaleMargins: { top: 0.15, bottom: 0.15 },
        autoScale: true,
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.12)',
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 18,        // Wide, prominent candles (not squished)
        minBarSpacing: 4,
        rightOffset: 12,       // Ample space on the right for new candle action
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: {
          time: true,
          price: true,
        },
        mouseWheel: true,
        pinch: true,
      },
      width: container.clientWidth,
      height: container.clientHeight || 460,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#00ffa3',
      downColor: '#ff2a6d',
      borderVisible: true,
      borderColor: '#00ffa3',
      borderUpColor: '#00ffa3',
      borderDownColor: '#ff2a6d',
      wickColor: '#94a3b8',
      wickUpColor: '#00ffa3',
      wickDownColor: '#ff2a6d',
    });

    const vwapSeries = chart.addSeries(LineSeries, {
      color: '#c084fc', // Vibrant Purple / Violet
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      title: 'VWAP',
    });

    const vwapUpperSeries = chart.addSeries(LineSeries, {
      color: 'rgba(192, 132, 252, 0.45)',
      lineWidth: 1,
      lineStyle: 2, // Dashed
      priceLineVisible: false,
      lastValueVisible: false,
      title: '+2σ',
    });

    const vwapLowerSeries = chart.addSeries(LineSeries, {
      color: 'rgba(192, 132, 252, 0.45)',
      lineWidth: 1,
      lineStyle: 2, // Dashed
      priceLineVisible: false,
      lastValueVisible: false,
      title: '-2σ',
    });

    chartInstanceRef.current = chart;
    candleSeriesRef.current = candleSeries;
    vwapSeriesRef.current = vwapSeries;
    vwapUpperSeriesRef.current = vwapUpperSeries;
    vwapLowerSeriesRef.current = vwapLowerSeries;

    // Crosshair hover subscriber for Pro HUD
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.seriesData || !candleSeries) {
        setHoverBar(null);
        return;
      }
      const data = param.seriesData.get(candleSeries) as any;
      if (data && data.open !== undefined) {
        setHoverBar({
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
          time: Number(data.time),
        });
      } else {
        setHoverBar(null);
      }
    });

    const handleResize = () => {
      if (chartContainerRef.current && chartInstanceRef.current) {
        chartInstanceRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight || chartHeight,
        });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
        candleSeriesRef.current = null;
        vwapSeriesRef.current = null;
        vwapUpperSeriesRef.current = null;
        vwapLowerSeriesRef.current = null;
        lastBarRef.current = null;
      }
    };
  }, [viewMode]);

  // Synchronize VWAP series visibility
  useEffect(() => {
    if (vwapSeriesRef.current) vwapSeriesRef.current.applyOptions({ visible: showVwap });
    if (vwapUpperSeriesRef.current) vwapUpperSeriesRef.current.applyOptions({ visible: showVwap });
    if (vwapLowerSeriesRef.current) vwapLowerSeriesRef.current.applyOptions({ visible: showVwap });
  }, [showVwap]);

  // 2. Fetch and Load Historical Bars (Only when ticker or timeframe changes)
  const loadBars = useCallback(async () => {
    if (!candleSeriesRef.current || !chartInstanceRef.current) return;
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/market-data/bars?symbol=${encodeURIComponent(ticker)}&timeframe=${timeframe}&limit=1000`);
      const data = await res.json();

      if (data && data.bars && data.bars.length > 0 && candleSeriesRef.current) {
        const seen = new Set();
        const cleanBars: BarWithVolume[] = data.bars
          .filter((b: any) => {
            if (seen.has(b.time)) return false;
            seen.add(b.time);
            return true;
          })
          .sort((a: any, b: any) => a.time - b.time)
          .map((b: any) => ({
            time: b.time as UTCTimestamp,
            open: b.open,
            high: b.high,
            low: b.low,
            close: b.close,
            volume: b.volume || 1000,
          }));

        candleSeriesRef.current.setData(cleanBars);

        // Calculate and plot session-anchored VWAP + ±2σ bands
        const { vwapData, upperData, lowerData } = calculateSessionVwap(cleanBars);
        if (vwapSeriesRef.current) vwapSeriesRef.current.setData(vwapData);
        if (vwapUpperSeriesRef.current) vwapUpperSeriesRef.current.setData(upperData);
        if (vwapLowerSeriesRef.current) vwapLowerSeriesRef.current.setData(lowerData);

        if (vwapData.length > 0) {
          setCurrentVwap({
            vwap: vwapData[vwapData.length - 1].value,
            upper: upperData[upperData.length - 1].value,
            lower: lowerData[lowerData.length - 1].value,
          });
        }

        lastBarRef.current = {
          time: cleanBars[cleanBars.length - 1].time as number,
          open: cleanBars[cleanBars.length - 1].open,
          high: cleanBars[cleanBars.length - 1].high,
          low: cleanBars[cleanBars.length - 1].low,
          close: cleanBars[cleanBars.length - 1].close,
        };

        // Calculate and display historical date range
        const d1 = new Date(cleanBars[0].time * 1000);
        const d2 = new Date(cleanBars[cleanBars.length - 1].time * 1000);
        const f1 = d1.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: cleanBars.length > 200 ? 'numeric' : undefined });
        const f2 = d2.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: cleanBars.length > 200 ? 'numeric' : undefined });
        setBarsSummary(`${cleanBars.length} Bars (${f1} → ${f2})`);

        // Frame the most recent bars so candles fill the view horizontally with clear wicks and bodies
        if (chartInstanceRef.current) {
          const total = cleanBars.length;
          const barsToShow = compact ? 45 : 55;
          chartInstanceRef.current.timeScale().setVisibleLogicalRange({
            from: Math.max(0, total - barsToShow),
            to: total + 2,
          });
        }
      }
    } catch (err) {
      console.error('Failed to load chart bars:', err);
    } finally {
      setLoading(false);
    }
  }, [ticker, timeframe]);

  useEffect(() => {
    if (viewMode === 'levels') {
      loadBars();
      const isCrypto = ['BTC', 'ETH', 'SOL', 'DOGE', 'XRP', 'AVAX', 'LINK', 'ADA'].includes(ticker.toUpperCase());
      const timer = setInterval(() => {
        loadBars();
      }, isCrypto ? 3000 : 10000);
      return () => clearInterval(timer);
    }
  }, [viewMode, loadBars, ticker]);

  // 3. Update Autoscale Info Provider: in 'gex' mode it shows full range; in 'candles' mode it focuses on candles
  useEffect(() => {
    if (!candleSeriesRef.current) return;
    const series = candleSeriesRef.current;

    series.applyOptions({
      autoscaleInfoProvider: (original: () => AutoscaleInfo | null) => {
        const res = original();
        if (!res || !res.priceRange) return res;
        if (zoomMode === 'gex' && (effectiveGex?.call_wall || effectiveGex?.put_wall)) {
          const cw = effectiveGex.call_wall ?? res.priceRange.maxValue;
          const pw = effectiveGex.put_wall ?? res.priceRange.minValue;
          return {
            priceRange: {
              minValue: Math.min(res.priceRange.minValue, pw * 0.998),
              maxValue: Math.max(res.priceRange.maxValue, cw * 1.002),
            },
            margins: { above: 16, below: 16 },
          };
        }
        // In 'candles' mode, standard autoscale around candles
        return res;
      },
    });

    if (chartInstanceRef.current) {
      chartInstanceRef.current.priceScale('right').applyOptions({
        autoScale: true,
      });
    }
  }, [zoomMode, effectiveGex?.call_wall, effectiveGex?.put_wall]);

  // 4. Update Price Lines in place without recreating chart canvas
  useEffect(() => {
    if (!candleSeriesRef.current) return;
    const series = candleSeriesRef.current;

    // Remove old lines cleanly
    if (callWallLineRef.current) { series.removePriceLine(callWallLineRef.current); callWallLineRef.current = null; }
    if (putWallLineRef.current) { series.removePriceLine(putWallLineRef.current); putWallLineRef.current = null; }
    if (flipLineRef.current) { series.removePriceLine(flipLineRef.current); flipLineRef.current = null; }
    if (maxPainLineRef.current) { series.removePriceLine(maxPainLineRef.current); maxPainLineRef.current = null; }

    // Call Wall (Green Resistance)
    if (effectiveGex?.call_wall) {
      callWallLineRef.current = series.createPriceLine({
        price: effectiveGex.call_wall,
        color: '#00ffa3',
        lineWidth: 2,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: `CALL WALL $${effectiveGex.call_wall.toFixed(2)}`,
      });
    }

    // Gamma Flip (Gold Pivot)
    if (effectiveGex?.flip) {
      flipLineRef.current = series.createPriceLine({
        price: effectiveGex.flip,
        color: '#ffd700',
        lineWidth: 2,
        lineStyle: 1, // Dotted
        axisLabelVisible: true,
        title: `GAMMA FLIP $${effectiveGex.flip.toFixed(2)}`,
      });
    }

    // Put Wall (Red Support)
    if (effectiveGex?.put_wall) {
      putWallLineRef.current = series.createPriceLine({
        price: effectiveGex.put_wall,
        color: '#ff2a6d',
        lineWidth: 2,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: `PUT WALL $${effectiveGex.put_wall.toFixed(2)}`,
      });
    }

    // Max Pain (Cyan)
    if (effectiveMaxPain) {
      maxPainLineRef.current = series.createPriceLine({
        price: effectiveMaxPain,
        color: '#38bdf8',
        lineWidth: 1,
        lineStyle: 3,
        axisLabelVisible: true,
        title: `MAX PAIN $${effectiveMaxPain.toFixed(2)}`,
      });
    }
  }, [effectiveGex, effectiveMaxPain]);

  // 5. Move live candle up and down tick-by-tick from 1-second SIP stream (zero flicker)
  useEffect(() => {
    if (livePrice === undefined || livePrice === null || !candleSeriesRef.current || !lastBarRef.current) return;

    const lastBar = lastBarRef.current;
    const nowSec = Math.floor(Date.now() / 1000);
    const tfSec = timeframe === '1m' ? 60 : timeframe === '5m' ? 300 : timeframe === '15m' ? 900 : timeframe === '1h' ? 3600 : 86400;
    const currentBarTime = Math.floor(nowSec / tfSec) * tfSec;
    const targetBarTime = Math.max(lastBar.time, currentBarTime);

    if (targetBarTime > lastBar.time) {
      // New candle opened!
      const newBar = {
        time: targetBarTime as UTCTimestamp,
        open: livePrice,
        high: livePrice,
        low: livePrice,
        close: livePrice,
      };
      lastBarRef.current = {
        time: targetBarTime,
        open: livePrice,
        high: livePrice,
        low: livePrice,
        close: livePrice,
      };
      try { candleSeriesRef.current.update(newBar); } catch (e) { /* ignore */ }
    } else {
      // Update active candle: high, low, close move in real-time!
      const updatedBar = {
        time: lastBar.time as UTCTimestamp,
        open: lastBar.open,
        high: Math.max(lastBar.high, livePrice),
        low: Math.min(lastBar.low, livePrice),
        close: livePrice,
      };
      lastBarRef.current = {
        time: lastBar.time,
        open: lastBar.open,
        high: Math.max(lastBar.high, livePrice),
        low: Math.min(lastBar.low, livePrice),
        close: livePrice,
      };
      try { candleSeriesRef.current.update(updatedBar); } catch (e) { /* ignore */ }
    }
  }, [livePrice, timeframe]);

  // Zoom In button handler
  const handleZoomIn = () => {
    if (!chartInstanceRef.current) return;
    const timeScale = chartInstanceRef.current.timeScale();
    const range = timeScale.getVisibleLogicalRange();
    if (range) {
      const span = range.to - range.from;
      const newSpan = Math.max(8, span * 0.65);
      timeScale.setVisibleLogicalRange({
        from: range.to - newSpan,
        to: range.to + 1,
      });
    }
  };

  // Zoom Out button handler
  const handleZoomOut = () => {
    if (!chartInstanceRef.current) return;
    const timeScale = chartInstanceRef.current.timeScale();
    const range = timeScale.getVisibleLogicalRange();
    if (range) {
      const span = range.to - range.from;
      const newSpan = Math.min(150, span * 1.5);
      timeScale.setVisibleLogicalRange({
        from: range.to - newSpan,
        to: range.to + 3,
      });
    }
  };

  // Reset Zoom / Auto Fit button handler
  const handleResetZoom = () => {
    if (!chartInstanceRef.current) return;
    setZoomMode('candles');
    chartInstanceRef.current.priceScale('right').applyOptions({ autoScale: true });
    const timeScale = chartInstanceRef.current.timeScale();
    const range = timeScale.getVisibleLogicalRange();
    if (range) {
      timeScale.setVisibleLogicalRange({
        from: range.to - 35,
        to: range.to + 4,
      });
    }
  };

  // Toggle GEX Wall full view vs Candles focus
  const toggleZoom = () => {
    setZoomMode((prev) => (prev === 'candles' ? 'gex' : 'candles'));
  };

  const activeDisplayBar = hoverBar || lastBarRef.current;
  const barChange = activeDisplayBar ? activeDisplayBar.close - activeDisplayBar.open : 0;
  const barChangePct = activeDisplayBar && activeDisplayBar.open > 0 ? (barChange / activeDisplayBar.open) * 100 : 0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Chart Control Bar */}
      <div className="flex flex-wrap justify-between items-center mb-1.5 px-1 text-xs gap-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Mode Switcher (Hidden in compact to save space) */}
          {!compact && (
            <div className="flex bg-black/60 rounded-lg p-0.5 border border-white/10">
              <button
                onClick={() => setViewMode('levels')}
                className={`px-2.5 py-1 rounded text-[11px] font-mono flex items-center gap-1.5 transition-all ${
                  viewMode === 'levels'
                    ? 'bg-neon-green/20 text-neon-green border border-neon-green/40 shadow-[0_0_8px_rgba(0,255,163,0.2)] font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers size={12} /> GEX Levels
              </button>
              <button
                onClick={() => setViewMode('tv')}
                className={`px-2.5 py-1 rounded text-[11px] font-mono flex items-center gap-1.5 transition-all ${
                  viewMode === 'tv'
                    ? 'bg-neon-green/20 text-neon-green border border-neon-green/40 shadow-[0_0_8px_rgba(0,255,163,0.2)] font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BarChart3 size={12} /> TradingView Pro
              </button>
            </div>
          )}

          {/* Timeframe Buttons */}
          {viewMode === 'levels' && (
            <div className="flex gap-0.5">
              {(compact ? ['1m', '5m', '15m', '1d'] : ['1m', '5m', '15m', '1h', '1d', '1w']).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2 py-0.5 text-[10px] font-mono uppercase rounded border transition-all ${
                    timeframe === tf
                      ? 'border-neon-green text-neon-green bg-neon-green/10 font-bold shadow-[0_0_6px_rgba(0,255,163,0.2)]'
                      : 'border-white/5 text-slate-400 hover:border-white/20'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          )}

          {/* Zoom Controls (In, Out, Reset) */}
          {viewMode === 'levels' && (
            <div className="flex items-center bg-black/60 rounded-lg p-0.5 border border-white/10 gap-0.5">
              <button
                onClick={handleZoomIn}
                title="Zoom In (Candles larger)"
                className="p-1 text-slate-400 hover:text-neon-green hover:bg-white/5 rounded transition-all"
              >
                <ZoomIn size={12} />
              </button>
              <button
                onClick={handleZoomOut}
                title="Zoom Out (More bars)"
                className="p-1 text-slate-400 hover:text-neon-green hover:bg-white/5 rounded transition-all"
              >
                <ZoomOut size={12} />
              </button>
              <button
                onClick={handleResetZoom}
                title="Reset Zoom (Fit Candles)"
                className="p-1 text-slate-400 hover:text-neon-green hover:bg-white/5 rounded transition-all"
              >
                <Maximize2 size={11} />
              </button>
            </div>
          )}

          {/* Scale Mode Toggler */}
          {viewMode === 'levels' && (
            <button
              onClick={toggleZoom}
              title="Toggle scale between Candlestick focus and Full GEX Wall Range"
              className={`px-2 py-0.5 text-[10px] font-mono rounded border flex items-center gap-1 transition-all ${
                zoomMode === 'candles'
                  ? 'border-neon-green text-neon-green bg-neon-green/15 font-bold shadow-[0_0_8px_rgba(0,255,163,0.2)]'
                  : 'border-neon-gold text-neon-gold bg-neon-gold/15 font-bold shadow-[0_0_8px_rgba(255,215,0,0.2)]'
              }`}
            >
              <Layers size={10} /> {zoomMode === 'candles' ? '⚡ Focus Candles' : '📐 Full GEX'}
            </button>
          )}

          {/* VWAP Indicator Toggle */}
          {viewMode === 'levels' && (
            <button
              onClick={() => setShowVwap(!showVwap)}
              title="Toggle Intraday Anchored VWAP and ±2σ Institutional Volatility Bands"
              className={`px-2 py-0.5 text-[10px] font-mono rounded border flex items-center gap-1 transition-all ${
                showVwap
                  ? 'border-purple-400 text-purple-300 bg-purple-950/40 font-bold shadow-[0_0_8px_rgba(168,85,247,0.25)]'
                  : 'border-white/10 text-slate-400 hover:text-white bg-white/5'
              }`}
            >
              <span>🟣 VWAP {showVwap ? 'ON' : 'OFF'}</span>
            </button>
          )}

          {viewMode === 'levels' && (
            <button
              onClick={loadBars}
              title="Refresh Historical Bars"
              className="text-slate-500 hover:text-neon-green p-1 transition-colors"
            >
              <RefreshCcw size={11} className={loading ? 'animate-spin text-neon-green' : ''} />
            </button>
          )}
        </div>

        {/* Live GEX Level Legend Badges (Visible only on single full chart to prevent toolbar wrapping) */}
        {!compact && (
          <div className="flex items-center gap-2 font-mono text-[10px]">
            {effectiveGex?.call_wall && (
              <span className="px-2 py-0.5 rounded border border-neon-green/30 bg-neon-green/10 text-neon-green font-bold flex items-center gap-1 shadow-[0_0_6px_rgba(0,255,163,0.15)]">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse"></span>
                CALL WALL ${effectiveGex.call_wall.toFixed(2)}
              </span>
            )}
            {effectiveGex?.flip && (
              <span className="px-2 py-0.5 rounded border border-neon-gold/30 bg-neon-gold/10 text-neon-gold font-bold flex items-center gap-1 shadow-[0_0_6px_rgba(255,215,0,0.15)]">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-gold"></span>
                FLIP ${effectiveGex.flip.toFixed(2)}
              </span>
            )}
            {effectiveGex?.put_wall && (
              <span className="px-2 py-0.5 rounded border border-neon-red/30 bg-neon-red/10 text-neon-red font-bold flex items-center gap-1 shadow-[0_0_6px_rgba(255,42,109,0.15)]">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-red"></span>
                PUT WALL ${effectiveGex.put_wall.toFixed(2)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Chart Canvas Container */}
      <div 
        className="flex-1 w-full relative rounded-lg border border-white/10 bg-[#070a13] overflow-hidden shadow-2xl flex flex-col"
        style={{ minHeight: `${chartHeight}px`, height: `${chartHeight}px` }}
      >
        {/* Pro HUD Over Canvas */}
        {viewMode === 'levels' && (
          <div className="absolute top-2 left-2 z-10 pointer-events-none flex items-center gap-2 font-mono text-[10px] bg-black/80 backdrop-blur-md px-2 py-0.5 rounded border border-white/10 shadow-lg">
            <span className="font-bold text-white tracking-wider flex items-center gap-1">
              <Activity size={10} className="text-neon-green animate-pulse" />
              {ticker} {timeframe.toUpperCase()}
            </span>
            {activeDisplayBar && (
              <>
                {!compact && (
                  <>
                    <span className="text-slate-400">O: <strong className="text-white">${activeDisplayBar.open.toFixed(2)}</strong></span>
                    <span className="text-slate-400">H: <strong className="text-white">${activeDisplayBar.high.toFixed(2)}</strong></span>
                    <span className="text-slate-400">L: <strong className="text-white">${activeDisplayBar.low.toFixed(2)}</strong></span>
                  </>
                )}
                <span className="text-slate-400">C: <strong className={barChange >= 0 ? 'text-neon-green' : 'text-neon-red'}>${activeDisplayBar.close.toFixed(2)}</strong></span>
                <span className={`font-bold ${barChange >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                  {barChange > 0 ? '+' : ''}{barChange.toFixed(2)} ({barChangePct > 0 ? '+' : ''}{barChangePct.toFixed(2)}%)
                </span>
              </>
            )}
            {livePrice && (
              <span className="text-neon-green font-bold pl-1.5 border-l border-white/20">
                LIVE: ${livePrice.toFixed(2)}
              </span>
            )}
            {showVwap && currentVwap && (
              <span className="text-purple-300 font-bold pl-1.5 border-l border-white/20">
                VWAP: ${currentVwap.vwap.toFixed(2)}
              </span>
            )}
            {barsSummary && !compact && (
              <span className="text-slate-400 font-normal pl-2 border-l border-white/20 hidden lg:inline">
                {barsSummary}
              </span>
            )}
          </div>
        )}

        {/* Floating Pro Boundary Indicator Flags (Visible only on single chart) */}
        {!compact && viewMode === 'levels' && effectiveGex?.call_wall && (
          <div 
            onClick={() => setZoomMode('gex')}
            className="absolute top-12 right-3 z-10 cursor-pointer bg-neon-green/10 hover:bg-neon-green/20 border border-neon-green/40 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-neon-green font-bold flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(0,255,163,0.2)]"
            title="Click to scale chart to Call Wall"
          >
            <span>▲ RESISTANCE CALL WALL: ${effectiveGex.call_wall.toFixed(2)}</span>
            {livePrice && (
              <span className="text-slate-400 font-normal">
                ({(((effectiveGex.call_wall - livePrice) / livePrice) * 100) > 0 ? '+' : ''}{(((effectiveGex.call_wall - livePrice) / livePrice) * 100).toFixed(2)}%)
              </span>
            )}
          </div>
        )}

        {!compact && viewMode === 'levels' && effectiveGex?.put_wall && (
          <div 
            onClick={() => setZoomMode('gex')}
            className="absolute bottom-6 right-3 z-10 cursor-pointer bg-neon-red/10 hover:bg-neon-red/20 border border-neon-red/40 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-neon-red font-bold flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(255,42,109,0.2)]"
            title="Click to scale chart to Put Wall"
          >
            <span>▼ SUPPORT PUT WALL: ${effectiveGex.put_wall.toFixed(2)}</span>
            {livePrice && (
              <span className="text-slate-400 font-normal">
                ({(((effectiveGex.put_wall - livePrice) / livePrice) * 100).toFixed(2)}%)
              </span>
            )}
          </div>
        )}

        {viewMode === 'levels' ? (
          <div ref={chartContainerRef} className="w-full h-full" style={{ minHeight: `${chartHeight}px` }} />
        ) : (
          <iframe
            key={ticker}
            src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_widget&symbol=${encodeURIComponent(
              ticker
            )}&interval=D&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=[]&theme=dark&style=1&timezone=exchange&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=en`}
            className="w-full h-full border-0"
            style={{ minHeight: `${chartHeight}px` }}
            title="TradingView Chart"
          />
        )}
      </div>
    </div>
  );
}
