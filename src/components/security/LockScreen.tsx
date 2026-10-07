import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Usb, AlertTriangle, ArrowRight, ShieldAlert, RotateCcw } from 'lucide-react';
import { EvahLogo } from '@/components/common/EvahLogo';
import { useSessionStore } from '@/stores/useSessionStore';
import { useThemeStore } from '@/stores/useThemeStore';

export const LockScreen: React.FC = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const lifecycle = useSessionStore((s) => s.lifecycle);
  const user = useSessionStore((s) => s.user);
  const device = useSessionStore((s) => s.device);
  const unlock = useSessionStore((s) => s.unlock);
  const statusReason = useSessionStore((s) => s.statusReason);
  const isDevSimulation = useSessionStore((s) => s.isDevSimulation);
  const simulateUsbPlugIn = useSessionStore((s) => s.simulateUsbPlugIn);
  const loginWallpaper = useThemeStore((s) => s.loginWallpaper);

  const isUsbMissing = lifecycle === 'SESSION_INVALIDATED' || !device?.isConnected;
  const isPanic = lifecycle === 'PANIC_LOCKED';

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleUnlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isUsbMissing) return;

    if (!password) {
      setError('Enter your password');
      return;
    }

    setError('');
    setIsVerifying(true);
    try {
      const ok = await unlock(password);
      if (!ok) {
        setError('Incorrect password');
      }
    } catch (err: any) {
      setError(err.message || 'Unlock error');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99995] flex flex-col justify-between items-center text-white select-none overflow-hidden">
      {/* Background Wallpaper with heavy lock blur */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-700 pointer-events-none"
        style={{
          backgroundImage: `url("${loginWallpaper.url}")`,
          filter: `blur(${Math.max(loginWallpaper.blur, 20)}px) brightness(60%) contrast(110%)`,
        }}
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60 pointer-events-none" />

      {/* Header Clock */}
      <div className="relative z-10 pt-16 flex flex-col items-center">
        <h1 className="text-6xl font-light tracking-tight text-white/90 drop-shadow-md">
          {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </h1>
        <p className="text-sm font-medium text-slate-300/70 mt-1">
          {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Center Lock Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 flex flex-col items-center max-w-sm w-full p-6 mx-4 rounded-2xl bg-black/60 border border-white/10 shadow-2xl backdrop-blur-2xl text-center"
      >
        <div className="mb-4">
          {isUsbMissing ? (
            <div className="w-16 h-16 rounded-2xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto shadow-inner">
              <Usb className="w-8 h-8 animate-pulse" />
            </div>
          ) : isPanic ? (
            <div className="w-16 h-16 rounded-2xl bg-red-950/60 border border-red-500/40 flex items-center justify-center text-red-400 mx-auto shadow-inner">
              <ShieldAlert className="w-8 h-8" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-evah-accent-subtle border border-evah-accent/40 flex items-center justify-center text-evah-accent mx-auto shadow-inner">
              <Lock className="w-8 h-8" />
            </div>
          )}
        </div>

        <div className="text-center">
          <h2 className="text-lg font-semibold text-white">
            {user?.fullName || user?.username || 'Tejas'}
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            {isPanic ? 'Emergency panic lockdown active.' : 'This EVAH session is locked.'}
          </p>
        </div>

        {isUsbMissing ? (
          <div className="mt-4 text-xs text-rose-300 space-y-2">
            <p className="font-semibold text-rose-200">
              The EVAH USB drive is disconnected.
            </p>
            <p className="text-zinc-400">
              Active session secured. Reconnect your EVAH USB drive to continue.
            </p>
          </div>
        ) : (
          <div className="w-full mt-4 space-y-3">
            <form onSubmit={handleUnlock} className="space-y-3">
              <div className="relative flex items-center">
                <input
                  type="password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Password"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-black/50 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                />
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="absolute right-1.5 p-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-black transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-black text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isVerifying ? 'Unlocking...' : 'Unlock'}
              </button>

              {error && (
                <div className="text-rose-400 text-xs bg-rose-950/40 border border-rose-500/30 rounded-lg p-1.5">
                  {error}
                </div>
              )}
            </form>
          </div>
        )}
      </motion.div>

      {/* Footer Info */}
      <div className="relative z-10 pb-8 text-xs text-slate-400 font-mono tracking-wider flex items-center gap-2">
        <span>USB Physical Security Protected</span>
      </div>
    </div>
  );
};
