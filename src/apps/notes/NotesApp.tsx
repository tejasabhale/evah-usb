import React, { useState, useEffect } from 'react';
import { FileText, Plus, Save, Trash2, Eye, Edit3, Clock } from 'lucide-react';
import { StorageService } from '@/services/storage/StorageService';
import { useNotificationStore } from '@/stores/useNotificationStore';

interface NoteEntry {
  path: string;
  name: string;
  content: string;
  updatedAt: string;
}

const NOTES_DIR = '/EVAH/data/files/Notes';

export const NotesApp: React.FC = () => {
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [activeNote, setActiveNote] = useState<NoteEntry | null>(null);
  const [contentBuffer, setContentBuffer] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const pushNotification = useNotificationStore((s) => s.pushNotification);

  const loadNotes = async () => {
    try {
      const storage = StorageService.getAdapter();
      const files = await storage.listDirectory(NOTES_DIR);
      const noteEntries: NoteEntry[] = [];

      for (const f of files) {
        if (!f.isDirectory && f.name.endsWith('.md')) {
          const content = await storage.readFile(f.path);
          noteEntries.push({
            path: f.path,
            name: f.name.replace('.md', ''),
            content,
            updatedAt: f.updatedAt,
          });
        }
      }

      setNotes(noteEntries);
      if (noteEntries.length > 0 && !activeNote) {
        setActiveNote(noteEntries[0]);
        setContentBuffer(noteEntries[0].content);
      }
    } catch (e) {
      console.error('Failed loading notes', e);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const handleSelectNote = (note: NoteEntry) => {
    setActiveNote(note);
    setContentBuffer(note.content);
  };

  const handleCreateNote = async () => {
    const title = window.prompt('Note title:', 'New Note');
    if (!title) return;
    const cleanTitle = title.trim();
    const newPath = `${NOTES_DIR}/${cleanTitle}.md`;

    try {
      const storage = StorageService.getAdapter();
      const initialContent = `# ${cleanTitle}\n\nStart writing in EVAH Notes...`;
      await storage.writeFile(newPath, initialContent);

      const createdNote: NoteEntry = {
        path: newPath,
        name: cleanTitle,
        content: initialContent,
        updatedAt: new Date().toISOString(),
      };

      setNotes((prev) => [createdNote, ...prev]);
      setActiveNote(createdNote);
      setContentBuffer(initialContent);

      pushNotification({
        title: 'Note Created',
        message: cleanTitle,
        type: 'success',
      });
    } catch (e: any) {
      pushNotification({ title: 'Error', message: e.message, type: 'error' });
    }
  };

  const handleSaveNote = async () => {
    if (!activeNote) return;
    setIsSaving(true);
    try {
      const storage = StorageService.getAdapter();
      await storage.writeFile(activeNote.path, contentBuffer);

      setActiveNote({ ...activeNote, content: contentBuffer });
      setNotes((prev) =>
        prev.map((n) => (n.path === activeNote.path ? { ...n, content: contentBuffer } : n))
      );

      pushNotification({
        title: 'Note Saved',
        message: activeNote.name,
        type: 'success',
      });
    } catch (e: any) {
      pushNotification({ title: 'Save Failed', message: e.message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!activeNote) return;
    if (!window.confirm(`Delete note "${activeNote.name}"?`)) return;

    try {
      const storage = StorageService.getAdapter();
      await storage.deleteFile(activeNote.path);

      const remaining = notes.filter((n) => n.path !== activeNote.path);
      setNotes(remaining);
      setActiveNote(remaining.length > 0 ? remaining[0] : null);
      setContentBuffer(remaining.length > 0 ? remaining[0].content : '');

      pushNotification({
        title: 'Note Deleted',
        message: activeNote.name,
        type: 'info',
      });
    } catch (e: any) {
      pushNotification({ title: 'Delete Failed', message: e.message, type: 'error' });
    }
  };

  return (
    <div className="flex h-full w-full bg-evah-surface text-evah-text select-none">
      {/* Sidebar: Notes List */}
      <div className="w-56 border-r border-evah-border bg-black/10 flex flex-col p-3 gap-1 shrink-0">
        <div className="flex items-center justify-between px-2 py-1 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-evah-text-muted">
            EVAH Notes
          </span>
          <button
            onClick={handleCreateNote}
            className="p-1 rounded text-evah-accent hover:bg-white/10"
            title="Create Note"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1">
          {notes.map((note) => (
            <button
              key={note.path}
              onClick={() => handleSelectNote(note)}
              className={`w-full p-2.5 rounded-xl text-left border transition-all ${
                activeNote?.path === note.path
                  ? 'bg-evah-accent-subtle border-evah-accent text-white'
                  : 'border-transparent hover:bg-white/[0.03] text-evah-text-secondary'
              }`}
            >
              <h4 className="text-xs font-semibold truncate text-white">{note.name}</h4>
              <p className="text-[10px] text-evah-text-muted truncate mt-0.5">
                {note.content.replace(/^#+\s*/, '').slice(0, 45) || 'Empty note'}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Editor & Preview Pane */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeNote ? (
          <>
            {/* Action Bar */}
            <div className="h-11 border-b border-evah-border px-4 flex items-center justify-between bg-white/[0.01]">
              <span className="text-xs font-bold text-white truncate max-w-xs">
                {activeNote.name}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewMode(!previewMode)}
                  className={`p-1.5 rounded-lg text-xs flex items-center gap-1 ${
                    previewMode ? 'bg-evah-accent text-black font-semibold' : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{previewMode ? 'Edit' : 'Preview'}</span>
                </button>
                <button
                  onClick={handleSaveNote}
                  disabled={isSaving}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-evah-accent text-black font-semibold text-xs hover:bg-evah-accent-hover transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
                <button
                  onClick={handleDeleteNote}
                  className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/40"
                  title="Delete Note"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Editor Content Area */}
            <div className="flex-1 p-6 overflow-y-auto">
              {previewMode ? (
                <div className="prose prose-invert max-w-none text-xs leading-relaxed space-y-3 font-sans allow-select">
                  <div className="whitespace-pre-wrap">{contentBuffer}</div>
                </div>
              ) : (
                <textarea
                  value={contentBuffer}
                  onChange={(e) => setContentBuffer(e.target.value)}
                  placeholder="Type your notes here in Markdown..."
                  className="w-full h-full bg-transparent resize-none border-0 text-xs font-mono text-white leading-relaxed focus:outline-none allow-select"
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-xs text-evah-text-muted gap-2">
            <FileText className="w-8 h-8 opacity-20 text-evah-accent" />
            <span>Select or create a note to begin</span>
          </div>
        )}
      </div>
    </div>
  );
};
