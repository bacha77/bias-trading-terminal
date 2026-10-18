import React, { useState, useEffect } from 'react';
import { 
  X, RefreshCw, Zap, ShieldCheck, ExternalLink, 
  Copy, Check, Flame, Coins, 
  DollarSign, Activity, Maximize2, Minimize2, 
  Layers, Target,
  LineChart, Sparkles, Sliders
} from 'lucide-react';
import { API_BASE } from './config';

interface SolanaDexRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Renders one forensic gate: true = pass, false = fail, null/undefined = not verifiable
const Gate: React.FC<{ ok: boolean | null | undefined; label: string }> = ({ ok, label }) => (
  <span
    className={`font-bold ${ok === true ? 'text-neon-green' : ok === false ? 'text-neon-red' : 'text-slate-500'}`}
    title={ok == null ? 'Not verifiable from on-chain data source' : undefined}
  >
    {ok === true ? '✓' : ok === false ? '✗' : '?'} {label}
  </span>
);

// BullX / GMGN style on-chain forensic inspection strip (real RugCheck / GoPlus data)
const ForensicStrip: React.FC<{ tok: any }> = ({ tok }) => {
  const status = tok.forensic_status || 'UNVERIFIED';
  const fmtPct = (v: number | null | undefined) => (v == null ? 'n/a' : `${v}%`);
  const lpLabel =
    tok.lp_burned_pct != null
      ? `${tok.lp_burned_pct}% LP Burned/Locked`
      : (tok.lp_model && tok.lp_model !== 'UNKNOWN' ? tok.lp_model : 'LP n/a');
  return (
    <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between text-[9px] text-slate-400 font-mono gap-1">
      <div className="flex items-center gap-3 flex-wrap">
        <span
          className={`px-1.5 py-0.5 rounded font-black border ${
            status === 'PASSED'
              ? 'bg-neon-green/15 text-neon-green border-neon-green/40'
              : 'bg-slate-500/15 text-slate-300 border-slate-500/40'
          }`}
          title={tok.forensic_error ? `Lookup error: ${tok.forensic_error}` : `Source: ${tok.forensic_source || 'n/a'}`}
        >
          {status === 'PASSED' ? '🛡️ 5/5 GATES' : '⚠ UNVERIFIED'}
        </span>
        <Gate ok={tok.mint_revoked} label="Mint Revoked" />
        <Gate ok={tok.freeze_revoked} label={tok.chain === 'base' ? 'No Honeypot' : 'Freeze Revoked'} />
        <span className={`font-bold ${tok.lp_burned_pct != null ? 'text-amber-300' : 'text-slate-500'}`}>🔥 {lpLabel}</span>
      </div>
      <div className="flex items-center gap-3">
        <span>Dev: <strong className={tok.dev_holding_pct > 5 ? 'text-neon-red' : 'text-white'}>{fmtPct(tok.dev_holding_pct)}</strong></span>
        <span>Top 10: <strong className={tok.top10_holding_pct > 30 ? 'text-neon-red' : 'text-cyan-300'}>{fmtPct(tok.top10_holding_pct)}</strong></span>
      </div>
    </div>
  );
};

