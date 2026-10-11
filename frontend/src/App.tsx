import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Activity, Target, BrainCircuit, AlertTriangle, Crosshair, Gauge, 
  Layers, Zap, Waves, ShieldAlert, RefreshCw, Search, 
  Volume2, VolumeX, Landmark, BellRing, BarChart3
} from 'lucide-react';
import { PanelTitle, Metric, GexLadder, Playbook, RegimeCard, OptionsChain, UnusualFlow, VolPanel } from './OptionsPanels';
import { MultiChartGrid } from './MultiChartGrid';
import { PositionsDrawer } from './PositionsDrawer';
import { EarlyGemRadar } from './EarlyGemRadar';
import { StrategyBacktestLab } from './StrategyBacktestLab';
import { MacroCalendarModal } from './MacroCalendarModal';
import { SmartAlgoBoard } from './SmartAlgoBoard';
import { playInstitutionalChime } from './audioAlerts';
import { ErrorBoundary } from './ErrorBoundary';
import { CardHelpProvider, HelpButton } from './CardExplainerModal';
import { ForexBoard } from './ForexBoard';

import { API_BASE as SERVER_URL } from './config';

/* eslint-disable @typescript-eslint/no-explicit-any */
const API_BASE = `${SERVER_URL}/api`;
const STOCKS_QUICK = ['SPY', 'QQQ', 'IWM', 'AAPL', 'NVDA', 'TSLA', 'AMD', 'META'];
const CRYPTO_QUICK = ['BTC', 'ETH', 'SOL', 'DOGE', 'XRP', 'AVAX'];
const FOREX_QUICK = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CAD', 'AUD/USD', 'USD/CHF', 'GBP/JPY', 'DXY'];
const ALL_QUICK = [...STOCKS_QUICK, ...CRYPTO_QUICK, ...FOREX_QUICK];

const fmt = (v: any, d = 2, suf = '') => (v === null || v === undefined ? '--' : `${Number(v).toFixed(d)}${suf}`);

