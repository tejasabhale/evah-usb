# EVAH Local-First MVC Service

This directory contains the production-grade **Local-First Node.js Service Layer** for EVAH OS.

## Architectural Responsibilities

The service layer cleanly separates UI rendering from local persistent business logic:

```text
React Desktop UI
       ↓ (HTTP / Local IPC)
Controllers (Req/Res parsing & validation)
       ↓
Services (Business logic & hardware presence rules)
       ↓
Repositories (Safe filesystem I/O on USB root)
       ↓
USB Storage Mount (/EVAH/data/...)
```

## Directory Structure

- `src/config/`: Configuration parameters (localhost binding, ports, USB paths).
- `src/controllers/`: HTTP controller handlers for auth, file, vault, and system endpoints.
- `src/services/`: Core logic for USB presence verification, PBKDF2 authentication, and AES-256-GCM vault management.
- `src/repositories/`: Path traversal-safe filesystem operations for the `/EVAH/` directory hierarchy.
- `src/security/`: Cryptographic operations (PBKDF2-HMAC-SHA256, AES-256-GCM authenticated cipher, memory zeroing).
- `src/middleware/`: Bearer token authentication, error formatting, request logging, payload validation.
- `src/models/`: TypeScript data models.
- `src/events/`: Internal event bus for decoupled reaction to hardware events (USB disconnect, panic lock).

## Security & Local-First Principles

1. **Strict Localhost Binding**: The service strictly binds to `127.0.0.1` and never opens listening sockets to external network interfaces.
2. **Path Traversal Protection**: All filesystem operations are resolved relative to the designated USB mount root. Any attempt to escape via `..` or null bytes throws an immediate `BadRequestError`.
3. **RAM Key Purging**: In-memory decryption keys and cache are immediately zeroed using `Buffer.fill(0)` when a lock, panic, or USB disconnect event fires.
