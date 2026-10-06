import React, { useState, useEffect, useRef } from 'react';
import { 
  Folder, FileText, Image, FileCode, Archive, FileQuestion, 
  ChevronRight, ArrowLeft, Search, Plus, Trash2, Download, Upload, 
  Eye, RefreshCw, FolderPlus, FilePlus, Copy, Scissors, ClipboardPaste 
} from 'lucide-react';
import { FileNode } from '@/types/filesystem';
import { StorageService } from '@/services/storage/StorageService';
import { useNotificationStore } from '@/stores/useNotificationStore';

export const FileManagerApp: React.FC = () => {
  const [currentPath, setCurrentPath] = useState('/EVAH/data/files');
  const [items, setItems] = useState<FileNode[]>([]);
  const [selectedItem, setSelectedItem] = useState<FileNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [isEditingFile, setIsEditingFile] = useState(false);
  const [editBuffer, setEditBuffer] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [clipboardNode, setClipboardNode] = useState<{ node: FileNode; action: 'copy' | 'cut' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pushNotification = useNotificationStore((s) => s.pushNotification);

  const loadDirectory = async (path: string) => {
    setIsLoading(true);
    try {
      const storage = StorageService.getAdapter();
      const files = await storage.listDirectory(path);
      setItems(files);
      setCurrentPath(path);
      setSelectedItem(null);
      setPreviewContent(null);
      setIsEditingFile(false);
    } catch (e: any) {
      pushNotification({
        title: 'Filesystem Error',
        message: e.message || 'Failed to list directory',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory(currentPath);
  }, []);

  const navigateUp = () => {
    if (currentPath === '/EVAH' || currentPath === '/EVAH/data') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const parent = '/' + parts.join('/');
    loadDirectory(parent);
  };

  const handleItemClick = (item: FileNode) => {
    setSelectedItem(item);
    if (!item.isDirectory) {
      loadFilePreview(item);
    }
  };

  const handleItemDoubleClick = (item: FileNode) => {
    if (item.isDirectory) {
      loadDirectory(item.path);
    } else {
      loadFilePreview(item, true);
    }
  };

  const loadloadFilePreview = async (item: FileNode, enterEditMode = false) => {
    try {
      const storage = StorageService.getAdapter();
      const content = await storage.readFile(item.path);
      setPreviewContent(content);
      setEditBuffer(content);
      if (enterEditMode) setIsEditingFile(true);
    } catch (e) {
      setPreviewContent('(Binary or unreadable file content)');
    }
  };
  const loadFilePreview = loadloadFilePreview;

  const handleSaveEdit = async () => {
    if (!selectedItem) return;
    try {
      const storage = StorageService.getAdapter();
      await storage.writeFile(selectedItem.path, editBuffer);
      setPreviewContent(editBuffer);
      setIsEditingFile(false);
      pushNotification({
        title: 'File Saved',
        message: `Saved changes to ${selectedItem.name}`,
        type: 'success',
      });
      loadDirectory(currentPath);
    } catch (e: any) {
      pushNotification({
        title: 'Error Saving File',
        message: e.message,
        type: 'error',
      });
    }
  };

  const handleCreateFolder = async () => {
    const name = window.prompt('Enter folder name:', 'New Folder');
    if (!name) return;
    try {
      const storage = StorageService.getAdapter();
      const newPath = `${currentPath}/${name.trim()}`;
      await storage.createDirectory(newPath);
      loadDirectory(currentPath);
      pushNotification({
        title: 'Folder Created',
        message: name,
        type: 'success',
      });
    } catch (e: any) {
      pushNotification({ title: 'Error', message: e.message, type: 'error' });
    }
  };

  const handleCreateFile = async () => {
    const name = window.prompt('Enter file name (with extension):', 'untitled.md');
    if (!name) return;
    try {
      const storage = StorageService.getAdapter();
      const newPath = `${currentPath}/${name.trim()}`;
      await storage.writeFile(newPath, '# ' + name + '\n\nCreated in EVAH OS.');
      loadDirectory(currentPath);
      pushNotification({
        title: 'File Created',
        message: name,
        type: 'success',
      });
    } catch (e: any) {
      pushNotification({ title: 'Error', message: e.message, type: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    const ok = window.confirm(`Delete ${selectedItem.name}?`);
    if (!ok) return;

    try {
      const storage = StorageService.getAdapter();
      if (selectedItem.isDirectory) {
        await storage.deleteDirectory(selectedItem.path);
      } else {
        await storage.deleteFile(selectedItem.path);
      }
      pushNotification({
        title: 'Deleted',
        message: selectedItem.name,
        type: 'info',
      });
      loadDirectory(currentPath);
    } catch (e: any) {
      pushNotification({ title: 'Delete Error', message: e.message, type: 'error' });
    }
  };

  const handleExport = async () => {
    if (!selectedItem || selectedItem.isDirectory) return;
    try {
      const storage = StorageService.getAdapter();
      const blob = await storage.exportFile(selectedItem.path);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedItem.name;
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
      loadDirectory(currentPath);
    } catch (err: any) {
      pushNotification({ title: 'Import Failed', message: err.message, type: 'error' });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (item: FileNode) => {
    if (item.isDirectory) return <Folder className="w-5 h-5 text-amber-400 fill-amber-400/20" />;
    const ext = item.extension?.toLowerCase();
    if (['md', 'txt'].includes(ext || '')) return <FileText className="w-5 h-5 text-sky-400" />;
    if (['png', 'jpg', 'jpeg', 'svg', 'webp'].includes(ext || '')) return <Image className="w-5 h-5 text-emerald-400" />;
    if (['rs', 'ts', 'js', 'json', 'html', 'css'].includes(ext || '')) return <FileCode className="w-5 h-5 text-purple-400" />;
    if (['zip', 'tar', 'gz'].includes(ext || '')) return <Archive className="w-5 h-5 text-rose-400" />;
    return <FileQuestion className="w-5 h-5 text-slate-400" />;
  };

  const breadcrumbs = currentPath.split('/').filter(Boolean);
  const filteredItems = items.filter((it) =>
    it.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full w-full bg-evah-surface text-evah-text select-none">
      {/* Hidden file uploader input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Left Sidebar */}
      <div className="w-48 border-r border-evah-border bg-black/10 flex flex-col p-3 gap-1 shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-evah-text-muted px-2 py-1">
          Places
        </span>
        {[
          { name: 'Documents', path: '/EVAH/data/files/Documents' },
          { name: 'Downloads', path: '/EVAH/data/files/Downloads' },
          { name: 'Pictures', path: '/EVAH/data/files/Pictures' },
          { name: 'Projects', path: '/EVAH/data/files/Projects' },
          { name: 'Notes', path: '/EVAH/data/files/Notes' },
        ].map((place) => (
          <button
            key={place.path}
            onClick={() => loadDirectory(place.path)}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors ${
              currentPath === place.path
                ? 'bg-evah-accent-subtle text-evah-accent'
                : 'text-evah-text-secondary hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Folder className="w-4 h-4 shrink-0 text-evah-accent" />
            <span className="truncate">{place.name}</span>
          </button>
        ))}

        <div className="mt-4 pt-3 border-t border-evah-border">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-evah-text-muted px-2 py-1">
            Storage Target
          </span>
          <div className="px-2 py-1 text-[11px] text-slate-400 font-mono">
            USB: /EVAH/data
          </div>
        </div>
      </div>

      {/* Main Files Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Navigation Toolbar */}
        <div className="h-11 border-b border-evah-border px-3 flex items-center justify-between gap-3 bg-white/[0.02]">
          <div className="flex items-center gap-1">
            <button
              onClick={navigateUp}
              disabled={currentPath === '/EVAH' || currentPath === '/EVAH/data'}
              className="p-1.5 rounded-lg text-evah-text-secondary hover:text-white hover:bg-white/10 disabled:opacity-30"
              title="Go Up"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => loadDirectory(currentPath)}
              className="p-1.5 rounded-lg text-evah-text-secondary hover:text-white hover:bg-white/10"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Breadcrumb pills */}
            <div className="flex items-center gap-1 ml-2 text-xs font-medium text-evah-text-secondary overflow-x-auto max-w-sm">
              {breadcrumbs.map((crumb, idx) => {
                const subPath = '/' + breadcrumbs.slice(0, idx + 1).join('/');
                return (
                  <React.Fragment key={subPath}>
                    {idx > 0 && <ChevronRight className="w-3 h-3 text-evah-text-muted shrink-0" />}
                    <button
                      onClick={() => loadDirectory(subPath)}
                      className={`hover:text-white px-1 py-0.5 rounded ${
                        idx === breadcrumbs.length - 1 ? 'text-white font-semibold' : ''
                      }`}
                    >
                      {crumb}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Action buttons & search */}
          <div className="flex items-center gap-1.5">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-evah-text-muted" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-2 py-1 rounded-lg bg-white/[0.06] border border-evah-border text-xs text-white placeholder-evah-text-muted focus:outline-none focus:border-evah-accent w-36"
              />
            </div>

            <button
              onClick={handleCreateFolder}
              className="p-1.5 rounded-lg text-evah-text-secondary hover:text-white hover:bg-white/10"
              title="New Folder"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
            <button
              onClick={handleCreateFile}
              className="p-1.5 rounded-lg text-evah-text-secondary hover:text-white hover:bg-white/10"
              title="New File"
            >
              <FilePlus className="w-4 h-4" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-lg text-evah-text-secondary hover:text-white hover:bg-white/10"
              title="Import File from PC"
            >
              <Upload className="w-4 h-4" />
            </button>

            {selectedItem && (
              <>
                {!selectedItem.isDirectory && (
                  <button
                    onClick={handleExport}
                    className="p-1.5 rounded-lg text-evah-text-secondary hover:text-white hover:bg-white/10"
                    title="Export File to PC"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/40"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content Explorer Area */}
        <div className="flex-1 flex min-h-0">
          {/* File Grid/List */}
          <div className="flex-1 p-3 overflow-y-auto min-h-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-xs text-evah-text-muted">
                Loading filesystem...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-xs text-evah-text-muted gap-2">
                <Folder className="w-8 h-8 opacity-30" />
                <span>Empty directory</span>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2.5">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    onDoubleClick={() => handleItemDoubleClick(item)}
                    className={`flex flex-col items-center p-3 rounded-xl border transition-all cursor-pointer text-center ${
                      selectedItem?.id === item.id
                        ? 'bg-evah-accent-subtle border-evah-accent text-white shadow-sm'
                        : 'border-transparent hover:bg-white/[0.04] text-evah-text-secondary hover:text-white'
                    }`}
                  >
                    <div className="mb-2">{getFileIcon(item)}</div>
                    <span className="text-xs font-medium truncate max-w-full leading-tight">
                      {item.name}
                    </span>
                    <span className="text-[10px] text-evah-text-muted mt-1">
                      {item.isDirectory ? 'Directory' : `${Math.max(1, Math.round(item.sizeBytes / 1024))} KB`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Preview / Inspector Pane */}
          {selectedItem && (
            <div className="w-72 border-l border-evah-border p-4 flex flex-col bg-black/10 shrink-0">
              <div className="flex items-center justify-center py-4 border-b border-evah-border mb-3">
                {getFileIcon(selectedItem)}
              </div>
              <h3 className="text-xs font-bold text-white truncate">{selectedItem.name}</h3>
              <p className="text-[11px] text-evah-text-muted mt-0.5 truncate">{selectedItem.path}</p>

              <div className="mt-4 space-y-1.5 text-[11px] text-slate-300">
                <div className="flex justify-between">
                  <span className="text-evah-text-muted">Type:</span>
                  <span>{selectedItem.isDirectory ? 'Directory' : selectedItem.mimeType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-evah-text-muted">Size:</span>
                  <span>{selectedItem.sizeBytes} bytes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-evah-text-muted">Updated:</span>
                  <span>{new Date(selectedItem.updatedAt).toLocaleTimeString()}</span>
                </div>
              </div>

              {!selectedItem.isDirectory && (
                <div className="mt-4 pt-3 border-t border-evah-border flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-semibold text-evah-text-muted">
                      Preview
                    </span>
                    {isEditingFile ? (
                      <button
                        onClick={handleSaveEdit}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-evah-accent text-black"
                      >
                        Save
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsEditingFile(true)}
                        className="text-[10px] text-evah-accent hover:underline"
                      >
                        Edit
                      </button>
                    )}
                  </div>

                  {isEditingFile ? (
                    <textarea
                      value={editBuffer}
                      onChange={(e) => setEditBuffer(e.target.value)}
                      className="flex-1 w-full p-2 rounded-lg bg-black/40 border border-evah-border text-xs font-mono text-white resize-none focus:outline-none focus:border-evah-accent allow-select"
                    />
                  ) : (
                    <div className="flex-1 overflow-y-auto p-2 rounded-lg bg-black/20 border border-evah-border/60 text-xs font-mono text-slate-300 whitespace-pre-wrap allow-select max-h-48">
                      {previewContent || 'Select to preview'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
