import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Shield, Usb, Cpu } from 'lucide-react';
import { StorageService } from '@/services/storage/StorageService';
import { useSessionStore } from '@/stores/useSessionStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { useVaultStore } from '@/stores/useVaultStore';

interface HistoryItem {
  command: string;
  output: string;
  isError?: boolean;
}

export const TerminalApp: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([
    {
      command: '',
      output: 'EVAH OS Shell v1.0.0 (x86_64-evah-usb)\nType "help" for a list of available commands.\n',
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

  const username = user?.username || 'tejas';

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
          output = `Available EVAH commands:
  help              - Show this manual
  ls [path]         - List files and directories
  cd <path>         - Change current working directory
  pwd               - Print working directory
  cat <file>        - Print file content
  mkdir <dir>       - Create a new directory
  touch <file>      - Create a new empty file
  rm <path>         - Delete file or directory
  usb               - Display EVAH USB device telemetry
  vault             - Check AES-256 vault status
  theme             - Show active theme design tokens
  whoami            - Display active user profile
  date              - Display system clock
  lock              - Lock EVAH session
  panic             - Trigger emergency panic lock
  clear             - Clear terminal screen`;
          break;

        case 'clear':
          setHistory([]);
          return;

        case 'pwd':
          output = currentDir;
          break;

        case 'ls': {
          const target = arg1 ? resolvePath(arg1) : currentDir;
          const items = await storage.listDirectory(target);
          if (items.length === 0) {
            output = '(empty)';
          } else {
            output = items
              .map((i) => `${i.isDirectory ? '[DIR]  ' : '[FILE] '} ${i.name} (${i.sizeBytes} B)`)
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
              output = `cd: no such directory: ${arg1}`;
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
            output = `Created directory: ${resolved}`;
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
            output = `Created file: ${resolved}`;
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
          output = `EVAH USB Device Telemetry:
  Device:       ${device?.name || 'EVAH_PORTABLE_32GB'}
  Status:       ${device?.isConnected ? 'CONNECTED' : 'DISCONNECTED'}
  Marker:       EVAH_DEVICE (Verified)
  Mount Path:   ${device?.mountPath || 'E:\\EVAH'}
  Data Dir:     ${device?.evahDataDir || 'E:\\EVAH\\data'}
  Capacity:     32.0 GB
  Serial:       ${device?.serialNumber || 'EV-8842-SEC-99'}`;
          break;
        }

        case 'vault': {
          output = `EVAH Vault Security Status:
  State:        ${isVaultUnlocked ? 'UNLOCKED (Decrypted in-memory)' : 'LOCKED (AES-256-GCM Encrypted at rest)'}
  Key Source:   Argon2id/PBKDF2 Derived
  Target File:  /EVAH/data/vault/vault.enc
  Auto-Wipe:    Enabled on USB detachment`;
          break;
        }

        case 'theme': {
          output = `Active Theme Preset: ${activePresetId}
CSS Variables Injected: --evah-accent, --evah-bg, --evah-surface, --evah-font-sans`;
          break;
        }

        case 'whoami': {
          output = `${username} (EVAH Master User)`;
          break;
        }

        case 'date': {
          output = new Date().toUTCString();
          break;
        }

        case 'lock': {
          output = 'Locking EVAH environment...';
          setTimeout(() => lock('Locked from CLI'), 400);
          break;
        }

        case 'panic': {
          output = 'CRITICAL: EMERGENCY PANIC LOCK ACTIVATED.';
          setTimeout(() => panicLock(), 400);
          break;
        }

        default:
          output = `evah: command not found: ${cmd}. Type "help" for options.`;
          isError = true;
      }
    } catch (err: any) {
      output = `evah error: ${err.message || 'Execution failed'}`;
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
      className="flex flex-col h-full w-full bg-[#05080f] text-emerald-400 font-mono text-xs p-4 overflow-y-auto select-text cursor-text"
    >
      <div className="flex-1 space-y-2">
        {history.map((item, idx) => (
          <div key={idx} className="space-y-1">
            {item.command && (
              <div className="flex items-center gap-2 text-slate-300">
                <span className="text-teal-400 font-bold">{username}@evah</span>
                <span className="text-slate-500">:</span>
                <span className="text-sky-400">{currentDir}</span>
                <span className="text-teal-400">$</span>
                <span className="text-white">{item.command}</span>
              </div>
            )}
            {item.output && (
              <pre
                className={`whitespace-pre-wrap leading-relaxed ${
                  item.isError ? 'text-rose-400' : 'text-slate-300'
                }`}
              >
                {item.output}
              </pre>
            )}
          </div>
        ))}

        {/* Active Input Line */}
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
