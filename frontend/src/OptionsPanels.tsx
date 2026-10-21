import { useMemo } from 'react';
import { HelpButton } from './CardExplainerModal';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

const fmt = (v: Any, d = 2, suf = '') => (v === null || v === undefined ? '--' : `${Number(v).toFixed(d)}${suf}`);
const fmtMoney = (v: Any) => {
  if (v === null || v === undefined) return '--';
  const n = Number(v);
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

export function PanelTitle({ icon, children, right, helpKey }: { icon?: Any; children: Any; right?: Any; helpKey?: string }) {
  return (
    <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/5">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2">
        {icon}
        <span>{children}</span>
        {helpKey && <HelpButton cardId={helpKey} title={`Explain ${typeof children === 'string' ? children : 'this card'}`} />}
      </h2>
      {right}
    </div>
  );
}

/* ---------------------------------------------------------------- Metric tile */
export function Metric({ label, value, sub, tone = 'white', hint, helpKey }: { label: string; value: Any; sub?: Any; tone?: string; hint?: string; helpKey?: string }) {
  const toneCls: Record<string, string> = {
    white: 'text-white',
    green: 'text-neon-green',
    red: 'text-neon-red',
    gold: 'text-neon-gold',
    cyan: 'text-cyan-300',
  };
  return (
    <div title={hint} className="metric-tile rounded-lg bg-black/30 border border-white/5 px-3 py-2 hover:border-neon-green/30 transition-colors relative group min-w-0 overflow-hidden">
      <div className="flex justify-between items-center gap-1 min-w-0">
        <span className="text-[10px] uppercase tracking-wider text-slate-500 truncate">{label}</span>
        {helpKey && <HelpButton cardId={helpKey} title={`Explain ${label}`} />}
      </div>
      <div className={`font-mono font-bold text-lg leading-tight truncate ${toneCls[tone] || toneCls.white}`}>{value}</div>
      {sub && <div className="text-[10px] font-mono text-slate-400 truncate">{sub}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------- GEX ladder */
export function GexLadder({ data }: { data: Any }) {
  const rows = useMemo(() => {
    if (!data?.gex?.strikes) return [];
    const spot = data.spot;
    return data.gex.strikes
      .filter((r: Any) => Math.abs(r.strike - spot) / spot < 0.05)
      .sort((a: Any, b: Any) => b.strike - a.strike);
  }, [data]);
  const max = Math.max(1, ...rows.map((r: Any) => Math.abs(r.gex)));
  const g = data?.gex || {};
  const closest = (lvl: number | null) =>
    lvl == null || !rows.length ? null : rows.reduce((a: Any, b: Any) => (Math.abs(b.strike - lvl) < Math.abs(a.strike - lvl) ? b : a)).strike;
  const spotK = closest(data?.spot);
  const flipK = closest(g.flip);

  if (!rows.length) return <div className="text-center text-slate-500 text-sm py-10">No gamma data</div>;

  return (
    <div className="flex flex-col gap-[2px] font-mono text-[11px] overflow-y-auto pr-1 max-h-[340px]">
      {rows.map((r: Any) => {
        const w = (Math.abs(r.gex) / max) * 50;
        const pos = r.gex >= 0;
        const tags = [];
        if (r.strike === spotK) tags.push(<span key="s" className="tag bg-white text-black">SPOT</span>);
        if (r.strike === flipK) tags.push(<span key="f" className="tag bg-neon-gold text-black">FLIP</span>);
        if (r.strike === g.call_wall) tags.push(<span key="c" className="tag bg-neon-green text-black">CALL WALL</span>);
        if (r.strike === g.put_wall) tags.push(<span key="p" className="tag bg-neon-red text-white">PUT WALL</span>);
        return (
          <div key={r.strike} className={`flex items-center gap-2 h-[18px] rounded ${r.strike === spotK ? 'bg-white/10' : 'hover:bg-white/5'}`}>
            <span className="w-14 text-right text-slate-400">{r.strike}</span>
            <div className="relative flex-1 h-full">
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10" />
              <div
                className={`absolute top-[3px] bottom-[3px] rounded-sm ${pos ? 'bg-neon-green/70 shadow-[0_0_6px_#00ffa355]' : 'bg-neon-red/70 shadow-[0_0_6px_#ff2a6d55]'}`}
                style={pos ? { left: '50%', width: `${w}%` } : { right: '50%', width: `${w}%` }}
              />
            </div>
            <span className={`w-16 text-right ${pos ? 'text-neon-green' : 'text-neon-red'}`}>{r.gex.toFixed(1)}M</span>
            <div className="w-28 flex gap-1 justify-start">{tags}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- Playbook */
export function Playbook({ data }: { data: Any }) {
  const pb = data?.playbook;
  if (!pb) return <div className="text-slate-500 text-sm">Waiting for options data…</div>;
  const bull = pb.bias.includes('BULL');
  const bear = pb.bias.includes('BEAR');
  return (
    <div className="flex flex-col gap-3">
      <div className={`rounded-lg p-3 border text-center ${bull ? 'border-neon-green/50 bg-neon-green/10' : bear ? 'border-neon-red/50 bg-neon-red/10' : 'border-white/10 bg-white/5'}`}>
        <div className="text-[10px] uppercase tracking-widest text-slate-400">Options Bias · {data.ticker}</div>
        <div className={`text-2xl font-black tracking-wide ${bull ? 'text-neon-green' : bear ? 'text-neon-red' : 'text-slate-200'}`}>{pb.bias}</div>
        <div className="text-[10px] font-mono text-slate-400">score {pb.score > 0 ? '+' : ''}{pb.score} · {data.gex?.regime || '—'}</div>
      </div>
      <div className="rounded-lg p-3 border border-neon-gold/40 bg-neon-gold/5">
        <div className="text-[10px] uppercase tracking-widest text-neon-gold mb-1">Suggested Structure</div>
        <div className="text-sm font-semibold text-white">{pb.strategy}</div>
      </div>
      <ul className="flex flex-col gap-2">
        {pb.notes.map((n: string, i: number) => (
          <li key={i} className="text-xs text-slate-300 leading-snug pl-3 border-l-2 border-neon-green/40">{n}</li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------------- Regime */
export function RegimeCard({ regime }: { regime: Any }) {
  if (!regime) return <div className="text-slate-500 text-sm">Loading regime…</div>;
  const r = regime.regime;
  const tone = r === 'RISK-ON' ? 'neon-green' : r === 'STRESS' ? 'neon-red' : 'neon-gold';
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className={`text-xl font-black text-${tone}`}>{r}</span>
        <span className="text-xs font-mono text-slate-400">SPY {regime.trend}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Metric label="VIX9D" value={fmt(regime.vix9d)} />
        <Metric label="VIX" value={fmt(regime.vix)} sub={`${fmt(regime.vix_percentile, 0)} pctl`} tone="gold" />
        <Metric label="VIX3M" value={fmt(regime.vix3m)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Metric label="VIX / VIX3M" value={fmt(regime.term_ratio, 3)} tone={regime.term_ratio > 1 ? 'red' : 'green'} hint="<0.92 contango (calm) · >1.0 backwardation (stress)" />
        <Metric label="SPY vs 200d" value={fmt(regime.spy_vs_200, 1, '%')} tone={regime.spy_vs_200 >= 0 ? 'green' : 'red'} sub={`vs 50d ${fmt(regime.spy_vs_50, 1, '%')}`} />
      </div>
      <p className="text-xs text-slate-400 leading-snug">{regime.note}</p>
    </div>
  );
}

/* ---------------------------------------------------------------- Options chain */
export function OptionsChain({ data }: { data: Any }) {
  const chain = data?.chain || [];
  const spot = data?.spot;
  if (!chain.length) return <div className="text-center text-slate-500 text-sm py-10">No chain</div>;
  const maxOI = Math.max(1, ...chain.map((r: Any) => Math.max(r.c_oi, r.p_oi)));
  return (
    <div className="overflow-auto max-h-[360px]">
      <table className="w-full font-mono text-[11px] border-separate border-spacing-y-[1px]">
        <thead className="sticky top-0 bg-[#0d1320] z-10">
          <tr className="text-slate-500 text-[10px] uppercase">
            <th className="text-right px-1">OI</th><th className="text-right px-1">Vol</th><th className="text-right px-1">IV</th><th className="text-right px-1 text-neon-green">Bid/Ask</th>
            <th className="text-center px-2 text-white">Strike</th>
            <th className="text-left px-1 text-neon-red">Bid/Ask</th><th className="text-left px-1">IV</th><th className="text-left px-1">Vol</th><th className="text-left px-1">OI</th>
          </tr>
        </thead>
        <tbody>
          {chain.map((r: Any) => {
            const itmC = r.strike < spot;
            const itmP = r.strike > spot;
            const atm = Math.abs(r.strike - spot) / spot < 0.0025;
            return (
              <tr key={r.strike} className={atm ? 'bg-neon-gold/10' : 'hover:bg-white/5'}>
                <td className="text-right px-1 relative">
                  <div className="absolute right-0 top-0 bottom-0 bg-neon-green/15" style={{ width: `${(r.c_oi / maxOI) * 100}%` }} />
                  <span className="relative">{r.c_oi.toLocaleString()}</span>
                </td>
                <td className="text-right px-1 text-slate-400">{r.c_vol.toLocaleString()}</td>
                <td className="text-right px-1 text-slate-400">{fmt(r.c_iv, 1)}</td>
                <td className={`text-right px-1 ${itmC ? 'text-neon-green' : 'text-slate-300'}`}>{fmt(r.c_bid)}/{fmt(r.c_ask)}</td>
                <td className={`text-center px-2 font-bold ${atm ? 'text-neon-gold' : 'text-white'}`}>{r.strike}</td>
                <td className={`text-left px-1 ${itmP ? 'text-neon-red' : 'text-slate-300'}`}>{fmt(r.p_bid)}/{fmt(r.p_ask)}</td>
                <td className="text-left px-1 text-slate-400">{fmt(r.p_iv, 1)}</td>
                <td className="text-left px-1 text-slate-400">{r.p_vol.toLocaleString()}</td>
                <td className="text-left px-1 relative">
                  <div className="absolute left-0 top-0 bottom-0 bg-neon-red/15" style={{ width: `${(r.p_oi / maxOI) * 100}%` }} />
                  <span className="relative">{r.p_oi.toLocaleString()}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------------------------------------------------------- Unusual flow */
export function UnusualFlow({ data }: { data: Any }) {
  const rows = data?.unusual || [];
  const bull = data?.flow?.bullish || 0;
  const bear = data?.flow?.bearish || 0;
  const pct = bull + bear > 0 ? (bull / (bull + bear)) * 100 : 50;
  return (
    <div className="flex flex-col gap-2">
      <div>
        <div className="flex justify-between text-[10px] font-bold mb-1">
          <span className="text-neon-green">BULL {fmtMoney(bull)}</span>
          <span className="text-slate-500">Aggressor Bias</span>
          <span className="text-neon-red">BEAR {fmtMoney(bear)}</span>
        </div>
        <div className="h-1.5 w-full bg-neon-red/40 rounded-full overflow-hidden">
          <div className="h-full bg-neon-green transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="flex flex-col gap-1 overflow-y-auto max-h-[310px] pr-1">
        {rows.length === 0 && <div className="text-slate-500 text-xs text-center py-6">No unusual activity (vol &gt; OI, ≥500 contracts)</div>}
        {rows.map((u: Any, i: number) => {
          const bullish = (u.type === 'CALL') === (u.side === 'ASK');
          return (
            <div key={i} className={`flex justify-between items-center px-2 py-1.5 rounded border text-[11px] font-mono ${bullish ? 'border-neon-green/20 bg-neon-green/5' : 'border-neon-red/20 bg-neon-red/5'}`}>
              <div>
                <span className={`font-bold ${u.type === 'CALL' ? 'text-neon-green' : 'text-neon-red'}`}>{u.strike}{u.type === 'CALL' ? 'C' : 'P'}</span>
                <span className="text-slate-500 ml-1">{u.expiry.slice(5)}</span>
                <div className="text-[10px] text-slate-500">{u.volume.toLocaleString()} / {u.oi.toLocaleString()} OI · {u.vol_oi}x</div>
              </div>
              <div className="text-right">
                <div className="text-white font-bold">{fmtMoney(u.notional)}</div>
                <div className={`text-[10px] ${u.side === 'ASK' ? 'text-neon-gold' : 'text-cyan-300'}`}>@{u.side} · IV {fmt(u.iv, 1)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Vol surface (term + skew) */
export function VolPanel({ data }: { data: Any }) {
  const term = data?.term || [];
  const W = 280, H = 110, P = 18;
  const pts = useMemo(() => {
    if (term.length < 2) return '';
    const xs = term.map((t: Any) => t.dte);
    const ys = term.map((t: Any) => t.iv);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const y0 = Math.min(...ys) * 0.9, y1 = Math.max(...ys) * 1.1;
    return term
      .map((t: Any) => {
        const x = P + ((t.dte - x0) / Math.max(1, x1 - x0)) * (W - 2 * P);
        const y = H - P - ((t.iv - y0) / Math.max(0.01, y1 - y0)) * (H - 2 * P);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [term]);
  const s = data?.skew || {};
  const ivrvTone = data?.premium === 'RICH' ? 'red' : data?.premium === 'CHEAP' ? 'green' : 'gold';

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        <Metric label="IV30" value={fmt(data?.iv30, 1, '%')} />
        <Metric label="RV20" value={fmt(data?.rv20, 1, '%')} />
        <Metric label="IV/RV" value={fmt(data?.iv_rv)} sub={data?.premium} tone={ivrvTone} hint=">1.25 rich (sell premium) · <0.9 cheap (buy premium)" />
      </div>
      <div>
        <div className="flex justify-between text-[10px] uppercase text-slate-500 mb-1">
          <span>Term Structure</span>
          <span className={data?.term_shape === 'BACKWARDATION' ? 'text-neon-red' : 'text-neon-green'}>{data?.term_shape || '--'}</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[110px] rounded bg-black/30 border border-white/5">
          <defs>
            <linearGradient id="ivg" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#00ffa3" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#00ffa3" stopOpacity="0" />
            </linearGradient>
          </defs>
          {pts && (
            <>
              <polygon points={`${pts.split(' ')[0].split(',')[0]},${H - P} ${pts} ${pts.split(' ').slice(-1)[0].split(',')[0]},${H - P}`} fill="url(#ivg)" />
              <polyline points={pts} fill="none" stroke="#00ffa3" strokeWidth="2" />
              {pts.split(' ').map((p: string, i: number) => {
                const [x, y] = p.split(',');
                return (
                  <g key={i}>
                    <circle cx={x} cy={y} r="2.5" fill="#00ffa3" />
                    <text x={x} y={Number(y) - 6} fontSize="8" fill="#94a3b8" textAnchor="middle">{term[i].iv}</text>
                    <text x={x} y={H - 5} fontSize="7" fill="#64748b" textAnchor="middle">{term[i].dte}d</text>
                  </g>
                );
              })}
            </>
          )}
        </svg>
      </div>
      <div>
        <div className="text-[10px] uppercase text-slate-500 mb-1">Skew Smile ({data?.expiry})</div>
        <div className="grid grid-cols-3 gap-2">
          <Metric label="Put Wing −5%" value={fmt(s.put_wing, 1)} tone="red" />
          <Metric label="ATM" value={fmt(s.atm, 1)} tone="gold" />
          <Metric label="Call Wing +5%" value={fmt(s.call_wing, 1)} tone="green" />
        </div>
        <div className="text-[10px] text-slate-400 mt-1 font-mono">
          Skew {fmt(s.skew, 1)} pts {s.skew > 5 ? '· downside fear bid (puts expensive)' : s.skew < 0 ? '· call skew (upside chase)' : '· normal'}
        </div>
      </div>
    </div>
  );
}
