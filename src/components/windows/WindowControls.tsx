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
    <div
      onMouseDown={(e) => e.stopPropagation()}
      className="flex items-center h-full select-none shrink-0"
      role="toolbar"
      aria-label="Window Controls"
    >
      {/* Minimize Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onMinimize();
        }}
        aria-label="Minimize Window"
        title="Minimize"
        className="w-11 h-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] active:bg-white/[0.14] focus:outline-none focus-visible:bg-white/[0.14] transition-colors cursor-pointer"
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
        className="w-11 h-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] active:bg-white/[0.14] focus:outline-none focus-visible:bg-white/[0.14] transition-colors cursor-pointer"
      >
        {isMaximized ? (
          <Copy className="w-3 h-3" />
        ) : (
          <Square className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Close Button - Always visible, flush to top-right corner, red hover/active */}
      <button
        type="button"
        data-testid="window-close-button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close Window"
        title="Close (Ctrl+W / Esc)"
        className="w-12 h-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#e81123] active:bg-[#c4101f] focus:outline-none focus-visible:bg-[#e81123] focus-visible:text-white transition-colors cursor-pointer group"
      >
        <X className="w-4 h-4 transition-transform group-hover:scale-105" />
      </button>
    </div>
  );
};
