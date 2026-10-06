import { describe, it, expect, beforeEach } from 'vitest';
import { BrowserStorageAdapter } from '@/services/storage/BrowserStorageAdapter';

describe('BrowserStorageAdapter & File System Operations', () => {
  let adapter: BrowserStorageAdapter;

  beforeEach(async () => {
    localStorage.clear();
    adapter = new BrowserStorageAdapter();
    await adapter.initialize();
  });

  it('seeds default EVAH directory hierarchy on initialization', async () => {
    const rootNodes = await adapter.listDirectory('/EVAH');
    expect(rootNodes.length).toBeGreaterThan(0);

    const hasData = await adapter.exists('/EVAH/data');
    const hasFiles = await adapter.exists('/EVAH/data/files');
    const hasVault = await adapter.exists('/EVAH/data/vault');

    expect(hasData).toBe(true);
    expect(hasFiles).toBe(true);
    expect(hasVault).toBe(true);
  });

  it('writes, reads, and verifies text files', async () => {
    const testPath = '/EVAH/data/files/Documents/test-doc.txt';
    const content = 'EVAH Portable Desktop Environment Test Content';

    await adapter.writeFile(testPath, content);
    expect(await adapter.exists(testPath)).toBe(true);

    const readBack = await adapter.readFile(testPath);
    expect(readBack).toBe(content);
  });

  it('deletes existing files', async () => {
    const path = '/EVAH/data/files/Documents/to-delete.txt';
    await adapter.writeFile(path, 'temp content');
    expect(await adapter.exists(path)).toBe(true);

    await adapter.deleteFile(path);
    expect(await adapter.exists(path)).toBe(false);
  });

  it('creates and lists subdirectories', async () => {
    const newDir = '/EVAH/data/files/Projects/EvahApp';
    await adapter.createDirectory(newDir);
    expect(await adapter.exists(newDir)).toBe(true);

    await adapter.writeFile(`${newDir}/manifest.json`, '{"version": "1.0.0"}');

    const contents = await adapter.listDirectory(newDir);
    expect(contents.length).toBe(1);
    expect(contents[0].name).toBe('manifest.json');
    expect(contents[0].isDirectory).toBe(false);
  });

  it('calculates filesystem statistics accurately', async () => {
    const stats = await adapter.getStats();
    expect(stats.totalFiles).toBeGreaterThan(0);
    expect(stats.totalDirectories).toBeGreaterThan(0);
    expect(stats.freeSizeBytes).toBeGreaterThan(0);
  });
});
