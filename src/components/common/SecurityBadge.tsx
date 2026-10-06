import React from 'react';
import { ShieldCheck, ShieldAlert, Lock, AlertTriangle, Usb } from 'lucide-react';
import { useSessionStore } from '@/stores/useSessionStore';
import { useVaultStore } from '@/stores/useVaultStore';

export const SecurityBadge: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const lifecycle = useSessionStore((s) => s.lifecycle);
  const device = useSessionStore((s) => s.device);
  const isVaultUnlocked = useVaultStore((s) => s.isUnlocked);

  let label = 'SECURE';
  let colorClass = 'text-evah-accent bg-evah-accent-subtle border-evah-accent/30';
  let dotClass = 'bg-evah-accent';
  let Icon = ShieldCheck;

  if (lifecycle === 'SESSION_INVALIDATED' || !device?.isConnected) {
    label = 'USB DISCONNECTED';
    colorClass = 'text-red-400 bg-red-950/40 border-red-500/30';
    dotClass = 'bg-red-500 animate-ping';
    Icon = AlertTriangle;
  } else if (lifecycle === 'PANIC_LOCKED') {
    label = 'EMERGENCY LOCK';
    colorClass = 'text-red-400 bg-red-950/50 border-red-500/40';
    dotClass = 'bg-red-500';
    Icon = ShieldAlert;
  } else if (lifecycle === 'LOCKED') {
    label = 'LOCKED';
    colorClass = 'text-amber-400 bg-amber-950/40 border-amber-500/30';
    dotClass = 'bg-amber-400';
    Icon = Lock;
  } else if (!isVaultUnlocked) {
    label = 'VAULT SECURED';
    colorClass = 'text-teal-300 bg-teal-950/40 border-teal-500/30';
    dotClass = 'bg-teal-400';
    Icon = ShieldCheck;
  }

  if (compact) {
    return (
      <div 
        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border backdrop-blur-md transition-all ${colorClass}`}
        title={`Security Status: ${label}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
        <span className="tracking-wide">{label}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-medium border backdrop-blur-md transition-all ${colorClass}`}>
      <Icon className="w-3.5 h-3.5" />
      <span className="tracking-wider uppercase font-semibold text-[10px]">{label}</span>
    </div>
  );
};
