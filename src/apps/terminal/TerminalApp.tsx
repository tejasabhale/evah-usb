import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, Copy, Trash2, Shield, Usb, Cpu } from 'lucide-react';
import { StorageService } from '@/services/storage/StorageService';
import { useSessionStore } from '@/stores/useSessionStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { useVaultStore } from '@/stores/useVaultStore';
import { useWindowStore } from '@/stores/useWindowStore';
import { IconButton } from '@/components/ui/IconButton';

interface HistoryItem {
  command: string;
  output: string;
  isError?: boolean;
}

export const TerminalApp: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([
    {
      command: '',
      output: 'EVAH OS Shell v1.0.0 (x86_64-evah-usb)\nType "help" for a list of available system commands.\n',
    },
  ]);
  const [inputVal, setInputVal] = useState('');
  const [currentDir, setCurrentDir] = useState('/EVAH/data/files');
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const user = useSessionStore((s) => s.user);
  const device = useSessionStore((s) => s.device);
  const panicLock = useSessionStore((s) => s.panicLock);
  const lock = useSessionStore((s) => s.lock);
  const activePresetId = useThemeStore((s) => s.activePresetId);
  const isVaultUnlocked = useVaultStore((s) => s.isUnlocked);

  const username = user?.username ? user.username.toLowerCase() : 'tejas';

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const executeCommand = async (rawInput: string) => {
    const trimmed = rawInput.trim();
    if (!trimmed) {
      setHistory((prev) => [...prev, { command: '', output: '' }]);
      return;
    }

    setCmdHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);

    const args = trimmed.split(/\s+/);
    const cmd = args[0].toLowerCase();
    const arg1 = args[1];

    let output = '';
    let isError = false;

    const storage = StorageService.getAdapter();

    try {
      switch (cmd) {
        case 'help':
          output = `EVAH Core Utilities (Controlled Execution Environment):
  help              - Display this command manual
  ls [path]         - List files and directories
  cd <path>         - Change current working directory
  pwd               - Print working directory
  cat <file>        - Display text file contents
  mkdir <dir>       - Create a new directory
  touch <file>      - Create a new empty file
  rm <path>         - Delete a file or directory
  echo <text>       - Print text arguments
  whoami            - Display active authenticated profile
  date              - Display system clock (UTC)
  df                - Display storage partition allocation
  ps                - Display active process & task table
  usb               - Telemetry & presence state of hardware USB
  vault             - Check AES-256-GCM vault security status
  theme             - Show current theme preset & injected variables
  lock              - Lock EVAH session
  panic             - Emergency lockdown: purge active memory keys
  clear             - Clear terminal display buffer`;
          break;

        case 'clear':
          setHistory([]);
          return;

        case 'pwd':
          output = currentDir;
          break;

        case 'echo':
          output = args.slice(1).join(' ');
          break;

        case 'whoami':
          output = `${username} (EVAH Master User, UID: 1000, GID: 1000)`;
          break;

        case 'date':
          output = new Date().toUTCString();
          break;

        case 'df': {
          const stats = await storage.getStats();
          const usedBytes = Math.max(0, stats.totalSizeBytes - stats.freeSizeBytes);
          const usedPct = stats.totalSizeBytes > 0 ? Math.round((usedBytes / stats.totalSizeBytes) * 100) : 0;
          const formatSize = (b: number) => {
            if (b >= 1024 * 1024 * 1024) return `${(b / (1024 * 1024 * 1024)).toFixed(1)}G`;
            if (b >= 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)}M`;
            if (b >= 1024) return `${(b / 1024).toFixed(1)}K`;
            return `${b}B`;
          };

          const mountPath = device?.mountPath || '/EVAH/data';
          output = `Filesystem            Size      Used     Avail    Use%  Mounted on
/dev/evah_usb         ${formatSize(stats.totalSizeBytes).padEnd(9)} ${formatSize(usedBytes).padEnd(8)} ${formatSize(stats.freeSizeBytes).padEnd(8)} ${`${usedPct}%`.padEnd(5)} ${mountPath}
memory_cache          64.0M     2.4M     61.6M    4%    /run/evah/vault
Total Files: ${stats.totalFiles} | Total Directories: ${stats.totalDirectories}`;
          break;
        }

        case 'ps': {
          const windows = useWindowStore.getState().windows;
          const activeId = useWindowStore.getState().activeWindowId;
          const lines = [
            '  PID  NAME                 STATUS       DETAILS',
            '    1  evah_compositor      RUNNING      Core Desktop Shell',
            '    2  usb_agent            RUNNING      Hardware Device Watcher',
            '    3  auth_daemon          RUNNING      AES-256 Vault / Session Guard',
          ];
          windows.forEach((w, index) => {
            const pid = 100 + index + 1;
            const status = w.id === activeId ? 'ACTIVE' : w.isMinimized ? 'MINIMIZED' : 'BACKGROUND';
            lines.push(`  ${String(pid).padEnd(4)} ${(w.appId || 'app').padEnd(20)} ${status.padEnd(12)} ${w.title}`);
          });
          output = lines.join('\n');
          break;
        }

        case 'ls': {
          const target = arg1 ? resolvePath(arg1) : currentDir;
          const items = await storage.listDirectory(target);
          if (items.length === 0) {
            output = '(empty directory)';
          } else {
            output = items
              .map((i) => `${i.isDirectory ? '[DIR] ' : '[FILE]'} ${i.name.padEnd(24)} ${i.sizeBytes} B`)
              .join('\n');
          }
          break;
        }

        case 'cd': {
          if (!arg1 || arg1 === '~') {
            setCurrentDir('/EVAH/data/files');
            output = '/EVAH/data/files';
          } else if (arg1 === '..') {
            const parts = currentDir.split('/').filter(Boolean);
            if (parts.length > 1) parts.pop();
            const parent = '/' + parts.join('/');
            setCurrentDir(parent);
            output = parent;
          } else {
            const resolved = resolvePath(arg1);
            const exists = await storage.exists(resolved);
            if (exists) {
              setCurrentDir(resolved);
              output = resolved;
            } else {
              output = `cd: no such file or directory: ${arg1}`;
              isError = true;
            }
          }
          break;
        }

        case 'cat': {
          if (!arg1) {
            output = 'Usage: cat <filename>';
            isError = true;
          } else {
            const resolved = resolvePath(arg1);
            output = await storage.readFile(resolved);
          }
          break;
        }

        case 'mkdir': {
          if (!arg1) {
            output = 'Usage: mkdir <dirname>';
            isError = true;
          } else {
            const resolved = resolvePath(arg1);
            await storage.createDirectory(resolved);
            output = `Directory created: ${resolved}`;
          }
          break;
        }

        case 'touch': {
          if (!arg1) {
            output = 'Usage: touch <filename>';
            isError = true;
          } else {
            const resolved = resolvePath(arg1);
            await storage.writeFile(resolved, '');
            output = `File created: ${resolved}`;
          }
          break;
        }

        case 'rm': {
          if (!arg1) {
            output = 'Usage: rm <path>';
            isError = true;
          } else {
            const resolved = resolvePath(arg1);
            await storage.deleteFile(resolved);
            output = `Deleted: ${resolved}`;
          }
          break;
        }

        case 'usb': {
          output = `EVAH USB Hardware Interface:
  State:        ${device?.isConnected ? 'CONNECTED' : 'DISCONNECTED'}
  Marker:       EVAH_DEVICE (Verified)
  Device Name:  ${device?.name || 'EVAH_PORTABLE_32GB'}
  Mount Path:   ${device?.mountPath || 'E:\\EVAH'}
  Data Root:    ${device?.evahDataDir || 'E:\\EVAH\\data'}
  Partition:    32.0 GB (FAT32/exFAT)
  Serial:       ${device?.serialNumber || 'EV-8842-SEC-99'}`;
          break;
        }

        case 'vault': {
          output = `EVAH Memory-Guarded Vault:
  Status:       ${isVaultUnlocked ? 'DECRYPTED (In-memory volatile RAM cache)' : 'LOCKED (AES-256-GCM authenticated cipher)'}
  Key Derivation: Argon2id / PBKDF2 (100,000 iterations, SHA-256)
  File Storage: /EVAH/data/vault/vault.enc
  Auto-Lock:    Armed on inactivity & USB detach`;
          break;
        }

        case 'theme': {
          output = `Active Theme Preset: ${activePresetId}
Injected Tokens: --evah-bg, --evah-surface, --evah-accent, --evah-window-radius`;
          break;
        }

        case 'lock': {
          output = 'Locking EVAH environment...';
          setTimeout(() => lock('Locked from Terminal CLI'), 400);
          break;
        }

        case 'panic': {
          output = 'CRITICAL: EMERGENCY PANIC LOCK TRIGGERED. PURGING KEYS.';
          setTimeout(() => panicLock(), 400);
          break;
        }

        default:
          output = `evah: command not found: ${cmd}. Type "help" for a list of commands.`;
          isError = true;
      }
    } catch (err: any) {
      output = `evah: execution error: ${err.message || 'Command failure'}`;
      isError = true;
    }

    setHistory((prev) => [...prev, { command: rawInput, output, isError }]);
  };

  const resolvePath = (path: string): string => {
    if (path.startsWith('/')) return path;
    return `${currentDir.endsWith('/') ? currentDir.slice(0, -1) : currentDir}/${path}`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand(inputVal);
      setInputVal('');
    } else if (e.key === 'ArrowUp') {
      if (cmdHistory.length > 0) {
        const nextIdx = historyIndex === -1 ? cmdHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(nextIdx);
        setInputVal(cmdHistory[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      if (cmdHistory.length > 0 && historyIndex !== -1) {
        const nextIdx = historyIndex + 1;
        if (nextIdx < cmdHistory.length) {
          setHistoryIndex(nextIdx);
          setInputVal(cmdHistory[nextIdx]);
        } else {
          setHistoryIndex(-1);
          setInputVal('');
        }
      }
    }
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="flex flex-col h-full w-full bg-[#05080f] text-slate-100 font-mono text-xs select-text overflow-hidden"
    >
      {/* Top Terminal Info Bar */}
      <div className="h-7 border-b border-white/10 px-3 flex items-center justify-between text-[11px] text-slate-400 bg-black/40 select-none shrink-0">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-3.5 h-3.5 text-teal-400" />
          <span>{username}@evah:{currentDir}</span>
        </div>
        <button
          onClick={() => setHistory([])}
          className="hover:text-white flex items-center gap-1"
          title="Clear screen"
        >
          <Trash2 className="w-3 h-3" />
          <span>Clear</span>
        </button>
      </div>

      {/* Terminal Scrollback Body */}
      <div className="flex-1 p-4 overflow-y-auto space-y-2 cursor-text">
        {history.map((item, idx) => (
          <div key={idx} className="space-y-1">
            {item.command && (
              <div className="flex items-center gap-2 text-slate-300">
                <span className="text-teal-400 font-bold">{username}@evah</span>
                <span className="text-slate-500">:</span>
                <span className="text-sky-400">{currentDir}</span>
                <span className="text-teal-400">$</span>
                <span className="text-white font-medium">{item.command}</span>
              </div>
            )}
            {item.output && (
              <pre
                className={`whitespace-pre-wrap leading-relaxed font-mono ${
                  item.isError ? 'text-rose-400' : 'text-slate-300'
                }`}
              >
                {item.output}
              </pre>
            )}
          </div>
        ))}

        {/* Live Input Prompt */}
        <div className="flex items-center gap-2 text-slate-300 pt-1">
          <span className="text-teal-400 font-bold">{username}@evah</span>
          <span className="text-slate-500">:</span>
          <span className="text-sky-400">{currentDir}</span>
          <span className="text-teal-400">$</span>
          <input
            ref={inputRef}
            type="text"
            autoFocus
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-0 outline-none text-white font-mono text-xs caret-teal-400 p-0 m-0"
          />
        </div>
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
};
