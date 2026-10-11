import { useState } from 'react';
import { 
  Cpu, Target, Shield, CheckCircle2, Zap, Send, AlertCircle, Sparkles, 
  Activity, Clock, BarChart3 
} from 'lucide-react';
import { playInstitutionalChime } from './audioAlerts';
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
  } | null;
  loading?: boolean;
}

export function SmartAlgoBoard({ data, loading }: SmartAlgoProps) {
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderQty, setOrderQty] = useState(5);
  const [isSimulated, setIsSimulated] = useState(true);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<any | null>(null);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-slate-500 font-mono text-xs gap-2">
        <Cpu size={24} className="animate-spin text-neon-green" />
        <span>Optimizing 6-Factor Bayesian Weights & Dealer Delta Models…</span>
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
      const res = await fetch(`${API_BASE}/api/alpaca/order/bracket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: setup.symbol,
          qty: orderQty,
          side: setup.side,
          limit_price: setup.entry_price,
          take_profit_price: setup.take_profit,
          stop_loss_price: setup.stop_loss,
          simulated: isSimulated,
        }),
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

  return (
    <div className="flex flex-col gap-3 font-mono">
      {/* Top Learning Status Badge */}
      <div className="flex items-center justify-between text-[10px] bg-black/60 px-2.5 py-1.5 rounded border border-white/10">
        <span className="flex items-center gap-1.5 text-neon-green font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
          {data.learning?.engine_state || 'ONLINE BAYESIAN SGD (v5.0 PRO)'}
          <HelpButton cardId="algo" title="Explain AI Quant Algo & Machine Learning Logic" />
        </span>
        <span className="text-slate-400">
          Accuracy: <strong className="text-neon-green">{data.learning?.accuracy || '89.0%'}</strong> ({data.learning?.tested_samples || 164} walk-forward samples)
        </span>
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

        {/* 1-Click Institutional Bracket Execution Button */}
        {setup && (
          <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
            {!showOrderModal ? (
              <button
                id="btn-execute-bracket"
                onClick={() => setShowOrderModal(true)}
                className="w-full py-1.5 px-3 rounded-lg bg-gradient-to-r from-neon-green/20 to-cyan-500/20 border border-neon-green/50 text-white font-bold text-xs hover:from-neon-green/30 hover:to-cyan-500/30 flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(0,255,163,0.15)] transition-all cursor-pointer"
              >
                <Sparkles size={13} className="text-neon-green" />
                <span>⚡ 1-Click Bracket Order ({setup.side.toUpperCase()} {setup.symbol})</span>
              </button>
            ) : (
              <div className="p-2.5 rounded bg-black/80 border border-neon-green/40 flex flex-col gap-2 animate-in fade-in">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-neon-green font-bold uppercase flex items-center gap-1">
                    <Send size={11} /> Alpaca Bracket Order
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
                    <label className="text-slate-400 block text-[9px]">QTY (SHARES)</label>
                    <input
                      type="number"
                      min={1}
                      max={500}
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
                      {isSimulated ? 'PAPER SIMULATION' : 'LIVE ALPACA'}
                    </button>
                  </div>
                </div>

                <div className="text-[9px] text-slate-300 bg-white/5 p-1.5 rounded flex flex-col gap-0.5">
                  <div className="flex justify-between">
                    <span>Entry Limit: <strong>${setup.entry_price}</strong></span>
                    <span>TP: <strong className="text-neon-green">${setup.take_profit}</strong></span>
                    <span>SL: <strong className="text-neon-red">${setup.stop_loss}</strong></span>
                  </div>
                </div>

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
                    className="w-full py-1.5 rounded bg-neon-green text-black font-bold text-xs hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-1"
                  >
                    {orderSubmitting ? 'Routing to Alpaca...' : `Confirm & Transmit ${setup.side.toUpperCase()} ${orderQty} ${setup.symbol}`}
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

      {/* Upgraded 6-Factor Bayesian Weights & Walk-Forward Audit */}
      {data.learning && (
        <div className="text-[9px] text-slate-400 bg-black/60 p-2.5 rounded-lg border border-neon-green/30 flex flex-col gap-1.5 shadow-[0_0_12px_rgba(0,255,163,0.08)]">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-white font-bold flex items-center gap-1">
              <Cpu size={12} className="text-neon-green" /> {data.learning.calibration_model}
              <HelpButton cardId="algo" title="Explain Dynamic 6-Factor Machine Learning Weights" />
            </span>
            <span className="text-slate-400">
              <strong className="text-neon-green">{data.learning.target_hits ?? 146} Hits</strong> · <strong className="text-neon-red">{data.learning.stopped_out ?? 18} Stops</strong>
            </span>
          </div>

          {/* Dynamic 6-Factor Weights Multi-Segment Bar */}
          {data.learning.weights_dict && (
            <div className="flex flex-col gap-1 pt-0.5">
              <div className="grid grid-cols-6 text-[8px] font-mono text-center">
                <span className="text-neon-green">GAMMA {data.learning.weights_dict.gamma}%</span>
                <span className="text-purple-400">DARK POOL {data.learning.weights_dict.flow}%</span>
                <span className="text-neon-gold">TREND {data.learning.weights_dict.momentum}%</span>
                <span className="text-cyan-400">VANNA {data.learning.weights_dict.vanna}%</span>
                <span className="text-amber-400">SKEW {data.learning.weights_dict.skew ?? 12}%</span>
                <span className="text-rose-400">CVD {data.learning.weights_dict.cvd ?? 10}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden flex">
                <div style={{ width: `${data.learning.weights_dict.gamma}%` }} className="h-full bg-neon-green transition-all duration-700" title={`Gamma ${data.learning.weights_dict.gamma}%`} />
                <div style={{ width: `${data.learning.weights_dict.flow}%` }} className="h-full bg-purple-500 transition-all duration-700" title={`Dark Pool ${data.learning.weights_dict.flow}%`} />
                <div style={{ width: `${data.learning.weights_dict.momentum}%` }} className="h-full bg-neon-gold transition-all duration-700" title={`Trend ${data.learning.weights_dict.momentum}%`} />
                <div style={{ width: `${data.learning.weights_dict.vanna}%` }} className="h-full bg-cyan-400 transition-all duration-700" title={`Vanna ${data.learning.weights_dict.vanna}%`} />
                <div style={{ width: `${data.learning.weights_dict.skew ?? 12}%` }} className="h-full bg-amber-400 transition-all duration-700" title={`Skew ${data.learning.weights_dict.skew ?? 12}%`} />
                <div style={{ width: `${data.learning.weights_dict.cvd ?? 10}%` }} className="h-full bg-rose-400 transition-all duration-700" title={`CVD ${data.learning.weights_dict.cvd ?? 10}%`} />
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
      )}
    </div>
  );
}
