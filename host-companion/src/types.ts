/**
 * EVAH Host Companion — Type Definitions
 */

export interface EvahManifest {
  app: string;
  mode: string;
  version: string;
  name?: string;
  description?: string;
  buildTime?: string;
  entryPoint?: string;
  minNodeVersion?: string;
}

export interface DetectedUsb {
  driveRoot: string;          // e.g. "E:\\" or "/media/user/EVAH"
  manifestPath: string;
  backendPath: string;
  runtimePath: string | null;
  frontendPath: string;
  storagePath: string;
  manifest: EvahManifest;
}

export interface ActiveSession {
  driveRoot: string;
  pid: number;
  port: number;
  startedAt: number;
  browserOpened: boolean;
  browserPid?: number;
}

export interface CompanionConfig {
  port: number;
  healthUrl: string;
  pollIntervalMs: number;
  healthTimeoutMs: number;
  supportedModes: string[];
}
