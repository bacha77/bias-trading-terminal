import { useState, useEffect } from 'react';
import { Calendar, AlertTriangle, X, ShieldAlert, Clock } from 'lucide-react';
import { API_BASE } from './config';

interface MacroEvent {
  id: string;
  date: string;
  time: string;
  event: string;
  impact: string;
  forecast: string;
  previous: string;
  category: string;
}

export function MacroCalendarModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [events, setEvents] = useState<MacroEvent[]>([]);
  const [nextCritical, setNextCritical] = useState<MacroEvent | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/market-data/macro-calendar`)
      .then(res => res.json())
      .then(data => {
        if (data && data.events) {
          setEvents(data.events);
          setNextCritical(data.next_critical || data.events[0]);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <>
      {/* Top Header Catalyst Badge */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-amber-500/40 bg-amber-950/30 text-amber-300 hover:bg-amber-900/40 text-[11px] font-mono transition-all shadow-[0_0_10px_rgba(245,158,11,0.15)] group"
        title="View Institutional Macro Catalyst Calendar & Volatility Events"
      >
        <Calendar size={12} className="text-amber-400 group-hover:animate-bounce" />
        <span className="font-bold">
          {nextCritical ? `NEXT RISK: ${nextCritical.event.split('(')[0].trim()} (${nextCritical.date.split(',')[0]})` : 'MACRO CALENDAR'}
        </span>
        <span className="px-1 py-0.2 rounded bg-amber-500 text-black text-[9px] font-bold">
          CRITICAL
        </span>
      </button>

      {/* Modal Backdrop & Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0a0f1d] border border-amber-500/40 rounded-xl max-w-2xl w-full p-5 shadow-2xl font-mono text-xs flex flex-col gap-4 relative animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ShieldAlert size={18} className="text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wider">
                    INSTITUTIONAL MACRO & CATALYST CALENDAR
                  </h3>
                  <p className="text-[10px] text-slate-400 font-sans">
                    High-impact market volatility drivers, OpEx dates, and central bank releases.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Catalyst Events Table */}
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 text-[10px] uppercase">
                    <th className="py-2 px-2">Date & Time</th>
                    <th className="py-2 px-2">Event Catalyst</th>
                    <th className="py-2 px-2">Impact</th>
                    <th className="py-2 px-2">Forecast</th>
                    <th className="py-2 px-2">Previous</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-[11px]">
                  {events.map((evt) => (
                    <tr key={evt.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 px-2 text-slate-300 font-bold whitespace-nowrap">
                        <div className="text-white">{evt.date}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock size={10} /> {evt.time}
                        </div>
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="font-bold text-amber-200">{evt.event}</div>
                        <div className="text-[9px] text-slate-400">{evt.category}</div>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          evt.impact === 'CRITICAL'
                            ? 'bg-neon-red/20 text-neon-red border border-neon-red/50 animate-pulse'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                        }`}>
                          {evt.impact}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 font-bold text-neon-green">{evt.forecast}</td>
                      <td className="py-2.5 px-2 text-slate-400">{evt.previous}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Risk Protocol Notice */}
            <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/30 text-[11px] text-amber-200/90 flex items-start gap-2.5 font-sans">
              <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-mono text-xs mb-0.5">B.I.A.S. Risk Protocol:</strong>
                Never hold unhedged short premium or naked 0DTE options across critical 08:30 ET economic releases or 14:00 ET FOMC rate decisions. Implied volatility crush and gamma tails can cause irreversible slippage. Prefer defined-risk debit spreads or exit prior to the event window.
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-neon-green text-black font-bold text-xs hover:opacity-90 font-mono"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
