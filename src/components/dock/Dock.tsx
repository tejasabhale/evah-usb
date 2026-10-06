import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { 
  Folder, Globe, Shield, Settings, Palette, Terminal, FileText, Info, ShieldAlert 
} from 'lucide-react';
import { AppId } from '@/types/window';
import { useWindowStore } from '@/stores/useWindowStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { useSessionStore } from '@/stores/useSessionStore';

interface DockAppDef {
  appId: AppId;
  label: string;
  icon: React.ReactNode;
  bgGrad: string;
}

const DOCK_APPS: DockAppDef[] = [
  {
    appId: 'files',
    label: 'Files',
    icon: <Folder className="w-5 h-5 text-amber-300" />,
    bgGrad: 'from-amber-600/30 to-amber-700/50',
  },
  {
    appId: 'browser',
    label: 'Browser',
    icon: <Globe className="w-5 h-5 text-sky-300" />,
    bgGrad: 'from-sky-600/30 to-blue-700/50',
  },
  {
    appId: 'vault',
    label: 'Vault',
    icon: <Shield className="w-5 h-5 text-emerald-300" />,
    bgGrad: 'from-emerald-600/30 to-teal-700/50',
  },
  {
    appId: 'notes',
    label: 'Notes',
    icon: <FileText className="w-5 h-5 text-yellow-300" />,
    bgGrad: 'from-yellow-600/30 to-amber-700/50',
  },
  {
    appId: 'terminal',
    label: 'Terminal',
    icon: <Terminal className="w-5 h-5 text-teal-300" />,
    bgGrad: 'from-slate-800 to-black',
  },
  {
    appId: 'themes',
    label: 'Theme Studio',
    icon: <Palette className="w-5 h-5 text-purple-300" />,
    bgGrad: 'from-purple-600/30 to-pink-700/50',
  },
  {
    appId: 'settings',
    label: 'Settings',
    icon: <Settings className="w-5 h-5 text-slate-300" />,
    bgGrad: 'from-slate-600/30 to-slate-800/50',
  },
  {
    appId: 'about',
    label: 'About EVAH',
    icon: <Info className="w-5 h-5 text-cyan-300" />,
    bgGrad: 'from-cyan-600/30 to-blue-700/50',
  },
];

export const Dock: React.FC = () => {
  const { toggleWindow, windows } = useWindowStore();
  const tokens = useThemeStore((s) => s.tokens);
  const panicLock = useSessionStore((s) => s.panicLock);

  const mouseX = useMotionValue(Infinity);

  // Position class
  let positionClass = 'left-1/2 -translate-x-1/2 bottom-4';
  if (tokens.dockPosition === 'bottom-left') {
    positionClass = 'left-6 bottom-4';
  } else if (tokens.dockPosition === 'bottom-right') {
    positionClass = 'right-6 bottom-4';
  }

  return (
    <div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={`fixed ${positionClass} z-40 flex items-end gap-2 px-3 py-2 rounded-evah-dock border shadow-evah-dock transition-all backdrop-blur-evah select-none`}
      style={{
        backgroundColor: `var(--evah-dock-bg)`,
        borderColor: `var(--evah-border)`,
      }}
    >
      {DOCK_APPS.map((app) => {
        const isRunning = windows.some((w) => w.appId === app.appId && w.isOpen);
        return (
          <DockIcon
            key={app.appId}
            app={app}
            mouseX={mouseX}
            isRunning={isRunning}
            onClick={() => toggleWindow(app.appId)}
          />
        );
      })}

      {/* Dock divider */}
      <div className="w-[1px] h-7 bg-white/10 mx-0.5 mb-2" />

      {/* Emergency Panic Lock Dock Icon */}
      <DockPanicIcon mouseX={mouseX} onClick={panicLock} />
    </div>
  );
};

interface DockIconProps {
  app: DockAppDef;
  mouseX: any;
  isRunning: boolean;
  onClick: () => void;
}

const DockIcon: React.FC<DockIconProps> = ({ app, mouseX, isRunning, onClick }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthSync = useTransform(distance, [-120, 0, 120], [44, 58, 44]);
  const width = useSpring(widthSync, { mass: 0.1, stiffness: 180, damping: 14 });

  return (
    <div className="flex flex-col items-center relative group">
      {/* Tooltip */}
      {isHovered && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-9 px-2.5 py-1 rounded-lg bg-black/80 border border-white/10 text-white text-[11px] font-medium backdrop-blur-md shadow-lg pointer-events-none whitespace-nowrap z-50"
        >
          {app.label}
        </motion.div>
      )}

      <motion.div
        ref={ref}
        style={{ width, height: width }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onClick}
        whileTap={{ scale: 0.88 }}
        className={`rounded-2xl flex items-center justify-center cursor-pointer border border-white/10 shadow-md bg-gradient-to-tr ${app.bgGrad} relative transition-shadow hover:shadow-lg`}
      >
        {app.icon}
      </motion.div>

      {/* Running App Dot */}
      <div className="h-1.5 flex items-center justify-center mt-1">
        {isRunning && (
          <span 
            className="w-1.5 h-1.5 rounded-full shadow-sm"
            style={{ backgroundColor: 'var(--evah-accent, #14B8A6)' }}
          />
        )}
      </div>
    </div>
  );
};

const DockPanicIcon: React.FC<{ mouseX: any; onClick: () => void }> = ({ mouseX, onClick }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthSync = useTransform(distance, [-120, 0, 120], [44, 56, 44]);
  const width = useSpring(widthSync, { mass: 0.1, stiffness: 180, damping: 14 });

  return (
    <div className="flex flex-col items-center relative group">
      {isHovered && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-9 px-2.5 py-1 rounded-lg bg-rose-950/90 border border-rose-500/30 text-rose-200 text-[11px] font-medium backdrop-blur-md shadow-lg pointer-events-none whitespace-nowrap z-50"
        >
          Emergency Panic Lock
        </motion.div>
      )}

      <motion.div
        ref={ref}
        style={{ width, height: width }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onClick}
        whileTap={{ scale: 0.88 }}
        className="rounded-2xl flex items-center justify-center cursor-pointer border border-rose-500/30 shadow-md bg-gradient-to-tr from-rose-950/80 to-rose-900/60 text-rose-300 relative hover:border-rose-400"
      >
        <ShieldAlert className="w-5 h-5" />
      </motion.div>

      <div className="h-1.5 flex items-center justify-center mt-1" />
    </div>
  );
};
