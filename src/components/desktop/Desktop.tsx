import React, { useState, useRef } from 'react';
import { 
  Folder, Globe, Shield, Settings, Palette, Terminal, FileText, Info, 
  FolderPlus, FilePlus, RefreshCw, Lock, Sparkles, Monitor, XSquare
} from 'lucide-react';
import { AppId } from '@/types/window';
import { useWindowStore } from '@/stores/useWindowStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { useSessionStore } from '@/stores/useSessionStore';
import { StorageService } from '@/services/storage/StorageService';
import { useNotificationStore } from '@/stores/useNotificationStore';

interface DesktopIcon {
  id: string;
  appId?: AppId;
  label: string;
  icon: React.ReactNode;
  isFolder?: boolean;
}

const DESKTOP_SHORTCUTS: DesktopIcon[] = [
  {
    id: 'd_files',
    appId: 'files',
    label: 'Files',
    icon: <Folder className="w-8 h-8 text-amber-300 drop-shadow" />,
  },
  {
    id: 'd_vault',
    appId: 'vault',
    label: 'Secure Vault',
    icon: <Shield className="w-8 h-8 text-emerald-300 drop-shadow" />,
  },
  {
    id: 'd_browser',
    appId: 'browser',
    label: 'Web Browser',
    icon: <Globe className="w-8 h-8 text-sky-300 drop-shadow" />,
  },
  {
    id: 'd_notes',
    appId: 'notes',
    label: 'Notes',
    icon: <FileText className="w-8 h-8 text-yellow-300 drop-shadow" />,
  },
  {
    id: 'd_terminal',
    appId: 'terminal',
    label: 'Terminal',
    icon: <Terminal className="w-8 h-8 text-teal-300 drop-shadow" />,
  },
  {
    id: 'd_themes',
    appId: 'themes',
    label: 'Theme Studio',
    icon: <Palette className="w-8 h-8 text-purple-300 drop-shadow" />,
  },
  {
    id: 'd_settings',
    appId: 'settings',
    label: 'Settings',
    icon: <Settings className="w-8 h-8 text-slate-300 drop-shadow" />,
  },
];

export const Desktop: React.FC = () => {
  const desktopWallpaper = useThemeStore((s) => s.desktopWallpaper);
  const { openWindow, closeAllWindows, windows } = useWindowStore();
  const lock = useSessionStore((s) => s.lock);
  const pushNotification = useNotificationStore((s) => s.pushNotification);

  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => {
    if (contextMenu) setContextMenu(null);
  };

  const handleNewFolder = async () => {
    closeContextMenu();
    const name = window.prompt('New folder name:', 'New Folder');
    if (!name) return;
    try {
      const storage = StorageService.getAdapter();
      await storage.createDirectory(`/EVAH/data/files/${name.trim()}`);
      pushNotification({
        title: 'Folder Created',
        message: `/EVAH/data/files/${name}`,
        type: 'success',
      });
      openWindow('files');
    } catch (e: any) {
      pushNotification({ title: 'Error', message: e.message, type: 'error' });
    }
  };

  const handleNewFile = async () => {
    closeContextMenu();
    const name = window.prompt('New file name:', 'note.md');
    if (!name) return;
    try {
      const storage = StorageService.getAdapter();
      await storage.writeFile(`/EVAH/data/files/${name.trim()}`, `# ${name}\n\nCreated on desktop.`);
      pushNotification({
        title: 'File Created',
        message: `/EVAH/data/files/${name}`,
        type: 'success',
      });
      openWindow('files');
    } catch (e: any) {
      pushNotification({ title: 'Error', message: e.message, type: 'error' });
    }
  };

  return (
    <div
      onClick={() => {
        setSelectedIconId(null);
        closeContextMenu();
      }}
      onContextMenu={handleContextMenu}
      className="absolute inset-0 z-0 overflow-hidden select-none"
    >
      {/* Desktop Wallpaper with Dynamic CSS Filters */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-500 pointer-events-none"
        style={{
          backgroundImage: `url("${desktopWallpaper.url}")`,
          filter: `blur(${desktopWallpaper.blur}px) brightness(${desktopWallpaper.brightness}%) contrast(${desktopWallpaper.contrast}%) saturation(${desktopWallpaper.saturation}%) grayscale(${desktopWallpaper.grayscale}%)`,
          transform: `scale(${desktopWallpaper.zoom || 1})`,
        }}
      />

      {/* Wallpaper Color Tint & Opacity Overlay */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-300"
        style={{
          backgroundColor: desktopWallpaper.overlayColor,
          opacity: desktopWallpaper.overlayOpacity,
        }}
      />

      {/* Desktop Icon Grid */}
      <div className="relative z-10 pt-12 pl-6 flex flex-col flex-wrap gap-4 max-h-[82vh] w-fit">
        {DESKTOP_SHORTCUTS.map((item) => (
          <div
            key={item.id}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedIconId(item.id);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (item.appId) openWindow(item.appId);
            }}
            className={`w-20 p-2 rounded-xl flex flex-col items-center text-center cursor-pointer transition-all ${
              selectedIconId === item.id
                ? 'bg-white/20 border border-white/30 backdrop-blur-md shadow-lg'
                : 'hover:bg-white/10 border border-transparent'
            }`}
          >
            <div className="mb-1 pointer-events-none">{item.icon}</div>
            <span className="text-[11px] font-semibold text-white drop-shadow-md tracking-tight leading-tight select-none">
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Desktop Right-Click Context Menu */}
      {contextMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 w-52 bg-evah-surface/95 border border-evah-border rounded-xl shadow-evah-menu p-1.5 backdrop-blur-evah flex flex-col gap-0.5 text-xs text-white"
        >
          <button
            onClick={handleNewFolder}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-white/10 transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
            <span>New Folder</span>
          </button>
          <button
            onClick={handleNewFile}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-white/10 transition-colors"
          >
            <FilePlus className="w-3.5 h-3.5 text-sky-400" />
            <span>New Document</span>
          </button>

          <div className="my-1 border-t border-evah-border" />

          <button
            onClick={() => {
              closeContextMenu();
              openWindow('themes');
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-white/10 transition-colors"
          >
            <Palette className="w-3.5 h-3.5 text-purple-400" />
            <span>Change Wallpaper...</span>
          </button>
          <button
            onClick={() => {
              closeContextMenu();
              openWindow('themes');
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-white/10 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>Theme Studio...</span>
          </button>
          <button
            onClick={() => {
              closeContextMenu();
              openWindow('settings');
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-white/10 transition-colors"
          >
            <Monitor className="w-3.5 h-3.5 text-slate-300" />
            <span>Display Settings</span>
          </button>

          {windows.length > 0 && (
            <>
              <div className="my-1 border-t border-evah-border" />
              <button
                onClick={() => {
                  closeContextMenu();
                  closeAllWindows();
                  pushNotification({
                    title: 'Windows Closed',
                    message: 'All open applications closed safely.',
                    type: 'info',
                  });
                }}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left hover:bg-rose-500/20 text-rose-300 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <XSquare className="w-3.5 h-3.5 text-rose-400" />
                  <span>Close All Windows</span>
                </div>
                <span className="text-[10px] text-rose-400/70 font-mono">({windows.length})</span>
              </button>
            </>
          )}

          <div className="my-1 border-t border-evah-border" />

          <button
            onClick={() => {
              closeContextMenu();
              lock('Desktop Context Menu');
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-white/10 text-amber-300 transition-colors"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock Screen</span>
          </button>
        </div>
      )}
    </div>
  );
};
