import React from 'react';
import { WindowControls } from './WindowControls';

export interface WindowHeaderProps {
  title: string;
  icon?: React.ReactNode;
  subtitle?: string;
  isFocused: boolean;
  isMaximized: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
}

export const WindowHeader: React.FC<WindowHeaderProps> = ({
  title,
  icon,
  subtitle,
  isFocused,
  isMaximized,
  onMouseDown,
  onDoubleClick,
  onMinimize,
  onMaximize,
  onClose,
}) => {
  return (
    <div
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      className={`h-10 px-3.5 flex items-center justify-between border-b border-evah-border cursor-grab active:cursor-grabbing select-none transition-colors ${
        isFocused ? 'bg-white/[0.04]' : 'bg-transparent opacity-85'
      }`}
    >
      {/* Left: App Identity */}
      <div className="flex items-center gap-2.5 min-w-0 max-w-[70%]">
        {icon && <span className="shrink-0 text-evah-accent">{icon}</span>}
        <div className="flex items-center gap-2 truncate">
          <span className="text-xs font-semibold text-white tracking-wide truncate">
            {title}
          </span>
          {subtitle && (
            <span className="text-[10px] font-mono text-evah-text-muted px-1.5 py-0.2 rounded bg-white/[0.04] truncate">
              {subtitle}
            </span>
          )}
        </div>
      </div>

      {/* Right: Window Controls */}
      <WindowControls
        isMaximized={isMaximized}
        onMinimize={onMinimize}
        onMaximize={onMaximize}
        onClose={onClose}
      />
    </div>
  );
};
