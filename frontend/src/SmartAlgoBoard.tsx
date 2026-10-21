import { useState, useEffect, useCallback } from 'react';
import { 
  Cpu, Target, Shield, ShieldCheck, CheckCircle2, Zap, Send, AlertCircle, Sparkles, 
  Activity, Clock, BarChart3, RefreshCw, Dna, Bot, Play, Square, Radio, DollarSign, Award, Coins
} from 'lucide-react';
import { playInstitutionalChime, speakInstitutionalVoice } from './audioAlerts';
import { API_BASE } from './config';
import { HelpButton } from './CardExplainerModal';

interface SmartAlgoProps {
  data: {
    ticker: string;
    spot: number;
    markov_state: string;
    regime_sub: string;
    confidence: number;
    bias: string;
    action: string;
    entry_zone: string;
    take_profit: string;
    stop_loss: string;
    risk_reward: string;
    win_probability: string;
    target_high: number;
    target_low: number;
    pivot: number;
    drivers: string[];
    learning?: {
      engine_state: string;
      generation?: number;
      generation_history?: Array<{
        generation: number;
        timestamp: number;
        accuracy: number;
        brier_score: number;
        learning_rate: number;
        top_factor: string;
        regime: string;
        note: string;
      }>;
      active_regime?: string;
      regime_label?: string;
      regime_weights_all?: Record<string, {
        gamma: number;
        flow: number;
        momentum: number;
        vanna: number;
        skew: number;
        cvd: number;
      }>;
      accuracy: string;
      tested_samples: number;
      target_hits?: number;
      stopped_out?: number;
      calibration_model: string;
      active_weights: string;
      weights_dict?: {
        gamma: number;
        flow: number;
        momentum: number;
        vanna: number;
        skew?: number;
        cvd?: number;
      };
      learning_insight: string;
      kelly_formula?: string;
      meta_hyperparameters?: {
        adaptive_lr: number;
        momentum_beta: number;
        rolling_brier: number;
        information_coefficients: Record<string, number>;
      };
    };
    dealer_hedging?: {
      flow_rate: string;
      mode: string;
      vanna_drift: string;
      gamma_concentration_0dte: string;
      hedge_velocity: string;
      power_hour_multiplier?: string;
    };
    bracket_setup?: {
      symbol: string;
      side: string;
      entry_price: number;
      take_profit: number;
      stop_loss: number;
      order_type: string;
      time_in_force: string;
      kelly_sizing: string;
      est_risk_reward: string;
      atr_14?: string;
      atr_regime?: string;
      trailing_step?: string;
      option_bracket?: any;
    };
    iv_skew_barometer?: {
      skew_pct: number;
      put_iv?: number;
      call_iv?: number;
      signal: string;
      feature_val: number;
    };
    atr_trailing?: {
      atr_14: number;
      atr_pct: number;
      regime: string;
      stop_multiplier: number;
      target_multiplier: number;
      trailing_step: number;
    };
    cvd_analytics?: {
      net_cvd_usd: number;
      cvd_ratio: number;
      buy_volume: number;
      sell_volume: number;
      divergence: string;
      dominant_side: string;
      feature_val: number;
    };
    power_hour_status?: {
      phase: string;
      is_power_hour: boolean;
      time_desc: string;
      minutes_to_close: number;
      gamma_acceleration_multiplier: number;
      pin_risk_alert: string;
      is_pinning: boolean;
      closest_wall?: string;
      closest_wall_dist_pct?: number;
    };
    cross_asset_lead_lag?: {
      lead_lag_state: string;
      '10y_yield_delta': number;
      '10y_bias': string;
      dxy_delta: number;
      dxy_bias: string;
      curve_spread_bps: number;
      feature_val: number;
    };
  } | null;
  loading?: boolean;
  onSelectTicker?: (ticker: string) => void;
  tape?: Record<string, any>;
  initialMode?: 'crypto' | 'options';
}

