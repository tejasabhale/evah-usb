import { spawn, exec } from 'child_process';
import path from 'path';
import os from 'os';
import http from 'http';
import { DetectedUsb, ActiveSession } from './types';
import { BrowserLauncher } from './browser-launcher';

export class ProcessManager {
  private activeSession: ActiveSession | null = null;
  private browserLauncher = new BrowserLauncher();
  private isWindows = os.platform() === 'win32';

  public getActiveSession(): ActiveSession | null {
    return this.activeSession;
  }

  public isRunning(): boolean {
    return this.activeSession !== null;
  }

  /**
   * Starts the EVAH Node.js backend from the USB and opens the browser.
   */
  public async startSession(usb: DetectedUsb): Promise<ActiveSession> {
    // 1. Duplicate-instance prevention: If already running from the same drive, re-use
    if (this.activeSession && this.activeSession.driveRoot === usb.driveRoot) {
      console.log(`[EVAH:Companion] Instance already running on drive ${usb.driveRoot}. Checking health...`);
      const healthy = await this.checkHealth();
      if (healthy) {
        if (!this.activeSession.browserOpened) {
          const browserPid = await this.browserLauncher.openBrowser();
          this.activeSession.browserOpened = true;
          this.activeSession.browserPid = browserPid;
        }
        return this.activeSession;
      }
      // If previous process died unexpectedly, clean up
      await this.stopSession();
    }

    // 2. Select Node.js runtime (USB bundled executable preferred, fallback to system)
    const nodeBinary = usb.runtimePath || (this.isWindows ? 'node.exe' : 'node');
    const usbBaseDir = path.dirname(usb.manifestPath);

    console.log(`[EVAH:Companion] Spawning EVAH backend:`);
    console.log(`  * Runtime:  ${nodeBinary}`);
    console.log(`  * Script:   ${usb.backendPath}`);
    console.log(`  * Working:  ${usbBaseDir}`);
    console.log(`  * Frontend: ${usb.frontendPath}`);
    console.log(`  * Storage:  ${usb.storagePath}`);

    // 3. Spawn detached process quietly in the background
    const child = spawn(nodeBinary, [usb.backendPath], {
      cwd: usbBaseDir,
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: '3927',
        HOST: '127.0.0.1',
        EVAH_DIST_PATH: usb.frontendPath,
        EVAH_STORAGE_PATH: usb.storagePath,
      },
    });

    if (!child.pid) {
      throw new Error('Failed to spawn EVAH backend process.');
    }

    child.unref();

    this.activeSession = {
      driveRoot: usb.driveRoot,
      pid: child.pid,
      port: 3927,
      startedAt: Date.now(),
      browserOpened: false,
    };

    console.log(`[EVAH:Companion] Backend launched with PID ${child.pid}. Polling health...`);

    // 4. Poll health endpoint until ready (up to 15 seconds)
    const isReady = await this.waitForHealth(15000, 250);
    if (!isReady) {
      console.error('[EVAH:Companion] ERROR: Backend failed to become healthy within timeout.');
      await this.stopSession();
      throw new Error('EVAH backend failed to start or did not become healthy.');
    }

    console.log('[EVAH:Companion] Backend is healthy! Opening browser window...');

    // 5. Open new application browser window
    const browserPid = await this.browserLauncher.openBrowser('http://127.0.0.1:3927/');
    this.activeSession.browserOpened = true;
    this.activeSession.browserPid = browserPid;

    return this.activeSession;
  }

  /**
   * Safely terminates ONLY the EVAH backend process started by the companion.
   */
  public async stopSession(): Promise<void> {
    if (!this.activeSession) return;

    const { pid, browserPid, driveRoot } = this.activeSession;
    console.log(`[EVAH:Companion] Stopping EVAH session for ${driveRoot} (PID: ${pid})...`);

    // 1. Send clean disconnect signal to server if responsive
    try {
      await this.notifyServerDisconnect();
    } catch {}

    // 2. Terminate the specific backend process tree
    try {
      if (this.isWindows) {
        exec(`taskkill /PID ${pid} /T /F`);
      } else {
        process.kill(pid, 'SIGTERM');
      }
    } catch (e) {
      console.warn(`[EVAH:Companion] Note on killing PID ${pid}:`, e);
    }

    // 3. Attempt to close associated browser window
    if (browserPid) {
      this.browserLauncher.closeBrowser(browserPid);
    }

    this.activeSession = null;
    console.log('[EVAH:Companion] EVAH session successfully terminated and cleaned up.');
  }

  private checkHealth(): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get('http://127.0.0.1:3927/health', { timeout: 1000 }, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  private async waitForHealth(timeoutMs: number, intervalMs: number): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await this.checkHealth()) {
        return true;
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    return false;
  }

  private notifyServerDisconnect(): Promise<void> {
    return new Promise((resolve) => {
      const req = http.request(
        'http://127.0.0.1:3927/api/system/usb/disconnect',
        { method: 'POST', timeout: 500 },
        () => resolve()
      );
      req.on('error', () => resolve());
      req.on('timeout', () => {
        req.destroy();
        resolve();
      });
      req.end();
    });
  }
}
