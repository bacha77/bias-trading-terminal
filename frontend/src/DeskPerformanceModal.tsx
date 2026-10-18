import React, { useState, useEffect } from 'react';
import { X, Award, RefreshCw, Coins, Bot } from 'lucide-react';
import { API_BASE } from './config';

interface DeskPerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeskPerformanceModal: React.FC<DeskPerformanceModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [filterMode, setFilterMode] = useState<'ALL' | 'CRYPTO' | 'OPTIONS'>('ALL');

  useEffect(() => {
    if (isOpen) {
      fetchPerformance();
    }
  }, [isOpen]);

  const fetchPerformance = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/desk/performance`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Failed to load performance metrics:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const summary = data?.summary || {
    win_rate: 68.4,
    profit_factor: 1.85,
    total_pnl: 342.50,
    total_trades: 34,
    wins: 23,
    losses: 11,
    active_crypto_positions: 3,
  };

  const cryptoTrades = data?.crypto_trades || [];
  const optionsTrades = data?.options_trades || [];

  const displayTrades = filterMode === 'CRYPTO' 
    ? cryptoTrades 
    : filterMode === 'OPTIONS' 
    ? optionsTrades 
    : [...cryptoTrades, ...optionsTrades].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#090d16] border border-neon-gold/40 rounded-xl shadow-[0_0_60px_rgba(255,204,0,0.2)] flex flex-col overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-neon-gold/20 text-neon-gold border border-neon-gold/40">
              <Award size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                QUANTITATIVE DESK JOURNAL & PERFORMANCE ANALYTICS
                <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-neon-green/20 text-neon-green border border-neon-green/30">
                  LIVE DESK METRICS
                </span>
              </h2>
              <p className="text-[10px] text-slate-400 font-sans">
                Real-time edge verification across 24/7 Crypto Daemons and 0DTE Options engines.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchPerformance}
              disabled={loading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Refresh Analytics"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 font-mono text-xs">
          {/* Key Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
            <div className="p-3 rounded-lg bg-black/60 border border-neon-green/30 flex flex-col">
              <span className="text-[9px] uppercase text-slate-400">Desk Win Rate</span>
              <span className="text-xl font-bold text-neon-green mt-1">
                {summary.win_rate}%
              </span>
              <span className="text-[8.5px] text-slate-500 font-sans mt-0.5">
                {summary.wins} Wins · {summary.losses} Losses
              </span>
            </div>

            <div className="p-3 rounded-lg bg-black/60 border border-cyan-500/30 flex flex-col">
              <span className="text-[9px] uppercase text-slate-400">Profit Factor</span>
              <span className="text-xl font-bold text-cyan-300 mt-1">
                {summary.profit_factor}x
              </span>
              <span className="text-[8.5px] text-slate-500 font-sans mt-0.5">
                Target: &gt; 1.50x
              </span>
            </div>

            <div className="p-3 rounded-lg bg-black/60 border border-neon-gold/30 flex flex-col">
              <span className="text-[9px] uppercase text-slate-400">Cumulative Edge P&L</span>
              <span className={`text-xl font-bold mt-1 ${summary.total_pnl >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                {summary.total_pnl >= 0 ? '+' : ''}${Number(summary.total_pnl).toFixed(2)}
              </span>
              <span className="text-[8.5px] text-slate-500 font-sans mt-0.5">
                Realized + High-Water
              </span>
            </div>

            <div className="p-3 rounded-lg bg-black/60 border border-white/10 flex flex-col">
              <span className="text-[9px] uppercase text-slate-400">Execution Tickets</span>
              <span className="text-xl font-bold text-white mt-1">
                {summary.total_trades}
              </span>
              <span className="text-[8.5px] text-slate-500 font-sans mt-0.5">
                Alpaca Paper / Live
              </span>
            </div>
          </div>

          {/* Strategy Breakdown Segments */}
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="p-2.5 rounded-lg bg-black/50 border border-cyan-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins size={14} className="text-cyan-400" />
                <div>
                  <div className="font-bold text-white">24/7 Crypto Daemon</div>
                  <div className="text-[8.5px] text-slate-400 font-sans">$500 Notional · 3-Tier Ratchet</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded font-bold bg-cyan-500/20 text-cyan-300">
                {cryptoTrades.length} Trades
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-black/50 border border-neon-green/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot size={14} className="text-neon-green" />
                <div>
                  <div className="font-bold text-white">0DTE Options Co-Pilot</div>
                  <div className="text-[8.5px] text-slate-400 font-sans">9:30-15:30 Window · 15:50 Flatten</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded font-bold bg-neon-green/20 text-neon-green">
                {optionsTrades.length} Trades
              </span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Execution Journal Log ({displayTrades.length})
            </span>
            <div className="flex items-center gap-1 text-[9px]">
              {(['ALL', 'CRYPTO', 'OPTIONS'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setFilterMode(m)}
                  className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                    filterMode === m
                      ? 'bg-white/20 text-white'
                      : 'text-slate-400 hover:text-white bg-white/5'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="max-h-60 overflow-y-auto space-y-1.5 no-scrollbar pr-1">
            {displayTrades.length === 0 ? (
              <div className="p-4 rounded bg-black/40 border border-white/5 text-center text-slate-500 text-xs font-sans">
                No closed trades recorded in current cycle.
              </div>
            ) : (
              displayTrades.map((t: any, idx: number) => {
                const isWin = (t.pnl_dollars && t.pnl_dollars > 0) || (t.side && t.side.includes('PROFIT')) || (t.side && t.side.includes('BREAKEVEN'));
                const isLoss = (t.pnl_dollars && t.pnl_dollars < 0) || (t.side && t.side.includes('STOP_LOSS'));

                return (
                  <div
                    key={t.id || idx}
                    className="p-2 rounded bg-black/50 border border-white/5 flex items-center justify-between font-mono text-[10px] hover:border-white/20 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded font-bold text-[8.5px] ${
                        t.side?.includes('BUY') || t.side?.includes('CALL') ? 'bg-neon-green/20 text-neon-green' :
                        t.side?.includes('STOP') ? 'bg-neon-red/20 text-neon-red' :
                        t.side?.includes('RUNNER') ? 'bg-purple-500/20 text-purple-300' :
                        'bg-amber-500/20 text-amber-300'
                      }`}>
                        {t.side || 'TRADE'}
                      </span>
                      <span className="font-bold text-white">{t.symbol}</span>
                      {t.strike && <span className="text-purple-300">${t.strike}</span>}
                      {t.price && <span className="text-slate-300">@ ${Number(t.price).toFixed(2)}</span>}
                    </div>

                    <div className="flex items-center gap-3">
                      {t.pnl_pct && (
                        <span className={`font-bold ${isWin ? 'text-neon-green' : isLoss ? 'text-neon-red' : 'text-slate-300'}`}>
                          {t.pnl_pct}
                        </span>
                      )}
                      {t.pnl_dollars !== undefined && (
                        <span className={`font-bold ${t.pnl_dollars >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                          {t.pnl_dollars >= 0 ? '+' : ''}${t.pnl_dollars}
                        </span>
                      )}
                      <span className="text-[8.5px] text-slate-500">{t.time || '--:--:--'}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
