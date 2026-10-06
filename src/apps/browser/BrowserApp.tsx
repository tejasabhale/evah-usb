import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, ArrowRight, RotateCw, Home, Plus, X, Globe, 
  ShieldCheck, Bookmark, History, Trash2, Search, ExternalLink, Lock 
} from 'lucide-react';
import { StorageService } from '@/services/storage/StorageService';
import { useNotificationStore } from '@/stores/useNotificationStore';

interface BrowserTab {
  id: string;
  title: string;
  url: string;
  history: string[];
  historyIndex: number;
  isLoading: boolean;
}

const DEFAULT_BOOKMARKS = [
  { title: 'EVAH OS Docs', url: 'evah://docs' },
  { title: 'Rust Lang', url: 'https://www.rust-lang.org' },
  { title: 'MDN Web Docs', url: 'https://developer.mozilla.org' },
  { title: 'DuckDuckGo', url: 'https://duckduckgo.com' },
  { title: 'Tailwind CSS', url: 'https://tailwindcss.com' },
];

export const BrowserApp: React.FC = () => {
  const [tabs, setTabs] = useState<BrowserTab[]>([
    {
      id: 'tab_1',
      title: 'EVAH Portal',
      url: 'evah://welcome',
      history: ['evah://welcome'],
      historyIndex: 0,
      isLoading: false,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState('tab_1');
  const [urlInput, setUrlInput] = useState('evah://welcome');
  const [historyList, setHistoryList] = useState<{ url: string; time: string }[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const pushNotification = useNotificationStore((s) => s.pushNotification);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  useEffect(() => {
    if (activeTab) {
      setUrlInput(activeTab.url);
    }
  }, [activeTab?.id]);

  const navigateTo = (url: string) => {
    let target = url.trim();
    if (!target.startsWith('http://') && !target.startsWith('https://') && !target.startsWith('evah://')) {
      if (target.includes('.') && !target.includes(' ')) {
        target = `https://${target}`;
      } else {
        target = `https://duckduckgo.com/?q=${encodeURIComponent(target)}`;
      }
    }

    setUrlInput(target);
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== activeTabId) return t;
        const newHistory = t.history.slice(0, t.historyIndex + 1);
        newHistory.push(target);
        return {
          ...t,
          url: target,
          title: formatTabTitle(target),
          history: newHistory,
          historyIndex: newHistory.length - 1,
        };
      })
    );

    setHistoryList((prev) => [
      { url: target, time: new Date().toLocaleTimeString() },
      ...prev.slice(0, 49),
    ]);
  };

  const formatTabTitle = (url: string) => {
    if (url.startsWith('evah://')) return url.replace('evah://', 'EVAH: ').toUpperCase();
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  const handleNewTab = () => {
    const id = 'tab_' + Date.now();
    const newTab: BrowserTab = {
      id,
      title: 'New Tab',
      url: 'evah://newtab',
      history: ['evah://newtab'],
      historyIndex: 0,
      isLoading: false,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(id);
  };

  const handleCloseTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (tabs.length === 1) {
      handleNewTab();
    }
    setTabs((prev) => prev.filter((t) => t.id !== id));
    if (activeTabId === id) {
      const remaining = tabs.filter((t) => t.id !== id);
      if (remaining.length > 0) setActiveTabId(remaining[remaining.length - 1].id);
    }
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
    pushNotification({
      title: 'Browsing Data Cleared',
      message: 'Browser cache, cookies, and local session traces wiped.',
      type: 'security',
    });
  };

  return (
    <div className="flex flex-col h-full w-full bg-evah-surface text-evah-text select-none">
      {/* Top Tab Bar */}
      <div className="h-9 bg-black/30 border-b border-evah-border flex items-center px-2 gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            className={`group flex items-center gap-2 h-7 px-3 rounded-t-lg text-xs font-medium cursor-pointer transition-all max-w-[180px] border-t border-l border-r ${
              tab.id === activeTabId
                ? 'bg-evah-surface border-evah-border text-white'
                : 'border-transparent text-evah-text-muted hover:bg-white/[0.04]'
            }`}
          >
            <Globe className="w-3.5 h-3.5 shrink-0 text-evah-accent" />
            <span className="truncate flex-1 text-[11px]">{tab.title}</span>
            <button
              onClick={(e) => handleCloseTab(e, tab.id)}
              className="p-0.5 rounded hover:bg-white/10 text-evah-text-muted hover:text-white"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        ))}

        <button
          onClick={handleNewTab}
          className="p-1 rounded-md text-evah-text-muted hover:text-white hover:bg-white/10 ml-1"
          title="New Tab"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Navigation / URL Bar */}
      <div className="h-11 px-3 border-b border-evah-border flex items-center gap-2 bg-white/[0.01]">
        <div className="flex items-center gap-1 text-evah-text-muted">
          <button
            onClick={handleGoBack}
            disabled={activeTab.historyIndex <= 0}
            className="p-1 rounded hover:bg-white/10 hover:text-white disabled:opacity-30"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleGoForward}
            disabled={activeTab.historyIndex >= activeTab.history.length - 1}
            className="p-1 rounded hover:bg-white/10 hover:text-white disabled:opacity-30"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigateTo(activeTab.url)}
            className="p-1 rounded hover:bg-white/10 hover:text-white"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => navigateTo('evah://welcome')}
            className="p-1 rounded hover:bg-white/10 hover:text-white"
          >
            <Home className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Address Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            navigateTo(urlInput);
          }}
          className="flex-1 flex items-center relative"
        >
          <div className="absolute left-2.5 flex items-center gap-1 pointer-events-none">
            <Lock className="w-3 h-3 text-emerald-400" />
          </div>
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="w-full pl-7 pr-4 py-1.5 rounded-xl bg-black/40 border border-evah-border text-xs text-white placeholder-evah-text-muted focus:outline-none focus:border-evah-accent font-mono"
            placeholder="Search with DuckDuckGo or enter web URL..."
          />
        </form>

        <div className="flex items-center gap-1 text-evah-text-muted">
          <button
            onClick={() => setShowHistoryModal(!showHistoryModal)}
            className="p-1.5 rounded hover:bg-white/10 hover:text-white"
            title="History"
          >
            <History className="w-4 h-4" />
          </button>
          <button
            onClick={handleClearBrowsingData}
            className="p-1.5 rounded hover:bg-rose-950/40 text-rose-400"
            title="Wipe Private Browsing Data"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bookmarks Bar */}
      <div className="h-7 border-b border-evah-border/60 px-3 flex items-center gap-3 text-[11px] text-evah-text-secondary bg-black/10 overflow-x-auto">
        <Bookmark className="w-3 h-3 text-evah-accent shrink-0" />
        {DEFAULT_BOOKMARKS.map((bm) => (
          <button
            key={bm.url}
            onClick={() => navigateTo(bm.url)}
            className="hover:text-white truncate flex items-center gap-1"
          >
            <span>{bm.title}</span>
          </button>
        ))}
      </div>

      {/* Browser Viewport Area */}
      <div className="flex-1 min-h-0 relative bg-black/20">
        {activeTab.url.startsWith('evah://') ? (
          <div className="h-full overflow-y-auto p-8 flex flex-col items-center justify-center max-w-xl mx-auto text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-evah-accent-subtle border border-evah-accent/30 flex items-center justify-center text-evah-accent mx-auto">
              <Globe className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white">
              EVAH Offline-First Secure Browser
            </h2>
            <p className="text-xs text-evah-text-secondary leading-relaxed">
              Equipped with isolated browsing profiles, local privacy data wiping, and zero telemetry tracking. 
              All session caches are stored exclusively on your USB partition.
            </p>

            <div className="grid grid-cols-2 gap-3 w-full pt-4 text-left">
              <div 
                onClick={() => navigateTo('https://duckduckgo.com')}
                className="p-3 rounded-xl border border-evah-border bg-white/[0.02] hover:bg-white/[0.05] cursor-pointer"
              >
                <Search className="w-4 h-4 text-evah-accent mb-1" />
                <h4 className="text-xs font-semibold text-white">DuckDuckGo Search</h4>
                <p className="text-[10px] text-evah-text-muted mt-0.5">Privacy search engine</p>
              </div>
              <div 
                onClick={() => navigateTo('https://developer.mozilla.org')}
                className="p-3 rounded-xl border border-evah-border bg-white/[0.02] hover:bg-white/[0.05] cursor-pointer"
              >
                <Globe className="w-4 h-4 text-sky-400 mb-1" />
                <h4 className="text-xs font-semibold text-white">MDN Documentation</h4>
                <p className="text-[10px] text-evah-text-muted mt-0.5">Offline reference</p>
              </div>
            </div>
          </div>
        ) : (
          <iframe
            src={activeTab.url}
            title={activeTab.title}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            className="w-full h-full border-none bg-white"
          />
        )}

        {/* History Drawer */}
        {showHistoryModal && (
          <div className="absolute top-0 right-0 w-72 h-full bg-evah-surface border-l border-evah-border shadow-2xl p-4 flex flex-col z-20">
            <div className="flex items-center justify-between pb-3 border-b border-evah-border mb-3">
              <span className="text-xs font-bold text-white">Session History</span>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
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
                      setShowHistoryModal(false);
                    }}
                    className="p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-evah-border cursor-pointer"
                  >
                    <p className="text-xs text-white truncate">{h.url}</p>
                    <p className="text-[10px] text-evah-text-muted mt-0.5">{h.time}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
