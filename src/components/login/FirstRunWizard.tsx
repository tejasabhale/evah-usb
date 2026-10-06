import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Lock, Shield, Palette, Volume2, CheckCircle2, ArrowRight, ArrowLeft, Usb, Sparkles 
} from 'lucide-react';
import { EvahLogo } from '@/components/common/EvahLogo';
import { AuthService } from '@/services/auth/AuthService';
import { TtsService } from '@/services/tts/TtsService';
import { useSessionStore } from '@/stores/useSessionStore';
import { useThemeStore } from '@/stores/useThemeStore';

interface FirstRunWizardProps {
  onComplete: () => void;
}

export const FirstRunWizard: React.FC<FirstRunWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('Tejas');
  const [fullName, setFullName] = useState('Tejas');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [autoLockMinutes, setAutoLockMinutes] = useState(10);
  const [clipboardTimeout, setClipboardTimeout] = useState(15);
  const [welcomeVoice, setWelcomeVoice] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState('evah-default');
  const [accentColor, setAccentColor] = useState('#14B8A6');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const presets = useThemeStore((s) => s.presets);
  const setPreset = useThemeStore((s) => s.setPreset);
  const updateTokens = useThemeStore((s) => s.updateTokens);
  const refreshUser = useSessionStore((s) => s.refreshUser);
  const updateSettings = useSessionStore((s) => s.updateSettings);

  const handleNext = async () => {
    setError('');
    if (step === 2) {
      if (!username.trim()) {
        setError('Please enter a username.');
        return;
      }
      if (!password || password.length < 4) {
        setError('Password must be at least 4 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }
    if (step < 4) {
      setStep(step + 1);
    } else {
      // Finalize
      setIsSubmitting(true);
      try {
        const auth = AuthService.getInstance();
        await auth.createInitialProfile(username, fullName, password);
        await setPreset(selectedPreset);
        await updateTokens({ accent: accentColor, accentHover: accentColor });
        updateSettings({
          autoLockMinutes,
          clipboardTimeoutSeconds: clipboardTimeout,
          welcomeVoiceEnabled: welcomeVoice,
        });
        refreshUser();
        onComplete();
      } catch (e: any) {
        setError(e.message || 'Setup initialization failed.');
        setIsSubmitting(false);
      }
    }
  };

  const testAudio = () => {
    TtsService.getInstance().playWelcomeGreeting();
  };

  return (
    <div className="fixed inset-0 z-[99990] flex items-center justify-center bg-black/90 text-white backdrop-blur-2xl p-4 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl bg-evah-surface/90 border border-evah-border rounded-2xl shadow-evah-win overflow-hidden backdrop-blur-evah flex flex-col"
      >
        {/* Wizard Header */}
        <div className="p-6 border-b border-evah-border bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <EvahLogo size={36} />
            <div>
              <h2 className="font-semibold text-base text-evah-text tracking-wide">
                Setup Your EVAH Environment
              </h2>
              <p className="text-xs text-evah-text-muted">
                Step {step} of 4 • Portable USB Security
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step
                    ? 'w-6 bg-evah-accent'
                    : i < step
                    ? 'w-2 bg-evah-accent/60'
                    : 'w-2 bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Wizard Step Body */}
        <div className="p-8 flex-1 min-h-[320px]">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="w-12 h-12 rounded-xl bg-evah-accent/15 border border-evah-accent/30 flex items-center justify-center text-evah-accent mb-4">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-evah-text">
                  Welcome to EVAH OS
                </h3>
                <p className="text-sm text-evah-text-secondary leading-relaxed">
                  Your personal, encrypted digital workspace that lives entirely on your USB drive. 
                  Zero telemetry, zero cloud lock-in, and physically guarded against unauthorized access.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-4">
                  <div className="p-3.5 rounded-xl border border-evah-border bg-white/[0.02]">
                    <Shield className="w-5 h-5 text-evah-accent mb-2" />
                    <h4 className="text-xs font-semibold">AES-256 Encrypted</h4>
                    <p className="text-[11px] text-evah-text-muted mt-1">Passwords & vault derived locally on your device.</p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-evah-border bg-white/[0.02]">
                    <Usb className="w-5 h-5 text-cyan-400 mb-2" />
                    <h4 className="text-xs font-semibold">USB Removal Guard</h4>
                    <p className="text-[11px] text-evah-text-muted mt-1">Physical disconnect wipes active session memory instantly.</p>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-bold text-evah-text">
                  User Account & Master Password
                </h3>
                <p className="text-xs text-evah-text-secondary">
                  Your master password derives the AES-256 keys for your vault and offline profile.
                </p>
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-evah-text-secondary mb-1">
                      Username / Handle
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. Tejas"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-evah-border text-white text-sm focus:outline-none focus:border-evah-accent"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-evah-text-secondary mb-1">
                        Master Password
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-evah-border text-white text-sm focus:outline-none focus:border-evah-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-evah-text-secondary mb-1">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-evah-border text-white text-sm focus:outline-none focus:border-evah-accent"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-bold text-evah-text">
                  Security Policies & Automation
                </h3>
                <p className="text-xs text-evah-text-secondary">
                  Configure inactivity locks and secure clipboard handling.
                </p>
                <div className="space-y-4 pt-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-evah-text">Auto-Lock Inactivity Timeout</span>
                      <span className="text-evah-accent font-mono">{autoLockMinutes === 0 ? 'Never' : `${autoLockMinutes} mins`}</span>
                    </div>
                    <select
                      value={autoLockMinutes}
                      onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-evah-border text-xs text-white focus:outline-none focus:border-evah-accent"
                    >
                      <option value={1}>1 Minute</option>
                      <option value={5}>5 Minutes</option>
                      <option value={10}>10 Minutes (Default)</option>
                      <option value={15}>15 Minutes</option>
                      <option value={30}>30 Minutes</option>
                      <option value={60}>1 Hour</option>
                      <option value={0}>Disabled (Never auto-lock)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-evah-text">Clipboard Auto-Clear Timer</span>
                      <span className="text-evah-accent font-mono">{clipboardTimeout === 0 ? 'Never' : `${clipboardTimeout} secs`}</span>
                    </div>
                    <select
                      value={clipboardTimeout}
                      onChange={(e) => setClipboardTimeout(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-evah-border text-xs text-white focus:outline-none focus:border-evah-accent"
                    >
                      <option value={5}>5 Seconds</option>
                      <option value={10}>10 Seconds</option>
                      <option value={15}>15 Seconds (Default)</option>
                      <option value={30}>30 Seconds</option>
                      <option value={60}>60 Seconds</option>
                      <option value={0}>Never Clear</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-evah-border bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                      <Volume2 className="w-5 h-5 text-evah-accent" />
                      <div>
                        <div className="text-xs font-semibold">Welcome to EVAH Voice</div>
                        <div className="text-[11px] text-evah-text-muted">Offline speech greeting upon system startup</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={testAudio}
                        className="px-2.5 py-1 text-[11px] rounded bg-white/10 hover:bg-white/15 text-white"
                      >
                        Test
                      </button>
                      <input
                        type="checkbox"
                        checked={welcomeVoice}
                        onChange={(e) => setWelcomeVoice(e.target.checked)}
                        className="w-4 h-4 accent-teal-500 rounded"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-bold text-evah-text">
                  Appearance & Theme Preset
                </h3>
                <p className="text-xs text-evah-text-secondary">
                  Choose your starting visual style. You can further refine everything inside Theme Studio anytime.
                </p>
                <div className="grid grid-cols-3 gap-2.5 pt-2 max-h-48 overflow-y-auto pr-1">
                  {presets.slice(0, 6).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPreset(p.id)}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        selectedPreset === p.id
                          ? 'border-evah-accent bg-evah-accent-subtle shadow-md'
                          : 'border-evah-border bg-white/[0.02] hover:bg-white/[0.05]'
                      }`}
                    >
                      <span className="text-xs font-semibold text-white">{p.name}</span>
                      <span className="text-[10px] text-evah-text-muted line-clamp-1 mt-1">{p.description}</span>
                    </button>
                  ))}
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-medium text-evah-text-secondary mb-1">
                    Signature Accent Color
                  </label>
                  <div className="flex items-center gap-2">
                    {['#14B8A6', '#06B6D4', '#3B82F6', '#8B5CF6', '#10B981', '#F97316', '#EC4899'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setAccentColor(c)}
                        className={`w-7 h-7 rounded-full border-2 transition-transform ${
                          accentColor === c ? 'scale-110 border-white ring-2 ring-evah-accent' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Wizard Footer Controls */}
        <div className="p-4 px-6 border-t border-evah-border bg-white/[0.02] flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-evah-text-secondary hover:text-white hover:bg-white/5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleNext}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-evah-accent text-black hover:bg-evah-accent-hover transition-colors shadow-lg shadow-evah-accent/20"
          >
            {step === 4 ? (isSubmitting ? 'Creating Environment...' : 'Finish & Enter EVAH') : 'Continue'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
