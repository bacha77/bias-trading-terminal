import React, { useState, useEffect } from 'react';
import { X, Send, Bell, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, Smartphone } from 'lucide-react';
import { API_BASE } from './config';

interface TelegramConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TelegramConfigModal: React.FC<TelegramConfigModalProps> = ({ isOpen, onClose }) => {
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [maskedToken, setMaskedToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/telegram/config`);
      if (res.ok) {
        const data = await res.json();
        setIsConfigured(data.is_configured);
        setMaskedToken(data.bot_token_masked || '');
        if (data.chat_id) setChatId(data.chat_id);
      }
    } catch (e) {
      console.error('Failed to fetch telegram config:', e);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/desk/notifications?limit=15`);
      if (res.ok) {
        const data = await res.json();
        setRecentAlerts(data.notifications || []);
      }
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!botToken.trim() && !isConfigured) {
      setStatusMsg({ type: 'error', text: 'Please enter your Telegram Bot Token.' });
      return;
    }
    if (!chatId.trim()) {
      setStatusMsg({ type: 'error', text: 'Please enter your Telegram Chat ID.' });
      return;
    }

    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/telegram/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonSafe({ bot_token: botToken.trim(), chat_id: chatId.trim() })
      });
      const data = await res.json();
      if (data.status === 'SUCCESS') {
        setIsConfigured(true);
        setStatusMsg({ type: 'success', text: '✅ Telegram credentials saved successfully!' });
        setBotToken('');
        fetchConfig();
      } else {
        setStatusMsg({ type: 'error', text: 'Failed to save configuration.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `Error saving: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleTestAlert = async () => {
    setTesting(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/telegram/test`, { method: 'POST' });
      const data = await res.json();
      if (data.telegram?.success) {
        setStatusMsg({ type: 'success', text: '🚀 Test alert delivered to your Telegram phone app!' });
        fetchNotifications();
      } else {
        setStatusMsg({
          type: 'error',
          text: `Delivery failed: ${data.telegram?.error || data.telegram?.message || 'Check your bot token & chat ID'}`
        });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `Test failed: ${err.message}` });
    } finally {
      setTesting(false);
    }
  };

  function jsonSafe(obj: any) {
    return JSON.stringify(obj);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#090d16] border border-cyan-500/40 rounded-xl shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              <Smartphone size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                TELEGRAM MOBILE DESK NOTIFIER
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${isConfigured ? 'bg-neon-green/20 text-neon-green border border-neon-green/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                  {isConfigured ? 'LINKED & ACTIVE' : 'NOT CONFIGURED'}
                </span>
              </h2>
              <p className="text-[10px] text-slate-400 font-sans">
                Receive instant mobile alerts for 24/7 Crypto trades, Options executions, & Stop Losses.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 font-mono text-xs text-slate-300">
          {/* Quick Guide Banner */}
          <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/30 font-sans text-[11px] text-cyan-200 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-cyan-300">
              <ShieldCheck size={14} /> Quick 2-Minute Setup:
            </div>
            <ol className="list-decimal list-inside space-y-0.5 text-slate-300 pl-1">
              <li>Open Telegram and message <strong>@BotFather</strong> to create a bot & copy the <strong>Token</strong>.</li>
              <li>Message <strong>@userinfobot</strong> to get your numeric <strong>Chat ID</strong>.</li>
              <li>Press <strong>Start</strong> on your new bot, paste your credentials below, and click <strong>Test Alert</strong>!</li>
            </ol>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                Telegram Bot Token
              </label>
              <input
                type="password"
                placeholder={maskedToken ? `Current: ${maskedToken} (Leave empty to keep)` : '123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ'}
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-lg text-white font-mono text-xs focus:border-cyan-400 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                Your Telegram Chat ID
              </label>
              <input
                type="text"
                placeholder="e.g. 987654321"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-lg text-white font-mono text-xs focus:border-cyan-400 focus:outline-none transition-colors"
              />
            </div>

            {statusMsg && (
              <div className={`p-2.5 rounded-lg border text-xs font-sans flex items-center gap-2 ${
                statusMsg.type === 'success' 
                  ? 'bg-neon-green/15 border-neon-green/40 text-neon-green' 
                  : 'bg-neon-red/15 border-neon-red/40 text-neon-red'
              }`}>
                {statusMsg.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                <span>{statusMsg.text}</span>
              </div>
            )}

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 px-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? <RefreshCw size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                <span>SAVE TELEGRAM SETTINGS</span>
              </button>

              <button
                type="button"
                onClick={handleTestAlert}
                disabled={testing || (!isConfigured && !chatId)}
                className="py-2 px-4 rounded-lg bg-neon-green/20 hover:bg-neon-green/30 text-neon-green border border-neon-green/40 font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
              >
                {testing ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                <span>TEST ALERT NOW</span>
              </button>
            </div>
          </form>

          {/* Recent Dispatched Alerts Feed */}
          <div className="pt-2 border-t border-white/10 space-y-2">
            <div className="flex justify-between items-center text-[10px] text-slate-400">
              <span className="uppercase font-bold tracking-wider flex items-center gap-1.5 text-white">
                <Bell size={12} className="text-cyan-400" /> Recent Desk Alerts ({recentAlerts.length})
              </span>
              <button
                onClick={fetchNotifications}
                className="hover:text-cyan-300 text-[9px] flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={10} /> Refresh
              </button>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1.5 no-scrollbar pr-1">
              {recentAlerts.length === 0 ? (
                <div className="p-3 rounded bg-black/40 border border-white/5 text-center text-slate-500 text-[10px] font-sans">
                  No notifications recorded yet. Trigger a trade or click "Test Alert Now".
                </div>
              ) : (
                recentAlerts.map((a) => (
                  <div key={a.id} className="p-2 rounded bg-black/50 border border-white/5 flex flex-col gap-0.5 font-mono text-[9.5px]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1">
                        <span className="text-cyan-400">{a.title}</span>
                      </span>
                      <span className="text-slate-500 text-[8.5px]">{a.time}</span>
                    </div>
                    <div className="text-slate-300 font-sans text-[10px]">{a.details}</div>
                    <div className="flex items-center gap-2 text-[8px] text-slate-500 pt-0.5">
                      <span className="px-1 py-0.2 rounded bg-white/5 border border-white/10 uppercase">{a.category}</span>
                      <span className={a.telegram_status === 'delivered' ? 'text-neon-green font-bold' : 'text-slate-400'}>
                        Telegram: {a.telegram_status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
