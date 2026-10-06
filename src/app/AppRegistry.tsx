import React from 'react';
import { AppId } from '@/types/window';
import { FileManagerApp } from '@/apps/files/FileManagerApp';
import { BrowserApp } from '@/apps/browser/BrowserApp';
import { VaultApp } from '@/apps/vault/VaultApp';
import { SettingsApp } from '@/apps/settings/SettingsApp';
import { ThemeStudioApp } from '@/apps/themes/ThemeStudioApp';
import { TerminalApp } from '@/apps/terminal/TerminalApp';
import { NotesApp } from '@/apps/notes/NotesApp';
import { AboutApp } from '@/apps/about/AboutApp';

export const APP_COMPONENTS: Record<AppId, React.FC<any>> = {
  files: FileManagerApp,
  browser: BrowserApp,
  vault: VaultApp,
  settings: SettingsApp,
  themes: ThemeStudioApp,
  terminal: TerminalApp,
  notes: NotesApp,
  about: AboutApp,
};
