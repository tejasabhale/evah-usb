import React, { useState } from 'react';
import { 
  Settings, Shield, Volume2, Usb, Keyboard, Info, Palette, 
  Clock, Lock, Copy, RefreshCw, Check 
} from 'lucide-react';
import { useSessionStore } from '@/stores/useSessionStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { useWindowStore } from '@/stores/useWindowStore';
import { TtsService } from '@/services/tts/TtsService';
import { useNotificationStore } from '@/stores/useNotificationStore';

export const SettingsApp: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'security' | 'voice' | 'usb' | 'shortcuts' | 'about'>('security');
  
  const settings = useSessionStore((s) => s.settings);
  const updateSettings = useSessionStore((s) => s.updateSettings);
  const device = useSessionStore((s) => s.device);
  const isDevSimulation = useSessionStore((s) => s.isDevSimulation);
  const simulateUsbUnplug = useSessionStore((s) => s.simulateUsbUnplug);
  const simulateUsbPlugIn = useSessionStore((s) => s.simulateUsbPlugIn);
  const openWindow = useWindowStore((s) => s.openWindow);
  const pushNotification = useNotificationStore((s) => s.pushNotification);

  const testVoiceGreeting = () => {
    TtsService.getInstance().playWelcomeGreeting(settings.welcomeVoiceVolume);
  };

  return (
    <div className="flex h-full w-full bg-evah-surface text-evah-text select-none">
      {/* Settings Navigation Sidebar */}
      <div className="w-52 border-r border-evah-border bg-black/10 flex flex-col p-3 gap-1 shrink-0">
        <div className="px-2 py-1 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-evah-text-muted">
            Preferences
          </span>
          <h2 className="text-sm font-bold text-white">System Settings</h2>
        </div>

        {[
          { id: 'security', label: 'Security & Auto-Lock', icon: Shield },
          { id: 'voice', label: 'Welcome Voice & TTS', icon: Volume2 },
          { id: 'usb', label: 'USB Device & Storage', icon: Usb },
          { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard },
          { id: 'about', label: 'About EVAH', icon: Info },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as any)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors ${
                activeSection === item.id
                  ? 'bg-evah-accent-subtle text-evah-accent border border-evah-accent/30'
                  : 'text-evah-text-secondary hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0 text-evah-accent" />
              <span>{item.label}</span>
            </button>
          );
        })}

        <div className="mt-auto pt-3 border-t border-evah-border">
          <button
            onClick={() => openWindow('themes')}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-evah-accent/15 border border-evah-accent/30 text-evah-accent hover:bg-evah-accent/25 text-xs font-semibold transition-colors"
          >
            <Palette className="w-4 h-4" />
            Open Theme Studio
          </button>
        </div>
      </div>

      {/* Main Settings Panel */}
      <div className="flex-1 p-6 overflow-y-auto min-w-0">
        {/* Security Section */}
        {activeSection === 'security' && (
          <div className="max-w-xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">Security & Session Policies</h3>
              <p className="text-xs text-evah-text-secondary mt-0.5">
                Configure auto-lock timers, clipboard hygiene, and panic responses.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-evah-border bg-white/[0.02] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-evah-accent" />
                    <div>
                      <h4 className="text-xs font-semibold text-white">Inactivity Auto-Lock</h4>
                      <p className="text-[11px] text-evah-text-muted">Locks screen when idle</p>
                    </div>
                  </div>
                  <select
                    value={settings.autoLockMinutes}
                    onChange={(e) => updateSettings({ autoLockMinutes: parseInt(e.target.value) })}
                    className="px-3 py-1.5 rounded-lg bg-black/40 border border-evah-border text-xs text-white"
                  >
                    <option value={1}>1 Minute</option>
                    <option value={5}>5 Minutes</option>
                    <option value={10}>10 Minutes (Default)</option>
                    <option value={15}>15 Minutes</option>
                    <option value={30}>30 Minutes</option>
                    <option value={60}>1 Hour</option>
                    <option value={0}>Never Auto-Lock</option>
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-evah-border bg-white/[0.02] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Copy className="w-4 h-4 text-emerald-400" />
                    <div>
                      <h4 className="text-xs font-semibold text-white">Clipboard Auto-Clear Timer</h4>
                      <p className="text-[11px] text-evah-text-muted">Clears copied secrets automatically</p>
                    </div>
                  </div>
                  <select
                    value={settings.clipboardTimeoutSeconds}
                    onChange={(e) => updateSettings({ clipboardTimeoutSeconds: parseInt(e.target.value) })}
                    className="px-3 py-1.5 rounded-lg bg-black/40 border border-evah-border text-xs text-white"
                  >
                    <option value={5}>5 Seconds</option>
                    <option value={10}>10 Seconds</option>
                    <option value={15}>15 Seconds (Default)</option>
                    <option value={30}>30 Seconds</option>
                    <option value={60}>60 Seconds</option>
                    <option value={0}>Disabled</option>
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-950/10 space-y-2">
                <div className="flex items-center gap-2 text-rose-300 font-semibold text-xs">
                  <Shield className="w-4 h-4" />
                  <span>Panic Emergency Shortcut</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Pressing <kbd className="px-1.5 py-0.5 rounded bg-black/50 border border-white/20 font-mono text-[10px] text-teal-300">Ctrl + Shift + L</kbd> at any time instantly purges active keys from memory and locks down the environment.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Voice Section */}
        {activeSection === 'voice' && (
          <div className="max-w-xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">Welcome Voice & TTS</h3>
              <p className="text-xs text-evah-text-secondary mt-0.5">
                Offline speech greeting played when system finishes initialization.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-evah-border bg-white/[0.02] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white">Startup Welcome Audio</h4>
                  <p className="text-[11px] text-evah-text-muted">Plays "Welcome to EVAH." before login</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.welcomeVoiceEnabled}
                  onChange={(e) => updateSettings({ welcomeVoiceEnabled: e.target.checked })}
                  className="w-4 h-4 accent-teal-500 rounded"
                />
              </div>

              <div className="pt-2 border-t border-evah-border/60">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-300">Audio Volume</span>
                  <span className="font-mono text-evah-accent">{Math.round(settings.welcomeVoiceVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={settings.welcomeVoiceVolume}
                  onChange={(e) => updateSettings({ welcomeVoiceVolume: parseFloat(e.target.value) })}
                  className="w-full accent-teal-500"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={testVoiceGreeting}
                  className="px-3.5 py-1.5 rounded-lg bg-evah-accent text-black font-semibold text-xs hover:bg-evah-accent-hover transition-colors"
                >
                  Test Welcome Voice
                </button>
              </div>
            </div>
          </div>
        )}

        {/* USB Section */}
        {activeSection === 'usb' && (
          <div className="max-w-xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">USB Hardware Telemetry</h3>
              <p className="text-xs text-evah-text-secondary mt-0.5">
                Physical drive presence and mounted filesystem details.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-evah-border bg-white/[0.02] space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-evah-border/50 pb-2">
                <span className="text-evah-text-muted">Status:</span>
                <span className={device?.isConnected ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                  {device?.isConnected ? 'ONLINE / CONNECTED' : 'DISCONNECTED'}
                </span>
              </div>
              <div className="flex justify-between border-b border-evah-border/50 pb-2">
                <span className="text-evah-text-muted">Device ID:</span>
                <span className="text-white">{device?.name || 'EVAH_PORTABLE_32GB'}</span>
              </div>
              <div className="flex justify-between border-b border-evah-border/50 pb-2">
                <span className="text-evah-text-muted">Mount Path:</span>
                <span className="text-white">{device?.mountPath || 'E:\\EVAH'}</span>
              </div>
              <div className="flex justify-between border-b border-evah-border/50 pb-2">
                <span className="text-evah-text-muted">Security Marker:</span>
                <span className="text-teal-400">EVAH_DEVICE (Verified)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-evah-text-muted">Serial Number:</span>
                <span className="text-white">{device?.serialNumber || 'EV-8842-SEC-99'}</span>
              </div>
            </div>

            {isDevSimulation && (
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/20 space-y-3">
                <h4 className="text-xs font-semibold text-amber-300">
                  Developer Mode Simulator
                </h4>
                <p className="text-[11px] text-slate-300">
                  Simulate physical hardware events directly in the browser to verify session drop handling:
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={simulateUsbUnplug}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                  >
                    Simulate Disconnecting USB
                  </button>
                  <button
                    onClick={simulateUsbPlugIn}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                  >
                    Simulate Reconnecting USB
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Shortcuts Section */}
        {activeSection === 'shortcuts' && (
          <div className="max-w-xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">System Keyboard Shortcuts</h3>
              <p className="text-xs text-evah-text-secondary mt-0.5">
                Global hotkeys for rapid workspace navigation and emergency lockdown.
              </p>
            </div>

            <div className="space-y-2">
              {[
                { shortcut: 'Ctrl + Shift + L', desc: 'Emergency Panic Lock (Purges active keys & locks)' },
                { shortcut: 'Ctrl + Shift + F', desc: 'Open Files App' },
                { shortcut: 'Ctrl + Shift + B', desc: 'Open Web Browser' },
                { shortcut: 'Ctrl + Shift + V', desc: 'Open Secure Vault' },
                { shortcut: 'Ctrl + Alt + T', desc: 'Open Terminal' },
                { shortcut: 'Escape', desc: 'Dismiss active dialogs' },
              ].map((s) => (
                <div
                  key={s.shortcut}
                  className="flex items-center justify-between p-3 rounded-xl border border-evah-border bg-white/[0.02]"
                >
                  <span className="text-xs text-slate-200">{s.desc}</span>
                  <kbd className="px-2 py-1 rounded bg-black/60 border border-white/20 font-mono text-xs text-evah-accent">
                    {s.shortcut}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* About Section */}
        {activeSection === 'about' && (
          <div className="max-w-xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">About EVAH OS</h3>
              <p className="text-xs text-evah-text-secondary mt-0.5">
                Your Personal Digital Environment, Everywhere.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-evah-border bg-white/[0.02] space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                <strong>Version:</strong> 1.0.0 (Production Release)
              </p>
              <p>
                <strong>License:</strong> MIT Open Source • Zero Telemetry
              </p>
              <p>
                <strong>Architecture:</strong> Offline-First Portable Web OS (React + TypeScript + Tailwind + Framer Motion + GSAP + Tauri/Rust Shell)
              </p>
              <p>
                <strong>Cryptographic Primitives:</strong> AES-256-GCM, PBKDF2/Argon2id Key Derivation, SHA-256 Integrity Checks.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
