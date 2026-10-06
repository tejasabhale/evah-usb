import fs from 'fs';
import path from 'path';
import os from 'os';
import { UsbDetector } from './detector';
import { ProcessManager } from './process-manager';
import { DetectedUsb } from './types';

class HostCompanionDaemon {
  private detector = new UsbDetector();
  private processManager = new ProcessManager();
  private currentAttachedUsb: DetectedUsb | null = null;
  private isScanning = false;
  private scanTimer: NodeJS.Timeout | null = null;
  private lockFilePath: string;

  constructor() {
    const appData = process.env.LOCALAPPDATA || path.join(os.homedir(), '.config');
    const lockDir = path.join(appData, 'EVAH', 'HostCompanion');
    try {
      fs.mkdirSync(lockDir, { recursive: true });
    } catch {}
    this.lockFilePath = path.join(lockDir, 'companion.lock');
  }

  public async start(): Promise<void> {
    this.acquireSingleInstanceLock();

    console.log('======================================================================');
    console.log('  EVAH Host Companion — Background USB Presence Daemon');
    console.log(`  OS: ${os.type()} ${os.arch()} | PID: ${process.pid}`);
    console.log('======================================================================');
    console.log('[EVAH:Companion] Monitoring for EVAH USB drive insertion...');

    this.scanLoop();
    this.scanTimer = setInterval(() => this.scanLoop(), 1500);

    const shutdown = async () => {
      console.log('\n[EVAH:Companion] Shutting down host companion...');
      if (this.scanTimer) clearInterval(this.scanTimer);
      await this.processManager.stopSession();
      this.releaseLock();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }

  private async scanLoop(): Promise<void> {
    if (this.isScanning) return;
    this.isScanning = true;

    try {
      // 1. If we currently have an attached USB, check if it was removed
      if (this.currentAttachedUsb) {
        const stillThere = this.detector.isStillAttached(this.currentAttachedUsb);
        if (!stillThere) {
          console.log(`[EVAH:Companion] USB drive ${this.currentAttachedUsb.driveRoot} REMOVAL DETECTED!`);
          this.currentAttachedUsb = null;
          await this.processManager.stopSession();
          console.log('[EVAH:Companion] Resuming scan for EVAH USB insertion...');
          this.isScanning = false;
          return;
        }
      }

      // 2. Scan for connected EVAH USBs
      const detected = this.detector.scanForEvahUsb();

      if (detected.length > 0) {
        const primaryUsb = detected[0];

        // If newly inserted or re-inserted
        if (!this.currentAttachedUsb || this.currentAttachedUsb.driveRoot !== primaryUsb.driveRoot) {
          console.log(`[EVAH:Companion] EVAH USB INSERTION DETECTED on drive ${primaryUsb.driveRoot}!`);
          console.log(`  * Manifest: ${primaryUsb.manifest.name || primaryUsb.manifest.app} v${primaryUsb.manifest.version}`);

          this.currentAttachedUsb = primaryUsb;

          try {
            await this.processManager.startSession(primaryUsb);
          } catch (err) {
            console.error('[EVAH:Companion] Failed to launch EVAH session from USB:', err);
            this.currentAttachedUsb = null;
          }
        }
      }
    } catch (e) {
      console.error('[EVAH:Companion] Unexpected error during scan loop:', e);
    } finally {
      this.isScanning = false;
    }
  }

  private acquireSingleInstanceLock(): void {
    try {
      if (fs.existsSync(this.lockFilePath)) {
        const oldPid = parseInt(fs.readFileSync(this.lockFilePath, 'utf8'), 10);
        if (oldPid && !isNaN(oldPid)) {
          // Check if process is still running
          try {
            process.kill(oldPid, 0);
            console.log(`[EVAH:Companion] Another companion instance is already running (PID: ${oldPid}). Exiting.`);
            process.exit(0);
          } catch {
            // Stale lock file, safe to overwrite
          }
        }
      }
      fs.writeFileSync(this.lockFilePath, process.pid.toString(), 'utf8');
    } catch {
      // Ignored
    }
  }

  private releaseLock(): void {
    try {
      if (fs.existsSync(this.lockFilePath)) {
        fs.unlinkSync(this.lockFilePath);
      }
    } catch {}
  }
}

if (process.env.NODE_ENV !== 'test') {
  const daemon = new HostCompanionDaemon();
  daemon.start().catch((err) => {
    console.error('[EVAH:Companion:FATAL]', err);
    process.exit(1);
  });
}
