# Contributing to EVAH OS

Thank you for your interest in contributing to EVAH!

## Development Guidelines

1. **Local-First & Offline Principle**:
   - Features must work reliably without an internet connection.
   - Never introduce telemetry, cloud tracking, or mandatory remote dependencies.

2. **Security & Zero Plaintext**:
   - Never print sensitive credentials or decryption keys to console or logs.
   - All state must handle immediate revocation when the USB device is disconnected.

3. **Code Style**:
   - Strict TypeScript everywhere.
   - Use centralized design tokens in `ThemeTokens.ts` rather than hardcoding colors or typography directly into component templates.

## Submitting Pull Requests

1. Fork the repository and create your branch from `main`.
2. Ensure `npm run build` passes with zero type errors.
3. Test both Browser Simulation mode and Tauri Native mode.
4. Open a pull request describing your improvements!