function App() {
  const [assetClass, setAssetClass] = useState<'EQUITIES' | 'CRYPTO' | 'FOREX'>('EQUITIES');
  const [breakouts, setBreakouts] = useState<any[]>([]);
  const [scannerSearch, setScannerSearch] = useState('');
  const [scannerFilter, setScannerFilter] = useState<'ALL' | 'MEGA-CAP' | 'SEMIS' | 'MOMENTUM' | 'CALLS' | 'PUTS'>('ALL');
  const [confluence, setConfluence] = useState<any>(null);
  const [overview, setOverview] = useState<any>(null);
  const [backtest, setBacktest] = useState<any>(null);
  const [backtestTicker, setBacktestTicker] = useState('AAPL');
  const [selectedStrategy, setSelectedStrategy] = useState('bollinger');
  const [loading, setLoading] = useState(true);

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
  const [activeLevelAlert, setActiveLevelAlert] = useState<string | null>(null);
  const lastAlertRef = useRef<Record<string, number>>({});

  // Smart Algo state
  const [smartAlgo, setSmartAlgo] = useState<any>(null);
  const [smartAlgoLoading, setSmartAlgoLoading] = useState(false);
  const [activeSideTab, setActiveSideTab] = useState<'algo' | 'playbook' | 'regime'>('algo');

  const getJSON = async (path: string) => (await fetch(`${API_BASE}${path}`)).json();

  const fetchAlpaca = async () => {
    try { setAlpaca(await getJSON('/alpaca/account')); } catch (e) { console.error(e); }
  };

  const fetchBreakouts = async () => {
    try { setBreakouts((await getJSON('/scanner/breakout')).results || []); } catch (e) { console.error(e); }
  };
  const fetchOverview = async () => {
    try { setOverview(await getJSON('/market-data/overview')); } catch (e) { console.error(e); }
  };
  const fetchRegime = async () => {
    try { setRegime(await getJSON('/market/regime')); } catch (e) { console.error(e); }
  };

  // 1-second live ticking market tape with real-time uptick/downtick flash
  useEffect(() => {
    let prevPrices: Record<string, number> = {};
    const fetchTape = async () => {
      try {
        const data = await getJSON('/alpaca/tape');
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
      }
    };

    fetchTape();
    const interval = setInterval(fetchTape, 1000); // 1-second real-time streaming!
    return () => clearInterval(interval);
  }, []);

  const fetchOptions = useCallback(async (t: string, exp: string) => {
    setOptLoading(true);
    setOptError(null);
    try {
      const data = await getJSON(`/options/analytics?ticker=${t}${exp ? `&expiry=${exp}` : ''}`);
      if (data.error) { setOptError(data.error); } else { setOpt(data); }
    } catch (e: any) {
      setOptError(String(e));
    } finally {
      setOptLoading(false);
    }
  }, []);

  const fetchConfluence = useCallback(async (t: string) => {
    try { setConfluence(await getJSON(`/market-data/confluence?ticker=${t}`)); } catch (e) { console.error(e); }
  }, []);

  const fetchSmartAlgo = useCallback(async (t: string) => {
    setSmartAlgoLoading(true);
    try {
      const data = await getJSON(`/algo/smart-intelligence?ticker=${t}`);
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
      const data = await getJSON(`/market-data/blocks?symbol=${t}&min_notional=80000`);
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

  // Proximity Alert Monitor for Call Wall, Put Wall, and Gamma Flip breaches
  useEffect(() => {
    if (!spot || !audioAlertsEnabled) return;
    const now = Date.now();
    const cw = g.call_wall;
    const pw = g.put_wall;
    const fl = g.flip;

    if (cw && Math.abs((cw - spot) / spot) < 0.0018) {
      if (!lastAlertRef.current['cw'] || now - lastAlertRef.current['cw'] > 45000) {
        lastAlertRef.current['cw'] = now;
        playInstitutionalChime('call_wall');
        setActiveLevelAlert(`🎯 CALL WALL TEST: ${optTicker} testing major resistance & upside target at $${Number(cw).toFixed(2)}`);
        setTimeout(() => setActiveLevelAlert(null), 9000);
      }
    } else if (pw && Math.abs((spot - pw) / spot) < 0.0018) {
      if (!lastAlertRef.current['pw'] || now - lastAlertRef.current['pw'] > 45000) {
        lastAlertRef.current['pw'] = now;
        playInstitutionalChime('put_wall');
        setActiveLevelAlert(`🛡 PUT WALL TEST: ${optTicker} testing institutional floor support at $${Number(pw).toFixed(2)}`);
        setTimeout(() => setActiveLevelAlert(null), 9000);
      }
    } else if (fl && Math.abs((spot - fl) / spot) < 0.0018) {
      if (!lastAlertRef.current['fl'] || now - lastAlertRef.current['fl'] > 45000) {
        lastAlertRef.current['fl'] = now;
        playInstitutionalChime('gamma_flip');
        setActiveLevelAlert(`⚡ GAMMA FLIP TRANSITION: ${optTicker} near volatility regime trigger at $${Number(fl).toFixed(2)}`);
        setTimeout(() => setActiveLevelAlert(null), 9000);
      }
    }
  }, [spot, g, optTicker, audioAlertsEnabled]);

  const filteredBreakouts = useMemo(() => {
    return breakouts.filter(item => {
      const matchesSearch = !scannerSearch || item.ticker.toLowerCase().includes(scannerSearch.toLowerCase());
      if (!matchesSearch) return false;
      if (scannerFilter === 'ALL') return true;
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
  const regimeTone = regime?.regime === 'RISK-ON' ? 'text-neon-green border-neon-green/40 bg-neon-green/10'
    : regime?.regime === 'STRESS' ? 'text-neon-red border-neon-red/40 bg-neon-red/10'
    : 'text-neon-gold border-neon-gold/40 bg-neon-gold/10';

  return (
    <CardHelpProvider>
      <div className="min-h-screen w-full p-4 flex flex-col gap-3 font-sans">

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
                <span className="font-bold text-[11px]">{p ? Number(p).toFixed(2) : '--'}</span>
                <span className={`text-[10px] ${c >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                  {c > 0 ? '+' : ''}{Number(c).toFixed(2)}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ================= Header ================= */}
      <header className="glass-panel py-3 px-6 flex flex-wrap gap-4 justify-between items-center">
        <div className="flex items-center gap-3">
          <Activity className="text-neon-green animate-pulse" size={24} />
          <h1 className="text-xl font-bold tracking-wider">
            B.I.A.S. <span className="text-slate-500 font-normal">Terminal v2</span>
          </h1>
          {regime && (
            <span className={`text-[10px] font-bold tracking-widest px-2 py-1 rounded border ${regimeTone}`}>
              {regime.regime} · VIX {fmt(regime.vix)}
            </span>
          )}
          {alpaca?.connected && (
            <span className="text-[10px] font-mono px-2 py-1 rounded border border-neon-green/30 bg-neon-green/10 text-neon-green flex items-center gap-1.5 shadow-[0_0_8px_rgba(0,255,163,0.2)]">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse"></span>
              ALPACA LIVE #{alpaca.account_number}
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

          {/* Institutional Macro Catalyst Calendar Modal */}
          <MacroCalendarModal />

          {/* Quick jump to Strategy Lab */}
          <a
            href="#strategy-lab"
            className="text-[10px] font-mono px-2 py-1 rounded border border-white/10 bg-white/5 text-slate-300 hover:text-white hover:border-neon-green/40 flex items-center gap-1.5 transition-all"
            title="Jump to Quantitative Strategy Lab"
          >
            <BarChart3 size={12} className="text-neon-green" />
            <span>STRATEGY LAB</span>
          </a>
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
      </header>

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
        <div className="flex gap-1 flex-wrap">
          {(assetClass === 'FOREX' ? FOREX_QUICK : assetClass === 'CRYPTO' ? CRYPTO_QUICK : STOCKS_QUICK).map((t) => {
            const it = tape[t];
            const f = flash[t];
            const fBorder = f === 'up' ? 'border-neon-green text-neon-green shadow-[0_0_8px_#00ffa3]' : f === 'down' ? 'border-neon-red text-neon-red shadow-[0_0_8px_#ff2a6d]' : '';
            const p = it?.price;
            const priceStr = p !== undefined ? (p < 5 ? `$${Number(p).toFixed(3)}` : `$${Number(p).toFixed(1)}`) : '';
            return (
              <button key={t} onClick={() => selectTicker(t)}
                className={`text-[11px] font-mono px-2 py-1 rounded border transition-all duration-300 ${fBorder || (optTicker === t ? (assetClass === 'FOREX' ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10' : assetClass === 'CRYPTO' ? 'border-amber-400 text-amber-300 bg-amber-500/10' : 'border-neon-green text-neon-green bg-neon-green/10') : 'border-white/10 text-slate-400 hover:border-white/30 hover:text-white')}`}>
                {t} {priceStr}
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
          <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
            24/7 SPOT & PERP
          </span>
        )}
        {assetClass === 'FOREX' && (
          <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            24/5 INTERBANK FX
          </span>
        )}
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
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Breakout scanner */}
        <div className={`glass-panel p-4 flex flex-col min-h-[540px] max-h-[540px] transition-all duration-300 ${
          isExpandedCanvas ? 'xl:col-span-4 order-2' : 'xl:col-span-3 order-1'
        }`}>
          <PanelTitle 
            icon={<Target size={14} className="text-neon-green" />} 
            helpKey="breakout"
            right={
              <span className="text-[10px] font-mono text-neon-green font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse shadow-[0_0_8px_#00ffa3]" />
                {breakouts.length} LIQUID
              </span>
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
            <div className="flex gap-1 overflow-x-auto pb-0.5 text-[9px] font-mono">
              {[
                { id: 'ALL', label: 'ALL' },
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
                      ? 'border-neon-green bg-neon-green/15 text-neon-green font-bold shadow-[0_0_6px_rgba(0,255,163,0.2)]'
                      : 'border-white/5 text-slate-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between text-[10px] text-slate-500 px-1 mb-1.5 border-b border-white/5 pb-1">
            <span>TICKER / PRICE</span>
            <span>REL VOL / FLOW SIGNAL</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1.5">
            {loading ? (
              <div className="text-center text-slate-500 italic mt-10">Scanning 50+ liquid options leaders...</div>
            ) : filteredBreakouts.length === 0 ? (
              <div className="text-center text-slate-500 italic mt-10">No tickers match filter</div>
            ) : filteredBreakouts.map((item, i) => (
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
                    {item.category && item.category !== 'LIQUID' && (
                      <span className="text-[8px] px-1 py-0.2 rounded bg-white/10 text-slate-300 border border-white/10">
                        {item.category}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400">Vol: {item.volatility}</div>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-[10px] font-mono text-slate-300">{item.volume_multiplier}</span>
                  <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                    item.signal.includes('CALL') ? 'bg-neon-green/20 text-neon-green border-neon-green/50'
                    : item.signal.includes('PUT') ? 'bg-neon-red/20 text-neon-red border-neon-red/50'
                    : item.signal === 'INDEX' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                    : 'bg-slate-500/20 text-slate-400 border-slate-500/50'}`}>
                    {item.signal}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Center: Multi-Chart Grid (Single, Dual Split, Quad Matrix) */}
        <div className={`glass-panel p-4 flex flex-col min-h-[540px] transition-all duration-300 ${
          isExpandedCanvas ? 'xl:col-span-12 order-1 shadow-[0_0_25px_rgba(0,255,163,0.1)]' : 'xl:col-span-6 order-2'
        }`}>
          <div className="flex-1 flex flex-col">
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

        {/* Right Panel: Smart Algo Board (Default) / Playbook / Macro Regime */}
        <div className={`flex flex-col gap-4 transition-all duration-300 ${
          isExpandedCanvas ? 'xl:col-span-8 order-3' : 'xl:col-span-3 order-3'
        }`}>
          <div className="glass-panel p-4 flex-1 flex flex-col min-h-[480px]">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/5">
              <div className="flex bg-black/60 p-0.5 rounded-lg border border-white/10 gap-0.5">
                <button
                  onClick={() => setActiveSideTab('algo')}
                  className={`px-2 py-1 text-[10px] font-mono rounded font-bold transition-all flex items-center gap-1 ${
                    activeSideTab === 'algo'
                      ? 'bg-neon-gold/20 text-neon-gold border border-neon-gold/40 shadow-[0_0_8px_rgba(255,215,0,0.2)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <BrainCircuit size={11} /> AI Quant Board
                </button>
                <button
                  onClick={() => setActiveSideTab('playbook')}
                  className={`px-2 py-1 text-[10px] font-mono rounded font-bold transition-all flex items-center gap-1 ${
                    activeSideTab === 'playbook'
                      ? 'bg-neon-green/20 text-neon-green border border-neon-green/40 shadow-[0_0_8px_rgba(0,255,163,0.2)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Zap size={11} /> Playbook
                </button>
                <button
                  onClick={() => setActiveSideTab('regime')}
                  className={`px-2 py-1 text-[10px] font-mono rounded font-bold transition-all flex items-center gap-1 ${
                    activeSideTab === 'regime'
                      ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_8px_rgba(56,189,248,0.2)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Gauge size={11} /> Regime
                </button>
              </div>

              <button
                onClick={() => fetchSmartAlgo(optTicker)}
                title="Refresh Quantitative Intelligence"
                className="text-slate-500 hover:text-neon-gold p-1 transition-colors"
              >
                <RefreshCw size={12} className={smartAlgoLoading ? 'animate-spin text-neon-gold' : ''} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-0.5">
              {activeSideTab === 'algo' && (
                <ErrorBoundary fallbackTitle="Quant Algo Intelligence Render Error">
                  <SmartAlgoBoard data={smartAlgo} loading={smartAlgoLoading} />
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
      <EarlyGemRadar />

      {/* ================= Alpaca Live Positions & Portfolio Drawer ================= */}
      <PositionsDrawer alpacaAccount={alpaca} onSelectTicker={selectTicker} />

      <footer className="text-center text-[10px] text-slate-600 font-mono pb-2">
        Personal use · Options data via Yahoo Finance (delayed) · Screener via TradingView · Alpaca Real-Time SIP · Not financial advice
      </footer>
    </div>
  </CardHelpProvider>
  );
}

export default App;
