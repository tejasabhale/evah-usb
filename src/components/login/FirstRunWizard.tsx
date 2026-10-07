import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ArrowRight, ShieldCheck, Lock, User, AlertCircle } from 'lucide-react';
import { EvahLogo } from '@/components/common/EvahLogo';
import { AuthService } from '@/services/auth/AuthService';
import { useSessionStore } from '@/stores/useSessionStore';

interface FirstRunWizardProps {
  onComplete: () => void;
}

export const FirstRunWizard: React.FC<FirstRunWizardProps> = ({ onComplete }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const refreshUser = useSessionStore((s) => s.refreshUser);

  const handleCreateAccount = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    const cleanUser = username.trim();
    if (!cleanUser) {
      setError('Please enter a username.');
      return;
    }

    if (!password) {
      setError('Please enter a password.');
      return;
    }

    if (password.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const auth = AuthService.getInstance();
      await auth.createInitialProfile(cleanUser, cleanUser, password);
      refreshUser();
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to create account.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99990] flex items-center justify-center bg-black/90 text-white backdrop-blur-2xl p-4 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-4 flex flex-col items-center text-center">
          <EvahLogo size={48} showText={false} />
          <h1 className="text-xl font-semibold text-white tracking-wide mt-3">
            Welcome to EVAH
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Your portable private environment.
          </p>
        </div>

        {/* Content */}
        <div className="px-8 py-4">
          <AnimatePresence mode="wait">
            {!isSuccess ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <p className="text-xs text-zinc-400 mb-5 text-center">
                  Create your account to continue.
                </p>

                {error && (
                  <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-red-950/60 border border-red-500/30 text-red-200 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleCreateAccount} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Username
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        autoFocus
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. Tejas"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-800/80 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-800/80 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm password"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-800/80 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium bg-teal-500 hover:bg-teal-400 text-black transition-colors disabled:opacity-60 cursor-pointer shadow-sm"
                    >
                      {isSubmitting ? 'Creating Account...' : 'Create Account'}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="py-4 flex flex-col items-center text-center space-y-4"
              >
                <div className="w-12 h-12 rounded-full bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Account created successfully.
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Your credentials and encryption keys are stored securely on the USB drive.
                  </p>
                </div>
                <div className="w-full pt-2">
                  <button
                    type="button"
                    onClick={onComplete}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium bg-teal-500 hover:bg-teal-400 text-black transition-colors cursor-pointer shadow-sm"
                  >
                    Continue
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Security Badging */}
        <div className="px-8 py-4 border-t border-white/5 bg-zinc-950/40 flex items-center justify-center gap-2 text-[11px] text-zinc-500">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
          <span>PBKDF2 SHA-256 Offline Key Derivation</span>
        </div>
      </motion.div>
    </div>
  );
};
