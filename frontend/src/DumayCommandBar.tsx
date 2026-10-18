import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, Zap, TrendingUp, BarChart3, Flame, 
  Globe2, Maximize2, Minimize2, Calendar, Radio, Volume2, 
  VolumeX, ShieldAlert, Sparkles, CornerDownLeft, X, Layers,
  Activity, ArrowRight, Wallet, Landmark, HelpCircle, BookOpen
} from 'lucide-react';

export interface CommandItem {
  id: string;
  category: 'TICKER' | 'DESK' | 'CHART' | 'MACRO' | 'ORDER' | 'SYSTEM';
  title: string;
  mnemonic: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
}

interface DumayCommandBarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onSelectTicker: (ticker: string) => void;
  onSetAssetClass: (cls: 'EQUITIES' | 'CRYPTO' | 'FOREX') => void;
  onSetActiveSideTab: (tab: 'algo' | 'reversal' | 'news' | 'playbook' | 'regime') => void;
  onToggleMacroCalendar?: () => void;
  onToggleMacroRates?: () => void;
  onToggleCanvasExpand?: () => void;
  isExpandedCanvas?: boolean;
  audioAlertsEnabled?: boolean;
  onToggleAudioAlerts?: () => void;
  voiceAlertsEnabled?: boolean;
  onToggleVoiceAlerts?: () => void;
  onTriggerScan?: () => void;
  onOpenDex?: () => void;
  onOpenTelegram?: () => void;
  onOpenRiskSimulator?: () => void;
  onOpenPerformance?: () => void;
  currentTicker: string;
  currentAssetClass: string;
  tape?: Record<string, any>;
}

