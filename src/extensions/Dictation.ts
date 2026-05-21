/**
 * Dictation
 * Inline speech-to-text that inserts directly at the cursor position.
 * No dialog — just toggle on/off from the toolbar button.
 */

import type { HTMLEditor } from '../core/HTMLEditor';

// Web Speech API type declarations
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  readonly [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

// Map editor locale codes to BCP-47 speech codes
const LOCALE_TO_BCP47: Record<string, string> = {
  'ar': 'ar-SA',
  'ca': 'ca-ES',
  'cs': 'cs-CZ',
  'da': 'da-DK',
  'de': 'de-DE',
  'el': 'el-GR',
  'en': 'en-US',
  'en-gb': 'en-GB',
  'es': 'es-ES',
  'fi': 'fi-FI',
  'fr': 'fr-FR',
  'fr-ca': 'fr-CA',
  'hu': 'hu-HU',
  'id': 'id-ID',
  'it': 'it-IT',
  'ja': 'ja-JP',
  'ko': 'ko-KR',
  'nb': 'nb-NO',
  'nl': 'nl-NL',
  'pl': 'pl-PL',
  'pt': 'pt-BR',
  'ro': 'ro-RO',
  'ru': 'ru-RU',
  'sl': 'sl-SI',
  'sr': 'sr-RS',
  'sv': 'sv-SE',
  'th': 'th-TH',
  'tr': 'tr-TR',
  'vi': 'vi-VN',
  'zh': 'zh-CN',
  'zh-tw': 'zh-TW',
};

function getSpeechRecognitionConstructor(): (new () => SpeechRecognitionInstance) | null {
  return (
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition ||
    null
  );
}

export interface DictationOptions {
  editor: HTMLEditor;
  trans: (key: string) => string;
  /** Called when dictation starts or stops so the toolbar can update the button state */
  onStateChange?: (isActive: boolean) => void;
}

export class Dictation {
  private options: DictationOptions;
  private recognition: SpeechRecognitionInstance | null = null;
  private _isActive = false;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  // Tracks the start position of current interim text so we can replace it
  private interimStart: number | null = null;
  private interimLength = 0;

  constructor(options: DictationOptions) {
    this.options = options;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  toggle(): void {
    if (this._isActive) {
      this.stop();
    } else {
      this.start();
    }
  }

  start(): void {
    const Ctor = getSpeechRecognitionConstructor();
    if (!Ctor) return;

    this.recognition = new Ctor();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
    this.recognition.lang = this.getSpeechLang();
    this.recognition.onresult = this.handleResult.bind(this);
    this.recognition.onerror = this.handleError.bind(this);
    this.recognition.onend = this.handleEnd.bind(this);

    try {
      this.recognition.start();
      this._isActive = true;
      this.interimStart = null;
      this.interimLength = 0;
      this.options.onStateChange?.(true);
    } catch {
      // Already started or error
    }
  }

  stop(): void {
    this._isActive = false;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    // Remove any uncommitted interim text
    this.clearInterim();
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore
      }
      this.recognition = null;
    }
    this.options.onStateChange?.(false);
  }

  destroy(): void {
    this.stop();
  }

  private getSpeechLang(): string {
    const locale = this.options.editor.getConfig().language ?? 'en';
    return LOCALE_TO_BCP47[locale] ?? 'en-US';
  }

  private handleResult(event: SpeechRecognitionEvent): void {
    const tiptap = this.options.editor.getTipTap();
    if (!tiptap) return;

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript;

      if (result.isFinal) {
        // Remove interim text first, then insert final
        this.clearInterim();

        let text = transcript;
        if (this.needsLeadingSpace(text)) {
          text = ' ' + text;
        }

        tiptap.chain().focus().insertContent(text).run();
      } else {
        // Interim: replace previous interim text with updated version
        let text = transcript;
        if (this.interimStart === null && this.needsLeadingSpace(text)) {
          text = ' ' + text;
        }

        this.replaceInterim(text);
      }
    }
  }

  /** Replace the current interim text in the editor with new interim text */
  private replaceInterim(text: string): void {
    const tiptap = this.options.editor.getTipTap();
    if (!tiptap) return;

    // Delete previous interim text
    if (this.interimStart !== null && this.interimLength > 0) {
      tiptap.chain()
        .focus()
        .command(({ tr }) => {
          tr.delete(this.interimStart!, this.interimStart! + this.interimLength);
          return true;
        })
        .run();
    }

    // Record where we're inserting
    if (this.interimStart === null) {
      this.interimStart = tiptap.state.selection.from;
    }

    // Insert new interim text
    tiptap.chain().focus().insertContent(text).run();
    this.interimLength = text.length;
  }

  /** Remove interim text without inserting anything */
  private clearInterim(): void {
    if (this.interimStart !== null && this.interimLength > 0) {
      const tiptap = this.options.editor.getTipTap();
      if (tiptap) {
        tiptap.chain()
          .focus()
          .command(({ tr }) => {
            tr.delete(this.interimStart!, this.interimStart! + this.interimLength);
            return true;
          })
          .run();
      }
    }
    this.interimStart = null;
    this.interimLength = 0;
  }

  private needsLeadingSpace(newText: string): boolean {
    if (newText.startsWith(' ')) return false;

    // Check if there's already text at the cursor that ends with whitespace
    const tiptap = this.options.editor.getTipTap();
    if (!tiptap) return false;

    const { from } = tiptap.state.selection;
    if (from === 0) return false;

    // Get the character just before the cursor
    const textBefore = tiptap.state.doc.textBetween(Math.max(0, from - 1), from, '');
    if (!textBefore) return false;

    // If the char before cursor is whitespace or empty, no space needed
    return textBefore.trim().length > 0;
  }

  private handleError(event: SpeechRecognitionErrorEvent): void {
    if (event.error === 'no-speech') {
      // Normal timeout — let onend handle restart
    } else if (event.error === 'not-allowed' || event.error === 'audio-capture' || event.error === 'network') {
      this.stop();
    }
    // Other errors: let onend restart
  }

  private handleEnd(): void {
    if (this._isActive) {
      this.restartTimer = setTimeout(() => {
        if (!this._isActive) return;
        try {
          this.recognition?.start();
        } catch {
          const Ctor = getSpeechRecognitionConstructor();
          if (!Ctor) return;
          this.recognition = new Ctor();
          this.recognition.continuous = true;
          this.recognition.interimResults = true;
          this.recognition.maxAlternatives = 1;
          this.recognition.lang = this.getSpeechLang();
          this.recognition.onresult = this.handleResult.bind(this);
          this.recognition.onerror = this.handleError.bind(this);
          this.recognition.onend = this.handleEnd.bind(this);
          try {
            this.recognition.start();
          } catch {
            this.stop();
          }
        }
      }, 300);
    }
  }
}
