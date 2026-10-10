import { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { API_BASE } from './config';

interface MTFFrame {
  bias: string;
  tone: string;
  score: number;
  price?: number;
}

interface MTFData {
  ticker: string;
  overall: string;
  avg_score: number;
  timeframes: Record<string, MTFFrame>;
  updated?: string;
}

interface MultiTimeframeRibbonProps {
  ticker: string;
}

export function MultiTimeframeRibbon({ ticker }: MultiTimeframeRibbonProps) {
  const [data, setData] = useState<MTFData | null>(null);

  useEffect(() => {
    let active = true;
    const fetchMTF = () => {
      fetch(`${API_BASE}/api/algo/multi-timeframe?ticker=${ticker}`)
        .then(res => res.json())
        .then(resData => {
          if (active && resData && resData.timeframes) {
            setData(resData);
          }
        })
        .catch(() => {});
    };

    fetchMTF();
    const iv = setInterval(fetchMTF, 30000);
    return () => { active = false; clearInterval(iv); };
  }, [ticker]);

  if (!data || !data.timeframes || Object.keys(data.timeframes).length === 0) {
    return null;
  }

  const overallTone = 
    data.avg_score >= 60 ? 'text-neon-green border-neon-green/40 bg-neon-green/10'
    : data.avg_score <= 40 ? 'text-neon-red border-neon-red/40 bg-neon-red/10'
    : 'text-neon-gold border-neon-gold/40 bg-neon-gold/10';

  const order = ['1m', '5m', '15m', '1h', '1d'];

  return (
    <div className="flex items-center gap-1.5 font-mono text-[10px] overflow-x-auto py-0.5">
      <span className="text-slate-400 font-bold uppercase text-[9px] shrink-0 flex items-center gap-1">
        <Zap size={11} className="text-neon-gold" />
        MTF ALIGN:
      </span>

      {/* Aggregate Score Pill */}
      <span className={`px-1.5 py-0.2 rounded border font-bold text-[9px] shrink-0 ${overallTone}`}>
        {data.overall} ({data.avg_score}%)
      </span>

      {/* 5-Timeframe Pills */}
      <div className="flex items-center gap-1 shrink-0">
        {order.map((tf) => {
          const frame = data.timeframes[tf];
          if (!frame) return null;
          const isBull = frame.tone === 'green' || frame.tone === 'cyan';
          const isBear = frame.tone === 'red';
          const bg = isBull 
            ? 'bg-neon-green/15 text-neon-green border-neon-green/30'
            : isBear 
            ? 'bg-neon-red/15 text-neon-red border-neon-red/30'
            : 'bg-white/5 text-slate-300 border-white/10';

          return (
            <div
              key={tf}
              className={`flex items-center gap-1 px-1.5 py-0.2 rounded border text-[9px] ${bg}`}
              title={`${tf.toUpperCase()}: ${frame.bias}`}
            >
              <span className="font-bold text-white/80">{tf.toUpperCase()}</span>
              <span>{isBull ? '▲' : isBear ? '▼' : '•'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
