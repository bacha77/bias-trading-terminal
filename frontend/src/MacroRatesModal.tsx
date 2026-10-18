import { useState, useEffect, useMemo } from 'react';
import { 
  Activity, X, RefreshCw, Landmark
} from 'lucide-react';
import { API_BASE } from './config';

export interface MacroRatesData {
  status: string;
  updated: string;
  timestamp: number;
  rates: {
    '3M': { name: string; symbol: string; yield: number; change: number };
    '2Y': { name: string; symbol: string; yield: number; change: number };
    '5Y': { name: string; symbol: string; yield: number; change: number };
    '10Y': { name: string; symbol: string; yield: number; change: number };
    '30Y': { name: string; symbol: string; yield: number; change: number };
    'DXY': { name: string; symbol: string; yield: number; change: number };
  };
  spreads: {
    curve_10y_2y_bps: number;
    curve_10y_3m_bps: number;
    curve_30y_5y_bps: number;
    inversion_status: string;
    regime: string;
    recession_risk_pct: number;
  };
  fed_policy: {
    current_target_range: string;
    effective_rate: number;
    next_meeting_bias: string;
    probabilities: { action: string; probability: number }[];
  };
  curve_points: { tenor: string; months: number; yield: number }[];
}

interface MacroRatesModalProps {
  externalOpen?: boolean;
  onCloseExternal?: () => void;
}

