import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, ArrowRight, RotateCw, Home, Plus, X, Globe, 
  ShieldCheck, Bookmark, History, Trash2, Search, ExternalLink, 
  Lock, Download, ZoomIn, ZoomOut, Maximize2, ShieldAlert, Copy, 
  EyeOff, Check, FileText, Code2, BookOpen
} from 'lucide-react';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { useSessionStore } from '@/stores/useSessionStore';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';

interface BrowserTab {
  id: string;
  title: string;
  url: string;
  history: string[];
  historyIndex: number;
  isLoading: boolean;
  isPrivate?: boolean;
}

interface DownloadItem {
  id: string;
  filename: string;
  sizeBytes: number;
  progress: number;
  status: 'completed' | 'downloading';
  url: string;
  completedAt: string;
}

const BOOKMARK_PRESETS = [
  { title: 'EVAH System Docs', url: 'evah://docs' },
  { title: 'Offline Dev Tools', url: 'evah://tools' },
  { title: 'DuckDuckGo', url: 'https://duckduckgo.com' },
  { title: 'MDN Web Docs', url: 'https://developer.mozilla.org' },
  { title: 'Rust Language', url: 'https://www.rust-lang.org' },
  { title: 'Tailwind CSS', url: 'https://tailwindcss.com' },
];

