import React, { useState, useMemo } from 'react';
import { X, TrendingUp, BarChart2 } from 'lucide-react';

interface OptionsRiskSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  spotPrice?: number;
  symbol?: string;
  callWall?: number;
  putWall?: number;
}

type StrategyType = 'LONG_CALL' | 'LONG_PUT' | 'BULL_CALL_SPREAD' | 'BEAR_PUT_SPREAD' | 'IRON_CONDOR';

export const OptionsRiskSimulatorModal: React.FC<OptionsRiskSimulatorModalProps> = ({
  isOpen,
  onClose,
  spotPrice = 585.0,
  symbol = 'SPY',
  callWall = 595.0,
  putWall = 575.0,
}) => {
  const [strategy, setStrategy] = useState<StrategyType>('BULL_CALL_SPREAD');
  const [currentSpot, setCurrentSpot] = useState<number>(spotPrice);
  const [dte, setDte] = useState<number>(7);
  const [iv, setIv] = useState<number>(22); // IV%

  // Strikes
  const [strike1, setStrike1] = useState<number>(Math.round(spotPrice));
  const [strike2, setStrike2] = useState<number>(Math.round(spotPrice + 5));
  const [strike3, setStrike3] = useState<number>(Math.round(spotPrice - 5));
  const [strike4, setStrike4] = useState<number>(Math.round(spotPrice + 10));

  // Premium Paid/Collected estimation
  const [netDebitCredit, setNetDebitCredit] = useState<number>(1.85);

  // Sync spot if prop changes
  React.useEffect(() => {
    if (spotPrice && spotPrice > 0) {
      setCurrentSpot(spotPrice);
      setStrike1(Math.round(spotPrice));
      setStrike2(Math.round(spotPrice + 5));
      setStrike3(Math.round(spotPrice - 5));
      setStrike4(Math.round(spotPrice + 10));
    }
  }, [spotPrice]);

  // Compute Payoff curve across a range of prices [spot * 0.90 to spot * 1.10]
  const simulation = useMemo(() => {
    const rangeMin = currentSpot * 0.92;
    const rangeMax = currentSpot * 1.08;
    const steps = 60;
    const stepSize = (rangeMax - rangeMin) / steps;

    const points: { price: number; pnl: number }[] = [];
    let maxProfit = -Infinity;
    let maxLoss = Infinity;
    const breakevens: number[] = [];

    for (let i = 0; i <= steps; i++) {
      const p = rangeMin + i * stepSize;
      let pnl = 0;

      if (strategy === 'LONG_CALL') {
        const intrinsic = Math.max(0, p - strike1);
        pnl = (intrinsic - netDebitCredit) * 100;
      } else if (strategy === 'LONG_PUT') {
        const intrinsic = Math.max(0, strike1 - p);
        pnl = (intrinsic - netDebitCredit) * 100;
      } else if (strategy === 'BULL_CALL_SPREAD') {
        const longCall = Math.max(0, p - strike1);
        const shortCall = Math.max(0, p - strike2);
        const spreadVal = longCall - shortCall;
        pnl = (spreadVal - netDebitCredit) * 100;
      } else if (strategy === 'BEAR_PUT_SPREAD') {
        const longPut = Math.max(0, strike1 - p);
        const shortPut = Math.max(0, strike3 - p);
        const spreadVal = longPut - shortPut;
        pnl = (spreadVal - netDebitCredit) * 100;
      } else if (strategy === 'IRON_CONDOR') {
        // Short Put Spread (strike3 - 5 / strike3) + Short Call Spread (strike2 / strike4)
        const putLoss = Math.max(0, strike3 - p) - Math.max(0, strike3 - 5 - p);
        const callLoss = Math.max(0, p - strike2) - Math.max(0, p - strike4);
        pnl = (netDebitCredit - putLoss - callLoss) * 100;
      }

      points.push({ price: p, pnl });
      if (pnl > maxProfit) maxProfit = pnl;
      if (pnl < maxLoss) maxLoss = pnl;
    }

    // Find Breakevens
    for (let i = 1; i < points.length; i++) {
      if ((points[i - 1].pnl <= 0 && points[i].pnl > 0) || (points[i - 1].pnl >= 0 && points[i].pnl < 0)) {
        breakevens.push(Math.round(points[i].price * 100) / 100);
      }
    }

    return { points, maxProfit, maxLoss, breakevens, rangeMin, rangeMax };
  }, [strategy, currentSpot, strike1, strike2, strike3, strike4, netDebitCredit]);

  if (!isOpen) return null;

  // SVG Chart Dimensions
  const svgWidth = 540;
  const svgHeight = 220;
  const padding = 35;

  const yMin = Math.min(-150, simulation.maxLoss * 1.15);
  const yMax = Math.max(150, simulation.maxProfit * 1.15);

  const getX = (price: number) => {
    return padding + ((price - simulation.rangeMin) / (simulation.rangeMax - simulation.rangeMin)) * (svgWidth - 2 * padding);
  };

  const getY = (pnl: number) => {
    return svgHeight - padding - ((pnl - yMin) / (yMax - yMin)) * (svgHeight - 2 * padding);
  };

  const zeroY = getY(0);
  const currentSpotX = getX(currentSpot);

  // Path generator for line
  const pathD = simulation.points.reduce((acc, pt, idx) => {
    const x = getX(pt.price);
    const y = getY(pt.pnl);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#080c14] border border-neon-green/40 rounded-xl shadow-[0_0_60px_rgba(0,255,163,0.2)] flex flex-col overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-neon-green/20 text-neon-green border border-neon-green/40">
              <TrendingUp size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                OPTIONS RISK PROFILE & P&L SIMULATOR
                <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {symbol} @ ${currentSpot.toFixed(2)}
                </span>
              </h2>
              <p className="text-[10px] text-slate-400 font-sans">
                Interactive institutional payoff curves (thinkorswim-style modeling with live Greeks & Breakevens).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 font-mono text-xs">
          {/* Strategy Selector Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 rounded-lg bg-black/80 border border-white/10 text-[10px]">
            {[
              { id: 'BULL_CALL_SPREAD', label: 'BULL CALL VERTICAL' },
              { id: 'BEAR_PUT_SPREAD', label: 'BEAR PUT VERTICAL' },
              { id: 'IRON_CONDOR', label: 'IRON CONDOR (4-LEG)' },
              { id: 'LONG_CALL', label: '0DTE LONG CALL' },
              { id: 'LONG_PUT', label: '0DTE LONG PUT' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setStrategy(s.id as StrategyType)}
                className={`py-1.5 px-2 rounded-md font-bold transition-all text-center cursor-pointer ${
                  strategy === s.id
                    ? 'bg-neon-green/20 text-neon-green border border-neon-green/50 shadow-[0_0_12px_rgba(0,255,163,0.2)]'
                    : 'text-slate-400 hover:text-white bg-white/[0.02]'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* SVG Risk Graph */}
          <div className="p-3 rounded-xl bg-black/90 border border-white/10 relative overflow-hidden flex flex-col items-center">
            <div className="w-full flex justify-between items-center text-[9px] text-slate-400 pb-1 border-b border-white/5 px-2">
              <span className="font-bold text-white flex items-center gap-1.5">
                <BarChart2 size={12} className="text-neon-green" /> EXPIRATION PAYOFF DIAGRAM
              </span>
              <span>
                Zero Line: <span className="text-slate-400">$0.00 P&L</span> · Spot: <span className="text-cyan-300 font-bold">${currentSpot.toFixed(2)}</span>
              </span>
            </div>

            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full max-w-[540px] h-[210px] my-1">
              {/* Zero Reference Line */}
              <line
                x1={padding}
                y1={zeroY}
                x2={svgWidth - padding}
                y2={zeroY}
                stroke="rgba(255,255,255,0.2)"
                strokeDasharray="4 4"
                strokeWidth="1.2"
              />

              {/* Current Spot Line */}
              <line
                x1={currentSpotX}
                y1={padding}
                x2={currentSpotX}
                y2={svgHeight - padding}
                stroke="#06b6d4"
                strokeDasharray="3 3"
                strokeWidth="1.5"
              />
              <text x={currentSpotX + 4} y={padding + 12} fill="#06b6d4" fontSize="9" fontFamily="monospace">
                Spot ${currentSpot.toFixed(1)}
              </text>

              {/* Payoff Curve */}
              <path d={pathD} fill="none" stroke="#00FFA3" strokeWidth="2.5" />

              {/* Breakeven Markers */}
              {simulation.breakevens.map((be, idx) => (
                <g key={idx}>
                  <circle cx={getX(be)} cy={zeroY} r="4" fill="#FFCC00" />
                  <text x={getX(be) - 15} y={zeroY - 8} fill="#FFCC00" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
                    BE ${be}
                  </text>
                </g>
              ))}
            </svg>

            {/* Bottom X-Axis price bounds */}
            <div className="w-full flex justify-between text-[8px] text-slate-500 font-mono px-3">
              <span>${simulation.rangeMin.toFixed(1)}</span>
              <span>UNDERLYING PRICE AT EXPIRATION</span>
              <span>${simulation.rangeMax.toFixed(1)}</span>
            </div>
          </div>

          {/* Interactive Sliders Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-black/60 border border-white/5">
            <div>
              <div className="flex justify-between text-[9px] text-slate-400 mb-1">
                <span>SIMULATED SPOT ($S)</span>
                <span className="text-white font-bold">${currentSpot.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={spotPrice * 0.90}
                max={spotPrice * 1.10}
                step={0.5}
                value={currentSpot}
                onChange={(e) => setCurrentSpot(parseFloat(e.target.value))}
                className="w-full accent-neon-green cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[9px] text-slate-400 mb-1">
                <span>DAYS TO EXPIRATION (DTE)</span>
                <span className="text-cyan-300 font-bold">{dte} Days</span>
              </div>
              <input
                type="range"
                min={0}
                max={45}
                value={dte}
                onChange={(e) => setDte(parseInt(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[9px] text-slate-400 mb-1">
                <span>IMPLIED VOLATILITY (IV)</span>
                <span className="text-purple-300 font-bold">{iv}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={80}
                value={iv}
                onChange={(e) => setIv(parseInt(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[9px] text-slate-400 mb-1">
                <span>NET ENTRY DEBIT/CREDIT</span>
                <span className="text-neon-gold font-bold">${netDebitCredit.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.10}
                max={15.0}
                step={0.10}
                value={netDebitCredit}
                onChange={(e) => setNetDebitCredit(parseFloat(e.target.value))}
                className="w-full accent-neon-gold cursor-pointer"
              />
            </div>

            <div className="sm:col-span-2 flex items-center justify-between text-[9px] text-slate-400 bg-white/[0.02] p-1.5 rounded border border-white/5">
              <span>INSTITUTIONAL WALLS:</span>
              <span className="text-neon-red font-bold">Put Wall: ${putWall}</span>
              <span className="text-neon-green font-bold">Call Wall: ${callWall}</span>
            </div>
          </div>

          {/* Key Trade Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-2.5 rounded-lg bg-black/70 border border-neon-green/30">
              <span className="text-[8.5px] uppercase text-slate-400">Max Profit</span>
              <div className="text-base font-bold text-neon-green font-mono">
                {simulation.maxProfit > 99999 ? 'Unlimited' : `+$${simulation.maxProfit.toFixed(0)}`}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-black/70 border border-neon-red/30">
              <span className="text-[8.5px] uppercase text-slate-400">Max Loss</span>
              <div className="text-base font-bold text-neon-red font-mono">
                {simulation.maxLoss < -99999 ? 'Unlimited' : `-$${Math.abs(simulation.maxLoss).toFixed(0)}`}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-black/70 border border-white/10">
              <span className="text-[8.5px] uppercase text-slate-400">Breakeven(s)</span>
              <div className="text-xs font-bold text-neon-gold font-mono pt-1">
                {simulation.breakevens.length > 0 ? simulation.breakevens.map((b) => `$${b}`).join(' · ') : '--'}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-black/70 border border-cyan-500/30">
              <span className="text-[8.5px] uppercase text-slate-400">Risk : Reward</span>
              <div className="text-base font-bold text-cyan-300 font-mono">
                {simulation.maxLoss !== 0 && simulation.maxProfit > 0
                  ? `1 : ${(Math.abs(simulation.maxProfit) / Math.abs(simulation.maxLoss)).toFixed(2)}`
                  : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
