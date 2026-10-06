const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const COMPANION_SRC = path.join(PROJECT_ROOT, 'host-companion');
const COMPANION_DIST = path.join(COMPANION_SRC, 'dist');

function buildInstallerExe() {
  if (process.platform !== 'win32') return;

  const cscPath = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
  if (!fs.existsSync(cscPath)) {
    console.warn('[Installer] csc.exe not found. Skipping EXE build.');
    return;
  }

  const companionCjs = fs.readFileSync(path.join(COMPANION_DIST, 'companion.cjs'), 'base64');
  const vbsScript = fs.readFileSync(path.join(COMPANION_SRC, 'evah-companion.vbs'), 'base64');
  const uninstallBat = fs.readFileSync(path.join(COMPANION_SRC, 'uninstall.bat'), 'base64');
  const installBat = fs.readFileSync(path.join(COMPANION_SRC, 'install.bat'), 'base64');

  const csSource = `
using System;
using System.IO;
using System.Diagnostics;
using System.Windows.Forms;
using Microsoft.Win32;

namespace EvahSetup {
    class Program {
        [STAThread]
        static int Main(string[] args) {
            bool isSilent = false;
            foreach (var arg in args) {
                if (arg.Equals("/S", StringComparison.OrdinalIgnoreCase) || 
                    arg.Equals("/silent", StringComparison.OrdinalIgnoreCase) || 
                    arg.Equals("-s", StringComparison.OrdinalIgnoreCase)) {
                    isSilent = true;
                }
            }

            try {
                string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string installDir = Path.Combine(localAppData, "EVAH", "HostCompanion");

                if (!Directory.Exists(installDir)) {
                    Directory.CreateDirectory(installDir);
                }

                // 1. Write companion files
                WriteBase64(Path.Combine(installDir, "companion.cjs"), "${companionCjs}");
                WriteBase64(Path.Combine(installDir, "evah-companion.vbs"), "${vbsScript}");
                WriteBase64(Path.Combine(installDir, "uninstall.bat"), "${uninstallBat}");
                WriteBase64(Path.Combine(installDir, "install.bat"), "${installBat}");

                // 2. Find and copy node.exe if available
                string targetNode = Path.Combine(installDir, "node.exe");
                if (!File.Exists(targetNode)) {
                    string pathEnv = Environment.GetEnvironmentVariable("PATH") ?? "";
                    string[] paths = pathEnv.Split(';');
                    foreach (string p in paths) {
                        try {
                            string cand = Path.Combine(p.Trim(), "node.exe");
                            if (File.Exists(cand)) {
                                File.Copy(cand, targetNode, true);
                                break;
                            }
                        } catch {}
                    }
                }

                // 3. Register auto-start in HKCU Run
                string vbsPath = Path.Combine(installDir, "evah-companion.vbs");
                using (RegistryKey key = Registry.CurrentUser.OpenSubKey(@"Software\\Microsoft\\Windows\\CurrentVersion\\Run", true)) {
                    if (key != null) {
                        key.SetValue("EVAHHostCompanion", "wscript.exe \\"" + vbsPath + "\\"");
                    }
                }

                // 4. Start companion immediately in background
                ProcessStartInfo psi = new ProcessStartInfo {
                    FileName = "wscript.exe",
                    Arguments = "\\"" + vbsPath + "\\"",
                    WorkingDirectory = installDir,
                    UseShellExecute = true,
                    WindowStyle = ProcessWindowStyle.Hidden
                };
                Process.Start(psi);

                if (!isSilent) {
                    MessageBox.Show(
                        "EVAH Host Companion installed successfully and is now running!\\n\\n" +
                        "Whenever you insert your EVAH USB drive, the desktop will launch automatically.\\n\\n" +
                        "Installed to: " + installDir,
                        "EVAH Host Companion Setup",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Information
                    );
                }

                return 0;
            } catch (Exception ex) {
                if (!isSilent) {
                    MessageBox.Show("Installation error: " + ex.Message, "EVAH Host Companion Setup Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
                return 1;
            }
        }

        static void WriteBase64(string filePath, string b64) {
            byte[] bytes = Convert.FromBase64String(b64);
            File.WriteAllBytes(filePath, bytes);
        }
    }
}
`;

  const csFile = path.join(DIST_DIR, 'Setup.cs');
  const outExe = path.join(DIST_DIR, 'EVAH-Host-Companion-Setup.exe');

  fs.writeFileSync(csFile, csSource, 'utf8');

  try {
    execSync(`"${cscPath}" /target:winexe /out:"${outExe}" /r:System.Windows.Forms.dll /r:System.dll /nologo "${csFile}"`, {
      stdio: 'inherit',
    });
    console.log(`\x1b[1;32m  * Compiled native installer: ${outExe}\x1b[0m`);
  } catch (e) {
    console.warn('[Installer] Failed to compile C# installer:', e.message);
  } finally {
    if (fs.existsSync(csFile)) fs.unlinkSync(csFile);
  }
}

module.exports = { buildInstallerExe };

if (require.main === module) {
  buildInstallerExe();
}
