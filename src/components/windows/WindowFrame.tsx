import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Minus, Square, Copy, X } from 'lucide-react';
import { WindowInstance } from '@/types/window';
import { useWindowStore } from '@/stores/useWindowStore';
import { useThemeStore } from '@/stores/useThemeStore';

interface WindowFrameProps {
  window: WindowInstance;
  children: React.ReactNode;
}

export const WindowFrame: React.FC<WindowFrameProps> = ({ window: win, children }) => {
  const { focusWindow, closeWindow, minimizeWindow, maximizeWindow, updateBounds } = useWindowStore();
  const tokens = useThemeStore((s) => s.tokens);

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartPos = useRef({ mouseX: 0, mouseY: 0, winX: 0, winY: 0 });
  const resizeStartPos = useRef({ mouseX: 0, mouseY: 0, width: 0, height: 0, x: 0, y: 0 });
  const resizeDirection = useRef<'se' | 'e' | 's' | 'w' | 'n' | 'sw' | 'nw' | 'ne'>('se');

  // Dragging logic
  const handleTitleBarMouseDown = (e: React.MouseEvent) => {
    if (win.isMaximized) return;
    if ((e.target as HTMLElement).closest('button')) return;

    focusWindow(win.id);
    setIsDragging(true);
    dragStartPos.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      winX: win.bounds.x,
      winY: win.bounds.y,
    };
  };

  // Resize handler
  const handleResizeMouseDown = (
    e: React.MouseEvent,
    direction: 'se' | 'e' | 's' | 'w' | 'n' | 'sw' | 'nw' | 'ne'
  ) => {
    e.stopPropagation();
    if (win.isMaximized) return;

    focusWindow(win.id);
    setIsResizing(true);
    resizeDirection.current = direction;
    resizeStartPos.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      width: win.bounds.width,
      height: win.bounds.height,
      x: win.bounds.x,
      y: win.bounds.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - dragStartPos.current.mouseX;
        const dy = e.clientY - dragStartPos.current.mouseY;
        const screenW = typeof window !== 'undefined' ? window.innerWidth : 1920;
        const screenH = typeof window !== 'undefined' ? window.innerHeight : 1080;

        const newX = Math.min(Math.max(-win.bounds.width + 100, dragStartPos.current.winX + dx), screenW - 100);
        const newY = Math.min(Math.max(32, dragStartPos.current.winY + dy), screenH - 70);

        updateBounds(win.id, { x: newX, y: newY });
      } else if (isResizing) {
        const dx = e.clientX - resizeStartPos.current.mouseX;
        const dy = e.clientY - resizeStartPos.current.mouseY;
        const minW = win.minWidth || 420;
        const minH = win.minHeight || 300;

        let newW = resizeStartPos.current.width;
        let newH = resizeStartPos.current.height;
        let newX = resizeStartPos.current.x;
        let newY = resizeStartPos.current.y;

        const dir = resizeDirection.current;

        if (dir.includes('e')) {
          newW = Math.max(minW, resizeStartPos.current.width + dx);
        }
        if (dir.includes('s')) {
          newH = Math.max(minH, resizeStartPos.current.height + dy);
        }
        if (dir.includes('w')) {
          const possibleW = resizeStartPos.current.width - dx;
          if (possibleW >= minW) {
            newW = possibleW;
            newX = resizeStartPos.current.x + dx;
          }
        }
        if (dir.includes('n')) {
          const possibleH = resizeStartPos.current.height - dy;
          if (possibleH >= minH) {
            newH = possibleH;
            newY = resizeStartPos.current.y + dy;
          }
        }

        updateBounds(win.id, { width: newW, height: newH, x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, win.id, win.bounds.width, win.bounds.height, win.minWidth, win.minHeight, updateBounds]);

  if (!win.isOpen || win.isMinimized) return null;

  return (
    <motion.div
      initial={{ scale: 0.94, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.94, opacity: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      onMouseDown={() => focusWindow(win.id)}
      style={{
        transform: `translate3d(${win.bounds.x}px, ${win.bounds.y}px, 0)`,
        width: `${win.bounds.width}px`,
        height: `${win.bounds.height}px`,
        zIndex: win.zIndex,
        borderRadius: win.isMaximized ? '0px' : `${tokens.windowRadius}px`,
        backgroundColor: `var(--evah-surface)`,
        backdropFilter: `blur(var(--evah-blur-amount, 20px))`,
      }}
      className={`fixed top-0 left-0 flex flex-col border shadow-evah-win overflow-hidden transition-shadow select-none ${
        win.isFocused
          ? 'border-evah-border-strong ring-1 ring-white/10'
          : 'border-evah-border opacity-95'
      }`}
    >
      {/* Title Bar */}
      <div
        onMouseDown={handleTitleBarMouseDown}
        onDoubleClick={() => maximizeWindow(win.id)}
        className={`h-10 px-4 flex items-center justify-between border-b border-evah-border cursor-grab active:cursor-grabbing select-none ${
          win.isFocused ? 'bg-white/[0.04]' : 'bg-transparent'
        }`}
      >
        {/* Left window control traffic dots */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              closeWindow(win.id);
            }}
            className="w-3.5 h-3.5 rounded-full bg-rose-500 hover:bg-rose-600 flex items-center justify-center text-rose-950 transition-colors group"
            title="Close"
          >
            <X className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              minimizeWindow(win.id);
            }}
            className="w-3.5 h-3.5 rounded-full bg-amber-400 hover:bg-amber-500 flex items-center justify-center text-amber-950 transition-colors group"
            title="Minimize"
          >
            <Minus className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              maximizeWindow(win.id);
            }}
            className="w-3.5 h-3.5 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center text-emerald-950 transition-colors group"
            title={win.isMaximized ? 'Restore' : 'Maximize'}
          >
            {win.isMaximized ? (
              <Copy className="w-2 h-2 opacity-0 group-hover:opacity-100 transition-opacity" />
            ) : (
              <Square className="w-2 h-2 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </button>
        </div>

        {/* Center title */}
        <div className="flex items-center gap-2 text-xs font-semibold text-evah-text tracking-wide truncate max-w-[60%] pointer-events-none">
          <span>{win.title}</span>
        </div>

        {/* Right spacing */}
        <div className="w-14" />
      </div>

      {/* Window Body */}
      <div className="flex-1 min-h-0 overflow-hidden relative bg-transparent text-evah-text">
        {children}
      </div>

      {/* Edge & Corner Resize Handles (when not maximized) */}
      {!win.isMaximized && (
        <>
          <div
            onMouseDown={(e) => handleResizeMouseDown(e, 'e')}
            className="absolute top-0 right-0 w-2 h-full cursor-e-resize"
          />
          <div
            onMouseDown={(e) => handleResizeMouseDown(e, 's')}
            className="absolute bottom-0 left-0 w-full h-2 cursor-s-resize"
          />
          <div
            onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-20"
          />
          <div
            onMouseDown={(e) => handleResizeMouseDown(e, 'w')}
            className="absolute top-0 left-0 w-2 h-full cursor-w-resize"
          />
        </>
      )}
    </motion.div>
  );
};
