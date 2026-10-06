import React from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';

export interface WindowControlsProps {
  isMaximized: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
}

export const WindowControls: React.FC<WindowControlsProps> = ({
  isMaximized,
  onMinimize,
  onMaximize,
  onClose,
}) => {
  return (
    <div className="flex items-center gap-1 select-none shrink-0" role="toolbar" aria-label="Window Controls">
      {/* Minimize Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onMinimize();
        }}
        aria-label="Minimize Window"
        title="Minimize"
        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>

      {/* Maximize / Restore Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onMaximize();
        }}
        aria-label={isMaximized ? 'Restore Window' : 'Maximize Window'}
        title={isMaximized ? 'Restore' : 'Maximize'}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer"
      >
        {isMaximized ? (
          <Copy className="w-3 h-3" />
        ) : (
          <Square className="w-3 h-3" />
        )}
      </button>

      {/* Close Button - prominent, visible, accessible */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close Window"
        title="Close (Ctrl+W / Esc)"
        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-200 hover:bg-rose-600/80 active:scale-95 transition-all cursor-pointer ml-0.5 group"
      >
        <X className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
      </button>
    </div>
  );
};
