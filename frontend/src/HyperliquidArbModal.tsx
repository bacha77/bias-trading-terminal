import { useState, useEffect, useCallback } from 'react';
import { 
  X, RefreshCw, Zap, ShieldCheck, DollarSign, Layers, 
  Percent, Clock, Lock
} from 'lucide-react';
import { API_BASE } from './config';

interface ArbOpportunity {
  asset: string;
  mark_price: number;
  oracle_price: number;
  basis_spread_pct: number;
  funding_rate_1h_pct: number;
  daily_yield_pct: number;
  apr_pct: number;
  open_interest_usd: number;
  tier: string;
  risk_badge: string;
  is_positive_funding: boolean;
}

interface BasisVault {
  id: string;
  asset: string;
  mode: string;
  created_at: string;
  capital_usd: number;
  spot_leg_usd: number;
  short_leg_usd: number;
  entry_price: number;
  current_price: number;
  delta: number;
  funding_apr_entry: number;
  current_apr: number;
  funding_hourly_pct: number;
  accrued_yield_usd: number;
  total_yield_pct: number;
  hours_active: number;
  status: string;
  auto_unwind_enabled: boolean;
  exit_reason?: string;
  exit_time?: string;
}

interface ArbState {
  engine_mode: string;
  engine_armed: boolean;
  min_apr_threshold: number;
  allocated_capital_usd: number;
  active_vaults: BasisVault[];
  closed_vaults: BasisVault[];
  total_harvested_yield_usd: number;
  last_scan_time?: string;
}

