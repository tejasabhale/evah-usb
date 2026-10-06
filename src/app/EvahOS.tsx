import React, { useEffect, useState } from 'react';
import { useSessionStore } from '@/stores/useSessionStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { useInactivityTimer } from '@/hooks/useInactivityTimer';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

import { BootScreen } from '@/components/boot/BootScreen';
import { FirstRunWizard } from '@/components/login/FirstRunWizard';
import { LoginScreen } from '@/components/login/LoginScreen';
import { LockScreen } from '@/components/security/LockScreen';
import { TopBar } from '@/components/desktop/TopBar';
import { Desktop } from '@/components/desktop/Desktop';
import { WindowManager } from '@/components/windows/WindowManager';
import { Dock } from '@/components/dock/Dock';
import { NotificationToastContainer } from '@/components/common/NotificationToast';

export const EvahOS: React.FC = () => {
  const lifecycle = useSessionStore((s) => s.lifecycle);
  const isFirstRun = useSessionStore((s) => s.isFirstRun);
  const initializeSession = useSessionStore((s) => s.initialize);
  const completeBoot = useSessionStore((s) => s.completeBoot);
  const initializeTheme = useThemeStore((s) => s.initialize);

  const [hasBooted, setHasBooted] = useState(false);

  // Arm system hooks
  useInactivityTimer();
  useKeyboardShortcuts();

  useEffect(() => {
    // Initial hardware & theme bootstrap
    const init = async () => {
      await initializeTheme();
      await initializeSession();
    };
    init();
  }, []);

  const handleBootComplete = () => {
    setHasBooted(true);
    completeBoot();
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black text-evah-text font-sans select-none">
      {/* Global OS Notifications */}
      <NotificationToastContainer />

      {/* 1. Fullscreen Boot Animation Phase */}
      {!hasBooted && (
        <BootScreen onComplete={handleBootComplete} />
      )}

      {/* 2. First Run Onboarding Phase */}
      {hasBooted && lifecycle === 'FIRST_RUN' && (
        <FirstRunWizard onComplete={() => useSessionStore.getState().completeBoot()} />
      )}

      {/* 3. OS Login Screen Phase */}
      {hasBooted && lifecycle === 'LOGIN' && (
        <LoginScreen onUnlockSuccess={() => {}} />
      )}

      {/* 4. Active Desktop Environment Phase */}
      {hasBooted && lifecycle === 'ACTIVE_SESSION' && (
        <div className="relative w-full h-full overflow-hidden">
          {/* Top Bar / Status Area */}
          <TopBar />

          {/* Desktop Canvas */}
          <Desktop />

          {/* Window Manager Layer */}
          <WindowManager />

          {/* Bottom-Center Floating Taskbar / Dock */}
          <Dock />
        </div>
      )}

      {/* 5. Lock Screen / Panic / USB Disconnect Overlay Phase */}
      {hasBooted && (lifecycle === 'LOCKED' || lifecycle === 'PANIC_LOCKED' || lifecycle === 'SESSION_INVALIDATED') && (
        <LockScreen />
      )}
    </main>
  );
};
