import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Activity, Target, BrainCircuit, AlertTriangle, Crosshair, Gauge, 
  Layers, Zap, Waves, ShieldAlert, RefreshCw, Search, 
  Volume2, VolumeX, Landmark, BellRing, BarChart3, Flame, Compass, Radio, LogOut, Coins, Sparkles, Percent
} from 'lucide-react';
import { PanelTitle, Metric, GexLadder, Playbook, RegimeCard, OptionsChain, UnusualFlow, VolPanel } from './OptionsPanels';
import { MultiChartGrid } from './MultiChartGrid';
import { PositionsDrawer } from './PositionsDrawer';
import { EarlyGemRadar } from './EarlyGemRadar';
import { StrategyBacktestLab } from './StrategyBacktestLab';
import { MacroCalendarModal } from './MacroCalendarModal';
import { MacroRatesModal } from './MacroRatesModal';
import { TelegramConfigModal } from './TelegramConfigModal';
import { OptionsRiskSimulatorModal } from './OptionsRiskSimulatorModal';
import { DeskPerformanceModal } from './DeskPerformanceModal';
import { SolanaDexRadarModal } from './SolanaDexRadarModal';
import { HyperliquidArbModal } from './HyperliquidArbModal';
import { SmartAlgoBoard } from './SmartAlgoBoard';
import { WallReversalRadarCard } from './WallReversalRadarCard';
import { MultiTimeframeRibbon } from './MultiTimeframeRibbon';
import { playInstitutionalChime, speakInstitutionalVoice, isVoiceAlertEnabled, setVoiceAlertEnabled } from './audioAlerts';
import { ErrorBoundary } from './ErrorBoundary';
import { CardHelpProvider, HelpButton } from './CardExplainerModal';
import { ForexBoard } from './ForexBoard';
import { NewsCatalystWire } from './NewsCatalystWire';
import { DumayCommandBar } from './DumayCommandBar';
import { LandingPage } from './LandingPage';
import { auth, onAuthStateChanged, logOut, isUserAuthorized, type User } from './firebaseAuth';

import { API_BASE } from './config';

/* eslint-disable @typescript-eslint/no-explicit-any */
export const LIQUID_ETFS = ['SPY', 'QQQ', 'IWM', 'DIA', 'SMH', 'XLF', 'XLE', 'XLK', 'TLT', 'IBIT', 'GLD', 'SLV'];
export const LIQUID_TECH = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'AMZN', 'META', 'GOOGL', 'NFLX', 'ORCL', 'CRM'];
export const LIQUID_SEMIS = ['AMD', 'AVGO', 'TSM', 'SMCI', 'MU', 'ARM', 'INTC', 'QCOM', 'TXN'];
export const LIQUID_MOMENTUM = ['PLTR', 'COIN', 'MSTR', 'MARA', 'SOFI', 'UBER', 'HOOD', 'AFRM', 'APP', 'RDDT', 'SHOP', 'SNOW', 'DKNG'];
export const LIQUID_FINANCE = ['JPM', 'BAC', 'GS', 'V', 'MA', 'DIS', 'BABA', 'BA', 'XOM', 'CAT', 'LLY'];

const STOCKS_QUICK = [
  ...LIQUID_ETFS,
  ...LIQUID_TECH,
  ...LIQUID_SEMIS,
  ...LIQUID_MOMENTUM,
  ...LIQUID_FINANCE
];

// Institutional 5-Tier Crypto Universe (29 Assets)
export const CRYPTO_L1_L2 = ['BTC', 'ETH', 'SOL', 'BNB', 'SUI', 'NEAR', 'TON', 'AVAX', 'ADA', 'XRP'];
export const CRYPTO_AI_DEPIN = ['TAO', 'RENDER', 'FET', 'ICP', 'AR'];
export const CRYPTO_DEFI = ['UNI', 'AAVE', 'PENDLE', 'ENA', 'LDO', 'RAY'];
export const CRYPTO_RWA = ['LINK', 'ONDO', 'PYTH'];
export const CRYPTO_MEMES = ['DOGE', 'SHIB', 'PEPE', 'WIF', 'BONK'];
export const CRYPTO_ALL = [
  ...CRYPTO_L1_L2,
  ...CRYPTO_AI_DEPIN,
  ...CRYPTO_DEFI,
  ...CRYPTO_RWA,
  ...CRYPTO_MEMES
];
export const CRYPTO_QUICK = CRYPTO_ALL;

export const CRYPTO_CATEGORIES = [
  { id: 'ALL', label: `ALL (${CRYPTO_ALL.length})` },
  { id: 'L1-L2', label: `L1/L2 (${CRYPTO_L1_L2.length})` },
  { id: 'AI-DEPIN', label: `AI & DePIN (${CRYPTO_AI_DEPIN.length})` },
  { id: 'DEFI', label: `DeFi (${CRYPTO_DEFI.length})` },
  { id: 'RWA', label: `RWA (${CRYPTO_RWA.length})` },
  { id: 'MEMES', label: `Memes (${CRYPTO_MEMES.length})` }
] as const;

const FOREX_QUICK = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CAD', 'AUD/USD', 'USD/CHF', 'GBP/JPY', 'DXY'];
const ALL_QUICK = [...STOCKS_QUICK, ...CRYPTO_ALL, ...FOREX_QUICK];

const fmt = (v: any, d?: number, suf = '') => {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '--';
  const n = Number(v);
  const digits = d ?? (Math.abs(n) > 0 && Math.abs(n) < 10 ? 4 : 2); // forex pairs need pip precision
  return `${n.toFixed(digits)}${suf}`;
};

const MOST_LIQUID_OPTIONS_SET = new Set(STOCKS_QUICK);

