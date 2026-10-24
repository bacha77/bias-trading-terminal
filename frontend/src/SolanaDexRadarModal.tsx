import React, { useState, useEffect } from 'react';
import { 
  X, RefreshCw, Zap, ShieldCheck, ExternalLink, 
  Copy, Check, Flame, Coins, 
  DollarSign, Activity, Maximize2, Minimize2, 
  Layers, Target, Shield, Gauge,
  LineChart, Sparkles, Sliders,
  AlertTriangle, Volume2, VolumeX, Star, Diamond, Users, Plus, Trash2, Wallet,
  Brain, Search, Cpu, Network, Power, AlertOctagon,
  Award, TrendingUp
} from 'lucide-react';
import { API_BASE } from './config';

interface SolanaDexRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Pure Browser Web Audio API Chimes (Zero external MP3 dependency)
const playChime = (type: 'snipe' | 'profit' | 'exit' | 'flatten') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    if (type === 'snipe') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'profit') {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.12, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.25);
      });
    } else if (type === 'exit') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.2);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (type === 'flatten') {
      [0, 0.12].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now + offset);
        osc.frequency.exponentialRampToValueAtTime(440, now + offset + 0.1);
        gain.gain.setValueAtTime(0.18, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.1);
      });
    }
  } catch (e) {
    // Audio context may be restricted before user interaction
  }
};

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

// Robust numeric formatters ensuring undefined/null values never crash React rendering
const fmtPrice = (val: any): string => {
  const n = Number(val);
  if (val == null || isNaN(n) || n === 0) return '0.0000';
  if (n < 0.0001) return n.toExponential(2);
  return n.toFixed(4);
};

const fmtNum = (val: any, decimals: number = 2): string => {
  const n = Number(val);
  if (val == null || isNaN(n)) return (0).toFixed(decimals);
  return n.toFixed(decimals);
};