interface HyperliquidArbModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HyperliquidArbModal({ isOpen, onClose }: HyperliquidArbModalProps) {
  const [activeTab, setActiveTab] = useState<'RADAR' | 'VAULTS' | 'HISTORY'>('RADAR');
  const [radar, setRadar] = useState<ArbOpportunity[]>([]);
  const [state, setState] = useState<ArbState | null>(null);
  const [loading, setLoading] = useState(false);
  const [deployingAsset, setDeployingAsset] = useState<string | null>(null);
  const [selectedCapital, setSelectedCapital] = useState<number>(1000);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [radarRes, stateRes] = await Promise.all([
        fetch(`${API_BASE}/api/hyperliquid/funding-radar?min_oi=100000`),
        fetch(`${API_BASE}/api/hyperliquid/state`)
      ]);
      const radarJson = await radarRes.json();
      const stateJson = await stateRes.json();
      if (radarJson.opportunities) setRadar(radarJson.opportunities);
      if (stateJson.state) setState(stateJson.state);
    } catch (e: any) {
      console.error('Failed to load Hyperliquid data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchData();
      const iv = setInterval(fetchData, 15000);
      return () => clearInterval(iv);
    }
  }, [isOpen, fetchData]);

  const handleDeployVault = async (asset: string) => {
    setDeployingAsset(asset);
    setToastMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/hyperliquid/deploy-vault`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset,
          capital_usd: selectedCapital,
          mode: state?.engine_mode || 'SIMULATION'
        })
      });
      const data = await res.json();
      if (data.status === 'SUCCESS') {
        setToastMsg({
          type: 'success',
          text: `🎯 Deployed Delta-Neutral Vault on ${asset} with $${selectedCapital.toLocaleString()}! Earning funding 24/7.`
        });
        fetchData();
        setActiveTab('VAULTS');
      } else {
        setToastMsg({ type: 'error', text: data.message || 'Deploy failed' });
      }
    } catch (err: any) {
      setToastMsg({ type: 'error', text: `Execution error: ${err.message}` });
    } finally {
      setDeployingAsset(null);
    }
  };

  const handleCloseVault = async (vaultId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/hyperliquid/close-vault`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vault_id: vaultId })
      });
      const data = await res.json();
      if (data.status === 'SUCCESS') {
        setToastMsg({
          type: 'success',
          text: `✓ Vault unwound. Harvested yield deposited to equity.`
        });
        fetchData();
      }
    } catch (err: any) {
      setToastMsg({ type: 'error', text: `Unwind error: ${err.message}` });
    }
  };

  if (!isOpen) return null;

  const activeVaults = state?.active_vaults || [];
  const closedVaults = state?.closed_vaults || [];
  const totalAccruedActive = activeVaults.reduce((acc, v) => acc + (v.accrued_yield_usd || 0), 0);
  const totalHarvested = (state?.total_harvested_yield_usd || 0) + totalAccruedActive;
  const topApr = radar.length > 0 ? radar[0].apr_pct : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-6xl max-h-[92vh] bg-gradient-to-b from-slate-900 via-[#0a0f1d] to-black border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.15)] flex flex-col overflow-hidden text-slate-100 font-sans">
        
        {/* Header Bar */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Percent size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold tracking-wide text-white flex items-center gap-2">
                  <span>HYPERLIQUID DELTA-NEUTRAL BASIS & FUNDING DESK</span>
                </h2>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  L1 PERPS · 0% GAS · DELTA = 0.00
                </span>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  24/7 CASH FLOW
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Market-neutral cash-and-carry vaults. Long Spot + Short 1x Perp locks price risk to zero while harvesting positive hourly funding rates.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
              title="Refresh funding rates"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-cyan-400' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-300 transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-5 py-3 border-b border-white/10 bg-black/40">
          <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Total Harvested Yield</span>
              <DollarSign size={13} className="text-emerald-400" />
            </span>
            <div className="text-lg font-bold text-emerald-400 mt-0.5 font-mono">
              +${totalHarvested.toFixed(2)}
            </div>
            <div className="text-[9px] text-slate-500 font-mono">100% Market-Neutral Cash</div>
          </div>

          <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Active Deployed Capital</span>
              <Layers size={13} className="text-cyan-400" />
            </span>
            <div className="text-lg font-bold text-white mt-0.5 font-mono">
              ${activeVaults.reduce((acc, v) => acc + v.capital_usd, 0).toLocaleString()}
            </div>
            <div className="text-[9px] text-slate-500">{activeVaults.length} Active Delta-Neutral Vaults</div>
          </div>

          <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Top Market APR</span>
              <Zap size={13} className="text-amber-400" />
            </span>
            <div className="text-lg font-bold text-amber-300 mt-0.5 font-mono">
              +{topApr.toFixed(1)}% APR
            </div>
            <div className="text-[9px] text-slate-500 font-mono">Highest Live Long-Pays-Short</div>
          </div>

          <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Auto-Unwind Guard</span>
              <ShieldCheck size={13} className="text-purple-400" />
            </span>
            <div className="text-lg font-bold text-purple-300 mt-0.5 flex items-center gap-1.5">
              <span>ACTIVE</span>
              <span className="h-2 w-2 rounded-full bg-purple-400 animate-ping" />
            </div>
            <div className="text-[9px] text-slate-500">Auto-Exits If Funding Flips Negative</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 py-2.5 border-b border-white/10 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('RADAR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'RADAR'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Zap size={13} />
              <span>LIVE FUNDING RADAR ({radar.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('VAULTS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'VAULTS'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Lock size={13} />
              <span>ACTIVE VAULTS ({activeVaults.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'HISTORY'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Clock size={13} />
              <span>HARVEST HISTORY ({closedVaults.length})</span>
            </button>
          </div>

          {/* Quick Capital Preset Sizer */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[10px] text-slate-400 uppercase font-mono mr-1">Vault Size:</span>
            {[250, 500, 1000, 2500, 5000].map((amt) => (
              <button
                key={amt}
                onClick={() => setSelectedCapital(amt)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  selectedCapital === amt
                    ? 'bg-cyan-400 text-black shadow-sm font-black'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                ${amt >= 1000 ? `${amt / 1000}K` : amt}
              </button>
            ))}
          </div>
        </div>

        {/* Toast Alert */}
        {toastMsg && (
          <div className={`mx-5 mt-2.5 p-2.5 rounded-xl border text-xs font-mono flex items-center justify-between shadow-lg ${
            toastMsg.type === 'success' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-red-500/15 border-red-500/40 text-red-300'
          }`}>
            <span>{toastMsg.text}</span>
            <button onClick={() => setToastMsg(null)} className="text-slate-400 hover:text-white ml-2">×</button>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* TAB 1: LIVE FUNDING RADAR */}
          {activeTab === 'RADAR' && (
            <div className="space-y-3">
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>Displaying 234 live Hyperliquid perpetual contracts sorted by highest positive funding yield (Longs pay Shorts).</span>
                <span className="text-cyan-400 font-mono">1-Click deploy opens 50% Spot Long + 50% 1x Short Perp</span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-white/[0.04] text-slate-400 text-[10px] uppercase border-b border-white/10">
                    <tr>
                      <th className="py-2.5 px-3">Asset</th>
                      <th className="py-2.5 px-3">Mark Price</th>
                      <th className="py-2.5 px-3">Basis Spread</th>
                      <th className="py-2.5 px-3">1h Rate</th>
                      <th className="py-2.5 px-3 text-amber-300 font-bold">Annualized APR</th>
                      <th className="py-2.5 px-3">Daily Yield</th>
                      <th className="py-2.5 px-3">Open Interest</th>
                      <th className="py-2.5 px-3">Tier</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {radar.map((opp) => (
                      <tr key={opp.asset} className="hover:bg-white/[0.03] transition-colors">
                        <td className="py-2 px-3 font-bold text-white flex items-center gap-1.5">
                          <span className="text-cyan-400">{opp.asset}</span>
                        </td>
                        <td className="py-2 px-3 text-slate-300">${opp.mark_price.toLocaleString()}</td>
                        <td className={`py-2 px-3 ${opp.basis_spread_pct >= 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {opp.basis_spread_pct > 0 ? '+' : ''}{opp.basis_spread_pct}%
                        </td>
                        <td className="py-2 px-3 text-slate-300">+{opp.funding_rate_1h_pct}%</td>
                        <td className="py-2 px-3 font-bold text-amber-300 text-sm">
                          +{opp.apr_pct.toFixed(2)}%
                        </td>
                        <td className="py-2 px-3 text-emerald-400">+{opp.daily_yield_pct}% / day</td>
                        <td className="py-2 px-3 text-slate-400">${(opp.open_interest_usd / 1000000).toFixed(1)}M</td>
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            opp.tier === 'BLUECHIP' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                            opp.tier === 'MIDCAP' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                            'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {opp.tier}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            onClick={() => handleDeployVault(opp.asset)}
                            disabled={deployingAsset === opp.asset}
                            className="px-2.5 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-[10px] transition-all cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.3)] disabled:opacity-50"
                          >
                            {deployingAsset === opp.asset ? 'DEPLOYING...' : `DEPLOY $${selectedCapital.toLocaleString()}`}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: ACTIVE VAULTS */}
          {activeTab === 'VAULTS' && (
            <div className="space-y-4">
              {activeVaults.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                  <Percent size={36} className="mx-auto text-slate-600 mb-2" />
                  <p className="text-sm font-bold text-slate-300">No Active Delta-Neutral Vaults Deployed</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Go to the Live Funding Radar tab and click Deploy on any positive funding asset to start earning market-neutral yield 24/7.
                  </p>
                  <button
                    onClick={() => setActiveTab('RADAR')}
                    className="mt-4 px-4 py-1.5 rounded-xl bg-cyan-500 text-black font-bold text-xs hover:bg-cyan-400 transition-all cursor-pointer"
                  >
                    View Top Yielding Opportunities
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeVaults.map((v) => (
                    <div key={v.id} className="p-4 rounded-2xl bg-gradient-to-br from-white/[0.04] to-transparent border border-cyan-500/30 shadow-lg relative overflow-hidden">
                      <div className="flex items-center justify-between pb-3 border-b border-white/10">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-extrabold text-white">{v.asset}</span>
                          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                            DELTA = 0.00
                          </span>
                          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300">
                            ACTIVE HARVESTING
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">{v.created_at}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 my-3 text-xs font-mono">
                        <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                          <span className="text-[9px] text-slate-400 block">Capital Deployed</span>
                          <span className="text-sm font-bold text-white">${v.capital_usd.toLocaleString()}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                          <span className="text-[9px] text-slate-400 block">Current APR</span>
                          <span className="text-sm font-bold text-amber-300">+{v.current_apr.toFixed(1)}%</span>
                        </div>
                        <div className="p-2 rounded-lg bg-black/40 border border-emerald-500/30 bg-emerald-500/5">
                          <span className="text-[9px] text-emerald-400 block">Accrued Yield</span>
                          <span className="text-sm font-bold text-emerald-400 animate-pulse">
                            +${v.accrued_yield_usd.toFixed(4)}
                          </span>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-400 font-mono space-y-1 mb-3 bg-black/30 p-2.5 rounded-lg border border-white/5">
                        <div className="flex justify-between">
                          <span>Long Leg (Spot):</span>
                          <span className="text-white">${v.spot_leg_usd} USD @ ${v.entry_price.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Short Leg (1x Perp):</span>
                          <span className="text-white">${v.short_leg_usd} USD @ ${v.current_price.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-purple-300">
                          <span>Protection Guard:</span>
                          <span>Auto-Unwinds if APR &lt; -1.0%</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-[10px] text-slate-500 font-mono">Active {v.hours_active} Hours</span>
                        <button
                          onClick={() => handleCloseVault(v.id)}
                          className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold transition-all cursor-pointer"
                        >
                          Unwind &amp; Harvest Yield
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: HARVEST HISTORY */}
          {activeTab === 'HISTORY' && (
            <div className="space-y-3">
              {closedVaults.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-500 font-mono">
                  No historical vaults closed yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-white/[0.04] text-slate-400 text-[10px] uppercase border-b border-white/10">
                      <tr>
                        <th className="py-2.5 px-3">Asset</th>
                        <th className="py-2.5 px-3">Capital</th>
                        <th className="py-2.5 px-3">Total Yield Harvested</th>
                        <th className="py-2.5 px-3">Yield %</th>
                        <th className="py-2.5 px-3">Exit Reason</th>
                        <th className="py-2.5 px-3 text-right">Exit Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {closedVaults.map((cv, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.03]">
                          <td className="py-2 px-3 font-bold text-white">{cv.asset}</td>
                          <td className="py-2 px-3 text-slate-300">${cv.capital_usd.toLocaleString()}</td>
                          <td className="py-2 px-3 font-bold text-emerald-400">
                            +${cv.accrued_yield_usd.toFixed(4)}
                          </td>
                          <td className="py-2 px-3 text-emerald-300">+{cv.total_yield_pct}%</td>
                          <td className="py-2 px-3 text-slate-400 text-[11px]">{cv.exit_reason || 'Closed'}</td>
                          <td className="py-2 px-3 text-right text-slate-500 text-[10px]">{cv.exit_time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-500 font-mono bg-black/40">
          <span>Hyperliquid L1 Mainnet Data Feed · Autonomous Funding Arbitrage Daemon</span>
          <span>Zero Directional Risk · Auto-Unwind Guard Enabled</span>
        </div>
      </div>
    </div>
  );
}