export function DumayCommandBar({
  isOpen,
  setIsOpen,
  onSelectTicker,
  onSetAssetClass,
  onSetActiveSideTab,
  onToggleMacroCalendar,
  onToggleMacroRates,
  onToggleCanvasExpand,
  isExpandedCanvas = false,
  audioAlertsEnabled = true,
  onToggleAudioAlerts,
  voiceAlertsEnabled = false,
  onToggleVoiceAlerts,
  onTriggerScan,
  onOpenDex,
  onOpenTelegram,
  onOpenRiskSimulator,
  onOpenPerformance,
  currentTicker,
  currentAssetClass,
  tape = {}
}: DumayCommandBarProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Global Keyboard Shortcuts (Ctrl+K, Cmd+K, Ctrl+Space, Alt+K, /, F1)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isK = e.key?.toLowerCase() === 'k' || e.code === 'KeyK';
      const isSpace = e.key === ' ' || e.code === 'Space';

      // Toggle with Ctrl+K, Cmd+K, Ctrl+Space, Alt+K, or F1
      if (((e.ctrlKey || e.metaKey) && isK) || (e.ctrlKey && isSpace) || (e.altKey && isK) || e.key === 'F1') {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(!isOpen);
        return;
      }

      // Quick slash key when not inside an input field
      if (e.key === '/' && !isOpen) {
        const activeEl = document.activeElement;
        const isInputField = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA' || activeEl?.tagName === 'SELECT';
        if (!isInputField) {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(true);
        }
      }

      // ESC to close
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, setIsOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
      setShowGuide(false);
    }
  }, [isOpen]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedItem = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Master List of Institutional Commands
  const baseCommands = useMemo<CommandItem[]>(() => {
    return [
      // Major Tickers
      {
        id: 'ticker-spy',
        category: 'TICKER',
        title: 'SPY · S&P 500 ETF Trust',
        mnemonic: 'SPY <EQUITY>',
        description: 'Load SPY 0DTE GEX, Dealer Gamma Walls, Options Flow & Charts',
        icon: <TrendingUp size={15} className="text-neon-green" />,
        action: () => { onSetAssetClass('EQUITIES'); onSelectTicker('SPY'); }
      },
      {
        id: 'ticker-qqq',
        category: 'TICKER',
        title: 'QQQ · Invesco QQQ Trust (Nasdaq-100)',
        mnemonic: 'QQQ <EQUITY>',
        description: 'Tech Mega-Cap leader: Gamma flip, Put wall, Dark pool blocks',
        icon: <TrendingUp size={15} className="text-neon-green" />,
        action: () => { onSetAssetClass('EQUITIES'); onSelectTicker('QQQ'); }
      },
      {
        id: 'ticker-nvda',
        category: 'TICKER',
        title: 'NVDA · NVIDIA Corporation',
        mnemonic: 'NVDA <EQUITY>',
        description: 'AI & Semiconductor titan: GEX profile, intraday volatility skew',
        icon: <Sparkles size={15} className="text-neon-green" />,
        action: () => { onSetAssetClass('EQUITIES'); onSelectTicker('NVDA'); }
      },
      {
        id: 'ticker-tsla',
        category: 'TICKER',
        title: 'TSLA · Tesla Inc.',
        mnemonic: 'TSLA <EQUITY>',
        description: 'High-beta momentum: Gamma squeeze triggers & dealer skew',
        icon: <TrendingUp size={15} className="text-neon-green" />,
        action: () => { onSetAssetClass('EQUITIES'); onSelectTicker('TSLA'); }
      },
      {
        id: 'ticker-aapl',
        category: 'TICKER',
        title: 'AAPL · Apple Inc.',
        mnemonic: 'AAPL <EQUITY>',
        description: 'Mega-cap equity cornerstone: Institutional wall tests',
        icon: <TrendingUp size={15} className="text-neon-green" />,
        action: () => { onSetAssetClass('EQUITIES'); onSelectTicker('AAPL'); }
      },
      {
        id: 'ticker-btc',
        category: 'TICKER',
        title: 'BTC · Bitcoin 24/7 Spot & Perpetuals',
        mnemonic: 'BTC <CRYPTO>',
        description: 'Crypto digital reserve: Real-time 24/7 tape & institutional levels',
        icon: <Flame size={15} className="text-amber-400" />,
        action: () => { onSetAssetClass('CRYPTO'); onSelectTicker('BTC'); }
      },
      {
        id: 'ticker-eth',
        category: 'TICKER',
        title: 'ETH · Ethereum 24/7 Spot & Perpetuals',
        mnemonic: 'ETH <CRYPTO>',
        description: 'Smart contract layer-1: Volatility & liquid flow',
        icon: <Flame size={15} className="text-amber-400" />,
        action: () => { onSetAssetClass('CRYPTO'); onSelectTicker('ETH'); }
      },
      {
        id: 'ticker-sol',
        category: 'TICKER',
        title: 'SOL · Solana 24/7 Spot & Perpetuals',
        mnemonic: 'SOL <CRYPTO>',
        description: 'High throughput ecosystem: DEX velocity & momentum tape',
        icon: <Flame size={15} className="text-amber-400" />,
        action: () => { onSetAssetClass('CRYPTO'); onSelectTicker('SOL'); }
      },
      {
        id: 'ticker-eurusd',
        category: 'TICKER',
        title: 'EUR/USD · Euro / US Dollar Interbank',
        mnemonic: 'EURUSD <FX>',
        description: 'Premier global FX pair: 24/5 ADR range & quarter points',
        icon: <Globe2 size={15} className="text-cyan-400" />,
        action: () => { onSetAssetClass('FOREX'); onSelectTicker('EUR/USD'); }
      },
      {
        id: 'ticker-gbpusd',
        category: 'TICKER',
        title: 'GBP/USD · British Pound / US Dollar',
        mnemonic: 'GBPUSD <FX>',
        description: 'Cable session volatility: London/NY overlap setups',
        icon: <Globe2 size={15} className="text-cyan-400" />,
        action: () => { onSetAssetClass('FOREX'); onSelectTicker('GBP/USD'); }
      },
      // Desks & Suites
      {
        id: 'desk-forex',
        category: 'DESK',
        title: 'Forex Interbank Intelligence Desk',
        mnemonic: 'FXIP <GO>',
        description: 'Currency Strength Matrix, 24/5 Global Session Clocks, ADR, Interbank Brackets',
        icon: <Globe2 size={15} className="text-cyan-400" />,
        action: () => { 
          onSetAssetClass('FOREX');
          onSelectTicker('EUR/USD');
        }
      },
      {
        id: 'desk-crypto-gems',
        category: 'DESK',
        title: 'Crypto Narrative & Early Gem Radar',
        mnemonic: 'GEMS <GO>',
        description: 'Live DEX pools, Narrative Sector Dominance, Lifecycle Stages & Alpha Playbook',
        icon: <Flame size={15} className="text-amber-400" />,
        action: () => {
          onSetAssetClass('CRYPTO');
          const el = document.getElementById('narrative-radar');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }
      },
      {
        id: 'desk-strategy-lab',
        category: 'DESK',
        title: 'Quantitative Strategy Backtest Lab',
        mnemonic: 'LAB <GO>',
        description: 'Historical equity curves, Sharpe ratios, Max Drawdown & Overfitting tests',
        icon: <BarChart3 size={15} className="text-neon-green" />,
        action: () => {
          const el = document.getElementById('strategy-lab');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }
      },
      {
        id: 'desk-copilot',
        category: 'DESK',
        title: 'AI Quant Autonomous Co-Pilot',
        mnemonic: 'AICO <GO>',
        description: 'Recursive Bayesian gradient descent SGD engine with multi-regime partition',
        icon: <Zap size={15} className="text-neon-green" />,
        action: () => {
          onSetActiveSideTab('algo');
          const el = document.getElementById('algo-copilot-card');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }
      },
      {
        id: 'desk-news-wire',
        category: 'DESK',
        title: 'Institutional News Wire & Contagion Engine',
        mnemonic: 'WIRE <GO>',
        description: 'Real-time financial headlines, impact scoring & domino contagion analysis',
        icon: <Radio size={15} className="text-emerald-400" />,
        action: () => {
          onSetActiveSideTab('news');
        }
      },
      {
        id: 'desk-wall-reversal',
        category: 'DESK',
        title: 'Wall Reversal & Gamma Bounce Radar',
        mnemonic: 'REVR <GO>',
        description: 'Detects tickers testing major Call/Put Walls with extreme mean-reversion setups',
        icon: <Activity size={15} className="text-neon-gold" />,
        action: () => {
          onSetActiveSideTab('reversal');
        }
      },
      {
        id: 'desk-regime-playbook',
        category: 'DESK',
        title: 'Market Regime & Institutional Playbook',
        mnemonic: 'PLAY <GO>',
        description: 'VIX regime matrix, options bias, and tactical multi-factor trade execution plans',
        icon: <Layers size={15} className="text-neon-green" />,
        action: () => {
          onSetActiveSideTab('playbook');
        }
      },
      {
        id: 'desk-solana-dex',
        category: 'DESK',
        title: '🪐 Solana DEX Sniper & Jupiter New Listing Engine',
        mnemonic: 'DEX <GO>',
        description: 'Live Raydium / Meteora / Pump listings, anti-rug safety score, and Jupiter 1-click swaps',
        icon: <Zap size={15} className="text-cyan-400" />,
        action: () => {
          if (onOpenDex) onOpenDex();
        }
      },
      {
        id: 'desk-telegram-alerts',
        category: 'DESK',
        title: '📱 Telegram Real-Time Push Alerts Desk',
        mnemonic: 'TELE <GO>',
        description: 'Instant mobile alerts for 24/7 autonomous entries, stop-loss triggers & DEX snipes',
        icon: <Radio size={15} className="text-sky-400" />,
        action: () => {
          if (onOpenTelegram) onOpenTelegram();
        }
      },
      {
        id: 'desk-risk-simulator',
        category: 'DESK',
        title: '📈 Options Risk Payoff Simulator (thinkorswim-style)',
        mnemonic: 'SIM <GO>',
        description: 'Interactive options expiration & T+0 P&L payoff curves, multi-strike risk profiles',
        icon: <Activity size={15} className="text-purple-400" />,
        action: () => {
          if (onOpenRiskSimulator) onOpenRiskSimulator();
        }
      },
      {
        id: 'desk-performance-journal',
        category: 'DESK',
        title: '🏆 Quantitative Desk Performance & Automated Journal',
        mnemonic: 'PERF <GO>',
        description: 'Real-time win rate %, profit factor, equity curve and automated trade execution logs',
        icon: <BarChart3 size={15} className="text-amber-400" />,
        action: () => {
          if (onOpenPerformance) onOpenPerformance();
        }
      },
      // Macro & Rates
      {
        id: 'macro-calendar',
        category: 'MACRO',
        title: 'Institutional Macroeconomic Calendar',
        mnemonic: 'WECO <GO>',
        description: 'High-impact risk catalysts: FOMC Decisions, CPI, PPI, NFP & OpEx Schedule',
        icon: <Calendar size={15} className="text-amber-400" />,
        action: () => {
          if (onToggleMacroCalendar) onToggleMacroCalendar();
          else {
            const btn = document.querySelector('button[title*="Macro Catalyst Calendar"]') as HTMLButtonElement;
            if (btn) btn.click();
          }
        }
      },
      {
        id: 'macro-yield-curve',
        category: 'MACRO',
        title: 'US Treasury Yield Curve & Inversion Radar',
        mnemonic: 'YCRV <GO>',
        description: 'Benchmark Term Structure (3M → 30Y), 10Y-2Y Inversion Spread & Recession Barometer',
        icon: <Landmark size={15} className="text-cyan-400" />,
        action: () => {
          if (onToggleMacroRates) onToggleMacroRates();
          else {
            const btn = document.querySelector('button[title*="US Treasury Yield Curve"]') as HTMLButtonElement;
            if (btn) btn.click();
          }
        }
      },
      {
        id: 'macro-fed-policy',
        category: 'MACRO',
        title: 'FOMC Fed Funds Rate Cut & Hike Probabilities',
        mnemonic: 'FED <GO>',
        description: 'CME FedWatch probability matrix for upcoming FOMC policy rate decision',
        icon: <Landmark size={15} className="text-neon-gold" />,
        action: () => {
          if (onToggleMacroRates) onToggleMacroRates();
          else {
            const btn = document.querySelector('button[title*="US Treasury Yield Curve"]') as HTMLButtonElement;
            if (btn) btn.click();
          }
        }
      },
      // Chart Layouts
      {
        id: 'chart-single',
        category: 'CHART',
        title: 'Chart Layout: 1-Pane Single Focus',
        mnemonic: '1P <GO>',
        description: 'Focus terminal chart canvas entirely on the active primary ticker',
        icon: <Maximize2 size={15} className="text-white" />,
        action: () => {
          const btn = document.querySelector('button[title*="Single Chart View"]') as HTMLButtonElement;
          if (btn) btn.click();
        }
      },
      {
        id: 'chart-dual',
        category: 'CHART',
        title: 'Chart Layout: 2-Pane Dual Split',
        mnemonic: '2P <GO>',
        description: 'Side-by-side comparative split charts for lead/lag momentum analysis',
        icon: <Layers size={15} className="text-white" />,
        action: () => {
          const btn = document.querySelector('button[title*="Dual Split View"]') as HTMLButtonElement;
          if (btn) btn.click();
        }
      },
      {
        id: 'chart-quad',
        category: 'CHART',
        title: 'Chart Layout: 4-Pane Quad Matrix',
        mnemonic: '4P <GO>',
        description: '2x2 surveillance grid tracking 4 liquid market leaders concurrently',
        icon: <Layers size={15} className="text-neon-green" />,
        action: () => {
          const btn = document.querySelector('button[title*="Quad Matrix"]') as HTMLButtonElement;
          if (btn) btn.click();
        }
      },
      {
        id: 'chart-canvas-toggle',
        category: 'CHART',
        title: isExpandedCanvas ? 'Terminal Layout: Standard 3-Panel Matrix' : 'Terminal Layout: Full Screen Chart Canvas',
        mnemonic: 'CANV <GO>',
        description: isExpandedCanvas ? 'Restore standard scanner and side intelligence panels' : 'Maximize chart workspace across full viewport width',
        icon: isExpandedCanvas ? <Minimize2 size={15} className="text-neon-gold" /> : <Maximize2 size={15} className="text-neon-gold" />,
        action: () => {
          if (onToggleCanvasExpand) onToggleCanvasExpand();
        }
      },
      // System & Orders
      {
        id: 'system-positions',
        category: 'ORDER',
        title: 'Portfolio & Open Positions Drawer',
        mnemonic: 'PORT <GO>',
        description: 'Alpaca Live & Offline Paper simulated portfolio with 1-click execution & P&L',
        icon: <Wallet size={15} className="text-neon-green" />,
        action: () => {
          const btn = document.querySelector('button:has(svg.lucide-wallet)') as HTMLButtonElement;
          if (btn) btn.click();
        }
      },
      {
        id: 'system-flatten',
        category: 'ORDER',
        title: '🚨 Emergency Panic Flatten All Positions',
        mnemonic: 'FLAT <GO>',
        description: 'Instantly stage emergency market orders to liquidate and flatten all active risk',
        icon: <ShieldAlert size={15} className="text-neon-red" />,
        action: () => {
          const btn = document.querySelector('button[title*="Liquidate and flatten"]') as HTMLButtonElement;
          if (btn) {
            btn.scrollIntoView({ behavior: 'smooth' });
            btn.click();
          }
        }
      },
      {
        id: 'system-rescan',
        category: 'SYSTEM',
        title: 'Rescan Market Breakouts & RVOL Surges',
        mnemonic: 'SCAN <GO>',
        description: 'Force real-time institutional scanner poll across 50+ liquid options leaders',
        icon: <Search size={15} className="text-neon-green" />,
        action: () => {
          if (onTriggerScan) onTriggerScan();
          else {
            const btn = document.getElementById('rescan-btn') as HTMLButtonElement;
            if (btn) btn.click();
          }
        }
      },
      {
        id: 'system-audio-toggle',
        category: 'SYSTEM',
        title: `Proximity Audio Chimes: ${audioAlertsEnabled ? 'Turn OFF' : 'Turn ON'}`,
        mnemonic: 'CHIM <GO>',
        description: 'Audio chimes when spot price breaches Call Wall, Put Wall, or Gamma Flip',
        icon: audioAlertsEnabled ? <VolumeX size={15} className="text-slate-400" /> : <Volume2 size={15} className="text-neon-green" />,
        action: () => {
          if (onToggleAudioAlerts) onToggleAudioAlerts();
        }
      },
      {
        id: 'system-voice-toggle',
        category: 'SYSTEM',
        title: `AI Voice Desk: ${voiceAlertsEnabled ? 'Turn OFF' : 'Turn ON'}`,
        mnemonic: 'VOIC <GO>',
        description: 'Speech synthesis announcements for institutional level tests & algo signals',
        icon: <Radio size={15} className={voiceAlertsEnabled ? 'text-cyan-400' : 'text-slate-400'} />,
        action: () => {
          if (onToggleVoiceAlerts) onToggleVoiceAlerts();
        }
      }
    ];
  }, [
    onSetAssetClass, onSelectTicker, onSetActiveSideTab, onToggleMacroCalendar,
    onToggleCanvasExpand, isExpandedCanvas, audioAlertsEnabled, onToggleAudioAlerts,
    voiceAlertsEnabled, onToggleVoiceAlerts, onTriggerScan
  ]);

  // Filter commands based on user query
  const filteredCommands = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return baseCommands;

    const matching = baseCommands.filter(c => 
      c.title.toUpperCase().includes(q) ||
      c.mnemonic.toUpperCase().includes(q) ||
      c.description.toUpperCase().includes(q) ||
      c.category.toUpperCase().includes(q)
    );

    const isStandardTicker = baseCommands.some(c => c.mnemonic.startsWith(q));
    const isCleanSymbol = /^[A-Z0-9.\-_/]{1,10}$/.test(q) && !q.includes('<GO>');

    if (!isStandardTicker && isCleanSymbol) {
      const isForex = q.includes('/') || ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD'].includes(q);
      const isCrypto = ['BTC', 'ETH', 'SOL', 'DOGE', 'XRP', 'ADA', 'AVAX', 'LINK', 'PEPE', 'SHIB'].includes(q);
      
      const customTickerItem: CommandItem = {
        id: `custom-ticker-${q}`,
        category: 'TICKER',
        title: `Load Symbol: ${q}`,
        mnemonic: `${q} <GO>`,
        description: `Instant terminal sync: Load ${q} charts, GEX levels, options chain, and algo confluence`,
        icon: <Zap size={15} className="text-neon-gold animate-pulse" />,
        action: () => {
          if (isForex) onSetAssetClass('FOREX');
          else if (isCrypto) onSetAssetClass('CRYPTO');
          else onSetAssetClass('EQUITIES');
          onSelectTicker(q);
        }
      };
      return [customTickerItem, ...matching];
    }

    return matching;
  }, [query, baseCommands, onSetAssetClass, onSelectTicker]);

  // Execute command
  const executeCommand = (cmd: CommandItem) => {
    cmd.action();
    setIsOpen(false);
  };

  // Keyboard navigation inside list
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands.length > 0 && selectedIndex < filteredCommands.length) {
        executeCommand(filteredCommands[selectedIndex]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-150 cursor-pointer"
      onClick={() => setIsOpen(false)}
    >
      <div 
        className="w-full max-w-2xl bg-[#070b14] border border-neon-gold/50 rounded-2xl shadow-[0_0_50px_rgba(255,215,0,0.25)] flex flex-col overflow-hidden text-xs font-mono border-t-2 border-t-neon-gold animate-in zoom-in-95 duration-150 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Branding Strip */}
        <div className="px-4 py-2.5 bg-gradient-to-r from-black via-slate-950 to-amber-950/40 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded bg-neon-gold/20 border border-neon-gold/50 flex items-center justify-center text-neon-gold font-bold text-[10px] shadow-[0_0_8px_rgba(255,215,0,0.3)]">
              D
            </div>
            <span className="font-bold text-white tracking-widest text-[11px] flex items-center gap-2">
              DUMAY COMMAND BAR
              <span className="px-1.5 py-0.2 rounded bg-neon-gold/20 text-neon-gold border border-neon-gold/40 text-[9px] font-bold">
                [ &lt;GO&gt; ]
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <span className="hidden sm:inline">Active: <strong className="text-white">{currentTicker}</strong> ({currentAssetClass})</span>
            <button 
              onClick={() => setShowGuide(prev => !prev)}
              className={`px-2 py-0.5 rounded flex items-center gap-1 font-bold text-[10px] transition-all cursor-pointer ${
                showGuide || query.trim() === '?' || query.trim().toUpperCase() === 'HELP'
                  ? 'bg-neon-gold text-black shadow-[0_0_10px_rgba(255,215,0,0.4)]'
                  : 'bg-white/10 hover:bg-neon-gold/20 text-neon-gold border border-neon-gold/30'
              }`}
              title="Full Instructions & Cheat Sheet (?)"
            >
              <HelpCircle size={12} />
              <span>(?) HELP GUIDE</span>
            </button>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Omnibar Input Field */}
        <div className="relative flex items-center px-4 py-3 bg-black/60 border-b border-white/10">
          <Search size={16} className="text-neon-gold mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Type ticker, desk or mnemonic (or '?' for full instructions)..."
            className="w-full bg-transparent text-sm sm:text-base text-white placeholder-slate-500 font-mono outline-none tracking-wide"
            autoComplete="off"
            spellCheck={false}
          />

          {/* Institutional <GO> Action Button */}
          <button
            onClick={() => {
              if (filteredCommands.length > 0 && selectedIndex < filteredCommands.length) {
                executeCommand(filteredCommands[selectedIndex]);
              }
            }}
            className="ml-2 px-3 py-1 rounded-md bg-neon-gold hover:bg-neon-gold/90 text-black font-extrabold text-[11px] flex items-center gap-1 transition-all shadow-[0_0_12px_rgba(255,215,0,0.4)] shrink-0 cursor-pointer"
            title="Execute Command (Enter)"
          >
            <span>&lt;GO&gt;</span>
            <CornerDownLeft size={11} />
          </button>
        </div>

        {/* Quick Mnemonic Chips Bar */}
        <div className="px-4 py-2 bg-black/40 border-b border-white/5 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[10px]">
          <span className="text-slate-500 uppercase font-bold shrink-0 mr-1">Mnemonics:</span>
          {[
            { label: '? HELP <GO>', cmd: 'HELP' },
            { label: 'SPY <GO>', cmd: 'SPY' },
            { label: 'QQQ <GO>', cmd: 'QQQ' },
            { label: 'NVDA <GO>', cmd: 'NVDA' },
            { label: 'BTC <GO>', cmd: 'BTC' },
            { label: 'FX <GO>', cmd: 'FOREX' },
            { label: 'GEMS <GO>', cmd: 'GEMS' },
            { label: 'YCRV <GO>', cmd: 'YCRV' },
            { label: 'FED <GO>', cmd: 'FED' },
            { label: 'LAB <GO>', cmd: 'LAB' },
            { label: 'QUAD <GO>', cmd: '4P' },
            { label: 'FLATTEN <GO>', cmd: 'FLAT' },
          ].map((chip) => (
            <button
              key={chip.label}
              onClick={() => {
                if (chip.cmd === 'HELP') {
                  setShowGuide(true);
                  setQuery('');
                } else {
                  setQuery(chip.cmd);
                  setShowGuide(false);
                  setSelectedIndex(0);
                  inputRef.current?.focus();
                }
              }}
              className="px-2 py-0.5 rounded bg-white/5 hover:bg-neon-gold/20 hover:text-neon-gold border border-white/10 hover:border-neon-gold/40 text-slate-300 font-bold transition-all shrink-0 cursor-pointer"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Main Content Area: Suggestions List OR Comprehensive Guide */}
        {(showGuide || query.trim() === '?' || query.trim().toUpperCase() === 'HELP') ? (
          <div className="max-h-80 overflow-y-auto p-4 flex flex-col gap-4 bg-black/60 divide-y divide-white/5 text-xs">
            {/* Guide Header Banner */}
            <div className="flex items-center justify-between pb-2">
              <div>
                <div className="flex items-center gap-2 text-neon-gold font-bold text-xs sm:text-sm">
                  <BookOpen size={15} />
                  <span>DUMAY COMMAND BAR — INSTITUTIONAL MANUAL</span>
                </div>
                <p className="text-slate-400 text-[10px] mt-0.5">
                  Universal Omnibar syntax: type any symbol or mnemonic, then press <strong className="text-white">&lt;GO&gt; (Enter)</strong>.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowGuide(false);
                  if (query.trim() === '?' || query.trim().toUpperCase() === 'HELP') setQuery('');
                }}
                className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-slate-300 font-bold text-[10px] cursor-pointer"
              >
                Back to Search
              </button>
            </div>

            {/* Section 1: Keyboard Controls */}
            <div className="pt-3">
              <span className="text-neon-gold font-bold text-[10px] uppercase tracking-wider block mb-2">
                ⌨️ Global Keyboard Hotkeys
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                <div className="p-1.5 rounded bg-white/[0.03] border border-white/5 flex items-center justify-between">
                  <span className="text-slate-400">Open Omnibar</span>
                  <span className="font-mono px-1.5 py-0.5 rounded bg-black text-neon-gold border border-white/10 font-bold">Ctrl + K / Cmd + K</span>
                </div>
                <div className="p-1.5 rounded bg-white/[0.03] border border-white/5 flex items-center justify-between">
                  <span className="text-slate-400">Quick Slash Key</span>
                  <span className="font-mono px-1.5 py-0.5 rounded bg-black text-neon-gold border border-white/10 font-bold">/</span>
                </div>
                <div className="p-1.5 rounded bg-white/[0.03] border border-white/5 flex items-center justify-between">
                  <span className="text-slate-400">Navigate Commands</span>
                  <span className="font-mono px-1.5 py-0.5 rounded bg-black text-white border border-white/10 font-bold">↑ / ↓ Arrows</span>
                </div>
                <div className="p-1.5 rounded bg-white/[0.03] border border-white/5 flex items-center justify-between">
                  <span className="text-slate-400">Execute &lt;GO&gt;</span>
                  <span className="font-mono px-1.5 py-0.5 rounded bg-neon-gold text-black font-extrabold">Enter ↵</span>
                </div>
                <div className="p-1.5 rounded bg-white/[0.03] border border-white/5 flex items-center justify-between">
                  <span className="text-slate-400">Dismiss Bar</span>
                  <span className="font-mono px-1.5 py-0.5 rounded bg-black text-slate-400 border border-white/10 font-bold">Esc</span>
                </div>
                <div className="p-1.5 rounded bg-white/[0.03] border border-white/5 flex items-center justify-between">
                  <span className="text-slate-400">Open Help Guide</span>
                  <span className="font-mono px-1.5 py-0.5 rounded bg-black text-neon-gold border border-white/10 font-bold">? or HELP</span>
                </div>
              </div>
            </div>

            {/* Section 2: Institutional Mnemonics Reference */}
            <div className="pt-3">
              <span className="text-neon-gold font-bold text-[10px] uppercase tracking-wider block mb-2">
                🏛️ Institutional Desk & Function Mnemonics (Click to Execute)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px]">
                {[
                  { mnem: 'FXIP', desc: 'Forex Interbank Matrix (28 pairs, ADR)', act: () => { onSetAssetClass('FOREX'); setIsOpen(false); } },
                  { mnem: 'GEMS', desc: 'Early Gem & Meme Radar (Pump.fun, DEX velocity)', act: () => { onSetAssetClass('CRYPTO'); setIsOpen(false); } },
                  { mnem: 'YCRV', desc: 'US Sovereign Yield Curve & Spread Monitor', act: () => { onToggleMacroRates?.(); setIsOpen(false); } },
                  { mnem: 'FED', desc: 'FOMC Rate Expectations & Curve Shift', act: () => { onToggleMacroRates?.(); setIsOpen(false); } },
                  { mnem: 'LAB', desc: 'Quantitative Strategy Backtest Lab', act: () => { onSetAssetClass('EQUITIES'); onSetActiveSideTab('algo'); setIsOpen(false); } },
                  { mnem: 'AICO', desc: 'AI Quant Smart Algo Board & Co-Pilot', act: () => { onSetActiveSideTab('algo'); setIsOpen(false); } },
                  { mnem: 'WIRE', desc: 'News Catalyst Wire & Macro Terminal', act: () => { onSetActiveSideTab('news'); setIsOpen(false); } },
                  { mnem: 'WECO', desc: 'World Economic Releases Calendar', act: () => { onToggleMacroCalendar?.(); setIsOpen(false); } },
                  { mnem: 'REVR', desc: 'Mean Reversion & Gamma Pinning Radar', act: () => { onSetActiveSideTab('reversal'); setIsOpen(false); } },
                  { mnem: 'PLAY', desc: 'Institutional Playbook & Setups', act: () => { onSetActiveSideTab('playbook'); setIsOpen(false); } },
                  { mnem: '4P', desc: 'Quad Multi-Chart Matrix (4 panels)', act: () => { setIsOpen(false); } },
                  { mnem: 'CANV', desc: 'Toggle Ultra-Wide Expanded Canvas', act: () => { onToggleCanvasExpand?.(); setIsOpen(false); } },
                  { mnem: 'FLAT', desc: 'Emergency Flatten Open Positions', act: () => { setIsOpen(false); } },
                  { mnem: 'CHIM', desc: 'Toggle Audio Chimes on Wall Tests', act: () => { onToggleAudioAlerts?.(); setIsOpen(false); } },
                  { mnem: 'VOIC', desc: 'Toggle Synthetic AI Audio Voice Desk', act: () => { onToggleVoiceAlerts?.(); setIsOpen(false); } },
                ].map((item) => (
                  <button
                    key={item.mnem}
                    onClick={item.act}
                    className="p-1.5 rounded bg-white/[0.02] hover:bg-neon-gold/15 border border-white/5 hover:border-neon-gold/40 flex items-center justify-between text-left transition-all group cursor-pointer"
                  >
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span className="font-mono text-neon-gold group-hover:underline">{item.mnem} &lt;GO&gt;</span>
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">{item.desc}</div>
                    </div>
                    <ArrowRight size={11} className="text-slate-600 group-hover:text-neon-gold shrink-0 ml-1.5" />
                  </button>
                ))}
              </div>
            </div>

            {/* Section 3: Universal Ticker Lookup */}
            <div className="pt-2 pb-1">
              <span className="text-neon-gold font-bold text-[10px] uppercase tracking-wider block mb-1">
                📈 Direct Asset Navigation
              </span>
              <p className="text-slate-400 text-[10px] leading-relaxed">
                Type any equity, ETF or crypto ticker directly (e.g. <strong className="text-white">NVDA</strong>, <strong className="text-white">SPY</strong>, <strong className="text-white">QQQ</strong>, <strong className="text-white">BTC</strong>, <strong className="text-white">ETH</strong>, <strong className="text-white">TSLA</strong>, <strong className="text-white">AMD</strong>), then press <strong className="text-neon-gold">&lt;GO&gt;</strong> to instantly reload chart, order flow, GEX gamma walls, and live tape.
              </p>
            </div>
          </div>
        ) : (
          /* Command Suggestions List */
          <div 
            ref={listRef}
            className="max-h-80 overflow-y-auto p-2 divide-y divide-white/[0.03] flex flex-col"
          >
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-slate-500 italic">
              No matching commands or tickers found for &quot;{query}&quot;. Press &lt;GO&gt; to search anyway.
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              const livePrice = tape[cmd.title.split(' · ')[0]]?.price;

              return (
                <div
                  key={cmd.id}
                  onClick={() => executeCommand(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-3 py-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-neon-gold/15 border border-neon-gold/50 shadow-[0_0_12px_rgba(255,215,0,0.15)] text-white' 
                      : 'hover:bg-white/[0.04] text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-neon-gold/20 text-neon-gold' : 'bg-white/5 text-slate-400'
                    }`}>
                      {cmd.icon}
                    </div>

                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{cmd.title}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                          cmd.category === 'TICKER' ? 'bg-neon-green/20 text-neon-green border border-neon-green/30' :
                          cmd.category === 'DESK' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                          cmd.category === 'MACRO' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          cmd.category === 'ORDER' ? 'bg-neon-red/20 text-neon-red border border-neon-red/30' :
                          'bg-white/10 text-slate-300'
                        }`}>
                          {cmd.category}
                        </span>
                        {livePrice && (
                          <span className="text-[10px] text-neon-green font-bold">
                            ${Number(livePrice).toFixed(2)}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {cmd.description}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 border border-white/10 text-neon-gold font-bold">
                      {cmd.mnemonic}
                    </span>
                    {isSelected && (
                      <ArrowRight size={12} className="text-neon-gold animate-pulse" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

        {/* Footer Help Bar */}
        <div className="px-4 py-2 bg-black/80 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-500">
          <div className="flex items-center gap-3">
            <span><strong className="text-slate-300">↑↓</strong> Navigate</span>
            <span><strong className="text-slate-300">↵ Enter</strong> Execute</span>
            <span><strong className="text-slate-300">Esc</strong> Dismiss</span>
          </div>

          <div className="flex items-center gap-1.5 text-neon-gold font-bold">
            <span>Dumay Terminal OS v2.4</span>
            <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse"></span>
          </div>
        </div>
      </div>
    </div>
  );
}
