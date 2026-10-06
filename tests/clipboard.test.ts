import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClipboardService } from '@/services/clipboard/ClipboardService';

describe('ClipboardService & Sensitive Secret Lifecycle', () => {
  let clipboard: ClipboardService;

  beforeEach(() => {
    vi.useRealTimers();
    clipboard = ClipboardService.getInstance();
    clipboard.cancelPendingClear();
  });

  it('copies sensitive text to clipboard', async () => {
    const success = await clipboard.copySensitiveText('top_secret_token_123', 0);
    expect(success).toBe(true);

    const text = await navigator.clipboard.readText();
    expect(text).toBe('top_secret_token_123');
  });

  it('immediately wipes clipboard on clearImmediately()', async () => {
    await clipboard.copySensitiveText('sensitive_password', 0);
    expect(await navigator.clipboard.readText()).toBe('sensitive_password');

    await clipboard.clearImmediately();
    expect(await navigator.clipboard.readText()).toBe('');
  });

  it('auto-clears clipboard when countdown timer expires', async () => {
    vi.useFakeTimers();

    let cleared = false;
    await clipboard.copySensitiveText(
      'time_limited_password',
      2,
      () => {},
      () => {
        cleared = true;
      }
    );

    expect(await navigator.clipboard.readText()).toBe('time_limited_password');

    // Advance timers by 2.5 seconds
    await vi.advanceTimersByTimeAsync(2500);

    expect(cleared).toBe(true);
    expect(await navigator.clipboard.readText()).toBe('');
  });
});
