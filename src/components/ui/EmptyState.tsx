import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center h-full w-full select-none">
      <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-evah-border flex items-center justify-center text-evah-text-muted mb-3">
        {icon}
      </div>
      <h3 className="text-xs font-semibold text-white tracking-wide">{title}</h3>
      {description && (
        <p className="text-[11px] text-evah-text-muted max-w-xs mt-1 leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <div className="mt-4">
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};

export const LoadingState: React.FC<{ label?: string }> = ({ label = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center h-full w-full select-none">
      <div className="w-5 h-5 border-2 border-evah-accent border-t-transparent rounded-full animate-spin mb-3" />
      <span className="text-xs font-mono text-evah-text-muted">{label}</span>
    </div>
  );
};

export const ErrorState: React.FC<{
  message: string;
  onRetry?: () => void;
}> = ({ message, onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center h-full w-full select-none">
      <div className="w-10 h-10 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h3 className="text-xs font-semibold text-rose-300">An Error Occurred</h3>
      <p className="text-[11px] text-slate-400 mt-1 max-w-xs">{message}</p>
      {onRetry && (
        <div className="mt-3">
          <Button variant="secondary" size="sm" icon={<RefreshCw className="w-3 h-3" />} onClick={onRetry}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
};
