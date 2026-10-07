import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Folder, Globe, Shield, Settings, Palette, Terminal, FileText, Info 
} from 'lucide-react';
import { WindowInstance } from '@/types/window';
import { useWindowStore } from '@/stores/useWindowStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { WindowHeader } from './WindowHeader';

const getAppIcon = (appId: string) => {
  switch (appId) {
    case 'files': return <Folder className="w-3.5 h-3.5 text-amber-400" />;
    case 'browser': return <Globe className="w-3.5 h-3.5 text-sky-400" />;
    case 'vault': return <Shield className="w-3.5 h-3.5 text-emerald-400" />;
    case 'settings': return <Settings className="w-3.5 h-3.5 text-slate-300" />;
    case 'themes': return <Palette className="w-3.5 h-3.5 text-purple-400" />;
    case 'terminal': return <Terminal className="w-3.5 h-3.5 text-teal-400" />;
    case 'notes': return <FileText className="w-3.5 h-3.5 text-yellow-300" />;
    case 'about': return <Info className="w-3.5 h-3.5 text-cyan-400" />;
    default: return null;
  }
};

interface WindowFrameProps {
  window: WindowInstance;
  children: React.ReactNode;
}

export const WindowFrame: React.FC<WindowFrameProps> = ({ window: win, children }) => {
  const { focusWindow, closeWindow, minimizeWindow, maximizeWindow, centerWindow, updateBounds } = useWindowStore();
  const tokens = useThemeStore((s) => s.tokens);

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartPos = useRef({ mouseX: 0, mouseY: 0, winX: 0, winY: 0 });
  const resizeStartPos = useRef({ mouseX: 0, mouseY: 0, width: 0, height: 0, x: 0, y: 0 });
  const resizeDirection = useRef<'se' | 'e' | 's' | 'w' | 'n' | 'sw' | 'nw' | 'ne'>('se');

  // Dragging handler
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

  // Resizing handler
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

        // Desktop Workspace Constraints: relative to workspace below TopBar
        const newX = Math.min(Math.max(-win.bounds.width + 120, dragStartPos.current.winX + dx), screenW - 120);
        const newY = Math.min(Math.max(0, dragStartPos.current.winY + dy), screenH - 32 - 84);

        updateBounds(win.id, { x: newX, y: newY });
      } else if (isResizing) {
        const dx = e.clientX - resizeStartPos.current.mouseX;
        const dy = e.clientY - resizeStartPos.current.mouseY;
        const minW = win.minWidth || 480;
        const minH = win.minHeight || 340;

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
            newY = Math.max(0, resizeStartPos.current.y + dy);
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
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
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
      className={`absolute top-0 left-0 flex flex-col border shadow-evah-win overflow-hidden transition-shadow select-none ${
        win.isFocused
          ? 'border-evah-border-strong ring-1 ring-white/10'
          : 'border-evah-border opacity-95'
      }`}
    >
      {/* Standardized OS Window Header with Always-Visible Accessible Controls */}
      <WindowHeader
        title={win.title}
        icon={getAppIcon(win.appId)}
        isFocused={win.isFocused}
        isMaximized={win.isMaximized}
        onMouseDown={handleTitleBarMouseDown}
        onDoubleClick={() => maximizeWindow(win.id)}
        onMinimize={() => minimizeWindow(win.id)}
        onMaximize={() => maximizeWindow(win.id)}
        onClose={() => closeWindow(win.id)}
        onCenter={() => centerWindow(win.id)}
      />

      {/* Window Body Container */}
      <div className="flex-1 min-h-0 overflow-hidden relative bg-transparent text-evah-text flex flex-col">
        {children}
      </div>

      {/* 8-Directional Edge & Corner Resize Handles (when not maximized) */}
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
            onMouseDown={(e) => handleResizeMouseDown(e, 'w')}
            className="absolute top-0 left-0 w-2 h-full cursor-w-resize"
          />
          <div
            onMouseDown={(e) => handleResizeMouseDown(e, 'n')}
            className="absolute top-0 left-0 w-full h-2 cursor-n-resize"
          />
          <div
            onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-20"
          />
          <div
            onMouseDown={(e) => handleResizeMouseDown(e, 'sw')}
            className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize z-20"
          />
          <div
            onMouseDown={(e) => handleResizeMouseDown(e, 'ne')}
            className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize z-20"
          />
          <div
            onMouseDown={(e) => handleResizeMouseDown(e, 'nw')}
            className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize z-20"
          />
        </>
      )}
    </motion.div>
  );
};
