import { useState } from 'react';
import { 
  Shield, 
  Bot, 
  Terminal, 
  Clock, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Lock, 
  AlertTriangle,
  LogOut,
  BarChart2,
  ChevronRight,
  ShieldCheck,
  Compass,
  Zap,
  BellRing,
  Activity,
  BarChart3
} from 'lucide-react';
import { type User, signInWithGoogle, logOut, isUserAuthorized } from './firebaseAuth';

interface LandingPageProps {
  user: User | null;
  onEnterTerminal: () => void;
  onEnterDemo: () => void;
}

export function LandingPage({ user, onEnterTerminal, onEnterDemo }: LandingPageProps) {
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const loggedUser = await signInWithGoogle();
      if (isUserAuthorized(loggedUser)) {
        onEnterTerminal();
      }
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        if (err.code === 'auth/unauthorized-domain') {
          setAuthError('Domain authorization is propagating. You can click "Launch Demo Terminal" below to explore right away, or try Google Sign-In again.');
        } else {
          setAuthError(err.message || 'Google sign-in failed. Please try again.');
        }
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logOut();
    } catch (e) {
      console.error(e);
    }
  };

  const isAuthorized = isUserAuthorized(user);

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 font-sans selection:bg-cyan-500 selection:text-black overflow-x-hidden relative">
      {/* Background Ambient Glow & Grid Mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.15),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Top Live Ticker Ribbon */}
      <div className="w-full bg-black/70 backdrop-blur-md border-b border-white/5 py-1.5 px-4 text-[10px] font-mono flex items-center justify-between text-slate-400 z-50 sticky top-0">
        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-0.5">
          <span className="flex items-center gap-1.5 text-neon-green font-bold shrink-0">
            <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
            LIVE QUANT DESK
          </span>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-5 shrink-0">
            <span className="flex items-center gap-1 text-slate-300">
              <strong className="text-white">SPY</strong> $586.20 <span className="text-neon-green font-bold">+0.84%</span>
            </span>
            <span className="flex items-center gap-1 text-slate-300">
              <strong className="text-white">QQQ</strong> $492.15 <span className="text-neon-green font-bold">+1.12%</span>
            </span>
            <span className="flex items-center gap-1 text-slate-300">
              <strong className="text-white">NVDA</strong> $134.80 <span className="text-neon-green font-bold">+2.45%</span>
            </span>
            <span className="flex items-center gap-1 text-slate-300">
              <strong className="text-white">TSLA</strong> $218.40 <span className="text-neon-red font-bold">-0.65%</span>
            </span>
            <span className="flex items-center gap-1 text-slate-300">
              <strong className="text-white">BTC</strong> $67,850 <span className="text-neon-green font-bold">+3.20%</span>
            </span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3 shrink-0 text-[10px]">
          <span className="px-2 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-purple-300 font-bold">
            🛡️ SAME-DAY 15:50 ET EXIT ACTIVE
          </span>
          <span className="text-slate-400">
            Cloud Daemon: <strong className="text-neon-green">24/7 ONLINE</strong>
          </span>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between relative z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.35)] shrink-0 bg-black/60">
            <img src="/dumay-logo.jpg" alt="DUMAY" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="font-mono font-black text-lg tracking-wider text-white flex items-center gap-2">
              DUMAY B.I.A.S. <span className="text-cyan-400 text-xs px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">TERMINAL</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
              Bayesian Intelligent Algo System
            </div>
          </div>
        </div>

        {/* Auth Button or User Profile */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2.5 bg-black/60 border border-white/10 p-1.5 rounded-xl">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} className="w-7 h-7 rounded-lg border border-cyan-400/50" />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center font-bold text-xs text-cyan-300">
                  {user.email?.[0].toUpperCase()}
                </div>
              )}
              <div className="flex flex-col text-left pr-2">
                <span className="text-xs font-bold text-white leading-tight truncate max-w-[140px]">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
                <span className={`text-[9px] font-mono ${isAuthorized ? 'text-neon-green' : 'text-amber-400'}`}>
                  {isAuthorized ? '✓ Authorized Trader' : 'Pending Authorization'}
                </span>
              </div>
              {isAuthorized ? (
                <button
                  onClick={onEnterTerminal}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition-all shadow-[0_0_15px_rgba(6,182,212,0.35)] cursor-pointer flex items-center gap-1"
                >
                  <span>Launch Terminal</span>
                  <ArrowRight size={13} />
                </button>
              ) : (
                <button
                  onClick={onEnterDemo}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all cursor-pointer"
                >
                  Enter Demo
                </button>
              )}
              <button
                onClick={handleSignOut}
                title="Sign Out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-neon-red hover:bg-white/5 transition-colors cursor-pointer"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onEnterDemo}
                className="hidden sm:flex px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-mono text-xs transition-all cursor-pointer items-center gap-1.5"
              >
                <Compass size={13} />
                <span>Demo Access</span>
              </button>

              <button
                onClick={handleGoogleLogin}
                disabled={authLoading}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-black font-bold text-xs transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {/* Official Google 'G' SVG */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#000" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#000" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#000" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#000" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{authLoading ? 'Authenticating...' : 'Sign In with Google'}</span>
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Auth Error Banner if needed */}
      {authError && (
        <div className="max-w-md mx-auto my-3 p-3 bg-neon-red/10 border border-neon-red/40 rounded-xl text-neon-red text-xs text-center font-mono flex flex-col items-center justify-center gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} />
            <span>{authError}</span>
          </div>
          <button
            onClick={onEnterDemo}
            className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-mono transition-colors cursor-pointer"
          >
            Launch Demo Terminal →
          </button>
        </div>
      )}

      {/* Unauthorized User Alert Banner */}
      {user && !isAuthorized && (
        <div className="max-w-2xl mx-auto my-4 p-4 bg-amber-500/10 border border-amber-500/40 rounded-xl text-amber-200 text-xs font-mono flex items-start gap-3">
          <Lock size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="font-bold text-sm text-white">Institutional Access Restricted</span>
            <span>
              Signed in as <strong className="text-amber-300">{user.email}</strong>. This terminal is configured with authorized trader protection. Please contact the desk administrator to grant live execution rights, or explore in Simulated Demo Mode below.
            </span>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={onEnterDemo}
                className="px-3 py-1.5 rounded bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 transition-all cursor-pointer"
              >
                Launch Simulated Demo Desk
              </button>
              <button
                onClick={handleSignOut}
                className="text-slate-400 hover:text-white underline text-xs cursor-pointer"
              >
                Sign in with another Google account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-12 pb-20 text-center relative z-30">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-mono text-xs mb-6 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
          <Sparkles size={13} className="text-cyan-400 animate-spin" />
          <span>AI-POWERED AUTONOMOUS QUANT DESK OS</span>
          <span className="text-slate-500">•</span>
          <span className="text-emerald-400 font-bold">OPTIONS-ONLY EXECUTION</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-5xl mx-auto leading-[1.1] mb-6">
          Institutional Options & Equities Execution Engine.
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-3xl mx-auto font-sans leading-relaxed mb-10">
          Engineered for algorithmic precision with <strong className="text-slate-200">24/7 Autonomous Options Co-Pilot</strong>, 
          0DTE dealer gamma concentration models, the <strong className="text-cyan-300">Dumay Command Bar</strong>, and strict 
          <strong className="text-emerald-400"> 15:50 ET same-day auto-liquidation</strong> to eliminate overnight theta decay.
        </p>

        {/* Hero Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-14">
          <button
            onClick={user && isAuthorized ? onEnterTerminal : handleGoogleLogin}
            disabled={authLoading}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-black font-bold text-sm transition-all shadow-[0_0_30px_rgba(6,182,212,0.5)] hover:shadow-[0_0_40px_rgba(6,182,212,0.7)] cursor-pointer flex items-center justify-center gap-2.5"
          >
            {/* Google Icon */}
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#000" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#000" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#000" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#000" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{user && isAuthorized ? 'Enter Authorized Terminal' : 'Sign In with Google (Live Desk)'}</span>
            <ChevronRight size={16} />
          </button>

          <button
            onClick={onEnterDemo}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-mono text-sm transition-all cursor-pointer flex items-center justify-center gap-2 hover:border-cyan-500/40"
          >
            <span>Explore Demo Mode</span>
            <ArrowRight size={14} className="text-slate-400" />
          </button>
        </div>

        {/* Live Terminal Preview Frame */}
        <div className="relative mx-auto max-w-5xl rounded-2xl p-1 bg-gradient-to-b from-cyan-500/30 via-white/10 to-transparent shadow-[0_0_50px_rgba(6,182,212,0.15)]">
          <div className="bg-[#0b0f19] rounded-2xl border border-white/10 p-4 sm:p-6 text-left font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                <span className="text-slate-400 ml-2 font-bold text-[11px]">DUMAY QUANT DESK OS // ACTIVE SESSION</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-cyan-400">
                <Terminal size={12} />
                <span>HOTKEY: Cmd+K / Ctrl+K</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/5">
                <span className="text-[10px] text-slate-400 uppercase">Autonomous Co-Pilot</span>
                <div className="text-neon-green font-bold text-sm mt-1 flex items-center gap-1.5">
                  <Bot size={15} />
                  <span>ARMED · OPTIONS ONLY (100x)</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-2">
                  Scanning SPY, QQQ, NVDA, AAPL, TSLA, IWM with Kelly position sizing &amp; instant alerts.
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-black/40 border border-white/5">
                <span className="text-[10px] text-slate-400 uppercase">Risk Guard</span>
                <div className="text-amber-400 font-bold text-sm mt-1 flex items-center gap-1.5">
                  <ShieldCheck size={15} />
                  <span>15:50 ET SAME-DAY FLATTEN</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-2">
                  Zero overnight theta decay. All open option contracts auto-liquidate before the closing bell.
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-black/40 border border-white/5">
                <span className="text-[10px] text-slate-400 uppercase">Dumay Command Bar</span>
                <div className="text-cyan-400 font-bold text-sm mt-1 flex items-center gap-1.5">
                  <Terminal size={15} />
                  <span>BLAZING FAST CONTROL</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-2">
                  Type any ticker or command to switch charts, open macro rates, or execute 1-click brackets.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Pillars Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-white/5 relative z-30">
        <div className="text-center mb-14">
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">Architectural Pillars</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mt-2">Engineered for Quantitative Superiority</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-cyan-500/40 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition-transform">
              <Bot size={22} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Options-Only Co-Pilot</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Buys high-delta ATM Calls for bullish regimes and ATM Puts for bearish regimes with institutional bracket targets (+40% TP, -25% SL).
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-purple-500/40 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
              <Terminal size={22} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Dumay Command Bar</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Global command palette accessible via <kbd className="px-1.5 py-0.5 rounded bg-black border border-white/20 text-xs">Cmd+K</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-black border border-white/20 text-xs">Ctrl+K</kbd> with full keyboard shortcut help and instant search.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-emerald-500/40 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
              <Clock size={22} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">15:50 ET Auto-Close</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Mandatory same-day exit rule. Automatically liquidates all options before the 16:00 ET bell, neutralizing overnight theta burn and weekend gap risk.
            </p>
          </div>

          {/* Card 4 */}
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-amber-500/40 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition-transform">
              <BarChart2 size={22} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">0DTE Volatility & GEX</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Live gamma exposure (GEX), dark pool block detection, cumulative volume delta (CVD), and IV skew barometer for asymmetric edge.
            </p>
          </div>
        </div>
      </section>

      {/* Newly Deployed Power Modules Section */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-t border-white/5 relative z-30">
        <div className="text-center mb-12">
          <span className="text-xs font-mono text-neon-green uppercase tracking-widest px-3 py-1 rounded-full bg-neon-green/10 border border-neon-green/30">
            ⚡ NEW RELEASE · LIVE ON DESK
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white mt-3">Advanced Institutional Expansions</h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto mt-2">
            Explore the newest algorithmic suites available in DUMAY B.I.A.S. TERMINAL:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Solana DEX Sniper */}
          <div className="p-6 rounded-2xl bg-cyan-950/20 border border-cyan-500/40 hover:border-cyan-400 transition-all group shadow-[0_0_20px_rgba(6,182,212,0.15)] flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 mb-4 group-hover:scale-110 transition-transform">
                <Zap size={22} className="text-cyan-400 fill-cyan-400 animate-pulse" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-bold text-white">Solana DEX Sniper</h3>
                <span className="px-1.5 py-0.5 rounded bg-cyan-400 text-black text-[9px] font-extrabold font-mono">LIVE</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Real-time sub-second tracker for freshly minted Solana DEX liquidity pools (Raydium, Meteora, Pump). Anti-rug safety scoring and 1-click Jupiter Aggregator swaps.
              </p>
            </div>
            <button
              onClick={onEnterDemo}
              className="w-full py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-mono text-xs font-bold border border-cyan-500/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Launch Sniper in Demo</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Telegram Mobile Alerts */}
          <div className="p-6 rounded-2xl bg-sky-950/20 border border-sky-500/40 hover:border-sky-400 transition-all group shadow-[0_0_20px_rgba(14,165,233,0.15)] flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-sky-500/20 border border-sky-400/50 flex items-center justify-center text-sky-300 mb-4 group-hover:scale-110 transition-transform">
                <BellRing size={22} className="text-sky-400" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-bold text-white">Telegram Alerts</h3>
                <span className="px-1.5 py-0.5 rounded bg-sky-400 text-black text-[9px] font-extrabold font-mono">24/7 BOT</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Receive instant push notifications straight to your mobile device for autonomous option entries, 40% profit target exits, and crypto breakout alerts.
              </p>
            </div>
            <button
              onClick={onEnterDemo}
              className="w-full py-2 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-mono text-xs font-bold border border-sky-500/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Explore Alerts Desk</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* thinkorswim Options Simulator */}
          <div className="p-6 rounded-2xl bg-purple-950/20 border border-purple-500/40 hover:border-purple-400 transition-all group shadow-[0_0_20px_rgba(168,85,247,0.15)] flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-400/50 flex items-center justify-center text-purple-300 mb-4 group-hover:scale-110 transition-transform">
                <Activity size={22} className="text-purple-400" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-bold text-white">Risk Simulator</h3>
                <span className="px-1.5 py-0.5 rounded bg-purple-400 text-black text-[9px] font-extrabold font-mono">TOS GRAPH</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Thinkorswim-style interactive options risk profile. Visualize expiration vs T+0 P&L curves, max profit, max drawdown, and strike break-even levels.
              </p>
            </div>
            <button
              onClick={onEnterDemo}
              className="w-full py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-mono text-xs font-bold border border-purple-500/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Open Risk Graph</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Performance & Automated Journal */}
          <div className="p-6 rounded-2xl bg-amber-950/20 border border-amber-500/40 hover:border-amber-400 transition-all group shadow-[0_0_20px_rgba(245,158,11,0.15)] flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 mb-4 group-hover:scale-110 transition-transform">
                <BarChart3 size={22} className="text-neon-gold" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-bold text-white">Performance Desk</h3>
                <span className="px-1.5 py-0.5 rounded bg-neon-gold text-black text-[9px] font-extrabold font-mono">ANALYTICS</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Automated trade journaling and quantitative desk scorecard. Monitors real-time win rate %, profit factor, average hold time, and equity curve growth.
              </p>
            </div>
            <button
              onClick={onEnterDemo}
              className="w-full py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-mono text-xs font-bold border border-amber-500/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>View Desk Journal</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </section>

      {/* Security & Access Section */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center relative z-30">
        <div className="p-8 rounded-3xl bg-gradient-to-b from-white/[0.04] to-black/60 border border-white/10 relative overflow-hidden">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 mx-auto mb-4">
            <Lock size={26} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Enterprise Google OAuth Security</h2>
          <p className="text-sm text-slate-400 max-w-lg mx-auto mb-6">
            Protected by Google OAuth 2.0 and strict trader email verification. Authorized accounts have instant single-click entry to live Alpaca bracket execution.
          </p>

          <div className="inline-flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-slate-400 mb-8">
            <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-neon-green" /> Zero Password Storage</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-neon-green" /> 256-bit TLS Encryption</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-neon-green" /> Admin Whitelist Gate</span>
          </div>

          <div>
            <button
              onClick={user && isAuthorized ? onEnterTerminal : handleGoogleLogin}
              disabled={authLoading}
              className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer inline-flex items-center gap-2"
            >
              <ShieldCheck size={16} />
              <span>{user && isAuthorized ? 'Enter Trading Terminal' : 'Authenticate with Google'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-white/5 py-8 text-center text-xs font-mono text-slate-500 relative z-30">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-cyan-400" />
            <span className="text-slate-300 font-bold">B.I.A.S. Quantitative Terminal</span>
            <span>· All Rights Reserved</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Cloud Run: <strong className="text-neon-green">bias-api</strong></span>
            <span>Alpaca Bridge: <strong className="text-cyan-400">Connected</strong></span>
            <span>Risk Rule: <strong className="text-amber-400">15:50 ET EOD Flat</strong></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
