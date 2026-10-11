import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  BarChart3, TrendingUp, Award, RefreshCw, 
  ArrowUpRight, ArrowDownRight, DollarSign, CheckCircle2 
} from 'lucide-react';
import { HelpButton } from './CardExplainerModal';
import { API_BASE as SERVER_URL } from './config';

const API_BASE = `${SERVER_URL}/api`;

interface EquityPoint {
  date: string;
  equity: number;
  drawdown_pct?: number;
}

interface TradeLog {
  entry_date: string;
  entry_price: number;
  strategy: string;
  exit_date: string;
  exit_price: number;
  return_pct: number;
  gross_return_pct?: number;
}

interface RankingItem {
  strategy: string;
  strategy_label: string;
  total_return_pct: number;
  win_rate_pct: number;
  total_trades: number;
  profit_factor: number;
  sharpe_ratio: number;
  max_drawdown_pct: number;
  expectancy_pct: number;
  rank: number;
}

interface BacktestData {
  ticker: string;
  strategy?: string;
  strategy_label?: string;
  roi?: string;
  total_return_pct?: number;
  buy_and_hold_return_pct?: number;
  vs_buy_and_hold_pct?: number;
  sharpe_ratio?: number | string;
  max_drawdown?: string;
  max_drawdown_pct?: number;
  total_trades?: number;
  winning_trades?: number;
  losing_trades?: number;
  win_rate_pct?: number;
  profit_factor?: number;
  expectancy_pct?: number;
  verdict?: string;
  robustness_score?: number;
  equity_curve?: EquityPoint[];
  recent_trades?: TradeLog[];
  winner?: string;
  ranking?: RankingItem[];
  candles_analyzed?: number;
  date_from?: string;
  date_to?: string;
  error?: string;
}

const STRATEGIES = [
  { id: 'bollinger', name: 'Bollinger Band Mean Reversion', desc: 'Buys lower band pierce, exits at SMA-20 center' },
  { id: 'rsi', name: 'RSI Oversold/Overbought', desc: 'Buys RSI < 30 dip, sells on momentum recovery > 70' },
  { id: 'supertrend', name: 'Supertrend ATR Trend', desc: 'ATR-based trailing stop for high-momentum runs' },
  { id: 'macd', name: 'MACD Signal Cross', desc: 'MACD line crossing signal line with momentum' },
  { id: 'ema_cross', name: 'EMA 20/50 Golden Cross', desc: 'Fast moving average crossing above institutional trend' },
  { id: 'donchian', name: 'Donchian Channel Breakout', desc: 'Buys 20-period highest high, exits at channel midline' },
];

const PERIODS = ['3mo', '6mo', '1y', '2y'];
const TIMEFRAMES = [
  { id: '1d', label: '1D (Daily)' },
  { id: '1h', label: '1H (Hourly)' },
];

interface Props {
  initialTicker?: string;
  onSelectTicker?: (ticker: string) => void;
}

