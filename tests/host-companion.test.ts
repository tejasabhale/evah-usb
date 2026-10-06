import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { UsbDetector } from '../host-companion/src/detector';
import { ProcessManager } from '../host-companion/src/process-manager';
import { DetectedUsb } from '../host-companion/src/types';

describe('EVAH Host Companion — Detector & Process Manager', () => {
  const testTmpDir = path.join(os.tmpdir(), 'evah-test-usb-' + Date.now());

  beforeEach(() => {
    fs.mkdirSync(testTmpDir, { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(testTmpDir, { recursive: true, force: true });
    } catch {}
  });

  it('validates a proper EVAH USB drive with evah.manifest.json', () => {
    // Setup simulated USB layout
    const manifest = {
      app: 'EVAH',
      mode: 'host',
      version: '1.0.0',
      entryPoint: 'backend/index.cjs',
    };
    fs.writeFileSync(path.join(testTmpDir, 'evah.manifest.json'), JSON.stringify(manifest), 'utf8');

    fs.mkdirSync(path.join(testTmpDir, 'backend'), { recursive: true });
    fs.writeFileSync(path.join(testTmpDir, 'backend', 'index.cjs'), '// dummy backend', 'utf8');

    fs.mkdirSync(path.join(testTmpDir, 'frontend'), { recursive: true });
    fs.writeFileSync(path.join(testTmpDir, 'frontend', 'index.html'), '<html></html>', 'utf8');

    const detector = new UsbDetector();
    // Use inspectDrive through scan on this test dir
    const inspected = (detector as any).inspectDrive(testTmpDir);

    expect(inspected).not.toBeNull();
    expect(inspected.driveRoot).toBe(testTmpDir);
    expect(inspected.manifest.app).toBe('EVAH');
    expect(inspected.manifest.version).toBe('1.0.0');
    expect(inspected.backendPath).toBe(path.resolve(testTmpDir, 'backend', 'index.cjs'));
    expect(inspected.frontendPath).toBe(path.resolve(testTmpDir, 'frontend'));
  });

  it('rejects drives with non-EVAH manifests or missing backend', () => {
    const detector = new UsbDetector();

    // 1. Missing manifest
    expect((detector as any).inspectDrive(testTmpDir)).toBeNull();

    // 2. Wrong app name
    fs.writeFileSync(
      path.join(testTmpDir, 'evah.manifest.json'),
      JSON.stringify({ app: 'NotEvah', version: '1.0.0' }),
      'utf8'
    );
    expect((detector as any).inspectDrive(testTmpDir)).toBeNull();

    // 3. Right app name but backend entry point is missing
    fs.writeFileSync(
      path.join(testTmpDir, 'evah.manifest.json'),
      JSON.stringify({ app: 'EVAH', version: '1.0.0', entryPoint: 'backend/missing.cjs' }),
      'utf8'
    );
    expect((detector as any).inspectDrive(testTmpDir)).toBeNull();
  });

  it('detects USB presence and detects removal when manifest disappears', () => {
    const manifest = {
      app: 'EVAH',
      mode: 'host',
      version: '1.0.0',
    };
    const manifestPath = path.join(testTmpDir, 'evah.manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest), 'utf8');

    fs.mkdirSync(path.join(testTmpDir, 'backend'), { recursive: true });
    const backendPath = path.join(testTmpDir, 'backend', 'index.cjs');
    fs.writeFileSync(backendPath, '// backend', 'utf8');

    const detector = new UsbDetector();
    const usb: DetectedUsb = {
      driveRoot: testTmpDir,
      manifestPath,
      backendPath,
      runtimePath: null,
      frontendPath: path.join(testTmpDir, 'frontend'),
      storagePath: path.join(testTmpDir, 'data'),
      manifest,
    };

    expect(detector.isStillAttached(usb)).toBe(true);

    // Simulate USB removal by deleting manifest
    fs.unlinkSync(manifestPath);
    expect(detector.isStillAttached(usb)).toBe(false);
  });

  it('prevents duplicate sessions for the same drive', async () => {
    const processManager = new ProcessManager();
    expect(processManager.isRunning()).toBe(false);

    // Mock an active session
    (processManager as any).activeSession = {
      driveRoot: testTmpDir,
      pid: 99999,
      port: 3927,
      startedAt: Date.now(),
      browserOpened: true,
    };

    expect(processManager.isRunning()).toBe(true);

    // Mock checkHealth to return true
    (processManager as any).checkHealth = async () => true;

    const usb: DetectedUsb = {
      driveRoot: testTmpDir,
      manifestPath: path.join(testTmpDir, 'evah.manifest.json'),
      backendPath: path.join(testTmpDir, 'backend', 'index.cjs'),
      runtimePath: null,
      frontendPath: path.join(testTmpDir, 'frontend'),
      storagePath: path.join(testTmpDir, 'data'),
      manifest: { app: 'EVAH', mode: 'host', version: '1.0.0' },
    };

    // Calling startSession for already active drive should return existing session without spawning new PID
    const session = await processManager.startSession(usb);
    expect(session.pid).toBe(99999);
    expect(session.driveRoot).toBe(testTmpDir);

    // Clean up
    (processManager as any).activeSession = null;
  });

  it('safely stops sessions and cleans up state', async () => {
    const processManager = new ProcessManager();

    // Mock active session
    (processManager as any).activeSession = {
      driveRoot: testTmpDir,
      pid: 12345,
      port: 3927,
      startedAt: Date.now(),
      browserOpened: false,
    };

    expect(processManager.getActiveSession()).not.toBeNull();

    await processManager.stopSession();
    expect(processManager.getActiveSession()).toBeNull();
    expect(processManager.isRunning()).toBe(false);
  });
});
