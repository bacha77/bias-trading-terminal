import { useState, useEffect, useCallback } from 'react';
import { 
  Wallet, 
  AlertOctagon, 
  RefreshCw, 
  X, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck,
  Coins,
  Cpu,
  Power,
  Layers,
  Sparkles
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
  is_option?: boolean;
  is_crypto?: boolean;
  is_forex?: boolean;
  category?: 'CRYPTO' | 'OPTION' | 'EQUITY' | 'FOREX';
  asset_class?: string;
  multiplier?: number;
  underlying?: string;
  strike?: number;
  expiry?: string;
  option_type?: string;
}

interface PositionsData {
  connected: boolean;
  positions: Position[];
  total_unrealized_pl: number;
  total_market_value: number;
  count: number;
  crypto_count?: number;
  crypto_market_value?: number;
  crypto_unrealized_pl?: number;
  options_count?: number;
  options_market_value?: number;
  options_unrealized_pl?: number;
  equity_count?: number;
  equity_market_value?: number;
  equity_unrealized_pl?: number;
  copilot_armed?: boolean;
  crypto_armed?: boolean;
}

interface PositionsDrawerProps {
  alpacaAccount: any;
  onSelectTicker?: (ticker: string) => void;
}

export function PositionsDrawer({ alpacaAccount, onSelectTicker }: PositionsDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeAccountMode, setActiveAccountMode] = useState<'paper' | 'live'>('live');
  const [paperAccount, setPaperAccount] = useState<any>(null);
  const [data, setData] = useState<PositionsData>({
    connected: false,
    positions: [],
    total_unrealized_pl: 0,
    total_market_value: 0,
    count: 0,
  });
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  
  // Confirmation modals
  const [flattenAllConfirm, setFlattenAllConfirm] = useState(false);
  const [flattenCryptoConfirm, setFlattenCryptoConfirm] = useState(false);
  const [flattenOptionsConfirm, setFlattenOptionsConfirm] = useState(false);

  // Asset class filter tab: 'STOCKS_OPTIONS' (Default) | 'CRYPTO' | 'ALL'
  const [assetFilter, setAssetFilter] = useState<'ALL' | 'STOCKS_OPTIONS' | 'CRYPTO'>('STOCKS_OPTIONS');

  // Autonomous bot state
  const [copilotArmed, setCopilotArmed] = useState<boolean>(true);
  const [cryptoArmed, setCryptoArmed] = useState<boolean>(true);
  const [togglingBot, setTogglingBot] = useState<boolean>(false);

  const [liveAlpacaAccount, setLiveAlpacaAccount] = useState<any>(alpacaAccount);

  const fetchPositions = useCallback(async () => {
    try {
      setLoading(true);
      const isPaper = activeAccountMode === 'paper';
      const posEndpoint = isPaper ? `${API_BASE}/api/paper/positions` : `${API_BASE}/api/alpaca/positions`;
      const res = await fetch(posEndpoint);
      const json = await res.json();
      if (json && json.connected !== undefined) {
        setData(json);
        if (json.copilot_armed !== undefined) setCopilotArmed(json.copilot_armed);
        if (json.crypto_armed !== undefined) setCryptoArmed(json.crypto_armed);
      }

      // Fetch copilot status as well for armed states
      try {
        const copRes = await fetch(`${API_BASE}/api/copilot/status`);
        const copJson = await copRes.json();
        if (copJson) {
          if (copJson.armed !== undefined) setCopilotArmed(copJson.armed);
          if (copJson.crypto_armed !== undefined) setCryptoArmed(copJson.crypto_armed);
        }
      } catch {
        // pass
      }

      if (isPaper) {
        const accRes = await fetch(`${API_BASE}/api/paper/account`);
        const accJson = await accRes.json();
        setPaperAccount(accJson);
      } else {
        const accRes = await fetch(`${API_BASE}/api/alpaca/account`);
        const accJson = await accRes.json();
        if (accJson && accJson.connected) {
          setLiveAlpacaAccount(accJson);
        }
      }
    } catch (err) {
      console.error('Error fetching positions:', err);
    } finally {
      setLoading(false);
    }
  }, [activeAccountMode]);

  useEffect(() => {
    fetchPositions();
    const iv = setInterval(fetchPositions, 10000);
    return () => clearInterval(iv);
  }, [fetchPositions]);

  // Toggle US Stock Options Co-Pilot
  const handleToggleOptionsCopilot = async () => {
    try {
      setTogglingBot(true);
      const next = !copilotArmed;
      setCopilotArmed(next);
      setActionMsg(next ? '⚡ Stock Options Co-Pilot Armed' : '⏸ Stock Options Co-Pilot Paused');
      await fetch(`${API_BASE}/api/copilot/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ armed: next })
      });
      fetchPositions();
      setTimeout(() => setActionMsg(null), 4000);
    } catch (e: any) {
      setActionMsg(`⚠ Error: ${e.message}`);
    } finally {
      setTogglingBot(false);
    }
  };

  // Toggle 24/7 Crypto Autonomous Daemon
  const handleToggleCryptoCopilot = async () => {
    try {
      setTogglingBot(true);
      const next = !cryptoArmed;
      setCryptoArmed(next);
      setActionMsg(next ? '🪙 24/7 Crypto Autonomous Daemon Armed' : '⏸ 24/7 Crypto Daemon Paused (Standby)');
      await fetch(`${API_BASE}/api/copilot/crypto-toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ armed: next })
      });
      fetchPositions();
      setTimeout(() => setActionMsg(null), 4000);
    } catch (e: any) {
      setActionMsg(`⚠ Error: ${e.message}`);
    } finally {
      setTogglingBot(false);
    }
  };

  const handleClosePosition = async (symbol: string) => {
    try {
      setActionMsg(`Closing ${symbol}...`);
      const endpoint = activeAccountMode === 'paper' 
        ? `${API_BASE}/api/paper/positions/close?symbol=${symbol}` 
        : `${API_BASE}/api/alpaca/positions/close?symbol=${symbol}`;
      const res = await fetch(endpoint, { method: 'POST' });
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
      const endpoint = activeAccountMode === 'paper' 
        ? `${API_BASE}/api/paper/positions/flatten-all` 
        : `${API_BASE}/api/alpaca/positions/flatten-all`;
      const res = await fetch(endpoint, { method: 'POST' });
      const json = await res.json();
      setFlattenAllConfirm(false);
      if (json.status === 'SUCCESS') {
        setActionMsg('✓ All positions liquidated and flattened.');
        fetchPositions();
      } else {
        setActionMsg(`⚠ Error: ${json.message}`);
      }
      setTimeout(() => setActionMsg(null), 5000);
    } catch (e: any) {
      setFlattenAllConfirm(false);
      setActionMsg(`⚠ Failed: ${e.message}`);
      setTimeout(() => setActionMsg(null), 5000);
    }
  };

  const handleFlattenCryptoOnly = async () => {
    try {
      setActionMsg('Liquidating all 24/7 Crypto positions...');
      const res = await fetch(`${API_BASE}/api/alpaca/positions/flatten-crypto`, { method: 'POST' });
      const json = await res.json();
      setFlattenCryptoConfirm(false);
      if (json.status === 'SUCCESS') {
        setActionMsg(`✓ Liquidated ${json.count || 0} crypto positions.`);
        fetchPositions();
      } else {
        setActionMsg(`⚠ Error: ${json.message}`);
      }
      setTimeout(() => setActionMsg(null), 5000);
    } catch (e: any) {
      setFlattenCryptoConfirm(false);
      setActionMsg(`⚠ Failed: ${e.message}`);
      setTimeout(() => setActionMsg(null), 5000);
    }
  };

  const handleFlattenOptionsOnly = async () => {
    try {
      setActionMsg('Liquidating all Stock Options positions...');
      const res = await fetch(`${API_BASE}/api/alpaca/positions/flatten-options`, { method: 'POST' });
      const json = await res.json();
      setFlattenOptionsConfirm(false);
      if (json.status === 'SUCCESS') {
        setActionMsg(`✓ Liquidated ${json.count || 0} options positions.`);
        fetchPositions();
      } else {
        setActionMsg(`⚠ Error: ${json.message}`);
      }
      setTimeout(() => setActionMsg(null), 5000);
    } catch (e: any) {
      setFlattenOptionsConfirm(false);
      setActionMsg(`⚠ Failed: ${e.message}`);
      setTimeout(() => setActionMsg(null), 5000);
    }
  };

  const currentAcc = activeAccountMode === 'paper' ? paperAccount : (liveAlpacaAccount || alpacaAccount);
  const totalUpl = Number(data?.total_unrealized_pl || 0);
  const posCount = data?.count ?? (data?.positions?.length || 0);
  const plColor = totalUpl > 0 ? 'text-neon-green' : totalUpl < 0 ? 'text-neon-red' : 'text-slate-300';

  // Categorize positions
  const isCryptoPos = (p: Position) => {
    if (p.is_crypto) return true;
    if (p.category === 'CRYPTO') return true;
    const sym = p.symbol.toUpperCase();
    if (sym.endsWith('USD') && !p.is_option && !p.strike && sym.length <= 8) return true;
    if (['BTC', 'ETH', 'SOL', 'DOGE', 'XRP', 'AVAX', 'LINK', 'ADA', 'AAVE', 'RENDER', 'UNI', 'LTC', 'DOT', 'ARB', 'ONDO', 'PEPE', 'SHIB', 'BONK', 'WIF', 'BCH'].includes(sym)) return true;
    return false;
  };

  const isOptionPos = (p: Position) => {
    if (p.is_option) return true;
    if (p.category === 'OPTION') return true;
    const sym = p.symbol.toUpperCase();
    return sym.length >= 10 && (sym.includes('C') || sym.includes('P')) && /\d/.test(sym);
  };

  const cryptoPositions = data.positions.filter(isCryptoPos);
  const stockOptionPositions = data.positions.filter(p => !isCryptoPos(p));
  const optionsOnlyPositions = stockOptionPositions.filter(isOptionPos);

  const displayedPositions = assetFilter === 'ALL' 
    ? data.positions 
    : assetFilter === 'CRYPTO' 
      ? cryptoPositions 
      : stockOptionPositions;

  // Subtotal values
  const cryptoTotalVal = cryptoPositions.reduce((acc, p) => acc + (p.market_value || 0), 0);
  const cryptoTotalUpl = cryptoPositions.reduce((acc, p) => acc + (p.unrealized_pl || 0), 0);
  const stocksTotalVal = stockOptionPositions.reduce((acc, p) => acc + (p.market_value || 0), 0);
  const stocksTotalUpl = stockOptionPositions.reduce((acc, p) => acc + (p.unrealized_pl || 0), 0);

  return (
    <div id="positions-drawer-root" className="glass-panel border-t border-neon-green/20 bg-black/90 backdrop-blur-2xl shadow-2xl transition-all duration-300">
      {/* Drawer Toggle Header Bar */}
      <div className="px-4 py-2 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-3">
          <button
            id="positions-drawer-toggle-btn"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 text-white hover:text-neon-green font-bold transition-colors cursor-pointer"
          >
            <Wallet size={14} className="text-neon-green" />
            <span className="tracking-wide">PORTFOLIO & POSITIONS</span>
            {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>

          {/* Paper vs Live Mode Switcher */}
          <div className="flex items-center bg-white/5 rounded border border-white/10 p-0.5 text-[9px] font-bold">
            <button
              onClick={() => setActiveAccountMode('live')}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                activeAccountMode === 'live' 
                  ? 'bg-neon-green/20 text-neon-green border border-neon-green/40 shadow-[0_0_8px_rgba(0,255,136,0.2)]' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ALPACA PAPER ({alpacaAccount?.account_number || 'CONNECTED'})
            </button>
            <button
              onClick={() => setActiveAccountMode('paper')}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                activeAccountMode === 'paper' 
                  ? 'bg-neon-gold/20 text-neon-gold border border-neon-gold/40 shadow-[0_0_8px_rgba(255,184,0,0.2)]' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              OFFLINE SIMULATOR
            </button>
          </div>

          {/* SEPARATION TABS: ALL vs STOCKS/OPTIONS vs CRYPTO */}
          <div className="hidden md:flex items-center bg-black/60 rounded border border-white/15 p-0.5 text-[9px] font-mono">
            <button
              id="filter-all-positions-tab"
              onClick={() => setAssetFilter('ALL')}
              className={`px-2.5 py-0.5 rounded font-bold transition-all cursor-pointer flex items-center gap-1 ${
                assetFilter === 'ALL'
                  ? 'bg-white/15 text-white border border-white/30 shadow-[0_0_8px_rgba(255,255,255,0.15)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers size={10} />
              <span>ALL ({posCount})</span>
            </button>
            <button
              id="filter-stocks-positions-tab"
              onClick={() => setAssetFilter('STOCKS_OPTIONS')}
              className={`px-2.5 py-0.5 rounded font-bold transition-all cursor-pointer flex items-center gap-1 ${
                assetFilter === 'STOCKS_OPTIONS'
                  ? 'bg-purple-500/25 text-purple-300 border border-purple-500/50 shadow-[0_0_8px_rgba(168,85,247,0.25)]'
                  : 'text-slate-400 hover:text-purple-300'
              }`}
              title="US Equity Options & Shares"
            >
              <Cpu size={10} className="text-purple-400" />
              <span>STOCKS & OPTIONS ({stockOptionPositions.length})</span>
            </button>
            <button
              id="filter-crypto-positions-tab"
              onClick={() => setAssetFilter('CRYPTO')}
              className={`px-2.5 py-0.5 rounded font-bold transition-all cursor-pointer flex items-center gap-1 ${
                assetFilter === 'CRYPTO'
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50 shadow-[0_0_8px_rgba(6,182,212,0.25)]'
                  : 'text-slate-400 hover:text-cyan-300'
              }`}
              title="24/7 Spot Crypto Positions"
            >
              <Coins size={10} className="text-cyan-400" />
              <span>24/7 CRYPTO ({cryptoPositions.length})</span>
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="hidden lg:flex items-center gap-3 text-[11px] pl-3 border-l border-white/10">
            <span>
              Buying Power: <strong className="text-white">${Number(currentAcc?.buying_power || (activeAccountMode === 'paper' ? 200000 : 0)).toLocaleString()}</strong>
            </span>
            <span>
              Portfolio: <strong className="text-white">${Number(currentAcc?.portfolio_value || (activeAccountMode === 'paper' ? 100000 : 0)).toLocaleString()}</strong>
            </span>
            <span>
              Unrealized P&L: <strong className={plColor}>
                {totalUpl > 0 ? '+' : ''}${totalUpl.toFixed(2)}
              </strong>
            </span>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {actionMsg && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-neon-green/20 text-neon-green border border-neon-green/40 animate-pulse font-bold">
              {actionMsg}
            </span>
          )}

          {/* Selective Liquidation Buttons */}
          {cryptoPositions.length > 0 && (
            <>
              {flattenCryptoConfirm ? (
                <div className="flex items-center gap-1 bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-500/50">
                  <span className="text-[9px] text-cyan-300 font-bold">Liquidate Crypto?</span>
                  <button
                    onClick={handleFlattenCryptoOnly}
                    className="px-1.5 py-0.2 bg-cyan-500 text-black text-[9px] font-bold rounded hover:opacity-90 cursor-pointer"
                  >
                    YES
                  </button>
                  <button
                    onClick={() => setFlattenCryptoConfirm(false)}
                    className="text-slate-400 hover:text-white px-0.5"
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <button
                  id="btn-flatten-crypto-only"
                  onClick={() => setFlattenCryptoConfirm(true)}
                  className="px-2 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-[9px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="Liquidate only 24/7 spot crypto positions without touching stocks"
                >
                  <Coins size={10} /> FLATTEN CRYPTO
                </button>
              )}
            </>
          )}

          {optionsOnlyPositions.length > 0 && (
            <>
              {flattenOptionsConfirm ? (
                <div className="flex items-center gap-1 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/50">
                  <span className="text-[9px] text-purple-300 font-bold">Flatten Options?</span>
                  <button
                    onClick={handleFlattenOptionsOnly}
                    className="px-1.5 py-0.2 bg-purple-500 text-white text-[9px] font-bold rounded hover:opacity-90 cursor-pointer"
                  >
                    YES
                  </button>
                  <button
                    onClick={() => setFlattenOptionsConfirm(false)}
                    className="text-slate-400 hover:text-white px-0.5"
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <button
                  id="btn-flatten-options-only"
                  onClick={() => setFlattenOptionsConfirm(true)}
                  className="px-2 py-0.5 rounded bg-purple-500/10 hover:bg-purple-500/25 border border-purple-500/40 text-purple-300 text-[9px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="Liquidate only stock options positions"
                >
                  <Cpu size={10} /> FLATTEN OPTIONS
                </button>
              )}
            </>
          )}

          {/* Master Panic Flatten All */}
          {posCount > 0 && (
            <>
              {flattenAllConfirm ? (
                <div className="flex items-center gap-1 bg-neon-red/20 px-2 py-0.5 rounded border border-neon-red/50">
                  <span className="text-[9px] text-neon-red font-bold">Panic Flatten ALL?</span>
                  <button
                    onClick={handleFlattenAll}
                    className="px-2 py-0.2 bg-neon-red text-white text-[9px] font-bold rounded hover:opacity-90 cursor-pointer"
                  >
                    YES, FLATTEN
                  </button>
                  <button
                    onClick={() => setFlattenAllConfirm(false)}
                    className="text-slate-400 hover:text-white px-0.5"
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <button
                  id="btn-flatten-all-positions"
                  onClick={() => setFlattenAllConfirm(true)}
                  className="px-2 py-0.5 rounded bg-neon-red/15 hover:bg-neon-red/25 border border-neon-red/50 text-neon-red text-[9px] font-bold transition-all flex items-center gap-1 shadow-[0_0_8px_rgba(255,42,109,0.2)] cursor-pointer"
                  title="Liquidate and flatten all positions in 1 click"
                >
                  <AlertOctagon size={10} /> FLATTEN ALL
                </button>
              )}
            </>
          )}

          <button
            id="btn-refresh-positions"
            onClick={fetchPositions}
            title="Refresh Positions"
            className="text-slate-400 hover:text-neon-green p-1 transition-colors cursor-pointer"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin text-neon-green' : ''} />
          </button>
        </div>
      </div>

      {/* Expanded Positions Table Drawer */}
      {isOpen && (
        <div className="p-3 border-t border-white/10 bg-black/75 overflow-x-auto max-h-96 overflow-y-auto">
          {/* Autonomous Bots Status & Isolation Bar */}
          <div className="mb-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/10 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
            {/* Options Bot Card */}
            <div className={`p-2 rounded border transition-all flex items-center justify-between ${
              copilotArmed 
                ? 'bg-purple-950/20 border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.15)]' 
                : 'bg-black/30 border-white/10'
            }`}>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <Cpu size={13} className={copilotArmed ? 'text-purple-400' : 'text-slate-500'} />
                  <span className="font-bold text-white text-[11px]">US Stock Options Co-Pilot</span>
                  <span className={`text-[8px] px-1.5 py-0.2 rounded font-bold uppercase ${
                    copilotArmed ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'bg-white/5 text-slate-500'
                  }`}>
                    {copilotArmed ? 'ARMED (ACTIVE)' : 'STANDBY (PAUSED)'}
                  </span>
                </div>
                <div className="text-[9px] text-slate-400 flex items-center gap-2">
                  <span>Exit: <strong className="text-purple-300">15:50 ET Auto-Close</strong></span>
                  <span>Cap: <strong className="text-white">Max 5 Pos</strong></span>
                  <span>Active: <strong className="text-white">{stockOptionPositions.length}/5</strong></span>
                </div>
              </div>
              <button
                id="toggle-options-bot-btn"
                onClick={handleToggleOptionsCopilot}
                disabled={togglingBot}
                className={`px-2 py-1 rounded text-[9px] font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 ${
                  copilotArmed 
                    ? 'bg-neon-red/20 text-neon-red border border-neon-red/40 hover:bg-neon-red/30' 
                    : 'bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30'
                }`}
                title="Arm or pause the automated Stock Options bot"
              >
                <Power size={10} />
                <span>{copilotArmed ? 'PAUSE OPTIONS' : 'ARM OPTIONS'}</span>
              </button>
            </div>

            {/* Crypto Bot Card */}
            <div className={`p-2 rounded border transition-all flex items-center justify-between ${
              cryptoArmed 
                ? 'bg-cyan-950/20 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.15)]' 
                : 'bg-black/30 border-white/10'
            }`}>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <Coins size={13} className={cryptoArmed ? 'text-cyan-400' : 'text-slate-500'} />
                  <span className="font-bold text-white text-[11px]">24/7 Autonomous Crypto Daemon</span>
                  <span className={`text-[8px] px-1.5 py-0.2 rounded font-bold uppercase ${
                    cryptoArmed ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-white/5 text-slate-500'
                  }`}>
                    {cryptoArmed ? 'ARMED ($500/TRADE)' : 'STANDBY (PAUSED)'}
                  </span>
                </div>
                <div className="text-[9px] text-slate-400 flex items-center gap-2">
                  <span>Runs: <strong className="text-cyan-300">24/7 Non-Stop</strong></span>
                  <span>Risk: <strong className="text-neon-red">-4% SL</strong> · <strong className="text-neon-green">+6% BE</strong></span>
                  <span>Active: <strong className="text-white">{cryptoPositions.length}/3</strong></span>
                </div>
              </div>
              <button
                id="toggle-crypto-bot-btn"
                onClick={handleToggleCryptoCopilot}
                disabled={togglingBot}
                className={`px-2 py-1 rounded text-[9px] font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 ${
                  cryptoArmed 
                    ? 'bg-neon-red/20 text-neon-red border border-neon-red/40 hover:bg-neon-red/30' 
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
                }`}
                title="Turn 24/7 crypto auto-trading on or off independently from stocks"
              >
                <Power size={10} />
                <span>{cryptoArmed ? 'PAUSE CRYPTO' : 'ARM CRYPTO'}</span>
              </button>
            </div>
          </div>

          {/* Subtotal Summary Stats */}
          <div className="mb-2 px-3 py-1.5 bg-black/60 rounded border border-white/10 flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-slate-300">
                <Cpu size={11} className="text-purple-400" />
                Stocks & Options: <strong className="text-white">${stocksTotalVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                <span className={stocksTotalUpl >= 0 ? 'text-neon-green ml-1 font-bold' : 'text-neon-red ml-1 font-bold'}>
                  ({stocksTotalUpl >= 0 ? '+' : ''}${stocksTotalUpl.toFixed(2)})
                </span>
              </span>

              <span className="flex items-center gap-1 text-slate-300 pl-3 border-l border-white/10">
                <Coins size={11} className="text-cyan-400" />
                24/7 Crypto Spot: <strong className="text-white">${cryptoTotalVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                <span className={cryptoTotalUpl >= 0 ? 'text-neon-green ml-1 font-bold' : 'text-neon-red ml-1 font-bold'}>
                  ({cryptoTotalUpl >= 0 ? '+' : ''}${cryptoTotalUpl.toFixed(2)})
                </span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
              <Sparkles size={10} className="text-neon-gold" />
              <span>Filter View: <strong className="text-white">{assetFilter}</strong> ({displayedPositions.length} shown)</span>
            </div>
          </div>

          {displayedPositions.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center justify-center gap-2 text-slate-400 font-mono text-xs">
              <ShieldCheck size={28} className="text-neon-green/80" />
              <div className="font-bold text-white">
                {assetFilter === 'ALL' 
                  ? 'No Open Positions' 
                  : assetFilter === 'STOCKS_OPTIONS' 
                    ? 'No Open Stock or Option Positions' 
                    : 'No Open Crypto Positions'}
              </div>
              <div className="text-[11px] text-slate-500 max-w-lg text-center">
                {assetFilter === 'STOCKS_OPTIONS' 
                  ? 'US Stock Options automatically exit at 15:50 ET every day to prevent overnight theta bleed. The bot re-evaluates ATM Call/Put brackets from 9:45 AM ET to 15:30 ET during active market hours.'
                  : assetFilter === 'CRYPTO'
                    ? 'Crypto trades run 24/7. When armed, the daemon evaluates top 20 crypto assets and allocates $500 per position with automatic profit ratchets.'
                    : 'Portfolio is flat with 100% available buying power. Use the Bracket Order modal on any chart or arm the autonomous Co-Pilot above.'}
              </div>
            </div>
          ) : (
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 text-[10px] uppercase">
                  <th className="py-2 px-2">Type</th>
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
                {displayedPositions.map((pos) => {
                  const isProfit = pos.unrealized_pl >= 0;
                  const isCrypto = isCryptoPos(pos);
                  const isOption = isOptionPos(pos);

                  return (
                    <tr key={pos.symbol} className="hover:bg-white/[0.02] transition-colors">
                      {/* Asset Class Badge Column */}
                      <td className="py-2 px-2">
                        {isCrypto ? (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 w-max">
                            <Coins size={9} /> CRYPTO SPOT
                          </span>
                        ) : isOption ? (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1 w-max">
                            <Cpu size={9} /> OPTION 100x
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 w-max">
                            EQUITY SHARES
                          </span>
                        )}
                      </td>

                      {/* Symbol & Contract Details */}
                      <td className="py-2 px-2 font-bold text-white">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => onSelectTicker && onSelectTicker(pos.underlying || pos.symbol)}
                              className="hover:text-neon-green transition-colors text-left font-bold"
                              title="Click to view chart and options"
                            >
                              {pos.symbol}
                            </button>
                            {isCrypto && (
                              <span className="text-[8px] px-1 py-0.2 rounded bg-cyan-500/10 text-cyan-400 font-mono">
                                24/7 Asset
                              </span>
                            )}
                          </div>
                          {(isOption || pos.strike) && (
                            <span className="text-[9px] text-purple-300 font-normal">
                              ${pos.strike} {pos.option_type} · Exp {pos.expiry} · <span className="text-slate-400">15:50 ET Exit</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Side */}
                      <td className="py-2 px-2">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          pos.side === 'LONG' || pos.side === 'BUY' ? 'bg-neon-green/20 text-neon-green' : 'bg-neon-red/20 text-neon-red'
                        }`}>
                          {pos.side}
                        </span>
                      </td>

                      {/* Quantity */}
                      <td className="py-2 px-2 text-slate-200">
                        {pos.qty} {isOption ? 'contracts' : isCrypto ? 'tokens' : 'shs'}
                      </td>

                      {/* Avg Entry */}
                      <td className="py-2 px-2 text-slate-300">
                        ${pos.avg_entry_price >= 1 ? pos.avg_entry_price.toFixed(2) : pos.avg_entry_price.toFixed(4)}
                      </td>

                      {/* Current Price */}
                      <td className="py-2 px-2 font-bold text-white">
                        ${pos.current_price >= 1 ? pos.current_price.toFixed(2) : pos.current_price.toFixed(4)}
                      </td>

                      {/* Market Value */}
                      <td className="py-2 px-2 text-slate-300">
                        ${pos.market_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Unrealized P&L */}
                      <td className="py-2 px-2 font-bold">
                        <span className={isProfit ? 'text-neon-green' : 'text-neon-red'}>
                          {isProfit ? '+' : ''}${pos.unrealized_pl.toFixed(2)} ({isProfit ? '+' : ''}{pos.unrealized_pl_pct.toFixed(2)}%)
                        </span>
                      </td>

                      {/* Change Today */}
                      <td className="py-2 px-2">
                        <span className={pos.change_today >= 0 ? 'text-neon-green' : 'text-neon-red'}>
                          {pos.change_today >= 0 ? '+' : ''}{pos.change_today.toFixed(2)}%
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-2 px-2 text-right">
                        <button
                          onClick={() => handleClosePosition(pos.symbol)}
                          className="px-2.5 py-0.5 rounded bg-white/10 hover:bg-neon-red/20 border border-white/20 hover:border-neon-red/50 text-slate-300 hover:text-neon-red text-[10px] font-bold transition-all cursor-pointer"
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