export function SmartAlgoBoard({ data, loading, onSelectTicker, tape, initialMode }: SmartAlgoProps) {
  const [activeSubTab, setActiveSubTab] = useState<'crypto' | 'options'>(() => {
    if (initialMode) return initialMode;
    const isCrypto = ['BTC', 'ETH', 'SOL', 'DOGE', 'XRP', 'AVAX', 'LINK', 'ADA', 'AAVE', 'RENDER', 'UNI', 'LTC', 'DOT', 'ARB', 'ONDO', 'PEPE', 'SHIB', 'BONK', 'WIF', 'BCH'].includes(data?.ticker?.toUpperCase() || '');
    return isCrypto ? 'crypto' : 'options';
  });

  useEffect(() => {
    if (initialMode) {
      setActiveSubTab(initialMode);
    } else if (data?.ticker && ['BTC', 'ETH', 'SOL', 'DOGE', 'XRP', 'AVAX', 'LINK', 'ADA', 'AAVE', 'RENDER', 'UNI', 'LTC', 'DOT', 'ARB', 'ONDO', 'PEPE', 'SHIB', 'BONK', 'WIF', 'BCH'].includes(data.ticker.toUpperCase())) {
      setActiveSubTab('crypto');
    }
  }, [initialMode, data?.ticker]);

  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderQty, setOrderQty] = useState(5);
  const [isSimulated, setIsSimulated] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<any | null>(null);

  // Recursive Self-Improvement (RSI) state
  const [evolvingGeneration, setEvolvingGeneration] = useState(false);
  const [evolutionToast, setEvolutionToast] = useState<string | null>(null);
  const [selectedRegime, setSelectedRegime] = useState<string>('ACTIVE');

  // Autonomous Trade Co-Pilot 24/7 Cloud State
  const [autoPilotEnabled, setAutoPilotEnabled] = useState<boolean>(true);
  const [minConfidenceThreshold, setMinConfidenceThreshold] = useState<number>(70);
  const [optionsOnly, setOptionsOnly] = useState<boolean>(true);
  const [monitoredSymbols, setMonitoredSymbols] = useState<string[]>([]);
  const [isFlatteningOptions, setIsFlatteningOptions] = useState<boolean>(false);
  const [copilotStatusMsg, setCopilotStatusMsg] = useState<string>('Connecting to 24/7 Cloud Daemon...');
  const [isEvaluatingNow, setIsEvaluatingNow] = useState<boolean>(false);
  const [dailyProfitTarget, setDailyProfitTarget] = useState<number>(500);
  const [dailyMaxLoss, setDailyMaxLoss] = useState<number>(300);
  const [maxConcurrentPositions, setMaxConcurrentPositions] = useState<number>(5);
  const [activePositionsCount, setActivePositionsCount] = useState<number>(0);
  const [maxDailyTrades, setMaxDailyTrades] = useState<number>(8);
  const [dailyTradesCount, setDailyTradesCount] = useState<number>(0);
  const [breakevenRatchetEnabled, setBreakevenRatchetEnabled] = useState<boolean>(true);
  const [newsSafetyFilterEnabled, setNewsSafetyFilterEnabled] = useState<boolean>(true);
  const [circuitBreakerStatus, setCircuitBreakerStatus] = useState<string>('ACTIVE');
  const [pnlAnalytics, setPnlAnalytics] = useState<{
    today_realized_pnl: number;
    today_trades: number;
    today_wins: number;
    today_losses: number;
    today_win_rate: number;
    total_realized_pnl: number;
    all_time_win_rate: number;
    profit_factor: number;
    avg_win: number;
    avg_loss: number;
    date_et?: string;
  }>({
    today_realized_pnl: 0,
    today_trades: 0,
    today_wins: 0,
    today_losses: 0,
    today_win_rate: 0,
    total_realized_pnl: 0,
    all_time_win_rate: 0,
    profit_factor: 1.0,
    avg_win: 0,
    avg_loss: 0,
    date_et: 'TODAY ET'
  });
  const [coPilotLogs, setCoPilotLogs] = useState<Array<{
    id: string;
    time: string;
    symbol: string;
    side: string;
    price: number;
    tp: number;
    sl: number;
    mode: string;
    status: string;
    confidence: number;
    is_option?: boolean;
    strike?: number;
    expiry?: string;
    multiplier?: number;
  }>>([]);

  // Dedicated 24/7 Crypto Autonomous Co-Pilot State
  const [cryptoArmed, setCryptoArmed] = useState<boolean>(true);
  const [cryptoNotionalUsd, setCryptoNotionalUsd] = useState<number>(500);
  const [cryptoMaxPositions, setCryptoMaxPositions] = useState<number>(3);
  const [cryptoMinConfidence, setCryptoMinConfidence] = useState<number>(75);
  const [cryptoActiveMonitors, setCryptoActiveMonitors] = useState<string[]>([]);
  const [cryptoLastTrades, setCryptoLastTrades] = useState<any[]>([]);
  const [cryptoStatusMsg, setCryptoStatusMsg] = useState<string>('Crypto 24/7 Daemon Initializing...');
  const [isEvaluatingCryptoNow, setIsEvaluatingCryptoNow] = useState<boolean>(false);


  // Renaissance Technologies Statistical Arbitrage Cointegration Radar state
  const [statArbPairs, setStatArbPairs] = useState<any[]>([]);
  const [loadingStatArb, setLoadingStatArb] = useState<boolean>(false);

  const fetchStatArb = useCallback(async () => {
    setLoadingStatArb(true);
    try {
      const res = await fetch(`${API_BASE}/api/algo/pairs-arbitrage?t=${Date.now()}`);
      const json = await res.json();
      if (Array.isArray(json)) {
        setStatArbPairs(json);
      }
    } catch (e) {
      console.warn('Failed to fetch stat-arb pairs:', e);
    } finally {
      setLoadingStatArb(false);
    }
  }, []);

  useEffect(() => {
    fetchStatArb();
    const arbIv = setInterval(fetchStatArb, 60000);
    return () => clearInterval(arbIv);
  }, [fetchStatArb]);

  // Sync state with Cloud Daemon on server
  const fetchCopilotStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/copilot/status`);
      const json = await res.json();
      if (json) {
        setAutoPilotEnabled(json.armed);
        if (json.min_confidence !== undefined) setMinConfidenceThreshold(json.min_confidence);
        if (json.is_simulated !== undefined) setIsSimulated(json.is_simulated);
        if (json.order_qty !== undefined) setOrderQty(json.order_qty);
        if (json.options_only !== undefined) setOptionsOnly(json.options_only);
        if (json.daily_profit_target !== undefined) setDailyProfitTarget(json.daily_profit_target);
        if (json.daily_max_loss !== undefined) setDailyMaxLoss(json.daily_max_loss);
        if (json.max_concurrent_positions !== undefined) setMaxConcurrentPositions(json.max_concurrent_positions);
        if (json.active_positions_count !== undefined) setActivePositionsCount(json.active_positions_count);
        if (json.max_daily_trades !== undefined) setMaxDailyTrades(json.max_daily_trades);
        if (json.daily_trades_count !== undefined) setDailyTradesCount(json.daily_trades_count);
        if (json.breakeven_ratchet_enabled !== undefined) setBreakevenRatchetEnabled(json.breakeven_ratchet_enabled);
        if (json.news_safety_filter_enabled !== undefined) setNewsSafetyFilterEnabled(json.news_safety_filter_enabled);
        if (json.circuit_breaker_status) setCircuitBreakerStatus(json.circuit_breaker_status);
        if (json.pnl_analytics) setPnlAnalytics(json.pnl_analytics);
        if (json.monitored_symbols && Array.isArray(json.monitored_symbols)) {
          setMonitoredSymbols(json.monitored_symbols);
        }
        if (json.executed_tickets && Array.isArray(json.executed_tickets)) {
          setCoPilotLogs(json.executed_tickets);
        }
        // Dedicated Crypto Telemetry
        if (json.crypto_armed !== undefined) setCryptoArmed(json.crypto_armed);
        if (json.crypto_notional_usd !== undefined) setCryptoNotionalUsd(json.crypto_notional_usd);
        if (json.crypto_max_positions !== undefined) setCryptoMaxPositions(json.crypto_max_positions);
        if (json.crypto_min_confidence !== undefined) setCryptoMinConfidence(json.crypto_min_confidence);
        if (json.crypto_active_monitors && Array.isArray(json.crypto_active_monitors)) {
          setCryptoActiveMonitors(json.crypto_active_monitors);
        }
        if (json.crypto_last_trades && Array.isArray(json.crypto_last_trades)) {
          setCryptoLastTrades(json.crypto_last_trades);
        }
        if (json.crypto_last_status_message) {
          setCryptoStatusMsg(json.crypto_last_status_message);
        }
        const mktStatus = json.market_open ? '🟢 US MARKET OPEN' : '🌙 OVERNIGHT CRYPTO & EXTENDED';
        setCopilotStatusMsg(`${mktStatus} · ${json.last_status_message || 'Cloud Daemon Active'}`);
      }
    } catch (e) {
      console.warn('Failed to sync copilot status:', e);
    }
  }, []);

  useEffect(() => {
    fetchCopilotStatus();
    const iv = setInterval(fetchCopilotStatus, 10000);

    // Instant cross-tab sync via BroadcastChannel
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('bias_copilot_sync');
        bc.onmessage = () => {
          fetchCopilotStatus();
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel sync init error:', e);
    }

    return () => {
      clearInterval(iv);
      if (bc) bc.close();
    };
  }, [fetchCopilotStatus]);

  const notifyTabsSync = () => {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('bias_copilot_sync');
        bc.postMessage({ type: 'SYNC_COPILOT_STATE', timestamp: Date.now() });
        bc.close();
      }
    } catch (_) {}
  };

  const handleToggleCopilot = async () => {
    const next = !autoPilotEnabled;
    setAutoPilotEnabled(next);
    try {
      await fetch(`${API_BASE}/api/copilot/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ armed: next })
      });
      notifyTabsSync();
      fetchCopilotStatus();
    } catch (e) {
      console.error('Error toggling copilot:', e);
    }
    if (next) {
      playInstitutionalChime('gamma_flip');
      speakInstitutionalVoice('Autonomous Trade Co-Pilot is now armed.');
    } else {
      speakInstitutionalVoice('Autonomous Trade Co-Pilot returned to standby.');
    }
  };

  const handleToggleOptionsOnly = async () => {
    const next = !optionsOnly;
    setOptionsOnly(next);
    try {
      await fetch(`${API_BASE}/api/copilot/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ options_only: next })
      });
      notifyTabsSync();
      fetchCopilotStatus();
    } catch (e) {
      console.error(e);
    }
    if (next) {
      speakInstitutionalVoice('Co-Pilot switched to Options Only mode. EOD 15:50 ET exit enforced.');
    } else {
      speakInstitutionalVoice('Co-Pilot switched to Equity and Crypto Shares mode.');
    }
  };

  const handleFlattenOptions = async () => {
    setIsFlatteningOptions(true);
    try {
      const res = await fetch(`${API_BASE}/api/copilot/flatten-options`, { method: 'POST' });
      const json = await res.json();
      playInstitutionalChime('gamma_flip');
      speakInstitutionalVoice(`Options liquidation complete. Closed ${json.flattened_count || 0} contracts.`);
      fetchCopilotStatus();
    } catch (e) {
      console.error(e);
    } finally {
      setIsFlatteningOptions(false);
    }
  };

  const handleToggleBreakevenRatchet = async () => {
    const next = !breakevenRatchetEnabled;
    setBreakevenRatchetEnabled(next);
    try {
      await fetch(`${API_BASE}/api/copilot/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ breakeven_ratchet_enabled: next })
      });
      notifyTabsSync();
      fetchCopilotStatus();
    } catch (e) {
      console.error(e);
    }
    if (next) {
      speakInstitutionalVoice('Multi-Stage Scaling armed: Trim 50% at +35%, and trail remaining runner.');
    } else {
      speakInstitutionalVoice('Multi-Stage Scaling disarmed.');
    }
  };

  const handleToggleNewsFilter = async () => {
    const next = !newsSafetyFilterEnabled;
    setNewsSafetyFilterEnabled(next);
    try {
      await fetch(`${API_BASE}/api/copilot/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ news_safety_filter_enabled: next })
      });
      notifyTabsSync();
      fetchCopilotStatus();
    } catch (e) {
      console.error(e);
    }
    if (next) {
      speakInstitutionalVoice('News Sentiment Guard active. Blocking counter-trend trades.');
    } else {
      speakInstitutionalVoice('News Sentiment Guard deactivated.');
    }
  };

  const handleUpdateDailyTarget = async (val: number) => {
    setDailyProfitTarget(val);
    try {
      await fetch(`${API_BASE}/api/copilot/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daily_profit_target: val })
      });
      notifyTabsSync();
      fetchCopilotStatus();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateMaxLoss = async (val: number) => {
    setDailyMaxLoss(val);
    try {
      await fetch(`${API_BASE}/api/copilot/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daily_max_loss: val })
      });
      notifyTabsSync();
      fetchCopilotStatus();
    } catch (e) {
      console.error(e);
    }
  };

  const handleChangeConfidence = async (thresh: number) => {
    setMinConfidenceThreshold(thresh);
    try {
      await fetch(`${API_BASE}/api/copilot/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ min_confidence: thresh })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleSimulation = async () => {
    const nextSim = !isSimulated;
    setIsSimulated(nextSim);
    try {
      await fetch(`${API_BASE}/api/copilot/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_simulated: nextSim })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleTriggerNow = async () => {
    if (!data) return;
    setIsEvaluatingNow(true);
    try {
      const res = await fetch(`${API_BASE}/api/copilot/trigger-now?symbol=${data.ticker}`, {
        method: 'POST'
      });
      const json = await res.json();
      await fetchCopilotStatus();
      if (json.executed_count > 0) {
        playInstitutionalChime('order_filled');
        speakInstitutionalVoice(`Autonomous Co-Pilot: Triggered ${json.executed_count} orders on ${data.ticker}.`);
      } else {
        speakInstitutionalVoice(`Autonomous Co-Pilot: Evaluated ${data.ticker}. Threshold not met or in cooldown.`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsEvaluatingNow(false);
    }
  };


  const handleToggleCryptoCopilot = async () => {
    const next = !cryptoArmed;
    setCryptoArmed(next);
    try {
      await fetch(`${API_BASE}/api/copilot/crypto-toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ armed: next })
      });
      notifyTabsSync();
      fetchCopilotStatus();
    } catch (e) {
      console.error('Error toggling crypto copilot:', e);
    }
    if (next) {
      playInstitutionalChime('gamma_flip');
      speakInstitutionalVoice('Crypto 24/7 Autonomous Daemon is now armed.');
    } else {
      speakInstitutionalVoice('Crypto 24/7 Autonomous Daemon returned to standby.');
    }
  };

  const handleChangeCryptoConfidence = async (val: number) => {
    setCryptoMinConfidence(val);
    try {
      await fetch(`${API_BASE}/api/copilot/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crypto_min_confidence: val })
      });
      notifyTabsSync();
      fetchCopilotStatus();
    } catch (e) {
      console.error(e);
    }
  };

  const handleChangeCryptoNotional = async (val: number) => {
    setCryptoNotionalUsd(val);
    try {
      await fetch(`${API_BASE}/api/copilot/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crypto_notional_usd: val })
      });
      notifyTabsSync();
      fetchCopilotStatus();
    } catch (e) {
      console.error(e);
    }
  };

  const handleTriggerCryptoNow = async () => {
    setIsEvaluatingCryptoNow(true);
    try {
      await fetch(`${API_BASE}/api/copilot/crypto-trigger-now`, { method: 'POST' });
      fetchCopilotStatus();
    } catch (e) {
      console.error('Trigger crypto error:', e);
    } finally {
      setIsEvaluatingCryptoNow(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-slate-500 font-mono text-xs gap-2">
        <Cpu size={24} className="animate-spin text-neon-green" />
        <span>Optimizing Multi-Regime Bayesian Weights & Dealer Delta Models…</span>
      </div>
    );
  }

  if (!data || !data.bias) {
    return (
      <div className="text-slate-500 font-mono text-xs p-6 text-center">
        Waiting for quantitative algorithmic intelligence…
      </div>
    );
  }

  const isBull = data.bias ? data.bias.includes('BULL') : false;
  const isBear = data.bias ? data.bias.includes('BEAR') : false;
  const stateColor = isBull ? 'text-neon-green' : isBear ? 'text-neon-red' : 'text-neon-gold';
  const stateBorder = isBull ? 'border-neon-green/40 bg-neon-green/10' : isBear ? 'border-neon-red/40 bg-neon-red/10' : 'border-neon-gold/40 bg-neon-gold/10';

  const setup = data.bracket_setup;
  const hedging = data.dealer_hedging;
  const skew = data.iv_skew_barometer;
  const cvd = data.cvd_analytics;
  const atr = data.atr_trailing;
  const powerHour = data.power_hour_status;

  const handleExecuteBracket = async () => {
    if (!setup) return;
    setOrderSubmitting(true);
    setOrderResult(null);
    try {
      const optBracket = setup.option_bracket;
      const shouldUseOption = optionsOnly && optBracket;
      
      const payload = shouldUseOption ? {
        symbol: optBracket.contract_symbol,
        qty: orderQty,
        side: 'buy',
        limit_price: optBracket.estimated_premium,
        take_profit_price: optBracket.take_profit_price,
        stop_loss_price: optBracket.stop_loss_price,
        simulated: isSimulated,
        is_option: true,
        option_details: optBracket
      } : {
        symbol: setup.symbol,
        qty: orderQty,
        side: setup.side,
        limit_price: setup.entry_price,
        take_profit_price: setup.take_profit,
        stop_loss_price: setup.stop_loss,
        simulated: isSimulated,
      };

      const res = await fetch(`${API_BASE}/api/alpaca/order/bracket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      setOrderResult(json);
      playInstitutionalChime('order_filled');
    } catch (err: any) {
      setOrderResult({ status: 'ERROR', error: String(err) });
    } finally {
      setOrderSubmitting(false);
    }
  };

  const handleTriggerEvolution = async () => {
    setEvolvingGeneration(true);
    setEvolutionToast(null);
    try {
      const res = await fetch(`${API_BASE}/api/algo/evolve?ticker=${data.ticker}`, {
        method: 'POST',
      });
      const json = await res.json();
      if (json.status === 'SUCCESS' || json.generation) {
        setEvolutionToast(`🧬 Gen-${json.generation} Evolved! Dominant factor: ${(json.top_factor || 'gamma').toUpperCase()}`);
        playInstitutionalChime('gamma_flip');
        speakInstitutionalVoice(`Recursive Self-Improvement: Evolved to Generation ${json.generation}. Dominant factor is ${(json.top_factor || 'gamma').toUpperCase()}.`);
      } else {
        setEvolutionToast(`RSI Cycle updated.`);
      }
      setTimeout(() => setEvolutionToast(null), 7000);
    } catch (err: any) {
      setEvolutionToast(`Evolution error: ${String(err)}`);
      setTimeout(() => setEvolutionToast(null), 5000);
    } finally {
      setEvolvingGeneration(false);
    }
  const renderCryptoCard = () => (
    <div id="algo-crypto-copilot-card" className={`p-2.5 rounded-lg border transition-all ${
      cryptoArmed 
        ? 'bg-black/90 border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.18)]' 
        : 'bg-black/40 border-white/10'
    }`}>
      <div className="flex justify-between items-center pb-2 border-b border-white/10">
        <div className="flex items-center gap-1.5">
          <Coins size={14} className={cryptoArmed ? 'text-cyan-400 animate-pulse' : 'text-slate-400'} />
          <span className="text-[10px] font-bold tracking-wider uppercase text-white flex items-center gap-1">
            24/7 Crypto Autonomous Daemon (Alpaca Digital)
          </span>
          <span className={`text-[8px] px-1.5 py-0.2 rounded font-bold uppercase flex items-center gap-1 ${
            cryptoArmed ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-white/5 text-slate-500'
          }`}>
            {cryptoArmed && <Radio size={8} className="animate-ping" />}
            {cryptoArmed ? `ARMED ($${cryptoNotionalUsd}/TRADE)` : 'STANDBY'}
          </span>
        </div>
        
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleTriggerCryptoNow}
            disabled={isEvaluatingCryptoNow}
            title="Force immediate 24/7 crypto scan across all 20 coins"
            className="px-2 py-1 rounded text-[9px] font-bold bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={9} className={isEvaluatingCryptoNow ? "animate-spin" : ""} />
            <span>{isEvaluatingCryptoNow ? "SCANNING..." : "⚡ SCAN CRYPTO NOW"}</span>
          </button>

          <button
            onClick={handleToggleCryptoCopilot}
            className={`px-2.5 py-1 rounded text-[9px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
              cryptoArmed 
                ? 'bg-neon-red/20 text-neon-red border border-neon-red/40 hover:bg-neon-red/30' 
                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
            }`}
          >
            {cryptoArmed ? <Square size={9} fill="currentColor" /> : <Play size={9} fill="currentColor" />}
            <span>{cryptoArmed ? 'DISARM CRYPTO' : 'ARM CRYPTO'}</span>
          </button>
        </div>
      </div>

      {/* Crypto Daemon Telemetry Banner */}
      <div className="mt-1.5 px-2 py-1 bg-white/[0.02] rounded border border-white/5 flex items-center justify-between text-[8px] font-mono text-slate-400">
        <span className="truncate">{cryptoStatusMsg}</span>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <span className="px-1.5 py-0.2 rounded font-bold border text-[8px] bg-cyan-500/20 text-cyan-300 border-cyan-500/40" title="Separate crypto allocation limit (does not count against stock options)">
            ⚡ MAX {cryptoMaxPositions} POSITIONS
          </span>
          <span className="px-1.5 py-0.2 rounded font-bold border text-[8px] bg-emerald-500/20 text-emerald-300 border-emerald-500/40" title="Continuous 24/7/365 trading — never closes at 15:50 ET">
            🟢 24/7/365 CONTINUOUS
          </span>
          <span className="px-1.5 py-0.2 rounded font-bold border text-[8px] bg-purple-500/20 text-purple-300 border-purple-500/40" title="Liquidates at -4% loss, locks breakeven at +6%, trails runner at +12%">
            🛡️ -4% SL / +6% BE / +12% TRAIL
          </span>
          <span className="text-neon-gold text-[8px]">Fixed ${cryptoNotionalUsd} Notional</span>
        </div>
      </div>

      {/* Crypto Parameters Row */}
      <div className="grid grid-cols-3 gap-2 pt-2 text-[9px]">
        <div className="bg-white/[0.03] p-1.5 rounded flex flex-col">
          <span className="text-slate-400 text-[8px] uppercase">Min Confidence</span>
          <div className="flex items-center gap-1 pt-0.5">
            {[70, 75, 80, 85].map(thresh => (
              <button
                key={thresh}
                onClick={() => handleChangeCryptoConfidence(thresh)}
                className={`px-1.5 py-0.5 rounded text-[8px] font-bold transition-all cursor-pointer ${
                  cryptoMinConfidence === thresh 
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50' 
                    : 'text-slate-500 hover:text-white'
                }`}
              >
                {thresh}%
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white/[0.03] p-1.5 rounded flex flex-col">
          <span className="text-slate-400 text-[8px] uppercase">Trade Sizing (USD)</span>
          <div className="flex items-center gap-1 pt-0.5">
            {[250, 500, 1000].map(amt => (
              <button
                key={amt}
                onClick={() => handleChangeCryptoNotional(amt)}
                className={`px-1.5 py-0.5 rounded text-[8px] font-bold transition-all cursor-pointer ${
                  cryptoNotionalUsd === amt 
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50' 
                    : 'text-slate-500 hover:text-white'
                }`}
              >
                ${amt}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white/[0.03] p-1.5 rounded flex flex-col">
          <span className="text-slate-400 text-[8px] uppercase">Operating Hours</span>
          <span className="mt-0.5 text-[8px] font-mono text-cyan-300 font-bold truncate">
            24/7/365 UNRESTRICTED
          </span>
        </div>
      </div>

      {/* Active Liquid Crypto Assets Monitored Universe */}
      <div className="mt-2 pt-2 border-t border-white/5 flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-[8px] text-slate-400">
          <span className="uppercase font-bold tracking-wider text-cyan-300 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Monitored Crypto Universe ({cryptoActiveMonitors.length || 20} High-Momentum Assets)
          </span>
          <span className="text-slate-500 text-[7.5px]">Option B + Top Tradable Tokens</span>
        </div>
        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto no-scrollbar p-1 rounded bg-black/40 border border-white/5">
          {(cryptoActiveMonitors.length > 0 ? cryptoActiveMonitors : [
            "BTC", "ETH", "SOL", "DOGE", "XRP", "AVAX", "LINK", "ADA", "AAVE",
            "RENDER", "UNI", "LTC", "DOT", "ARB", "ONDO", "PEPE", "SHIB", "BONK", "WIF", "BCH"
          ]).map(sym => (
            <button
              key={sym}
              type="button"
              onClick={() => onSelectTicker && onSelectTicker(sym)}
              className={`text-[8px] font-mono px-1.5 py-0.5 rounded border transition-all cursor-pointer flex items-center gap-1 ${
                data?.ticker === sym 
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold shadow-[0_0_8px_rgba(6,182,212,0.3)]' 
                  : 'bg-white/[0.03] text-slate-400 border-white/5 hover:border-white/20 hover:text-white'
              }`}
              title={`Load ${sym} Crypto Intelligence`}
            >
              <span>{sym}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Crypto Executed Orders Log */}
      {cryptoLastTrades.length > 0 && (
        <div className="mt-2 pt-2 border-t border-white/5 flex flex-col gap-1">
          <div className="flex justify-between items-center text-[8px] text-slate-400">
            <span className="uppercase font-bold tracking-wider text-cyan-300">Crypto Executions ({cryptoLastTrades.length})</span>
            <span className="text-[7.5px] text-slate-500">Autonomous Alpaca Executions</span>
          </div>
          <div className="max-h-24 overflow-y-auto no-scrollbar flex flex-col gap-1">
            {cryptoLastTrades.map(log => (
              <div key={log.id} className="text-[8px] bg-black/40 p-1.5 rounded border border-white/5 flex justify-between items-center font-mono">
                <div className="flex items-center gap-1.5">
                  <span className={`px-1 py-0.2 rounded font-bold ${log.side?.includes('BUY') ? 'bg-cyan-500/20 text-cyan-300' : 'bg-neon-red/20 text-neon-red'}`}>
                    {log.side} {log.symbol}
                  </span>
                  {log.notional && (
                    <span className="text-white font-bold">${log.notional} USD</span>
                  )}
                  {log.price && (
                    <span className="text-slate-300">@ ${log.price}</span>
                  )}
                  {log.pnl_pct && (
                    <span className={log.pnl_pct.startsWith('+') ? 'text-neon-green font-bold' : 'text-neon-red font-bold'}>
                      {log.pnl_pct} ({log.reason || 'Closed'})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <span className="text-neon-gold">{log.mode || 'ALPACA 24/7'}</span>
                  <span>{log.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderOptionsCard = () => (
    <div id="algo-copilot-card" className={`p-2.5 rounded-lg border transition-all ${
      autoPilotEnabled 
        ? 'bg-black/85 border-neon-green/60 shadow-[0_0_20px_rgba(0,255,163,0.15)]' 
        : 'bg-black/40 border-white/10'
    }`}>
      <div className="flex justify-between items-center pb-2 border-b border-white/10">
        <div className="flex items-center gap-1.5">
          <Bot size={13} className={autoPilotEnabled ? 'text-neon-green animate-pulse' : 'text-slate-400'} />
          <span className="text-[10px] font-bold tracking-wider uppercase text-white flex items-center gap-1">
            AI Quant Autonomous Co-Pilot (24/7 Cloud)
            <HelpButton cardId="algo" title="Explain AI Quant Autonomous Trade Co-Pilot" />
          </span>
          <span className={`text-[8px] px-1.5 py-0.2 rounded font-bold uppercase flex items-center gap-1 ${
            autoPilotEnabled ? 'bg-neon-green/20 text-neon-green border border-neon-green/40' : 'bg-white/5 text-slate-500'
          }`}>
            {autoPilotEnabled && <Radio size={8} className="animate-ping" />}
            {autoPilotEnabled ? (optionsOnly ? 'ARMED (OPTIONS 100x)' : 'ARMED (SHARES)') : 'STANDBY'}
          </span>
        </div>
        
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleFlattenOptions}
            disabled={isFlatteningOptions}
            title="Immediately liquidate and flatten all open options contracts (EOD 15:50 ET Rule)"
            className="px-2 py-1 rounded text-[9px] font-bold bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck size={10} className={isFlatteningOptions ? "animate-spin" : ""} />
            <span>{isFlatteningOptions ? "CLOSING..." : "🛡️ FLATTEN OPTIONS"}</span>
          </button>

          <button
            onClick={handleTriggerNow}
            disabled={isEvaluatingNow}
            title="Force immediate algorithmic evaluation and execute bracket order if criteria met"
            className="px-2 py-1 rounded text-[9px] font-bold bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={9} className={isEvaluatingNow ? "animate-spin" : ""} />
            <span>{isEvaluatingNow ? "RUNNING..." : "⚡ EVALUATE NOW"}</span>
          </button>

          <button
            onClick={handleToggleCopilot}
            className={`px-2.5 py-1 rounded text-[9px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
              autoPilotEnabled 
                ? 'bg-neon-red/20 text-neon-red border border-neon-red/40 hover:bg-neon-red/30' 
                : 'bg-neon-green/20 text-neon-green border border-neon-green/40 hover:bg-neon-green/30'
            }`}
          >
            {autoPilotEnabled ? <Square size={9} fill="currentColor" /> : <Play size={9} fill="currentColor" />}
            <span>{autoPilotEnabled ? 'DISARM' : 'ARM CO-PILOT'}</span>
          </button>
        </div>
      </div>

      {/* Cloud Daemon Telemetry Banner */}
      <div className="mt-1.5 px-2 py-1 bg-white/[0.02] rounded border border-white/5 flex items-center justify-between text-[8px] font-mono text-slate-400">
        <span className="truncate">{copilotStatusMsg}</span>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <span className={`px-1.5 py-0.2 rounded font-bold border text-[8px] ${
            activePositionsCount >= maxConcurrentPositions
              ? 'bg-neon-red/20 text-neon-red border-neon-red/40'
              : 'bg-neon-green/20 text-neon-green border-neon-green/40'
          }`} title="Strict Portfolio Limit: 5 positions max open at any time (6 for A+ Sure Trades)">
            🛡️ {activePositionsCount}/{maxConcurrentPositions} POS MAX
          </span>
          <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/40 font-bold text-[8px]" title="A+ High-Conviction (≥85%) trades bypass cooldown and can use reserve slot or reallocate stagnant trades">
            ⚡ A+ PRIORITY PASS
          </span>
          <span className={`px-1.5 py-0.2 rounded font-bold border text-[8px] ${
            dailyTradesCount >= maxDailyTrades
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
          }`} title="Daily Trade Cap: 8 trades max per day to prevent overtrading">
            ⚡ {dailyTradesCount}/{maxDailyTrades} TRADES
          </span>
          <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-300 border border-red-500/40 font-bold text-[8px]" title="Hard Cutoff: No new options or equities opened past 3:30 PM ET">
            ⛔ 15:30 ET CUTOFF
          </span>
          {optionsOnly && (
            <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold text-[8px]">
              15:50 ET EXIT
            </span>
          )}
          <span className="text-neon-gold text-[8px]">Alpaca #PA3AZT2ZU9IT</span>
        </div>
      </div>

      {/* Co-Pilot Parameters Row */}
      <div className="grid grid-cols-4 gap-2 pt-2 text-[9px]">
        <div className="bg-white/[0.03] p-1.5 rounded flex flex-col">
          <span className="text-slate-400 text-[8px] uppercase">Min Confidence</span>
          <div className="flex items-center gap-1 pt-0.5">
            {[70, 75, 80, 85].map(thresh => (
              <button
                key={thresh}
                onClick={() => handleChangeConfidence(thresh)}
                className={`px-1.5 py-0.5 rounded text-[8px] font-bold transition-all cursor-pointer ${
                  minConfidenceThreshold === thresh 
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50' 
                    : 'text-slate-500 hover:text-white'
                }`}
              >
                {thresh}%
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white/[0.03] p-1.5 rounded flex flex-col">
          <span className="text-slate-400 text-[8px] uppercase">Asset Mode</span>
          <button
            onClick={handleToggleOptionsOnly}
            title="Toggle between Options Only contracts and buying underlying shares"
            className={`mt-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold border transition-all text-left cursor-pointer ${
              optionsOnly
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' 
                : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
            }`}
          >
            {optionsOnly ? 'OPTIONS (100x)' : 'SHARES'}
          </button>
        </div>

        <div className="bg-white/[0.03] p-1.5 rounded flex flex-col">
          <span className="text-slate-400 text-[8px] uppercase">Routing</span>
          <button
            onClick={handleToggleSimulation}
            className={`mt-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold border transition-all text-left cursor-pointer ${
              isSimulated 
                ? 'bg-neon-gold/20 text-neon-gold border-neon-gold/40' 
                : 'bg-neon-green/20 text-neon-green border-neon-green/40'
            }`}
          >
            {isSimulated ? 'OFFLINE SIM' : 'ALPACA PAPER'}
          </button>
        </div>

        <div className="bg-white/[0.03] p-1.5 rounded flex flex-col">
          <span className="text-slate-400 text-[8px] uppercase">Co-Pilot Trigger</span>
          <span className="mt-0.5 text-[8px] font-mono text-slate-300 truncate">
            {autoPilotEnabled ? (
              data.confidence >= minConfidenceThreshold 
                ? <span className="text-neon-green font-bold">READY ({data.confidence}%)</span> 
                : <span className="text-slate-400">SCAN ({data.confidence}% &lt; {minConfidenceThreshold}%)</span>
            ) : (
              <span className="text-slate-500">MANUAL ONLY</span>
            )}
          </span>
        </div>
      </div>

      {/* Active Liquid Assets Monitored Universe */}
      <div className="mt-2 pt-2 border-t border-white/5 flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-[8px] text-slate-400">
          <span className="uppercase font-bold tracking-wider text-cyan-300 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Monitored Liquid Assets Universe ({monitoredSymbols.length || 52} Options Leaders)
          </span>
          <span className="text-slate-500 text-[7.5px]">Click any asset to load &amp; analyze</span>
        </div>
        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto no-scrollbar p-1 rounded bg-black/40 border border-white/5">
          {(monitoredSymbols.length > 0 ? monitoredSymbols : [
            "SPY", "QQQ", "IWM", "DIA", "SMH", "XLF", "XLE", "XLK", "TLT", "IBIT", "GLD", "SLV",
            "NVDA", "AAPL", "TSLA", "MSFT", "AMZN", "META", "GOOGL", "NFLX", "ORCL", "CRM",
            "AMD", "AVGO", "TSM", "SMCI", "MU", "ARM", "INTC", "QCOM", "TXN",
            "PLTR", "COIN", "MSTR", "MARA", "SOFI", "UBER", "HOOD", "AFRM", "APP", "RDDT", "SHOP", "SNOW", "DKNG",
            "JPM", "BAC", "GS", "V", "MA", "DIS", "BABA", "BA", "XOM", "CAT", "LLY"
          ]).map(sym => {
            const p = tape?.[sym]?.price;
            const priceStr = p !== undefined && p !== null && Number(p) > 0 
              ? (Number(p) < 5 ? `$${Number(p).toFixed(2)}` : `$${Number(p).toFixed(1)}`) 
              : '';
            return (
              <button
                key={sym}
                type="button"
                onClick={() => onSelectTicker && onSelectTicker(sym)}
                className={`text-[8px] font-mono px-1.5 py-0.5 rounded border transition-all cursor-pointer flex items-center gap-1 ${
                  data?.ticker === sym 
                    ? 'bg-neon-green/20 text-neon-green border-neon-green/50 font-bold shadow-[0_0_8px_rgba(0,255,163,0.3)]' 
                    : 'bg-white/[0.03] text-slate-400 border-white/5 hover:border-white/20 hover:text-white'
                }`}
                title={`Load ${sym} Options Matrix, GEX Walls & Tape`}
              >
                <span>{sym}</span>
                {priceStr && <span className="text-slate-200">{priceStr}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Co-Pilot Recent Auto-Executions Log */}
      {coPilotLogs.length > 0 && (
        <div className="mt-2 pt-2 border-t border-white/5 flex flex-col gap-1">
          <div className="flex justify-between items-center text-[8px] text-slate-400">
            <span className="uppercase font-bold tracking-wider">Executed Tickets ({coPilotLogs.length})</span>
            <button 
              onClick={() => setCoPilotLogs([])} 
              className="hover:text-neon-red text-[8px] transition-colors cursor-pointer"
            >
              Clear Tickets
            </button>
          </div>
          <div className="max-h-24 overflow-y-auto no-scrollbar flex flex-col gap-1">
            {coPilotLogs.map(log => (
              <div key={log.id} className="text-[8px] bg-black/40 p-1.5 rounded border border-white/5 flex justify-between items-center font-mono">
                <div className="flex items-center gap-1.5">
                  <span className={`px-1 py-0.2 rounded font-bold ${log.side === 'BUY' || log.side === 'CALL' ? 'bg-neon-green/20 text-neon-green' : 'bg-neon-red/20 text-neon-red'}`}>
                    {log.side} {log.symbol}
                  </span>
                  {log.strike && (
                    <span className="text-purple-300">${log.strike} {log.expiry}</span>
                  )}
                  <span className="text-slate-300">${log.price}</span>
                  <span className="text-slate-500">TP ${log.tp} · SL ${log.sl}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <span className="text-neon-gold">{log.mode}</span>
                  <span>{log.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-3 font-mono">
      {/* ---------------- 1. EXECUTIVE CO-PILOT COMMAND CONTROLS (ALWAYS VISIBLE AT TOP) ---------------- */}
      <div className="flex flex-col gap-1.5">
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-black/80 border border-white/10 text-[10px]">
          <button
            id="tab-btn-crypto-copilot"
            onClick={() => setActiveSubTab('crypto')}
            className={`py-2 px-2.5 rounded-md font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSubTab === 'crypto'
                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.35)]'
                : 'text-slate-400 hover:text-white bg-white/[0.02]'
            }`}
          >
            <Coins size={13} className={cryptoArmed ? "text-cyan-400 animate-pulse" : ""} />
            <span>⚡ 24/7 CRYPTO DAEMON</span>
            <span className={`text-[8.5px] px-1.5 py-0.2 rounded font-bold ${cryptoArmed ? "bg-cyan-500/30 text-cyan-200" : "bg-white/10 text-slate-500"}`}>
              {cryptoArmed ? "ARMED ($500)" : "STANDBY"}
            </span>
          </button>

          <button
            id="tab-btn-options-copilot"
            onClick={() => setActiveSubTab('options')}
            className={`py-2 px-2.5 rounded-md font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSubTab === 'options'
                ? 'bg-neon-green/25 text-neon-green border border-neon-green/60 shadow-[0_0_15px_rgba(0,255,163,0.3)]'
                : 'text-slate-400 hover:text-white bg-white/[0.02]'
            }`}
          >
            <Bot size={13} className={autoPilotEnabled ? "text-neon-green animate-pulse" : ""} />
            <span>🤖 0DTE OPTIONS CO-PILOT</span>
            <span className={`text-[8.5px] px-1.5 py-0.2 rounded font-bold ${autoPilotEnabled ? "bg-neon-green/30 text-neon-green" : "bg-white/10 text-slate-500"}`}>
              {autoPilotEnabled ? "ARMED" : "STANDBY"}
            </span>
          </button>
        </div>

        {/* Dedicated Active Co-Pilot Card immediately rendered right here at top */}
        {activeSubTab === 'crypto' ? renderCryptoCard() : renderOptionsCard()}
      </div>

      {/* Top RSI Status Badge & 1-Click Evolve Trigger */}
      <div className="flex items-center justify-between text-[10px] bg-black/60 px-2.5 py-1.5 rounded border border-white/10">
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1 text-neon-green font-bold">
            <Dna size={12} className="text-neon-green animate-pulse" />
            <span>GEN-{data.learning?.generation ?? 18} RSI</span>
            <HelpButton cardId="algo" title="Explain Recursive Self-Improvement (RSI) Engine" />
          </span>
          <span className="text-slate-400 text-[9px] hidden sm:inline">
            ({data.learning?.accuracy || '63.2%'} · {data.learning?.tested_samples || 231} samples)
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {evolutionToast ? (
            <span className="text-neon-green text-[9px] animate-pulse font-bold">{evolutionToast}</span>
          ) : (
            <button
              onClick={handleTriggerEvolution}
              disabled={evolvingGeneration}
              className="px-2 py-0.5 rounded bg-neon-green/15 border border-neon-green/40 hover:bg-neon-green/30 text-neon-green text-[9px] font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="Trigger simulated walk-forward Recursive Self-Improvement cycle to evolve model generation"
            >
              <RefreshCw size={10} className={evolvingGeneration ? "animate-spin" : ""} />
              <span>{evolvingGeneration ? "EVOLVING GEN..." : "⚡ EVOLVE NEXT GEN"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Upgrade 4: 0DTE Session Phase & Power Hour Gamma Acceleration Banner */}
      {powerHour && (
        <div className={`p-2 rounded-lg border text-[10px] flex items-center justify-between transition-all ${
          powerHour.is_power_hour 
            ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)]' 
            : 'bg-black/50 border-white/10 text-slate-300'
        }`}>
          <div className="flex items-center gap-2">
            <Clock size={12} className={powerHour.is_power_hour ? 'text-amber-400 animate-spin' : 'text-slate-400'} />
            <div>
              <div className="font-bold flex items-center gap-1.5">
                <span className={powerHour.is_power_hour ? 'text-amber-400' : 'text-white'}>
                  {powerHour.phase}
                </span>
                {powerHour.gamma_acceleration_multiplier > 1.0 && (
                  <span className="px-1 py-0.2 rounded text-[8px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                    {powerHour.gamma_acceleration_multiplier}x GAMMA
                  </span>
                )}
                <HelpButton cardId="algo" title="Explain 0DTE Power Hour Dynamics" />
              </div>
              <div className="text-[9px] text-slate-400 font-sans">{powerHour.time_desc}</div>
            </div>
          </div>
          <div className="text-right">
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${
              powerHour.is_pinning 
                ? 'bg-neon-gold/20 text-neon-gold border-neon-gold/40' 
                : 'bg-white/5 text-slate-400 border-white/10'
            }`}>
              {powerHour.pin_risk_alert.split(':')[0]}
            </span>
          </div>
        </div>
      )}

      {/* Markov Dynamic State & Model Bias Card */}
      <div className={`p-3 rounded-lg border ${stateBorder} transition-all`}>
        <div className="flex justify-between items-start">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center">
              Markov Dynamic State
              <HelpButton cardId="algo" title="Explain Markov States & Trade Regimes" />
            </div>
            <div className={`text-base font-black ${stateColor} tracking-wide`}>{data.markov_state}</div>
            <div className="text-[10px] text-slate-300 font-sans mt-0.5">{data.regime_sub}</div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase">Model Conf</span>
            <div className="text-lg font-bold text-white">{data.confidence}%</div>
          </div>
        </div>

        {/* Confidence Bar */}
        <div className="w-full h-1.5 bg-black/50 rounded-full mt-2 overflow-hidden border border-white/5">
          <div
            className={`h-full transition-all duration-1000 ${isBull ? 'bg-neon-green' : isBear ? 'bg-neon-red' : 'bg-neon-gold'}`}
            style={{ width: `${data.confidence}%` }}
          />
        </div>
      </div>

      {/* Upgrades 1 & 3: 25-Delta IV Skew & Intraday CVD Order Flow Grid */}
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        {/* Upgrade 1: 25-Delta Put/Call IV Skew Barometer */}
        <div className="p-2 rounded-lg bg-black/60 border border-white/10 flex flex-col gap-1">
          <div className="flex justify-between items-center pb-1 border-b border-white/10">
            <span className="text-[9px] uppercase font-bold text-amber-400 flex items-center gap-1">
              <Activity size={11} className="text-amber-400" /> 25Δ IV Skew
              <HelpButton cardId="algo" title="Explain 25-Delta Put/Call IV Skew" />
            </span>
            <span className="font-mono font-bold text-white">
              {skew ? `${skew.skew_pct > 0 ? '+' : ''}${skew.skew_pct}%` : '--'}
            </span>
          </div>
          <div className="text-[8px] text-slate-300 font-sans leading-tight mt-0.5">
            {skew ? skew.signal : 'Orderly options volatility skew'}
          </div>
          {skew && skew.put_iv && skew.call_iv && (
            <div className="flex justify-between text-[8px] text-slate-400 pt-0.5 font-mono">
              <span>Put IV: {skew.put_iv}%</span>
              <span>Call IV: {skew.call_iv}%</span>
            </div>
          )}
        </div>

        {/* Upgrade 3: Intraday Bid-Ask Flow Delta (CVD) */}
        <div className="p-2 rounded-lg bg-black/60 border border-white/10 flex flex-col gap-1">
          <div className="flex justify-between items-center pb-1 border-b border-white/10">
            <span className="text-[9px] uppercase font-bold text-purple-400 flex items-center gap-1">
              <BarChart3 size={11} className="text-purple-400" /> Order Flow (CVD)
              <HelpButton cardId="algo" title="Explain Cumulative Volume Delta (CVD)" />
            </span>
            <span className={`font-mono font-bold ${
              cvd && cvd.cvd_ratio > 0 ? 'text-neon-green' : cvd && cvd.cvd_ratio < 0 ? 'text-neon-red' : 'text-slate-300'
            }`}>
              {cvd ? `${cvd.cvd_ratio > 0 ? '+' : ''}${cvd.cvd_ratio}%` : '0.0%'}
            </span>
          </div>
          <div className="text-[8px] text-slate-300 font-sans leading-tight mt-0.5 truncate">
            {cvd ? cvd.divergence : 'Balanced two-way liquidity'}
          </div>
          {cvd && (
            <div className="flex justify-between text-[8px] text-slate-400 pt-0.5 font-mono">
              <span>Dominant:</span>
              <span className={cvd.dominant_side.includes('BUY') ? 'text-neon-green' : cvd.dominant_side.includes('SELL') ? 'text-neon-red' : 'text-slate-300'}>
                {cvd.dominant_side.split(' ')[0]}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Renaissance Upgrade: Macro Cross-Asset Lead-Lag Barometer (Bonds & US Dollar) */}
      {data.cross_asset_lead_lag && (
        <div className="p-2 rounded-lg bg-black/60 border border-blue-500/30 flex flex-col gap-1.5 shadow-[0_0_12px_rgba(59,130,246,0.1)]">
          <div className="flex justify-between items-center pb-1 border-b border-white/10">
            <span className="text-[9px] uppercase font-bold text-blue-400 flex items-center gap-1">
              <Activity size={11} className="text-blue-400" /> Macro Cross-Asset Lead-Lag (Bonds & DXY)
              <HelpButton cardId="algo" title="Explain Renaissance Macro Lead-Lag" />
            </span>
            <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold border ${
              data.cross_asset_lead_lag.feature_val >= 0.8
                ? 'bg-neon-green/20 text-neon-green border-neon-green/40'
                : data.cross_asset_lead_lag.feature_val <= -0.8
                ? 'bg-neon-red/20 text-neon-red border-neon-red/40'
                : 'bg-white/5 text-slate-300 border-white/10'
            }`}>
              {data.cross_asset_lead_lag.lead_lag_state}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[8px] font-mono">
            <div className="bg-white/[0.03] p-1.5 rounded">
              <span className="text-slate-400 block text-[7px] uppercase">10Y Yield Discovery</span>
              <strong className={data.cross_asset_lead_lag['10y_yield_delta'] > 0 ? 'text-neon-red' : 'text-neon-green'}>
                {data.cross_asset_lead_lag['10y_yield_delta'] > 0 ? '+' : ''}{data.cross_asset_lead_lag['10y_yield_delta']}% · {data.cross_asset_lead_lag['10y_bias']}
              </strong>
            </div>
            <div className="bg-white/[0.03] p-1.5 rounded">
              <span className="text-slate-400 block text-[7px] uppercase">US Dollar (DXY)</span>
              <strong className={data.cross_asset_lead_lag.dxy_delta > 0 ? 'text-neon-red' : 'text-neon-green'}>
                {data.cross_asset_lead_lag.dxy_delta > 0 ? '+' : ''}{data.cross_asset_lead_lag.dxy_delta}% · {data.cross_asset_lead_lag.dxy_bias}
              </strong>
            </div>
            <div className="bg-white/[0.03] p-1.5 rounded">
              <span className="text-slate-400 block text-[7px] uppercase">Curve (10Y-2Y)</span>
              <strong className="text-amber-300">
                {data.cross_asset_lead_lag.curve_spread_bps} bps
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* 0DTE Dealer Delta Re-Hedging & Vanna Decay Card */}
      {hedging && (
        <div className="p-2.5 rounded-lg bg-black/60 border border-cyan-500/30 text-[10px] flex flex-col gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.1)]">
          <div className="flex justify-between items-center pb-1 border-b border-white/10">
            <span className="text-[10px] uppercase font-bold text-cyan-400 flex items-center gap-1">
              <Zap size={12} className="text-cyan-400" /> 0DTE Dealer Delta Velocity
              <HelpButton cardId="algo" title="Explain Dealer Delta Re-Hedging" />
            </span>
            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
              hedging.mode.includes('BUY') 
                ? 'bg-neon-green/20 text-neon-green border-neon-green/40' 
                : 'bg-neon-red/20 text-neon-red border-neon-red/40'
            }`}>
              {hedging.mode}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <div className="bg-white/[0.03] p-1.5 rounded">
              <span className="text-slate-400 block text-[9px]">DELTA FLOW RATE</span>
              <strong className={`text-xs font-bold ${hedging.flow_rate.startsWith('+') ? 'text-neon-green' : 'text-neon-red'}`}>
                {hedging.flow_rate}
              </strong>
            </div>
            <div className="bg-white/[0.03] p-1.5 rounded">
              <span className="text-slate-400 block text-[9px]">HEDGE VELOCITY</span>
              <strong className="text-white text-xs font-bold">
                {hedging.hedge_velocity}
              </strong>
            </div>
          </div>

          <div className="text-[9px] text-slate-300 font-sans italic bg-white/[0.02] p-1 rounded border border-white/5">
            ⚡ {hedging.vanna_drift}
          </div>
        </div>
      )}

      {/* Actionable Execution Setup & Upgrade 2: ATR Dynamic Trailing Stops */}
      <div className="p-3 rounded-lg bg-black/50 border border-white/10 flex flex-col gap-2">
        <div className="flex justify-between items-center pb-1.5 border-b border-white/10">
          <span className="text-[10px] uppercase tracking-wider text-neon-gold font-bold flex items-center gap-1">
            <Target size={12} /> Recommended Execution
            <HelpButton cardId="algo" title="Explain Recommended Execution & Bracket Orders" />
          </span>
          <div className="flex items-center gap-1.5">
            {setup && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                Kelly: {setup.kelly_sizing}
              </span>
            )}
            <span className="text-[10px] px-2 py-0.5 rounded bg-neon-green/20 text-neon-green border border-neon-green/30 font-bold">
              Win Prob {data.win_probability}
            </span>
          </div>
        </div>

        <div className="text-sm font-bold text-white tracking-wide">
          {data.action}
        </div>

        {/* Upgrade 2: ATR Volatility-Regime Trailing Stop Callout */}
        {atr && (
          <div className="flex items-center justify-between text-[9px] bg-white/[0.03] px-2 py-1 rounded border border-white/5">
            <span className="text-slate-400">
              ATR(14): <strong className="text-white">${atr.atr_14.toFixed(2)}</strong> ({atr.atr_pct}%)
            </span>
            <span className="text-amber-400 font-bold">
              Regime: {atr.regime}
            </span>
            <span className="text-slate-400">
              Step: <strong className="text-neon-green">${atr.trailing_step.toFixed(2)}</strong>
            </span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 text-[10px] pt-1">
          <div className="bg-white/5 p-1.5 rounded">
            <span className="text-slate-400 block text-[9px] uppercase">Entry Zone</span>
            <strong className="text-white text-[11px]">{data.entry_zone}</strong>
          </div>
          <div className="bg-white/5 p-1.5 rounded">
            <span className="text-slate-400 block text-[9px] uppercase">Target (TP)</span>
            <strong className="text-neon-green text-[11px]">{data.take_profit}</strong>
          </div>
          <div className="bg-white/5 p-1.5 rounded">
            <span className="text-slate-400 block text-[9px] uppercase">Stop Loss</span>
            <strong className="text-neon-red text-[11px]">{data.stop_loss}</strong>
          </div>
        </div>

        <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
          <span>R:R Ratio: <strong className="text-white">{data.risk_reward}</strong></span>
          <span>Pivot Ref: <strong className="text-neon-gold">${data.pivot.toFixed(2)}</strong></span>
        </div>

        {/* ---------------- LIVE DAILY INCOME & QUANT PERFORMANCE DASHBOARD ---------------- */}
        <div className="p-3 rounded-lg border bg-gradient-to-br from-black/90 via-[#0a0f1d] to-black/90 border-cyan-500/30 shadow-[0_0_25px_rgba(6,182,212,0.15)] flex flex-col gap-2">
          <div className="flex justify-between items-center pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                <DollarSign size={14} />
              </div>
              <div>
                <div className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span>Daily Income & Performance Ledger</span>
                  <span className="text-[8px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                    {pnlAnalytics.date_et || 'TODAY ET'}
                  </span>
                </div>
                <div className="text-[8px] text-slate-400 font-mono">
                  Real-time realized income & automated safety shields
                </div>
              </div>
            </div>

            {/* Circuit Breaker Status Pill */}
            <div className="flex items-center gap-1.5">
              {circuitBreakerStatus === 'TARGET_REACHED' ? (
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-neon-green/20 text-neon-green border border-neon-green/50 text-[9px] font-bold flex items-center gap-1 shadow-[0_0_12px_rgba(0,255,163,0.3)]">
                    <Award size={10} />
                    <span>GOAL MET · PROFITS LOCKED</span>
                  </span>
                  <button
                    onClick={handleToggleCopilot}
                    className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[8px] font-bold hover:bg-cyan-500/30 transition-all cursor-pointer"
                    title="Override daily target and resume automated scanning"
                  >
                    OVERRIDE & RESUME
                  </button>
                </div>
              ) : circuitBreakerStatus === 'MAX_LOSS_HALTED' ? (
                <span className="px-2 py-0.5 rounded bg-neon-red/20 text-neon-red border border-neon-red/50 text-[9px] font-bold flex items-center gap-1">
                  <AlertCircle size={10} />
                  <span>MAX LOSS HALT · CASH PRESERVED</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[9px] font-mono flex items-center gap-1">
                  <ShieldCheck size={10} className="text-emerald-400" />
                  <span>CIRCUIT BREAKER: ACTIVE</span>
                </span>
              )}
            </div>
          </div>

          {/* Metric KPIs Grid */}
          <div className="grid grid-cols-4 gap-2 pt-1 font-mono">
            {/* Today's Realized Income */}
            <div className="p-2 rounded bg-white/[0.03] border border-white/5 flex flex-col">
              <span className="text-[8px] uppercase text-slate-400">Today's Realized Income</span>
              <div className={`text-base font-black tracking-tight flex items-center gap-1 ${
                pnlAnalytics.today_realized_pnl > 0 ? 'text-neon-green' : pnlAnalytics.today_realized_pnl < 0 ? 'text-neon-red' : 'text-slate-200'
              }`}>
                {pnlAnalytics.today_realized_pnl >= 0 ? '+' : ''}${pnlAnalytics.today_realized_pnl.toFixed(2)}
              </div>
              <span className="text-[8px] text-slate-500">
                Target: ${dailyProfitTarget.toFixed(0)}/day
              </span>
            </div>

            {/* Today's Win Rate */}
            <div className="p-2 rounded bg-white/[0.03] border border-white/5 flex flex-col">
              <span className="text-[8px] uppercase text-slate-400">Day Win Rate</span>
              <div className="text-base font-black text-cyan-300 tracking-tight">
                {pnlAnalytics.today_trades > 0 ? `${pnlAnalytics.today_win_rate}%` : '100%'}
              </div>
              <span className="text-[8px] text-slate-500">
                {pnlAnalytics.today_wins}W - {pnlAnalytics.today_losses}L ({pnlAnalytics.today_trades} trades)
              </span>
            </div>

            {/* All-Time Realized PnL */}
            <div className="p-2 rounded bg-white/[0.03] border border-white/5 flex flex-col">
              <span className="text-[8px] uppercase text-slate-400">Cumulative PnL</span>
              <div className={`text-base font-black tracking-tight ${
                pnlAnalytics.total_realized_pnl >= 0 ? 'text-neon-green' : 'text-neon-red'
              }`}>
                {pnlAnalytics.total_realized_pnl >= 0 ? '+' : ''}${pnlAnalytics.total_realized_pnl.toFixed(2)}
              </div>
              <span className="text-[8px] text-slate-500">
                Profit Factor: {pnlAnalytics.profit_factor}x
              </span>
            </div>

            {/* Risk/Reward Performance */}
            <div className="p-2 rounded bg-white/[0.03] border border-white/5 flex flex-col">
              <span className="text-[8px] uppercase text-slate-400">Avg Win / Loss</span>
              <div className="text-xs font-bold text-slate-200 pt-1">
                <span className="text-neon-green">+${pnlAnalytics.avg_win.toFixed(0)}</span> / <span className="text-neon-red">-${pnlAnalytics.avg_loss.toFixed(0)}</span>
              </div>
              <span className="text-[8px] text-slate-500">
                All-Time Win: {pnlAnalytics.all_time_win_rate}%
              </span>
            </div>
          </div>

          {/* Daily Target Progress Bar */}
          <div className="flex flex-col gap-1 pt-1">
            <div className="flex justify-between items-center text-[8px] font-mono text-slate-400">
              <span>Daily Target Progress</span>
              <span className="text-slate-300 font-bold">
                ${Math.max(0, pnlAnalytics.today_realized_pnl).toFixed(2)} / ${dailyProfitTarget.toFixed(2)} ({Math.min(100, Math.round((Math.max(0, pnlAnalytics.today_realized_pnl) / Math.max(1, dailyProfitTarget)) * 100))}%)
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-neon-green transition-all duration-500 rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, (pnlAnalytics.today_realized_pnl / Math.max(1, dailyProfitTarget)) * 100))}%` }}
              />
            </div>
          </div>

          {/* Institutional Safety Controls Row */}
          <div className="grid grid-cols-2 gap-2 pt-1 text-[9px] border-t border-white/5">
            {/* Breakeven Ratchet Switch */}
            <button
              onClick={handleToggleBreakevenRatchet}
              className={`p-1.5 rounded border text-left transition-all cursor-pointer flex items-center justify-between ${
                breakevenRatchetEnabled 
                  ? 'bg-purple-950/30 border-purple-500/40 text-purple-200' 
                  : 'bg-white/[0.02] border-white/5 text-slate-500'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={12} className={breakevenRatchetEnabled ? 'text-purple-400' : 'text-slate-500'} />
                <div>
                  <strong className="block text-[8px] uppercase tracking-wider">Multi-Stage Scaling &amp; Runner Trail</strong>
                  <span className="text-[7.5px] text-slate-400 block">+15% → Breakeven | +35% → Trim 50% | High-Water Trail</span>
                </div>
              </div>
              <span className={`text-[8px] px-1 py-0.2 rounded font-bold uppercase ${
                breakevenRatchetEnabled ? 'bg-purple-500/30 text-purple-200' : 'bg-white/5 text-slate-500'
              }`}>
                {breakevenRatchetEnabled ? 'ARMED' : 'OFF'}
              </span>
            </button>

            {/* News Safety Filter Switch */}
            <button
              onClick={handleToggleNewsFilter}
              className={`p-1.5 rounded border text-left transition-all cursor-pointer flex items-center justify-between ${
                newsSafetyFilterEnabled 
                  ? 'bg-cyan-950/30 border-cyan-500/40 text-cyan-200' 
                  : 'bg-white/[0.02] border-white/5 text-slate-500'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Zap size={12} className={newsSafetyFilterEnabled ? 'text-cyan-400' : 'text-slate-500'} />
                <div>
                  <strong className="block text-[8px] uppercase tracking-wider">News Sentiment Guard</strong>
                  <span className="text-[7.5px] text-slate-400 block">Blocks trades into counter-trend news/probes</span>
                </div>
              </div>
              <span className={`text-[8px] px-1 py-0.2 rounded font-bold uppercase ${
                newsSafetyFilterEnabled ? 'bg-cyan-500/30 text-cyan-200' : 'bg-white/5 text-slate-500'
              }`}>
                {newsSafetyFilterEnabled ? 'ARMED' : 'OFF'}
              </span>
            </button>
          </div>

          {/* Quick Target Settings Row */}
          <div className="flex justify-between items-center text-[8px] font-mono text-slate-400 pt-1">
            <div className="flex items-center gap-1.5">
              <span>Daily Goal:</span>
              {[250, 500, 1000].map(val => (
                <button
                  key={val}
                  onClick={() => handleUpdateDailyTarget(val)}
                  className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                    dailyProfitTarget === val ? 'bg-cyan-500/30 text-cyan-300 font-bold border border-cyan-500/40' : 'hover:text-white'
                  }`}
                >
                  ${val}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <span>Max Loss Halt:</span>
              {[150, 300, 500].map(val => (
                <button
                  key={val}
                  onClick={() => handleUpdateMaxLoss(val)}
                  className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                    dailyMaxLoss === val ? 'bg-neon-red/30 text-neon-red font-bold border border-neon-red/40' : 'hover:text-white'
                  }`}
                >
                  ${val}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 1-Click Institutional Bracket Execution Button */}
        {setup && (
          <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
            {/* Option Bracket Specification Card */}
            {setup.option_bracket && (
              <div className="p-2 rounded bg-purple-950/20 border border-purple-500/30 flex flex-col gap-1 text-[9px] font-mono">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-200 font-bold uppercase text-[8px] border border-purple-500/50">
                      OCC OPTION CONTRACT
                    </span>
                    <strong className="text-white text-[10px]">{setup.option_bracket.contract_symbol}</strong>
                  </div>
                  <span className="text-amber-400 font-bold text-[8px]">
                    🛡️ SAME-DAY 15:50 ET EXIT
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 pt-0.5 text-slate-300">
                  <div>Strike: <strong className="text-white">${setup.option_bracket.strike} ({setup.option_bracket.option_type.toUpperCase()})</strong></div>
                  <div>Expiry: <strong className="text-white">{setup.option_bracket.expiry}</strong></div>
                  <div>Est. Premium: <strong className="text-neon-green">${setup.option_bracket.estimated_premium}</strong></div>
                  <div>Cost (1x): <strong className="text-neon-gold">${(setup.option_bracket.estimated_premium * 100).toFixed(2)}</strong></div>
                </div>
                <div className="flex justify-between text-[8px] text-slate-400 pt-0.5 border-t border-white/5">
                  <span>Target (+40%): <strong className="text-neon-green">${setup.option_bracket.take_profit_price}</strong></span>
                  <span>Stop Loss (-25%): <strong className="text-neon-red">${setup.option_bracket.stop_loss_price}</strong></span>
                  <span>Multiplier: <strong className="text-white">100 shares / contract</strong></span>
                </div>
              </div>
            )}

            {!showOrderModal ? (
              <button
                id="btn-execute-bracket"
                onClick={() => setShowOrderModal(true)}
                className={`w-full py-1.5 px-3 rounded-lg border font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(0,255,163,0.15)] transition-all cursor-pointer ${
                  optionsOnly && setup.option_bracket
                    ? 'bg-gradient-to-r from-purple-500/30 to-cyan-500/30 border-purple-500/50 text-white hover:from-purple-500/40 hover:to-cyan-500/40'
                    : 'bg-gradient-to-r from-neon-green/20 to-cyan-500/20 border-neon-green/50 text-white hover:from-neon-green/30 hover:to-cyan-500/30'
                }`}
              >
                <Sparkles size={13} className={optionsOnly ? "text-purple-300" : "text-neon-green"} />
                <span>
                  {optionsOnly && setup.option_bracket
                    ? `⚡ 1-Click Option Bracket (${setup.option_bracket.contract_symbol})`
                    : `⚡ 1-Click Bracket Order (${setup.side.toUpperCase()} ${setup.symbol})`}
                </span>
              </button>
            ) : (
              <div className="p-2.5 rounded bg-black/80 border border-neon-green/40 flex flex-col gap-2 animate-in fade-in">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-neon-green font-bold uppercase flex items-center gap-1">
                    <Send size={11} /> {optionsOnly && setup.option_bracket ? 'Alpaca Option Contract Bracket' : 'Alpaca Equity Bracket Order'}
                  </span>
                  <button 
                    onClick={() => { setShowOrderModal(false); setOrderResult(null); }}
                    className="text-slate-500 hover:text-white"
                  >
                    ✕ Cancel
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <label className="text-slate-400 block text-[9px]">
                      {optionsOnly && setup.option_bracket ? 'QTY (CONTRACTS - 100x MULTIPLIER)' : 'QTY (SHARES)'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={orderQty}
                      onChange={(e) => setOrderQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block text-[9px]">ROUTING MODE</label>
                    <button
                      onClick={() => setIsSimulated(!isSimulated)}
                      className={`w-full py-1 px-2 rounded font-bold border transition-all ${
                        isSimulated 
                          ? 'bg-neon-gold/20 text-neon-gold border-neon-gold/40' 
                          : 'bg-neon-green/20 text-neon-green border-neon-green/40'
                      }`}
                    >
                      {isSimulated ? 'OFFLINE SIMULATION' : 'ALPACA PAPER (LIVE)'}
                    </button>
                  </div>
                </div>

                {optionsOnly && setup.option_bracket ? (
                  <div className="text-[9px] text-slate-300 bg-purple-950/30 border border-purple-500/20 p-1.5 rounded flex flex-col gap-0.5">
                    <div className="flex justify-between text-white font-bold">
                      <span>Contract: {setup.option_bracket.contract_symbol}</span>
                      <span>Total Cost: ${((setup.option_bracket.estimated_premium * 100) * orderQty).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Limit Premium: <strong>${setup.option_bracket.estimated_premium}</strong></span>
                      <span>TP (+40%): <strong className="text-neon-green">${setup.option_bracket.take_profit_price}</strong></span>
                      <span>SL (-25%): <strong className="text-neon-red">${setup.option_bracket.stop_loss_price}</strong></span>
                    </div>
                    <div className="text-amber-400 text-[8px] pt-0.5 font-bold">
                      🛡️ Mandatory EOD rule: Position will auto-flatten at 15:50 ET to prevent overnight decay.
                    </div>
                  </div>
                ) : (
                  <div className="text-[9px] text-slate-300 bg-white/5 p-1.5 rounded flex flex-col gap-0.5">
                    <div className="flex justify-between">
                      <span>Entry Limit: <strong>${setup.entry_price}</strong></span>
                      <span>TP: <strong className="text-neon-green">${setup.take_profit}</strong></span>
                      <span>SL: <strong className="text-neon-red">${setup.stop_loss}</strong></span>
                    </div>
                  </div>
                )}

                {orderResult ? (
                  <div className={`p-2 rounded text-[10px] flex flex-col gap-0.5 ${
                    orderResult.status === 'ERROR' 
                      ? 'bg-neon-red/20 text-neon-red border border-neon-red/40' 
                      : 'bg-neon-green/20 text-neon-green border border-neon-green/40'
                  }`}>
                    <div className="font-bold flex items-center gap-1">
                      {orderResult.status === 'ERROR' ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
                      {orderResult.status}: {orderResult.mode || 'Alpaca Route'}
                    </div>
                    <div className="text-white text-[9px] font-sans">{orderResult.message || orderResult.error}</div>
                  </div>
                ) : (
                  <button
                    onClick={handleExecuteBracket}
                    disabled={orderSubmitting}
                    className="w-full py-1.5 rounded bg-neon-green text-black font-bold text-xs hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    {orderSubmitting 
                      ? 'Routing to Alpaca...' 
                      : optionsOnly && setup.option_bracket
                        ? `Confirm & Transmit ${orderQty}x ${setup.option_bracket.contract_symbol} (Total $${((setup.option_bracket.estimated_premium * 100) * orderQty).toFixed(2)})`
                        : `Confirm & Transmit ${setup.side.toUpperCase()} ${orderQty} ${setup.symbol}`}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Predicted Session Targets */}
      <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
        <div className="p-2 rounded bg-neon-red/10 border border-neon-red/20">
          <span className="text-slate-400 block text-[9px]">TARGET LOW</span>
          <strong className="text-neon-red text-xs font-bold">${data.target_low.toFixed(2)}</strong>
        </div>
        <div className="p-2 rounded bg-neon-gold/10 border border-neon-gold/20">
          <span className="text-slate-400 block text-[9px]">SESSION PIVOT</span>
          <strong className="text-neon-gold text-xs font-bold">${data.pivot.toFixed(2)}</strong>
        </div>
        <div className="p-2 rounded bg-neon-green/10 border border-neon-green/20">
          <span className="text-slate-400 block text-[9px]">TARGET HIGH</span>
          <strong className="text-neon-green text-xs font-bold">${data.target_high.toFixed(2)}</strong>
        </div>
      </div>

      {/* Renaissance Technologies Statistical Arbitrage Cointegration Radar */}
      <div className="p-3 rounded-lg bg-black/60 border border-purple-500/30 flex flex-col gap-2 shadow-[0_0_15px_rgba(168,85,247,0.12)]">
        <div className="flex justify-between items-center pb-1.5 border-b border-white/10">
          <div className="flex items-center gap-1.5">
            <Sparkles size={12} className="text-purple-400" />
            <span className="text-[10px] uppercase font-bold text-white tracking-wider">
              Jim Simons Stat-Arb Radar (30D Cointegration Spreads)
            </span>
            <HelpButton cardId="algo" title="Explain Renaissance Stat-Arb Cointegration" />
          </div>
          <button
            onClick={fetchStatArb}
            disabled={loadingStatArb}
            className="px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/40 hover:bg-purple-500/30 text-purple-300 text-[8px] font-mono transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title="Scan live pair ratios & rolling 30-day z-scores"
          >
            <RefreshCw size={9} className={loadingStatArb ? "animate-spin" : ""} />
            <span>{loadingStatArb ? "SCANNING..." : "SCAN PAIRS"}</span>
          </button>
        </div>

        <div className="text-[8px] text-slate-400 font-sans leading-tight">
          Tracking rolling mean-reversion cointegration z-scores. Spreads with <strong className="text-amber-300">|Z| &ge; 1.8</strong> represent extreme statistical dislocation ready for mean reversion.
        </div>

        <div className="flex flex-col gap-1.5 pt-1">
          {statArbPairs.length === 0 ? (
            <div className="text-[9px] text-slate-500 italic text-center py-2">
              Loading statistical arbitrage pairs...
            </div>
          ) : (
            statArbPairs.map((p) => {
              const isOverbought = p.z_score >= 1.8;
              const isOversold = p.z_score <= -1.8;
              const zColor = isOverbought ? 'text-neon-red' : isOversold ? 'text-neon-green' : 'text-slate-300';
              const zBg = isOverbought 
                ? 'bg-neon-red/15 border-neon-red/40' 
                : isOversold 
                ? 'bg-neon-green/15 border-neon-green/40' 
                : 'bg-white/5 border-white/10';

              return (
                <div 
                  key={p.pair}
                  className="p-2 rounded bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 transition-all flex flex-col gap-1"
                >
                  <div className="flex justify-between items-center text-[9px] font-mono">
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => onSelectTicker?.(p.asset_a)}
                        className="font-bold text-white hover:text-cyan-400 transition-colors cursor-pointer"
                        title={`Select ${p.asset_a}`}
                      >
                        {p.asset_a} (${p.price_a})
                      </button>
                      <span className="text-slate-500">/</span>
                      <button 
                        onClick={() => onSelectTicker?.(p.asset_b)}
                        className="font-bold text-white hover:text-cyan-400 transition-colors cursor-pointer"
                        title={`Select ${p.asset_b}`}
                      >
                        {p.asset_b} (${p.price_b})
                      </button>
                      <span className="text-[8px] text-slate-400 hidden sm:inline font-sans">
                        · {p.description}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 text-[8px]">
                        Ratio: <strong className="text-slate-200">{p.current_ratio}</strong> (Mean: {p.mean_ratio})
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold border ${zBg} ${zColor}`}>
                        Z: {p.z_score > 0 ? '+' : ''}{p.z_score}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[8px] font-mono">
                    <span className="text-slate-400 font-sans truncate">
                      {p.action_bias}
                    </span>
                    <span className={`font-bold shrink-0 ${
                      p.signal.includes('SHORT') || p.signal.includes('LONG') ? 'text-amber-300' : 'text-slate-400'
                    }`}>
                      {p.signal}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Multi-Factor Catalysts & Confluence Drivers */}
      <div className="p-2.5 rounded bg-black/40 border border-white/5 text-[10px]">
        <div className="text-slate-400 uppercase text-[9px] mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Shield size={11} className="text-neon-green" /> Adaptive Confluence Drivers
          </span>
          <HelpButton cardId="algo" title="Explain Multi-Factor Confluence Drivers" />
        </div>
        <ul className="flex flex-col gap-1.5">
          {data.drivers.map((drv, i) => (
            <li key={i} className="flex items-start gap-1.5 text-slate-300 font-sans leading-tight">
              <CheckCircle2 size={11} className="text-neon-green shrink-0 mt-0.5" />
              <span>{drv}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Upgraded RSI Multi-Regime Weights & Autonomous Meta-Learning Audit */}
      {data.learning && (() => {
        const displayWeights = (
          selectedRegime === 'ACTIVE' 
            ? data.learning.weights_dict 
            : data.learning.regime_weights_all?.[selectedRegime]
        ) || data.learning.weights_dict || { gamma: 28, flow: 22, momentum: 16, vanna: 12, skew: 12, cvd: 10 };

        const meta = data.learning.meta_hyperparameters;
        const ics = meta?.information_coefficients;

        return (
          <div className="text-[9px] text-slate-400 bg-black/60 p-2.5 rounded-lg border border-neon-green/30 flex flex-col gap-2 shadow-[0_0_15px_rgba(0,255,163,0.08)]">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-white font-bold flex items-center gap-1.5">
                <Dna size={13} className="text-neon-green" /> 
                <span>{data.learning.calibration_model}</span>
                <HelpButton cardId="algo" title="Explain Dynamic 6-Factor Machine Learning Weights & RSI" />
              </span>
              <span className="text-slate-400">
                <strong className="text-neon-green">{data.learning.target_hits ?? 146} Hits</strong> · <strong className="text-neon-red">{data.learning.stopped_out ?? 85} Stops</strong> ({data.learning.accuracy})
              </span>
            </div>

            {/* Regime Memory Partition Selector */}
            <div className="flex items-center gap-1 bg-black/50 p-0.5 rounded border border-white/5 overflow-x-auto no-scrollbar text-[8px] font-mono">
              <span className="text-slate-500 px-1 shrink-0 uppercase">REGIME MEMORY:</span>
              <button
                onClick={() => setSelectedRegime('ACTIVE')}
                className={`px-1.5 py-0.5 rounded shrink-0 transition-all font-bold ${
                  selectedRegime === 'ACTIVE'
                    ? 'bg-neon-green/20 text-neon-green border border-neon-green/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                LIVE ({data.learning.regime_label || 'NORMAL EQUILIBRIUM'})
              </button>
              <button
                onClick={() => setSelectedRegime('LOW_COMPRESSION')}
                className={`px-1.5 py-0.5 rounded shrink-0 transition-all ${
                  selectedRegime === 'LOW_COMPRESSION'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                LOW COMPRESSION
              </button>
              <button
                onClick={() => setSelectedRegime('NORMAL_EQUILIBRIUM')}
                className={`px-1.5 py-0.5 rounded shrink-0 transition-all ${
                  selectedRegime === 'NORMAL_EQUILIBRIUM'
                    ? 'bg-neon-gold/20 text-neon-gold border border-neon-gold/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                EQUILIBRIUM
              </button>
              <button
                onClick={() => setSelectedRegime('HIGH_EXPANSION')}
                className={`px-1.5 py-0.5 rounded shrink-0 transition-all ${
                  selectedRegime === 'HIGH_EXPANSION'
                    ? 'bg-neon-red/20 text-neon-red border border-neon-red/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                HIGH EXPANSION
              </button>
              <button
                onClick={() => setSelectedRegime('POWER_HOUR')}
                className={`px-1.5 py-0.5 rounded shrink-0 transition-all ${
                  selectedRegime === 'POWER_HOUR'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                POWER HOUR
              </button>
            </div>

            {/* Dynamic 6-Factor Weights Multi-Segment Bar */}
            <div className="flex flex-col gap-1 pt-0.5">
              <div className="grid grid-cols-6 text-[8px] font-mono text-center">
                <span className="text-neon-green">GAMMA {displayWeights.gamma}%</span>
                <span className="text-purple-400">DARK POOL {displayWeights.flow}%</span>
                <span className="text-neon-gold">TREND {displayWeights.momentum}%</span>
                <span className="text-cyan-400">VANNA {displayWeights.vanna}%</span>
                <span className="text-amber-400">SKEW {displayWeights.skew ?? 12}%</span>
                <span className="text-rose-400">CVD {displayWeights.cvd ?? 10}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden flex">
                <div style={{ width: `${displayWeights.gamma}%` }} className="h-full bg-neon-green transition-all duration-700" title={`Gamma ${displayWeights.gamma}%`} />
                <div style={{ width: `${displayWeights.flow}%` }} className="h-full bg-purple-500 transition-all duration-700" title={`Dark Pool ${displayWeights.flow}%`} />
                <div style={{ width: `${displayWeights.momentum}%` }} className="h-full bg-neon-gold transition-all duration-700" title={`Trend ${displayWeights.momentum}%`} />
                <div style={{ width: `${displayWeights.vanna}%` }} className="h-full bg-cyan-400 transition-all duration-700" title={`Vanna ${displayWeights.vanna}%`} />
                <div style={{ width: `${displayWeights.skew ?? 12}%` }} className="h-full bg-amber-400 transition-all duration-700" title={`Skew ${displayWeights.skew ?? 12}%`} />
                <div style={{ width: `${displayWeights.cvd ?? 10}%` }} className="h-full bg-rose-400 transition-all duration-700" title={`CVD ${displayWeights.cvd ?? 10}%`} />
              </div>
            </div>

            {/* Meta-Hyperparameter Self-Tuning Telemetry */}
            {meta && (
              <div className="flex items-center justify-between text-[8px] bg-white/[0.03] px-2 py-1 rounded border border-white/5 font-mono">
                <span className="text-slate-400">
                  Adaptive LR (<span className="text-cyan-300">η</span>): <strong className="text-white">{meta.adaptive_lr}</strong>
                </span>
                <span className="text-slate-400">
                  Momentum (<span className="text-neon-gold">β</span>): <strong className="text-white">{meta.momentum_beta}</strong>
                </span>
                <span className="text-slate-400">
                  Rolling Brier: <strong className="text-neon-green">{meta.rolling_brier}</strong>
                </span>
              </div>
            )}

            {/* Factor Alpha Ranking & Information Coefficients (IC) */}
            {ics && (
              <div className="flex flex-col gap-1 pt-0.5">
                <div className="text-[8px] uppercase tracking-wider text-slate-500 font-bold flex items-center justify-between">
                  <span>Factor Predictive Information Coefficients (IC Alpha)</span>
                  <span className="text-slate-400 font-normal">Rolling Pearson Correlation</span>
                </div>
                <div className="grid grid-cols-6 gap-1 text-[8px] font-mono text-center">
                  {Object.entries(ics).map(([factor, icVal]) => (
                    <div key={factor} className="bg-black/40 p-1 rounded border border-white/5 flex flex-col">
                      <span className="text-slate-400 uppercase text-[7px]">{factor}</span>
                      <strong className={`text-[9px] ${icVal >= 0.35 ? 'text-neon-green' : icVal >= 0 ? 'text-cyan-300' : 'text-neon-red'}`}>
                        {icVal > 0 ? '+' : ''}{Number(icVal).toFixed(2)}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-slate-300 italic font-sans bg-white/[0.03] p-1.5 rounded border border-white/5">
              💡 {data.learning.learning_insight}
            </div>

            {data.learning.kelly_formula && (
              <div className="text-[8px] text-cyan-300 font-mono">
                📐 {data.learning.kelly_formula}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
}
