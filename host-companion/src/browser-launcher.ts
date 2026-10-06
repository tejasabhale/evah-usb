import { spawn, exec } from 'child_process';
import os from 'os';

export class BrowserLauncher {
  private isWindows = os.platform() === 'win32';

  /**
   * Opens the user's browser in an application-style new window directed to EVAH.
   */
  public async openBrowser(url = 'http://127.0.0.1:3927/'): Promise<number | undefined> {
    if (this.isWindows) {
      return this.launchWindows(url);
    } else {
      return this.launchLinux(url);
    }
  }

  private launchWindows(url: string): Promise<number | undefined> {
    return new Promise((resolve) => {
      // 1. Try Chrome in app/new-window mode
      const chromeCandidates = [
        `${process.env['ProgramFiles']}\\Google\\Chrome\\Application\\chrome.exe`,
        `${process.env['ProgramFiles(x86)']}\\Google\\Chrome\\Application\\chrome.exe`,
        `${process.env['LOCALAPPDATA']}\\Google\\Chrome\\Application\\chrome.exe`,
      ];

      for (const chromePath of chromeCandidates) {
        try {
          const child = spawn(chromePath, [`--app=${url}`, '--new-window'], {
            detached: true,
            stdio: 'ignore',
          });
          child.unref();
          resolve(child.pid);
          return;
        } catch {}
      }

      // 2. Try Microsoft Edge in app/new-window mode
      const edgeCandidates = [
        `${process.env['ProgramFiles(x86)']}\\Microsoft\\Edge\\Application\\msedge.exe`,
        `${process.env['ProgramFiles']}\\Microsoft\\Edge\\Application\\msedge.exe`,
      ];

      for (const edgePath of edgeCandidates) {
        try {
          const child = spawn(edgePath, [`--app=${url}`, '--new-window'], {
            detached: true,
            stdio: 'ignore',
          });
          child.unref();
          resolve(child.pid);
          return;
        } catch {}
      }

      // 3. Fallback to system default browser via explorer.exe
      try {
        const child = spawn('explorer.exe', [url], {
          detached: true,
          stdio: 'ignore',
        });
        child.unref();
        resolve(child.pid);
      } catch {
        // Last resort cmd start
        exec(`start "" "${url}"`);
        resolve(undefined);
      }
    });
  }

  private launchLinux(url: string): Promise<number | undefined> {
    return new Promise((resolve) => {
      const browsers = ['chromium', 'google-chrome', 'brave-browser', 'firefox', 'xdg-open'];

      for (const b of browsers) {
        try {
          const args = b.includes('chrome') || b.includes('chromium') || b.includes('brave')
            ? [`--app=${url}`, '--new-window']
            : [url];

          const child = spawn(b, args, {
            detached: true,
            stdio: 'ignore',
          });
          child.unref();
          resolve(child.pid);
          return;
        } catch {}
      }

      exec(`xdg-open "${url}"`);
      resolve(undefined);
    });
  }

  /**
   * Attempts to gracefully close a spawned browser window on USB removal.
   */
  public closeBrowser(pid?: number): void {
    if (!pid) return;

    try {
      if (this.isWindows) {
        exec(`taskkill /PID ${pid} /T /F`);
      } else {
        process.kill(pid, 'SIGTERM');
      }
    } catch {
      // Ignored
    }
  }
}
