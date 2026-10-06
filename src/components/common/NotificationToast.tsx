import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Shield, CheckCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useNotificationStore } from '@/stores/useNotificationStore';

export const NotificationToastContainer: React.FC = () => {
  const notifications = useNotificationStore((s) => s.notifications);
  const removeNotification = useNotificationStore((s) => s.removeNotification);

  const getIcon = (type?: string) => {
    switch (type) {
      case 'security':
        return <Shield className="w-4 h-4 text-evah-accent" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      default:
        return <Info className="w-4 h-4 text-sky-400" />;
    }
  };

  return (
    <div className="fixed top-12 right-4 z-[999999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {notifications.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, y: -16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.9 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl bg-evah-surface/90 border border-evah-border shadow-evah-win backdrop-blur-evah text-evah-text"
          >
            <div className="mt-0.5 shrink-0">{getIcon(n.type)}</div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-semibold text-evah-text leading-tight">
                {n.title}
              </h4>
              {n.message && (
                <p className="text-[11px] text-evah-text-secondary mt-0.5 leading-snug break-words">
                  {n.message}
                </p>
              )}
            </div>
            <button
              onClick={() => removeNotification(n.id)}
              className="p-1 -mr-1 -mt-1 text-evah-text-muted hover:text-evah-text rounded-md transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
