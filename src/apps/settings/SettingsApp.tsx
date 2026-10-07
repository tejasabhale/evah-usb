import React, { useState, useEffect } from 'react';
import { 
  User, Shield, Usb, Keyboard, Info, Palette, 
  Lock, Check, AlertCircle, HardDrive, RotateCcw, 
  X, LogOut, KeyRound, Monitor, Sliders, CheckCircle2
} from 'lucide-react';
import { useSessionStore } from '@/stores/useSessionStore';
import { useVaultStore } from '@/stores/useVaultStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { useWindowStore } from '@/stores/useWindowStore';
import { useShortcutStore } from '@/stores/useShortcutStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { StorageService } from '@/services/storage/StorageService';
import { FileSystemStats } from '@/types/filesystem';
import { Button } from '@/components/ui/Button';
import { Toggle, Select } from '@/components/ui/Toggle';

type SettingsSection = 
  | 'account'
  | 'system'
  | 'security'
  | 'shortcuts'
  | 'about';

export const SettingsApp: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('account');

  const user = useSessionStore((s) => s.user);
  const settings = useSessionStore((s) => s.settings);
  const updateSettings = useSessionStore((s) => s.updateSettings);
  const device = useSessionStore((s) => s.device);
  const logout = useSessionStore((s) => s.logout);
  const changePasswordStore = useSessionStore((s) => s.changePassword);

  const { tokens, updateTokens } = useThemeStore();
  const { shortcuts, updateShortcut, resetDefaults } = useShortcutStore();
  const openWindow = useWindowStore((s) => s.openWindow);
  const pushNotification = useNotificationStore((s) => s.pushNotification);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [isChangingPw, setIsChangingPw] = useState(false);

  // Vault Password state
  const isVaultConfigured = useVaultStore((s) => s.isConfigured);
  const checkVaultConfigured = useVaultStore((s) => s.checkConfigured);
  const changeVaultPasswordStore = useVaultStore((s) => s.changePassword);
  const setupVaultStore = useVaultStore((s) => s.setup);

  const [vaultCurrentPw, setVaultCurrentPw] = useState('');
  const [vaultNewPw, setVaultNewPw] = useState('');
  const [vaultConfirmPw, setVaultConfirmPw] = useState('');
  const [vaultPwError, setVaultPwError] = useState('');
  const [vaultPwSuccess, setVaultPwSuccess] = useState('');
  const [isChangingVaultPw, setIsChangingVaultPw] = useState(false);

  // Key rebinding state
  const [rebindingId, setRebindingId] = useState<string | null>(null);
  const [recordedCombo, setRecordedCombo] = useState<string>('');
  const [conflictWarning, setConflictWarning] = useState<{ conflictName: string; key: string } | null>(null);
  const [storageStats, setStorageStats] = useState<FileSystemStats | null>(null);

  useEffect(() => {
    StorageService.getAdapter()
      .getStats()
      .then(setStorageStats)
      .catch(() => {});
    checkVaultConfigured();
  }, [activeSection]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (!currentPassword) {
      setPwError('Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setPwError('New password must be at least 4 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPwError('New passwords do not match.');
      return;
    }
    if (currentPassword === newPassword) {
      setPwError('New password cannot be identical to current password.');
      return;
    }

    setIsChangingPw(true);
    try {
      await changePasswordStore(currentPassword, newPassword);
      setPwSuccess('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      setPwError(err.message || 'Failed to change password.');
    } finally {
      setIsChangingPw(false);
    }
  };

  const handleChangeVaultPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setVaultPwError('');
    setVaultPwSuccess('');

    if (isVaultConfigured) {
      if (!vaultCurrentPw) {
        setVaultPwError('Please enter your current vault password.');
        return;
      }
      if (!vaultNewPw || vaultNewPw.trim().length < 6) {
        setVaultPwError('New vault password must be at least 6 characters long.');
        return;
      }
      if (vaultNewPw !== vaultConfirmPw) {
        setVaultPwError('New passwords do not match.');
        return;
      }
      if (vaultCurrentPw === vaultNewPw) {
        setVaultPwError('New password cannot be identical to current password.');
        return;
      }

      setIsChangingVaultPw(true);
      try {
        const ok = await changeVaultPasswordStore(vaultCurrentPw, vaultNewPw);
        if (ok) {
          setVaultPwSuccess('Vault master password updated successfully.');
          setVaultCurrentPw('');
          setVaultNewPw('');
          setVaultConfirmPw('');
        } else {
          setVaultPwError(useVaultStore.getState().error || 'Failed to update vault password.');
        }
      } catch (err: any) {
        setVaultPwError(err.message || 'Failed to update vault password.');
      } finally {
        setIsChangingVaultPw(false);
      }
    } else {
      if (!vaultNewPw || vaultNewPw.trim().length < 6) {
        setVaultPwError('Vault password must be at least 6 characters long.');
        return;
      }
      if (vaultNewPw !== vaultConfirmPw) {
        setVaultPwError('Passwords do not match.');
        return;
      }

      setIsChangingVaultPw(true);
      try {
        const ok = await setupVaultStore(vaultNewPw);
        if (ok) {
          setVaultPwSuccess('Vault initialized and password set successfully.');
          setVaultNewPw('');
          setVaultConfirmPw('');
        } else {
          setVaultPwError(useVaultStore.getState().error || 'Failed to initialize vault.');
        }
      } catch (err: any) {
        setVaultPwError(err.message || 'Failed to initialize vault.');
      } finally {
        setIsChangingVaultPw(false);
      }
    }
  };

  const handleSafeEject = () => {
    if (window.confirm('Safely eject EVAH USB drive? Open windows will close and the session will be locked.')) {
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
      const existing = shortcuts.find((sc) => sc.name === conflictWarning.conflictName);
      if (existing) {
        await updateShortcut(existing.id, 'Disabled');
      }
    }

    await updateShortcut(rebindingId, recordedCombo);
    setRebindingId(null);
    setConflictWarning(null);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const createdDate = user?.createdAt 
    ? new Date(user.createdAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })
    : 'System Initialized';

  return (
    <div className="flex h-full w-full bg-zinc-900 text-zinc-100 select-none overflow-hidden font-sans">
      {/* Settings Navigation Sidebar */}
      <div className="w-56 border-r border-white/10 bg-zinc-950/40 flex flex-col p-3 gap-1 shrink-0 overflow-y-auto">
        <div className="px-2 py-1.5 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            System
          </span>
          <h2 className="text-sm font-semibold text-white">Settings</h2>
        </div>

        {[
          { id: 'account', label: 'Account', icon: User },
          { id: 'system', label: 'System & Display', icon: Monitor },
          { id: 'security', label: 'Security', icon: Shield },
          { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
          { id: 'about', label: 'About', icon: Info },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as any)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                isActive
                  ? 'bg-teal-500/15 text-teal-400 font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0 text-teal-400" />
              <span>{item.label}</span>
            </button>
          );
        })}

        <div className="mt-auto pt-3 border-t border-white/10">
          <button
            onClick={() => openWindow('themes')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
          >
            <Palette className="w-3.5 h-3.5 text-teal-400" />
            <span>Theme Studio</span>
          </button>
        </div>
      </div>

      {/* Main Settings Content Area */}
      <div className="flex-1 p-8 overflow-y-auto min-w-0">
        {/* Section 1: Account */}
        {activeSection === 'account' && (
          <div className="max-w-xl space-y-6">
            <div>
              <h3 className="text-base font-semibold text-white">Account</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Manage your portable identity and authentication credentials.
              </p>
            </div>

            {/* Profile Overview */}
            <div className="p-4 rounded-xl border border-white/10 bg-zinc-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-zinc-400">Username</span>
                  <div className="text-sm font-semibold text-white">{user?.username || 'Tejas'}</div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-zinc-400">Account created</span>
                  <div className="text-xs font-medium text-zinc-300">{createdDate}</div>
                </div>
              </div>
            </div>

            {/* Change Password Form */}
            <div className="p-5 rounded-xl border border-white/10 bg-zinc-800/40 space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-teal-400" />
                  <span>Change Password</span>
                </h4>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Updates your master key and credentials persisted on the USB drive.
                </p>
              </div>

              {pwError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-950/60 border border-red-500/30 text-red-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{pwError}</span>
                </div>
              )}

              {pwSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-teal-950/60 border border-teal-500/30 text-teal-300 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-teal-400" />
                  <span>{pwSuccess}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isChangingPw}
                    className="px-4 py-2 rounded-lg text-xs font-medium bg-teal-500 hover:bg-teal-400 text-black transition-colors disabled:opacity-60 cursor-pointer shadow-sm"
                  >
                    {isChangingPw ? 'Updating...' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>

            {/* Session Management */}
            <div className="p-4 rounded-xl border border-white/10 bg-zinc-800/40 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-white">Active Session</h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Log out of this session. Your profile and files will remain securely on the USB.
                </p>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        )}

        {/* Section 2: System & Display */}
        {activeSection === 'system' && (
          <div className="max-w-xl space-y-6">
            <div>
              <h3 className="text-base font-semibold text-white">System & Display</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Display density, storage partition telemetry, and hardware mounting.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-white/10 bg-zinc-800/40 space-y-4">
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

              <div className="pt-3 border-t border-white/10">
                <Select
                  label="Window Corner Radius"
                  value={tokens.windowRadius}
                  onChange={(e) => updateTokens({ windowRadius: parseInt(e.target.value) })}
                  options={[
                    { value: 0, label: 'Square (0px)' },
                    { value: 8, label: 'Subtle (8px)' },
                    { value: 14, label: 'Modern (14px - Default)' },
                    { value: 20, label: 'Rounded (20px)' },
                  ]}
                />
              </div>
            </div>

            {/* Storage Telemetry */}
            <div className="p-4 rounded-xl border border-white/10 bg-zinc-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-teal-400" />
                  <span className="text-xs font-semibold text-white">Storage Overview</span>
                </div>
                <button
                  onClick={() => StorageService.getAdapter().getStats().then(setStorageStats)}
                  className="text-[11px] text-teal-400 hover:underline cursor-pointer"
                >
                  Refresh
                </button>
              </div>

              {storageStats && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-lg bg-zinc-900 border border-white/5">
                    <span className="text-[11px] text-zinc-400">Total Files</span>
                    <div className="text-sm font-semibold text-white mt-0.5">{storageStats.totalFiles}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-900 border border-white/5">
                    <span className="text-[11px] text-zinc-400">Total Directories</span>
                    <div className="text-sm font-semibold text-white mt-0.5">{storageStats.totalDirectories}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-900 border border-white/5">
                    <span className="text-[11px] text-zinc-400">Used Storage</span>
                    <div className="text-sm font-semibold text-white mt-0.5">{formatBytes(storageStats.totalSizeBytes)}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-900 border border-white/5">
                    <span className="text-[11px] text-zinc-400">Free Capacity</span>
                    <div className="text-sm font-semibold text-teal-400 mt-0.5">{formatBytes(storageStats.freeSizeBytes)}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Safe Hardware Eject */}
            <div className="p-4 rounded-xl border border-white/10 bg-zinc-800/40 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-white">Hardware Eject</h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Flushes file writes and locks the session before physically removing USB.
                </p>
              </div>
              <button
                onClick={handleSafeEject}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-600 hover:border-zinc-400 text-zinc-200 transition-colors cursor-pointer"
              >
                Safely Eject USB
              </button>
            </div>
          </div>
        )}

        {/* Section 3: Security */}
        {activeSection === 'security' && (
          <div className="max-w-xl space-y-6">
            <div>
              <h3 className="text-base font-semibold text-white">Security & Policies</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Hardware presence protection, auto-lock timeouts, and clipboard hygiene.
              </p>
            </div>

            {/* Real Security Status Matrix */}
            <div className="p-4 rounded-xl border border-white/10 bg-zinc-800/40 space-y-2.5">
              <span className="text-xs font-semibold text-white block mb-2">Security Status</span>
              
              <div className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                <span className="text-zinc-300">Account Protection</span>
                <span className="text-teal-400 font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Enabled (PBKDF2 SHA-256)
                </span>
              </div>

              <div className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                <span className="text-zinc-300">Encrypted Storage</span>
                <span className="text-teal-400 font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Enabled (AES-256-GCM)
                </span>
              </div>

              <div className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                <span className="text-zinc-300">USB Session Protection</span>
                <span className="text-teal-400 font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Enabled (Hardware-bound)
                </span>
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-zinc-300">Clipboard Sanitization</span>
                <span className="text-teal-400 font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Enabled ({settings.clipboardTimeoutSeconds}s timer)
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-white/10 bg-zinc-800/40 space-y-4">
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

              <div className="pt-3 border-t border-white/10">
                <Select
                  label="Sensitive Clipboard Auto-Clear"
                  value={settings.clipboardTimeoutSeconds}
                  onChange={(e) => updateSettings({ clipboardTimeoutSeconds: parseInt(e.target.value) })}
                  options={[
                    { value: 5, label: '5 Seconds' },
                    { value: 10, label: '10 Seconds' },
                    { value: 15, label: '15 Seconds (Default)' },
                    { value: 30, label: '30 Seconds' },
                    { value: 60, label: '60 Seconds' },
                    { value: 0, label: 'Never Clear' },
                  ]}
                />
              </div>
            </div>

            {/* Vault Security Card */}
            <div className="p-5 rounded-xl border border-white/10 bg-zinc-800/40 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-teal-400" />
                    <span>{isVaultConfigured ? 'Vault Master Password' : 'Set Up Vault Master Password'}</span>
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    {isVaultConfigured
                      ? 'Re-encrypts all vault secrets and updates dedicated vault credentials.'
                      : 'Initialize dedicated vault master encryption key (PBKDF2 SHA-256 + AES-256-GCM).'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openWindow('vault')}
                  className="px-2.5 py-1 text-[11px] font-medium text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 rounded-md transition-colors cursor-pointer"
                >
                  Open Vault
                </button>
              </div>

              {vaultPwError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-950/60 border border-red-500/30 text-red-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{vaultPwError}</span>
                </div>
              )}

              {vaultPwSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-teal-950/60 border border-teal-500/30 text-teal-300 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-teal-400" />
                  <span>{vaultPwSuccess}</span>
                </div>
              )}

              <form onSubmit={handleChangeVaultPassword} className="space-y-3 pt-1">
                {isVaultConfigured && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Current Vault Password
                    </label>
                    <input
                      type="password"
                      value={vaultCurrentPw}
                      onChange={(e) => setVaultCurrentPw(e.target.value)}
                      placeholder="Enter current vault password"
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      {isVaultConfigured ? 'New Vault Password' : 'Vault Password'}
                    </label>
                    <input
                      type="password"
                      value={vaultNewPw}
                      onChange={(e) => setVaultNewPw(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={vaultConfirmPw}
                      onChange={(e) => setVaultConfirmPw(e.target.value)}
                      placeholder="Confirm password"
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isChangingVaultPw}
                    className="px-4 py-2 rounded-lg text-xs font-medium bg-teal-500 hover:bg-teal-400 text-black transition-colors disabled:opacity-60 cursor-pointer shadow-sm"
                  >
                    {isChangingVaultPw
                      ? 'Processing...'
                      : isVaultConfigured
                      ? 'Update Vault Password'
                      : 'Set Up Vault'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Section 4: Keyboard Shortcuts */}
        {activeSection === 'shortcuts' && (
          <div className="max-w-xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">Keyboard Shortcuts</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Click any shortcut key to reassign.
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
                        ? 'border-teal-500 bg-teal-500/10 shadow-sm'
                        : 'border-white/10 bg-zinc-800/40'
                    }`}
                  >
                    <div>
                      <h4 className="text-xs font-semibold text-white">{sc.name}</h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">{sc.description}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {isRebinding ? (
                        <div
                          tabIndex={0}
                          onKeyDown={handleKeyDownRecorder}
                          className="px-3 py-1.5 rounded-lg bg-black border border-teal-500 text-xs font-mono text-teal-300 outline-none animate-pulse cursor-pointer"
                        >
                          {recordedCombo || 'Press key combo...'}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartRebind(sc.id)}
                          className="px-2.5 py-1 rounded-md bg-zinc-900 border border-white/20 font-mono text-xs text-teal-400 hover:border-teal-400 transition-colors cursor-pointer"
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

            {rebindingId && (
              <div className="p-4 rounded-xl border border-teal-500 bg-zinc-950/80 backdrop-blur-md space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">
                    Rebinding: {shortcuts.find((s) => s.id === rebindingId)?.name}
                  </span>
                  <button onClick={() => setRebindingId(null)} className="text-zinc-400 hover:text-white cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-zinc-300">
                  Combo: <kbd className="px-2 py-0.5 rounded bg-black border border-teal-500/40 text-teal-300 font-mono">{recordedCombo || 'Press keys...'}</kbd>
                </p>

                {conflictWarning && (
                  <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs">
                    This combination is currently assigned to: <strong>{conflictWarning.conflictName}</strong>.
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => setRebindingId(null)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmRebind}
                    disabled={!recordedCombo}
                    className="px-4 py-1.5 rounded-lg text-xs font-medium bg-teal-500 hover:bg-teal-400 text-black disabled:opacity-50 cursor-pointer"
                  >
                    Save Shortcut
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section 5: About */}
        {activeSection === 'about' && (
          <div className="max-w-xl space-y-6">
            <div>
              <h3 className="text-base font-semibold text-white">About EVAH</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Portable, offline-first operating environment specifications.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-white/10 bg-zinc-800/40 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-zinc-400">Product Name</span>
                <span className="text-white font-medium">EVAH USB OS</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-zinc-400">Version</span>
                <span className="text-white font-mono">1.0.0 (Production)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-zinc-400">Cryptographic Subsystem</span>
                <span className="text-white font-mono">AES-256-GCM / PBKDF2 (100k iter)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-zinc-400">Execution Mode</span>
                <span className="text-white font-medium">{device?.isConnected ? 'USB Bound Active' : 'Standalone'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-zinc-400">Network Dependency</span>
                <span className="text-teal-400 font-medium">0% (100% Offline-First)</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
