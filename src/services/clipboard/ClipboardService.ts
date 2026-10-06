export type ClipboardClearCallback = (timeRemainingSeconds: number) => void;

export class ClipboardService {
  private static instance: ClipboardService;
  private lastCopiedSecret: string | null = null;
  private clearTimerId: any = null;
  private countdownIntervalId: any = null;

  private constructor() {}

  public static getInstance(): ClipboardService {
    if (!ClipboardService.instance) {
      ClipboardService.instance = new ClipboardService();
    }
    return ClipboardService.instance;
  }

  /**
   * Copies secret text to clipboard and arms auto-clear countdown timer.
   */
  public async copySensitiveText(
    text: string, 
    timeoutSeconds: number = 15,
    onCountdown?: ClipboardClearCallback,
    onCleared?: () => void
  ): Promise<boolean> {
    try {
      this.cancelPendingClear();
      this.lastCopiedSecret = text;

      // Copy to system clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older environments
        const el = document.createElement('textarea');
        el.value = text;
        el.style.position = 'fixed';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.focus();
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }

      if (timeoutSeconds <= 0) {
        // Never clear
        return true;
      }

      let remaining = timeoutSeconds;
      if (onCountdown) onCountdown(remaining);

      this.countdownIntervalId = setInterval(() => {
        remaining -= 1;
        if (remaining > 0) {
          if (onCountdown) onCountdown(remaining);
        } else {
          clearInterval(this.countdownIntervalId);
          this.countdownIntervalId = null;
        }
      }, 1000);

      this.clearTimerId = setTimeout(async () => {
        await this.clearIfMatches(text);
        if (onCleared) onCleared();
      }, timeoutSeconds * 1000);

      return true;
    } catch (e) {
      console.error('Failed to copy to clipboard', e);
      return false;
    }
  }

  /**
   * Immediately clears clipboard if it matches current secret or forcibly.
   */
  public async clearImmediately(): Promise<void> {
    this.cancelPendingClear();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText('');
      }
    } catch (e) {
      console.warn('Could not wipe clipboard:', e);
    }
    this.lastCopiedSecret = null;
  }

  private async clearIfMatches(expectedSecret: string): Promise<void> {
    this.cancelPendingClear();
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const current = await navigator.clipboard.readText();
        // Only clear if user hasn't copied something else in the meantime
        if (current === expectedSecret) {
          await navigator.clipboard.writeText('');
        }
      } else {
        // Fallback
        await navigator.clipboard.writeText('');
      }
    } catch (e) {
      // If reading clipboard was blocked by browser permissions, safely write empty string anyway
      try {
        await navigator.clipboard.writeText('');
      } catch {}
    }
    this.lastCopiedSecret = null;
  }

  public cancelPendingClear(): void {
    if (this.clearTimerId) {
      clearTimeout(this.clearTimerId);
      this.clearTimerId = null;
    }
    if (this.countdownIntervalId) {
      clearInterval(this.countdownIntervalId);
      this.countdownIntervalId = null;
    }
  }
}
