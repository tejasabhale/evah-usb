export interface VoiceInfo {
  name: string;
  lang: string;
  isDefault: boolean;
  voice: SpeechSynthesisVoice;
}

export class TtsService {
  private static instance: TtsService;
  private voices: SpeechSynthesisVoice[] = [];
  private selectedVoiceName: string | null = null;
  private initialized = false;

  private constructor() {
    this.initVoices();
  }

  public static getInstance(): TtsService {
    if (!TtsService.instance) {
      TtsService.instance = new TtsService();
    }
    return TtsService.instance;
  }

  private initVoices(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const update = () => {
      this.voices = window.speechSynthesis.getVoices();
      this.initialized = true;
    };

    update();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = update;
    }
  }

  public getAvailableVoices(): VoiceInfo[] {
    if (!this.initialized && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices();
    }

    return this.voices.map(v => ({
      name: v.name,
      lang: v.lang,
      isDefault: v.default,
      voice: v,
    }));
  }

  public getPreferredFemaleVoice(): SpeechSynthesisVoice | null {
    const list = this.voices.length > 0 ? this.voices : (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis.getVoices() : []);
    if (list.length === 0) return null;

    if (this.selectedVoiceName) {
      const match = list.find(v => v.name === this.selectedVoiceName);
      if (match) return match;
    }

    // Try finding natural english female voices
    const preferredNames = [
      'Samantha',
      'Victoria',
      'Karen',
      'Google US English',
      'Microsoft Zira',
      'Microsoft Jenny Online (Natural)',
      'Jenny',
      'Fiona',
    ];

    for (const name of preferredNames) {
      const found = list.find(v => v.name.toLowerCase().includes(name.toLowerCase()));
      if (found) return found;
    }

    // Fallback to female-sounding keywords or english
    const enVoice = list.find(v => v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('female')));
    if (enVoice) return enVoice;

    const anyEn = list.find(v => v.lang.startsWith('en'));
    return anyEn || list[0];
  }

  public setVoice(voiceName: string): void {
    this.selectedVoiceName = voiceName;
  }

  public async speak(
    text: string, 
    options: { volume?: number; rate?: number; pitch?: number } = {}
  ): Promise<void> {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    // Cancel any previous utterances
    window.speechSynthesis.cancel();

    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = this.getPreferredFemaleVoice();
      if (voice) {
        utterance.voice = voice;
      }

      utterance.volume = options.volume ?? 0.9;
      utterance.rate = options.rate ?? 1.0;
      utterance.pitch = options.pitch ?? 1.05;

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve(); // Graceful on voice error

      window.speechSynthesis.speak(utterance);
    });
  }

  public async playWelcomeGreeting(volume: number = 0.9): Promise<void> {
    return this.speak('Welcome to EVAH.', { volume, rate: 1.0, pitch: 1.05 });
  }

  public async testVoice(volume: number = 0.9): Promise<void> {
    return this.speak('EVAH speech synthesis initialized successfully.', { volume });
  }
}
