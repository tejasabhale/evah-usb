# Security Policy — EVAH OS

## 🔒 Security Principles

EVAH is designed around zero-trust host execution and portable hardware-bound data security.

### 1. In-Memory Key Isolation
- Master encryption keys derived via PBKDF2 (SHA-256 with 100,000 iterations) or Argon2id.
- Decrypted secrets reside exclusively in active volatile process memory.
- Under no circumstance are plaintext credentials serialized to `localStorage` or written unencrypted to disk.

### 2. Physical USB Disconnect Lockdown
- When the storage monitor detects volume disconnection or missing marker `EVAH_DEVICE`:
  1. Active cryptographic sessions are revoked.
  2. In-memory master keys are zeroed/dropped.
  3. Sensitive clipboard contents matching EVAH entries are wiped.
  4. Active applications transition into the `SESSION_INVALIDATED` state.

### 3. Clipboard Hygiene
- Copied secrets are armed with an auto-clear timer (default 15 seconds).
- The clipboard monitor checks whether the current clipboard contents still match the copied secret before wiping to avoid overwriting unrelated user operations.

### 4. Offline First & Zero Telemetry
- No tracking pixels, analytics, remote pings, or cloud database dependencies.
- Local voice synthesis and offline WebCrypto routines ensure complete autonomy from external network services.

---

## Reporting Vulnerabilities

To report a vulnerability or cryptographic defect, please open a private security advisory on GitHub or contact the maintainers with a reproducible test case.