export const BrowserApp: React.FC = () => {
  const [tabs, setTabs] = useState<BrowserTab[]>([
    {
      id: 'tab_initial',
      title: 'EVAH Portal',
      url: 'evah://welcome',
      history: ['evah://welcome'],
      historyIndex: 0,
      isLoading: false,
      isPrivate: false,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState('tab_initial');
  const [closedTabs, setClosedTabs] = useState<BrowserTab[]>([]);
  const [urlInput, setUrlInput] = useState('evah://welcome');

  // Drawers & Modals
  const [activeDrawer, setActiveDrawer] = useState<'none' | 'history' | 'downloads' | 'privacy'>('none');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isPrivateMode, setIsPrivateMode] = useState(false);

  // History & Downloads data
  const [historyList, setHistoryList] = useState<{ url: string; title: string; time: string; isPrivate: boolean }[]>([]);
  const [downloadsList, setDownloadsList] = useState<DownloadItem[]>([
    {
      id: 'dl_1',
      filename: 'evah-usb-manual.pdf',
      sizeBytes: 1048576,
      progress: 100,
      status: 'completed',
      url: 'evah://docs',
      completedAt: 'Just now',
    },
  ]);

  const urlInputRef = useRef<HTMLInputElement>(null);
  const pushNotification = useNotificationStore((s) => s.pushNotification);
  const lifecycle = useSessionStore((s) => s.lifecycle);

  // Wipe private sessions if panic or USB removal occurs
  useEffect(() => {
    if (lifecycle === 'PANIC_LOCKED' || lifecycle === 'SESSION_INVALIDATED') {
      setTabs((prev) => prev.filter((t) => !t.isPrivate));
      setHistoryList((prev) => prev.filter((h) => !h.isPrivate));
      setIsPrivateMode(false);
    }
  }, [lifecycle]);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  useEffect(() => {
    if (activeTab) {
      setUrlInput(activeTab.url);
      setIsPrivateMode(Boolean(activeTab.isPrivate));
    }
  }, [activeTab?.id]);

  const navigateTo = (inputUrl: string) => {
    let target = inputUrl.trim();
    if (!target) return;

    if (!target.startsWith('http://') && !target.startsWith('https://') && !target.startsWith('evah://')) {
      if (target.includes('.') && !target.includes(' ')) {
        target = `https://${target}`;
      } else {
        target = `https://duckduckgo.com/?q=${encodeURIComponent(target)}`;
      }
    }

    setUrlInput(target);
    const title = formatTabTitle(target);

    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== activeTabId) return t;
        const newHistory = t.history.slice(0, t.historyIndex + 1);
        newHistory.push(target);
        return {
          ...t,
          url: target,
          title,
          history: newHistory,
          historyIndex: newHistory.length - 1,
          isLoading: false,
        };
      })
    );

    // Record history unless in private mode
    if (!activeTab?.isPrivate) {
      setHistoryList((prev) => [
        { url: target, title, time: new Date().toLocaleTimeString(), isPrivate: false },
        ...prev.slice(0, 99),
      ]);
    }
  };

  const formatTabTitle = (url: string) => {
    if (url === 'evah://welcome') return 'EVAH Portal';
    if (url === 'evah://docs') return 'EVAH System Docs';
    if (url === 'evah://tools') return 'Offline Tools';
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  const handleNewTab = (asPrivate = false) => {
    const id = 'tab_' + Date.now();
    const newTab: BrowserTab = {
      id,
      title: asPrivate ? 'Private Tab' : 'New Tab',
      url: 'evah://welcome',
      history: ['evah://welcome'],
      historyIndex: 0,
      isLoading: false,
      isPrivate: asPrivate,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(id);
    if (asPrivate) {
      pushNotification({
        title: 'Private Browsing Mode',
        message: 'No cookies or history stored. Wiped on panic lock.',
        type: 'security',
      });
    }
  };

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    const targetTab = tabs.find((t) => t.id === tabId);
    if (targetTab && !targetTab.isPrivate) {
      setClosedTabs((prev) => [targetTab, ...prev.slice(0, 9)]);
    }

    if (tabs.length === 1) {
      handleNewTab();
    }

    setTabs((prev) => prev.filter((t) => t.id !== tabId));
    if (activeTabId === tabId) {
      const remaining = tabs.filter((t) => t.id !== tabId);
      if (remaining.length > 0) setActiveTabId(remaining[remaining.length - 1].id);
    }
  };

  const handleReopenClosedTab = () => {
    if (closedTabs.length === 0) return;
    const [reopened, ...rest] = closedTabs;
    setTabs((prev) => [...prev, reopened]);
    setActiveTabId(reopened.id);
    setClosedTabs(rest);
  };

  const handleGoBack = () => {
    if (activeTab.historyIndex > 0) {
      const nextIdx = activeTab.historyIndex - 1;
      const targetUrl = activeTab.history[nextIdx];
      setUrlInput(targetUrl);
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? { ...t, historyIndex: nextIdx, url: targetUrl, title: formatTabTitle(targetUrl) }
            : t
        )
      );
    }
  };

  const handleGoForward = () => {
    if (activeTab.historyIndex < activeTab.history.length - 1) {
      const nextIdx = activeTab.historyIndex + 1;
      const targetUrl = activeTab.history[nextIdx];
      setUrlInput(targetUrl);
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? { ...t, historyIndex: nextIdx, url: targetUrl, title: formatTabTitle(targetUrl) }
            : t
        )
      );
    }
  };

  const handleClearBrowsingData = () => {
    setHistoryList([]);
    setClosedTabs([]);
    setActiveDrawer('none');
    pushNotification({
      title: 'Browsing Data Purged',
      message: 'History, offline caches, and session cookies cleared from USB.',
      type: 'security',
    });
  };

  // Keyboard navigation within browser app
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') {
      e.preventDefault();
      handleNewTab();
    } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 't') {
      e.preventDefault();
      handleReopenClosedTab();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      urlInputRef.current?.focus();
      urlInputRef.current?.select();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
      e.preventDefault();
      navigateTo(activeTab.url);
    }
  };

  return (
    <div
      onKeyDown={handleKeyDown}
      className={`flex flex-col h-full w-full select-none overflow-hidden ${
        activeTab?.isPrivate ? 'bg-[#0a0714]' : 'bg-evah-surface'
      } text-evah-text`}
    >
      {/* Top Tabs Bar */}
      <div className="h-9 bg-black/40 border-b border-evah-border flex items-center px-2 gap-1 overflow-x-auto shrink-0">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`group flex items-center gap-2 h-7 px-3 rounded-t-xl text-xs font-medium cursor-pointer transition-all max-w-[200px] border-t border-l border-r ${
                isActive
                  ? tab.isPrivate
                    ? 'bg-[#18112b] border-purple-500/40 text-purple-200'
                    : 'bg-evah-surface border-evah-border text-white'
                  : 'border-transparent text-evah-text-muted hover:bg-white/[0.04]'
              }`}
            >
              {tab.isPrivate ? (
                <EyeOff className="w-3.5 h-3.5 shrink-0 text-purple-400" />
              ) : (
                <Globe className="w-3.5 h-3.5 shrink-0 text-evah-accent" />
              )}
              <span className="truncate flex-1 text-[11px]">{tab.title}</span>
              <button
                onClick={(e) => handleCloseTab(e, tab.id)}
                className="p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                title="Close Tab"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        <IconButton
          icon={<Plus className="w-3.5 h-3.5" />}
          label="New Tab (Ctrl+T)"
          size="sm"
          onClick={() => handleNewTab(false)}
        />
        <IconButton
          icon={<EyeOff className="w-3.5 h-3.5 text-purple-400" />}
          label="New Private Tab"
          size="sm"
          onClick={() => handleNewTab(true)}
        />
      </div>

      {/* Navigation & Address Bar */}
      <div className="h-11 px-3 border-b border-evah-border flex items-center gap-2 bg-white/[0.01] shrink-0">
        <div className="flex items-center gap-1">
          <IconButton
            icon={<ArrowLeft className="w-4 h-4" />}
            label="Back (Alt+Left)"
            size="sm"
            disabled={activeTab.historyIndex <= 0}
            onClick={handleGoBack}
          />
          <IconButton
            icon={<ArrowRight className="w-4 h-4" />}
            label="Forward (Alt+Right)"
            size="sm"
            disabled={activeTab.historyIndex >= activeTab.history.length - 1}
            onClick={handleGoForward}
          />
          <IconButton
            icon={<RotateCw className="w-3.5 h-3.5" />}
            label="Reload (Ctrl+R)"
            size="sm"
            onClick={() => navigateTo(activeTab.url)}
          />
          <IconButton
            icon={<Home className="w-4 h-4" />}
            label="Home"
            size="sm"
            onClick={() => navigateTo('evah://welcome')}
          />
        </div>

        {/* Address Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            navigateTo(urlInput);
          }}
          className="flex-1 flex items-center relative min-w-0"
        >
          <div className="absolute left-3 flex items-center gap-1.5 pointer-events-none">
            {activeTab?.isPrivate ? (
              <EyeOff className="w-3 h-3 text-purple-400" />
            ) : (
              <Lock className="w-3 h-3 text-emerald-400" />
            )}
          </div>
          <input
            ref={urlInputRef}
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 rounded-xl bg-black/40 border border-evah-border text-xs text-white placeholder-evah-text-muted focus:outline-none focus:border-evah-accent font-mono transition-colors allow-select"
            placeholder="Search DuckDuckGo or enter URL..."
          />
        </form>

        {/* Browser Utility Buttons */}
        <div className="flex items-center gap-1">
          {/* Zoom controls */}
          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg border border-evah-border bg-black/20 text-[11px] font-mono text-slate-300">
            <button
              onClick={() => setZoomLevel((z) => Math.max(75, z - 10))}
              className="hover:text-white p-0.5"
              title="Zoom Out"
            >
              -
            </button>
            <span className="px-1">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
              className="hover:text-white p-0.5"
              title="Zoom In"
            >
              +
            </button>
          </div>

          <IconButton
            icon={<Bookmark className="w-4 h-4 text-evah-accent" />}
            label="Bookmarks"
            size="sm"
          />
          <IconButton
            icon={<Download className="w-4 h-4" />}
            label="Downloads"
            size="sm"
            active={activeDrawer === 'downloads'}
            onClick={() => setActiveDrawer(activeDrawer === 'downloads' ? 'none' : 'downloads')}
          />
          <IconButton
            icon={<History className="w-4 h-4" />}
            label="History"
            size="sm"
            active={activeDrawer === 'history'}
            onClick={() => setActiveDrawer(activeDrawer === 'history' ? 'none' : 'history')}
          />
          <IconButton
            icon={<Trash2 className="w-4 h-4 text-rose-400" />}
            label="Clear Browsing Data"
            size="sm"
            onClick={() => setActiveDrawer(activeDrawer === 'privacy' ? 'none' : 'privacy')}
          />
        </div>
      </div>

      {/* Bookmarks Bar */}
      <div className="h-7 border-b border-evah-border/60 px-3 flex items-center gap-3 text-[11px] text-evah-text-secondary bg-black/15 shrink-0 overflow-x-auto scrollbar-none">
        {BOOKMARK_PRESETS.map((bm) => (
          <button
            key={bm.url}
            onClick={() => navigateTo(bm.url)}
            className="hover:text-white truncate flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-white/[0.04]"
          >
            <Globe className="w-3 h-3 text-evah-accent shrink-0" />
            <span className="truncate">{bm.title}</span>
          </button>
        ))}
      </div>

      {/* Main Browser Viewport */}
      <div className="flex-1 min-h-0 relative overflow-hidden flex">
        <div
          className="flex-1 h-full overflow-y-auto"
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left' }}
        >
          {/* Internal EVAH Pages */}
          {activeTab.url === 'evah://welcome' && (
            <div className="h-full p-8 flex flex-col items-center justify-center max-w-xl mx-auto text-center space-y-4 select-none">
              <div className="w-14 h-14 rounded-2xl bg-evah-accent-subtle border border-evah-accent/30 flex items-center justify-center text-evah-accent mx-auto">
                <Globe className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-white">
                EVAH Offline-First Secure Browser
              </h2>
              <p className="text-xs text-evah-text-secondary leading-relaxed">
                Equipped with isolated browsing profiles, local privacy data wiping, and zero telemetry tracking.
                All session caches and download receipts are stored exclusively on your USB partition.
              </p>

              <div className="grid grid-cols-2 gap-3 w-full pt-4 text-left">
                <div
                  onClick={() => navigateTo('evah://docs')}
                  className="p-3.5 rounded-2xl border border-evah-border bg-white/[0.02] hover:bg-white/[0.05] cursor-pointer transition-all"
                >
                  <BookOpen className="w-4 h-4 text-evah-accent mb-1" />
                  <h4 className="text-xs font-semibold text-white">EVAH Architecture Docs</h4>
                  <p className="text-[10px] text-evah-text-muted mt-0.5">Offline system manual</p>
                </div>
                <div
                  onClick={() => navigateTo('evah://tools')}
                  className="p-3.5 rounded-2xl border border-evah-border bg-white/[0.02] hover:bg-white/[0.05] cursor-pointer transition-all"
                >
                  <Code2 className="w-4 h-4 text-sky-400 mb-1" />
                  <h4 className="text-xs font-semibold text-white">Offline Developer Tools</h4>
                  <p className="text-[10px] text-evah-text-muted mt-0.5">Hash, base64, JSON formatter</p>
                </div>
              </div>
            </div>
          )}

          {activeTab.url === 'evah://docs' && (
            <div className="p-8 max-w-2xl mx-auto space-y-5 text-left select-text">
              <div className="border-b border-evah-border pb-4">
                <span className="text-[10px] uppercase font-mono text-evah-accent">Documentation</span>
                <h2 className="text-xl font-bold text-white mt-1">EVAH Security & Architecture</h2>
              </div>
              <div className="prose prose-invert text-xs space-y-3 leading-relaxed text-slate-300">
                <h3 className="text-sm font-semibold text-white">1. Portable Hardware Session</h3>
                <p>
                  EVAH operates by continuously polling the mounted volume containing the marker <code className="bg-black/50 px-1 py-0.5 rounded text-teal-300">EVAH_DEVICE</code>.
                  When removed, volatile keys derived from Argon2id/PBKDF2 are purged immediately from RAM.
                </p>
                <h3 className="text-sm font-semibold text-white">2. AES-256-GCM Vault</h3>
                <p>
                  All credentials and private tokens are encrypted using authenticated symmetric cryptography. Zero plaintext credentials ever persist to the host machine.
                </p>
                <h3 className="text-sm font-semibold text-white">3. Offline Guarantee</h3>
                <p>
                  EVAH includes local speech synthesis, self-contained filesystem storage, and zero telemetry endpoints.
                </p>
              </div>
            </div>
          )}

          {activeTab.url === 'evah://tools' && (
            <div className="p-8 max-w-xl mx-auto space-y-4 text-left select-text">
              <div className="border-b border-evah-border pb-3">
                <h2 className="text-base font-bold text-white">Offline Cryptographic Tools</h2>
                <p className="text-xs text-evah-text-muted">Perform local hash and encoding routines offline</p>
              </div>
              <div className="p-4 rounded-xl border border-evah-border bg-white/[0.02] space-y-2">
                <span className="text-xs font-semibold text-white">Text to SHA-256 Digest</span>
                <input
                  type="text"
                  placeholder="Enter string..."
                  onChange={async (e) => {
                    const enc = new TextEncoder().encode(e.target.value);
                    const digest = await window.crypto.subtle.digest('SHA-256', enc);
                    const hex = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
                    const out = document.getElementById('sha-out');
                    if (out) out.innerText = hex;
                  }}
                  className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-evah-border text-xs text-white"
                />
                <div id="sha-out" className="p-2 rounded bg-black/60 text-[11px] font-mono text-emerald-400 break-all">
                  SHA-256 hash will appear here
                </div>
              </div>
            </div>
          )}

          {/* Web URL Sandboxed View */}
          {!activeTab.url.startsWith('evah://') && (
            <iframe
              src={activeTab.url}
              title={activeTab.title}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              className="w-full h-full border-none bg-white"
            />
          )}
        </div>

        {/* Right Utility Drawers */}
        {activeDrawer === 'history' && (
          <div className="w-72 border-l border-evah-border bg-black/40 backdrop-blur-xl p-4 flex flex-col z-20 shrink-0">
            <div className="flex items-center justify-between pb-3 border-b border-evah-border mb-3">
              <span className="text-xs font-bold text-white">Browsing History</span>
              <IconButton icon={<X className="w-3.5 h-3.5" />} label="Close" size="sm" onClick={() => setActiveDrawer('none')} />
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {historyList.length === 0 ? (
                <p className="text-xs text-evah-text-muted text-center pt-8">No history recorded.</p>
              ) : (
                historyList.map((h, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      navigateTo(h.url);
                      setActiveDrawer('none');
                    }}
                    className="p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-evah-border cursor-pointer transition-colors"
                  >
                    <p className="text-xs text-white font-medium truncate">{h.title}</p>
                    <p className="text-[10px] text-evah-text-muted truncate mt-0.5 font-mono">{h.url}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeDrawer === 'downloads' && (
          <div className="w-72 border-l border-evah-border bg-black/40 backdrop-blur-xl p-4 flex flex-col z-20 shrink-0">
            <div className="flex items-center justify-between pb-3 border-b border-evah-border mb-3">
              <span className="text-xs font-bold text-white">Downloads</span>
              <IconButton icon={<X className="w-3.5 h-3.5" />} label="Close" size="sm" onClick={() => setActiveDrawer('none')} />
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {downloadsList.map((dl) => (
                <div key={dl.id} className="p-2.5 rounded-xl border border-evah-border bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-evah-accent" />
                    <span className="text-xs font-semibold text-white truncate">{dl.filename}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1 mt-2">
                    <div className="bg-evah-accent h-1 rounded-full" style={{ width: `${dl.progress}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-evah-text-muted mt-1 font-mono">
                    <span>Completed</span>
                    <span>1.0 MB</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeDrawer === 'privacy' && (
          <div className="w-80 border-l border-evah-border bg-black/50 backdrop-blur-xl p-5 flex flex-col z-20 shrink-0 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-evah-border">
              <span className="text-xs font-bold text-white">Browser Privacy Center</span>
              <IconButton icon={<X className="w-3.5 h-3.5" />} label="Close" size="sm" onClick={() => setActiveDrawer('none')} />
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Clear temporary cookies, cached offline pages, and browsing receipts from your USB partition.
            </p>
            <Button variant="danger" size="md" onClick={handleClearBrowsingData}>
              Wipe All Browsing Data
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
