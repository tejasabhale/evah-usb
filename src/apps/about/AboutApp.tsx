import React from 'react';
import { EvahLogo } from '@/components/common/EvahLogo';
import { ShieldCheck, Cpu, HardDrive, Lock, Code2, Globe } from 'lucide-react';

export const AboutApp: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-between h-full w-full bg-evah-surface p-6 text-evah-text select-none text-center">
      <div className="flex flex-col items-center pt-2">
        <EvahLogo size={64} showText={false} />
        <h2 className="text-xl font-bold tracking-wider text-white mt-3">
          EVAH OS
        </h2>
        <span className="text-[11px] uppercase tracking-widest text-evah-text-muted font-mono mt-0.5">
          Version 1.0.0 (x86_64-portable)
        </span>
        <p className="text-xs text-evah-text-secondary max-w-sm mt-3 leading-relaxed">
          Your Personal Digital Environment, Everywhere.
          <br />
          Encrypted, USB-bound, and built completely offline-first.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 w-full max-w-xs text-left my-4">
        <div className="p-2.5 rounded-xl border border-evah-border bg-white/[0.02]">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
            <Lock className="w-3.5 h-3.5 text-evah-accent" />
            <span>AES-256-GCM</span>
          </div>
          <p className="text-[10px] text-evah-text-muted mt-0.5">Zero plain secrets on disk</p>
        </div>
        <div className="p-2.5 rounded-xl border border-evah-border bg-white/[0.02]">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
            <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
            <span>USB Bound</span>
          </div>
          <p className="text-[10px] text-evah-text-muted mt-0.5">Auto-locks on removal</p>
        </div>
        <div className="p-2.5 rounded-xl border border-evah-border bg-white/[0.02]">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>Offline First</span>
          </div>
          <p className="text-[10px] text-evah-text-muted mt-0.5">Zero cloud telemetry</p>
        </div>
        <div className="p-2.5 rounded-xl border border-evah-border bg-white/[0.02]">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
            <Code2 className="w-3.5 h-3.5 text-purple-400" />
            <span>Open Source</span>
          </div>
          <p className="text-[10px] text-evah-text-muted mt-0.5">MIT License</p>
        </div>
      </div>

      <div className="text-[11px] text-evah-text-muted font-mono">
        © 2026 EVAH OS Project • Portable Personal Computing
      </div>
    </div>
  );
};
