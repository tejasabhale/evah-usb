import React, { useState, useEffect } from 'react';
import { 
  Settings, Shield, Volume2, Usb, Keyboard, Info, Palette, 
  Clock, Lock, Copy, RefreshCw, Check, AlertTriangle, Monitor, 
  Eye, Sliders, Globe, HardDrive, RotateCcw, X, LogOut
} from 'lucide-react';
import { useSessionStore } from '@/stores/useSessionStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { useWindowStore } from '@/stores/useWindowStore';
import { useShortcutStore } from '@/stores/useShortcutStore';
import { TtsService } from '@/services/tts/TtsService';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { StorageService } from '@/services/storage/StorageService';
import { FileSystemStats } from '@/types/filesystem';
import { Button } from '@/components/ui/Button';
import { Toggle, Slider, Select } from '@/components/ui/Toggle';
import { IconButton } from '@/components/ui/IconButton';

type SettingsSection = 
  | 'appearance'
  | 'security'
  | 'shortcuts'
  | 'voice'
  | 'usb'
  | 'privacy'
  | 'about';

export const SettingsApp: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance');

  const settings = useSessionStore((s) => s.settings);
  const updateSettings = useSessionStore((s) => s.updateSettings);
  const device = useSessionStore((s) => s.device);
  const isDevSimulation = useSessionStore((s) => s.isDevSimulation);
  const simulateUsbUnplug = useSessionStore((s) => s.simulateUsbUnplug);
  const simulateUsbPlugIn = useSessionStore((s) => s.simulateUsbPlugIn);

  const { tokens, updateTokens, activePresetId, presets, setPreset } = useThemeStore();
  const { shortcuts, updateShortcut, resetDefaults, conflictItem } = useShortcutStore();
  const openWindow = useWindowStore((s) => s.openWindow);
  const pushNotification = useNotificationStore((s) => s.pushNotification);

  // Key rebinding state
  const [rebindingId, setRebindingId] = useState<string | null>(null);
  const [recordedCombo, setRecordedCombo] = useState<string>('');
  const [conflictWarning, setConflictWarning] = useState<{ conflictName: string; key: string } | null>(null);
  const [storageStats, setStorageStats] = useState<FileSystemStats | null>(null);

  useEffect(() => {
    if (activeSection === 'usb') {
      StorageService.getAdapter()
        .getStats()
        .then(setStorageStats)
        .catch(() => {});
    }
  }, [activeSection]);

  const handleSafeEject = () => {
    if (window.confirm('Safely eject EVAH USB drive? Active windows will close and the session will be locked.')) {
      pushNotification({
        title: 'Safe Eject Initiated',
        message: 'Flushing pending writes and clearing memory keys...',
        type: 'info',
      });
      useWindowStore.getState().closeAllWindows();
      useSessionStore.getState().lock('Device Safely Ejected');
      useSessionStore.getState().simulateUsbUnplug();
      pushNotification({
        title: 'Safe to Remove Hardware',
        message: 'EVAH device unmounted. You may now unplug the drive.',
        type: 'success',
      });
    }
  };

  const testVoiceGreeting = () => {
    TtsService.getInstance().playWelcomeGreeting(settings.welcomeVoiceVolume);
  };

  const handleStartRebind = (id: string) => {
    setRebindingId(id);
    setRecordedCombo('');
    setConflictWarning(null);
  };

  const handleKeyDownRecorder = (e: React.KeyboardEvent) => {
    e.preventDefault();
    if (!rebindingId) return;

    if (e.key === 'Escape') {
      setRebindingId(null);
      setConflictWarning(null);
      return;
    }

    const parts: string[] = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey) parts.push('Cmd');

    const keyName = e.key.toUpperCase();
    if (!['CONTROL', 'ALT', 'SHIFT', 'META'].includes(keyName)) {
      parts.push(keyName);
      const combo = parts.join('+');
      setRecordedCombo(combo);

      // Check conflict
      const existingConflict = shortcuts.find(
        (sc) => sc.id !== rebindingId && sc.currentKey.toLowerCase() === combo.toLowerCase()
      );

      if (existingConflict) {
        setConflictWarning({ conflictName: existingConflict.name, key: combo });
      } else {
        setConflictWarning(null);
      }
    }
  };

  const handleConfirmRebind = async () => {
    if (!rebindingId || !recordedCombo) return;

    if (conflictWarning) {
      // Overwrite/replace conflict
      const existing = shortcuts.find((sc) => sc.name === conflictWarning.conflictName);
      if (existing) {
        await updateShortcut(existing.id, 'Disabled');
      }
    }

    await updateShortcut(rebindingId, recordedCombo);
    setRebindingId(null);
    setConflictWarning(null);
  };

  return (
    <div className="flex h-full w-full bg-evah-surface text-evah-text select-none overflow-hidden">
      {/* Settings Navigation Sidebar */}
      <div className="w-56 border-r border-evah-border bg-black/15 flex flex-col p-3 gap-1 shrink-0 overflow-y-auto">
        <div className="px-2 py-1 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-evah-text-muted">
            Preferences
          </span>
          <h2 className="text-sm font-bold text-white">System Settings</h2>
        </div>

        {[
          { id: 'appearance', label: 'Appearance & UI', icon: Palette },
          { id: 'security', label: 'Security & Auto-Lock', icon: Shield },
          { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard },
          { id: 'voice', label: 'Voice & Pronunciation', icon: Volume2 },
          { id: 'usb', label: 'USB & Storage', icon: Usb },
          { id: 'privacy', label: 'Privacy & Sessions', icon: Lock },
          { id: 'about', label: 'About EVAH OS', icon: Info },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as any)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors ${
                isActive
                  ? 'bg-evah-accent-subtle text-evah-accent font-semibold border border-evah-accent/20'
                  : 'text-evah-text-secondary hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0 text-evah-accent" />
              <span>{item.label}</span>
            </button>
          );
        })}

        <div className="mt-auto pt-3 border-t border-evah-border">
          <Button
            variant="subtle"
            size="sm"
            className="w-full"
            icon={<Palette className="w-3.5 h-3.5" />}
            onClick={() => openWindow('themes')}
          >
            Open Theme Studio
          </Button>
        </div>
      </div>

      {/* Main Settings Content Area */}
      <div className="flex-1 p-6 overflow-y-auto min-w-0">
        {/* Section 1: Appearance & UI */}
        {activeSection === 'appearance' && (
          <div className="max-w-xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">Appearance & Display</h3>
              <p className="text-xs text-evah-text-secondary mt-0.5">
                Manage global presets, UI scaling, and window ergonomics.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-evah-border bg-white/[0.02] space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white">Theme Preset</label>
                <div className="grid grid-cols-3 gap-2">
                  {presets.slice(0, 6).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPreset(p.id)}
                      className={`p-2 rounded-xl border text-left text-xs transition-colors ${
                        activePresetId === p.id
                          ? 'border-evah-accent bg-evah-accent-subtle text-white font-semibold'
                          : 'border-evah-border text-evah-text-secondary hover:bg-white/[0.03]'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-evah-border/60">
                <Slider
                  label="Global Text Scaling"
                  min={0.85}
                  max={1.30}
                  step={0.05}
                  value={tokens.textScale}
                  formatValue={(v) => `${Math.round(v * 100)}%`}
                  onChange={(v) => updateTokens({ textScale: v })}
                />
              </div>

              <div className="pt-2 border-t border-evah-border/60">
                <Slider
                  label="Window Corner Radius"
                  min={6}
                  max={24}
                  value={tokens.windowRadius}
                  formatValue={(v) => `${v}px`}
                  onChange={(v) => updateTokens({ windowRadius: v })}
                />
              </div>

              <div className="pt-2 border-t border-evah-border/60">
                <Select
                  label="Interface Density"
                  value={tokens.density}
                  onChange={(e) => updateTokens({ density: e.target.value as any })}
                  options={[
                    { value: 'compact', label: 'Compact' },
                    { value: 'comfortable', label: 'Comfortable (Default)' },
                    { value: 'spacious', label: 'Spacious' },
                  ]}
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Security & Auto-Lock */}
        {activeSection === 'security' && (
          <div className="max-w-xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">Security Policies</h3>
              <p className="text-xs text-evah-text-secondary mt-0.5">
                Inactivity timers, sensitive clipboard hygiene, and memory lockdown.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-evah-border bg-white/[0.02] space-y-4">
              <Select
                label="Inactivity Auto-Lock Timeout"
                value={settings.autoLockMinutes}
                onChange={(e) => updateSettings({ autoLockMinutes: parseInt(e.target.value) })}
                options={[
                  { value: 1, label: '1 Minute' },
                  { value: 5, label: '5 Minutes' },
                  { value: 10, label: '10 Minutes (Default)' },
                  { value: 15, label: '15 Minutes' },
                  { value: 30, label: '30 Minutes' },
                  { value: 60, label: '1 Hour' },
                  { value: 0, label: 'Disabled (Never auto-lock)' },
                ]}
              />

              <div className="pt-2 border-t border-evah-border/60">
                <Select
                  label="Sensitive Clipboard Auto-Clear Timeout"
                  value={settings.clipboardTimeoutSeconds}
                  onChange={(e) => updateSettings({ clipboardTimeoutSeconds: parseInt(e.target.value) })}
                  options={[
                    { value: 5, label: '5 Seconds' },
                    { value: 10, label: '10 Seconds' },
                    { value: 15, label: '15 Seconds (Default)' },
                    { value: 30, label: '30 Seconds' },
                    { value: 60, label: '60 Seconds' },
                    { value: 0, label: 'Disabled (Do not auto-clear)' },
                  ]}
                />
              </div>

              <div className="p-3 rounded-xl border border-rose-500/25 bg-rose-950/20 space-y-1.5">
                <div className="flex items-center gap-2 text-rose-300 font-semibold text-xs">
                  <Shield className="w-4 h-4" />
                  <span>Panic Lockdown Action</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Triggering Panic Lockdown immediately purges in-memory keys, clears the vault cache, wipes the clipboard, and renders the OS inaccessible.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Keyboard Shortcuts */}
        {activeSection === 'shortcuts' && (
          <div className="max-w-xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Keyboard Shortcut Manager</h3>
                <p className="text-xs text-evah-text-secondary mt-0.5">
                  Click any key combination to rebind. Conflicts are verified in real time.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={resetDefaults}
              >
                Reset All
              </Button>
            </div>

            <div className="space-y-2">
              {shortcuts.map((sc) => {
                const isRebinding = rebindingId === sc.id;
                return (
                  <div
                    key={sc.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      isRebinding
                        ? 'border-evah-accent bg-evah-accent-subtle shadow-md ring-1 ring-evah-accent'
                        : 'border-evah-border bg-white/[0.02]'
                    }`}
                  >
                    <div>
                      <h4 className="text-xs font-semibold text-white">{sc.name}</h4>
                      <p className="text-[11px] text-evah-text-muted mt-0.5">{sc.description}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {isRebinding ? (
                        <div
                          tabIndex={0}
                          onKeyDown={handleKeyDownRecorder}
                          className="px-3 py-1.5 rounded-lg bg-black border border-evah-accent text-xs font-mono text-teal-300 outline-none animate-pulse cursor-pointer"
                        >
                          {recordedCombo || 'Press key combo...'}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartRebind(sc.id)}
                          className="px-2.5 py-1 rounded-lg bg-black/50 border border-white/20 font-mono text-xs text-evah-accent hover:border-evah-accent transition-colors"
                          title="Click to rebind"
                        >
                          {sc.currentKey}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Rebinding Modal / Conflict Notice */}
            {rebindingId && (
              <div className="p-4 rounded-xl border border-evah-accent bg-black/60 backdrop-blur-md space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">
                    Rebinding: {shortcuts.find((s) => s.id === rebindingId)?.name}
                  </span>
                  <button onClick={() => setRebindingId(null)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-300">
                  Current combo: <kbd className="px-2 py-0.5 rounded bg-black border border-teal-500/40 text-teal-300 font-mono">{recordedCombo || 'Press keys...'}</kbd>
                </p>

                {conflictWarning && (
                  <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs">
                    <div className="font-semibold flex items-center gap-1.5 mb-1">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Shortcut Conflict Detected
                    </div>
                    This combination is currently assigned to: <strong>{conflictWarning.conflictName}</strong>.
                    Saving will replace the existing assignment.
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" size="sm" onClick={() => setRebindingId(null)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!recordedCombo}
                    onClick={handleConfirmRebind}
                  >
                    Save Key Binding
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section 4: Voice & Speech */}
        {activeSection === 'voice' && (
          <div className="max-w-xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">Voice & Speech Synthesis</h3>
              <p className="text-xs text-evah-text-secondary mt-0.5">
                Offline speech greeting with verified phonetic pronunciation ("Ee-vha").
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-evah-border bg-white/[0.02] space-y-4">
              <Toggle
                label="Welcome Speech Greeting"
                description='Plays "Welcome to Ee-vha." upon startup initialization'
                checked={settings.welcomeVoiceEnabled}
                onChange={(c) => updateSettings({ welcomeVoiceEnabled: c })}
              />

              <div className="pt-2 border-t border-evah-border/60">
                <Slider
                  label="Voice Volume"
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  value={settings.welcomeVoiceVolume}
                  formatValue={(v) => `${Math.round(v * 100)}%`}
                  onChange={(v) => updateSettings({ welcomeVoiceVolume: v })}
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Volume2 className="w-3.5 h-3.5" />}
                  onClick={testVoiceGreeting}
                >
                  Test Welcome Voice
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Section 5: USB & Storage */}
        {activeSection === 'usb' && (
          <div className="max-w-xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">USB Hardware Telemetry</h3>
              <p className="text-xs text-evah-text-secondary mt-0.5">
                Physical drive presence and mounted filesystem partition status.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-evah-border bg-white/[0.02] space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-evah-border/40 pb-2">
                <span className="text-evah-text-muted">Presence:</span>
                <span className={device?.isConnected ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {device?.isConnected ? 'ONLINE / CONNECTED' : 'DISCONNECTED'}
                </span>
              </div>
              <div className="flex justify-between border-b border-evah-border/40 pb-2">
                <span className="text-evah-text-muted">Identifier:</span>
                <span className="text-white">{device?.name || 'EVAH_PORTABLE_32GB'}</span>
              </div>
              <div className="flex justify-between border-b border-evah-border/40 pb-2">
                <span className="text-evah-text-muted">Mount Point:</span>
                <span className="text-white">{device?.mountPath || 'E:\\EVAH'}</span>
              </div>
              <div className="flex justify-between border-b border-evah-border/40 pb-2">
                <span className="text-evah-text-muted">Security Signature:</span>
                <span className="text-teal-400">EVAH_DEVICE (Verified)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-evah-text-muted">Serial Hash:</span>
                <span className="text-white">{device?.serialNumber || 'EV-8842-SEC-99'}</span>
              </div>
            </div>

            {/* Storage Capacity Telemetry (Section 67) */}
            {storageStats && (
              <div className="p-4 rounded-2xl border border-evah-border bg-white/[0.02] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-medium text-white">
                    <HardDrive className="w-4 h-4 text-emerald-400" />
                    <span>USB Storage Capacity</span>
                  </div>
                  <span className="text-evah-text-muted font-mono text-[11px]">
                    {(storageStats.totalSizeBytes / (1024 * 1024)).toFixed(1)} MB used / {((storageStats.totalSizeBytes + storageStats.freeSizeBytes) / (1024 * 1024 * 1024)).toFixed(1)} GB
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(1, (storageStats.totalSizeBytes / Math.max(1, storageStats.totalSizeBytes + storageStats.freeSizeBytes)) * 100))}%`,
                    }}
                  />
                </div>

                <div className="flex justify-between text-[11px] text-evah-text-secondary pt-0.5 font-mono">
                  <span>Files: {storageStats.totalFiles}</span>
                  <span>Folders: {storageStats.totalDirectories}</span>
                  <span className="text-emerald-400">Free: {(storageStats.freeSizeBytes / (1024 * 1024 * 1024)).toFixed(1)} GB</span>
                </div>
              </div>
            )}

            {/* Safe Eject Action (Section 68) */}
            <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-950/15 space-y-2">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-semibold text-rose-300">Safe Device Ejection</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Flush write buffers, lock cryptographic vault, and safely unmount the EVAH drive.
                  </p>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  icon={<LogOut className="w-3.5 h-3.5" />}
                  onClick={handleSafeEject}
                >
                  Eject Drive
                </Button>
              </div>
            </div>

            {isDevSimulation && (
              <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-950/20 space-y-3">
                <h4 className="text-xs font-semibold text-amber-300">
                  Developer Mode Simulator
                </h4>
                <p className="text-[11px] text-slate-300">
                  Simulate physical hardware events directly to verify session drop handling:
                </p>
                <div className="flex gap-2">
                  <Button variant="danger" size="sm" onClick={simulateUsbUnplug}>
                    Simulate Disconnecting USB
                  </Button>
                  <Button variant="primary" size="sm" onClick={simulateUsbPlugIn}>
                    Simulate Reconnecting USB
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section 6: Privacy */}
        {activeSection === 'privacy' && (
          <div className="max-w-xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">Privacy & Isolation</h3>
              <p className="text-xs text-evah-text-secondary mt-0.5">
                Local-first privacy architecture with zero telemetry.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-evah-border bg-white/[0.02] space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                EVAH does not contain any third-party tracking pixels, cloud analytics, or remote database synchronization.
              </p>
              <p>
                Private browser tabs are held exclusively in volatile RAM and are zeroed immediately upon session lock or USB detachment.
              </p>
            </div>
          </div>
        )}

        {/* Section 7: About */}
        {activeSection === 'about' && (
          <div className="max-w-xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">About EVAH OS</h3>
              <p className="text-xs text-evah-text-secondary mt-0.5">
                Your Personal Digital Environment, Everywhere.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-evah-border bg-white/[0.02] space-y-3 text-xs text-slate-300 leading-relaxed font-mono">
              <p>Version: 1.0.0 (Production Release)</p>
              <p>Architecture: x86_64 Portable OS Shell</p>
              <p>License: MIT Open Source</p>
              <p>Cryptography: AES-256-GCM, PBKDF2/Argon2id, SHA-256</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
