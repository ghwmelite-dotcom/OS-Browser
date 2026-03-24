/**
 * TextToSpeechService
 * Wraps the Web Speech API SpeechSynthesis for sentence-by-sentence reading
 * with highlighting callbacks, language support, and rate control.
 */

interface SupportedLanguage {
  code: string;
  name: string;
  flag: string;
}

const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en-GB', name: 'English', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: 'en-US', name: 'English (US)', flag: '\u{1F1FA}\u{1F1F8}' },
  { code: 'fr-FR', name: 'French', flag: '\u{1F1EB}\u{1F1F7}' },
  { code: 'es-ES', name: 'Spanish', flag: '\u{1F1EA}\u{1F1F8}' },
  { code: 'de-DE', name: 'German', flag: '\u{1F1E9}\u{1F1EA}' },
  { code: 'pt-BR', name: 'Portuguese', flag: '\u{1F1E7}\u{1F1F7}' },
  { code: 'sw', name: 'Swahili', flag: '\u{1F1F0}\u{1F1EA}' },
  { code: 'ha', name: 'Hausa', flag: '\u{1F1F3}\u{1F1EC}' },
  { code: 'yo', name: 'Yoruba', flag: '\u{1F1F3}\u{1F1EC}' },
];

class TextToSpeechService {
  private utterance: SpeechSynthesisUtterance | null = null;
  private sentences: string[] = [];
  private _currentIndex: number = 0;
  private _isPlaying: boolean = false;
  private _isPaused: boolean = false;
  private _rate: number = 1;
  private _lang: string = 'en-GB';
  private onSentenceChange: ((index: number) => void) | null = null;

  /** Split text into sentences on .!? followed by whitespace or end-of-string */
  private splitSentences(text: string): string[] {
    const raw = text.match(/[^.!?]*[.!?]+[\s]?|[^.!?]+$/g);
    if (!raw) return [text];
    return raw.map((s) => s.trim()).filter(Boolean);
  }

  /** Speak the sentence at the given index, chaining to the next on end */
  private speakSentence(index: number): void {
    if (index >= this.sentences.length) {
      this._isPlaying = false;
      this._isPaused = false;
      this._currentIndex = 0;
      this.onSentenceChange?.(0);
      return;
    }

    this._currentIndex = index;
    this.onSentenceChange?.(index);

    const utt = new SpeechSynthesisUtterance(this.sentences[index]);
    utt.rate = this._rate;
    utt.lang = this._lang;

    // Try to pick a voice matching the language
    const voices = speechSynthesis.getVoices();
    const match = voices.find((v) => v.lang.startsWith(this._lang));
    if (match) utt.voice = match;

    utt.onend = () => {
      if (this._isPlaying && !this._isPaused) {
        this.speakSentence(index + 1);
      }
    };

    utt.onerror = () => {
      this._isPlaying = false;
      this._isPaused = false;
    };

    this.utterance = utt;
    speechSynthesis.speak(utt);
  }

  /** Begin speaking the full text, sentence by sentence */
  speak(
    text: string,
    lang?: string,
    rate?: number,
    onSentenceChange?: (i: number) => void,
  ): void {
    this.stop();
    if (lang) this._lang = lang;
    if (rate) this._rate = rate;
    this.onSentenceChange = onSentenceChange ?? null;
    this.sentences = this.splitSentences(text);
    this._currentIndex = 0;
    this._isPlaying = true;
    this._isPaused = false;
    this.speakSentence(0);
  }

  pause(): void {
    if (this._isPlaying && !this._isPaused) {
      speechSynthesis.pause();
      this._isPaused = true;
    }
  }

  resume(): void {
    if (this._isPaused) {
      speechSynthesis.resume();
      this._isPaused = false;
    }
  }

  stop(): void {
    speechSynthesis.cancel();
    this._isPlaying = false;
    this._isPaused = false;
    this._currentIndex = 0;
    this.utterance = null;
  }

  setRate(rate: number): void {
    this._rate = rate;
    // If currently speaking, restart current sentence with new rate
    if (this._isPlaying && !this._isPaused) {
      speechSynthesis.cancel();
      this.speakSentence(this._currentIndex);
    }
  }

  setLang(lang: string): void {
    this._lang = lang;
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return speechSynthesis.getVoices();
  }

  getSupportedLanguages(): SupportedLanguage[] {
    return SUPPORTED_LANGUAGES;
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  get isPaused(): boolean {
    return this._isPaused;
  }

  get currentSentenceIndex(): number {
    return this._currentIndex;
  }

  get totalSentences(): number {
    return this.sentences.length;
  }
}

export const ttsService = new TextToSpeechService();
export type { SupportedLanguage };
export default TextToSpeechService;