function App() {
  const [assetClass, setAssetClass] = useState<'EQUITIES' | 'CRYPTO' | 'FOREX'>('EQUITIES');
  const [stockCategory, setStockCategory] = useState<'ALL' | 'ETFS' | 'TECH' | 'SEMIS' | 'MOMENTUM' | 'FINANCE'>('ALL');
  const [cryptoCategory, setCryptoCategory] = useState<'ALL' | 'L1-L2' | 'AI-DEPIN' | 'DEFI' | 'RWA' | 'MEMES'>('ALL');
  const [cryptoMetrics, setCryptoMetrics] = useState<any>(null);
  const [breakouts, setBreakouts] = useState<any[]>([]);
  const [scannerSearch, setScannerSearch] = useState('');
  const [scannerFilter, setScannerFilter] = useState<'ALL' | 'LIQUID-OPTIONS' | 'BREAKOUT' | 'MEGA-CAP' | 'SEMIS' | 'MOMENTUM' | 'CALLS' | 'PUTS'>('ALL');
  const [scannerRefreshing, setScannerRefreshing] = useState(false);
  const [confluence, setConfluence] = useState<any>(null);
  const [overview, setOverview] = useState<any>(null);
  const [backtest, setBacktest] = useState<any>(null);
  const [backtestTicker, setBacktestTicker] = useState('AAPL');
  const [selectedStrategy, setSelectedStrategy] = useState('bollinger');
  const [loading, setLoading] = useState(true);
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);
  const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [isRiskSimulatorOpen, setIsRiskSimulatorOpen] = useState(false);
  const [isPerformanceModalOpen, setIsPerformanceModalOpen] = useState(false);
  const [isDexModalOpen, setIsDexModalOpen] = useState(false);
  const [isHyperliquidModalOpen, setIsHyperliquidModalOpen] = useState(false);

  // Authentication & Portal Access State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (usr) => {
      setCurrentUser(usr);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // options state
  const [optTicker, setOptTicker] = useState('SPY');
  const [optInput, setOptInput] = useState('SPY');
  const [expiry, setExpiry] = useState<string>('');
  const [opt, setOpt] = useState<any>(null);
  const [optLoading, setOptLoading] = useState(false);
  const [optError, setOptError] = useState<string | null>(null);
  const [regime, setRegime] = useState<any>(null);
  const [alpaca, setAlpaca] = useState<any>(null);
  const [tape, setTape] = useState<Record<string, any>>({});
  const [flash, setFlash] = useState<Record<string, 'up' | 'down' | null>>({});
  const [isExpandedCanvas, setIsExpandedCanvas] = useState<boolean>(false);
  const [lastTickTime, setLastTickTime] = useState<string>('');

  // Institutional Dark Pool & Block Trades feed
  const [blockPrints, setBlockPrints] = useState<any[]>([]);
  const [blockLoading, setBlockLoading] = useState(false);

  // Audio & Proximity Alerts state
  const [audioAlertsEnabled, setAudioAlertsEnabled] = useState(true);
  const [voiceAlertsEnabled, setVoiceAlertsEnabled] = useState(() => isVoiceAlertEnabled());
  const [activeLevelAlert, setActiveLevelAlert] = useState<string | null>(null);
  const lastAlertRef = useRef<Record<string, number>>({});

  // Smart Algo state
  const [smartAlgo, setSmartAlgo] = useState<any>(null);
  const [smartAlgoLoading, setSmartAlgoLoading] = useState(false);
  const [activeSideTab, setActiveSideTab] = useState<'algo' | 'crypto-copilot' | 'reversal' | 'news' | 'playbook' | 'regime'>('algo');
  const [copilotArmed, setCopilotArmed] = useState<boolean>(true);
  const [cryptoCopilotArmed, setCryptoCopilotArmed] = useState<boolean>(true);

  // Synchronize Co-Pilot Armed status in header nav
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/copilot/status`);
        const json = await res.json();
        if (json) {
          if (json.armed !== undefined) setCopilotArmed(json.armed);
          if (json.crypto_armed !== undefined) setCryptoCopilotArmed(json.crypto_armed);
        }
      } catch (_) {}
    };
    fetchStatus();
    const iv = setInterval(fetchStatus, 10000);
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('bias_copilot_sync');
        bc.onmessage = () => fetchStatus();
      }
    } catch (_) {}
    return () => {
      clearInterval(iv);
      if (bc) bc.close();
    };
  }, []);

  const getJSON = async (path: string) => {
    const clean = path.startsWith('/') ? path : `/${path}`;
    const endpoint = clean.startsWith('/api/') ? clean : `/api${clean}`;
    const res = await fetch(`${API_BASE}${endpoint}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return res.json();
  };

  const fetchAlpaca = async () => {
    try { setAlpaca(await getJSON('/api/alpaca/account')); } catch (e) { console.error(e); }
  };

  const fetchBreakouts = async () => {
    try { setBreakouts((await getJSON('/scanner/breakout')).results || []); } catch (e) { console.error(e); }
  };
  const handleManualScan = async () => {
    setScannerRefreshing(true);
    await fetchBreakouts();
    setScannerRefreshing(false);
  };
  const fetchOverview = async () => {
    try { setOverview(await getJSON('/market-data/overview')); } catch (e) { console.error(e); }
  };
  const fetchRegime = async () => {
    try { setRegime(await getJSON('/market/regime')); } catch (e) { console.error(e); }
  };

  // Real-time ticking market tape with in-flight request protection to prevent socket congestion
  const isTapeFetchingRef = useRef(false);
  useEffect(() => {
    let prevPrices: Record<string, number> = {};
    const fetchTape = async () => {
      if (isTapeFetchingRef.current) return;
      isTapeFetchingRef.current = true;
      try {
        const symbolsParam = encodeURIComponent(STOCKS_QUICK.join(','));
        const data = await getJSON(`/alpaca/tape?symbols=${symbolsParam}`);
        if (data && data.tape) {
          const newTape = data.tape;
          const nextFlash: Record<string, 'up' | 'down' | null> = {};
          Object.keys(newTape).forEach((sym) => {
            const oldP = prevPrices[sym];
            const newP = newTape[sym]?.price;
            if (oldP !== undefined && newP !== undefined && oldP !== newP) {
              nextFlash[sym] = newP > oldP ? 'up' : 'down';
            }
            if (newP !== undefined) {
              prevPrices[sym] = newP;
            }
          });
          setTape(newTape);
          if (Object.keys(nextFlash).length > 0) {
            setFlash(nextFlash);
            setTimeout(() => setFlash({}), 700);
          }
          const d = new Date();
          setLastTickTime(d.toTimeString().split(' ')[0]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        isTapeFetchingRef.current = false;
      }
    };

    fetchTape();
    const interval = setInterval(fetchTape, 2000); // 2-second interval: smooth ticking without flooding
    return () => clearInterval(interval);
  }, []);

  // Real-Time Macro Crypto Sentiment & Derivatives Metrics Polling (only active when viewing Crypto)
  useEffect(() => {
    if (assetClass !== 'CRYPTO') return;
    let isMounted = true;
    const fetchCryptoMetrics = async () => {
      try {
        const data = await getJSON('/crypto/market-metrics');
        if (isMounted && data && data.status === 'OK') {
          setCryptoMetrics(data);
        }
      } catch (e) {
        console.error('Crypto market metrics fetch error:', e);
      }
    };
    fetchCryptoMetrics();
    const interval = setInterval(fetchCryptoMetrics, 25000); // 25s refresh
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [assetClass]);

  const fetchOptions = useCallback(async (t: string, exp: string) => {
    setOptLoading(true);
    setOptError(null);
    try {
      const data = await getJSON(`/options/analytics?ticker=${encodeURIComponent(t)}${exp ? `&expiry=${exp}` : ''}`);
      if (data.error) { setOptError(data.error); setOpt(null); } else { setOpt(data); }
    } catch (e: any) {
      setOptError(String(e));
    } finally {
      setOptLoading(false);
    }
  }, []);

  const fetchConfluence = useCallback(async (t: string) => {
    try { setConfluence(await getJSON(`/market-data/confluence?ticker=${encodeURIComponent(t)}`)); } catch (e) { console.error(e); }
  }, []);

  const fetchSmartAlgo = useCallback(async (t: string) => {
    setSmartAlgoLoading(true);
    try {
      const data = await getJSON(`/algo/smart-intelligence?ticker=${encodeURIComponent(t)}`);
      setSmartAlgo(data);
    } catch (e) {
      console.error('Failed to fetch smart algo:', e);
    } finally {
      setSmartAlgoLoading(false);
    }
  }, []);

  const fetchBlocks = useCallback(async (t: string) => {
    setBlockLoading(true);
    try {
      const data = await getJSON(`/market-data/blocks?symbol=${encodeURIComponent(t)}&min_notional=80000`);
      if (data && data.blocks) {
        setBlockPrints(data.blocks);
      }
    } catch (e) {
      console.error('Failed to fetch dark pool block prints:', e);
    } finally {
      setBlockLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchBreakouts(), fetchOverview(), fetchRegime(), fetchAlpaca()]).then(() => setLoading(false));
    const interval = setInterval(() => { fetchBreakouts(); fetchOverview(); fetchRegime(); fetchAlpaca(); }, 25000);
    return () => clearInterval(interval);
  }, []);

  // options + confluence + smart algo + dark pool blocks follow the selected ticker
  useEffect(() => {
    fetchOptions(optTicker, expiry);
    fetchConfluence(optTicker);
    fetchSmartAlgo(optTicker);
    fetchBlocks(optTicker);
    const iv = setInterval(() => {
      fetchOptions(optTicker, expiry);
      fetchSmartAlgo(optTicker);
      fetchBlocks(optTicker);
    }, 15000);
    return () => clearInterval(iv);
  }, [optTicker, expiry, fetchOptions, fetchConfluence, fetchSmartAlgo, fetchBlocks]);

  const selectTicker = (t: string) => {
    const s = t.toUpperCase().trim();
    if (!s) return;
    setOptInput(s);
    setExpiry('');
    if (s !== optTicker) setOpt(null); // don't keep showing the previous symbol's levels
    setOptTicker(s);
    setBacktestTicker(s);
  };

  const runBacktest = async () => {
    try {
      setBacktest({ roi: '...', sharpe_ratio: '...', max_drawdown: '...', verdict: '...' });
      setBacktest(await getJSON(`/backtest?ticker=${backtestTicker}&strategy=${selectedStrategy}&timeframe=1d`));
    } catch (e) { console.error(e); }
  };

  const g = opt?.gex || {};
  const activeTape = tape[optTicker];
  const spot = activeTape?.price || opt?.spot;
  const cw = g.call_wall;
  const pw = g.put_wall;
  const fl = g.flip;

  // Proximity Alert Monitor for Call Wall, Put Wall, and Gamma Flip breaches
  useEffect(() => {
    if (!spot || !audioAlertsEnabled) return;
    const now = Date.now();

    if (cw && Math.abs((cw - spot) / spot) < 0.0018) {
      if (!lastAlertRef.current['cw'] || now - lastAlertRef.current['cw'] > 45000) {
        lastAlertRef.current['cw'] = now;
        playInstitutionalChime('call_wall');
        speakInstitutionalVoice(`Call Wall test on ${optTicker} at $${Number(cw).toFixed(2)}. Resistance level.`);
        setActiveLevelAlert(`🎯 CALL WALL TEST: ${optTicker} testing major resistance & upside target at $${Number(cw).toFixed(2)}`);
        setTimeout(() => setActiveLevelAlert(null), 9000);
      }
    } else if (pw && Math.abs((spot - pw) / spot) < 0.0018) {
      if (!lastAlertRef.current['pw'] || now - lastAlertRef.current['pw'] > 45000) {
        lastAlertRef.current['pw'] = now;
        playInstitutionalChime('put_wall');
        speakInstitutionalVoice(`Put Wall support test on ${optTicker} at $${Number(pw).toFixed(2)}. Floor bounce ready.`);
        setActiveLevelAlert(`🛡 PUT WALL TEST: ${optTicker} testing institutional floor support at $${Number(pw).toFixed(2)}`);
        setTimeout(() => setActiveLevelAlert(null), 9000);
      }
    } else if (fl && Math.abs((spot - fl) / spot) < 0.0018) {
      if (!lastAlertRef.current['fl'] || now - lastAlertRef.current['fl'] > 45000) {
        lastAlertRef.current['fl'] = now;
        playInstitutionalChime('gamma_flip');
        speakInstitutionalVoice(`Gamma Flip transition on ${optTicker} at $${Number(fl).toFixed(2)}. Volatility trigger.`);
        setActiveLevelAlert(`⚡ GAMMA FLIP TRANSITION: ${optTicker} near volatility regime trigger at $${Number(fl).toFixed(2)}`);
        setTimeout(() => setActiveLevelAlert(null), 9000);
      }
    }
  }, [spot, cw, pw, fl, optTicker, audioAlertsEnabled]);

  const filteredBreakouts = useMemo(() => {
    return breakouts.filter(item => {
      const matchesSearch = !scannerSearch || item.ticker.toLowerCase().includes(scannerSearch.toLowerCase());
      if (!matchesSearch) return false;
      if (scannerFilter === 'ALL') return true;
      if (scannerFilter === 'LIQUID-OPTIONS') return item.is_liquid_option === true || MOST_LIQUID_OPTIONS_SET.has(item.ticker);
      if (scannerFilter === 'BREAKOUT') return item.category === 'BREAKOUT' || Math.abs(Number(item.change || 0)) >= 3;
      if (scannerFilter === 'MEGA-CAP') return item.category === 'MEGA-CAP';
      if (scannerFilter === 'SEMIS') return item.category === 'SEMIS';
      if (scannerFilter === 'MOMENTUM') return item.category === 'MOMENTUM';
      if (scannerFilter === 'CALLS') return item.signal ? item.signal.includes('CALL') : false;
      if (scannerFilter === 'PUTS') return item.signal ? item.signal.includes('PUT') : false;
      return true;
    });
  }, [breakouts, scannerSearch, scannerFilter]);

  const changePct = activeTape?.change !== undefined ? activeTape.change : opt?.change_pct;
  const distTo = (lvl: number | null) => (lvl && spot ? ((lvl - spot) / spot) * 100 : null);
  const distToCallWall = opt?.gex?.call_wall && spot ? Math.abs((opt.gex.call_wall - spot) / spot) * 100 : null;
  const distToPutWall = opt?.gex?.put_wall && spot ? Math.abs((spot - opt.gex.put_wall) / spot) * 100 : null;
  const regimeTone = regime?.regime === 'RISK-ON' ? 'text-neon-green border-neon-green/40 bg-neon-green/10'
    : regime?.regime === 'STRESS' ? 'text-neon-red border-neon-red/40 bg-neon-red/10'
    : 'text-neon-gold border-neon-gold/40 bg-neon-gold/10';

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#07090e] flex flex-col items-center justify-center font-mono text-xs text-slate-400 gap-3">
        <Activity className="text-cyan-400 animate-spin" size={32} />
        <span>AUTHENTICATING B.I.A.S. INSTITUTIONAL TERMINAL...</span>
      </div>
    );
  }

  const isAuthorized = isUserAuthorized(currentUser);
  if ((!currentUser || !isAuthorized) && !isDemoMode) {
    return (
      <LandingPage 
        user={currentUser} 
        onEnterTerminal={() => setIsDemoMode(false)} 
        onEnterDemo={() => setIsDemoMode(true)} 
      />
    );
  }

  return (
    <CardHelpProvider>
      <div className="min-h-screen w-full p-4 flex flex-col gap-3 font-sans">
        {/* ================= Dumay Command Bar (<GO> Omnibar) ================= */}
        <DumayCommandBar
          isOpen={isCommandBarOpen}
          setIsOpen={setIsCommandBarOpen}
          onSelectTicker={selectTicker}
          onSetAssetClass={setAssetClass}
          onSetActiveSideTab={setActiveSideTab}
          onToggleMacroRates={() => setIsRatesModalOpen(true)}
          onToggleCanvasExpand={() => setIsExpandedCanvas(!isExpandedCanvas)}
          isExpandedCanvas={isExpandedCanvas}
          audioAlertsEnabled={audioAlertsEnabled}
          onToggleAudioAlerts={() => setAudioAlertsEnabled(!audioAlertsEnabled)}
          voiceAlertsEnabled={voiceAlertsEnabled}
          onToggleVoiceAlerts={() => {
            const next = !voiceAlertsEnabled;
            setVoiceAlertsEnabled(next);
            setVoiceAlertEnabled(next);
            if (next) speakInstitutionalVoice('B.I.A.S. Voice Desk active.');
          }}
          onTriggerScan={handleManualScan}
          onOpenDex={() => setIsDexModalOpen(true)}
          onOpenTelegram={() => setIsTelegramModalOpen(true)}
          onOpenRiskSimulator={() => setIsRiskSimulatorOpen(true)}
          onOpenPerformance={() => setIsPerformanceModalOpen(true)}
          currentTicker={optTicker}
          currentAssetClass={assetClass}
          tape={tape}
        />

      {/* ================= Institutional Live Ticker Tape (1s Ticks) ================= */}
      <div className="glass-panel py-1.5 px-4 flex items-center overflow-hidden text-xs font-mono border-b border-neon-green/20 bg-black/60 shadow-[0_0_15px_rgba(0,255,163,0.08)]">
        <div className="flex items-center gap-2 pr-4 border-r border-white/10 shrink-0">
          <span className="w-2 h-2 rounded-full bg-neon-green animate-ping shadow-[0_0_8px_#00ffa3]"></span>
          <span className="text-[10px] uppercase font-bold text-neon-green tracking-widest">SIP TAPE 1s</span>
          <span className="text-[10px] text-slate-500">{lastTickTime || '--:--:--'}</span>
        </div>
        <div className="flex gap-4 overflow-x-auto py-0.5 px-3 items-center w-full">
          {ALL_QUICK.map((sym: string) => {
            const item = tape[sym];
            const p = item?.price;
            const c = item?.change ?? 0;
            const f = flash[sym];
            const flashCls = f === 'up' ? 'bg-neon-green/30 text-neon-green scale-105 border-neon-green' 
                           : f === 'down' ? 'bg-neon-red/30 text-neon-red scale-105 border-neon-red' 
                           : 'border-transparent text-slate-300';
            return (
              <button 
                key={sym} 
                onClick={() => selectTicker(sym)}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-all duration-300 ${flashCls} hover:bg-white/10 hover:border-white/20 shrink-0`}
              >
                <span className="font-bold text-white text-[11px]">{sym}</span>
                <span className="font-bold text-[11px]">{p ? Number(p).toFixed(Number(p) < 10 ? 4 : 2) : '--'}</span>
                <span className={`text-[10px] ${c >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                  {c > 0 ? '+' : ''}{Number(c).toFixed(2)}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ================= Demo Mode Alert Banner ================= */}
      {isDemoMode && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-6 py-2 flex items-center justify-between text-xs font-mono text-amber-200 sticky top-0 z-40 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <strong className="text-amber-300 font-bold uppercase tracking-wider">SIMULATED DEMO SANDBOX</strong>
            <span className="text-amber-400/80 hidden md:inline">
              · You are in Offline Paper Simulation. Orders and analytics here are simulated and do NOT touch your live broker account.
            </span>
          </div>
          <button
            onClick={() => setIsDemoMode(false)}
            className="px-3 py-1 rounded bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-black font-bold text-xs transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer shrink-0"
          >
            Sign In with Google for Live Desk →
          </button>
        </div>
      )}

      {/* ================= Header ================= */}
      {/* ================= Header ================= */}
      <header className="glass-panel py-3 px-6 flex flex-wrap gap-4 justify-between items-center">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg overflow-hidden border border-cyan-400/40 shadow-[0_0_12px_rgba(6,182,212,0.45)] bg-black/60 shrink-0">
            <img src="/dumay-logo.jpg" alt="DUMAY" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl font-bold tracking-wider flex items-center gap-2">
            DUMAY B.I.A.S. <span className="text-slate-500 font-normal">TERMINAL</span>
            <button
              onClick={() => setIsDemoMode(false)}
              title="Return to Public Landing Page Portal"
              className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
            >
              PORTAL
            </button>
          </h1>

          {/* DUMAY COMMAND BAR Launcher */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsCommandBarOpen(true)}
              className="px-2.5 py-1 rounded-lg border border-neon-gold/50 bg-neon-gold/15 hover:bg-neon-gold/25 text-neon-gold text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(255,215,0,0.25)] cursor-pointer group"
              title="Open Dumay Command Bar (Click here, press Ctrl+K, Ctrl+Space, or /)"
            >
              <div className="w-4 h-4 rounded bg-neon-gold/30 flex items-center justify-center text-neon-gold text-[9px] font-extrabold group-hover:scale-110 transition-transform">
                ⚡
              </div>
              <span>DUMAY COMMAND BAR</span>
              <span className="hidden sm:inline px-1.5 py-0.2 rounded bg-black/60 text-neon-gold border border-neon-gold/40 text-[9px] font-mono">
                Ctrl+K / Ctrl+Space
              </span>
              <span className="px-1 py-0.2 rounded bg-neon-gold text-black text-[9px] font-extrabold">
                &lt;GO&gt;
              </span>
            </button>
            <HelpButton cardId="dumay_command_bar" title="Explain Dumay Command Bar & Mnemonics (?)" />
          </div>
          {regime && (
            <span className={`text-[10px] font-bold tracking-widest px-2 py-1 rounded border ${regimeTone}`}>
              {regime.regime} · VIX {fmt(regime.vix)}
            </span>
          )}
          {alpaca?.connected && (
            <span className="text-[10px] font-mono px-2 py-1 rounded border border-neon-green/30 bg-neon-green/10 text-neon-green flex items-center gap-1.5 shadow-[0_0_8px_rgba(0,255,163,0.2)]">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse"></span>
              ALPACA {alpaca.account_number?.startsWith('PA') ? 'PAPER' : 'LIVE'} #{alpaca.account_number}
            </span>
          )}
          {/* Institutional Audio Alerts Toggle */}
          <button
            onClick={() => setAudioAlertsEnabled(!audioAlertsEnabled)}
            className={`text-[10px] font-mono px-2 py-1 rounded border flex items-center gap-1.5 transition-all ${
              audioAlertsEnabled 
                ? 'bg-neon-green/10 text-neon-green border-neon-green/30 shadow-[0_0_8px_rgba(0,255,163,0.15)]' 
                : 'bg-white/5 text-slate-500 border-white/10 hover:text-white'
            }`}
            title={audioAlertsEnabled ? 'Audio Chimes Active for Wall Tests & Gamma Flip' : 'Audio Alerts Muted'}
          >
            {audioAlertsEnabled ? <Volume2 size={12} className="text-neon-green" /> : <VolumeX size={12} />}
            <span>CHIMES {audioAlertsEnabled ? 'ON' : 'MUTED'}</span>
          </button>

          {/* Institutional AI Voice Desk Toggle */}
          <button
            onClick={() => {
              const next = !voiceAlertsEnabled;
              setVoiceAlertsEnabled(next);
              setVoiceAlertEnabled(next);
              if (next) speakInstitutionalVoice('B.I.A.S. Voice Desk active.');
            }}
            className={`text-[10px] font-mono px-2 py-1 rounded border flex items-center gap-1.5 transition-all ${
              voiceAlertsEnabled 
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.2)]' 
                : 'bg-white/5 text-slate-500 border-white/10 hover:text-white'
            }`}
            title={voiceAlertsEnabled ? 'AI Voice Desk Active (Wall tests & RSI spoken)' : 'AI Voice Desk Muted'}
          >
            <Radio size={12} className={voiceAlertsEnabled ? 'text-cyan-400 animate-pulse' : ''} />
            <span>VOICE DESK {voiceAlertsEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* Institutional Macro Catalyst Calendar Modal */}
          <MacroCalendarModal />

          {/* Institutional US Treasury Yield Curve & Rates Modal (YCRV / FED) */}
          <MacroRatesModal 
            externalOpen={isRatesModalOpen} 
            onCloseExternal={() => setIsRatesModalOpen(false)} 
          />

          {/* Live Co-Pilot Dock & 1-Click Quick Toggle */}
          <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded-lg border border-white/10 shrink-0">
            <button
              onClick={() => {
                setActiveSideTab('algo');
                const el = document.getElementById('algo-copilot-card');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`text-[10px] font-mono px-2 py-1 rounded transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSideTab === 'algo'
                  ? 'bg-neon-green/20 text-neon-green font-bold shadow-[0_0_10px_rgba(0,255,163,0.3)]'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Open AI Quant Autonomous Co-Pilot Panel"
            >
              <BrainCircuit size={12} className={copilotArmed ? "text-neon-green animate-pulse" : "text-slate-500"} />
              <span>CO-PILOT:</span>
              <span className={copilotArmed ? "text-neon-green font-bold flex items-center gap-1" : "text-slate-500"}>
                {copilotArmed && <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />}
                {copilotArmed ? "ARMED (OPTIONS)" : "STANDBY"}
              </span>
            </button>
            <button
              onClick={async (e) => {
                e.stopPropagation();
                const next = !copilotArmed;
                setCopilotArmed(next);
                try {
                  await fetch(`${API_BASE}/api/copilot/toggle`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ armed: next })
                  });
                  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
                    const bc = new BroadcastChannel('bias_copilot_sync');
                    bc.postMessage({ type: 'SYNC_COPILOT_STATE', timestamp: Date.now() });
                    bc.close();
                  }
                } catch(e) { console.error(e); }
                if (next) speakInstitutionalVoice('Autonomous Co-Pilot Armed.');
                else speakInstitutionalVoice('Autonomous Co-Pilot Standby.');
              }}
              className={`px-2 py-0.5 rounded text-[8.5px] font-bold font-mono transition-all cursor-pointer ${
                copilotArmed 
                  ? 'bg-neon-red/20 text-neon-red hover:bg-neon-red/30 border border-neon-red/40' 
                  : 'bg-neon-green/20 text-neon-green hover:bg-neon-green/30 border border-neon-green/40'
              }`}
              title={copilotArmed ? "Click to Disarm Co-Pilot (Stop auto-trading)" : "Click to Arm Co-Pilot (Start 24/7 cloud auto-trading)"}
            >
              {copilotArmed ? "DISARM" : "ARM"}
            </button>
          </div>

          {/* Dedicated 24/7 Crypto Auto-Trading Quick Toggle Pill */}
          <div className="flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-lg border border-cyan-500/30">
            <button
              onClick={() => {
                setActiveSideTab('crypto-copilot');
                setTimeout(() => {
                  const el = document.getElementById('algo-crypto-copilot-card');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }, 50);
              }}
              className={`text-[10px] font-mono px-2 py-1 rounded transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSideTab === 'crypto-copilot'
                  ? 'bg-cyan-500/25 text-cyan-300 font-bold shadow-[0_0_12px_rgba(6,182,212,0.35)]'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Open 24/7 Crypto Autonomous Daemon Controls"
            >
              <Coins size={12} className={cryptoCopilotArmed ? "text-cyan-400 animate-pulse" : "text-slate-500"} />
              <span>CRYPTO 24/7:</span>
              <span className={cryptoCopilotArmed ? "text-cyan-300 font-bold flex items-center gap-1" : "text-slate-500"}>
                {cryptoCopilotArmed && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#06b6d4]" />}
                {cryptoCopilotArmed ? "ARMED ($500)" : "STANDBY"}
              </span>
            </button>
            <button
              onClick={async (e) => {
                e.stopPropagation();
                const next = !cryptoCopilotArmed;
                setCryptoCopilotArmed(next);
                try {
                  await fetch(`${API_BASE}/api/copilot/crypto-toggle`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ armed: next })
                  });
                  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
                    const bc = new BroadcastChannel('bias_copilot_sync');
                    bc.postMessage({ type: 'SYNC_COPILOT_STATE', timestamp: Date.now() });
                    bc.close();
                  }
                } catch(e) { console.error(e); }
                if (next) speakInstitutionalVoice('24/7 Crypto Autonomous Daemon Armed.');
                else speakInstitutionalVoice('24/7 Crypto Autonomous Daemon returned to standby.');
              }}
              className={`px-2 py-0.5 rounded text-[8.5px] font-bold font-mono transition-all cursor-pointer ${
                cryptoCopilotArmed 
                  ? 'bg-neon-red/20 text-neon-red hover:bg-neon-red/30 border border-neon-red/40' 
                  : 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40'
              }`}
              title={cryptoCopilotArmed ? "Click to Disarm Crypto Auto-Trading" : "Click to Arm Crypto Auto-Trading ($500/trade, 24/7 continuous)"}
            >
              {cryptoCopilotArmed ? "DISARM" : "ARM CRYPTO"}
            </button>
          </div>

          {/* Quick jump to News Wire */}
          <button
            onClick={() => {
              setActiveSideTab('news');
            }}
            className={`text-[10px] font-mono px-2.5 py-1 rounded border transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSideTab === 'news'
                ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                : 'border-white/10 bg-white/5 text-slate-300 hover:text-white hover:border-emerald-500/40'
            }`}
            title="Open Live Institutional News Wire & Contagion Domino Engine"
          >
            <Radio size={12} className="text-emerald-400 animate-pulse" />
            <span>📰 NEWS WIRE</span>
          </button>

          {/* Quick jump to Strategy Lab */}
          <a
            href="#strategy-lab"
            className="text-[10px] font-mono px-2 py-1 rounded border border-white/10 bg-white/5 text-slate-300 hover:text-white hover:border-neon-green/40 flex items-center gap-1.5 transition-all"
            title="Jump to Quantitative Strategy Lab"
          >
            <BarChart3 size={12} className="text-neon-green" />
            <span>STRATEGY LAB</span>
          </a>

          {/* Quick jump to Crypto Narrative Radar */}
          <a
            href="#narrative-radar"
            className="text-[10px] font-mono px-2.5 py-1 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:text-white hover:bg-amber-500/20 flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(245,158,11,0.15)]"
            title="Jump to Crypto Early Gem & Narrative Radar"
          >
            <Flame size={12} className="text-amber-400 animate-pulse" />
            <span>🔥 NARRATIVE RADAR</span>
          </a>

          {/* Telegram Push Desk Alert Modal */}
          <button
            onClick={() => setIsTelegramModalOpen(true)}
            className="text-[10px] font-mono px-2.5 py-1 rounded border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:text-white hover:bg-cyan-500/20 flex items-center gap-1.5 transition-all shadow-[0_0_8px_rgba(6,182,212,0.2)] cursor-pointer"
            title="Configure Telegram Mobile Push Alerts for 24/7 Crypto & Options"
          >
            <BellRing size={12} className="text-cyan-400" />
            <span>📱 TELEGRAM ALERTS</span>
          </button>

          {/* Options Risk Payoff Simulator (thinkorswim-style) */}
          <button
            onClick={() => setIsRiskSimulatorOpen(true)}
            className="text-[10px] font-mono px-2.5 py-1 rounded border border-purple-500/40 bg-purple-500/10 text-purple-300 hover:text-white hover:bg-purple-500/20 flex items-center gap-1.5 transition-all shadow-[0_0_8px_rgba(168,85,247,0.2)] cursor-pointer"
            title="Open Interactive Options Risk Profile & Payoff Graph (thinkorswim-style)"
          >
            <Activity size={12} className="text-purple-400" />
            <span>📈 RISK SIMULATOR</span>
          </button>

          {/* Desk Performance & Trading Journal */}
          <button
            onClick={() => setIsPerformanceModalOpen(true)}
            className="text-[10px] font-mono px-2.5 py-1 rounded border border-neon-gold/40 bg-neon-gold/10 text-neon-gold hover:text-white hover:bg-neon-gold/20 flex items-center gap-1.5 transition-all shadow-[0_0_8px_rgba(255,204,0,0.2)] cursor-pointer"
            title="Open Quantitative Desk Journal & Win Rate Analytics"
          >
            <BarChart3 size={12} className="text-neon-gold" />
            <span>🏆 PERFORMANCE</span>
          </button>

          {/* Solana DEX Sniper & Jupiter Engine */}
          <button
            onClick={() => setIsDexModalOpen(true)}
            className="text-[10px] font-mono px-2.5 py-1 rounded border border-cyan-400/50 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-neon-green/10 text-cyan-300 hover:text-white flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] cursor-pointer"
            title="Open Solana DEX Sniper & Jupiter New Listing Engine (Raydium / Meteora)"
          >
            <Zap size={12} className="text-cyan-400 fill-cyan-400 animate-pulse" />
            <span>🪐 SOLANA DEX SNIPER</span>
          </button>

          {/* Hyperliquid Delta-Neutral Basis & Funding Arb */}
          <button
            onClick={() => setIsHyperliquidModalOpen(true)}
            className="text-[10px] font-mono px-2.5 py-1 rounded border border-emerald-400/50 bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-transparent text-emerald-300 hover:text-white flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)] cursor-pointer"
            title="Open Hyperliquid Delta-Neutral Basis & 24/7 Funding Arbitrage Desk (20%-50%+ APR)"
          >
            <Percent size={12} className="text-emerald-400 animate-pulse" />
            <span>⚡ DELTA-NEUTRAL ARB (20-50% APR)</span>
          </button>
        </div>
        <div className="flex gap-4 font-mono text-sm">
          {['SPY', 'QQQ', 'AAPL', 'NVDA', 'TSLA'].map((t) => {
            const it = tape[t];
            const p = it?.price ?? overview?.[t]?.price;
            const c = it?.change ?? overview?.[t]?.change;
            const f = flash[t];
            const fCls = f === 'up' ? 'text-neon-green bg-neon-green/20 px-1 rounded' : f === 'down' ? 'text-neon-red bg-neon-red/20 px-1 rounded' : '';
            return (
              <button key={t} onClick={() => selectTicker(t)} className="hover:text-white transition-colors flex items-center gap-1">
                <span className="text-slate-400 font-bold">{t}</span>
                <span className={`transition-all duration-300 ${fCls} ${c >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                  {p ? Number(p).toFixed(2) : '--'} {c > 0 ? '+' : ''}{c !== undefined ? Number(c).toFixed(2) : '--'}%
                </span>
              </button>
            );
          })}
        </div>

        {/* User Account / Auth Profile Gate */}
        <div className="flex items-center gap-2 font-mono">
          {currentUser ? (
            <div className="flex items-center gap-2 bg-black/60 border border-white/10 px-2.5 py-1 rounded-lg text-[11px]">
              {currentUser.photoURL ? (
                <img src={currentUser.photoURL} alt="User" className="w-5 h-5 rounded-full border border-cyan-400" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-[10px]">
                  {currentUser.email?.[0].toUpperCase()}
                </div>
              )}
              <span className="text-white text-xs max-w-[120px] truncate">{currentUser.displayName || currentUser.email}</span>
              <button
                onClick={async () => { await logOut(); setIsDemoMode(false); }}
                title="Sign Out to Landing Page"
                className="text-slate-400 hover:text-neon-red ml-1 transition-colors cursor-pointer"
              >
                <LogOut size={13} />
              </button>
            </div>
          ) : isDemoMode ? (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg text-[11px]">
              <span className="text-amber-400 font-bold">DEMO DESK</span>
              <button
                onClick={() => setIsDemoMode(false)}
                className="text-cyan-400 hover:text-cyan-300 font-bold underline ml-1 cursor-pointer"
              >
                Sign In
              </button>
            </div>
          ) : null}
        </div>
      </header>

      {/* ================= Institutional Quick-Action Command Ribbon ================= */}
      <div className="glass-panel py-2 px-4 flex flex-wrap items-center justify-between gap-3 border border-cyan-500/40 bg-gradient-to-r from-black/90 via-cyan-950/20 to-black/90 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase bg-cyan-950/80 px-2.5 py-1 rounded border border-cyan-500/40 flex items-center gap-1.5 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
            <Sparkles size={12} className="text-cyan-400 animate-spin" />
            NEW POWER DESK MODULES:
          </span>

          {/* Solana DEX Sniper */}
          <button
            onClick={() => setIsDexModalOpen(true)}
            className="text-[11px] font-mono font-bold px-3 py-1 rounded-lg border border-cyan-400 bg-cyan-500/20 text-cyan-200 hover:text-white hover:bg-cyan-500/35 hover:scale-105 flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(6,182,212,0.35)] cursor-pointer"
            title="Open Solana DEX Sniper & Jupiter New Listing Engine (Raydium / Meteora / Pump)"
          >
            <Zap size={13} className="text-cyan-300 fill-cyan-300 animate-pulse" />
            <span>🪐 SOLANA DEX SNIPER</span>
            <span className="px-1 py-0.2 rounded bg-cyan-400 text-black text-[9px] font-extrabold uppercase">LIVE</span>
          </button>

          {/* Telegram Alerts */}
          <button
            onClick={() => setIsTelegramModalOpen(true)}
            className="text-[11px] font-mono font-bold px-3 py-1 rounded-lg border border-sky-400 bg-sky-500/20 text-sky-200 hover:text-white hover:bg-sky-500/35 hover:scale-105 flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(14,165,233,0.35)] cursor-pointer"
            title="Configure Telegram Bot Push Notifications for 24/7 Trades & Stop Loss"
          >
            <BellRing size={13} className="text-sky-300" />
            <span>📱 TELEGRAM ALERTS</span>
            <span className="px-1 py-0.2 rounded bg-sky-400 text-black text-[9px] font-extrabold uppercase">BOT</span>
          </button>

          {/* Options Risk Payoff Simulator */}
          <button
            onClick={() => setIsRiskSimulatorOpen(true)}
            className="text-[11px] font-mono font-bold px-3 py-1 rounded-lg border border-purple-400 bg-purple-500/20 text-purple-200 hover:text-white hover:bg-purple-500/35 hover:scale-105 flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(168,85,247,0.35)] cursor-pointer"
            title="Open thinkorswim-Style Interactive Options Risk Profile & Payoff Graph"
          >
            <Activity size={13} className="text-purple-300" />
            <span>📈 RISK SIMULATOR</span>
            <span className="px-1 py-0.2 rounded bg-purple-400 text-black text-[9px] font-extrabold uppercase">TOS PnL</span>
          </button>

          {/* Performance & Quantitative Journal */}
          <button
            onClick={() => setIsPerformanceModalOpen(true)}
            className="text-[11px] font-mono font-bold px-3 py-1 rounded-lg border border-amber-400 bg-amber-500/20 text-amber-200 hover:text-white hover:bg-amber-500/35 hover:scale-105 flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(245,158,11,0.35)] cursor-pointer"
            title="Open Desk PnL, Win-Rate Statistics & Automated Trade Journal"
          >
            <BarChart3 size={13} className="text-amber-300" />
            <span>🏆 PERFORMANCE &amp; JOURNAL</span>
            <span className="px-1 py-0.2 rounded bg-amber-400 text-black text-[9px] font-extrabold uppercase">WIN %</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>DUMAY B.I.A.S. DESK ACTIVE</span>
        </div>
      </div>

      {/* ================= Institutional Proximity Level Banner ================= */}
      {activeLevelAlert && (
        <div className="glass-panel py-2 px-4 bg-gradient-to-r from-neon-gold/20 via-neon-green/20 to-cyan-500/20 border border-neon-gold/50 flex items-center justify-between text-xs font-mono shadow-[0_0_20px_rgba(255,215,0,0.25)] animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <BellRing size={15} className="text-neon-gold animate-bounce" />
            <span className="text-white font-bold tracking-wide">{activeLevelAlert}</span>
          </div>
          <span className="text-[10px] text-neon-gold font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/40 border border-neon-gold/30">
            PROXIMITY CHIME FIRED
          </span>
        </div>
      )}

      {/* ================= Crypto Macro Sentiment & Derivatives Barometer ================= */}
      {assetClass === 'CRYPTO' && (
        <section className="glass-panel px-4 py-3 border-amber-500/30 bg-gradient-to-r from-amber-950/30 via-black/80 to-amber-950/20 flex flex-wrap items-center justify-between gap-4 text-xs font-mono shadow-[0_4px_20px_rgba(245,158,11,0.08)]">
          {/* Left: Fear & Greed + Dominance */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Fear & Greed */}
            <div className="flex items-center gap-2.5 bg-black/50 px-3 py-1.5 rounded-lg border border-amber-500/20">
              <Flame size={16} className={(cryptoMetrics?.fear_and_greed?.value ?? 63) >= 55 ? 'text-amber-400 animate-pulse' : 'text-cyan-400'} />
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span>FEAR & GREED</span>
                  <span className="text-[9px] px-1 rounded bg-white/10 text-slate-300">24H</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white">
                    {cryptoMetrics?.fear_and_greed?.value ?? 63}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                    (cryptoMetrics?.fear_and_greed?.value ?? 63) >= 75
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                      : (cryptoMetrics?.fear_and_greed?.value ?? 63) >= 55
                        ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                        : 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300'
                  }`}>
                    {cryptoMetrics?.fear_and_greed?.sentiment ?? 'GREED'}
                  </span>
                </div>
              </div>
            </div>

            {/* BTC Dominance */}
            <div className="flex items-center gap-2.5 bg-black/50 px-3 py-1.5 rounded-lg border border-amber-500/20">
              <Target size={16} className="text-amber-400" />
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  BTC DOMINANCE
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-amber-300">
                    {cryptoMetrics?.market_dominance?.btc_dominance ?? '59.2'}%
                  </span>
                  <span className="text-[10px] text-slate-400">
                    ETH {cryptoMetrics?.market_dominance?.eth_dominance ?? '11.0'}%
                  </span>
                </div>
              </div>
            </div>

            {/* Global Market Cap */}
            <div className="hidden md:flex items-center gap-2.5 bg-black/50 px-3 py-1.5 rounded-lg border border-white/10">
              <Landmark size={16} className="text-slate-400" />
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  TOTAL CRYPTO CAP
                </div>
                <div className="text-sm font-bold text-slate-200">
                  ${cryptoMetrics?.market_dominance?.total_mcap_usd ? (cryptoMetrics.market_dominance.total_mcap_usd / 1e12).toFixed(2) : '2.85'}T
                </div>
              </div>
            </div>
          </div>

          {/* Right: Hyperliquid Decentralized Perps Squeeze Barometer */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Squeeze Status Alert Badge */}
            <div className="bg-black/60 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2.5">
              <Activity size={16} className={
                cryptoMetrics?.derivatives_sentiment?.squeeze_color === 'red' ? 'text-neon-red animate-pulse'
                : cryptoMetrics?.derivatives_sentiment?.squeeze_color === 'emerald' ? 'text-neon-green animate-pulse'
                : 'text-amber-400'
              } />
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span>PERP SQUEEZE BAROMETER</span>
                  <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 font-mono">HYPERLIQUID L1</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-black uppercase tracking-wide ${
                    cryptoMetrics?.derivatives_sentiment?.squeeze_color === 'red' ? 'text-neon-red'
                    : cryptoMetrics?.derivatives_sentiment?.squeeze_color === 'emerald' ? 'text-neon-green'
                    : 'text-amber-300'
                  }`}>
                    {cryptoMetrics?.derivatives_sentiment?.squeeze_status ?? 'BALANCED EQUILIBRIUM'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Avg 8h: {cryptoMetrics?.derivatives_sentiment?.average_funding_8h_pct ? `${cryptoMetrics.derivatives_sentiment.average_funding_8h_pct > 0 ? '+' : ''}${cryptoMetrics.derivatives_sentiment.average_funding_8h_pct}%` : '+0.0100%'}
                  </span>
                </div>
              </div>
            </div>

            {/* Squeeze Lead Asset */}
            {cryptoMetrics?.derivatives_sentiment?.top_short_heavy?.symbol && (
              <button
                type="button"
                onClick={() => selectTicker(cryptoMetrics.derivatives_sentiment.top_short_heavy.symbol)}
                className="hidden lg:flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-300 transition-all cursor-pointer"
                title="Shorts paying longs. High potential short squeeze ignition target."
              >
                <Zap size={14} className="text-emerald-400" />
                <div className="text-left">
                  <div className="text-[9px] text-emerald-400 font-bold uppercase">SQUEEZE LEAD</div>
                  <div className="text-xs font-mono font-black">{cryptoMetrics.derivatives_sentiment.top_short_heavy.symbol} ({cryptoMetrics.derivatives_sentiment.top_short_heavy.rate_8h}%)</div>
                </div>
              </button>
            )}

            {/* Narrative DEX Radar Anchor */}
            <a
              href="#narrative-radar"
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(245,158,11,0.25)] shrink-0"
            >
              <Flame size={14} className="text-amber-400" />
              <span>EARLY GEMS RADAR ↓</span>
            </a>
          </div>
        </section>
      )}

      {/* ================= Options / Asset Command Bar ================= */}
      <section className="glass-panel px-4 py-3 flex flex-wrap items-center gap-3">
        {/* Asset Class Switcher */}
        <div className="flex bg-black/60 p-0.5 rounded-lg border border-white/10 shrink-0 shadow-inner">
          <button
            type="button"
            onClick={() => { setAssetClass('EQUITIES'); selectTicker('SPY'); }}
            className={`px-3 py-1 text-xs font-mono font-bold rounded-md transition-all ${assetClass === 'EQUITIES' ? 'bg-neon-green/20 text-neon-green border border-neon-green/40 shadow-[0_0_10px_rgba(0,255,163,0.2)]' : 'text-slate-400 hover:text-white'}`}
          >
            📈 STOCKS
          </button>
          <button
            type="button"
            onClick={() => { setAssetClass('CRYPTO'); selectTicker('BTC'); }}
            className={`px-3 py-1 text-xs font-mono font-bold rounded-md transition-all flex items-center gap-1.5 ${assetClass === 'CRYPTO' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'text-slate-400 hover:text-white'}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            🪙 CRYPTO 24/7
          </button>
          <button
            type="button"
            onClick={() => { setAssetClass('FOREX'); selectTicker('EUR/USD'); }}
            className={`px-3 py-1 text-xs font-mono font-bold rounded-md transition-all flex items-center gap-1.5 ${assetClass === 'FOREX' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_10px_rgba(6,182,212,0.25)]' : 'text-slate-400 hover:text-white'}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            💱 FOREX 24/5
          </button>
        </div>

        <Crosshair size={18} className={assetClass === 'FOREX' ? 'text-cyan-400' : assetClass === 'CRYPTO' ? 'text-amber-400' : 'text-neon-green'} />
        <form onSubmit={(e) => { e.preventDefault(); selectTicker(optInput); }} className="flex gap-2">
          <input
            id="options-ticker-input"
            value={optInput}
            onChange={(e) => setOptInput(e.target.value.toUpperCase())}
            placeholder={assetClass === 'FOREX' ? 'EUR/USD' : assetClass === 'CRYPTO' ? 'BTC' : 'SPY'}
            className="w-24 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white font-mono uppercase outline-none focus:border-neon-green"
          />
          <button id="options-load-btn" className={`${assetClass === 'FOREX' ? 'bg-cyan-400 hover:bg-cyan-300 text-black' : assetClass === 'CRYPTO' ? 'bg-amber-400 hover:bg-amber-300 text-black' : 'bg-neon-green hover:bg-neon-green/80 text-black'} font-bold px-3 py-1.5 rounded-lg text-sm transition-colors`}>Load</button>
        </form>
        {/* Equities Sector Category Filter Tabs */}
        {assetClass === 'EQUITIES' && (
          <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded-lg border border-white/10 shrink-0 text-[10px] font-mono">
            {[
              { id: 'ALL', label: `ALL (${STOCKS_QUICK.length})` },
              { id: 'ETFS', label: `ETFs (${LIQUID_ETFS.length})` },
              { id: 'TECH', label: `Tech (${LIQUID_TECH.length})` },
              { id: 'SEMIS', label: `Semis (${LIQUID_SEMIS.length})` },
              { id: 'MOMENTUM', label: `Momentum (${LIQUID_MOMENTUM.length})` },
              { id: 'FINANCE', label: `Blue-Chip (${LIQUID_FINANCE.length})` },
            ].map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setStockCategory(cat.id as any)}
                className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                  stockCategory === cat.id 
                    ? 'bg-neon-green/20 text-neon-green font-bold border border-neon-green/40 shadow-[0_0_8px_rgba(0,255,163,0.2)]' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Crypto Sector Category Filter Tabs */}
        {assetClass === 'CRYPTO' && (
          <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded-lg border border-amber-500/20 shrink-0 text-[10px] font-mono">
            <span className="text-amber-400 font-bold px-1.5 hidden sm:inline flex items-center gap-1">
              <Coins size={12} />
              SECTOR:
            </span>
            {CRYPTO_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCryptoCategory(cat.id as any)}
                className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                  cryptoCategory === cat.id 
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.2)]' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-1 flex-wrap">
          {(assetClass === 'FOREX' 
            ? FOREX_QUICK 
            : assetClass === 'CRYPTO' 
              ? (cryptoCategory === 'L1-L2' 
                  ? CRYPTO_L1_L2 
                  : cryptoCategory === 'AI-DEPIN' 
                    ? CRYPTO_AI_DEPIN 
                    : cryptoCategory === 'DEFI' 
                      ? CRYPTO_DEFI 
                      : cryptoCategory === 'RWA' 
                        ? CRYPTO_RWA 
                        : cryptoCategory === 'MEMES' 
                          ? CRYPTO_MEMES 
                          : CRYPTO_ALL)
              : stockCategory === 'ETFS' 
                ? LIQUID_ETFS 
                : stockCategory === 'TECH' 
                  ? LIQUID_TECH 
                  : stockCategory === 'SEMIS' 
                    ? LIQUID_SEMIS 
                    : stockCategory === 'MOMENTUM' 
                      ? LIQUID_MOMENTUM 
                      : stockCategory === 'FINANCE' 
                        ? LIQUID_FINANCE 
                        : STOCKS_QUICK
          ).map((t) => {
            const it = tape[t];
            const f = flash[t];
            const fBorder = f === 'up' ? 'border-neon-green text-neon-green shadow-[0_0_8px_#00ffa3]' : f === 'down' ? 'border-neon-red text-neon-red shadow-[0_0_8px_#ff2a6d]' : '';
            const p = it?.price ?? overview?.[t]?.price;
            const priceStr = p !== undefined && p !== null && Number(p) > 0 
              ? (Number(p) < 0.0001
                  ? `$${Number(p).toFixed(7)}`
                  : Number(p) < 0.01
                    ? `$${Number(p).toFixed(5)}`
                    : Number(p) < 5 
                      ? `$${Number(p).toFixed(3)}` 
                      : `$${Number(p).toFixed(1)}`) 
              : '';
            return (
              <button key={t} onClick={() => selectTicker(t)}
                className={`text-[11px] font-mono px-2 py-1 rounded border transition-all duration-300 ${fBorder || (optTicker === t ? (assetClass === 'FOREX' ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10' : assetClass === 'CRYPTO' ? 'border-amber-400 text-amber-300 bg-amber-500/10' : 'border-neon-green text-neon-green bg-neon-green/10') : 'border-white/10 text-slate-400 hover:border-white/30 hover:text-white')}`}>
                <span className="font-bold">{t}</span>
                {priceStr ? <span className="ml-1 text-slate-200">{priceStr}</span> : null}
              </button>
            );
          })}
        </div>
        {assetClass === 'EQUITIES' && (
          <select id="expiry-select" value={expiry || opt?.expiry || ''} onChange={(e) => setExpiry(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white font-mono outline-none focus:border-neon-green">
            {(opt?.expiries || []).map((e: string) => <option key={e} value={e}>{e}</option>)}
          </select>
        )}
        {assetClass === 'CRYPTO' && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
              24/7 SPOT & PERP
            </span>
            <a
              href="#narrative-radar"
              className="text-[11px] font-mono px-2.5 py-1 rounded bg-amber-500/20 border border-amber-400/50 text-amber-300 hover:bg-amber-500/30 font-bold flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(245,158,11,0.2)]"
            >
              <Flame size={12} className="text-amber-400" />
              <span>EXPLORE NARRATIVE GEMS ↓</span>
            </a>
          </div>
        )}
        {assetClass === 'FOREX' && (
          <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            24/5 INTERBANK FX
          </span>
        )}
        {/* Multi-Timeframe Alignment Ribbon */}
        <div className="hidden lg:flex items-center shrink-0">
          <MultiTimeframeRibbon ticker={optTicker} />
        </div>

        <div className="ml-auto flex items-center gap-3 text-[11px] font-mono text-slate-500">
          {optError && <span className="text-neon-red">⚠ {optError}</span>}
          {activeTape && (
            <span className="text-neon-green flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse"></span>
              LIVE SIP: ${Number(activeTape.price).toFixed(2)}
            </span>
          )}
          <span>{opt?.ticker} · upd {opt?.updated || '--'}</span>
          <button onClick={() => fetchOptions(optTicker, expiry)} className="hover:text-neon-green" title="Refresh">
            <RefreshCw size={14} className={optLoading ? 'animate-spin text-neon-green' : ''} />
          </button>
        </div>
      </section>

      {/* ================= Institutional Dark Pool & Block Prints Feed ================= */}
      <div className="glass-panel py-1.5 px-4 flex items-center overflow-hidden text-xs font-mono border-b border-purple-500/30 bg-black/60 shadow-[0_0_15px_rgba(168,85,247,0.08)]">
        <div className="flex items-center gap-2 pr-4 border-r border-white/10 shrink-0">
          <Landmark size={14} className="text-purple-400" />
          <span className="text-[10px] uppercase font-bold text-purple-300 tracking-wider">DARK POOL & BLOCKS ({optTicker})</span>
          <HelpButton cardId="darkpool" title="Explain Dark Pool & Block Sweeps Feed" />
          {blockLoading && <RefreshCw size={10} className="animate-spin text-purple-400" />}
        </div>
        <div className="flex gap-3 overflow-x-auto py-0.5 px-3 items-center w-full">
          {blockPrints.length === 0 ? (
            <span className="text-slate-500 text-[10px] italic">No institutional prints &gt;$80K detected in recent SIP tape</span>
          ) : (
            blockPrints.map((bp, i) => (
              <div 
                key={bp.id || i}
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded border text-[10px] shrink-0 ${
                  bp.is_dark_pool 
                    ? 'bg-purple-950/40 border-purple-500/50 text-purple-200' 
                    : 'bg-white/5 border-white/10 text-slate-300'
                }`}
              >
                <span className={`px-1 py-0.2 rounded text-[8px] font-bold ${
                  bp.is_dark_pool ? 'bg-purple-500 text-black' : 'bg-slate-700 text-slate-200'
                }`}>
                  {bp.is_dark_pool ? 'DARK POOL' : 'BLOCK'}
                </span>
                <span className="font-bold text-white">${Number(bp.price).toFixed(2)}</span>
                <span className="text-slate-400">{Number(bp.size).toLocaleString()} shs</span>
                <strong className={`font-mono ${bp.notional >= 500000 ? 'text-neon-gold' : 'text-neon-green'}`}>
                  {bp.notional_str}
                </strong>
                <span className="text-[8px] text-slate-500">
                  {bp.timestamp ? String(bp.timestamp).split('T')[1]?.split('.')[0] || String(bp.timestamp) : ''}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ================= Key metrics strip ================= */}
      <section className={`grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2 transition-opacity ${optLoading && !opt ? 'opacity-40' : ''}`}>
        <div className={`transition-all duration-300 rounded-lg ${flash[optTicker] === 'up' ? 'ring-2 ring-neon-green' : flash[optTicker] === 'down' ? 'ring-2 ring-neon-red' : ''}`}>
          <Metric 
            label={`${optTicker} Spot`} 
            value={fmt(spot)} 
            sub={activeTape ? `${changePct >= 0 ? '+' : ''}${fmt(changePct, 2, '%')} · 1s Live` : `${changePct >= 0 ? '+' : ''}${fmt(changePct, 2, '%')}`} 
            tone={changePct >= 0 ? 'green' : 'red'} 
            helpKey="metrics"
          />
        </div>
        <Metric label={`Exp Move (${opt?.dte ?? '-'}d)`} value={`±${fmt(opt?.expected_move)}`} sub={`±${fmt(opt?.expected_move_pct, 2, '%')} · ${fmt(spot - opt?.expected_move)}–${fmt(spot + opt?.expected_move)}`} tone="gold" hint="ATM straddle × 0.85" helpKey="metrics" />
        <Metric label="Gamma Flip" value={fmt(g.flip)} sub={`${fmt(distTo(g.flip), 2, '%')} from spot`} tone="gold" hint="Price where dealer net gamma turns from positive to negative" helpKey="metrics" />
        <Metric label="Net GEX" value={`${fmt(g.net, 2)}B`} sub={g.regime} tone={g.net >= 0 ? 'green' : 'red'} hint="$ dealer delta change per 1% move" helpKey="metrics" />
        <Metric label="Call Wall" value={fmt(g.call_wall)} sub={`${fmt(distTo(g.call_wall), 2, '%')} resistance`} tone="green" helpKey="metrics" />
        <Metric label="Put Wall" value={fmt(g.put_wall)} sub={`${fmt(distTo(g.put_wall), 2, '%')} support`} tone="red" helpKey="metrics" />
        <Metric label="Max Pain" value={fmt(opt?.max_pain)} sub={`${fmt(distTo(opt?.max_pain), 2, '%')} · ${opt?.expiry || ''}`} tone="cyan" helpKey="metrics" />
        <Metric label="Put/Call" value={fmt(opt?.pcr_vol)} sub={`OI ${fmt(opt?.pcr_oi)}`} tone={opt?.pcr_vol > 1.2 ? 'red' : opt?.pcr_vol < 0.6 ? 'green' : 'white'} helpKey="metrics" />
      </section>

      {/* ================= 24/5 Forex Institutional Board ================= */}
      {assetClass === 'FOREX' && (
        <ForexBoard currentSymbol={optTicker} onSelectPair={selectTicker} />
      )}

      {/* ================= Row 1: Breakout Scanner | Multi-Chart Grid | Smart Algo ================= */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* Breakout scanner */}
        <div className={`glass-panel p-4 flex flex-col transition-all duration-300 ${
          isExpandedCanvas ? 'xl:col-span-4 order-2 min-h-[560px] max-h-[560px]' : 'xl:col-span-3 order-1 min-h-[690px] max-h-[690px]'
        }`}>
          <PanelTitle 
            icon={<Target size={14} className="text-neon-green" />} 
            helpKey="breakout"
            right={
              <div className="flex items-center gap-2">
                <button
                  onClick={handleManualScan}
                  disabled={scannerRefreshing}
                  className="px-2 py-0.5 text-[9px] font-mono font-bold rounded bg-neon-green/10 border border-neon-green/30 text-neon-green hover:bg-neon-green/20 hover:border-neon-green transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="Rescan market intraday gainers, losers and high RVOL surges"
                >
                  <RefreshCw size={10} className={scannerRefreshing ? "animate-spin" : ""} />
                  {scannerRefreshing ? "SCANNING..." : "SCAN"}
                </button>
                <span className="text-[10px] font-mono text-neon-green font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse shadow-[0_0_8px_#00ffa3]" />
                  {breakouts.length} LIVE
                </span>
              </div>
            }
          >
            Breakout Scanner
          </PanelTitle>

          {/* Search & Filter Bar */}
          <div className="flex flex-col gap-1.5 mb-2.5">
            <div className="relative flex items-center">
              <Search size={12} className="absolute left-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search liquid ticker (NVDA, TSLA...)"
                value={scannerSearch}
                onChange={(e) => setScannerSearch(e.target.value.toUpperCase())}
                className="w-full bg-black/50 border border-white/10 rounded-md pl-7 pr-2 py-1 text-xs font-mono text-white placeholder-slate-500 outline-none focus:border-neon-green"
              />
            </div>
            
            {/* Category Filter Chips */}
            <div className="flex gap-1 overflow-x-auto pb-0.5 text-[9px] font-mono no-scrollbar">
              {[
                { id: 'ALL', label: 'ALL' },
                { id: 'LIQUID-OPTIONS', label: '💧 MOST LIQUID OPTIONS' },
                { id: 'BREAKOUT', label: '🔥 BREAKOUT' },
                { id: 'MEGA-CAP', label: 'MEGA-CAP' },
                { id: 'SEMIS', label: 'SEMIS' },
                { id: 'MOMENTUM', label: 'MOMENTUM' },
                { id: 'CALLS', label: 'CALLS' },
                { id: 'PUTS', label: 'PUTS' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setScannerFilter(tab.id as any)}
                  className={`px-2 py-0.5 rounded border transition-all shrink-0 ${
                    scannerFilter === tab.id
                      ? tab.id === 'LIQUID-OPTIONS'
                        ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300 font-bold shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                        : 'border-neon-green bg-neon-green/15 text-neon-green font-bold shadow-[0_0_6px_rgba(0,255,163,0.2)]'
                      : 'border-white/5 text-slate-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between text-[10px] text-slate-500 px-1 mb-1.5 border-b border-white/5 pb-1">
            <span>TICKER / PRICE / %CHG</span>
            <span>REL VOL / FLOW SIGNAL</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1.5">
            {loading ? (
              <div className="text-center text-slate-500 italic mt-10">Scanning 50+ liquid options leaders...</div>
            ) : filteredBreakouts.length === 0 ? (
              <div className="text-center text-slate-500 italic mt-10">No tickers match filter</div>
            ) : filteredBreakouts.map((item, i) => {
              const chg = Number(item.change ?? 0);
              const isPos = chg > 0;
              return (
              <button 
                key={i} 
                onClick={() => selectTicker(item.ticker)} 
                title={`Click to load options analytics & chart for ${item.ticker}`}
                className={`text-left flex justify-between items-center p-2.5 rounded-lg border transition-all ${
                  optTicker === item.ticker 
                    ? 'border-neon-green/80 bg-neon-green/10 shadow-[0_0_10px_rgba(0,255,163,0.15)]' 
                    : 'bg-white/[0.03] border-white/5 hover:border-neon-green/40 hover:bg-neon-green/5'
                }`}
              >
                <div>
                  <div className="font-mono font-bold text-xs text-white flex items-center gap-1.5">
                    {item.ticker}
                    <span className="text-[11px] text-slate-300 font-normal">
                      ${Number(item.price).toFixed(2)}
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-1 rounded ${
                      isPos ? 'bg-neon-green/20 text-neon-green' : chg < 0 ? 'bg-neon-red/20 text-neon-red' : 'bg-white/10 text-slate-400'
                    }`}>
                      {isPos ? '+' : ''}{chg.toFixed(2)}%
                    </span>
                    {(item.is_liquid_option || MOST_LIQUID_OPTIONS_SET.has(item.ticker)) && (
                      <span 
                        className="text-[8px] px-1 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono font-semibold shrink-0"
                        title="Ultra-liquid options: penny-wide bid-ask spread with easy execution & low slippage"
                      >
                        💧 1¢ SPREAD
                      </span>
                    )}
                    {item.category && item.category !== 'LIQUID' && (
                      <span className="text-[8px] px-1 py-0.2 rounded bg-white/10 text-slate-300 border border-white/10">
                        {item.category}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400">Vol: {item.volatility}</div>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-[10px] font-mono text-slate-300">{item.volume_multiplier} RVOL</span>
                  <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                    item.signal.includes('CALL') ? 'bg-neon-green/20 text-neon-green border-neon-green/50'
                    : item.signal.includes('PUT') ? 'bg-neon-red/20 text-neon-red border-neon-red/50'
                    : item.signal === 'INDEX' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                    : 'bg-slate-500/20 text-slate-400 border-slate-500/50'}`}>
                    {item.signal}
                  </span>
                </div>
              </button>
            )})}
          </div>
        </div>

        {/* Center: Multi-Chart Grid (Single, Dual Split, Quad Matrix) */}
        <div className={`glass-panel p-4 flex flex-col transition-all duration-300 overflow-hidden ${
          isExpandedCanvas ? 'xl:col-span-12 order-1 min-h-[780px] max-h-[780px] shadow-[0_0_25px_rgba(0,255,163,0.1)]' : 'xl:col-span-6 order-2 min-h-[690px] max-h-[690px]'
        }`}>
          {/* Wall Proximity Reversal Banner */}
          {distToCallWall !== null && distToCallWall <= 0.35 && (
            <div 
              onClick={() => setActiveSideTab('reversal')}
              className="cursor-pointer mb-2.5 px-3 py-1.5 rounded-lg border border-neon-red/40 bg-neon-red/10 flex items-center justify-between text-xs font-mono text-neon-red hover:bg-neon-red/20 transition-all shadow-[0_0_12px_rgba(255,42,109,0.15)]"
              title="Click to view Wall Reversal Radar tactical playbook"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle size={13} className="animate-pulse" />
                <span className="font-bold">CALL WALL EXHAUSTION ZONE:</span>
                <span>{optTicker} within {distToCallWall.toFixed(2)}% of Call Wall (${opt?.gex?.call_wall?.toFixed(2)}). Reversal fade ready.</span>
              </div>
              <span className="text-[10px] font-bold underline flex items-center gap-1">VIEW SETUP →</span>
            </div>
          )}
          {distToPutWall !== null && distToPutWall <= 0.35 && (
            <div 
              onClick={() => setActiveSideTab('reversal')}
              className="cursor-pointer mb-2.5 px-3 py-1.5 rounded-lg border border-neon-green/40 bg-neon-green/10 flex items-center justify-between text-xs font-mono text-neon-green hover:bg-neon-green/20 transition-all shadow-[0_0_12px_rgba(0,255,163,0.15)]"
              title="Click to view Wall Reversal Radar tactical playbook"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle size={13} className="animate-pulse" />
                <span className="font-bold">PUT WALL SUPPORT BOUNCE ZONE:</span>
                <span>{optTicker} within {distToPutWall.toFixed(2)}% of Put Wall (${opt?.gex?.put_wall?.toFixed(2)}). Floor bounce ready.</span>
              </div>
              <span className="text-[10px] font-bold underline flex items-center gap-1">VIEW SETUP →</span>
            </div>
          )}

          <div className="flex-1 min-h-0 flex flex-col">
            <ErrorBoundary fallbackTitle="Chart Matrix Render Error">
              <MultiChartGrid
                primaryTicker={optTicker}
                onSelectPrimaryTicker={selectTicker}
                tape={tape}
                primaryGex={opt?.gex}
                primaryMaxPain={opt?.max_pain}
                isExpandedCanvas={isExpandedCanvas}
                setIsExpandedCanvas={setIsExpandedCanvas}
              />
            </ErrorBoundary>
          </div>
        </div>

        {/* Right Panel: Smart Algo Board / Wall Reversal Radar / Playbook / Macro Regime */}
        <div className={`flex flex-col gap-4 transition-all duration-300 min-h-0 ${
          isExpandedCanvas ? 'xl:col-span-8 order-3' : 'xl:col-span-3 order-3'
        }`}>
          <div className={`glass-panel p-4 flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
            isExpandedCanvas ? 'min-h-[780px] max-h-[780px]' : 'min-h-[690px] max-h-[690px]'
          }`}>
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/5">
              <div className="flex bg-black/60 p-0.5 rounded-lg border border-white/10 gap-0.5 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActiveSideTab('reversal')}
                  className={`px-2 py-1 text-[10px] font-mono rounded font-bold transition-all flex items-center gap-1 shrink-0 ${
                    activeSideTab === 'reversal'
                      ? 'bg-neon-gold/25 text-neon-gold border border-neon-gold/50 shadow-[0_0_8px_rgba(255,215,0,0.3)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Compass size={11} /> Reversal Radar
                </button>
                <button
                  onClick={() => setActiveSideTab('algo')}
                  className={`px-2 py-1 text-[10px] font-mono rounded font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                    activeSideTab === 'algo'
                      ? 'bg-neon-green/25 text-neon-green border border-neon-green/50 shadow-[0_0_12px_rgba(0,255,163,0.3)]'
                      : copilotArmed
                      ? 'text-neon-green/90 border border-neon-green/20 bg-neon-green/5 hover:text-white hover:bg-neon-green/10'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <BrainCircuit size={11} className={copilotArmed ? "text-neon-green animate-pulse" : ""} />
                  <span>🤖 AI Quant (Options)</span>
                  {copilotArmed && <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-ping shrink-0" />}
                </button>
                <button
                  onClick={() => setActiveSideTab('crypto-copilot')}
                  className={`px-2 py-1 text-[10px] font-mono rounded font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                    activeSideTab === 'crypto-copilot'
                      ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.35)]'
                      : cryptoCopilotArmed
                      ? 'text-cyan-300/90 border border-cyan-500/30 bg-cyan-500/10 hover:text-white hover:bg-cyan-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Switch to 24/7 Crypto Autonomous Daemon Board"
                >
                  <Coins size={11} className={cryptoCopilotArmed ? "text-cyan-400 animate-pulse" : ""} />
                  <span>⚡ 24/7 Crypto Auto</span>
                  {cryptoCopilotArmed && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping shrink-0" />}
                </button>
                <button
                  onClick={() => setActiveSideTab('news')}
                  className={`px-2 py-1 text-[10px] font-mono rounded font-bold transition-all flex items-center gap-1 shrink-0 ${
                    activeSideTab === 'news'
                      ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Radio size={11} className="text-emerald-400 animate-pulse" /> News Wire
                </button>
                <button
                  onClick={() => setActiveSideTab('playbook')}
                  className={`px-2 py-1 text-[10px] font-mono rounded font-bold transition-all flex items-center gap-1 shrink-0 ${
                    activeSideTab === 'playbook'
                      ? 'bg-neon-green/20 text-neon-green border border-neon-green/40 shadow-[0_0_8px_rgba(0,255,163,0.2)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Zap size={11} /> Playbook
                </button>
                <button
                  onClick={() => setActiveSideTab('regime')}
                  className={`px-2 py-1 text-[10px] font-mono rounded font-bold transition-all flex items-center gap-1 shrink-0 ${
                    activeSideTab === 'regime'
                      ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_8px_rgba(56,189,248,0.2)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Gauge size={11} /> Regime
                </button>
              </div>

              <button
                onClick={() => { fetchSmartAlgo(optTicker); fetchOptions(optTicker, expiry); }}
                title="Refresh Quantitative Intelligence & Gamma Levels"
                className="text-slate-500 hover:text-neon-gold p-1 transition-colors"
              >
                <RefreshCw size={12} className={smartAlgoLoading || optLoading ? 'animate-spin text-neon-gold' : ''} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 flex flex-col">
              {activeSideTab === 'reversal' && (
                <ErrorBoundary fallbackTitle="Wall Reversal Radar Render Error">
                  <WallReversalRadarCard
                    ticker={optTicker}
                    spotPrice={spot}
                    gex={opt?.gex}
                    maxPain={opt?.max_pain}
                    onSelectTicker={selectTicker}
                    scannerBreakouts={breakouts}
                  />
                </ErrorBoundary>
              )}
              {(activeSideTab === 'algo' || activeSideTab === 'crypto-copilot') && (
                <ErrorBoundary fallbackTitle="Quant Algo Intelligence Render Error">
                  <SmartAlgoBoard 
                    data={smartAlgo} 
                    loading={smartAlgoLoading} 
                    onSelectTicker={selectTicker} 
                    tape={tape} 
                    initialMode={activeSideTab === 'crypto-copilot' ? 'crypto' : 'options'}
                  />
                </ErrorBoundary>
              )}
              {activeSideTab === 'news' && (
                <ErrorBoundary fallbackTitle="News Catalyst Wire Render Error">
                  <NewsCatalystWire currentTicker={optTicker} onSelectTicker={selectTicker} />
                </ErrorBoundary>
              )}
              {activeSideTab === 'playbook' && (
                <Playbook data={opt} />
              )}
              {activeSideTab === 'regime' && (
                <RegimeCard regime={regime} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================= Row 2: chain | GEX ladder | unusual & vol ================= */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="glass-panel xl:col-span-5 p-4">
          <PanelTitle 
            icon={<Crosshair size={14} className="text-neon-green" />}
            helpKey="chain"
            right={<span className="text-[10px] font-mono text-slate-500">{opt?.expiry} · {opt?.dte}DTE · straddle ${fmt(opt?.straddle)}</span>}
          >
            Options Chain
          </PanelTitle>
          <OptionsChain data={opt} />
        </div>
        <div className="glass-panel xl:col-span-4 p-4 flex flex-col">
          <PanelTitle 
            icon={<Layers size={14} className="text-neon-gold" />}
            helpKey="gex"
            right={<span className="text-[10px] font-mono text-slate-500">{g.expiries_used?.length || 0} expiries · ±5%</span>}
          >
            Gamma Exposure · Dealer Positioning
          </PanelTitle>
          <GexLadder data={opt} />
        </div>
        <div className="glass-panel xl:col-span-3 p-4 flex flex-col gap-4">
          <div>
            <PanelTitle icon={<ShieldAlert size={14} className="text-neon-red" />} helpKey="unusual">Unusual Flow</PanelTitle>
            <UnusualFlow data={opt} />
          </div>
          <div className="pt-2 border-t border-white/5">
            <PanelTitle icon={<Waves size={14} className="text-cyan-300" />} helpKey="volsurface">Vol Surface</PanelTitle>
            <VolPanel data={opt} />
          </div>
        </div>
      </div>

      {/* ================= Row 3: sentiment | strategy lab ================= */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="glass-panel xl:col-span-6 p-4 flex flex-col">
          <PanelTitle icon={<BrainCircuit size={14} className="text-neon-gold" />} helpKey="sentiment">Technical Sentiment · {confluence?.ticker || optTicker}</PanelTitle>
          <div className="mb-4">
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="text-neon-green">Bullish {confluence?.sentiment_score ?? 50}%</span>
              <span className="text-neon-red">Bearish {100 - (confluence?.sentiment_score ?? 50)}%</span>
            </div>
            <div className="h-2 w-full bg-neon-red/30 rounded-full overflow-hidden">
              <div className="h-full bg-neon-green transition-all duration-1000" style={{ width: `${confluence?.sentiment_score ?? 50}%` }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border border-white/10 bg-black/30 text-center">
              <div className="text-[10px] text-slate-500 uppercase">TradingView Rating</div>
              <div className={`text-lg font-bold ${confluence?.overall_alignment?.includes('BUY') ? 'text-neon-green' : confluence?.overall_alignment?.includes('SELL') ? 'text-neon-red' : 'text-white'}`}>
                {confluence?.overall_alignment || 'LOADING'}
              </div>
            </div>
            <div className="p-3 rounded-lg border border-white/10 bg-black/30 text-center">
              <div className="text-[10px] text-slate-500 uppercase">Options Bias</div>
              <div className={`text-lg font-bold ${opt?.playbook?.bias?.includes('BULL') ? 'text-neon-green' : opt?.playbook?.bias?.includes('BEAR') ? 'text-neon-red' : 'text-white'}`}>
                {opt?.playbook?.bias || '--'}
              </div>
            </div>
          </div>
          {confluence?.overall_alignment && opt?.playbook?.bias && (
            <p className="text-xs text-slate-400 mt-3">
              {(confluence.overall_alignment.includes('BUY') && opt.playbook.bias.includes('BULL')) || (confluence.overall_alignment.includes('SELL') && opt.playbook.bias.includes('BEAR'))
                ? '✅ Technicals and options flow AGREE: higher-conviction setup.'
                : '⚠️ Technicals and options flow DISAGREE: reduce size or wait.'}
            </p>
          )}
        </div>

        <div className="glass-panel xl:col-span-6 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <PanelTitle icon={<AlertTriangle size={14} className="text-neon-red" />} helpKey="backtest">Strategy Lab · Quick Runner</PanelTitle>
              <a href="#strategy-lab" className="text-[11px] font-mono text-neon-green hover:underline flex items-center gap-1">
                Open Full Lab Suite →
              </a>
            </div>
            <div className="flex gap-2 mb-4">
              <input type="text" value={backtestTicker} onChange={(e) => setBacktestTicker(e.target.value.toUpperCase())} placeholder="TICKER"
                className="w-24 bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white font-mono uppercase outline-none focus:border-neon-green" />
              <select value={selectedStrategy} onChange={(e) => setSelectedStrategy(e.target.value)}
                className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white outline-none focus:border-neon-green">
                <option value="bollinger">Bollinger Mean Reversion</option>
                <option value="rsi">RSI Pullback</option>
                <option value="macd">MACD Cross</option>
                <option value="ema_cross">EMA Cross</option>
                <option value="supertrend">Supertrend</option>
                <option value="donchian">Donchian Breakout</option>
              </select>
              <button id="run-backtest-btn" onClick={runBacktest} className="bg-neon-green text-black font-bold px-4 py-2 rounded-lg hover:opacity-80 transition-opacity">Run</button>
            </div>
            <div className="bg-black/40 rounded-lg border border-white/5 p-4 flex flex-col justify-center">
              <div className="grid grid-cols-4 gap-2 mb-4 text-center">
                <div><div className="text-[10px] text-slate-500 uppercase">Return</div><div className="text-xl font-mono font-bold text-neon-green">{backtest?.roi || '--'}</div></div>
                <div><div className="text-[10px] text-slate-500 uppercase">Sharpe</div><div className="text-xl font-mono font-bold text-white">{backtest?.sharpe_ratio ?? '--'}</div></div>
                <div><div className="text-[10px] text-slate-500 uppercase">Drawdown</div><div className="text-xl font-mono font-bold text-neon-red">{backtest?.max_drawdown || '--'}</div></div>
                <div><div className="text-[10px] text-slate-500 uppercase">Trades</div><div className="text-xl font-mono font-bold text-white">{backtest?.total_trades ?? '--'}</div></div>
              </div>
              {backtest?.verdict && (
                <div className={`text-center py-1 text-xs font-bold rounded ${
                  backtest.verdict === 'ROBUST' ? 'bg-neon-green/20 text-neon-green border border-neon-green/30'
                  : backtest.verdict === 'OVERFITTED' ? 'bg-neon-red/20 text-neon-red border border-neon-red/30'
                  : 'bg-white/10 text-slate-300'}`}>
                  VERDICT: {backtest.verdict}{backtest.total_trades !== undefined && backtest.total_trades < 10 && backtest.verdict !== '...' ? ' · LOW SAMPLE' : ''}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================= Quantitative Strategy Lab & Backtest Engine ================= */}
      <div id="strategy-lab">
        <StrategyBacktestLab initialTicker={optTicker} onSelectTicker={selectTicker} />
      </div>

      {/* ================= Early Gem & Meme Radar ================= */}
      <div id="narrative-radar">
        <EarlyGemRadar />
      </div>

      {/* ================= Alpaca Live Positions & Portfolio Drawer ================= */}
      <PositionsDrawer alpacaAccount={alpaca} onSelectTicker={selectTicker} />

      {/* ================= Institutional Modals ================= */}
      <TelegramConfigModal 
        isOpen={isTelegramModalOpen} 
        onClose={() => setIsTelegramModalOpen(false)} 
      />

      <OptionsRiskSimulatorModal
        isOpen={isRiskSimulatorOpen}
        onClose={() => setIsRiskSimulatorOpen(false)}
        spotPrice={opt?.spot || 585}
        symbol={optTicker}
        callWall={opt?.gex?.call_wall}
        putWall={opt?.gex?.put_wall}
      />

      <DeskPerformanceModal
        isOpen={isPerformanceModalOpen}
        onClose={() => setIsPerformanceModalOpen(false)}
      />

      <SolanaDexRadarModal
        isOpen={isDexModalOpen}
        onClose={() => setIsDexModalOpen(false)}
      />

      <HyperliquidArbModal
        isOpen={isHyperliquidModalOpen}
        onClose={() => setIsHyperliquidModalOpen(false)}
      />

      <footer className="text-center text-[10px] text-slate-600 font-mono pb-2">
        Personal use · Options data via Yahoo Finance (delayed) · Screener via TradingView · Alpaca Real-Time SIP · Not financial advice
      </footer>
    </div>
  </CardHelpProvider>
  );
}

export default App;
