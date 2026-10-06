import fs from 'fs';
import path from 'path';
import os from 'os';
import { DetectedUsb, EvahManifest } from './types';

export class UsbDetector {
  private isWindows = os.platform() === 'win32';

  /**
   * Scans all connected removable drives and mounts for an EVAH USB drive.
   */
  public scanForEvahUsb(): DetectedUsb[] {
    const candidateRoots = this.isWindows ? this.getWindowsDrives() : this.getLinuxMounts();
    const detected: DetectedUsb[] = [];

    for (const root of candidateRoots) {
      try {
        const found = this.inspectDrive(root);
        if (found) {
          detected.push(found);
        }
      } catch {
        // Skip inaccessible drives
      }
    }

    return detected;
  }

  /**
   * Verifies if a previously detected EVAH USB is still physically attached.
   */
  public isStillAttached(usb: DetectedUsb): boolean {
    try {
      if (!fs.existsSync(usb.driveRoot)) return false;
      if (!fs.existsSync(usb.manifestPath)) return false;
      if (!fs.existsSync(usb.backendPath)) return false;
      return true;
    } catch {
      return false;
    }
  }

  private inspectDrive(driveRoot: string): DetectedUsb | null {
    // Check possible manifest locations (root or subfolder)
    const possibleManifests = [
      path.join(driveRoot, 'evah.manifest.json'),
      path.join(driveRoot, 'EVAH_USB', 'evah.manifest.json'),
      path.join(driveRoot, 'EVAH', 'evah.manifest.json'),
    ];

    for (const manifestPath of possibleManifests) {
      if (fs.existsSync(manifestPath)) {
        try {
          const raw = fs.readFileSync(manifestPath, 'utf8');
          const manifest = JSON.parse(raw) as EvahManifest;

          if (manifest.app === 'EVAH' && (manifest.mode === 'host' || manifest.mode === 'dual' || !manifest.mode)) {
            const baseDir = path.dirname(manifestPath);

            // Locate backend
            const entry = manifest.entryPoint || 'backend/index.cjs';
            const backendPath = path.resolve(baseDir, entry);
            if (!fs.existsSync(backendPath)) {
              continue;
            }

            // Locate frontend
            const frontendPath = path.resolve(baseDir, 'frontend');

            // Locate bundled Node runtime if available
            let runtimePath: string | null = null;
            if (this.isWindows) {
              const winNode = path.resolve(baseDir, 'runtime', 'node.exe');
              if (fs.existsSync(winNode)) {
                runtimePath = winNode;
              }
            } else {
              const linuxNode = path.resolve(baseDir, 'runtime', 'node');
              if (fs.existsSync(linuxNode)) {
                runtimePath = linuxNode;
              }
            }

            // Data directory for user files on USB
            const storagePath = path.resolve(baseDir, 'data');
            try {
              if (!fs.existsSync(storagePath)) {
                fs.mkdirSync(storagePath, { recursive: true });
              }
            } catch {
              // Read-only or unprivileged fallback
            }

            return {
              driveRoot,
              manifestPath,
              backendPath,
              runtimePath,
              frontendPath,
              storagePath,
              manifest,
            };
          }
        } catch {
          // Bad JSON or I/O error
        }
      }
    }

    return null;
  }

  private getWindowsDrives(): string[] {
    const drives: string[] = [];
    const letters = 'DEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    for (const letter of letters) {
      const drive = `${letter}:\\`;
      try {
        if (fs.existsSync(drive)) {
          drives.push(drive);
        }
      } catch {
        // Ignored
      }
    }

    return drives;
  }

  private getLinuxMounts(): string[] {
    const mounts: string[] = [];
    const user = process.env.USER || process.env.LOGNAME || '';

    const candidateParents = [
      `/media/${user}`,
      `/run/media/${user}`,
      '/media',
      '/mnt',
    ];

    for (const parent of candidateParents) {
      try {
        if (fs.existsSync(parent)) {
          const entries = fs.readdirSync(parent);
          for (const entry of entries) {
            const fullPath = path.join(parent, entry);
            try {
              const stat = fs.statSync(fullPath);
              if (stat.isDirectory()) {
                mounts.push(fullPath);
              }
            } catch {}
          }
        }
      } catch {}
    }

    return mounts;
  }
}
