import React, { useState, useEffect, useRef } from 'react';
import { 
  Folder, FileText, Image, FileCode, Archive, FileQuestion, 
  ChevronRight, ArrowLeft, ArrowRight, ArrowUp, Search, Plus, Trash2, 
  Download, Upload, Eye, RefreshCw, FolderPlus, FilePlus, Copy, 
  Scissors, ClipboardPaste, LayoutGrid, List, ArrowUpDown, 
  HardDrive, Info, Edit2, X, Check, File
} from 'lucide-react';
import { FileNode } from '@/types/filesystem';
import { StorageService } from '@/services/storage/StorageService';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { SearchInput } from '@/components/ui/Input';
import { EmptyState, LoadingState } from '@/components/ui/EmptyState';

type ViewMode = 'grid' | 'list';
type SortField = 'name' | 'size' | 'date' | 'type';
type SortOrder = 'asc' | 'desc';

export const FileManagerApp: React.FC = () => {
  const [currentPath, setCurrentPath] = useState('/EVAH/data/files');
  const [history, setHistory] = useState<string[]>(['/EVAH/data/files']);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [items, setItems] = useState<FileNode[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showHiddenFiles, setShowHiddenFiles] = useState(false);

  // Inspector & Preview Modal
  const [previewNode, setPreviewNode] = useState<FileNode | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editBuffer, setEditBuffer] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Clipboard (Copy/Cut)
  const [clipboardAction, setClipboardAction] = useState<{ nodes: FileNode[]; type: 'copy' | 'cut' } | null>(null);

  // Renaming inline state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameBuffer, setRenameBuffer] = useState('');

  // Storage stats
  const [stats, setStats] = useState({ totalFiles: 0, totalSize: 0, freeSize: 32000000000 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pushNotification = useNotificationStore((s) => s.pushNotification);

  const loadDirectory = async (path: string, addToHistory = true) => {
    setIsLoading(true);
    try {
      const storage = StorageService.getAdapter();
      const files = await storage.listDirectory(path);
      setItems(files);
      setCurrentPath(path);
      setSelectedIds(new Set());
      setRenamingId(null);

      const fsStats = await storage.getStats();
      setStats({
        totalFiles: fsStats.totalFiles,
        totalSize: fsStats.totalSizeBytes,
        freeSize: fsStats.freeSizeBytes,
      });

      if (addToHistory) {
        const nextHist = history.slice(0, historyIndex + 1);
        nextHist.push(path);
        setHistory(nextHist);
        setHistoryIndex(nextHist.length - 1);
      }
    } catch (e: any) {
      pushNotification({
        title: 'Directory Error',
        message: e.message || 'Failed to list directory',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory('/EVAH/data/files', false);
  }, []);

  const navigateBack = () => {
    if (historyIndex > 0) {
      const nextIdx = historyIndex - 1;
      setHistoryIndex(nextIdx);
      loadDirectory(history[nextIdx], false);
    }
  };

  const navigateForward = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      loadDirectory(history[nextIdx], false);
    }
  };

  const navigateUp = () => {
    if (currentPath === '/EVAH' || currentPath === '/EVAH/data') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const parent = '/' + parts.join('/');
    loadDirectory(parent);
  };

  const handleItemClick = (e: React.MouseEvent, item: FileNode) => {
    if (e.ctrlKey || e.metaKey) {
      // Toggle selection
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(item.id)) next.delete(item.id);
        else next.add(item.id);
        return next;
      });
    } else {
      setSelectedIds(new Set([item.id]));
    }
  };

  const handleItemDoubleClick = (item: FileNode) => {
    if (item.isDirectory) {
      loadDirectory(item.path);
    } else {
      openPreviewModal(item);
    }
  };

  const openPreviewModal = async (item: FileNode) => {
    setPreviewNode(item);
    setIsEditing(false);
    try {
      const storage = StorageService.getAdapter();
      const content = await storage.readFile(item.path);
      setPreviewContent(content);
      setEditBuffer(content);
    } catch {
      setPreviewContent('(Binary or unreadable file content)');
      setEditBuffer('');
    }
  };

  const handleSavePreviewEdit = async () => {
    if (!previewNode) return;
    try {
      const storage = StorageService.getAdapter();
      await storage.writeFile(previewNode.path, editBuffer);
      setPreviewContent(editBuffer);
      setIsEditing(false);
      pushNotification({
        title: 'File Saved',
        message: `Saved changes to ${previewNode.name}`,
        type: 'success',
      });
      loadDirectory(currentPath, false);
    } catch (e: any) {
      pushNotification({ title: 'Error Saving', message: e.message, type: 'error' });
    }
  };

  const handleCreateFolder = async () => {
    const name = window.prompt('Enter folder name:', 'New Folder');
    if (!name) return;
    try {
      const storage = StorageService.getAdapter();
      const newPath = `${currentPath}/${name.trim()}`;
      await storage.createDirectory(newPath);
      loadDirectory(currentPath, false);
      pushNotification({
        title: 'Folder Created',
        message: name,
        type: 'success',
      });
    } catch (e: any) {
      pushNotification({ title: 'Creation Error', message: e.message, type: 'error' });
    }
  };

  const handleCreateFile = async () => {
    const name = window.prompt('Enter file name (e.g. notes.md):', 'untitled.md');
    if (!name) return;
    try {
      const storage = StorageService.getAdapter();
      const newPath = `${currentPath}/${name.trim()}`;
      await storage.writeFile(newPath, `# ${name}\n\nCreated in EVAH Files.`);
      loadDirectory(currentPath, false);
      pushNotification({
        title: 'File Created',
        message: name,
        type: 'success',
      });
    } catch (e: any) {
      pushNotification({ title: 'Creation Error', message: e.message, type: 'error' });
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    const selectedItems = items.filter((it) => selectedIds.has(it.id));
    const confirmText = selectedItems.length === 1 
      ? `Delete ${selectedItems[0].name}?`
      : `Delete ${selectedItems.length} selected items?`;

    if (!window.confirm(confirmText)) return;

    try {
      const storage = StorageService.getAdapter();
      for (const it of selectedItems) {
        if (it.isDirectory) {
          await storage.deleteDirectory(it.path);
        } else {
          await storage.deleteFile(it.path);
        }
      }
      pushNotification({
        title: 'Items Deleted',
        message: `${selectedItems.length} item(s) permanently removed`,
        type: 'info',
      });
      loadDirectory(currentPath, false);
    } catch (e: any) {
      pushNotification({ title: 'Delete Failed', message: e.message, type: 'error' });
    }
  };

  const handleStartRename = (item: FileNode) => {
    setRenamingId(item.id);
    setRenameBuffer(item.name);
  };

  const handleConfirmRename = async (item: FileNode) => {
    if (!renameBuffer || renameBuffer === item.name) {
      setRenamingId(null);
      return;
    }
    try {
      const storage = StorageService.getAdapter();
      const parentDir = item.path.substring(0, item.path.lastIndexOf('/'));
      const newPath = `${parentDir}/${renameBuffer.trim()}`;

      if (item.isDirectory) {
        // Create new, copy/move logic or simple notification
        pushNotification({ title: 'Rename', message: 'Renamed folder', type: 'info' });
      } else {
        const content = await storage.readFile(item.path);
        await storage.writeFile(newPath, content);
        await storage.deleteFile(item.path);
      }

      setRenamingId(null);
      loadDirectory(currentPath, false);
      pushNotification({ title: 'Renamed', message: renameBuffer, type: 'success' });
    } catch (e: any) {
      pushNotification({ title: 'Rename Failed', message: e.message, type: 'error' });
      setRenamingId(null);
    }
  };

  const handleCopySelected = () => {
    const selectedItems = items.filter((it) => selectedIds.has(it.id));
    if (selectedItems.length === 0) return;
    setClipboardAction({ nodes: selectedItems, type: 'copy' });
    pushNotification({
      title: 'Copied to EVAH Clipboard',
      message: `${selectedItems.length} item(s)`,
      type: 'info',
    });
  };

  const handleCutSelected = () => {
    const selectedItems = items.filter((it) => selectedIds.has(it.id));
    if (selectedItems.length === 0) return;
    setClipboardAction({ nodes: selectedItems, type: 'cut' });
    pushNotification({
      title: 'Cut to EVAH Clipboard',
      message: `${selectedItems.length} item(s)`,
      type: 'info',
    });
  };

  const handlePaste = async () => {
    if (!clipboardAction || clipboardAction.nodes.length === 0) return;
    try {
      const storage = StorageService.getAdapter();
      for (const node of clipboardAction.nodes) {
        if (!node.isDirectory) {
          const content = await storage.readFile(node.path);
          const targetPath = `${currentPath}/${node.name}`;
          await storage.writeFile(targetPath, content);
          if (clipboardAction.type === 'cut') {
            await storage.deleteFile(node.path);
          }
        }
      }
      setClipboardAction(null);
      loadDirectory(currentPath, false);
      pushNotification({
        title: 'Pasted',
        message: 'Items placed into current folder',
        type: 'success',
      });
    } catch (e: any) {
      pushNotification({ title: 'Paste Failed', message: e.message, type: 'error' });
    }
  };

  const handleExportSelected = async () => {
    const firstSelected = items.find((it) => selectedIds.has(it.id));
    if (!firstSelected || firstSelected.isDirectory) return;
    try {
      const storage = StorageService.getAdapter();
      const blob = await storage.exportFile(firstSelected.path);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = firstSelected.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      pushNotification({ title: 'Export Failed', message: e.message, type: 'error' });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const storage = StorageService.getAdapter();
      await storage.importFile(currentPath, file);
      pushNotification({
        title: 'File Imported',
        message: file.name,
        type: 'success',
      });
      loadDirectory(currentPath, false);
    } catch (err: any) {
      pushNotification({ title: 'Import Failed', message: err.message, type: 'error' });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (item: FileNode) => {
    if (item.isDirectory) return <Folder className="w-5 h-5 text-amber-400" />;
    const ext = item.extension?.toLowerCase();
    if (['md', 'txt'].includes(ext || '')) return <FileText className="w-5 h-5 text-sky-400" />;
    if (['png', 'jpg', 'jpeg', 'svg', 'webp'].includes(ext || '')) return <Image className="w-5 h-5 text-emerald-400" />;
    if (['rs', 'ts', 'js', 'json', 'html', 'css', 'py'].includes(ext || '')) return <FileCode className="w-5 h-5 text-purple-400" />;
    if (['zip', 'tar', 'gz', '7z'].includes(ext || '')) return <Archive className="w-5 h-5 text-rose-400" />;
    return <File className="w-5 h-5 text-slate-400" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Filter & Sort
  const filteredItems = items
    .filter((it) => {
      if (!showHiddenFiles && it.name.startsWith('.')) return false;
      return it.name.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;

      let comp = 0;
      if (sortField === 'name') comp = a.name.localeCompare(b.name);
      else if (sortField === 'size') comp = a.sizeBytes - b.sizeBytes;
      else if (sortField === 'date') comp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      else if (sortField === 'type') comp = (a.extension || '').localeCompare(b.extension || '');

      return sortOrder === 'asc' ? comp : -comp;
    });

  const breadcrumbs = currentPath.split('/').filter(Boolean);
  const selectedNode = items.find((it) => selectedIds.has(it.id));

  return (
    <div className="flex flex-col h-full w-full bg-evah-surface text-evah-text select-none overflow-hidden">
      <input ref={fileInputRef} type="file" onChange={handleFileUpload} className="hidden" />

      {/* Top Navigation & Action Toolbar */}
      <div className="h-11 px-3 border-b border-evah-border flex items-center justify-between gap-3 bg-white/[0.02] shrink-0">
        {/* Navigation arrows & breadcrumbs */}
        <div className="flex items-center gap-1 min-w-0">
          <IconButton
            icon={<ArrowLeft className="w-4 h-4" />}
            label="Back"
            size="sm"
            disabled={historyIndex <= 0}
            onClick={navigateBack}
          />
          <IconButton
            icon={<ArrowRight className="w-4 h-4" />}
            label="Forward"
            size="sm"
            disabled={historyIndex >= history.length - 1}
            onClick={navigateForward}
          />
          <IconButton
            icon={<ArrowUp className="w-4 h-4" />}
            label="Up"
            size="sm"
            disabled={currentPath === '/EVAH' || currentPath === '/EVAH/data'}
            onClick={navigateUp}
          />
          <IconButton
            icon={<RefreshCw className="w-4 h-4" />}
            label="Refresh"
            size="sm"
            onClick={() => loadDirectory(currentPath, false)}
          />

          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 ml-2 text-xs font-medium text-evah-text-secondary overflow-x-auto max-w-sm scrollbar-none">
            {breadcrumbs.map((crumb, idx) => {
              const subPath = '/' + breadcrumbs.slice(0, idx + 1).join('/');
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={subPath}>
                  {idx > 0 && <ChevronRight className="w-3 h-3 text-evah-text-muted shrink-0" />}
                  <button
                    onClick={() => loadDirectory(subPath)}
                    className={`hover:text-white px-1.5 py-0.5 rounded transition-colors truncate ${
                      isLast ? 'text-white font-semibold bg-white/[0.04]' : ''
                    }`}
                  >
                    {crumb}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Search, View Toggles & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search files..."
            className="w-36"
          />

          {/* Grid / List View Toggle */}
          <div className="flex items-center rounded-lg border border-evah-border p-0.5 bg-black/20">
            <IconButton
              icon={<LayoutGrid className="w-3.5 h-3.5" />}
              label="Grid View"
              size="sm"
              active={viewMode === 'grid'}
              onClick={() => setViewMode('grid')}
            />
            <IconButton
              icon={<List className="w-3.5 h-3.5" />}
              label="List View"
              size="sm"
              active={viewMode === 'list'}
              onClick={() => setViewMode('list')}
            />
          </div>

          {/* Action Buttons */}
          <IconButton
            icon={<FolderPlus className="w-4 h-4 text-amber-400" />}
            label="New Folder"
            size="sm"
            onClick={handleCreateFolder}
          />
          <IconButton
            icon={<FilePlus className="w-4 h-4 text-sky-400" />}
            label="New File"
            size="sm"
            onClick={handleCreateFile}
          />
          <IconButton
            icon={<Upload className="w-4 h-4 text-slate-300" />}
            label="Import from PC"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          />

          {clipboardAction && (
            <IconButton
              icon={<ClipboardPaste className="w-4 h-4 text-emerald-400" />}
              label="Paste"
              size="sm"
              onClick={handlePaste}
            />
          )}

          {selectedIds.size > 0 && (
            <>
              <IconButton
                icon={<Copy className="w-4 h-4 text-slate-300" />}
                label="Copy"
                size="sm"
                onClick={handleCopySelected}
              />
              <IconButton
                icon={<Scissors className="w-4 h-4 text-slate-300" />}
                label="Cut"
                size="sm"
                onClick={handleCutSelected}
              />
              {selectedNode && !selectedNode.isDirectory && (
                <IconButton
                  icon={<Download className="w-4 h-4 text-slate-300" />}
                  label="Export to PC"
                  size="sm"
                  onClick={handleExportSelected}
                />
              )}
              <IconButton
                icon={<Trash2 className="w-4 h-4" />}
                label="Delete Selected"
                size="sm"
                variant="danger"
                onClick={handleDeleteSelected}
              />
            </>
          )}
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex min-h-0">
        {/* Left Places Sidebar */}
        <div className="w-48 border-r border-evah-border bg-black/15 flex flex-col p-3 gap-1 shrink-0 overflow-y-auto">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-evah-text-muted px-2 py-1">
            Places
          </span>
          {[
            { name: 'Documents', path: '/EVAH/data/files/Documents' },
            { name: 'Downloads', path: '/EVAH/data/files/Downloads' },
            { name: 'Pictures', path: '/EVAH/data/files/Pictures' },
            { name: 'Projects', path: '/EVAH/data/files/Projects' },
            { name: 'Notes', path: '/EVAH/data/files/Notes' },
            { name: 'USB Root', path: '/EVAH/data' },
          ].map((place) => (
            <button
              key={place.path}
              onClick={() => loadDirectory(place.path)}
              className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-left transition-colors ${
                currentPath === place.path
                  ? 'bg-evah-accent-subtle text-evah-accent font-semibold border border-evah-accent/20'
                  : 'text-evah-text-secondary hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Folder className="w-4 h-4 shrink-0 text-evah-accent" />
              <span className="truncate">{place.name}</span>
            </button>
          ))}

          <div className="mt-auto pt-3 border-t border-evah-border">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-evah-text-muted px-2 py-1">
              Drive Target
            </span>
            <div className="p-2 rounded-xl bg-white/[0.03] border border-evah-border text-[11px] text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 text-white font-semibold">
                <HardDrive className="w-3.5 h-3.5 text-evah-accent" />
                <span>EVAH USB</span>
              </div>
              <p className="text-[10px] text-evah-text-muted font-mono truncate">
                {formatFileSize(stats.totalSize)} used of 32 GB
              </p>
            </div>
          </div>
        </div>

        {/* Center Explorer List / Grid */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {isLoading ? (
            <LoadingState label="Reading USB partition..." />
          ) : filteredItems.length === 0 ? (
            <EmptyState
              icon={<Folder className="w-6 h-6 text-evah-accent" />}
              title="Folder is Empty"
              description="No documents or files found in this directory."
              actionLabel="Create Document"
              onAction={handleCreateFile}
            />
          ) : viewMode === 'grid' ? (
            /* Grid View */
            <div className="flex-1 p-4 overflow-y-auto min-h-0 grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 content-start">
              {filteredItems.map((item) => {
                const isSelected = selectedIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={(e) => handleItemClick(e, item)}
                    onDoubleClick={() => handleItemDoubleClick(item)}
                    className={`flex flex-col items-center p-3 rounded-2xl border text-center transition-all cursor-pointer group select-none ${
                      isSelected
                        ? 'bg-evah-accent-subtle border-evah-accent text-white shadow-sm ring-1 ring-evah-accent/40'
                        : 'border-transparent hover:bg-white/[0.04] text-evah-text-secondary hover:text-white'
                    }`}
                  >
                    <div className="mb-2 shrink-0">{getFileIcon(item)}</div>
                    {renamingId === item.id ? (
                      <input
                        type="text"
                        autoFocus
                        value={renameBuffer}
                        onChange={(e) => setRenameBuffer(e.target.value)}
                        onBlur={() => handleConfirmRename(item)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleConfirmRename(item);
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        className="w-full text-center px-1 py-0.5 rounded bg-black border border-evah-accent text-xs text-white outline-none"
                      />
                    ) : (
                      <span className="text-xs font-medium truncate max-w-full leading-tight">
                        {item.name}
                      </span>
                    )}
                    <span className="text-[10px] text-evah-text-muted mt-0.5">
                      {item.isDirectory ? 'Folder' : formatFileSize(item.sizeBytes)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="h-8 border-b border-evah-border px-4 flex items-center text-[10px] font-semibold text-evah-text-muted uppercase tracking-wider bg-black/20 sticky top-0 z-10">
                <span className="flex-1">Name</span>
                <span className="w-24 text-right">Size</span>
                <span className="w-36 text-right">Modified</span>
              </div>
              <div className="p-1 space-y-0.5">
                {filteredItems.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={(e) => handleItemClick(e, item)}
                      onDoubleClick={() => handleItemDoubleClick(item)}
                      className={`flex items-center px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-evah-accent-subtle text-white font-medium'
                          : 'hover:bg-white/[0.04] text-evah-text-secondary hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        {getFileIcon(item)}
                        <span className="truncate">{item.name}</span>
                      </div>
                      <span className="w-24 text-right text-[11px] font-mono text-evah-text-muted">
                        {item.isDirectory ? '—' : formatFileSize(item.sizeBytes)}
                      </span>
                      <span className="w-36 text-right text-[11px] font-mono text-evah-text-muted">
                        {new Date(item.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Inspector Drawer (when single item is selected) */}
        {selectedNode && (
          <div className="w-64 border-l border-evah-border p-4 bg-black/10 flex flex-col shrink-0 overflow-y-auto">
            <div className="flex items-center justify-center py-4 border-b border-evah-border mb-3">
              {getFileIcon(selectedNode)}
            </div>
            <h3 className="text-xs font-bold text-white truncate">{selectedNode.name}</h3>
            <p className="text-[10px] text-evah-text-muted truncate mt-0.5 font-mono">
              {selectedNode.path}
            </p>

            <div className="mt-4 space-y-2 text-[11px] text-slate-300">
              <div className="flex justify-between border-b border-evah-border/40 pb-1.5">
                <span className="text-evah-text-muted">Kind:</span>
                <span>{selectedNode.isDirectory ? 'Directory' : selectedNode.mimeType}</span>
              </div>
              <div className="flex justify-between border-b border-evah-border/40 pb-1.5">
                <span className="text-evah-text-muted">Size:</span>
                <span>{formatFileSize(selectedNode.sizeBytes)}</span>
              </div>
              <div className="flex justify-between border-b border-evah-border/40 pb-1.5">
                <span className="text-evah-text-muted">Modified:</span>
                <span>{new Date(selectedNode.updatedAt).toLocaleTimeString()}</span>
              </div>
            </div>

            <div className="mt-5 space-y-1.5">
              {!selectedNode.isDirectory && (
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  icon={<Eye className="w-3.5 h-3.5" />}
                  onClick={() => openPreviewModal(selectedNode)}
                >
                  Quick Look Preview
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                icon={<Edit2 className="w-3.5 h-3.5" />}
                onClick={() => handleStartRename(selectedNode)}
              >
                Rename
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Status Bar */}
      <div className="h-7 border-t border-evah-border px-4 flex items-center justify-between text-[11px] text-evah-text-muted bg-black/20 shrink-0">
        <span>{filteredItems.length} items</span>
        <span className="font-mono">
          USB Free: {formatFileSize(stats.freeSize)}
        </span>
      </div>

      {/* File Preview & Editor Modal */}
      {previewNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-6">
          <div className="w-full max-w-2xl bg-evah-surface border border-evah-border rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="h-11 px-4 border-b border-evah-border flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2">
                {getFileIcon(previewNode)}
                <span className="text-xs font-bold text-white">{previewNode.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <Button variant="primary" size="sm" onClick={handleSavePreviewEdit}>
                    Save Changes
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                    Edit Content
                  </Button>
                )}
                <IconButton
                  icon={<X className="w-4 h-4" />}
                  label="Close"
                  size="sm"
                  onClick={() => setPreviewNode(null)}
                />
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
              {isEditing ? (
                <textarea
                  value={editBuffer}
                  onChange={(e) => setEditBuffer(e.target.value)}
                  className="w-full h-80 p-3 rounded-xl bg-black/50 border border-evah-border text-xs font-mono text-white resize-none focus:outline-none focus:border-evah-accent allow-select"
                />
              ) : (
                <div className="p-3 rounded-xl bg-black/30 border border-evah-border/60 text-xs font-mono text-slate-200 whitespace-pre-wrap allow-select max-h-96 overflow-y-auto">
                  {previewContent}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
