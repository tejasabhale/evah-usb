import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import { StorageRepository } from '../src/repositories/storage.repository';
import { BadRequestError } from '../src/errors/app-error';

const TEST_DIR = path.resolve(__dirname, '../../.test_evah_storage');

describe('Server StorageRepository & Filesystem Boundary', () => {
  let repo: StorageRepository;

  beforeAll(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
    repo = new StorageRepository(TEST_DIR);
    await repo.initializeEvahStructure();
  });

  afterAll(async () => {
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('initializes standard EVAH directories and device marker', async () => {
    expect(await repo.exists('EVAH')).toBe(true);
    expect(await repo.exists('EVAH/data/files')).toBe(true);
    expect(await repo.exists('EVAH/data/vault')).toBe(true);
    expect(await repo.exists('EVAH/EVAH_DEVICE.json')).toBe(true);

    const markerRaw = await repo.readFile('EVAH/EVAH_DEVICE.json');
    const marker = JSON.parse(markerRaw);
    expect(marker.deviceId).toContain('EVAH-');
  });

  it('blocks path traversal attacks attempting to escape storage root', () => {
    expect(() => {
      repo.safeResolve('../../windows/system32/cmd.exe');
    }).toThrow(BadRequestError);

    expect(() => {
      repo.safeResolve('/../../etc/shadow');
    }).toThrow(BadRequestError);
  });

  it('writes, reads, and deletes files safely', async () => {
    const filePath = 'EVAH/data/files/server-test.txt';
    const testData = 'EVAH local server integration file test.';

    await repo.writeFile(filePath, testData);
    expect(await repo.exists(filePath)).toBe(true);

    const content = await repo.readFile(filePath);
    expect(content).toBe(testData);

    await repo.deleteFile(filePath);
    expect(await repo.exists(filePath)).toBe(false);
  });

  it('lists directory entries with metadata', async () => {
    await repo.writeFile('EVAH/data/files/doc1.txt', 'test');
    await repo.writeFile('EVAH/data/files/doc2.txt', 'test2');

    const list = await repo.listDirectory('EVAH/data/files');
    expect(list.length).toBeGreaterThanOrEqual(2);

    const doc1 = list.find((f) => f.name === 'doc1.txt');
    expect(doc1).toBeDefined();
    expect(doc1?.type).toBe('file');
  });

  it('calculates disk telemetry capacity stats', async () => {
    const telemetry = await repo.getTelemetry();
    expect(telemetry.totalCapacityBytes).toBeGreaterThan(0);
    expect(telemetry.usedCapacityBytes).toBeGreaterThan(0);
    expect(telemetry.fileCount).toBeGreaterThan(0);
  });
});