export function MacroRatesModal({ externalOpen, onCloseExternal }: MacroRatesModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [data, setData] = useState<MacroRatesData | null>(null);
  const [loading, setLoading] = useState(false);

  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setIsOpen = (open: boolean) => {
    if (onCloseExternal && !open) onCloseExternal();
    setInternalOpen(open);
  };

  const fetchRates = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/macro/rates`);
      const json = await res.json();
      if (json && json.rates) {
        setData(json);
      }
    } catch (e) {
      console.error('Error fetching macro rates:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
    const iv = setInterval(fetchRates, 30000);
    return () => clearInterval(iv);
  }, []);

  const t10 = data?.rates?.['10Y'];
  const t2 = data?.rates?.['2Y'];
  const dxy = data?.rates?.['DXY'];
  const spread10_2 = data?.spreads?.curve_10y_2y_bps ?? 31.0;
  const isInverted = spread10_2 < 0;

  // SVG Curve Coordinate calculations
  const curvePath = useMemo(() => {
    if (!data?.curve_points || data.curve_points.length === 0) return '';
    const points = data.curve_points;
    const yields = points.map(p => p.yield);
    const minYield = Math.max(0, Math.min(...yields) - 0.4);
    const maxYield = Math.max(...yields) + 0.4;
    const range = maxYield - minYield || 1;

    const width = 500;
    const height = 140;
    const paddingX = 45;
    const paddingY = 20;

    const coords = points.map((p, idx) => {
      const x = paddingX + (idx / (points.length - 1)) * (width - 2 * paddingX);
      const y = height - paddingY - ((p.yield - minYield) / range) * (height - 2 * paddingY);
      return { x, y, ...p };
    });

    let d = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const cx = (prev.x + curr.x) / 2;
      d += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return { d, coords, minYield, maxYield };
  }, [data]);

  return (
    <>
      {/* ================= Header Rates Strip Trigger Badge ================= */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-2.5 py-1 rounded-lg border border-cyan-500/30 bg-cyan-950/20 text-cyan-300 hover:bg-cyan-900/30 text-[11px] font-mono transition-all shadow-[0_0_12px_rgba(6,182,212,0.15)] cursor-pointer group shrink-0"
        title="View US Treasury Yield Curve, 10Y-2Y Inversion Spread & Fed Probabilities (YCRV <GO>)"
      >
        <Landmark size={12} className="text-cyan-400 group-hover:scale-110 transition-transform" />
        
        <span className="hidden sm:inline font-bold">YCRV:</span>
        <span className="text-white font-bold">10Y {t10?.yield ? `${t10.yield.toFixed(2)}%` : '4.26%'}</span>

        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
          isInverted 
            ? 'bg-neon-red/20 text-neon-red border border-neon-red/40 animate-pulse' 
            : 'bg-neon-green/20 text-neon-green border border-neon-green/30'
        }`}>
          2s10s {spread10_2 >= 0 ? '+' : ''}{spread10_2} bps
        </span>

        {dxy && (
          <span className="hidden md:inline text-slate-400 text-[10px]">
            DXY {dxy.yield.toFixed(2)}
          </span>
        )}

        <span className="px-1 py-0.2 rounded bg-cyan-500 text-black text-[9px] font-extrabold">
          &lt;GO&gt;
        </span>
      </button>

      {/* ================= Modal Backdrop & Panel ================= */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="bg-[#070b14] border border-cyan-500/40 rounded-2xl max-w-3xl w-full p-5 shadow-[0_0_50px_rgba(6,182,212,0.2)] font-mono text-xs flex flex-col gap-4 relative animate-in zoom-in-95 duration-200 border-t-2 border-t-cyan-400"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.25)]">
                  <Landmark size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white tracking-wider">
                      US TREASURY YIELD CURVE & MACRO RATES
                    </h3>
                    <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-bold">
                      YCRV &lt;GO&gt;
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Benchmark Term Structure · 10Y-2Y Inversion Spread · FOMC Fed Funds Probability
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchRates}
                  className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-white/10 transition-colors"
                  title="Refresh rates"
                >
                  <RefreshCw size={13} className={loading ? 'animate-spin text-cyan-400' : ''} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close (Esc)"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Top Yield Curve Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 rounded-lg border border-white/10 bg-black/40">
                <div className="text-[9px] text-slate-500 uppercase font-bold">10Y Benchmark (TNX)</div>
                <div className="text-lg font-bold text-white flex items-baseline gap-1.5 mt-0.5">
                  {t10?.yield ? `${t10.yield.toFixed(3)}%` : '--'}
                  <span className={`text-[10px] ${t10 && t10.change >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                    {t10 && t10.change >= 0 ? '+' : ''}{t10?.change ?? 0}
                  </span>
                </div>
                <div className="text-[9px] text-slate-400">Cost of equity capital benchmark</div>
              </div>

              <div className="p-2.5 rounded-lg border border-white/10 bg-black/40">
                <div className="text-[9px] text-slate-500 uppercase font-bold">2Y Treasury Note</div>
                <div className="text-lg font-bold text-white flex items-baseline gap-1.5 mt-0.5">
                  {t2?.yield ? `${t2.yield.toFixed(3)}%` : '--'}
                  <span className={`text-[10px] ${t2 && t2.change >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                    {t2 && t2.change >= 0 ? '+' : ''}{t2?.change ?? 0}
                  </span>
                </div>
                <div className="text-[9px] text-slate-400">Policy expectation proxy</div>
              </div>

              <div className="p-2.5 rounded-lg border border-white/10 bg-black/40">
                <div className="text-[9px] text-slate-500 uppercase font-bold">10Y - 2Y Curve Spread</div>
                <div className="text-lg font-bold mt-0.5 flex items-baseline gap-1.5">
                  <span className={isInverted ? 'text-neon-red' : 'text-neon-green'}>
                    {spread10_2 >= 0 ? '+' : ''}{spread10_2} bps
                  </span>
                </div>
                <div className={`text-[9px] font-bold ${isInverted ? 'text-neon-red' : 'text-neon-green'}`}>
                  {data?.spreads?.inversion_status || 'NORMALIZING'}
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-white/10 bg-black/40">
                <div className="text-[9px] text-slate-500 uppercase font-bold">US Dollar Index (DXY)</div>
                <div className="text-lg font-bold text-white flex items-baseline gap-1.5 mt-0.5">
                  {dxy?.yield ? Number(dxy.yield).toFixed(2) : '--'}
                  <span className={`text-[10px] ${dxy && dxy.change >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                    {dxy && dxy.change >= 0 ? '+' : ''}{dxy?.change ?? 0}
                  </span>
                </div>
                <div className="text-[9px] text-slate-400">Global dollar liquidity</div>
              </div>
            </div>

            {/* Interactive SVG Term Structure Yield Curve */}
            <div className="p-3.5 rounded-xl border border-cyan-500/20 bg-black/50 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[10px] border-b border-white/5 pb-1">
                <span className="text-slate-400 uppercase font-bold flex items-center gap-1.5">
                  <Activity size={12} className="text-cyan-400" />
                  US Treasury Term Structure Curve (3M → 30Y)
                </span>
                <span className="text-cyan-300 font-bold">
                  Slope: {data?.spreads?.regime || 'EXPANSION'}
                </span>
              </div>

              {typeof curvePath === 'object' && curvePath.coords ? (
                <div className="relative w-full h-36">
                  <svg viewBox="0 0 500 140" className="w-full h-full overflow-visible">
                    {/* Background horizontal grid lines */}
                    <line x1="40" y1="20" x2="465" y2="20" stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3" />
                    <line x1="40" y1="70" x2="465" y2="70" stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3" />
                    <line x1="40" y1="120" x2="465" y2="120" stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3" />

                    {/* Gradient under curve */}
                    <defs>
                      <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Filled area */}
                    <path
                      d={`${curvePath.d} L 455 120 L 45 120 Z`}
                      fill="url(#curveGradient)"
                    />

                    {/* Curve Path Line */}
                    <path
                      d={curvePath.d}
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />

                    {/* Data Points */}
                    {curvePath.coords.map((pt) => (
                      <g key={pt.tenor}>
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="4.5"
                          fill="#070b14"
                          stroke="#06b6d4"
                          strokeWidth="2"
                        />
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="2"
                          fill="#00ffa3"
                        />
                        {/* Yield value label */}
                        <text
                          x={pt.x}
                          y={pt.y - 10}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="9"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          {pt.yield.toFixed(2)}%
                        </text>
                        {/* Tenor label */}
                        <text
                          x={pt.x}
                          y="135"
                          textAnchor="middle"
                          fill="#94a3b8"
                          fontSize="9"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          {pt.tenor}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              ) : (
                <div className="py-10 text-center text-slate-500">Loading curve coordinates...</div>
              )}
            </div>

            {/* Bottom Split: Inversion Gauge & Fed Probability Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Inversion Spread & Macro Commentary */}
              <div className="p-3 rounded-lg border border-white/10 bg-black/40 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">
                      10Y-2Y Recession & Regime Barometer
                    </span>
                    <span className={`text-[10px] font-bold ${isInverted ? 'text-neon-red' : 'text-neon-green'}`}>
                      {data?.spreads?.recession_risk_pct}% RISK
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden mb-2 relative">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        isInverted ? 'bg-neon-red shadow-[0_0_10px_#ff2a6d]' : 'bg-neon-green shadow-[0_0_10px_#00ffa3]'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(10, (spread10_2 + 50)))}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {isInverted ? (
                      <span className="text-neon-red">
                        ⚠️ <strong>YIELD CURVE INVERTED:</strong> Short rates exceed long yields. Historically precedes US recessions by 6-18 months. Multi-asset risk indicates defensive positioning.
                      </span>
                    ) : (
                      <span className="text-neon-green">
                        ✅ <strong>POSITIVE YIELD SPREAD:</strong> Normal upward-sloping yield curve. Banks expand net interest margins and credit flows remain healthy for risk-on equity expansion.
                      </span>
                    )}
                  </p>
                </div>

                <div className="pt-2 mt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
                  <span>30Y-5Y Spread: <strong>+{data?.spreads?.curve_30y_5y_bps ?? 50} bps</strong></span>
                  <span>10Y-3M Spread: <strong>{data?.spreads?.curve_10y_3m_bps ? (data.spreads.curve_10y_3m_bps >= 0 ? '+' : '') + data.spreads.curve_10y_3m_bps : '+11'} bps</strong></span>
                </div>
              </div>

              {/* Fed Funds Policy & Rate Expectations */}
              <div className="p-3 rounded-lg border border-white/10 bg-black/40 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                      <Landmark size={11} className="text-neon-gold" />
                      CME FedWatch Policy Probability
                    </span>
                    <span className="text-[10px] text-neon-gold font-bold">
                      RANGE: {data?.fed_policy?.current_target_range || '4.25% - 4.50%'}
                    </span>
                  </div>

                  <div className="space-y-2 mt-2">
                    {(data?.fed_policy?.probabilities || []).map((prob) => (
                      <div key={prob.action} className="text-[11px]">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-white">{prob.action}</span>
                          <span className="font-bold text-cyan-300">{prob.probability}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div 
                            className="h-full bg-cyan-400 rounded-full"
                            style={{ width: `${prob.probability}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 mt-2 border-t border-white/5 text-[10px] text-slate-400 flex justify-between items-center">
                  <span>Effective Policy Rate: <strong>{data?.fed_policy?.effective_rate || 4.33}%</strong></span>
                  <span className="text-cyan-300 font-bold">{data?.fed_policy?.next_meeting_bias || 'CUT LEANING'}</span>
                </div>
              </div>
            </div>

            {/* Footer Institutional Tag */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-500">
              <span>Source: CBOE & US Treasury benchmark fixings · Updated {data?.updated || 'Live'}</span>
              <span className="font-bold text-cyan-400">DUMAY FIXED INCOME MATRIX</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
