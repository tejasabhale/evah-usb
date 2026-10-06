import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Lock, KeyRound, Usb, ShieldCheck, AlertCircle } from 'lucide-react';
import { EvahLogo } from '@/components/common/EvahLogo';
import { useSessionStore } from '@/stores/useSessionStore';
import { useThemeStore } from '@/stores/useThemeStore';

interface LoginScreenProps {
  onUnlockSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onUnlockSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const user = useSessionStore((s) => s.user);
  const device = useSessionStore((s) => s.device);
  const unlock = useSessionStore((s) => s.unlock);
  const isDevSimulation = useSessionStore((s) => s.isDevSimulation);
  const loginWallpaper = useThemeStore((s) => s.loginWallpaper);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleUnlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!password) {
      setError('Enter your password');
      return;
    }

    setError('');
    setIsVerifying(true);
    try {
      const ok = await unlock(password);
      if (ok) {
        onUnlockSuccess();
      } else {
        setError('Incorrect password');
        setIsVerifying(false);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error');
      setIsVerifying(false);
    }
  };

  const username = user?.username || 'Tejas';

  return (
    <div className="fixed inset-0 z-[9990] flex flex-col justify-between items-center text-white select-none overflow-hidden">
      {/* Background Wallpaper */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-700 pointer-events-none"
        style={{
          backgroundImage: `url("${loginWallpaper.url}")`,
          filter: `blur(${loginWallpaper.blur}px) brightness(${loginWallpaper.brightness}%) contrast(${loginWallpaper.contrast}%) saturation(${loginWallpaper.saturation}%) grayscale(${loginWallpaper.grayscale}%)`,
          transform: `scale(${loginWallpaper.zoom || 1})`,
        }}
      />

      {/* Dark overlay with configurable opacity */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundColor: loginWallpaper.overlayColor,
          opacity: loginWallpaper.overlayOpacity,
        }}
      />

      {/* Subtle vignette backdrop */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/60 pointer-events-none" />

      {/* Top Header: Clock & Date */}
      <div className="relative z-10 pt-16 flex flex-col items-center">
        <h1 className="text-6xl font-light tracking-tight text-white drop-shadow-lg font-sans">
          {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </h1>
        <p className="text-sm font-medium text-slate-300/80 mt-1 drop-shadow">
          {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Center Box: User Profile & Password Form */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 flex flex-col items-center max-w-xs w-full px-4"
      >
        {/* User Avatar */}
        <div className="w-20 h-20 rounded-full border-2 border-white/20 bg-gradient-to-tr from-slate-900 to-slate-800 shadow-2xl flex items-center justify-center mb-3 relative overflow-hidden backdrop-blur-md">
          <div className="text-2xl font-bold text-white tracking-widest uppercase">
            {username.slice(0, 2)}
          </div>
          <div className="absolute inset-0 border border-white/10 rounded-full" />
        </div>

        <h2 className="text-lg font-semibold text-white drop-shadow mb-4">
          {user?.fullName || username}
        </h2>

        {/* Password Entry */}
        <form onSubmit={handleUnlock} className="w-full space-y-3">
          <div className="relative flex items-center">
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter Password"
              className="w-full pl-4 pr-11 py-2.5 rounded-xl bg-black/40 border border-white/20 text-white placeholder-white/40 text-sm backdrop-blur-xl focus:outline-none focus:border-evah-accent focus:ring-1 focus:ring-evah-accent shadow-inner transition-all"
            />
            <button
              type="submit"
              disabled={isVerifying}
              className="absolute right-1.5 p-2 rounded-lg bg-white/10 hover:bg-evah-accent text-white hover:text-black transition-colors disabled:opacity-50"
              title="Unlock EVAH"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {error && (
            <div className="flex items-center justify-center gap-1.5 text-rose-300 text-xs bg-rose-950/60 border border-rose-500/30 rounded-lg py-1.5 px-3">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </form>
      </motion.div>

      {/* Bottom Status Area */}
      <div className="relative z-10 pb-8 flex flex-col items-center gap-2">
        <div className="flex items-center gap-3 text-xs text-white/70 bg-black/40 px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-1.5">
            <Usb className="w-3.5 h-3.5 text-evah-accent" />
            <span>EVAH USB {device?.isConnected ? 'Connected' : 'Missing'}</span>
          </div>
          <span className="w-1 h-1 bg-white/30 rounded-full" />
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Encrypted Session</span>
          </div>
        </div>

        {isDevSimulation && (
          <div className="text-[11px] text-amber-300/80 font-mono tracking-wide">
            Development Mode • USB Monitoring Simulated
          </div>
        )}
      </div>
    </div>
  );
};