export const StrategyBacktestLab: React.FC<Props> = ({ initialTicker = 'SPY', onSelectTicker }) => {
  const [ticker, setTicker] = useState(initialTicker);
  const [inputTicker, setInputTicker] = useState(initialTicker);
  const [strategy, setStrategy] = useState('bollinger');
  const [period, setPeriod] = useState('1y');
  const [timeframe, setTimeframe] = useState('1d');
  const [viewMode, setViewMode] = useState<'single' | 'compare'>('single');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BacktestData | null>(null);
  const [hoverPoint, setHoverPoint] = useState<EquityPoint | null>(null);

  // Sync initialTicker if changed externally
  useEffect(() => {
    if (initialTicker && initialTicker !== ticker) {
      setTicker(initialTicker);
      setInputTicker(initialTicker);
    }
  }, [initialTicker]);

  const executeBacktest = useCallback(async (
    targetTicker = ticker, 
    targetStrat = strategy, 
    targetPeriod = period, 
    targetTf = timeframe,
    targetMode = viewMode
  ) => {
    setLoading(true);
    try {
      const url = `${API_BASE}/backtest?ticker=${encodeURIComponent(targetTicker)}&strategy=${targetStrat}&period=${targetPeriod}&timeframe=${targetTf}&mode=${targetMode}`;
      const res = await fetch(url);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Backtest error:', e);
      setData({ ticker: targetTicker, error: String(e) });
    } finally {
      setLoading(false);
    }
  }, [ticker, strategy, period, timeframe, viewMode]);

  useEffect(() => {
    executeBacktest();
  }, [ticker, strategy, period, timeframe, viewMode, executeBacktest]);

  const handleApplyTicker = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputTicker.toUpperCase().trim();
    if (clean) {
      setTicker(clean);
      if (onSelectTicker) onSelectTicker(clean);
    }
  };

  // SVG Equity Curve Calculation
  const curvePoints = useMemo(() => {
    if (!data?.equity_curve || data.equity_curve.length < 2) return null;
    const pts = data.equity_curve;
    const equities = pts.map(p => p.equity);
    const minEq = Math.min(...equities) * 0.98;
    const maxEq = Math.max(...equities) * 1.02;
    const range = maxEq - minEq || 1;

    const width = 600;
    const height = 160;
    const padding = 20;

    const coords = pts.map((p, idx) => {
      const x = padding + (idx / (pts.length - 1)) * (width - padding * 2);
      const y = height - padding - ((p.equity - minEq) / range) * (height - padding * 2);
      return { x, y, point: p };
    });

    const pathD = coords.reduce((acc, c, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)},${c.y.toFixed(1)}`, '');
    const fillD = `${pathD} L ${coords[coords.length - 1].x.toFixed(1)},${height} L ${coords[0].x.toFixed(1)},${height} Z`;

    const baselineY = height - padding - ((10000 - minEq) / range) * (height - padding * 2);

    return { coords, pathD, fillD, baselineY, minEq, maxEq, width, height };
  }, [data?.equity_curve]);

  const returnVal = data?.total_return_pct ?? 0;
  const isPositive = returnVal >= 0;

  return (
    <div className="glass-panel p-5 mt-6 border border-white/10 rounded-2xl bg-gradient-to-b from-slate-900/90 to-black/95 shadow-2xl relative overflow-hidden">
      {/* Background ambient glow */}
      <div className={`absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20 ${isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`} />

      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green shadow-inner">
            <BarChart3 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide uppercase">
                Quantitative Strategy Lab & Backtest Engine
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/5 border border-white/10 text-slate-300">
                WALK-FORWARD v3
              </span>
              <HelpButton cardId="backtest" title="Explain Strategy Lab & Backtest Metrics" />
            </div>
            <p className="text-xs text-slate-400">
              Institutional algorithmic validation · Realistic slippage & commissions · Overfitting detection
            </p>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setViewMode('single')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'single' 
                ? 'bg-neon-green text-black font-bold shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Single Strategy & Curve
          </button>
          <button
            onClick={() => setViewMode('compare')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              viewMode === 'compare' 
                ? 'bg-neon-green text-black font-bold shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Award size={13} />
            6-Strategy Leaderboard
          </button>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-3 my-4">
        {/* Ticker Search */}
        <form onSubmit={handleApplyTicker} className="col-span-1 md:col-span-1">
          <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Asset Symbol</label>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={inputTicker}
              onChange={(e) => setInputTicker(e.target.value.toUpperCase())}
              placeholder="SPY / BTC"
              className="w-full bg-black/50 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono uppercase outline-none focus:border-neon-green"
            />
            <button
              type="submit"
              className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-colors"
            >
              Go
            </button>
          </div>
        </form>

        {/* Strategy Selector (if single mode) */}
        {viewMode === 'single' && (
          <div className="col-span-1 md:col-span-2">
            <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Trading Strategy</label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              className="w-full bg-black/50 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-neon-green"
            >
              {STRATEGIES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Period Selector */}
        <div className="col-span-1">
          <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Lookback Period</label>
          <div className="grid grid-cols-4 gap-1">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`py-1.5 rounded text-xs font-mono transition-colors text-center ${
                  period === p 
                    ? 'bg-neon-green/20 border border-neon-green/40 text-neon-green font-bold' 
                    : 'bg-black/40 border border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Timeframe Selector */}
        <div className="col-span-1">
          <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Bar Interval</label>
          <div className="grid grid-cols-2 gap-1">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id)}
                className={`py-1.5 rounded text-xs font-mono transition-colors text-center ${
                  timeframe === tf.id 
                    ? 'bg-neon-green/20 border border-neon-green/40 text-neon-green font-bold' 
                    : 'bg-black/40 border border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {tf.id.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Re-run button */}
        <div className="col-span-1 flex items-end">
          <button
            onClick={() => executeBacktest()}
            disabled={loading}
            className="w-full py-2 bg-neon-green text-black font-bold text-xs rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 shadow-md shadow-neon-green/20 disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Simulating...' : 'Execute Backtest'}
          </button>
        </div>
      </div>

      {/* QUICK TICKER PILLS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none text-[11px] font-mono">
        <span className="text-slate-500 text-[10px] mr-1 uppercase">Quick Test:</span>
        {['SPY', 'QQQ', 'NVDA', 'AAPL', 'TSLA', 'BTC', 'ETH', 'SOL'].map((sym) => (
          <button
            key={sym}
            onClick={() => {
              setTicker(sym);
              setInputTicker(sym);
              if (onSelectTicker) onSelectTicker(sym);
            }}
            className={`px-2 py-0.5 rounded border transition-colors ${
              ticker === sym 
                ? 'bg-neon-green/20 border-neon-green text-neon-green font-bold' 
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            {sym}
          </button>
        ))}
      </div>

      {/* ===================== VIEW MODE 1: SINGLE STRATEGY ===================== */}
      {viewMode === 'single' && (
        <div className="mt-4 space-y-4">
          {/* Key Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
            <div className="bg-black/40 border border-white/10 rounded-xl p-3">
              <div className="text-[10px] text-slate-400 uppercase font-mono">Strategy ROI</div>
              <div className={`text-xl font-bold font-mono mt-0.5 ${isPositive ? 'text-neon-green' : 'text-neon-red'}`}>
                {data?.total_return_pct !== undefined ? `${data.total_return_pct > 0 ? '+' : ''}${data.total_return_pct.toFixed(1)}%` : (data?.roi || '--')}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                B&H: {data?.buy_and_hold_return_pct !== undefined ? `${data.buy_and_hold_return_pct.toFixed(1)}%` : '--'}
              </div>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-xl p-3">
              <div className="text-[10px] text-slate-400 uppercase font-mono">Sharpe Ratio</div>
              <div className="text-xl font-bold font-mono text-white mt-0.5">
                {typeof data?.sharpe_ratio === 'number' ? data.sharpe_ratio.toFixed(2) : (data?.sharpe_ratio || '--')}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                {Number(data?.sharpe_ratio || 0) >= 1.5 ? 'Excellent' : Number(data?.sharpe_ratio || 0) >= 0.8 ? 'Acceptable' : 'Low edge'}
              </div>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-xl p-3">
              <div className="text-[10px] text-slate-400 uppercase font-mono">Win Rate</div>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                {data?.win_rate_pct !== undefined ? `${data.win_rate_pct.toFixed(0)}%` : '--'}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                {data?.winning_trades ?? 0}W / {data?.losing_trades ?? 0}L
              </div>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-xl p-3">
              <div className="text-[10px] text-slate-400 uppercase font-mono">Max Drawdown</div>
              <div className="text-xl font-bold font-mono text-neon-red mt-0.5">
                {data?.max_drawdown_pct !== undefined ? `${data.max_drawdown_pct.toFixed(1)}%` : (data?.max_drawdown || '--')}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                Capital Protection
              </div>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-xl p-3">
              <div className="text-[10px] text-slate-400 uppercase font-mono">Profit Factor</div>
              <div className="text-xl font-bold font-mono text-amber-300 mt-0.5">
                {data?.profit_factor !== undefined ? (data.profit_factor > 99 ? '∞' : data.profit_factor.toFixed(2)) : '--'}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                Trades: {data?.total_trades ?? '--'}
              </div>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-xl p-3 flex flex-col justify-between">
              <div className="text-[10px] text-slate-400 uppercase font-mono">Overfit Verdict</div>
              <div className="mt-0.5">
                <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase inline-block ${
                  data?.verdict === 'ROBUST' ? 'bg-neon-green/20 text-neon-green border border-neon-green/40' :
                  data?.verdict === 'ACCEPTABLE' || data?.verdict === 'MODERATE' ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40' :
                  data?.verdict === 'OVERFITTED' ? 'bg-neon-red/20 text-neon-red border border-neon-red/40' :
                  'bg-white/10 text-slate-300'
                }`}>
                  {data?.verdict || 'ANALYZING'}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                Robustness: {data?.robustness_score ? `${Math.round(data.robustness_score * 100)}%` : '--'}
              </div>
            </div>
          </div>

          {/* Interactive Equity Curve Chart */}
          <div className="bg-black/50 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp size={15} className="text-neon-green" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Portfolio Equity Trajectory ($10,000 Starting Capital)
                </span>
              </div>
              {hoverPoint ? (
                <div className="text-xs font-mono text-neon-green bg-black/60 px-2 py-0.5 rounded border border-neon-green/30">
                  {hoverPoint.date}: <span className="font-bold">${hoverPoint.equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              ) : (
                <div className="text-[11px] font-mono text-slate-400">
                  Span: {data?.date_from || '--'} → {data?.date_to || '--'}
                </div>
              )}
            </div>

            {/* SVG Visualizer */}
            {curvePoints ? (
              <div className="relative w-full overflow-hidden">
                <svg
                  viewBox={`0 0 ${curvePoints.width} ${curvePoints.height}`}
                  className="w-full h-44 cursor-crosshair overflow-visible"
                >
                  <defs>
                    <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={isPositive ? '#00FF66' : '#FF3366'} stopOpacity="0.35" />
                      <stop offset="100%" stopColor={isPositive ? '#00FF66' : '#FF3366'} stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* $10,000 Baseline */}
                  <line
                    x1="20"
                    y1={curvePoints.baselineY}
                    x2={curvePoints.width - 20}
                    y2={curvePoints.baselineY}
                    stroke="#ffffff"
                    strokeOpacity="0.15"
                    strokeDasharray="4 4"
                  />

                  {/* Area fill */}
                  <path d={curvePoints.fillD} fill="url(#equityGrad)" />

                  {/* Main equity line */}
                  <path
                    d={curvePoints.pathD}
                    fill="none"
                    stroke={isPositive ? '#00FF66' : '#FF3366'}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Interactive Nodes */}
                  {curvePoints.coords.map((c, i) => (
                    <circle
                      key={i}
                      cx={c.x}
                      cy={c.y}
                      r={hoverPoint?.date === c.point.date ? 5 : 2.5}
                      fill={isPositive ? '#00FF66' : '#FF3366'}
                      stroke="#000"
                      strokeWidth="1.5"
                      className="transition-all hover:scale-150 cursor-pointer"
                      onMouseEnter={() => setHoverPoint(c.point)}
                      onMouseLeave={() => setHoverPoint(null)}
                    />
                  ))}
                </svg>
                <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                  <span>Start: $10,000.00</span>
                  <span className="text-slate-400">Baseline Break-Even</span>
                  <span className={isPositive ? 'text-neon-green font-bold' : 'text-neon-red font-bold'}>
                    Final: ${(10000 * (1 + (data?.total_return_pct ?? 0) / 100)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-xs text-slate-500 font-mono">
                {loading ? 'Simulating candle-by-candle equity curve...' : 'No trades triggered for selected parameters.'}
              </div>
            )}
          </div>

          {/* Trade Execution History Log */}
          {data?.recent_trades && data.recent_trades.length > 0 && (
            <div className="bg-black/40 border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign size={14} className="text-amber-400" />
                  Recent Simulated Trades ({data.recent_trades.length})
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Slippage: 0.05% · Commission: 0.10%
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-500 text-[10px] uppercase">
                      <th className="pb-2">Entry Date</th>
                      <th className="pb-2">Entry Price</th>
                      <th className="pb-2">Exit Date</th>
                      <th className="pb-2">Exit Price</th>
                      <th className="pb-2 text-right">Net PnL %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.recent_trades.map((t, idx) => {
                      const win = t.return_pct >= 0;
                      return (
                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                          <td className="py-2 text-slate-300">{t.entry_date}</td>
                          <td className="py-2 font-semibold text-white">${t.entry_price.toFixed(2)}</td>
                          <td className="py-2 text-slate-300">{t.exit_date}</td>
                          <td className="py-2 font-semibold text-white">${t.exit_price.toFixed(2)}</td>
                          <td className={`py-2 text-right font-bold flex items-center justify-end gap-1 ${win ? 'text-neon-green' : 'text-neon-red'}`}>
                            {win ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                            {win ? '+' : ''}{t.return_pct.toFixed(2)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== VIEW MODE 2: 6-STRATEGY COMPARATIVE LEADERBOARD ===================== */}
      {viewMode === 'compare' && (
        <div className="mt-4 space-y-4">
          <div className="bg-black/50 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Award size={16} className="text-amber-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Strategy Performance Leaderboard for {ticker} ({period.toUpperCase()})
                </h3>
              </div>
              {data?.winner && (
                <div className="text-xs font-mono bg-neon-green/10 border border-neon-green/30 text-neon-green px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-bold">
                  <CheckCircle2 size={13} />
                  Top Performer: {STRATEGIES.find(s => s.id === data.winner)?.name || data.winner}
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/10 text-slate-500 text-[10px] uppercase">
                    <th className="pb-2 w-12 text-center">Rank</th>
                    <th className="pb-2">Strategy Algorithm</th>
                    <th className="pb-2 text-right">Total ROI</th>
                    <th className="pb-2 text-right">Win Rate</th>
                    <th className="pb-2 text-right">Profit Factor</th>
                    <th className="pb-2 text-right">Sharpe</th>
                    <th className="pb-2 text-right">Max DD</th>
                    <th className="pb-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data?.ranking && data.ranking.length > 0 ? (
                    data.ranking.map((row) => {
                      const isWinner = row.rank === 1;
                      const pos = row.total_return_pct >= 0;
                      return (
                        <tr 
                          key={row.strategy} 
                          className={`hover:bg-white/5 transition-colors ${isWinner ? 'bg-amber-400/5' : ''}`}
                        >
                          <td className="py-3 text-center">
                            {isWinner ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/40 text-xs">
                                🥇
                              </span>
                            ) : (
                              <span className="text-slate-500 font-bold">#{row.rank}</span>
                            )}
                          </td>
                          <td className="py-3">
                            <div className="font-bold text-white">{row.strategy_label}</div>
                            <div className="text-[10px] text-slate-500">
                              {STRATEGIES.find(s => s.id === row.strategy)?.desc}
                            </div>
                          </td>
                          <td className={`py-3 text-right font-bold text-sm ${pos ? 'text-neon-green' : 'text-neon-red'}`}>
                            {pos ? '+' : ''}{row.total_return_pct.toFixed(1)}%
                          </td>
                          <td className="py-3 text-right text-emerald-400">
                            {row.win_rate_pct.toFixed(0)}%
                            <span className="text-[10px] text-slate-500 block">({row.total_trades} trades)</span>
                          </td>
                          <td className="py-3 text-right text-amber-300">
                            {row.profit_factor > 99 ? '∞' : row.profit_factor.toFixed(2)}
                          </td>
                          <td className="py-3 text-right text-white font-semibold">
                            {row.sharpe_ratio.toFixed(2)}
                          </td>
                          <td className="py-3 text-right text-neon-red">
                            {row.max_drawdown_pct.toFixed(1)}%
                          </td>
                          <td className="py-3 text-center">
                            <button
                              onClick={() => {
                                setStrategy(row.strategy);
                                setViewMode('single');
                              }}
                              className="px-2.5 py-1 rounded bg-white/10 hover:bg-neon-green hover:text-black text-slate-300 text-[11px] font-bold transition-all"
                            >
                              Inspect Curve →
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                        {loading ? 'Evaluating all 6 strategy variants against historical price action...' : 'No comparison data available.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
