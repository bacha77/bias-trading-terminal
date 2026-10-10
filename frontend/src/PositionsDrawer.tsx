import { useState, useEffect, useCallback } from 'react';
import { 
  Wallet, 
  AlertOctagon, 
  RefreshCw, 
  X, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck
} from 'lucide-react';
import { API_BASE } from './config';

interface Position {
  symbol: string;
  qty: number;
  side: string;
  avg_entry_price: number;
  current_price: number;
  market_value: number;
  unrealized_pl: number;
  unrealized_pl_pct: number;
  change_today: number;
}

interface PositionsData {
  connected: boolean;
  positions: Position[];
  total_unrealized_pl: number;
  total_market_value: number;
  count: number;
}

interface PositionsDrawerProps {
  alpacaAccount: any;
  onSelectTicker?: (ticker: string) => void;
}

export function PositionsDrawer({ alpacaAccount, onSelectTicker }: PositionsDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<PositionsData>({
    connected: false,
    positions: [],
    total_unrealized_pl: 0,
    total_market_value: 0,
    count: 0,
  });
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [flattenConfirm, setFlattenConfirm] = useState(false);

  const fetchPositions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/alpaca/positions`);
      const json = await res.json();
      if (json && json.connected !== undefined) {
        setData(json);
      }
    } catch (err) {
      console.error('Error fetching Alpaca positions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPositions();
    const iv = setInterval(fetchPositions, 10000);
    return () => clearInterval(iv);
  }, [fetchPositions]);

  const handleClosePosition = async (symbol: string) => {
    try {
      setActionMsg(`Closing ${symbol}...`);
      const res = await fetch(`${API_BASE}/api/alpaca/positions/close?symbol=${symbol}`, { method: 'POST' });
      const json = await res.json();
      if (json.status === 'SUCCESS') {
        setActionMsg(`✓ Successfully closed ${symbol}`);
        fetchPositions();
      } else {
        setActionMsg(`⚠ Error: ${json.message}`);
      }
      setTimeout(() => setActionMsg(null), 4000);
    } catch (e: any) {
      setActionMsg(`⚠ Failed: ${e.message}`);
      setTimeout(() => setActionMsg(null), 4000);
    }
  };

  const handleFlattenAll = async () => {
    try {
      setActionMsg('Liquidating all positions...');
      const res = await fetch(`${API_BASE}/api/alpaca/positions/flatten-all`, { method: 'POST' });
      const json = await res.json();
      setFlattenConfirm(false);
      if (json.status === 'SUCCESS') {
        setActionMsg('✓ All positions liquidated and flattened.');
        fetchPositions();
      } else {
        setActionMsg(`⚠ Error: ${json.message}`);
      }
      setTimeout(() => setActionMsg(null), 5000);
    } catch (e: any) {
      setFlattenConfirm(false);
      setActionMsg(`⚠ Failed: ${e.message}`);
      setTimeout(() => setActionMsg(null), 5000);
    }
  };

  const plColor = data.total_unrealized_pl > 0 ? 'text-neon-green' : data.total_unrealized_pl < 0 ? 'text-neon-red' : 'text-slate-300';

  return (
    <div className="glass-panel border-t border-neon-green/20 bg-black/80 backdrop-blur-xl shadow-2xl transition-all duration-300">
      {/* Drawer Toggle Header Bar */}
      <div className="px-4 py-2 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 text-white hover:text-neon-green font-bold transition-colors"
          >
            <Wallet size={14} className="text-neon-green" />
            <span>ALPACA PORTFOLIO & POSITIONS</span>
            {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>

          {/* Account status badge */}
          {alpacaAccount && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">
              ACC #{alpacaAccount.account_number || 'CONNECTED'} · {alpacaAccount.status || 'ACTIVE'}
            </span>
          )}

          {/* Quick Metrics */}
          <div className="hidden sm:flex items-center gap-3 text-[11px] pl-3 border-l border-white/10">
            <span>
              Buying Power: <strong className="text-white">${Number(alpacaAccount?.buying_power || 0).toLocaleString()}</strong>
            </span>
            <span>
              Portfolio: <strong className="text-white">${Number(alpacaAccount?.portfolio_value || 0).toLocaleString()}</strong>
            </span>
            <span>
              Unrealized P&L: <strong className={plColor}>
                {data.total_unrealized_pl > 0 ? '+' : ''}${data.total_unrealized_pl.toFixed(2)}
              </strong>
            </span>
            <span className="px-1.5 py-0.2 rounded bg-white/10 text-slate-300 text-[10px]">
              {data.count} Open {data.count === 1 ? 'Position' : 'Positions'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {actionMsg && (
            <span className="text-[11px] px-2 py-0.5 rounded bg-neon-green/20 text-neon-green border border-neon-green/40 animate-pulse font-bold">
              {actionMsg}
            </span>
          )}

          {data.count > 0 && (
            <>
              {flattenConfirm ? (
                <div className="flex items-center gap-1.5 bg-neon-red/20 px-2 py-1 rounded border border-neon-red/50">
                  <span className="text-[10px] text-neon-red font-bold">Confirm Panic Flatten?</span>
                  <button
                    onClick={handleFlattenAll}
                    className="px-2 py-0.5 bg-neon-red text-white text-[10px] font-bold rounded hover:opacity-90"
                  >
                    YES, FLATTEN
                  </button>
                  <button
                    onClick={() => setFlattenConfirm(false)}
                    className="text-slate-400 hover:text-white px-1"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setFlattenConfirm(true)}
                  className="px-2.5 py-1 rounded bg-neon-red/15 hover:bg-neon-red/25 border border-neon-red/50 text-neon-red text-[10px] font-bold transition-all flex items-center gap-1 shadow-[0_0_8px_rgba(255,42,109,0.2)]"
                  title="Liquidate and flatten all positions in 1 click"
                >
                  <AlertOctagon size={11} /> 🚨 FLATTEN ALL
                </button>
              )}
            </>
          )}

          <button
            onClick={fetchPositions}
            title="Refresh Positions"
            className="text-slate-400 hover:text-neon-green p-1 transition-colors"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin text-neon-green' : ''} />
          </button>
        </div>
      </div>

      {/* Expanded Positions Table Drawer */}
      {isOpen && (
        <div className="p-4 border-t border-white/10 bg-black/50 overflow-x-auto max-h-72 overflow-y-auto">
          {data.positions.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center justify-center gap-2 text-slate-400 font-mono text-xs">
              <ShieldCheck size={28} className="text-neon-green/80" />
              <div className="font-bold text-white">No Open Positions</div>
              <div className="text-[11px] text-slate-500">
                Alpaca account is flat with 100% available buying power (${Number(alpacaAccount?.buying_power || 0).toLocaleString()}). Use the 1-Click Bracket Order tool on any chart or the Smart Algo Board to execute.
              </div>
            </div>
          ) : (
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 text-[10px] uppercase">
                  <th className="py-2 px-2">Symbol</th>
                  <th className="py-2 px-2">Side</th>
                  <th className="py-2 px-2">Qty</th>
                  <th className="py-2 px-2">Avg Entry</th>
                  <th className="py-2 px-2">Current</th>
                  <th className="py-2 px-2">Market Value</th>
                  <th className="py-2 px-2">Unrealized P&L</th>
                  <th className="py-2 px-2">Today</th>
                  <th className="py-2 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.positions.map((pos) => {
                  const isProfit = pos.unrealized_pl >= 0;
                  return (
                    <tr key={pos.symbol} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2 px-2 font-bold text-white">
                        <button
                          onClick={() => onSelectTicker && onSelectTicker(pos.symbol)}
                          className="hover:text-neon-green transition-colors text-left flex items-center gap-1"
                          title="Click to view chart and options"
                        >
                          {pos.symbol}
                        </button>
                      </td>
                      <td className="py-2 px-2">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          pos.side === 'LONG' ? 'bg-neon-green/20 text-neon-green' : 'bg-neon-red/20 text-neon-red'
                        }`}>
                          {pos.side}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-slate-200">{pos.qty}</td>
                      <td className="py-2 px-2 text-slate-300">${pos.avg_entry_price.toFixed(2)}</td>
                      <td className="py-2 px-2 font-bold text-white">${pos.current_price.toFixed(2)}</td>
                      <td className="py-2 px-2 text-slate-300">${pos.market_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="py-2 px-2 font-bold">
                        <span className={isProfit ? 'text-neon-green' : 'text-neon-red'}>
                          {isProfit ? '+' : ''}${pos.unrealized_pl.toFixed(2)} ({isProfit ? '+' : ''}{pos.unrealized_pl_pct.toFixed(2)}%)
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        <span className={pos.change_today >= 0 ? 'text-neon-green' : 'text-neon-red'}>
                          {pos.change_today >= 0 ? '+' : ''}{pos.change_today.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <button
                          onClick={() => handleClosePosition(pos.symbol)}
                          className="px-2 py-0.5 rounded bg-white/10 hover:bg-neon-red/20 border border-white/20 hover:border-neon-red/50 text-slate-300 hover:text-neon-red text-[10px] font-bold transition-all"
                        >
                          Close
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
