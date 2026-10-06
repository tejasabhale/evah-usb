#!/usr/bin/env node
/**
 * EVAH OS — USB Package & Host Companion Installer Generator
 * Packages the production EVAH USB structure into dist/EVAH-USB/
 * and generates the Windows Host Companion setup executable.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const USB_DIST = path.join(DIST_DIR, 'EVAH-USB');
const COMPANION_SRC = path.join(PROJECT_ROOT, 'host-companion');
const COMPANION_DIST = path.join(COMPANION_SRC, 'dist');

console.log('\x1b[1;36m======================================================================\x1b[0m');
console.log('\x1b[1;36m       EVAH OS -- USB Host Package & Companion Generator              \x1b[0m');
console.log('\x1b[1;36m======================================================================\x1b[0m');

// 1. Verify and compile host companion
console.log('\n\x1b[1;33m[1/5] Building Host Companion Daemon...\x1b[0m');
if (!fs.existsSync(COMPANION_DIST)) {
  fs.mkdirSync(COMPANION_DIST, { recursive: true });
}

execSync('npx.cmd esbuild host-companion/src/index.ts --platform=node --target=node20 --format=cjs --bundle --outfile=host-companion/dist/companion.cjs', {
  cwd: PROJECT_ROOT,
  stdio: 'inherit',
});

// 2. Prepare USB distribution directories
console.log('\n\x1b[1;33m[2/5] Creating EVAH-USB Directory Layout...\x1b[0m');
const dirs = [
  USB_DIST,
  path.join(USB_DIST, 'backend'),
  path.join(USB_DIST, 'frontend'),
  path.join(USB_DIST, 'runtime'),
  path.join(USB_DIST, 'config'),
  path.join(USB_DIST, 'launcher'),
  path.join(USB_DIST, 'data'),
  path.join(USB_DIST, 'data', 'files'),
  path.join(USB_DIST, 'data', 'vault'),
  path.join(USB_DIST, 'data', 'wallpapers'),
  path.join(USB_DIST, 'data', 'settings'),
  path.join(USB_DIST, 'data', 'sessions'),
];

for (const d of dirs) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
}

// 3. Write USB Manifest & Config
console.log('\n\x1b[1;33m[3/5] Writing evah.manifest.json & config...\x1b[0m');
const manifest = {
  app: 'EVAH',
  mode: 'host',
  version: '1.0.0',
  name: 'EVAH — Your Personal Digital Environment, Everywhere',
  description: 'Portable USB-based desktop operating environment',
  entryPoint: 'backend/index.cjs',
  minNodeVersion: '18.0.0',
  buildTime: new Date().toISOString(),
};

fs.writeFileSync(
  path.join(USB_DIST, 'evah.manifest.json'),
  JSON.stringify(manifest, null, 2),
  'utf8'
);

const evahConfig = {
  version: '1.0.0',
  port: 3927,
  host: '127.0.0.1',
  autostartBrowser: true,
  offlineMode: true,
  sessionTimeoutMinutes: 15,
};

fs.writeFileSync(
  path.join(USB_DIST, 'config', 'evah.json'),
  JSON.stringify(evahConfig, null, 2),
  'utf8'
);

// 4. Copy Application Artifacts
console.log('\n\x1b[1;33m[4/5] Copying Application & Runtime Artifacts...\x1b[0m');

// Copy backend bundle
const serverDist = path.join(PROJECT_ROOT, 'server', 'dist', 'index.cjs');
if (fs.existsSync(serverDist)) {
  fs.copyFileSync(serverDist, path.join(USB_DIST, 'backend', 'index.cjs'));
  console.log('  * Copied backend/index.cjs');
} else {
  console.error('ERROR: Missing server/dist/index.cjs. Run npm run build:server first.');
  process.exit(1);
}

// Copy frontend files (exclude ISO and EVAH-USB folder if in dist)
const copyDirRecursive = (src, dest) => {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.name === 'evah-live-x86_64.iso' || entry.name === 'EVAH-USB') continue;
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
};

copyDirRecursive(DIST_DIR, path.join(USB_DIST, 'frontend'));
console.log('  * Copied frontend assets to EVAH-USB/frontend/');

// Copy portable node.exe
const systemNode = process.execPath;
if (fs.existsSync(systemNode) && systemNode.endsWith('node.exe')) {
  fs.copyFileSync(systemNode, path.join(USB_DIST, 'runtime', 'node.exe'));
  console.log(`  * Bundled portable runtime: ${systemNode} -> runtime/node.exe`);
} else {
  console.warn('  * Warning: node.exe not found for bundling in runtime/');
}

// Write manual launchers
const batLauncher = `@echo off
cd /d "%~dp0..\\"
echo Starting EVAH from USB...
if exist "runtime\\node.exe" (
  start "" "runtime\\node.exe" backend\\index.cjs
) else (
  start "" node backend\\index.cjs
)
timeout /t 2 /nobreak >nul
start http://127.0.0.1:3927/
`;
fs.writeFileSync(path.join(USB_DIST, 'launcher', 'start-evah.bat'), batLauncher, 'utf8');

const shLauncher = `#!/usr/bin/env bash
cd "$(dirname "$0")/.."
echo "Starting EVAH from USB..."
if [ -f "runtime/node" ]; then
  ./runtime/node backend/index.cjs &
else
  node backend/index.cjs &
fi
sleep 2
xdg-open "http://127.0.0.1:3927/" 2>/dev/null || open "http://127.0.0.1:3927/" 2>/dev/null || true
`;
fs.writeFileSync(path.join(USB_DIST, 'launcher', 'start-evah.sh'), shLauncher, 'utf8');
fs.chmodSync(path.join(USB_DIST, 'launcher', 'start-evah.sh'), 0o755);

// 5. Generate Windows Host Companion Setup Package
console.log('\n\x1b[1;33m[5/5] Generating Windows Host Companion Installer...\x1b[0m');
const setupDir = path.join(DIST_DIR, 'installer-staging');
if (!fs.existsSync(setupDir)) fs.mkdirSync(setupDir, { recursive: true });

fs.copyFileSync(path.join(COMPANION_DIST, 'companion.cjs'), path.join(setupDir, 'companion.cjs'));
fs.copyFileSync(path.join(COMPANION_SRC, 'evah-companion.vbs'), path.join(setupDir, 'evah-companion.vbs'));
fs.copyFileSync(path.join(COMPANION_SRC, 'install.bat'), path.join(setupDir, 'install.bat'));
fs.copyFileSync(path.join(COMPANION_SRC, 'uninstall.bat'), path.join(setupDir, 'uninstall.bat'));

// Produce dist/EVAH-Host-Companion-Setup.bat
const setupBatTarget = path.join(DIST_DIR, 'EVAH-Host-Companion-Setup.bat');
fs.copyFileSync(path.join(COMPANION_SRC, 'install.bat'), setupBatTarget);
console.log(`  * Generated: ${setupBatTarget}`);

// Produce dist/EVAH-Host-Companion-Setup.exe
if (process.platform === 'win32') {
  try {
    const { buildInstallerExe } = require('./build_installer_exe.cjs');
    buildInstallerExe();
  } catch (err) {
    console.warn('  * Note: Native installer build warning:', err.message);
  }
}

// Clean up staging
try {
  fs.rmSync(setupDir, { recursive: true, force: true });
} catch {}

console.log('\n\x1b[1;32m======================================================================\x1b[0m');
console.log('\x1b[1;32m       EVAH USB Package & Companion Successfully Created!             \x1b[0m');
console.log('\x1b[1;32m======================================================================\x1b[0m');
console.log(`  * USB Target:     \x1b[1;36m${USB_DIST}\x1b[0m`);
console.log(`  * Windows Setup:  \x1b[1;36m${path.join(DIST_DIR, 'EVAH-Host-Companion-Setup.exe')}\x1b[0m`);
console.log(`  * Setup Batch:    \x1b[1;36m${setupBatTarget}\x1b[0m`);
console.log('\x1b[1;32m======================================================================\x1b[0m');
