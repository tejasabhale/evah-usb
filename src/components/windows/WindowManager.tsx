import React, { useEffect } from 'react';
import { useWindowStore } from '@/stores/useWindowStore';
import { WindowFrame } from './WindowFrame';
import { APP_COMPONENTS } from '@/app/AppRegistry';

export const WindowManager: React.FC = () => {
  const windows = useWindowStore((s) => s.windows);
  const handleViewportResize = useWindowStore((s) => s.handleViewportResize);

  useEffect(() => {
    const onResize = () => {
      handleViewportResize();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [handleViewportResize]);

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      {windows.map((win) => {
        const AppComponent = APP_COMPONENTS[win.appId];
        if (!AppComponent) return null;

        return (
          <div key={win.id} className="pointer-events-auto">
            <WindowFrame window={win}>
              <AppComponent {...(win.initialParams || {})} />
            </WindowFrame>
          </div>
        );
      })}
    </div>
  );
};