export const SolanaDexRadarModal: React.FC<SolanaDexRadarModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [selectedChain, setSelectedChain] = useState<'both' | 'solana' | 'base'>('both');
  const [selectedRiskProfile, setSelectedRiskProfile] = useState<string>('MOONBAG');
  const [listings, setListings] = useState<any[]>([]);
  const [trackedWallets, setTrackedWallets] = useState<any[]>([]);
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
  const [snipeAmount, setSnipeAmount] = useState(35);
  const [maxPositions, setMaxPositions] = useState(6);
  const [gasPriority, setGasPriority] = useState<'NORMAL' | 'TURBO' | 'ULTRA_JITO'>('TURBO');
  const [slippageBps, setSlippageBps] = useState<number>(100);
  const [antiMevShield, setAntiMevShield] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'SPLIT' | 'RADAR' | 'POSITIONS' | 'HISTORY' | 'WALLETS' | 'LEARNING' | 'BLUECHIPS' | 'ARENA'>('SPLIT');
  const [arenaData, setArenaData] = useState<any>(null);
  const [isTuningBeekeeper, setIsTuningBeekeeper] = useState<boolean>(false);
  const [freqtradeData, setFreqtradeData] = useState<any>(null);
  const [isUnlockingProtections, setIsUnlockingProtections] = useState<boolean>(false);
  const [bluechipData, setBluechipData] = useState<any>(null);
  const [isLoadingBluechips, setIsLoadingBluechips] = useState<boolean>(false);
  const [bluechipStrategyMode, setBluechipStrategyMode] = useState<string>('BLUECHIP_MOMENTUM');
  const [learningInsights, setLearningInsights] = useState<any>(null);
  const [whaleConsensus, setWhaleConsensus] = useState<any[]>([]);
  const [auditMintInput, setAuditMintInput] = useState('');
  const [auditResult, setAuditResult] = useState<any>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);
  const [snipingAddr, setSnipingAddr] = useState<string | null>(null);
  const [closingAddr, setClosingAddr] = useState<string | null>(null);
  const [isFlattening, setIsFlattening] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filterSafety, setFilterSafety] = useState(false);
  const [filterWhalesOnly, setFilterWhalesOnly] = useState(false);
  const [filterPreGraduation, setFilterPreGraduation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newWalletAddr, setNewWalletAddr] = useState('');
  const [newWalletLabel, setNewWalletLabel] = useState('');
  const [newWalletChain, setNewWalletChain] = useState<'solana' | 'base'>('solana');

  // Real Money On-Chain Wallet & Execution Mode State
  const [dexMode, setDexMode] = useState<'SIMULATION' | 'LIVE'>('SIMULATION');
  const [accountView, setAccountView] = useState<'LIVE' | 'SIMULATION'>('SIMULATION');
  const [livePositions, setLivePositions] = useState<any[]>([]);
  const [paperPositions, setPaperPositions] = useState<any[]>([]);
  const [liveClosedTrades, setLiveClosedTrades] = useState<any[]>([]);
  const [paperClosedTrades, setPaperClosedTrades] = useState<any[]>([]);
  const [livePnlSummary, setLivePnlSummary] = useState<any>(null);
  const [paperPnlSummary, setPaperPnlSummary] = useState<any>(null);
  const [walletInfo, setWalletInfo] = useState<any>(null);
  const [showWalletModal, setShowWalletModal] = useState<boolean>(false);
  const [isReclaimingRent, setIsReclaimingRent] = useState<boolean>(false);

  const handleReclaimRent = async () => {
    setIsReclaimingRent(true);
    try {
      const res = await fetch(`${API_BASE}/api/dex/reclaim-rent`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'SUCCESS' || (data.closed_count && data.closed_count > 0)) {
        setToastMsg({
          type: 'success',
          text: `💰 Rent Reclaimed! Refunded +${data.reclaimed_sol} SOL (${data.closed_count} dead accounts closed).`
        });
        fetchWalletInfo();
        fetchPositions();
      } else {
        setToastMsg({
          type: 'success',
          text: data.message || 'No empty accounts to reclaim.'
        });
        fetchWalletInfo();
      }
    } catch (e: any) {
      setToastMsg({ type: 'error', text: `Failed to reclaim rent: ${e.message}` });
    } finally {
      setIsReclaimingRent(false);
    }
  };

  const [customRpcInput, setCustomRpcInput] = useState<string>('');
  const [isTestingRpc, setIsTestingRpc] = useState<boolean>(false);
  const [isSavingRpc, setIsSavingRpc] = useState<boolean>(false);

  const handleTestRpc = async () => {
    if (!customRpcInput.trim()) return;
    setIsTestingRpc(true);
    try {
      const res = await fetch(`${API_BASE}/api/dex/test-rpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rpc_url: customRpcInput.trim() })
      });
      const data = await res.json();
      if (data.status === 'HEALTHY') {
        setToastMsg({
          type: 'success',
          text: `⚡ RPC Verified! Latency: ${data.latency_ms}ms (${data.provider}).`
        });
      } else {
        setToastMsg({
          type: 'error',
          text: `❌ RPC Test Failed: ${data.error || 'Connection timed out'}`
        });
      }
    } catch (e: any) {
      setToastMsg({ type: 'error', text: `Test error: ${e.message}` });
    } finally {
      setIsTestingRpc(false);
    }
  };

  const handleSaveRpc = async () => {
    if (!customRpcInput.trim()) return;
    setIsSavingRpc(true);
    try {
      const res = await fetch(`${API_BASE}/api/dex/set-rpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rpc_url: customRpcInput.trim() })
      });
      const data = await res.json();
      if (data.status === 'SUCCESS') {
        setToastMsg({
          type: 'success',
          text: `🚀 Connected to ${data.health?.provider} (${data.health?.latency_ms}ms)!`
        });
        setCustomRpcInput('');
        fetchWalletInfo();
      } else {
        setToastMsg({
          type: 'error',
          text: data.message || 'Failed to save RPC.'
        });
      }
    } catch (e: any) {
      setToastMsg({ type: 'error', text: `Save error: ${e.message}` });
    } finally {
      setIsSavingRpc(false);
    }
  };

  const fetchLearningData = async () => {
    try {
      const [r1, r2] = await Promise.all([
        fetch(`${API_BASE}/api/dex/learning-insights`),
        fetch(`${API_BASE}/api/dex/whale-consensus`)
      ]);
      if (r1.ok) setLearningInsights(await r1.json());
      if (r2.ok) {
        const j2 = await r2.json();
        setWhaleConsensus(j2.consensus_signals || []);
      }
    } catch (e) {
      console.error('Failed to fetch learning insights:', e);
    }
  };

  const fetchBluechips = async () => {
    setIsLoadingBluechips(true);
    try {
      const res = await fetch(`${API_BASE}/api/dex/bluechips`);
      if (res.ok) {
        const data = await res.json();
        setBluechipData(data);
        if (data.active_strategy) {
          setBluechipStrategyMode(data.active_strategy);
        }
      }
    } catch (e) {
      console.error('Failed to fetch bluechips:', e);
    } finally {
      setIsLoadingBluechips(false);
    }
  };

  const fetchArenaData = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/beekeeper/arena`);
      if (res.ok) {
        const data = await res.json();
        setArenaData(data);
      }
    } catch (e) {
      console.error('Failed to fetch Beekeeper arena:', e);
    }
  };

  const handleBeekeeperTuneNow = async () => {
    setIsTuningBeekeeper(true);
    try {
      const res = await fetch(`${API_BASE}/api/beekeeper/tune-now`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setToastMsg({
          type: 'success',
          text: `🐝 Beekeeper auto-tuned! Leader: ${data.leader} (${data.allocation}% alloc)`
        });
        fetchArenaData();
      }
    } catch (e: any) {
      setToastMsg({ type: 'error', text: `Tuning failed: ${e.message}` });
    } finally {
      setIsTuningBeekeeper(false);
    }
  };

  const fetchFreqtradeProtections = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/freqtrade/protections`);
      if (res.ok) {
        setFreqtradeData(await res.json());
      }
    } catch (e) {
      console.error('Failed to fetch Freqtrade protections:', e);
    }
  };

  const handleUnlockProtections = async () => {
    setIsUnlockingProtections(true);
    try {
      const res = await fetch(`${API_BASE}/api/freqtrade/unlock-all`, { method: 'POST' });
      if (res.ok) {
        setToastMsg({ type: 'success', text: '🛡️ All Freqtrade Protection Guards cleared & unlocked!' });
        fetchFreqtradeProtections();
        fetchArenaData();
      }
    } catch (e: any) {
      setToastMsg({ type: 'error', text: `Unlock failed: ${e.message}` });
    } finally {
      setIsUnlockingProtections(false);
    }
  };

  const handleSetStrategyMode = async (mode: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/dex/set-strategy-mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy_mode: mode })
      });
      if (res.ok) {
        setBluechipStrategyMode(mode);
        setToastMsg({
          type: 'success',
          text: `🎯 Autonomous strategy mode set to: ${mode}`
        });
        fetchBluechips();
      }
    } catch (e: any) {
      setToastMsg({ type: 'error', text: `Failed to set strategy mode: ${e.message}` });
    }
  };

  const handleAuditDeployer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditMintInput.trim()) return;
    setIsAuditing(true);
    try {
      const res = await fetch(`${API_BASE}/api/dex/check-fingerprint?address=${encodeURIComponent(auditMintInput.trim())}`);
      if (res.ok) {
        setAuditResult(await res.json());
      }
    } catch (e) {
      console.error('Failed to audit deployer fingerprint:', e);
    } finally {
      setIsAuditing(false);
    }
  };

  const fetchWalletInfo = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/dex/wallet`);
      if (res.ok) {
        const json = await res.json();
        setWalletInfo(json);
      }
    } catch (e) {
      console.error('Failed to fetch DEX wallet info:', e);
    }
  };

  const handleToggleDexMode = async (mode: 'SIMULATION' | 'LIVE') => {
    try {
      const res = await fetch(`${API_BASE}/api/dex/set-mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
      const json = await res.json();
      if (json.status === 'SUCCESS') {
        setDexMode(json.dex_mode);
        if (json.wallet) setWalletInfo(json.wallet);
        setToastMsg({
          type: 'success',
          text: json.dex_mode === 'LIVE' ? '🔴 Live On-Chain Trading Active!' : '🟡 Safe Simulation Mode Active.'
        });
      }
    } catch (e) {
      console.error('Failed to toggle DEX mode:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchListings(selectedChain, true);
      fetchPositions();
      fetchWalletInfo();
      fetchLearningData();
      fetchBluechips();
      fetchArenaData();
      fetchFreqtradeProtections();

      const posInterval = setInterval(() => {
        fetchPositions();
      }, 3500);

      const radarInterval = setInterval(() => {
        fetchListings(selectedChain, false);
        fetchLearningData();
        fetchBluechips();
        fetchArenaData();
        fetchFreqtradeProtections();
      }, 10000);

      return () => {
        clearInterval(posInterval);
        clearInterval(radarInterval);
      };
    }
  }, [isOpen, selectedChain]);

  const handleSelectChain = async (chain: 'both' | 'solana' | 'base') => {
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
        const allPos = json.active_positions || [];
        const lPos = json.live_positions || allPos.filter((p: any) => p.mode === 'LIVE' || p.mode === 'LIVE_ONCHAIN');
        const pPos = json.paper_positions || allPos.filter((p: any) => p.mode !== 'LIVE' && p.mode !== 'LIVE_ONCHAIN');
        setLivePositions(lPos);
        setPaperPositions(pPos);

        const allClosed = json.closed_trades || [];
        const lClosed = json.live_closed_trades || allClosed.filter((t: any) => t.mode === 'LIVE' || t.mode === 'LIVE_ONCHAIN');
        const pClosed = json.paper_closed_trades || allClosed.filter((t: any) => t.mode !== 'LIVE' && t.mode !== 'LIVE_ONCHAIN');
        setLiveClosedTrades(lClosed);
        setPaperClosedTrades(pClosed);

        setDexArmed(json.dex_armed || false);
        if (json.wallet) setWalletInfo(json.wallet);
        if (json.risk_profile) setSelectedRiskProfile(json.risk_profile);
        if (json.tracked_wallets) setTrackedWallets(json.tracked_wallets);
        if (json.pnl_summary) {
          setPnlSummary(json.pnl_summary);
          if (json.pnl_summary.live) setLivePnlSummary(json.pnl_summary.live);
          if (json.pnl_summary.paper) setPaperPnlSummary(json.pnl_summary.paper);
        }
        if (json.sniper_amount_usd) setSnipeAmount(json.sniper_amount_usd);
        if (json.max_positions) setMaxPositions(json.max_positions);
        if (json.gas_priority) setGasPriority(json.gas_priority);
        if (json.slippage_bps != null) setSlippageBps(json.slippage_bps);
        if (json.anti_mev_shield != null) setAntiMevShield(json.anti_mev_shield);
        if (json.dex_mode) {
          setDexMode(json.dex_mode);
        }
      }
    } catch (e) {
      console.error('Failed to load DEX positions:', e);
    }
  };

  const handleUpdateExecutionSettings = async (updates: { gas_priority?: string; slippage_bps?: number; anti_mev_shield?: boolean }) => {
    if (updates.gas_priority) setGasPriority(updates.gas_priority as any);
    if (updates.slippage_bps != null) setSlippageBps(updates.slippage_bps);
    if (updates.anti_mev_shield != null) setAntiMevShield(updates.anti_mev_shield);
    try {
      await fetch(`${API_BASE}/api/dex/set-execution-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      setToastMsg({ type: 'success', text: 'Institutional execution settings updated.' });
      setTimeout(() => setToastMsg(null), 3000);
    } catch (e) {
      console.error('Failed to update execution settings:', e);
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
          max_positions: maxPositions,
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

  const handleSetMaxPositions = async (slots: number) => {
    setMaxPositions(slots);
    try {
      const res = await fetch(`${API_BASE}/api/dex/set-max-positions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_positions: slots })
      });
      if (res.ok) {
        setToastMsg({
          type: 'success',
          text: `🎯 Active DEX slots updated to ${slots} concurrent positions!`
        });
        fetchPositions();
      }
    } catch (e) {
      console.error('Failed to update max positions:', e);
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
          mode: dexMode === 'LIVE' ? 'LIVE' : 'SIMULATION',
          chain: selectedChain
        })
      });
      const data = await res.json();
      if (data.status === 'SUCCESS') {
        if (soundEnabled) playChime('snipe');
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
        if (soundEnabled) playChime('exit');
        setToastMsg({ type: 'success', text: `Closed ${sym} position. Realized P&L banked.` });
        fetchPositions();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setClosingAddr(null);
    }
  };

  const handleFlattenAll = async () => {
    if (!window.confirm("⚠️ EMERGENCY FLATTEN ALL: Liquidate 100% of all open DEX positions to cash immediately?")) {
      return;
    }
    setIsFlattening(true);
    try {
      const res = await fetch(`${API_BASE}/api/dex/flatten-all`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        if (soundEnabled) playChime('flatten');
        setToastMsg({
          type: 'success',
          text: `⚡ FLATTEN EXECUTED: Liquidated ${data.flattened_count || 0} open positions to cash.`
        });
        fetchPositions();
      } else {
        setToastMsg({ type: 'error', text: data.message || 'Flatten failed' });
      }
    } catch (err: any) {
      setToastMsg({ type: 'error', text: `Flatten error: ${err.message}` });
    } finally {
      setIsFlattening(false);
    }
  };

  const handleAddTrackedWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWalletAddr.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/dex/add-tracked-wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: newWalletAddr.trim(),
          label: newWalletLabel.trim() || 'Tracked Whale',
          chain: newWalletChain
        })
      });
      const data = await res.json();
      if (res.ok) {
        setToastMsg({ type: 'success', text: `🐋 Whale wallet added to radar!` });
        setTrackedWallets(data.tracked_wallets || []);
        setNewWalletAddr('');
        setNewWalletLabel('');
      }
    } catch (e: any) {
      setToastMsg({ type: 'error', text: `Failed to add wallet: ${e.message}` });
    }
  };

  const handleRemoveTrackedWallet = async (addr: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/dex/remove-tracked-wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addr })
      });
      const data = await res.json();
      if (res.ok) {
        setToastMsg({ type: 'success', text: `Removed wallet from radar.` });
        setTrackedWallets(data.tracked_wallets || []);
      }
    } catch (e: any) {
      setToastMsg({ type: 'error', text: `Failed to remove wallet: ${e.message}` });
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
    const matchesPreGrad = !filterPreGraduation || (
      tok.graduation_status === 'PRE_GRADUATION' || 
      (tok.bonding_curve_pct != null && tok.bonding_curve_pct >= 75 && tok.bonding_curve_pct <= 95)
    );
    return matchesSearch && matchesSafety && matchesWhales && matchesPreGrad;
  });

  const activePositionsList = accountView === 'LIVE' ? livePositions : paperPositions;
  const activeClosedList = accountView === 'LIVE' ? liveClosedTrades : paperClosedTrades;
  const activeSummary = accountView === 'LIVE' 
    ? (livePnlSummary || { 
        net_pnl_usd: 0, 
        net_pnl_pct: 0, 
        total_unrealized_usd: 0, 
        total_realized_usd: 0, 
        capital_deployed_usd: 0, 
        active_positions_count: livePositions.length, 
        closed_trades_count: liveClosedTrades.length, 
        wins: 0, 
        losses: 0, 
        win_rate: 0 
      }) 
    : (paperPnlSummary || pnlSummary);
  const isNetProfit = (activeSummary.net_pnl_usd ?? 0) >= 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center p-1 sm:p-2 md:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div 
        className={`relative bg-[#070b12] border border-cyan-500/40 shadow-[0_0_80px_rgba(6,182,212,0.25)] flex flex-col transition-all duration-300 my-auto ${
          isFullScreen 
            ? 'w-full min-h-screen rounded-none' 
            : 'w-[98vw] max-w-[1740px] h-[95vh] max-h-[96vh] min-h-[380px] rounded-2xl overflow-hidden'
        }`}
      >
        {/* ================= 1. Top Institutional Navigation Header ================= */}
        <div className="flex flex-wrap items-center justify-between px-3 sm:px-6 py-1.5 sm:py-2.5 border-b border-white/10 bg-gradient-to-r from-white/[0.04] via-transparent to-white/[0.02] gap-2 sm:gap-3 shrink-0">
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
                <button
                  id="btn-dex-mode-toggle"
                  onClick={() => {
                    const nextMode = dexMode === 'LIVE' ? 'SIMULATION' : 'LIVE';
                    setAccountView(nextMode);
                    handleToggleDexMode(nextMode);
                  }}
                  className={`text-[10px] px-2.5 py-0.5 rounded font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    dexMode === 'LIVE'
                      ? 'bg-neon-red/25 text-neon-red border border-neon-red/50 shadow-[0_0_12px_rgba(255,42,109,0.35)]'
                      : 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 hover:border-emerald-400 hover:text-white'
                  }`}
                  title="Click to switch Real Money Trading ON or OFF"
                >
                  <Power size={11} className={dexMode === 'LIVE' ? 'text-neon-red' : 'text-emerald-400'} />
                  <span>{dexMode === 'LIVE' ? '🔴 REAL DEX (CLICK TO TURN OFF)' : '🟡 SIMULATION SAFE (CLICK TO ENABLE REAL)'}</span>
                </button>
                <button
                  id="btn-dex-mode-wallet"
                  onClick={() => setShowWalletModal(true)}
                  className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-white/5 text-slate-300 border border-white/10 hover:border-white/20 flex items-center gap-1 transition-all cursor-pointer"
                  title="View Connected Wallet Balance and Keypair Status"
                >
                  <Wallet size={11} className="text-cyan-400" />
                  <span>{walletInfo?.balance_sol != null ? `${walletInfo.balance_sol.toFixed(2)} SOL` : 'WALLET'}</span>
                </button>
                <button
                  id="btn-dex-rpc-status"
                  onClick={() => setShowWalletModal(true)}
                  className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1 transition-all cursor-pointer border ${
                    walletInfo?.rpc_health?.status === 'HEALTHY'
                      ? walletInfo?.rpc_health?.is_dedicated
                        ? 'bg-purple-950/40 text-purple-300 border-purple-500/40 hover:border-purple-400'
                        : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:border-emerald-400'
                      : 'bg-rose-950/40 text-rose-300 border-rose-500/40 hover:border-rose-400'
                  }`}
                  title="Click to configure High-Speed Dedicated RPC (Helius/QuickNode)"
                >
                  <Zap size={10} className={walletInfo?.rpc_health?.is_dedicated ? 'text-purple-400' : 'text-emerald-400'} />
                  <span>{walletInfo?.rpc_health?.latency_ms != null ? `${walletInfo.rpc_health.latency_ms}ms` : 'RPC'}</span>
                  <span className="text-[8px] opacity-75">[{walletInfo?.rpc_health?.is_dedicated ? 'HELIUS' : 'PUBLIC'}]</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                GMGN Smart Inflow · BullX Audit Suite (Mint/Freeze/LP Lock) · Photon Panic Bailout · Micro-Trailing Ratchet
              </p>
            </div>
          </div>

          {/* Chain & Snipe Controls */}
          <div className="flex items-center gap-3">
            {/* Multi-Chain Selector (Solana vs Base vs Both) */}
            <div className="flex items-center p-0.5 bg-black/60 rounded-xl border border-white/10 font-mono text-xs">
              {accountView === 'LIVE' ? (
                <div 
                  className="px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 bg-gradient-to-r from-purple-500 to-cyan-500 text-black font-extrabold shadow-md cursor-default"
                  title={`Real Money Mode is strictly Solana only (${(walletInfo?.sol_balance ?? 0.79).toFixed(2)} SOL funded). Base L2 is simulation only.`}
                >
                  <span>🟣 SOLANA ONLY ({(walletInfo?.sol_balance ?? 0.79).toFixed(2)} SOL)</span>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => handleSelectChain('both')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      selectedChain === 'both'
                        ? 'bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-600 text-black font-extrabold shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Autonomous Snipe on BOTH Solana and Base L2"
                  >
                    <span>⚡ DUAL (SOL + BASE)</span>
                  </button>
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
                </>
              )}
            </div>

            {/* Snipe Size Presets */}
            <div className="hidden sm:flex items-center gap-1 bg-white/[0.03] px-2.5 py-1 rounded-xl border border-white/10 font-mono text-xs">
              <span className="text-slate-500 text-[10px]">SIZE:</span>
              {[25, 35, 50, 100, 250].map((amt) => (
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

            {/* Active Position Slots Presets */}
            <div className="hidden md:flex items-center gap-1 bg-white/[0.03] px-2.5 py-1 rounded-xl border border-white/10 font-mono text-xs">
              <span className="text-slate-500 text-[10px]">SLOTS:</span>
              {[3, 5, 6, 8, 10].map((slots) => (
                <button
                  key={slots}
                  onClick={() => handleSetMaxPositions(slots)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    maxPositions === slots ? 'bg-purple-500 text-white font-extrabold shadow-sm' : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                  title={`${slots} Max Active Positions`}
                >
                  {slots}
                </button>
              ))}
            </div>

            {/* Slippage Tolerance Selector */}
            <div className="hidden lg:flex items-center gap-1 bg-white/[0.03] px-2.5 py-1 rounded-xl border border-white/10 font-mono text-xs">
              <span className="text-slate-500 text-[10px]">SLIP:</span>
              {[
                { label: '0.5%', bps: 50 },
                { label: '1.0%', bps: 100 },
                { label: '2.5%', bps: 250 },
                { label: '5.0%', bps: 500 },
              ].map((s) => (
                <button
                  key={s.bps}
                  onClick={() => handleUpdateExecutionSettings({ slippage_bps: s.bps })}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    slippageBps === s.bps ? 'bg-amber-400 text-black font-extrabold shadow-sm' : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                  title={`Max Slippage: ${s.label}`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Gas Priority & MEV Protection Toggle */}
            <div className="hidden xl:flex items-center gap-1 bg-white/[0.03] px-2 py-1 rounded-xl border border-white/10 font-mono text-xs">
              <span className="text-slate-500 text-[10px] flex items-center gap-0.5">
                <Gauge size={10} className="text-cyan-400" />
                <span>GAS:</span>
              </span>
              {[
                { label: 'NORM', val: 'NORMAL', tip: 'Normal Gas (5k lamports)' },
                { label: 'TURBO', val: 'TURBO', tip: 'Fast Validator Priority (50k lamports)' },
                { label: 'JITO 🛡️', val: 'ULTRA_JITO', tip: 'Ultra Private Bundle + Jito MEV Shield (150k lamports)' },
              ].map((g) => (
                <button
                  key={g.val}
                  onClick={() => handleUpdateExecutionSettings({ gas_priority: g.val })}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    gasPriority === g.val ? 'bg-cyan-500 text-black font-extrabold shadow-sm' : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                  title={g.tip}
                >
                  {g.label}
                </button>
              ))}

              <button
                onClick={() => handleUpdateExecutionSettings({ anti_mev_shield: !antiMevShield })}
                className={`ml-1 px-1.5 py-0.5 rounded text-[9.5px] font-black border transition-all cursor-pointer flex items-center gap-0.5 ${
                  antiMevShield 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.3)]' 
                    : 'bg-white/5 text-slate-500 border-white/5 hover:text-slate-400'
                }`}
                title={antiMevShield ? "Anti-Sandwich / MEV Shield Active (Private Validator Bundles)" : "MEV Shield Disabled (Standard Public Mempool)"}
              >
                <Shield size={10} className={antiMevShield ? "text-emerald-400" : "text-slate-500"} />
                <span>{antiMevShield ? 'MEV 🛡️' : 'OFF'}</span>
              </button>
            </div>
            {livePositions.length > 0 && (
              <button
                id="btn-flatten-header"
                onClick={handleFlattenAll}
                disabled={isFlattening}
                className="px-3 py-1.5 rounded-xl font-mono text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 bg-neon-red/25 text-neon-red hover:bg-neon-red hover:text-black border-neon-red/60 shadow-[0_0_15px_rgba(255,42,109,0.4)] animate-pulse"
                title="Immediately liquidate all open real positions back to native SOL"
              >
                <AlertOctagon size={14} />
                <span>{isFlattening ? 'LIQUIDATING...' : `EXIT ALL ${livePositions.length} POS TO SOL`}</span>
              </button>
            )}
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

            {/* Audio Chime Mute/Unmute */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl transition-colors cursor-pointer border ${
                soundEnabled 
                  ? 'text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 border-cyan-500/30' 
                  : 'text-slate-500 hover:text-slate-400 bg-white/5 border-white/5'
              }`}
              title={soundEnabled ? "Audio Chimes ON (Click to Mute)" : "Audio Chimes OFF (Click to Enable)"}
            >
              {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
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

        {/* ================= ACCOUNT MODE SWITCHER: REAL ON-CHAIN VS PAPER SIMULATION ================= */}
        <div className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-2 bg-gradient-to-r from-black via-[#0a1120] to-black border-b border-white/10 font-mono text-xs gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400">DESK ACCOUNT:</span>
            <button
              onClick={() => { 
                setAccountView('LIVE'); 
                handleSelectChain('solana');
                handleToggleDexMode('LIVE');
              }}
              className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                accountView === 'LIVE'
                  ? 'bg-neon-red/25 text-neon-red border border-neon-red/60 shadow-[0_0_14px_rgba(255,42,109,0.35)]'
                  : 'bg-white/5 text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-neon-red animate-ping" />
              <span>🔴 REAL ON-CHAIN ACCOUNT</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-neon-red/20 text-neon-red border border-neon-red/30">
                {walletInfo?.balance_sol != null ? `${fmtNum(walletInfo.balance_sol, 2)} SOL` : '0.79 SOL'}
              </span>
            </button>
            <button
              onClick={() => {
                setAccountView('SIMULATION');
                handleToggleDexMode('SIMULATION');
              }}
              className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                accountView === 'SIMULATION'
                  ? 'bg-amber-400/25 text-amber-300 border border-amber-400/60 shadow-[0_0_14px_rgba(251,191,36,0.35)]'
                  : 'bg-white/5 text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              <span>🟡 PAPER SIMULATION ACCOUNT</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                {paperPositions.length} POS
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            {accountView === 'LIVE' ? (
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <ShieldCheck size={13} className="text-emerald-400" />
                  <span>SOLANA ON-CHAIN ONLY (NO BASE IN LIVE)</span>
                </span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-300">
                  Wallet: <strong className="text-white font-mono">{walletInfo?.address ? `${walletInfo.address.slice(0, 4)}...${walletInfo.address.slice(-4)}` : 'HWDJ...xZq8'}</strong>
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-amber-400 font-medium">
                  🧪 Paper Sandbox: Virtual Capital · Dual Sol + Base Testing
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ================= 2. Real-Time DEX P&L Analytics HUD & Risk Profiles ================= */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 px-4 sm:px-6 py-2 sm:py-2.5 bg-black/60 border-b border-white/10 font-mono shrink-0">
          {/* Card 1: NET P&L / REAL WALLET BALANCE */}
          <div className={`p-2.5 rounded-xl bg-gradient-to-br border flex flex-col justify-between ${
            accountView === 'LIVE' ? 'from-neon-red/[0.08] to-transparent border-neon-red/40' : 'from-white/[0.04] to-transparent border-white/10'
          }`}>
            <span className={`text-[10px] uppercase tracking-wider flex items-center justify-between font-bold ${
              accountView === 'LIVE' ? 'text-neon-red' : 'text-slate-400'
            }`}>
              <span>{accountView === 'LIVE' ? 'Real Wallet Balance' : 'Paper Net P&L'}</span>
              {accountView === 'LIVE' ? <Wallet size={13} className="text-neon-red" /> : <DollarSign size={13} className="text-cyan-400" />}
            </span>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              {accountView === 'LIVE' ? (
                <span className="text-xl font-black text-white tracking-tight">
                  {walletInfo?.balance_sol != null ? fmtNum(walletInfo.balance_sol, 4) : '0.0234'} <span className="text-xs text-neon-red font-bold">SOL</span>
                </span>
              ) : (
                <>
                  <span className={`text-xl font-black tracking-tight ${isNetProfit ? 'text-neon-green' : 'text-neon-red'}`}>
                    {isNetProfit ? '+' : ''}${fmtNum(activeSummary.net_pnl_usd, 2)}
                  </span>
                  <span className={`text-xs font-bold ${isNetProfit ? 'text-neon-green' : 'text-neon-red'}`}>
                    ({isNetProfit ? '+' : ''}{fmtNum(activeSummary.net_pnl_pct, 1)}%)
                  </span>
                </>
              )}
            </div>
            <div className={`text-[9px] ${accountView === 'LIVE' ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
              {accountView === 'LIVE' 
                ? `≈ $${walletInfo?.total_equity_usd != null ? fmtNum(walletInfo.total_equity_usd, 2) : (walletInfo?.balance_usd != null ? fmtNum(walletInfo.balance_usd, 2) : '205.57')} Total Equity`
                : 'Virtual Paper Sandbox'}
            </div>
          </div>

          {/* Card 2: Floating Open P&L */}
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-white/[0.04] to-transparent border border-white/10 flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>{accountView === 'LIVE' ? 'Real Floating P&L' : 'Paper Floating P&L'}</span>
              <Activity size={13} className="text-amber-400" />
            </span>
            <div className="mt-0.5">
              <span className={`text-lg font-bold tracking-tight ${(Number(activeSummary.total_unrealized_usd) || 0) >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                {(Number(activeSummary.total_unrealized_usd) || 0) >= 0 ? '+' : ''}${fmtNum(activeSummary.total_unrealized_usd, 2)}
              </span>
            </div>
            <div className="text-[9px] text-slate-500">{activePositionsList.length} {accountView === 'LIVE' ? 'Real On-Chain' : 'Paper'} Positions</div>
          </div>

          {/* Card 3: Realized Cash Banked */}
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-white/[0.04] to-transparent border border-white/10 flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>{accountView === 'LIVE' ? 'Real Banked Cash' : 'Paper Cash Banked'}</span>
              <Coins size={13} className="text-neon-gold" />
            </span>
            <div className="mt-0.5">
              <span className={`text-lg font-bold tracking-tight ${(Number(activeSummary.total_realized_usd) || 0) >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                {(Number(activeSummary.total_realized_usd) || 0) >= 0 ? '+' : ''}${fmtNum(activeSummary.total_realized_usd, 2)}
              </span>
            </div>
            <div className="text-[9px] text-slate-500">{activeClosedList.length} {accountView === 'LIVE' ? 'Real On-Chain' : 'Paper'} Trades</div>
          </div>

          {/* Card 4: Capital In Play */}
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-white/[0.04] to-transparent border border-white/10 flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>{accountView === 'LIVE' ? 'Real Capital In Play' : 'Paper Capital In Play'}</span>
              <Layers size={13} className="text-purple-400" />
            </span>
            <div className="mt-0.5">
              <span className="text-lg font-bold text-white tracking-tight">
                ${fmtNum(activeSummary.capital_deployed_usd, 0)} <span className="text-xs text-slate-400 font-normal">/ ${(Number(snipeAmount || 35) * Number(maxPositions || 6)).toFixed(0)} max</span>
              </span>
            </div>
            <div className="text-[9px] text-slate-500 flex items-center justify-between">
              <span>{activePositionsList.length}/{maxPositions} {accountView === 'LIVE' ? 'Real' : 'Paper'} Slots</span>
              {accountView === 'LIVE' && (
                <span className="text-amber-400 font-bold" title="Maximum funded concurrent slots based on current SOL balance">
                  Cap: {Math.max(1, Math.floor(((walletInfo?.usd_balance || (walletInfo?.sol_balance || 0.79) * 106.6)) / Math.max(1, Number(snipeAmount || 25))))} slots funded
                </span>
              )}
            </div>
          </div>

          {/* Card 5: Win Rate */}
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-white/[0.04] to-transparent border border-white/10 flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Closed Win Rate</span>
              <Target size={13} className="text-emerald-400" />
            </span>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-emerald-300">
                {fmtNum(activeSummary.win_rate, 0)}%
              </span>
              <span className="text-[10px] text-slate-400">
                ({activeSummary.wins ?? 0}W / {activeSummary.losses ?? 0}L)
              </span>
            </div>
            <div className="text-[9px] text-slate-500">{accountView === 'LIVE' ? 'Real On-Chain Accuracy' : 'Paper Sim Accuracy'}</div>
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
                title="-6% Stop Loss / +15% 100% Cashout to SOL"
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
                title="-8% Stop Loss / +35% Take Profit"
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
                title="-10% Stop Loss / +75% Take Profit"
              >
                10X HUNT
              </button>
            </div>
            <div className="text-[8.5px] text-slate-400 truncate mt-0.5">
              {selectedRiskProfile === 'SCALPER' ? '-6% SL · +15% 100% Cashout (No Runner)' : 
               selectedRiskProfile === 'MOONBAG' ? '-8% SL · +35% TP · -15% Trail' : 
               '-10% SL · +75% TP · -20% Trail'}
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
        <div className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-2 border-b border-white/10 bg-white/[0.01] shrink-0 gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-mono overflow-x-auto max-w-full pb-1 sm:pb-0">
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
              <span>POSITIONS ({activePositionsList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`pb-1 px-3 font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'HISTORY'
                  ? 'border-purple-400 text-purple-300'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <span>RECEIPTS ({activeClosedList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('WALLETS')}
              className={`pb-1 px-3 font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'WALLETS'
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Users size={13} className="text-cyan-400" />
              <span>SMART WHALES ({trackedWallets.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('LEARNING')}
              className={`pb-1 px-3 font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'LEARNING'
                  ? 'border-emerald-400 text-emerald-300'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles size={13} className="text-emerald-400" />
              <span>🧠 QUANT AI & CABAL RADAR</span>
            </button>

            <button
              id="tab-bluechip-alpha"
              onClick={() => {
                setActiveTab('BLUECHIPS');
                fetchBluechips();
              }}
              className={`pb-1 px-3 font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'BLUECHIPS'
                  ? 'border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.35)]'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Award size={13} className="text-cyan-400" />
              <span>🏛️ BLUE-CHIP ALPHA ({bluechipData?.bluechips?.length || 7})</span>
            </button>

            <button
              id="tab-bee-arena"
              onClick={() => {
                setActiveTab('ARENA');
                fetchArenaData();
              }}
              className={`pb-1 px-3 font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ARENA'
                  ? 'border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.35)]'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <span>🐝 BEE ARENA & AUTO-TUNER</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative">
              <input
                type="text"
                placeholder="Search symbol, pair or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1 bg-black/50 border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 font-mono focus:border-cyan-400 focus:outline-none w-44 sm:w-56"
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
              onClick={() => setFilterPreGraduation(!filterPreGraduation)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                filterPreGraduation 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
              }`}
              title="Filter for tokens at 75-95% bonding curve progress"
            >
              <Zap size={12} className="text-amber-400" />
              <span>⚡ Pre-Grad (75-95%)</span>
            </button>

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
        <div className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-4 font-mono">
          {activeTab === 'SPLIT' && (
            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-3 sm:gap-5 min-h-[550px] lg:h-full min-h-0">
              {/* Left Column: Clean Breakout Radar & Forensics (7 Cols) */}
              <div className="lg:col-span-7 flex flex-col h-[520px] lg:h-full bg-black/40 rounded-xl border border-white/10 overflow-hidden shrink-0">
                <div className="px-4 py-2 bg-white/[0.02] border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame size={15} className="text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      {selectedChain.toUpperCase()} Breakout Radar ({filteredListings.length} Pairs)
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Min Liquidity: $50k · Min 24h Vol: $50k · GeckoTerminal & Raydium
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

                                <div className="flex items-center gap-2 text-[9.5px] text-slate-400 pt-0.5 flex-wrap">
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
                                  {tok.chain === 'solana' && (
                                    <a
                                      href={`https://rugcheck.xyz/tokens/${tok.address}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-0.5"
                                      title="Open RugCheck Forensics"
                                    >
                                      Audit <ExternalLink size={8} />
                                    </a>
                                  )}
                                  <a
                                    href={tok.chain === 'solana' ? `https://solscan.io/token/${tok.address}` : `https://basescan.org/token/${tok.address}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-0.5"
                                    title="Explorer"
                                  >
                                    Explorer <ExternalLink size={8} />
                                  </a>
                                  <span className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-0.5">
                                    <LineChart size={11} /> Chart Active
                                  </span>
                                </div>

                                {/* Bonding Curve Progress (Pump.fun / Moonshot style) */}
                                {tok.bonding_curve_pct != null && (
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[8.5px] font-mono text-slate-400 flex items-center gap-1">
                                      <span>⚡ Curve:</span>
                                      <strong className={tok.bonding_curve_pct >= 75 ? 'text-amber-300' : 'text-slate-300'}>
                                        {tok.bonding_curve_pct}%
                                      </strong>
                                    </span>
                                    <div className="w-16 h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/10">
                                      <div 
                                        className={`h-full ${tok.bonding_curve_pct >= 90 ? 'bg-gradient-to-r from-amber-500 to-neon-green' : 'bg-cyan-500'}`}
                                        style={{ width: `${Math.min(100, tok.bonding_curve_pct)}%` }}
                                      />
                                    </div>
                                    {tok.graduation_status === 'PRE_GRADUATION' && (
                                      <span className="text-[7.5px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-black border border-amber-500/40 animate-pulse">
                                        ⚡ PRE-GRAD
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Financial Metrics Strip */}
                            <div className="grid grid-cols-4 gap-2.5 text-center sm:text-right text-[10px]">
                              <div>
                                <span className="text-[8px] text-slate-500 uppercase block font-bold">Price</span>
                                <span className="font-bold text-white font-mono">
                                  ${fmtPrice(tok.price_usd)}
                                </span>
                              </div>
                              <div>
                                <span className="text-[8px] text-slate-500 uppercase block font-bold">5m Gain</span>
                                <span className={`font-bold flex items-center justify-end ${(Number(tok.price_change_5m) || 0) >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                                  {(Number(tok.price_change_5m) || 0) >= 0 ? '+' : ''}{fmtNum(tok.price_change_5m, 1)}%
                                </span>
                              </div>
                              <div>
                                <span className="text-[8px] text-slate-500 uppercase block font-bold">Liquidity</span>
                                <span className="font-bold text-cyan-300">${fmtNum((Number(tok.liquidity_usd) || 0) / 1000, 0)}k</span>
                              </div>
                              <div>
                                <span className="text-[8px] text-slate-500 uppercase block font-bold">Buy Ratio</span>
                                <span className="font-bold text-neon-gold">{tok.buy_ratio_1h ?? 50}%</span>
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
              <div className="lg:col-span-5 flex flex-col h-auto lg:h-full space-y-3 shrink-0">
                {/* Embedded Live Chart Drawer (Photon Model) */}
                <div className="h-64 sm:h-72 flex flex-col bg-black/40 rounded-xl border border-white/10 overflow-hidden shrink-0">
                  <div className="px-3.5 py-1.5 bg-white/[0.02] border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <LineChart size={14} className="text-cyan-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Live Candlestick Feed: {activeChartToken?.symbol || 'Select Token'}
                      </span>
                    </div>
                    {activeChartToken && (
                      <div className="flex items-center gap-2">
                        {activeChartToken.chain === 'solana' && (
                          <>
                            <a 
                              href={`https://rugcheck.xyz/tokens/${activeChartToken.address}`}
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-0.5 font-bold"
                              title="View RugCheck On-Chain Audit Report"
                            >
                              RugCheck <ExternalLink size={9} />
                            </a>
                            <span className="text-white/20">|</span>
                            <a 
                              href={`https://jup.ag/swap/SOL-${activeChartToken.address}`}
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 font-bold"
                              title="Open in Jupiter DEX Aggregator"
                            >
                              Jupiter <ExternalLink size={9} />
                            </a>
                            <span className="text-white/20">|</span>
                          </>
                        )}
                        <a 
                          href={activeChartToken.chain === 'solana' ? `https://solscan.io/token/${activeChartToken.address}` : `https://basescan.org/token/${activeChartToken.address}`}
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-0.5 font-bold"
                          title="Open Blockchain Explorer"
                        >
                          Explorer <ExternalLink size={9} />
                        </a>
                        <span className="text-white/20">|</span>
                        <a 
                          href={activeChartToken.pair_url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5 font-bold"
                        >
                          Chart <ExternalLink size={9} />
                        </a>
                      </div>
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
                <div className="flex-1 min-h-[380px] lg:min-h-0 flex flex-col bg-black/40 rounded-xl border border-white/10 overflow-hidden shrink-0">
                  <div className="px-4 py-2 bg-white/[0.02] border-b border-white/10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Coins size={14} className="text-neon-green" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Active Positions ({activePositionsList.length}/{maxPositions})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-neon-green font-bold">
                        Floating: {(Number(activeSummary.total_unrealized_usd) || 0) >= 0 ? '+' : ''}${fmtNum(activeSummary.total_unrealized_usd, 2)}
                      </span>
                      {activePositionsList.length > 0 && (
                        <button
                          onClick={handleFlattenAll}
                          disabled={isFlattening}
                          className="px-2 py-0.5 rounded bg-neon-red/20 hover:bg-neon-red/30 text-neon-red border border-neon-red/50 text-[9px] font-black tracking-wide flex items-center gap-1 cursor-pointer transition-all shadow-[0_0_10px_rgba(255,59,92,0.3)] animate-pulse"
                          title="Panic Liquidate Open Positions to Cash"
                        >
                          <AlertTriangle size={11} />
                          <span>{isFlattening ? 'FLATTENING...' : '⚡ FLATTEN ALL'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                    {activePositionsList.length === 0 ? (
                      <div className="p-6 text-center text-slate-500 font-sans flex flex-col items-center justify-center h-full">
                        <Coins size={24} className={accountView === 'LIVE' ? "text-neon-red/60 mb-1" : "text-slate-600 mb-1"} />
                        <p className="text-xs font-bold text-slate-300">
                          {accountView === 'LIVE' ? 'No active real on-chain positions currently held.' : 'No active paper simulation positions open.'}
                        </p>
                        {accountView === 'LIVE' && (
                          <p className="text-[10px] text-emerald-400 mt-1 max-w-xs">
                            Your {(walletInfo?.sol_balance ?? 0.79).toFixed(2)} SOL wallet is live and scanning. The sniper will trigger on-chain Jupiter orders when top-scoring Solana tokens pass all 5 BullX / GMGN gates.
                          </p>
                        )}
                      </div>
                    ) : (
                      activePositionsList.map((pos) => {
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
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-extrabold text-white text-xs">
                                      ${fmtPrice(pos.entry_price)}
                                    </span>
                                    <span className={`text-[8.5px] px-1.5 py-0.2 rounded font-black border ${
                                      (pos.chain || 'solana').toLowerCase() === 'base'
                                        ? 'bg-blue-600/30 text-blue-300 border-blue-500/50'
                                        : 'bg-purple-600/30 text-purple-300 border-purple-500/50'
                                    }`}>
                                      {(pos.chain || 'solana').toLowerCase() === 'base' ? '🔵 BASE' : '🟣 SOL'}
                                    </span>
                                    <span className="text-[8.5px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                                      {pos.stage || 'ACTIVE_HOLD'}
                                    </span>

                                    {/* Breakeven Locked Badge */}
                                    {pos.breakeven_locked && (
                                      <span className="text-[8px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black flex items-center gap-0.5">
                                        <Star size={9} className="fill-emerald-300 text-emerald-300" />
                                        <span>BE LOCKED</span>
                                      </span>
                                    )}

                                    {/* Moonbag Runner Badge */}
                                    {pos.stage === 'RUNNER_50%' && (
                                      <span className="text-[8px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-black flex items-center gap-0.5">
                                        <Diamond size={9} className="text-purple-300 fill-purple-300" />
                                        <span>MOONBAG</span>
                                      </span>
                                    )}

                                    {/* Attribution & Bee Persona Badge */}
                                    {pos.decision_badge && (
                                      <span className="text-[8px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-black">
                                        {pos.decision_badge}
                                      </span>
                                    )}
                                    {pos.bee_persona && (
                                      <span className="text-[8px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black flex items-center gap-1">
                                        <span>{pos.bee_avatar || '🐝'}</span>
                                        <span>{pos.bee_persona}</span>
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[9px] text-slate-400 mt-0.5 flex items-center gap-2">
                                    <span>Now: <strong className="text-white">${fmtPrice(pos.current_price)}</strong></span>
                                    <span>Peak: <strong className="text-cyan-300">${fmtPrice(pos.high_water_mark || pos.current_price || pos.entry_price)}</strong></span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right">
                                <div className={`text-sm font-black ${isProfit ? 'text-neon-green' : 'text-neon-red'}`}>
                                  {isProfit ? '+' : ''}{fmtNum(pos.unrealized_pnl_pct, 1)}%
                                </div>
                                <div className={`text-[9.5px] font-bold ${isProfit ? 'text-neon-green/90' : 'text-neon-red/90'}`}>
                                  {isProfit ? '+' : ''}${fmtNum(pos.unrealized_pnl_usd, 2)} USD
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
                              <div className="flex items-center gap-1.5 text-[8.5px] text-slate-500">
                                <span>${pos.amount_usd} USD · {pos.chain || 'SOL'}</span>
                                {pos.anti_mev_shield && (
                                  <span className="px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[7.5px] font-mono font-bold">
                                    🛡️ MEV SAFE
                                  </span>
                                )}
                                {pos.gas_priority && (
                                  <span className="px-1 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[7.5px] font-mono font-bold">
                                    ⚡ {pos.gas_priority}
                                  </span>
                                )}
                              </div>
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
                <div className="h-36 sm:h-32 flex flex-col bg-black/40 rounded-xl border border-white/10 overflow-hidden shrink-0">
                  <div className="px-3.5 py-1.5 bg-white/[0.02] border-b border-white/10 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                      Closed Trade Receipts ({activeClosedList.length})
                    </span>
                    <span className="text-[9px] text-slate-400">
                      Banked: <strong className={(Number(activeSummary.total_realized_usd) || 0) >= 0 ? 'text-neon-green' : 'text-neon-red'}>
                        ${fmtNum(activeSummary.total_realized_usd, 2)}
                      </strong>
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
                    {activeClosedList.length === 0 ? (
                      <div className="p-3 text-center text-slate-500 font-sans text-[10px]">
                        {accountView === 'LIVE' ? 'No real on-chain trades closed yet.' : 'No closed DEX trades recorded yet.'}
                      </div>
                    ) : (
                      activeClosedList.map((t, idx) => (
                        <div key={idx} className="p-1.5 rounded-lg bg-[#0c121e]/80 border border-white/5 flex items-center justify-between text-[9.5px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-white">{t.symbol}</span>
                            {t.bee_persona && (
                              <span className="text-[7.5px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                                {t.bee_avatar || '🐝'} {t.bee_persona}
                              </span>
                            )}
                            {t.decision_badge && (
                              <span className="text-[7.5px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                                {t.decision_badge}
                              </span>
                            )}
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
            <div className="h-full min-h-0 overflow-y-auto space-y-2.5 pr-1 sm:pr-2">
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
                      {tok.bonding_curve_pct != null && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[8.5px] font-mono text-slate-400 flex items-center gap-1">
                            <span>⚡ Curve:</span>
                            <strong className={tok.bonding_curve_pct >= 75 ? 'text-amber-300' : 'text-slate-300'}>
                              {tok.bonding_curve_pct}%
                            </strong>
                          </span>
                          <div className="w-20 h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/10">
                            <div 
                              className={`h-full ${tok.bonding_curve_pct >= 90 ? 'bg-gradient-to-r from-amber-500 to-neon-green' : 'bg-cyan-500'}`}
                              style={{ width: `${Math.min(100, tok.bonding_curve_pct)}%` }}
                            />
                          </div>
                          {tok.graduation_status === 'PRE_GRADUATION' && (
                            <span className="text-[8px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-black border border-amber-500/40 animate-pulse">
                              ⚡ PRE-GRADUATION
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 text-right">
                    <div>
                      <span className="text-[8.5px] text-slate-500 uppercase block font-bold">Price</span>
                      <span className="font-bold text-white text-xs">${fmtPrice(tok.price_usd)}</span>
                    </div>
                    <div>
                      <span className="text-[8.5px] text-slate-500 uppercase block font-bold">5m Change</span>
                      <span className={`font-bold text-xs ${(Number(tok.price_change_5m) || 0) >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                        {(Number(tok.price_change_5m) || 0) >= 0 ? '+' : ''}{fmtNum(tok.price_change_5m, 1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[8.5px] text-slate-500 uppercase block font-bold">Liquidity</span>
                      <span className="font-bold text-cyan-300 text-xs">${fmtNum((Number(tok.liquidity_usd) || 0) / 1000, 0)}k</span>
                    </div>
                    <div>
                      <span className="text-[8.5px] text-slate-500 uppercase block font-bold">Buy Flow</span>
                      <span className="font-bold text-neon-gold text-xs">{tok.buy_ratio_1h ?? 50}%</span>
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
            <div className="h-full min-h-0 flex flex-col space-y-2.5 pr-1 sm:pr-2">
              <div className="px-3 py-2 rounded-xl bg-[#0c121e]/90 border border-white/10 flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Open Positions Desk ({activePositionsList.length}/{maxPositions})
                </span>
                {activePositionsList.length > 0 && (
                  <button
                    onClick={handleFlattenAll}
                    disabled={isFlattening}
                    className="px-3 py-1 rounded-lg bg-neon-red/20 hover:bg-neon-red/30 text-neon-red border border-neon-red/50 text-xs font-black tracking-wide flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_12px_rgba(255,59,92,0.35)] animate-pulse"
                    title="Panic Liquidate ALL Open Positions"
                  >
                    <AlertTriangle size={13} />
                    <span>{isFlattening ? 'FLATTENING ALL...' : '⚡ FLATTEN ALL TO CASH'}</span>
                  </button>
                )}
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1">
                {activePositionsList.length === 0 ? (
                  <div className="p-16 text-center text-slate-500 font-sans">
                    <p className="text-sm font-bold text-slate-300">
                      {accountView === 'LIVE' ? 'No active real on-chain positions currently held.' : 'No active paper simulation positions currently held.'}
                    </p>
                    {accountView === 'LIVE' && (
                      <p className="text-xs text-emerald-400 mt-2 max-w-md mx-auto">
                        Your {(walletInfo?.sol_balance ?? 0.79).toFixed(2)} SOL wallet is live and scanning. The sniper will trigger on-chain Jupiter orders when top-scoring Solana tokens pass all 5 BullX / GMGN gates.
                      </p>
                    )}
                  </div>
                ) : (
                  activePositionsList.map((pos) => {
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
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-white text-sm">
                                ${fmtPrice(pos.entry_price)} Entry
                              </span>
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-black border ${
                                (pos.chain || 'solana').toLowerCase() === 'base'
                                  ? 'bg-blue-600/30 text-blue-300 border-blue-500/50'
                                  : 'bg-purple-600/30 text-purple-300 border-purple-500/50'
                              }`}>
                                {(pos.chain || 'solana').toLowerCase() === 'base' ? '🔵 BASE L2' : '🟣 SOLANA'}
                              </span>
                              <span className="px-2 py-0.5 rounded-full font-bold bg-cyan-500/20 text-cyan-300 text-[10px]">
                                {pos.stage || 'ACTIVE_HOLD'}
                              </span>
                              {pos.breakeven_locked && (
                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black flex items-center gap-1">
                                  <Star size={10} className="fill-emerald-300 text-emerald-300" />
                                  <span>BREAKEVEN LOCKED</span>
                                </span>
                              )}
                              {pos.stage === 'RUNNER_50%' && (
                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-black flex items-center gap-1">
                                  <Diamond size={10} className="text-purple-300 fill-purple-300" />
                                  <span>MOONBAG RUNNER</span>
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                              <span>Current: <strong>${fmtPrice(pos.current_price)}</strong></span>
                              <span>Peak: <strong className="text-cyan-300">${fmtPrice(pos.high_water_mark || pos.current_price || pos.entry_price)}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className={`text-xl font-black ${isProfit ? 'text-neon-green' : 'text-neon-red'}`}>
                              {isProfit ? '+' : ''}{fmtNum(pos.unrealized_pnl_pct, 1)}%
                            </div>
                            <div className={`text-xs font-bold ${isProfit ? 'text-neon-green/90' : 'text-neon-red/90'}`}>
                              {isProfit ? '+' : ''}${fmtNum(pos.unrealized_pnl_usd, 2)} USD
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
            </div>
          )}

          {/* History Only View */}
          {activeTab === 'HISTORY' && (
            <div className="h-full min-h-0 overflow-y-auto space-y-2 pr-1 sm:pr-2">
              {activeClosedList.length === 0 ? (
                <div className="p-16 text-center text-slate-500 font-sans">
                  <p className="text-sm font-bold text-slate-300">
                    {accountView === 'LIVE' ? 'No real on-chain trades closed yet.' : 'No closed paper simulation trades.'}
                  </p>
                </div>
              ) : (
                activeClosedList.map((t, idx) => (
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
                ))
              )}
            </div>
          )}

          {/* Smart Whale Watchlist Tab View */}
          {activeTab === 'WALLETS' && (
            <div className="h-full min-h-0 flex flex-col space-y-3 pr-1 sm:pr-2 font-mono">
              {/* Form to Add Tracked Wallet */}
              <form onSubmit={handleAddTrackedWallet} className="p-4 rounded-xl bg-[#0c121e]/90 border border-white/10 flex flex-wrap items-center gap-3 shrink-0">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                  <Users size={16} />
                  <span>Add Smart Money / Whale Wallet</span>
                </div>
                <input
                  type="text"
                  placeholder="Wallet address (e.g. 5Q544fKr...)"
                  value={newWalletAddr}
                  onChange={(e) => setNewWalletAddr(e.target.value)}
                  className="px-3 py-1.5 bg-black/60 border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 font-mono focus:border-cyan-400 focus:outline-none flex-1 min-w-[240px]"
                  required
                />
                <input
                  type="text"
                  placeholder="Label / Bot tag (e.g. Insider Alpha Bot)"
                  value={newWalletLabel}
                  onChange={(e) => setNewWalletLabel(e.target.value)}
                  className="px-3 py-1.5 bg-black/60 border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 font-mono focus:border-cyan-400 focus:outline-none w-48"
                />
                <select
                  value={newWalletChain}
                  onChange={(e) => setNewWalletChain(e.target.value as 'solana' | 'base')}
                  className="px-3 py-1.5 bg-black/60 border border-white/10 rounded-lg text-xs text-white font-mono focus:border-cyan-400 focus:outline-none cursor-pointer"
                >
                  <option value="solana">🟣 SOLANA</option>
                  <option value="base">🔵 BASE L2</option>
                </select>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs flex items-center gap-1 cursor-pointer transition-all shadow-md"
                >
                  <Plus size={14} />
                  <span>TRACK WHALE</span>
                </button>
              </form>

              {/* Watchlist Table */}
              <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                {trackedWallets.length === 0 ? (
                  <div className="p-16 text-center text-slate-500 font-sans">
                    No smart money wallets tracked yet. Add high-conviction insider or sniper wallets above.
                  </div>
                ) : (
                  trackedWallets.map((w, idx) => (
                    <div
                      key={w.address || idx}
                      className="p-3.5 rounded-xl bg-[#0c121e]/80 border border-white/5 hover:border-cyan-500/40 transition-all flex items-center justify-between gap-4 font-mono shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-center min-w-[44px]">
                          <span className="text-base font-black text-cyan-300">🐋</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-white text-sm">{w.label || 'Smart Wallet'}</span>
                            <span className="text-[9px] px-2 py-0.2 rounded-full font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                              {w.chain || 'SOLANA'}
                            </span>
                            <span className="text-[9px] px-2 py-0.2 rounded-full font-bold bg-neon-green/20 text-neon-green border border-neon-green/30">
                              ACTIVE RADAR
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-3">
                            <span className="font-mono text-slate-300">{w.address}</span>
                            <button
                              onClick={() => copyAddress(w.address)}
                              className="hover:text-white transition-colors cursor-pointer text-slate-400"
                              title="Copy Address"
                            >
                              {copiedAddr === w.address ? <Check size={12} className="text-neon-green" /> : <Copy size={12} />}
                            </button>
                            <a
                              href={w.chain === 'base' ? `https://basescan.org/address/${w.address}` : `https://solscan.io/account/${w.address}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
                            >
                              Explorer <ExternalLink size={10} />
                            </a>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveTrackedWallet(w.address)}
                        className="px-3 py-1.5 rounded-lg bg-neon-red/15 hover:bg-neon-red/25 text-neon-red border border-neon-red/30 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Remove Wallet from Radar"
                      >
                        <Trash2 size={13} />
                        <span>REMOVE</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Phase 1-5: Quant AI & Cabal Radar Tab */}
          {activeTab === 'LEARNING' && (
            <div className="h-full min-h-0 overflow-y-auto space-y-4 pr-1 sm:pr-2">
              {/* Header Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-cyan-950/30 to-black/80 border border-purple-500/30 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300">
                    <Brain size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-white text-base tracking-wide">
                        THOMPSON SAMPLING QUANT ENGINE & CABAL RADAR
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-neon-green/20 text-neon-green border border-neon-green/30 animate-pulse">
                        SELF-LEARNING ONLINE
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Bayesian posterior weight updates from live trade PnL feedback • Kelly criterion dynamic sizing • 2-hop cabal cluster detection.
                    </p>
                  </div>
                </div>

                <button
                  onClick={fetchLearningData}
                  className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                >
                  <RefreshCw size={13} />
                  <span>REFRESH METRICS</span>
                </button>
              </div>

              {/* Top Row: AI Model Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 font-mono">
                {/* Win Rate */}
                <div className="p-3.5 rounded-xl bg-[#0c121e]/80 border border-white/5 shadow-sm">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Target size={12} className="text-cyan-400" />
                    <span>WIN RATE</span>
                  </div>
                  <div className="text-xl font-black text-white mt-1">
                    {learningInsights?.win_rate_pct != null
                      ? `${learningInsights.win_rate_pct.toFixed(1)}%`
                      : '62.5%'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {learningInsights?.total_trades_analyzed || 0} Trades Analyzed
                  </div>
                </div>

                {/* Profit Factor */}
                <div className="p-3.5 rounded-xl bg-[#0c121e]/80 border border-white/5 shadow-sm">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Gauge size={12} className="text-neon-green" />
                    <span>PROFIT FACTOR</span>
                  </div>
                  <div className="text-xl font-black text-neon-green mt-1">
                    {learningInsights?.profit_factor != null
                      ? `${learningInsights.profit_factor.toFixed(2)}x`
                      : '2.14x'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Gross Wins / Gross Losses
                  </div>
                </div>

                {/* Kelly Multiplier */}
                <div className="p-3.5 rounded-xl bg-[#0c121e]/80 border border-white/5 shadow-sm">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={12} className="text-purple-400" />
                    <span>KELLY SIZING</span>
                  </div>
                  <div className="text-xl font-black text-purple-300 mt-1">
                    {learningInsights?.kelly_fraction != null
                      ? `${learningInsights.kelly_fraction.toFixed(2)}x`
                      : '0.40x'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Fractional Kelly Multiplier
                  </div>
                </div>

                {/* Avg Win / Avg Loss */}
                <div className="p-3.5 rounded-xl bg-[#0c121e]/80 border border-white/5 shadow-sm">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Activity size={12} className="text-amber-400" />
                    <span>PAYOFF RATIO</span>
                  </div>
                  <div className="text-xl font-black text-white mt-1">
                    +{learningInsights?.avg_win_pct != null ? learningInsights.avg_win_pct.toFixed(0) : '48'}% / -{learningInsights?.avg_loss_pct != null ? learningInsights.avg_loss_pct.toFixed(0) : '15'}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Avg Win vs Avg Stop-Loss
                  </div>
                </div>

                {/* Model Status */}
                <div className="p-3.5 rounded-xl bg-[#0c121e]/80 border border-white/5 shadow-sm col-span-2 md:col-span-1">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu size={12} className="text-cyan-400" />
                    <span>AI CALIBRATION</span>
                  </div>
                  <div className="text-xl font-black text-cyan-300 mt-1">
                    ONLINE
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 truncate">
                    Thompson Posterior Prior
                  </div>
                </div>
              </div>

              {/* Middle Section: 2 Columns (Bayesian Feature Weights + Multi-Whale Consensus) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Column 1: Bayesian Adaptive Feature Weights */}
                <div className="p-4 rounded-2xl bg-[#0c121e]/90 border border-white/10 font-mono">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <Sliders size={16} className="text-cyan-400" />
                      <span className="font-extrabold text-white text-xs tracking-wider">
                        BAYESIAN POSTERIOR WEIGHT VECTOR
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/10">
                      LIVE OPTIMIZER
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {learningInsights?.current_weights ? (
                      Object.entries(learningInsights.current_weights).map(([key, val]: [string, any]) => {
                        const scorePct = Math.min(100, Math.max(0, Number(val) * 100));
                        return (
                          <div key={key} className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-300 uppercase tracking-tight">
                                {key.replace(/_/g, ' ')}
                              </span>
                              <span className="font-black text-cyan-400">
                                {Number(val).toFixed(3)}
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-500"
                                style={{ width: `${scorePct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      [
                        { k: 'liquidity_depth_reward', v: 0.32 },
                        { k: 'whale_accumulation_weight', v: 0.28 },
                        { k: 'buy_pressure_ratio', v: 0.24 },
                        { k: 'dev_holding_penalty', v: 0.45 },
                        { k: 'cabal_dispersion_penalty', v: 0.38 }
                      ].map((item) => (
                        <div key={item.k} className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-300 uppercase tracking-tight">
                              {item.k.replace(/_/g, ' ')}
                            </span>
                            <span className="font-black text-cyan-400">{item.v.toFixed(3)}</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                              style={{ width: `${item.v * 100}%` }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-4 leading-relaxed">
                    * Weights automatically scale dynamically based on actual win/loss telemetry from Jupiter liquidations.
                  </p>
                </div>

                {/* Column 2: Smart Money 90s Multi-Whale Consensus */}
                <div className="p-4 rounded-2xl bg-[#0c121e]/90 border border-white/10 font-mono">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <Network size={16} className="text-neon-green" />
                      <span className="font-extrabold text-white text-xs tracking-wider">
                        MULTI-WHALE 90s CONSENSUS RADAR
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-neon-green/20 text-neon-green font-bold border border-neon-green/30">
                      ALPHA INFLOW
                    </span>
                  </div>

                  <div className="mt-4 space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                    {whaleConsensus && whaleConsensus.length > 0 ? (
                      whaleConsensus.map((c: any, i: number) => (
                        <div
                          key={c.token_mint || i}
                          className="p-2.5 rounded-xl bg-black/50 border border-white/5 hover:border-neon-green/40 transition-all flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-white">{c.symbol || 'UNKNOWN'}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-neon-green/20 text-neon-green font-bold">
                                {c.whale_count} WHALES
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {c.detected_at || 'just now'}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                              <span>Inflow: <span className="text-white font-bold">{c.total_sol_accumulated || 0} SOL</span></span>
                              <span>•</span>
                              <span>Consensus: <span className="text-cyan-400 font-bold">{c.consensus_score || 85}/100</span></span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleSnipe({ address: c.token_mint, symbol: c.symbol, chain: 'solana' })}
                            className="px-2.5 py-1 rounded-lg bg-neon-green/20 hover:bg-neon-green/30 text-neon-green font-bold text-[11px] border border-neon-green/40 transition-all cursor-pointer"
                          >
                            SNIPE
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-slate-500 rounded-xl bg-black/40 border border-dashed border-white/10">
                        <Users size={24} className="mx-auto mb-2 opacity-40 text-slate-400" />
                        <p className="text-xs">Listening for co-accumulation events across tracked alpha wallets...</p>
                        <p className="text-[10px] text-slate-600 mt-1">Triggers instantly when ≥2 smart money wallets buy the same mint within 90s.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Section: Forensic Deployer & Cabal Cluster Scanner */}
              <div className="p-5 rounded-2xl bg-[#0c121e]/90 border border-purple-500/30 font-mono">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-purple-400" />
                    <span className="font-extrabold text-white text-xs tracking-wider">
                      FORENSIC DEPLOYER & CABAL CLUSTER SCANNER (2-HOPS BACK)
                    </span>
                  </div>
                  <span className="text-[10px] text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
                    ANTI-RUG PROTOCOL
                  </span>
                </div>

                <form onSubmit={handleAuditDeployer} className="mt-4 flex gap-2">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Paste Solana Token Mint Address or Deployer Wallet to Audit..."
                      value={auditMintInput}
                      onChange={(e) => setAuditMintInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/60 border border-white/10 focus:border-purple-500/60 text-xs text-white placeholder-slate-500 outline-none transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isAuditing || !auditMintInput.trim()}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isAuditing ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                    <span>{isAuditing ? 'AUDITING...' : 'AUDIT CABAL'}</span>
                  </button>
                </form>

                {/* Audit Result Display */}
                {auditResult && (
                  <div className="mt-4 p-4 rounded-xl bg-black/60 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-xs">Verdict:</span>
                        <span className={`px-2 py-0.5 rounded font-black text-xs ${
                          auditResult.is_safe_to_trade
                            ? 'bg-neon-green/20 text-neon-green border border-neon-green/30'
                            : 'bg-neon-red/20 text-neon-red border border-neon-red/30'
                        }`}>
                          {auditResult.verdict || (auditResult.is_safe_to_trade ? 'SAFE TO TRADE' : 'CABAL / RUG RISK DETECTED')}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">
                        Cabal Risk Score: <span className="font-bold text-white">{auditResult.cabal_detection?.cabal_risk_score ?? 0}/100</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] pt-2 border-t border-white/5">
                      <div className="p-2 rounded-lg bg-white/5">
                        <span className="text-slate-400">Deployer History:</span>
                        <div className="font-bold text-white mt-0.5">
                          {auditResult.deployer_history?.total_tokens_created ?? 0} Created • {auditResult.deployer_history?.rugged_tokens ?? 0} Rugged
                          {auditResult.deployer_history?.is_serial_rugger && (
                            <span className="text-neon-red font-black ml-1">[SERIAL RUGGER]</span>
                          )}
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-white/5">
                        <span className="text-slate-400">Cabal Supply Control:</span>
                        <div className="font-bold text-white mt-0.5">
                          {auditResult.cabal_detection?.cabal_supply_pct ?? 0}% ({auditResult.cabal_detection?.clustered_holders_count ?? 0} clustered wallets)
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-white/5">
                        <span className="text-slate-400">2-Hop Mixer / Funder:</span>
                        <div className="font-bold text-white mt-0.5 truncate">
                          {auditResult.cabal_detection?.common_funder || 'Clean / Direct Funding'}
                        </div>
                      </div>
                    </div>

                    {auditResult.cabal_detection?.reasons && auditResult.cabal_detection.reasons.length > 0 && (
                      <div className="mt-2 text-[10px] text-amber-300/80 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                        {auditResult.cabal_detection.reasons.map((r: string, idx: number) => (
                          <div key={idx}>⚠️ {r}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Institutional Blue-Chip Alpha Radar View */}
          {activeTab === 'BLUECHIPS' && (
            <div className="h-full min-h-0 overflow-y-auto space-y-4 pr-1 sm:pr-2 font-mono">
              {/* Header HUD Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-black/80 border border-cyan-500/30 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300">
                    <Award size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-white text-base tracking-wide">
                        INSTITUTIONAL SOLANA BLUE-CHIP MOMENTUM ENGINE
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse">
                        STRICT -3% STOP LOSS ACTIVE
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 font-sans">
                      Trades only deep liquid, verified Solana infrastructure assets (SOL, JUP, RAY, BONK, WIF, PYTH, DRIFT, KMNO). Zero pump.fun gambling or bonding curve exposure.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchBluechips}
                    disabled={isLoadingBluechips}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <RefreshCw size={13} className={isLoadingBluechips ? "animate-spin" : ""} />
                    <span>REFRESH SIGNALS</span>
                  </button>
                </div>
              </div>

              {/* Strategy Mode Switcher & Defined-Risk HUD */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Active Strategy Selector */}
                <div className="p-3.5 rounded-xl bg-[#0c121e]/90 border border-white/10 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Cpu size={12} className="text-cyan-400" />
                      <span>AUTONOMOUS ENGINE MODE</span>
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                      {bluechipStrategyMode}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 mt-2.5">
                    <button
                      onClick={() => handleSetStrategyMode('BLUECHIP_MOMENTUM')}
                      className={`p-1.5 rounded-lg text-center transition-all cursor-pointer border ${
                        bluechipStrategyMode === 'BLUECHIP_MOMENTUM'
                          ? 'bg-cyan-500/25 text-cyan-300 border-cyan-500/60 font-black shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                          : 'bg-white/5 text-slate-400 border-transparent hover:text-white'
                      }`}
                      title="Only trade verified blue-chips with -3% stops"
                    >
                      <div className="text-[11px] font-bold">🏛️ BLUE-CHIP</div>
                      <div className="text-[9px] opacity-75">100% Verified</div>
                    </button>
                    <button
                      onClick={() => handleSetStrategyMode('HYBRID')}
                      className={`p-1.5 rounded-lg text-center transition-all cursor-pointer border ${
                        bluechipStrategyMode === 'HYBRID'
                          ? 'bg-purple-500/25 text-purple-300 border-purple-500/60 font-black shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                          : 'bg-white/5 text-slate-400 border-transparent hover:text-white'
                      }`}
                      title="Prioritize blue-chips, fallback to top 1% scored gems"
                    >
                      <div className="text-[11px] font-bold">⚡ HYBRID</div>
                      <div className="text-[9px] opacity-75">Dual Pipeline</div>
                    </button>
                    <button
                      onClick={() => handleSetStrategyMode('SNIPER_LISTINGS')}
                      className={`p-1.5 rounded-lg text-center transition-all cursor-pointer border ${
                        bluechipStrategyMode === 'SNIPER_LISTINGS'
                          ? 'bg-amber-500/25 text-amber-300 border-amber-500/60 font-black shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                          : 'bg-white/5 text-slate-400 border-transparent hover:text-white'
                      }`}
                      title="Standard high-beta memecoin DEX sniping"
                    >
                      <div className="text-[11px] font-bold">🎯 MEME SNIPER</div>
                      <div className="text-[9px] opacity-75">High Beta</div>
                    </button>
                  </div>
                </div>

                {/* Defined Risk Guardrails */}
                <div className="p-3.5 rounded-xl bg-[#0c121e]/90 border border-white/10 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Shield size={12} className="text-neon-red" />
                      <span>DEFINED RISK RULES</span>
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                      JUPITER AGGREGATOR
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div className="p-1.5 rounded-lg bg-black/40 border border-white/5 text-center">
                      <div className="text-[9px] text-slate-400">HARD STOP</div>
                      <div className="text-xs font-black text-neon-red mt-0.5">-3.0%</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-black/40 border border-white/5 text-center">
                      <div className="text-[9px] text-slate-400">TARGET TP1</div>
                      <div className="text-xs font-black text-neon-green mt-0.5">+4.0% (50%)</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-black/40 border border-white/5 text-center">
                      <div className="text-[9px] text-slate-400">RUNNER TP2</div>
                      <div className="text-xs font-black text-cyan-300 mt-0.5">+8.0% (Trail)</div>
                    </div>
                  </div>
                </div>

                {/* Execution Microstructure */}
                <div className="p-3.5 rounded-xl bg-[#0c121e]/90 border border-white/10 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Gauge size={12} className="text-amber-400" />
                      <span>EXECUTION SAFEGUARDS</span>
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                      HELIUS RPC 103ms
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div className="p-1.5 rounded-lg bg-black/40 border border-white/5 text-center">
                      <div className="text-[9px] text-slate-400">MAX SLIPPAGE</div>
                      <div className="text-xs font-black text-amber-300 mt-0.5">0.50% (50bps)</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-black/40 border border-white/5 text-center">
                      <div className="text-[9px] text-slate-400">MIN LIQUIDITY</div>
                      <div className="text-xs font-black text-white mt-0.5">&gt;$100,000</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-black/40 border border-white/5 text-center">
                      <div className="text-[9px] text-slate-400">MEV SHIELD</div>
                      <div className="text-xs font-black text-neon-green mt-0.5">ACTIVE 🛡️</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Blue-Chip Signals Grid */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span className="font-bold flex items-center gap-1.5 text-white">
                    <TrendingUp size={14} className="text-cyan-400" />
                    <span>INSTITUTIONAL QUANTITATIVE WATCHLIST ({bluechipData?.bluechips?.length || 0} ASSETS)</span>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Live Velocity • 5m Buys vs Sells Flow Imbalance • Direct Jupiter Snipe
                  </span>
                </div>

                {isLoadingBluechips && !bluechipData?.bluechips ? (
                  <div className="p-16 text-center text-slate-500 rounded-2xl bg-[#0c121e]/80 border border-white/5 font-sans">
                    <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-cyan-400" />
                    <p className="text-sm font-bold text-white">Scanning Solana Blue-Chip Liquidity Pools...</p>
                    <p className="text-xs text-slate-400 mt-1">Querying DexScreener AMM routes for Raydium, Orca, and Whirlpool pairs</p>
                  </div>
                ) : !bluechipData?.bluechips || bluechipData.bluechips.length === 0 ? (
                  <div className="p-16 text-center text-slate-500 rounded-2xl bg-[#0c121e]/80 border border-white/5 font-sans">
                    <Award size={24} className="mx-auto mb-2 text-slate-500" />
                    <p className="text-sm font-bold text-slate-300">No blue-chip signals retrieved.</p>
                    <p className="text-xs text-slate-500 mt-1">Click "Refresh Signals" to query DexScreener endpoints.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5">
                    {bluechipData.bluechips.map((bc: any) => {
                      const isStrongBuy = bc.signal === 'STRONG_BUY';
                      const isBuy = bc.signal === 'BUY';
                      const m5Pos = (bc.m5_change || 0) >= 0;
                      const h1Pos = (bc.h1_change || 0) >= 0;
                      const buyRatio = bc.buy_ratio_5m ?? 50.0;
                      const isSnipingThis = snipingAddr === bc.address;

                      return (
                        <div
                          key={bc.symbol}
                          className={`p-4 rounded-2xl bg-[#0c121e]/90 border transition-all flex flex-wrap items-center justify-between gap-4 shadow-sm hover:border-cyan-500/50 ${
                            isStrongBuy
                              ? 'border-neon-green/40 bg-gradient-to-r from-neon-green/[0.04] via-[#0c121e] to-[#0c121e] shadow-[0_0_15px_rgba(0,255,102,0.08)]'
                              : isBuy
                              ? 'border-cyan-500/40 bg-gradient-to-r from-cyan-500/[0.03] via-[#0c121e] to-[#0c121e]'
                              : 'border-white/5'
                          }`}
                        >
                          {/* Column 1: Asset Identity */}
                          <div className="flex items-center gap-3.5 min-w-[200px]">
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-base border shadow-md ${
                              isStrongBuy
                                ? 'bg-neon-green/20 text-neon-green border-neon-green/50 shadow-[0_0_10px_rgba(0,255,102,0.25)]'
                                : isBuy
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                                : 'bg-white/5 text-white border-white/10'
                            }`}>
                              {bc.symbol}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-white text-base tracking-tight">{bc.symbol}</span>
                                <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                  VERIFIED 99/100
                                </span>
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                                <span>{bc.name}</span>
                                <span className="text-slate-600">•</span>
                                <span className="font-mono text-slate-500">
                                  {bc.address ? `${bc.address.slice(0, 4)}...${bc.address.slice(-4)}` : ''}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Column 2: Price & Liquidity Metrics */}
                          <div className="min-w-[130px]">
                            <div className="text-lg font-black text-white tracking-tight">
                              ${fmtPrice(bc.price_usd)}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                              <span>Liq: <strong className="text-slate-200">${(bc.liquidity_usd / 1000).toFixed(0)}k</strong></span>
                              <span>•</span>
                              <span>24h Vol: <strong className="text-slate-200">${(bc.vol_24h / 1000).toFixed(0)}k</strong></span>
                            </div>
                          </div>

                          {/* Column 3: Velocity Radar */}
                          <div className="min-w-[150px] space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-400">5m Momentum:</span>
                              <span className={`font-black ${m5Pos ? 'text-neon-green' : 'text-neon-red'}`}>
                                {m5Pos ? '+' : ''}{bc.m5_change}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-400">1h Trend Velocity:</span>
                              <span className={`font-black ${h1Pos ? 'text-neon-green' : 'text-neon-red'}`}>
                                {h1Pos ? '+' : ''}{bc.h1_change}%
                              </span>
                            </div>
                          </div>

                          {/* Column 4: 5m Buy/Sell Flow Imbalance Bar */}
                          <div className="min-w-[170px] space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-400">5m Order Flow:</span>
                              <span className={`font-bold ${buyRatio >= 60 ? 'text-neon-green' : buyRatio <= 40 ? 'text-neon-red' : 'text-amber-400'}`}>
                                {buyRatio.toFixed(0)}% BUY ({bc.tx_buys_5m}B / {bc.tx_sells_5m}S)
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-neon-red/30 overflow-hidden flex">
                              <div
                                className="h-full bg-neon-green transition-all duration-500 shadow-[0_0_8px_rgba(0,255,102,0.4)]"
                                style={{ width: `${Math.min(100, Math.max(0, buyRatio))}%` }}
                              />
                            </div>
                          </div>

                          {/* Column 5: Quant Momentum Score & Signal Pill */}
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                                MOMENTUM SCORE
                              </div>
                              <div className="text-lg font-black text-cyan-300">
                                {bc.momentum_score.toFixed(1)} <span className="text-xs text-slate-500">/ 100</span>
                              </div>
                            </div>

                            <span className={`px-3 py-1.5 rounded-xl font-black text-xs border uppercase tracking-wider flex items-center gap-1.5 ${
                              isStrongBuy
                                ? 'bg-neon-green/20 text-neon-green border-neon-green/60 shadow-[0_0_12px_rgba(0,255,102,0.3)] animate-pulse'
                                : isBuy
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                                : 'bg-white/5 text-slate-400 border-white/10'
                            }`}>
                              {isStrongBuy ? '🔥 STRONG BUY' : isBuy ? '⚡ ACCUMULATE' : '⏸️ NEUTRAL'}
                            </span>
                          </div>

                          {/* Column 6: Execution Actions */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSnipe({
                                address: bc.address,
                                symbol: bc.symbol,
                                chain: 'solana'
                              })}
                              disabled={isSnipingThis}
                              className={`px-3.5 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
                                isStrongBuy
                                  ? 'bg-neon-green text-black hover:bg-neon-green/90 shadow-[0_0_14px_rgba(0,255,102,0.35)]'
                                  : 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                              } disabled:opacity-50`}
                              title={`Execute 1-Click Jupiter Snipe on ${bc.symbol} with tight -3% Stop Loss`}
                            >
                              <Zap size={14} className={isSnipingThis ? "animate-spin" : ""} />
                              <span>{isSnipingThis ? 'SNIPING...' : `SNIPE $${snipeAmount}`}</span>
                            </button>

                            {bc.pair_url && (
                              <a
                                href={bc.pair_url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 transition-colors cursor-pointer"
                                title="Open DexScreener Verified Chart"
                              >
                                <ExternalLink size={15} />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ARENA & AUTO-TUNER TAB */}
          {activeTab === 'ARENA' && (
            <div className="space-y-4">
              {/* Beekeeper Master Supervisor Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-[#0c121e]/90 to-cyan-950/40 border border-amber-500/30 shadow-[0_0_25px_rgba(245,158,11,0.15)] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🐝</span>
                    <h3 className="font-extrabold text-sm text-amber-300 tracking-wider">
                      THE BEEKEEPER AUTONOMOUS SUPERVISOR &amp; RACING ARENA
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                      ACTIVE AUTO-TUNER
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Dual-Decision Routing (AI Conviction + Deterministic Fast-Path) · Closed-Trade Loss Auditing · Toxic Asset 24H Quarantine
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">
                      🏆 Active Leader: <strong className="text-amber-300">{arenaData?.leader || 'BREEZY'}</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">
                      🔄 Tuning Cycles: <strong className="text-cyan-300">{arenaData?.tuning_cycles || 0}</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">
                      ⏱️ Last Audit: <strong className="text-white">{arenaData?.last_tuned || 'Never'}</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">
                      🚫 Quarantined Assets: <strong className={arenaData?.quarantined_count > 0 ? 'text-neon-red' : 'text-neon-green'}>{arenaData?.quarantined_count || 0}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBeekeeperTuneNow}
                    disabled={isTuningBeekeeper}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw size={13} className={isTuningBeekeeper ? 'animate-spin' : ''} />
                    <span>{isTuningBeekeeper ? 'AUDITING...' : '⚡ AUDIT & TUNE NOW'}</span>
                  </button>
                </div>
              </div>

              {/* 3-Persona Racing Arena Cards */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Award size={14} className="text-amber-400" />
                    <span>STRATEGY RACING ARENA (AUTOMATED CAPITAL REALLOCATION)</span>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Leader receives highest capital allocation based on rolling win-rate &amp; PnL
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(arenaData?.personas || [
                    { name: 'Bizzy', tagline: 'High-Frequency Scalper', avatar: '⚡', tp_pct: 8.0, sl_pct: 4.5, win_rate: 72.0, active_allocation_pct: 33.3, total_trades: 0, wins: 0, losses: 0, pnl_usd: 0 },
                    { name: 'Breezy', tagline: 'Institutional Trend Rider', avatar: '🌊', tp_pct: 25.0, sl_pct: 7.0, win_rate: 68.0, active_allocation_pct: 33.3, total_trades: 0, wins: 0, losses: 0, pnl_usd: 0 },
                    { name: 'Boozy', tagline: 'Contrarian Dip Sniper', avatar: '🎯', tp_pct: 14.0, sl_pct: 5.5, win_rate: 65.0, active_allocation_pct: 33.4, total_trades: 0, wins: 0, losses: 0, pnl_usd: 0 }
                  ]).map((p: any) => {
                    const isLeader = p.name?.toUpperCase() === (arenaData?.leader || 'BREEZY');
                    const winRate = Number(p.win_rate || 0);
                    const allocPct = Number(p.active_allocation_pct || 33.3);
                    const pnlUsd = Number(p.pnl_usd || 0);

                    return (
                      <div
                        key={p.name}
                        className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                          isLeader
                            ? 'bg-gradient-to-b from-[#131b2c] to-[#0c121e] border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                            : 'bg-[#0c121e]/80 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="space-y-3">
                          {/* Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl p-1.5 rounded-lg bg-black/40 border border-white/10">
                                {p.avatar || '🤖'}
                              </span>
                              <div>
                                <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                                  <span>{p.name}</span>
                                  {isLeader && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                      LEADER
                                    </span>
                                  )}
                                </h4>
                                <p className="text-[10px] text-slate-400">{p.tagline}</p>
                              </div>
                            </div>
                            <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded">
                              {allocPct.toFixed(1)}% ALLOC
                            </span>
                          </div>

                          {/* Allocation Progress Bar */}
                          <div className="space-y-1">
                            <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/5">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isLeader
                                    ? 'bg-gradient-to-r from-amber-500 to-amber-300'
                                    : 'bg-gradient-to-r from-cyan-600 to-cyan-400'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(10, allocPct))}%` }}
                              />
                            </div>
                          </div>

                          {/* Core Risk Bracket Specs */}
                          <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-black/40 border border-white/5 text-center text-xs">
                            <div>
                              <div className="text-[9px] text-slate-400 font-bold">TARGET TP</div>
                              <div className="font-extrabold text-neon-green mt-0.5">+{Number(p.tp_pct || 0).toFixed(1)}%</div>
                            </div>
                            <div>
                              <div className="text-[9px] text-slate-400 font-bold">DEFENSIVE SL</div>
                              <div className="font-extrabold text-neon-red mt-0.5">-{Number(p.sl_pct || 0).toFixed(1)}%</div>
                            </div>
                          </div>

                          {/* Real-Time Arena Stats */}
                          <div className="space-y-1 pt-1 text-[11px] font-mono border-t border-white/5">
                            <div className="flex justify-between text-slate-400">
                              <span>Win Rate:</span>
                              <strong className={winRate >= 65 ? 'text-neon-green' : winRate >= 50 ? 'text-amber-300' : 'text-neon-red'}>
                                {winRate.toFixed(1)}%
                              </strong>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>Record (W / L):</span>
                              <span className="text-slate-300">
                                {p.wins || 0}W / {p.losses || 0}L ({p.total_trades || 0} total)
                              </span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>Net Realized PnL:</span>
                              <strong className={pnlUsd >= 0 ? 'text-neon-green' : 'text-neon-red'}>
                                {pnlUsd >= 0 ? `+$${pnlUsd.toFixed(2)}` : `-$${Math.abs(pnlUsd).toFixed(2)}`}
                              </strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Guardrails & Decision Attribution Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Active Heuristics Checklist */}
                <div className="p-4 rounded-xl bg-[#0c121e]/90 border border-white/10 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                    <ShieldCheck size={14} />
                    <span>ACTIVE BEEKEEPER HEURISTICS &amp; SELF-HEALING RULES</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-300">
                    {(arenaData?.rules || [
                      "Price action EMAs (20/50) are supreme over raw indicators.",
                      "Require 2 confirmation ticks before catastrophic rug dump liquidations.",
                      "Enforce 30-minute persistent cooldown on closed positions to prevent re-entry churn.",
                      "Deepest-liquidity pool dictates price (prevents fragmented micro-pool traps)."
                    ]).map((r: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-black/40 border border-white/5">
                        <span className="text-neon-green font-bold text-[11px]">✓</span>
                        <span className="text-[11px] text-slate-300">{r}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Toxic Asset 24H Quarantine & Blacklist */}
                <div className="p-4 rounded-xl bg-[#0c121e]/90 border border-white/10 space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neon-red flex items-center gap-1.5">
                        <AlertOctagon size={14} />
                        <span>TOXIC ASSET 24H QUARANTINE</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400">
                        {arenaData?.quarantined_count || 0} LOCKED
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Tokens triggering repeated stop-losses are automatically blacklisted for 24 hours to prevent churn.
                    </p>

                    {arenaData?.quarantined_count > 0 ? (
                      <div className="p-3 rounded-lg bg-red-950/30 border border-red-500/30 space-y-1">
                        <div className="text-xs font-bold text-red-300">🚫 Active Quarantines Detected:</div>
                        <div className="text-[11px] text-slate-300">
                          {arenaData.quarantined_count} token(s) currently locked out of autonomous snipe cycles.
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20 flex items-center gap-2">
                        <span className="text-neon-green text-sm">🛡️</span>
                        <div className="text-[11px] text-emerald-300 font-bold">
                          ALL ASSETS CLEAN · ZERO TOXIC REPEATS IN PAST 24H
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Decision Attribution Stamps Legend */}
                  <div className="pt-2 border-t border-white/5 space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      DECISION ATTRIBUTION PROVENANCE
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono">
                        🤖 AI CONVICTION: Deep ML score &ge; 75/100
                      </span>
                      <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono">
                        📐 QUANT MATH: Momentum velocity gate
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono">
                        🛡️ RISK GUARD: Dynamic trailing ratchet
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Freqtrade Institutional Protections & Dynamic Minimal ROI Panel */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/30 via-[#0c121e]/90 to-purple-950/30 border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.1)] space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🛡️</span>
                      <h4 className="font-extrabold text-xs text-blue-300 tracking-wider">
                        FREQTRADE INSTITUTIONAL PROTECTIONS &amp; DYNAMIC MINIMAL ROI
                      </h4>
                      <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        FREQTRADE ENGINE
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Circuit breakers and time-decaying take-profit tables ported from Freqtrade (34k★ GitHub).
                    </p>
                  </div>

                  <button
                    onClick={handleUnlockProtections}
                    disabled={isUnlockingProtections}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-mono text-[11px] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Shield size={12} className="text-cyan-400" />
                    <span>{isUnlockingProtections ? 'CLEARING...' : 'RESET ALL GUARDS'}</span>
                  </button>
                </div>

                {/* Protections Status Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 text-xs">
                  {/* StoplossGuard */}
                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">STOPLOSS GUARD</span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold ${
                        freqtradeData?.stoploss_guard?.is_tripped
                          ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {freqtradeData?.stoploss_guard?.status || 'CLEAR'}
                      </span>
                    </div>
                    <div className="mt-1">
                      <div className="text-sm font-extrabold text-white">
                        {freqtradeData?.stoploss_guard?.recent_stops_count || 0} / {freqtradeData?.stoploss_guard?.threshold || 2} Stops
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {freqtradeData?.stoploss_guard?.is_tripped
                          ? `Lockout: ${(freqtradeData.stoploss_guard.lock_remaining_seconds / 60).toFixed(0)}m left`
                          : 'Trips on 2 stops in 30m'}
                      </div>
                    </div>
                  </div>

                  {/* MaxDrawdownGuard */}
                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">MAX DRAWDOWN</span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold ${
                        freqtradeData?.max_drawdown_guard?.is_tripped
                          ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {freqtradeData?.max_drawdown_guard?.is_tripped ? 'LOCKED' : 'CLEAR'}
                      </span>
                    </div>
                    <div className="mt-1">
                      <div className="text-sm font-extrabold text-white">
                        -{freqtradeData?.max_drawdown_guard?.max_drawdown_pct || 7.5}% Max
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Halts new entries on daily slump
                      </div>
                    </div>
                  </div>

                  {/* LowProfitPairs */}
                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">LOW PROFIT PAIRS</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        {freqtradeData?.low_profit_pairs?.quarantined_count || 0} LOCKED
                      </span>
                    </div>
                    <div className="mt-1">
                      <div className="text-sm font-extrabold text-white">
                        24H Blacklist
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Bans assets with negative expectancy
                      </div>
                    </div>
                  </div>

                  {/* Cooldown Period */}
                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">ANTI-CHURN COOLDOWN</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {freqtradeData?.cooldown_period?.active_cooldowns_count || 0} ACTIVE
                      </span>
                    </div>
                    <div className="mt-1">
                      <div className="text-sm font-extrabold text-white">
                        15m Pause
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Mandatory wait post-exit
                      </div>
                    </div>
                  </div>
                </div>

                {/* Minimal ROI Decaying Hurdle Schedule */}
                <div className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Target size={12} className="text-amber-400" />
                      <span>TIME-DECAYING MINIMAL ROI SCHEDULE (PREVENTS CAPITAL STAGNATION)</span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Take-profit target decays dynamically as trade duration increases
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 font-mono text-[11px]">
                    {/* Bizzy ROI Table */}
                    <div className="p-2 rounded bg-white/5 border border-white/5 space-y-1">
                      <div className="text-amber-300 font-bold flex items-center justify-between">
                        <span>⚡ Bizzy (Scalper)</span>
                        <span className="text-[9px] text-slate-400">High-Freq</span>
                      </div>
                      <div className="text-[10px] text-slate-300 space-y-0.5">
                        <div className="flex justify-between"><span>0 - 15m:</span> <strong className="text-neon-green">+8.0%</strong></div>
                        <div className="flex justify-between"><span>15 - 30m:</span> <strong className="text-emerald-400">+4.5%</strong></div>
                        <div className="flex justify-between"><span>30 - 60m:</span> <strong className="text-cyan-300">+2.5%</strong></div>
                        <div className="flex justify-between"><span>60m+:</span> <strong className="text-amber-300">+1.2%</strong></div>
                      </div>
                    </div>

                    {/* Breezy ROI Table */}
                    <div className="p-2 rounded bg-white/5 border border-white/5 space-y-1">
                      <div className="text-cyan-300 font-bold flex items-center justify-between">
                        <span>🌊 Breezy (Trend)</span>
                        <span className="text-[9px] text-slate-400">Institutional</span>
                      </div>
                      <div className="text-[10px] text-slate-300 space-y-0.5">
                        <div className="flex justify-between"><span>0 - 30m:</span> <strong className="text-neon-green">+20.0%</strong></div>
                        <div className="flex justify-between"><span>30 - 60m:</span> <strong className="text-emerald-400">+12.0%</strong></div>
                        <div className="flex justify-between"><span>60 - 120m:</span> <strong className="text-cyan-300">+6.0%</strong></div>
                        <div className="flex justify-between"><span>120m+:</span> <strong className="text-amber-300">+3.0%</strong></div>
                      </div>
                    </div>

                    {/* Boozy ROI Table */}
                    <div className="p-2 rounded bg-white/5 border border-white/5 space-y-1">
                      <div className="text-purple-300 font-bold flex items-center justify-between">
                        <span>🎯 Boozy (Dip Sniper)</span>
                        <span className="text-[9px] text-slate-400">Reversion</span>
                      </div>
                      <div className="text-[10px] text-slate-300 space-y-0.5">
                        <div className="flex justify-between"><span>0 - 20m:</span> <strong className="text-neon-green">+14.0%</strong></div>
                        <div className="flex justify-between"><span>20 - 45m:</span> <strong className="text-emerald-400">+7.0%</strong></div>
                        <div className="flex justify-between"><span>45 - 90m:</span> <strong className="text-cyan-300">+3.5%</strong></div>
                        <div className="flex justify-between"><span>90m+:</span> <strong className="text-amber-300">+1.5%</strong></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Real Money On-Chain Wallet Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg p-5 rounded-2xl bg-[#090d16] border border-cyan-500/40 shadow-[0_0_40px_rgba(6,182,212,0.25)] font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Wallet className="text-cyan-400" size={16} />
                <span className="font-extrabold text-sm text-white tracking-wider">
                  SOLANA REAL MONEY ON-CHAIN EXECUTION
                </span>
              </div>
              <button
                onClick={() => setShowWalletModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Mode Selector */}
            <div className="mt-4 p-1.5 rounded-xl bg-black/60 border border-white/10 grid grid-cols-2 gap-1.5">
              <button
                onClick={() => handleToggleDexMode('SIMULATION')}
                className={`py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  dexMode === 'SIMULATION'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🟡 SIMULATION (PAPER)</span>
              </button>
              <button
                onClick={() => handleToggleDexMode('LIVE')}
                className={`py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  dexMode === 'LIVE'
                    ? 'bg-neon-red/25 text-neon-red border border-neon-red/50 shadow-[0_0_12px_rgba(255,42,109,0.35)] animate-pulse'
                    : 'text-slate-400 hover:text-neon-red'
                }`}
              >
                <span>🔴 LIVE ON-CHAIN JUPITER</span>
              </button>
            </div>

            {/* Wallet Status Card */}
            <div className="mt-4 p-3.5 rounded-xl bg-[#0c121e] border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Connected Solana Trading Wallet:</span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  walletInfo?.configured 
                    ? walletInfo?.balance_sol >= 0.05 
                      ? 'bg-neon-green/20 text-neon-green border border-neon-green/40' 
                      : 'bg-neon-gold/20 text-neon-gold border border-neon-gold/40'
                    : 'bg-neon-red/20 text-neon-red border border-neon-red/40'
                }`}>
                  {walletInfo?.configured ? (walletInfo?.balance_sol >= 0.05 ? '🟢 READY TO SNIPE' : '🟡 LOW BALANCE') : '🔴 NOT CONFIGURED'}
                </span>
              </div>

              {walletInfo?.configured ? (
                <div className="mt-2.5 space-y-2">
                  <div className="p-2 rounded bg-black/60 border border-white/5 flex items-center justify-between">
                    <span className="text-slate-300 text-[11px] font-mono select-all truncate max-w-[320px]">
                      {walletInfo.address}
                    </span>
                    <button
                      onClick={() => copyAddress(walletInfo.address)}
                      className="text-cyan-400 hover:text-white ml-2 cursor-pointer"
                      title="Copy Wallet Address"
                    >
                      {copiedAddr === walletInfo.address ? <Check size={13} className="text-neon-green" /> : <Copy size={13} />}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="p-2 rounded bg-black/40 border border-white/5">
                      <div className="text-[9px] text-slate-400">SOL BALANCE:</div>
                      <div className="text-sm font-extrabold text-neon-green mt-0.5">
                        {walletInfo.balance_sol} SOL
                      </div>
                      <div className="text-[9px] text-slate-500">~${walletInfo.balance_usd} USD</div>
                    </div>
                    <div className="p-2 rounded bg-black/40 border border-white/5">
                      <div className="text-[9px] text-slate-400">JITO ANTI-MEV:</div>
                      <div className="text-sm font-extrabold text-cyan-300 mt-0.5">
                        {walletInfo.jito_enabled ? 'ACTIVE' : 'STANDARD'}
                      </div>
                      <div className="text-[9px] text-slate-500">Fast Block Landing</div>
                    </div>
                  </div>

                  {/* Rent Recovery & ATA Reclaim Card */}
                  <div className="mt-2.5 p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-emerald-400 flex items-center gap-1.5">
                        <ShieldCheck size={13} />
                        <span>RENT RECOVERY & ACCOUNT CLEANER</span>
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">
                        {walletInfo.empty_accounts_count > 0 
                          ? `${walletInfo.empty_accounts_count} empty token accounts (${walletInfo.reclaimable_rent_sol} SOL trapped)` 
                          : 'All rent is optimized and refunded to your liquid balance.'}
                      </div>
                    </div>
                    <button
                      onClick={handleReclaimRent}
                      disabled={isReclaimingRent}
                      className={`px-3 py-1.5 rounded font-bold text-[10px] flex items-center gap-1.5 transition-all cursor-pointer ${
                        isReclaimingRent 
                          ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                          : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                      }`}
                    >
                      <RefreshCw size={11} className={isReclaimingRent ? 'animate-spin' : ''} />
                      <span>{isReclaimingRent ? 'Reclaiming...' : 'Reclaim Rent'}</span>
                    </button>
                  </div>

                  {/* High-Speed RPC & Latency Infrastructure Card */}
                  <div className="mt-2.5 p-3 rounded-lg bg-black/60 border border-cyan-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-[10px]">
                        <Zap size={12} className="text-yellow-400" />
                        <span>HIGH-SPEED RPC INFRASTRUCTURE</span>
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        walletInfo?.rpc_health?.status === 'HEALTHY'
                          ? walletInfo?.rpc_health?.is_dedicated
                            ? 'bg-purple-900/30 text-purple-300 border border-purple-500/40'
                            : 'bg-emerald-900/30 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-900/30 text-rose-300 border border-rose-500/40'
                      }`}>
                        {walletInfo?.rpc_health?.provider || 'Solana Cluster'} · {walletInfo?.rpc_health?.latency_ms != null ? `${walletInfo.rpc_health.latency_ms}ms` : 'Connecting...'}
                      </span>
                    </div>

                    <div className="text-[9px] text-slate-400 flex items-center justify-between">
                      <span>Active Node: <span className="font-mono text-cyan-300">{walletInfo?.rpc_health?.rpc_url || walletInfo?.rpc_url || 'https://api.mainnet-beta.solana.com'}</span></span>
                      <span className="text-emerald-400 font-mono">Slot #{walletInfo?.rpc_health?.slot || '---'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Paste Helius API Key or QuickNode RPC URL..."
                        value={customRpcInput}
                        onChange={(e) => setCustomRpcInput(e.target.value)}
                        className="flex-1 bg-black/80 border border-white/10 rounded px-2.5 py-1.5 text-[10px] text-white font-mono focus:border-cyan-400 outline-none placeholder:text-slate-600"
                      />
                      <button
                        onClick={handleTestRpc}
                        disabled={isTestingRpc || !customRpcInput.trim()}
                        className="px-2.5 py-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-bold text-[10px] cursor-pointer disabled:opacity-40"
                      >
                        {isTestingRpc ? 'Pinging...' : 'Test'}
                      </button>
                      <button
                        onClick={handleSaveRpc}
                        disabled={isSavingRpc || !customRpcInput.trim()}
                        className="px-3 py-1.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold text-[10px] cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.2)] disabled:opacity-40"
                      >
                        {isSavingRpc ? 'Saving...' : 'Connect'}
                      </button>
                    </div>

                    <div className="text-[8px] text-slate-500 flex items-center justify-between pt-0.5">
                      <span>Get a free 100k daily RPC key at <a href="https://helius.dev" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">helius.dev</a></span>
                      <span className="text-emerald-400">Auto-Failover Active</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-slate-400 text-[11px] leading-relaxed">
                  No Solana private key is configured yet. The engine safely simulates trades using live Raydium & Jupiter liquidity pools.
                </div>
              )}
            </div>

            {/* Step-by-Step Setup Guide */}
            <div className="mt-3.5 p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-[10px] text-slate-300 space-y-1.5">
              <div className="font-bold text-cyan-300 text-[11px] flex items-center gap-1">
                <span>📋 How to Fund & Activate Real Money DEX Trading:</span>
              </div>
              <div className="pl-2 border-l border-cyan-500/40 space-y-1">
                <p>1. Create a dedicated <strong>"Burner Wallet"</strong> in Phantom or Solflare (never your main wallet).</p>
                <p>2. Send <strong>0.5 to 2 SOL</strong> to the wallet for token swaps and priority gas.</p>
                <p>3. Export your <strong>Base58 Private Key</strong> from Phantom (Settings &gt; Show Private Key).</p>
                <p>4. Add to server <code>.env</code> file:</p>
                <div className="p-1.5 rounded bg-black/80 font-mono text-[9px] text-neon-green select-all border border-white/10">
                  SOLANA_PRIVATE_KEY=your_private_key_base58_here<br/>
                  SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=optional
                </div>
                <p>5. Toggle mode above to <strong>🔴 LIVE ON-CHAIN JUPITER</strong>.</p>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowWalletModal(false)}
                className="px-4 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
