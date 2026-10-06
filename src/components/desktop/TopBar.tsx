import React, { useState, useEffect, useRef } from 'react';
import { 
  Usb, Wifi, WifiOff, Battery, ShieldAlert, Lock, ShieldCheck, 
  Settings, Power, Info, Palette, Terminal, AlertTriangle 
} from 'lucide-react';
import { EvahLogo } from '@/components/common/EvahLogo';
import { SecurityBadge } from '@/components/common/SecurityBadge';
import { useSessionStore } from '@/stores/useSessionStore';
import { useWindowStore } from '@/stores/useWindowStore';

export const TopBar: React.FC = () => {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const user = useSessionStore((s) => s.user);
  const device = useSessionStore((s) => s.device);
  const lock = useSessionStore((s) => s.lock);
  const panicLock = useSessionStore((s) => s.panicLock);
  const logout = useSessionStore((s) => s.logout);
  const isDevSimulation = useSessionStore((s) => s.isDevSimulation);
  const simulateUsbUnplug = useSessionStore((s) => s.simulateUsbUnplug);
  const simulateUsbPlugIn = useSessionStore((s) => s.simulateUsbPlugIn);

  const { openWindow, windows, activeWindowId } = useWindowStore();
  const activeWin = windows.find((w) => w.id === activeWindowId);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setDateStr(now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 h-8 px-3 z-50 flex items-center justify-between bg-evah-topbar/80 backdrop-blur-md border-b border-evah-border text-evah-text select-none text-xs">
      {/* Left: EVAH Apple-style Menu & Active App */}
      <div className="flex items-center gap-3">
        {/* EVAH Menu Trigger */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-white/10 transition-colors"
          >
            <EvahLogo size={16} />
            <span className="font-semibold text-xs tracking-wide">EVAH</span>
          </button>

          {/* EVAH System Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute top-7 left-0 w-52 bg-evah-surface/95 border border-evah-border rounded-xl shadow-evah-menu p-1.5 backdrop-blur-evah flex flex-col gap-0.5 z-50">
              <button
                onClick={() => {
                  openWindow('about');
                  setIsMenuOpen(false);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs hover:bg-white/10 transition-colors text-white"
              >
                <Info className="w-3.5 h-3.5 text-evah-accent" />
                <span>About EVAH</span>
              </button>

              <button
                onClick={() => {
                  openWindow('settings');
                  setIsMenuOpen(false);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs hover:bg-white/10 transition-colors text-white"
              >
                <Settings className="w-3.5 h-3.5 text-slate-300" />
                <span>System Preferences...</span>
              </button>

              <button
                onClick={() => {
                  openWindow('themes');
                  setIsMenuOpen(false);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs hover:bg-white/10 transition-colors text-white"
              >
                <Palette className="w-3.5 h-3.5 text-slate-300" />
                <span>Theme Studio & Wallpaper</span>
              </button>

              <div className="my-1 border-t border-evah-border" />

              <button
                onClick={() => {
                  lock('Menu trigger');
                  setIsMenuOpen(false);
                }}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs hover:bg-white/10 transition-colors text-white"
              >
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Lock Session</span>
                </div>
                <span className="text-[10px] text-evah-text-muted">Ctrl+L</span>
              </button>

              <button
                onClick={() => {
                  panicLock();
                  setIsMenuOpen(false);
                }}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs text-rose-400 hover:bg-rose-950/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span className="font-semibold">Panic Lock</span>
                </div>
                <span className="text-[10px] text-rose-300">Ctrl+Shift+L</span>
              </button>

              <div className="my-1 border-t border-evah-border" />

              <button
                onClick={() => {
                  logout();
                  setIsMenuOpen(false);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs hover:bg-white/10 text-slate-300 transition-colors"
              >
                <Power className="w-3.5 h-3.5" />
                <span>Log Out {user?.username}</span>
              </button>
            </div>
          )}
        </div>

        {/* Current Active Window Name */}
        {activeWin && (
          <span className="font-semibold text-xs text-white/90 truncate max-w-[200px]">
            {activeWin.title}
          </span>
        )}
      </div>

      {/* Center: System Status / Dev Mode Indicator */}
      <div className="flex items-center gap-2">
        {isDevSimulation && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/40 border border-amber-500/30 text-[10px] font-mono text-amber-300">
            <span>Dev Mode</span>
            <button
              onClick={device?.isConnected ? simulateUsbUnplug : simulateUsbPlugIn}
              className="underline ml-1 hover:text-white"
              title="Click to toggle USB simulated connection"
            >
              ({device?.isConnected ? 'Unplug USB' : 'Plug In USB'})
            </button>
          </div>
        )}
      </div>

      {/* Right: Security, USB Telemetry, Battery, Clock */}
      <div className="flex items-center gap-3">
        {/* Security Indicator */}
        <SecurityBadge compact={true} />

        {/* USB Indicator */}
        <div 
          className="flex items-center gap-1 text-[11px] text-evah-text-muted hover:text-white transition-colors cursor-pointer"
          title={`EVAH USB: ${device?.isConnected ? 'Connected & Verified' : 'Missing'}`}
          onClick={() => openWindow('settings')}
        >
          <Usb className={`w-3.5 h-3.5 ${device?.isConnected ? 'text-evah-accent' : 'text-rose-400 animate-pulse'}`} />
          <span className="hidden sm:inline font-mono">USB</span>
        </div>

        {/* Local Network / Offline mode indicator */}
        <div 
          className="flex items-center gap-1 text-[11px] text-evah-text-muted"
          title="Offline-First Mode Active"
        >
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
        </div>

        {/* Date and Time */}
        <div className="flex items-center gap-2 font-medium text-xs text-white/90 pl-1">
          <span className="hidden md:inline text-evah-text-muted">{dateStr}</span>
          <span className="font-semibold">{timeStr}</span>
        </div>

        {/* Quick Emergency Panic Button */}
        <button
          onClick={panicLock}
          className="p-1 rounded-md bg-rose-950/40 border border-rose-500/30 text-rose-400 hover:bg-rose-900/60 transition-colors ml-1"
          title="Instant Panic Lock (Ctrl+Shift+L)"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