export const SolanaDexRadarModal: React.FC<SolanaDexRadarModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [selectedChain, setSelectedChain] = useState<'solana' | 'base'>('solana');
  const [selectedRiskProfile, setSelectedRiskProfile] = useState<string>('MOONBAG');
  const [listings, setListings] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [closedTrades, setClosedTrades] = useState<any[]>([]);
  const [activeChartToken, setActiveChartToken] = useState<any | null>(null);
  const [pnlSummary, setPnlSummary] = useState<any>({
    net_pnl_usd: 0.0,
    net_pnl_pct: 0.0,
    total_unrealized_usd: 0.0,
    total_realized_usd: 0.0,
    capital_deployed_usd: 0.0,
    active_positions_count: 0,
    closed_trades_count: 0,
    wins: 0,
    losses: 0,
    win_rate: 0.0
  });
  const [dexArmed, setDexArmed] = useState(false);
  const [snipeAmount, setSnipeAmount] = useState(100);
  const [activeTab, setActiveTab] = useState<'SPLIT' | 'RADAR' | 'POSITIONS' | 'HISTORY'>('SPLIT');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);
  const [snipingAddr, setSnipingAddr] = useState<string | null>(null);
  const [closingAddr, setClosingAddr] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filterSafety, setFilterSafety] = useState(false);
  const [filterWhalesOnly, setFilterWhalesOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchListings(selectedChain, true);
      fetchPositions();

      const posInterval = setInterval(() => {
        fetchPositions();
      }, 3500);

      const radarInterval = setInterval(() => {
        fetchListings(selectedChain, false);
      }, 10000);

      return () => {
        clearInterval(posInterval);
        clearInterval(radarInterval);
      };
    }
  }, [isOpen, selectedChain]);

  const handleSelectChain = async (chain: 'solana' | 'base') => {
    setSelectedChain(chain);
    setActiveChartToken(null);
    fetchListings(chain, true);
    try {
      await fetch(`${API_BASE}/api/dex/set-chain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chain })
      });
    } catch (e) {
      console.error('Failed to sync chain preference:', e);
    }
  };

  const fetchListings = async (chain = selectedChain, isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/dex/new-listings?chain=${chain}`);
      if (res.ok) {
        const json = await res.json();
        const items = json.listings || [];
        setListings(items);
        if (items.length > 0) {
          setActiveChartToken((prev: any) => {
            if (!prev || (prev.chain && prev.chain !== chain)) {
              return items[0];
            }
            return prev;
          });
        }
      }
    } catch (e) {
      console.error('Failed to load DEX listings:', e);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  const fetchPositions = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/dex/positions`);
      if (res.ok) {
        const json = await res.json();
        setPositions(json.active_positions || []);
        setClosedTrades(json.closed_trades || []);
        setDexArmed(json.dex_armed || false);
        if (json.risk_profile) setSelectedRiskProfile(json.risk_profile);
        if (json.pnl_summary) {
          setPnlSummary(json.pnl_summary);
        }
        if (json.sniper_amount_usd) setSnipeAmount(json.sniper_amount_usd);
      }
    } catch (e) {
      console.error('Failed to load DEX positions:', e);
    }
  };

  const handleToggleDaemon = async () => {
    const next = !dexArmed;
    setDexArmed(next);
    try {
      await fetch(`${API_BASE}/api/dex/toggle-daemon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          armed: next, 
          amount_usd: snipeAmount,
          chain: selectedChain,
          risk_profile: selectedRiskProfile
        })
      });
      setToastMsg({
        type: 'success',
        text: next ? `⚡ 24/7 ${selectedChain.toUpperCase()} DEX Sniper Daemon ARMED!` : '⏸️ DEX Sniper Daemon set to STANDBY.'
      });
      fetchPositions();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSetRiskProfile = async (profKey: string) => {
    setSelectedRiskProfile(profKey);
    try {
      const res = await fetch(`${API_BASE}/api/dex/set-risk-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: profKey })
      });
      if (res.ok) {
        setToastMsg({
          type: 'success',
          text: `🎯 Risk Profile switched to ${profKey}: Dynamic Stop Loss & Moonbag updated.`
        });
        fetchPositions();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSnipe = async (tok: any) => {
    setSnipingAddr(tok.address);
    setToastMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/dex/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token_address: tok.address,
          symbol: tok.symbol,
          amount_usd: snipeAmount,
          mode: 'SIMULATION',
          chain: selectedChain
        })
      });
      const data = await res.json();
      if (data.status === 'SUCCESS') {
        setToastMsg({
          type: 'success',
          text: `🚀 Sniped $${snipeAmount} of ${tok.symbol}! Forensic protection active.`
        });
        fetchPositions();
      } else {
        setToastMsg({
          type: 'error',
          text: data.message || 'Snipe failed'
        });
      }
    } catch (err: any) {
      setToastMsg({ type: 'error', text: `Snipe execution error: ${err.message}` });
    } finally {
      setSnipingAddr(null);
    }
  };

  const handleClosePos = async (addr: string, sym: string) => {
    setClosingAddr(addr);
    try {
      const res = await fetch(`${API_BASE}/api/dex/close-position?token_address=${addr}`, { method: 'POST' });
      if (res.ok) {
        setToastMsg({ type: 'success', text: `Closed ${sym} position. Realized P&L banked.` });
        fetchPositions();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setClosingAddr(null);
    }
  };

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddr(addr);
    setTimeout(() => setCopiedAddr(null), 2000);
  };

  if (!isOpen) return null;

  const filteredListings = listings.filter(tok => {
    const matchesSearch = !searchQuery || 
      tok.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || 
      tok.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tok.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSafety = !filterSafety || (tok.safety_score >= 75 && tok.forensic_status === 'PASSED');
    const matchesWhales = !filterWhalesOnly || (tok.whale_flow !== 'ORGANIC FLOW');
    return matchesSearch && matchesSafety && matchesWhales;
  });

  const isNetProfit = pnlSummary.net_pnl_usd >= 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={`relative bg-[#070b12] border border-cyan-500/40 shadow-[0_0_80px_rgba(6,182,212,0.25)] flex flex-col overflow-hidden transition-all duration-300 ${
          isFullScreen 
            ? 'w-full h-full rounded-none' 
            : 'w-[97vw] max-w-[1740px] h-[94vh] rounded-2xl'
        }`}
      >
        {/* ================= 1. Top Institutional Navigation Header ================= */}
        <div className="flex flex-wrap items-center justify-between px-6 py-3 border-b border-white/10 bg-gradient-to-r from-white/[0.04] via-transparent to-white/[0.02] gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-cyan-400/50 shadow-[0_0_20px_rgba(6,182,212,0.45)] bg-black/60 shrink-0">
              <img src="/dumay-logo.jpg" alt="DUMAY" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base font-black text-white tracking-wider flex items-center gap-2">
                  DUMAY PRO DEX RADAR & SNIPER ENGINE
                </h1>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-extrabold tracking-wide ${
                  dexArmed 
                    ? 'bg-neon-green/20 text-neon-green border border-neon-green/50 shadow-[0_0_12px_rgba(0,255,163,0.35)]' 
                    : 'bg-white/10 text-slate-400 border border-white/10'
                }`}>
                  {dexArmed ? '● 24/7 DAEMON ARMED' : '○ STANDBY'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 font-mono font-bold">
                  SIMULATION · LIVE ON-CHAIN BOOK
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                GMGN Smart Inflow · BullX Audit Suite (Mint/Freeze/LP Lock) · Photon Panic Bailout · Micro-Trailing Ratchet
              </p>
            </div>
          </div>

          {/* Chain & Snipe Controls */}
          <div className="flex items-center gap-3">
            {/* Multi-Chain Selector (Solana vs Base L2) */}
            <div className="flex items-center p-0.5 bg-black/60 rounded-xl border border-white/10 font-mono text-xs">
              <button
                onClick={() => handleSelectChain('solana')}
                className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedChain === 'solana'
                    ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-black font-extrabold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🟣 SOLANA</span>
              </button>
              <button
                onClick={() => handleSelectChain('base')}
                className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedChain === 'base'
                    ? 'bg-blue-600 text-white font-extrabold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🔵 BASE L2</span>
              </button>
            </div>

            {/* Snipe Size Presets */}
            <div className="hidden sm:flex items-center gap-1 bg-white/[0.03] px-2.5 py-1 rounded-xl border border-white/10 font-mono text-xs">
              <span className="text-slate-500 text-[10px]">SIZE:</span>
              {[50, 100, 250, 500].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setSnipeAmount(amt)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    snipeAmount === amt ? 'bg-cyan-500 text-black font-extrabold' : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  ${amt}
                </button>
              ))}
            </div>

            {/* Arm / Disarm Button */}
            <button
              onClick={handleToggleDaemon}
              className={`px-4 py-1.5 rounded-xl font-mono text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 shadow-md ${
                dexArmed 
                  ? 'bg-neon-red/20 text-neon-red hover:bg-neon-red/30 border-neon-red/50 shadow-[0_0_12px_rgba(255,59,92,0.25)]' 
                  : 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
              }`}
            >
              <Zap size={14} className={dexArmed ? "text-neon-red" : "text-cyan-400"} />
              {dexArmed ? 'DISARM DAEMON' : 'ARM 24/7 DAEMON'}
            </button>

            <button
              onClick={() => fetchListings(selectedChain)}
              disabled={loading}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer border border-white/5"
              title="Refresh Listings"
            >
              <RefreshCw size={15} className={loading ? "animate-spin text-cyan-400" : ""} />
            </button>

            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer border border-white/5"
              title={isFullScreen ? "Exit Fullscreen" : "Maximize / Fullscreen"}
            >
              {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer border border-white/5"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ================= 2. Real-Time DEX P&L Analytics HUD & Risk Profiles ================= */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5 px-6 py-2.5 bg-black/60 border-b border-white/10 font-mono">
          {/* Card 1: NET P&L */}
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-white/[0.04] to-transparent border border-white/10 flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Total Net P&L</span>
              <DollarSign size={13} className="text-cyan-400" />
            </span>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className={`text-xl font-black tracking-tight ${isNetProfit ? 'text-neon-green' : 'text-neon-red'}`}>
                {isNetProfit ? '+' : ''}${pnlSummary.net_pnl_usd.toFixed(2)}
              </span>
              <span className={`text-xs font-bold ${isNetProfit ? 'text-neon-green' : 'text-neon-red'}`}>
                ({isNetProfit ? '+' : ''}{pnlSummary.net_pnl_pct}%)
              </span>
            </div>
            <div className="text-[9px] text-slate-500">Realized + Unrealized</div>
          </div>

          {/* Card 2: Floating Open P&L */}
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-white/[0.04] to-transparent border border-white/10 flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Floating Open P&L</span>
              <Activity size={13} className="text-amber-400" />
            </span>
            <div className="mt-0.5">
              <span className={`text-lg font-bold tracking-tight ${pnlSummary.total_unrealized_usd >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                {pnlSummary.total_unrealized_usd >= 0 ? '+' : ''}${pnlSummary.total_unrealized_usd.toFixed(2)}
              </span>
            </div>
            <div className="text-[9px] text-slate-500">{positions.length} Active Positions</div>
          </div>

          {/* Card 3: Realized Cash Banked */}
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-white/[0.04] to-transparent border border-white/10 flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Realized Cash Banked</span>
              <Coins size={13} className="text-neon-gold" />
            </span>
            <div className="mt-0.5">
              <span className={`text-lg font-bold tracking-tight ${pnlSummary.total_realized_usd >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                {pnlSummary.total_realized_usd >= 0 ? '+' : ''}${pnlSummary.total_realized_usd.toFixed(2)}
              </span>
            </div>
            <div className="text-[9px] text-slate-500">{pnlSummary.closed_trades_count} Closed Trades</div>
          </div>

          {/* Card 4: Capital In Play */}
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-white/[0.04] to-transparent border border-white/10 flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Capital In Play</span>
              <Layers size={13} className="text-purple-400" />
            </span>
            <div className="mt-0.5">
              <span className="text-lg font-bold text-white tracking-tight">
                ${pnlSummary.capital_deployed_usd.toFixed(0)} <span className="text-xs text-slate-400 font-normal">/ ${(snipeAmount * 3).toFixed(0)} max</span>
              </span>
            </div>
            <div className="text-[9px] text-slate-500">{positions.length}/3 Slots Used</div>
          </div>

          {/* Card 5: Win Rate */}
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-white/[0.04] to-transparent border border-white/10 flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Closed Win Rate</span>
              <Target size={13} className="text-emerald-400" />
            </span>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-emerald-300">
                {pnlSummary.win_rate}%
              </span>
              <span className="text-[10px] text-slate-400">
                ({pnlSummary.wins}W / {pnlSummary.losses}L)
              </span>
            </div>
            <div className="text-[9px] text-slate-500">Historical Accuracy</div>
          </div>

          {/* Card 6: 1-Click Risk Profile Selector */}
          <div className="p-2 rounded-xl bg-gradient-to-br from-white/[0.04] to-transparent border border-cyan-500/30 flex flex-col justify-between">
            <span className="text-[10px] text-cyan-300 uppercase tracking-wider flex items-center justify-between font-bold">
              <span>Risk Profile</span>
              <Sliders size={12} className="text-cyan-400" />
            </span>
            <div className="grid grid-cols-3 gap-1 mt-1">
              <button
                onClick={() => handleSetRiskProfile('SCALPER')}
                className={`px-1 py-1 rounded text-[9px] font-bold text-center transition-all cursor-pointer ${
                  selectedRiskProfile === 'SCALPER'
                    ? 'bg-amber-400 text-black font-black shadow-sm'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
                title="-5% Stop Loss / +20% Take Profit"
              >
                SCALPER
              </button>
              <button
                onClick={() => handleSetRiskProfile('MOONBAG')}
                className={`px-1 py-1 rounded text-[9px] font-bold text-center transition-all cursor-pointer ${
                  selectedRiskProfile === 'MOONBAG'
                    ? 'bg-cyan-400 text-black font-black shadow-sm'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
                title="-8% Stop Loss / +50% Take Profit"
              >
                MOONBAG
              </button>
              <button
                onClick={() => handleSetRiskProfile('HUNTER_10X')}
                className={`px-1 py-1 rounded text-[9px] font-bold text-center transition-all cursor-pointer ${
                  selectedRiskProfile === 'HUNTER_10X'
                    ? 'bg-purple-400 text-black font-black shadow-sm'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
                title="-12% Stop Loss / +100% (2x) Take Profit"
              >
                10X HUNT
              </button>
            </div>
            <div className="text-[8.5px] text-slate-400 truncate mt-0.5">
              {selectedRiskProfile === 'SCALPER' ? '-5% SL · +20% TP · -10% Trail' : 
               selectedRiskProfile === 'MOONBAG' ? '-8% SL · +50% TP · -15% Trail' : 
               '-12% SL · +100% TP · -25% Trail'}
            </div>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMsg && (
          <div className={`mx-6 mt-2.5 p-2.5 rounded-xl border text-xs font-sans flex items-center justify-between shadow-lg ${
            toastMsg.type === 'success' ? 'bg-neon-green/15 border-neon-green/40 text-neon-green' : 'bg-neon-red/15 border-neon-red/40 text-neon-red'
          }`}>
            <span className="font-medium">{toastMsg.text}</span>
            <button onClick={() => setToastMsg(null)} className="hover:opacity-75 cursor-pointer"><X size={15} /></button>
          </div>
        )}

        {/* Navigation Tabs & Search Controls */}
        <div className="flex flex-wrap items-center justify-between px-6 py-2 border-b border-white/10 bg-white/[0.01]">
          <div className="flex items-center gap-2 text-xs font-mono">
            <button
              onClick={() => setActiveTab('SPLIT')}
              className={`pb-1 px-3 font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'SPLIT'
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Layers size={13} />
              <span>DUAL DESK (SPLIT)</span>
            </button>

            <button
              onClick={() => setActiveTab('RADAR')}
              className={`pb-1 px-3 font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'RADAR'
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Flame size={13} className="text-amber-400" />
              <span>RADAR ({filteredListings.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('POSITIONS')}
              className={`pb-1 px-3 font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'POSITIONS'
                  ? 'border-neon-green text-neon-green'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Coins size={13} className="text-neon-green" />
              <span>POSITIONS ({positions.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`pb-1 px-3 font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'HISTORY'
                  ? 'border-purple-400 text-purple-300'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <span>RECEIPTS ({closedTrades.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative">
              <input
                type="text"
                placeholder="Search symbol, pair or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1 bg-black/50 border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 font-mono focus:border-cyan-400 focus:outline-none w-48 sm:w-60"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1.5 text-slate-400 hover:text-white"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <button
              onClick={() => setFilterSafety(!filterSafety)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                filterSafety 
                  ? 'bg-neon-green/20 text-neon-green border-neon-green/40 shadow-[0_0_10px_rgba(0,255,163,0.2)]'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
              }`}
            >
              <ShieldCheck size={12} />
              <span>Safety ≥ 75</span>
            </button>

            <button
              onClick={() => setFilterWhalesOnly(!filterWhalesOnly)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                filterWhalesOnly 
                  ? 'bg-neon-gold/20 text-neon-gold border-neon-gold/40 shadow-[0_0_10px_rgba(255,215,0,0.2)]'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
              }`}
            >
              <Sparkles size={12} />
              <span>Whale Flow Only</span>
            </button>
          </div>
        </div>

        {/* ================= 3. Main Command Center Body ================= */}
        <div className="flex-1 overflow-hidden p-5 font-mono">
          {activeTab === 'SPLIT' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full">
              {/* Left Column: Clean Breakout Radar & Forensics (7 Cols) */}
              <div className="lg:col-span-7 flex flex-col h-full bg-black/40 rounded-xl border border-white/10 overflow-hidden">
                <div className="px-4 py-2 bg-white/[0.02] border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame size={15} className="text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      {selectedChain.toUpperCase()} Breakout Radar ({filteredListings.length} Pairs)
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Min Liquidity: $20k · Min 24h Vol: $30k
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                  {filteredListings.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 font-sans">
                      {loading ? 'Scanning blockchain order books & mempools...' : 'No tokens match current filters.'}
                    </div>
                  ) : (
                    filteredListings.map((tok) => {
                      const isWhale = tok.whale_flow === 'WHALE ACCUMULATION';
                      const isSmart = tok.whale_flow === 'SMART MONEY INFLOW';
                      const isSelected = activeChartToken?.address === tok.address;

                      return (
                        <div
                          key={tok.address}
                          onClick={() => setActiveChartToken(tok)}
                          className={`p-3 rounded-xl border transition-all flex flex-col gap-2 font-mono shadow-sm cursor-pointer ${
                            isSelected 
                              ? 'bg-[#0f172a] border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]' 
                              : 'bg-[#0c121e]/80 border-white/5 hover:border-cyan-500/40'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-xl bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 text-center min-w-[56px]">
                                <span className="text-xs font-black text-white block">{tok.symbol}</span>
                                <span className="text-[8px] text-cyan-400 uppercase font-bold">{tok.dex}</span>
                              </div>

                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-white text-xs">{tok.name}</span>
                                  <span className={`text-[8.5px] px-2 py-0.2 rounded-full font-bold border ${
                                    tok.safety_score >= 80 
                                      ? 'bg-neon-green/20 text-neon-green border-neon-green/40' 
                                      : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                  }`}>
                                    <ShieldCheck size={9} className="inline mr-1" />
                                    {tok.safety_score}/100 SAFETY
                                  </span>

                                  {/* Whale / Smart Money Badge (GMGN Model) */}
                                  {isWhale && (
                                    <span className="text-[8.5px] px-2 py-0.2 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 shadow-sm animate-pulse">
                                      <span>🐋 WHALE ACCUMULATION · {tok.whale_score}</span>
                                    </span>
                                  )}
                                  {isSmart && (
                                    <span className="text-[8.5px] px-2 py-0.2 rounded-full font-bold bg-neon-green/20 text-neon-green border border-neon-green/40 flex items-center gap-1">
                                      <span>🟢 SMART MONEY INFLOW · {tok.whale_score}</span>
                                    </span>
                                  )}
                                  {!isWhale && !isSmart && tok.whale_score >= 50 && (
                                    <span className="text-[8.5px] px-2 py-0.2 rounded-full font-bold bg-white/5 text-slate-300 border border-white/10" title="Whale score (0-100)">
                                      FLOW {tok.whale_score}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 text-[9.5px] text-slate-400 pt-0.5">
                                  <span className="font-mono text-slate-500">
                                    {tok.address.slice(0, 4)}...{tok.address.slice(-4)}
                                  </span>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); copyAddress(tok.address); }}
                                    className="hover:text-white transition-colors cursor-pointer text-slate-400"
                                    title="Copy Contract Address"
                                  >
                                    {copiedAddr === tok.address ? <Check size={11} className="text-neon-green" /> : <Copy size={11} />}
                                  </button>
                                  <span className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-0.5">
                                    <LineChart size={11} /> Chart Active
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Financial Metrics Strip */}
                            <div className="grid grid-cols-4 gap-2.5 text-center sm:text-right text-[10px]">
                              <div>
                                <span className="text-[8px] text-slate-500 uppercase block font-bold">Price</span>
                                <span className="font-bold text-white font-mono">
                                  ${tok.price_usd < 0.0001 ? tok.price_usd.toExponential(2) : tok.price_usd.toFixed(4)}
                                </span>
                              </div>
                              <div>
                                <span className="text-[8px] text-slate-500 uppercase block font-bold">5m Gain</span>
                                <span className={`font-bold flex items-center justify-end ${tok.price_change_5m >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                                  {tok.price_change_5m >= 0 ? '+' : ''}{tok.price_change_5m}%
                                </span>
                              </div>
                              <div>
                                <span className="text-[8px] text-slate-500 uppercase block font-bold">Liquidity</span>
                                <span className="font-bold text-cyan-300">${(tok.liquidity_usd / 1000).toFixed(0)}k</span>
                              </div>
                              <div>
                                <span className="text-[8px] text-slate-500 uppercase block font-bold">Buy Ratio</span>
                                <span className="font-bold text-neon-gold">{tok.buy_ratio_1h}%</span>
                              </div>
                            </div>

                            {/* 1-Click Snipe Button */}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleSnipe(tok); }}
                              disabled={snipingAddr === tok.address}
                              className="py-1.5 px-3 rounded-lg bg-gradient-to-r from-cyan-500 to-neon-green text-black font-extrabold text-[10px] hover:opacity-90 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 shadow-sm"
                            >
                              {snipingAddr === tok.address ? (
                                <RefreshCw size={12} className="animate-spin" />
                              ) : (
                                <Zap size={12} className="fill-black" />
                              )}
                              <span>SNIPE ${snipeAmount}</span>
                            </button>
                          </div>

                          {/* BullX Forensic Inspection Strip (live on-chain data) */}
                          <ForensicStrip tok={tok} />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Positions & Embedded Live Candlestick Chart (5 Cols) */}
              <div className="lg:col-span-5 flex flex-col h-full space-y-3">
                {/* Embedded Live Chart Drawer (Photon Model) */}
                <div className="h-64 flex flex-col bg-black/40 rounded-xl border border-white/10 overflow-hidden">
                  <div className="px-3.5 py-1.5 bg-white/[0.02] border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <LineChart size={14} className="text-cyan-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Live Candlestick Feed: {activeChartToken?.symbol || 'Select Token'}
                      </span>
                    </div>
                    {activeChartToken && (
                      <a 
                        href={activeChartToken.pair_url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold"
                      >
                        DexScreener <ExternalLink size={10} />
                      </a>
                    )}
                  </div>

                  <div className="flex-1 bg-black/80 relative">
                    {activeChartToken?.embed_chart_url ? (
                      <iframe
                        src={activeChartToken.embed_chart_url}
                        title={`Chart-${activeChartToken.symbol}`}
                        className="w-full h-full border-0"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                        Click any token row on the left to stream live candles
                      </div>
                    )}
                  </div>
                </div>

                {/* Active Positions Desk */}
                <div className="flex-1 flex flex-col bg-black/40 rounded-xl border border-white/10 overflow-hidden">
                  <div className="px-4 py-2 bg-white/[0.02] border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Coins size={14} className="text-neon-green" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Active Positions ({positions.length}/3)
                      </span>
                    </div>
                    <span className="text-[10px] text-neon-green font-bold">
                      Floating: {pnlSummary.total_unrealized_usd >= 0 ? '+' : ''}${pnlSummary.total_unrealized_usd.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                    {positions.length === 0 ? (
                      <div className="p-6 text-center text-slate-500 font-sans flex flex-col items-center justify-center h-full">
                        <Coins size={24} className="text-slate-600 mb-1" />
                        <p className="text-xs">No active DEX sniper positions open.</p>
                      </div>
                    ) : (
                      positions.map((pos) => {
                        const isProfit = pos.unrealized_pnl_pct >= 0;
                        const pnlPct = pos.unrealized_pnl_pct || 0.0;
                        const minRange = selectedRiskProfile === 'SCALPER' ? -5.0 : (selectedRiskProfile === 'HUNTER_10X' ? -12.0 : -8.0);
                        const maxRange = selectedRiskProfile === 'SCALPER' ? 20.0 : (selectedRiskProfile === 'HUNTER_10X' ? 100.0 : 50.0);
                        const progressPct = Math.max(0, Math.min(100, ((pnlPct - minRange) / (maxRange - minRange)) * 100));

                        return (
                          <div
                            key={pos.id}
                            onClick={() => setActiveChartToken({
                              ...pos,
                              embed_chart_url: pos.embed_chart_url || `https://dexscreener.com/${pos.chain || 'solana'}/${pos.address}?embed=1&theme=dark&trades=0&info=0`,
                              pair_url: pos.pair_url || `https://dexscreener.com/${pos.chain || 'solana'}/${pos.address}`
                            })}
                            title="Click to stream this position's live chart"
                            className={`p-3 rounded-xl bg-[#0c121e]/90 border transition-all font-mono shadow-md cursor-pointer ${
                              activeChartToken?.address === pos.address ? 'border-cyan-400' : 'border-white/10 hover:border-cyan-500/40'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-lg bg-cyan-950/50 border border-cyan-500/40 text-cyan-300 font-black text-xs">
                                  {pos.symbol}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-white text-xs">
                                      ${pos.entry_price < 0.0001 ? pos.entry_price.toExponential(2) : pos.entry_price.toFixed(4)}
                                    </span>
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                                      {pos.stage}
                                    </span>
                                  </div>
                                  <div className="text-[9px] text-slate-400 mt-0.5 flex items-center gap-2">
                                    <span>Now: <strong className="text-white">${pos.current_price < 0.0001 ? pos.current_price.toExponential(2) : pos.current_price.toFixed(4)}</strong></span>
                                    <span>Peak: <strong className="text-cyan-300">${pos.high_water_mark < 0.0001 ? pos.high_water_mark.toExponential(2) : pos.high_water_mark.toFixed(4)}</strong></span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right">
                                <div className={`text-sm font-black ${isProfit ? 'text-neon-green' : 'text-neon-red'}`}>
                                  {isProfit ? '+' : ''}{pos.unrealized_pnl_pct}%
                                </div>
                                <div className={`text-[9.5px] font-bold ${isProfit ? 'text-neon-green/90' : 'text-neon-red/90'}`}>
                                  {isProfit ? '+' : ''}${pos.unrealized_pnl_usd} USD
                                </div>
                              </div>
                            </div>

                            {/* Risk Ladder Bar */}
                            <div className="mt-2 pt-2 border-t border-white/5">
                              <div className="flex items-center justify-between text-[8px] text-slate-400 mb-0.5">
                                <span className="text-neon-red font-bold">SL: {minRange}%</span>
                                <span>Entry: 0%</span>
                                <span className="text-neon-green font-bold">Target: +{maxRange}%</span>
                              </div>
                              <div className="relative w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/10">
                                <div 
                                  className={`h-full transition-all duration-500 ${
                                    isProfit ? 'bg-gradient-to-r from-cyan-500 to-neon-green' : 'bg-gradient-to-r from-neon-red to-amber-500'
                                  }`}
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                            </div>

                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-[8.5px] text-slate-500">
                                ${pos.amount_usd} USD · {pos.chain || 'SOL'}
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleClosePos(pos.address, pos.symbol); }}
                                disabled={closingAddr === pos.address}
                                className="px-2 py-0.5 rounded bg-neon-red/20 hover:bg-neon-red/30 text-neon-red border border-neon-red/40 text-[9px] font-bold cursor-pointer"
                              >
                                {closingAddr === pos.address ? 'CLOSING...' : 'EXIT MARKET'}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Closed Trade History Log */}
                <div className="h-32 flex flex-col bg-black/40 rounded-xl border border-white/10 overflow-hidden">
                  <div className="px-3.5 py-1.5 bg-white/[0.02] border-b border-white/10 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                      Closed Trade Receipts ({closedTrades.length})
                    </span>
                    <span className="text-[9px] text-slate-400">
                      Banked: <strong className={pnlSummary.total_realized_usd >= 0 ? 'text-neon-green' : 'text-neon-red'}>
                        ${pnlSummary.total_realized_usd.toFixed(2)}
                      </strong>
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
                    {closedTrades.length === 0 ? (
                      <div className="p-3 text-center text-slate-500 font-sans text-[10px]">
                        No closed DEX trades recorded yet.
                      </div>
                    ) : (
                      closedTrades.map((t, idx) => (
                        <div key={idx} className="p-1.5 rounded-lg bg-[#0c121e]/80 border border-white/5 flex items-center justify-between text-[9.5px]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white">{t.symbol}</span>
                            <span className="text-slate-400 truncate max-w-[120px]">{t.reason}</span>
                          </div>
                          <div className="flex items-center gap-2 font-mono">
                            <span className={t.realized_pnl_usd >= 0 ? 'text-neon-green font-bold' : 'text-neon-red font-bold'}>
                              {t.realized_pnl_pct} (${t.realized_pnl_usd})
                            </span>
                            <span className="text-slate-500 text-[8.5px]">{t.exit_time}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Radar Only View */}
          {activeTab === 'RADAR' && (
            <div className="h-full overflow-y-auto space-y-2.5 pr-2">
              {filteredListings.map((tok) => (
                <div
                  key={tok.address}
                  className="p-3.5 rounded-xl bg-[#0c121e]/80 border border-white/5 hover:border-cyan-500/50 transition-all flex items-center justify-between gap-4 font-mono shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-center min-w-[60px]">
                      <span className="text-xs font-black text-white block">{tok.symbol}</span>
                      <span className="text-[8.5px] text-cyan-400 uppercase font-bold">{tok.dex}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{tok.name}</span>
                        <span className="text-[8.5px] px-2 py-0.5 rounded-full font-bold bg-neon-green/20 text-neon-green border border-neon-green/40">
                          {tok.safety_score}/100 SAFETY
                        </span>
                        {tok.whale_flow !== 'ORGANIC FLOW' && (
                          <span className="text-[8.5px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            {tok.whale_flow} · {tok.whale_score}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-3">
                        <span>Contract: {tok.address.slice(0, 6)}...{tok.address.slice(-6)}</span>
                        <a href={tok.pair_url} target="_blank" rel="noreferrer" className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1">
                          DexScreener Chart <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 text-right">
                    <div>
                      <span className="text-[8.5px] text-slate-500 uppercase block font-bold">Price</span>
                      <span className="font-bold text-white text-xs">${tok.price_usd.toFixed(4)}</span>
                    </div>
                    <div>
                      <span className="text-[8.5px] text-slate-500 uppercase block font-bold">5m Change</span>
                      <span className={`font-bold text-xs ${tok.price_change_5m >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                        {tok.price_change_5m >= 0 ? '+' : ''}{tok.price_change_5m}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[8.5px] text-slate-500 uppercase block font-bold">Liquidity</span>
                      <span className="font-bold text-cyan-300 text-xs">${(tok.liquidity_usd / 1000).toFixed(0)}k</span>
                    </div>
                    <div>
                      <span className="text-[8.5px] text-slate-500 uppercase block font-bold">Buy Flow</span>
                      <span className="font-bold text-neon-gold text-xs">{tok.buy_ratio_1h}%</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSnipe(tok)}
                    disabled={snipingAddr === tok.address}
                    className="py-2 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-neon-green text-black font-extrabold text-[11px] hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Zap size={13} className="fill-black" />
                    <span>SNIPE ${snipeAmount}</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Positions Only View */}
          {activeTab === 'POSITIONS' && (
            <div className="h-full overflow-y-auto space-y-3 pr-2">
              {positions.length === 0 ? (
                <div className="p-16 text-center text-slate-500 font-sans">
                  No active DEX sniper positions currently held.
                </div>
              ) : (
                positions.map((pos) => {
                  const isProfit = pos.unrealized_pnl_pct >= 0;
                  return (
                    <div
                      key={pos.id}
                      className="p-4 rounded-xl bg-[#0c121e]/90 border border-white/10 flex items-center justify-between font-mono shadow-lg"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="p-3 rounded-xl bg-cyan-950/50 border border-cyan-500/40 text-cyan-300 font-black text-base">
                          {pos.symbol}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-white text-sm">
                              ${pos.entry_price.toFixed(4)} Entry
                            </span>
                            <span className="px-2 py-0.5 rounded-full font-bold bg-cyan-500/20 text-cyan-300 text-[10px]">
                              {pos.stage}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                            <span>Current: <strong>${pos.current_price.toFixed(4)}</strong></span>
                            <span>Peak: <strong className="text-cyan-300">${pos.high_water_mark.toFixed(4)}</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className={`text-xl font-black ${isProfit ? 'text-neon-green' : 'text-neon-red'}`}>
                            {isProfit ? '+' : ''}{pos.unrealized_pnl_pct}%
                          </div>
                          <div className={`text-xs font-bold ${isProfit ? 'text-neon-green/90' : 'text-neon-red/90'}`}>
                            {isProfit ? '+' : ''}${pos.unrealized_pnl_usd} USD
                          </div>
                        </div>

                        <button
                          onClick={() => handleClosePos(pos.address, pos.symbol)}
                          className="px-3 py-1.5 rounded-xl bg-neon-red/20 hover:bg-neon-red/30 text-neon-red border border-neon-red/40 text-xs font-bold cursor-pointer"
                        >
                          EXIT MARKET
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* History Only View */}
          {activeTab === 'HISTORY' && (
            <div className="h-full overflow-y-auto space-y-2 pr-2">
              {closedTrades.map((t, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-[#0c121e]/80 border border-white/5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded font-bold text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {t.status}
                    </span>
                    <span className="font-bold text-white text-sm">{t.symbol}</span>
                    <span className="text-slate-400">{t.reason}</span>
                  </div>
                  <div className="flex items-center gap-4 font-mono">
                    <span className={`text-sm font-black ${t.realized_pnl_usd >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                      {t.realized_pnl_pct} (${t.realized_pnl_usd})
                    </span>
                    <span className="text-slate-500 text-xs">{t.exit_time}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
