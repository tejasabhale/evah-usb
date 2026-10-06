import React, { useState, useEffect, useRef } from 'react';
import { Minus, Square, Copy, X, AlignCenter } from 'lucide-react';
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
  onCenter?: () => void;
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
  onCenter,
}) => {
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenuPos(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenuPos(null);
    };

    if (contextMenuPos) {
      window.addEventListener('mousedown', handleGlobalClick);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('mousedown', handleGlobalClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenuPos]);

  return (
    <>
      <div
        onMouseDown={onMouseDown}
        onDoubleClick={onDoubleClick}
        onContextMenu={handleContextMenu}
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

      {/* Section 13: Window Titlebar Context Menu (Right-Click) */}
      {contextMenuPos && (
        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
          className="fixed z-[9999] w-48 bg-slate-900/95 border border-white/15 rounded-xl shadow-2xl p-1.5 backdrop-blur-xl flex flex-col gap-0.5 text-xs text-white"
        >
          {onCenter && (
            <button
              onClick={() => {
                setContextMenuPos(null);
                onCenter();
              }}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left hover:bg-white/10 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <AlignCenter className="w-3.5 h-3.5 text-teal-400" />
                <span>Center Window</span>
              </div>
            </button>
          )}

          <button
            onClick={() => {
              setContextMenuPos(null);
              onMaximize();
            }}
            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left hover:bg-white/10 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              {isMaximized ? (
                <>
                  <Copy className="w-3.5 h-3.5 text-sky-400" />
                  <span>Restore</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 text-sky-400" />
                  <span>Maximize</span>
                </>
              )}
            </div>
          </button>

          <button
            onClick={() => {
              setContextMenuPos(null);
              onMinimize();
            }}
            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left hover:bg-white/10 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Minus className="w-3.5 h-3.5 text-slate-400" />
              <span>Minimize</span>
            </div>
          </button>

          <div className="my-1 border-t border-white/10" />

          <button
            onClick={() => {
              setContextMenuPos(null);
              onClose();
            }}
            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left hover:bg-rose-500/20 text-rose-300 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <X className="w-3.5 h-3.5 text-rose-400" />
              <span>Close Window</span>
            </div>
            <span className="text-[10px] text-rose-400/70 font-mono">Ctrl+W</span>
          </button>
        </div>
      )}
    </>
  );
};
