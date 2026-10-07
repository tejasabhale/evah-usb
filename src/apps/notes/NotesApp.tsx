import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Plus, Save, Trash2, Eye, Edit3, Clock, Pin, 
  Star, Search, Tag, Check, Calendar, FileDown 
} from 'lucide-react';
import { StorageService } from '@/services/storage/StorageService';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { SearchInput } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';

interface NoteItem {
  id: string;
  path: string;
  name: string;
  content: string;
  isPinned: boolean;
  isFavorite: boolean;
  tags: string[];
  updatedAt: string;
}

const NOTES_DIR = '/EVAH/data/files/Notes';

export const NotesApp: React.FC = () => {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [contentBuffer, setContentBuffer] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('Saved');

  const autoSaveTimerRef = useRef<any>(null);
  const pushNotification = useNotificationStore((s) => s.pushNotification);

  const loadNotes = async () => {
    try {
      const storage = StorageService.getAdapter();
      const files = await storage.listDirectory(NOTES_DIR);
      const items: NoteItem[] = [];

      for (const f of files) {
        if (!f.isDirectory && f.name.endsWith('.md')) {
          const content = await storage.readFile(f.path);
          items.push({
            id: f.id,
            path: f.path,
            name: f.name.replace('.md', ''),
            content,
            isPinned: false,
            isFavorite: false,
            tags: [],
            updatedAt: f.updatedAt,
          });
        }
      }

      setNotes(items);
      if (items.length > 0 && !activeNoteId) {
        setActiveNoteId(items[0].id);
        setContentBuffer(items[0].content);
      }
    } catch (e) {
      console.warn('Could not load notes directory', e);
    }
  };

  const activeNote = notes.find((n) => n.id === activeNoteId) || null;
  const contentBufferRef = useRef(contentBuffer);
  const activeNoteRef = useRef(activeNote);
  contentBufferRef.current = contentBuffer;
  activeNoteRef.current = activeNote;

  useEffect(() => {
    loadNotes();
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      if (activeNoteRef.current && contentBufferRef.current !== activeNoteRef.current.content) {
        StorageService.getAdapter()
          .writeFile(activeNoteRef.current.path, contentBufferRef.current)
          .catch((err) => console.warn('Unmount note save error:', err));
      }
    };
  }, []);

  const handleSelectNote = (note: NoteItem) => {
    setActiveNoteId(note.id);
    setContentBuffer(note.content);
    setAutoSaveStatus('Saved');
  };

  // Debounced Auto-save
  const handleContentChange = (val: string) => {
    setContentBuffer(val);
    setAutoSaveStatus('Unsaved changes...');

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveActiveNote(val, true);
    }, 1500);
  };

  const saveActiveNote = async (contentToSave = contentBuffer, isAuto = false) => {
    if (!activeNote) return;
    setIsSaving(true);
    try {
      const storage = StorageService.getAdapter();
      await storage.writeFile(activeNote.path, contentToSave);

      const now = new Date().toISOString();
      setNotes((prev) =>
        prev.map((n) => (n.id === activeNote.id ? { ...n, content: contentToSave, updatedAt: now } : n))
      );

      setAutoSaveStatus('Saved');
      if (!isAuto) {
        pushNotification({
          title: 'Note Saved',
          message: activeNote.name,
          type: 'success',
        });
      }
    } catch (e: any) {
      setAutoSaveStatus('Error saving');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNote = async () => {
    const title = window.prompt('Note title:', 'New Note');
    if (!title) return;
    const cleanTitle = title.trim();
    const newPath = `${NOTES_DIR}/${cleanTitle}.md`;

    try {
      const storage = StorageService.getAdapter();
      const initialContent = `# ${cleanTitle}\n\nStart typing your note in Markdown...`;
      await storage.writeFile(newPath, initialContent);

      const newNote: NoteItem = {
        id: `note_${Date.now()}`,
        path: newPath,
        name: cleanTitle,
        content: initialContent,
        isPinned: false,
        isFavorite: false,
        tags: [],
        updatedAt: new Date().toISOString(),
      };

      setNotes((prev) => [newNote, ...prev]);
      setActiveNoteId(newNote.id);
      setContentBuffer(initialContent);

      pushNotification({
        title: 'Note Created',
        message: cleanTitle,
        type: 'success',
      });
    } catch (e: any) {
      pushNotification({ title: 'Creation Error', message: e.message, type: 'error' });
    }
  };

  const handleDeleteNote = async () => {
    if (!activeNote) return;
    if (!window.confirm(`Delete note "${activeNote.name}"?`)) return;

    try {
      const storage = StorageService.getAdapter();
      await storage.deleteFile(activeNote.path);

      const remaining = notes.filter((n) => n.id !== activeNote.id);
      setNotes(remaining);
      const nextActive = remaining.length > 0 ? remaining[0] : null;
      setActiveNoteId(nextActive ? nextActive.id : null);
      setContentBuffer(nextActive ? nextActive.content : '');

      pushNotification({
        title: 'Note Deleted',
        message: activeNote.name,
        type: 'info',
      });
    } catch (e: any) {
      pushNotification({ title: 'Delete Failed', message: e.message, type: 'error' });
    }
  };

  const handleTogglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n))
    );
  };

  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isFavorite: !n.isFavorite } : n))
    );
  };

  const filteredNotes = notes
    .filter((n) =>
      n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const wordCount = contentBuffer.trim() ? contentBuffer.trim().split(/\s+/).length : 0;
  const charCount = contentBuffer.length;

  return (
    <div className="flex h-full w-full bg-evah-surface text-evah-text select-none overflow-hidden">
      {/* Sidebar: Notes Navigation & Search */}
      <div className="w-64 border-r border-evah-border bg-black/15 flex flex-col p-3 gap-2 shrink-0">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-evah-text-muted">
            EVAH Notes
          </span>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={handleCreateNote}
          >
            New Note
          </Button>
        </div>

        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search notes..."
        />

        <div className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-0">
          {filteredNotes.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-5 h-5 text-evah-accent" />}
              title="No Notes"
              description="Create a note to start organizing your thoughts."
            />
          ) : (
            filteredNotes.map((note) => {
              const isSelected = note.id === activeNoteId;
              return (
                <div
                  key={note.id}
                  onClick={() => handleSelectNote(note)}
                  className={`w-full p-2.5 rounded-xl text-left border transition-all cursor-pointer group ${
                    isSelected
                      ? 'bg-evah-accent-subtle border-evah-accent text-white shadow-sm font-medium'
                      : 'border-transparent hover:bg-white/[0.03] text-evah-text-secondary'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold truncate text-white">
                      {note.name}
                    </span>
                    <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100">
                      <button
                        onClick={(e) => handleTogglePin(note.id, e)}
                        className={`p-0.5 rounded hover:text-white ${note.isPinned ? 'text-amber-400' : 'text-slate-500'}`}
                        title="Pin Note"
                      >
                        <Pin className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => handleToggleFavorite(note.id, e)}
                        className={`p-0.5 rounded hover:text-white ${note.isFavorite ? 'text-rose-400 fill-rose-400' : 'text-slate-500'}`}
                        title="Favorite"
                      >
                        <Star className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-evah-text-muted truncate mt-0.5 leading-snug">
                    {note.content.replace(/^#+\s*/, '').slice(0, 45) || 'Empty note'}
                  </p>
                  <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-mono mt-1">
                    <Clock className="w-2.5 h-2.5" />
                    <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Editor & Preview Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeNote ? (
          <>
            {/* Top Toolbar */}
            <div className="h-11 border-b border-evah-border px-4 flex items-center justify-between bg-white/[0.01] shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-evah-accent shrink-0" />
                <h3 className="text-xs font-bold text-white truncate max-w-sm">
                  {activeNote.name}
                </h3>
                <span className="text-[10px] font-mono text-evah-text-muted px-2 py-0.5 rounded bg-white/[0.04]">
                  {autoSaveStatus}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <IconButton
                  icon={<Eye className="w-4 h-4" />}
                  label={previewMode ? 'Edit Mode' : 'Markdown Preview'}
                  size="sm"
                  active={previewMode}
                  onClick={() => setPreviewMode(!previewMode)}
                />
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Save className="w-3.5 h-3.5" />}
                  onClick={() => saveActiveNote()}
                >
                  Save
                </Button>
                <IconButton
                  icon={<Trash2 className="w-4 h-4" />}
                  label="Delete Note"
                  size="sm"
                  variant="danger"
                  onClick={handleDeleteNote}
                />
              </div>
            </div>

            {/* Editor Body */}
            <div className="flex-1 p-6 overflow-y-auto">
              {previewMode ? (
                <div className="prose prose-invert max-w-none text-xs leading-relaxed space-y-3 font-sans allow-select">
                  <div className="whitespace-pre-wrap">{contentBuffer}</div>
                </div>
              ) : (
                <textarea
                  value={contentBuffer}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="Type your notes here in Markdown..."
                  className="w-full h-full bg-transparent resize-none border-0 text-xs font-mono text-white leading-relaxed focus:outline-none allow-select"
                />
              )}
            </div>

            {/* Bottom Status Bar */}
            <div className="h-7 border-t border-evah-border px-4 flex items-center justify-between text-[10px] font-mono text-evah-text-muted bg-black/20 shrink-0">
              <div className="flex items-center gap-3">
                <span>{wordCount} words</span>
                <span>{charCount} characters</span>
              </div>
              <span>Storage: /EVAH/data/files/Notes</span>
            </div>
          </>
        ) : (
          <EmptyState
            icon={<FileText className="w-8 h-8 text-evah-accent opacity-30" />}
            title="No Note Selected"
            description="Select a note from the left or create a new document."
            actionLabel="Create Note"
            onAction={handleCreateNote}
          />
        )}
      </div>
    </div>
  );
};
