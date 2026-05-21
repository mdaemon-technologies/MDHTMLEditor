/**
 * SpeechToText
 * Speech-to-text dialog using the Web Speech API
 */

import type { HTMLEditor } from '../core/HTMLEditor';

// Web Speech API type declarations (not available in all TS lib targets)
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

export interface SpeechToTextOptions {
  editor: HTMLEditor;
  trans: (key: string) => string;
}

// BCP-47 language tags for the speech recognition language selector
const SPEECH_LANGUAGES: { code: string; name: string }[] = [
  { code: 'ar-SA', name: 'العربية' },
  { code: 'ca-ES', name: 'Català' },
  { code: 'cs-CZ', name: 'Čeština' },
  { code: 'da-DK', name: 'Dansk' },
  { code: 'de-DE', name: 'Deutsch' },
  { code: 'el-GR', name: 'Ελληνικά' },
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'es-ES', name: 'Español' },
  { code: 'fi-FI', name: 'Suomi' },
  { code: 'fr-FR', name: 'Français' },
  { code: 'fr-CA', name: 'Français (Canada)' },
  { code: 'hu-HU', name: 'Magyar' },
  { code: 'id-ID', name: 'Bahasa Indonesia' },
  { code: 'it-IT', name: 'Italiano' },
  { code: 'ja-JP', name: '日本語' },
  { code: 'ko-KR', name: '한국어' },
  { code: 'nb-NO', name: 'Norsk Bokmål' },
  { code: 'nl-NL', name: 'Nederlands' },
  { code: 'pl-PL', name: 'Polski' },
  { code: 'pt-BR', name: 'Português' },
  { code: 'ro-RO', name: 'Română' },
  { code: 'ru-RU', name: 'Русский' },
  { code: 'sl-SI', name: 'Slovenščina' },
  { code: 'sr-RS', name: 'Српски' },
  { code: 'sv-SE', name: 'Svenska' },
  { code: 'th-TH', name: 'ไทย' },
  { code: 'tr-TR', name: 'Türkçe' },
  { code: 'vi-VN', name: 'Tiếng Việt' },
  { code: 'zh-CN', name: '中文 (简体)' },
  { code: 'zh-TW', name: '中文 (繁體)' },
];

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

/**
 * Check if the Web Speech API is available in the current browser
 */
export function isSpeechRecognitionSupported(): boolean {
  return !!(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );
}

function getSpeechRecognitionConstructor(): (new () => SpeechRecognitionInstance) | null {
  return (
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition ||
    null
  );
}

export class SpeechToText {
  private options: SpeechToTextOptions;
  private overlay: HTMLElement | null = null;
  private dialog: HTMLElement | null = null;
  private recognition: SpeechRecognitionInstance | null = null;
  private isListening = false;
  private finalTranscript = '';
  private interimTranscript = '';
  private lastConfidence = 0;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;

  // DOM references
  private transcriptArea: HTMLElement | null = null;
  private confidenceEl: HTMLElement | null = null;
  private statusEl: HTMLElement | null = null;
  private startStopBtn: HTMLButtonElement | null = null;
  private insertBtn: HTMLButtonElement | null = null;
  private clearBtn: HTMLButtonElement | null = null;
  private languageSelect: HTMLSelectElement | null = null;

  constructor(options: SpeechToTextOptions) {
    this.options = options;
  }

  open(): void {
    if (this.overlay) {
      this.overlay.style.display = 'flex';
      return;
    }
    this.createDialog();
  }

  close(): void {
    if (this.overlay) {
      this.overlay.style.display = 'none';
    }
    this.stopRecognition();
  }

  destroy(): void {
    this.stopRecognition();
    this.overlay?.remove();
    this.overlay = null;
    this.dialog = null;
    this.transcriptArea = null;
    this.confidenceEl = null;
    this.statusEl = null;
    this.startStopBtn = null;
    this.insertBtn = null;
    this.clearBtn = null;
    this.languageSelect = null;
  }

  private get editorLanguage(): string {
    return this.options.editor.getConfig().language ?? 'en';
  }

  private getDefaultSpeechLang(): string {
    return LOCALE_TO_BCP47[this.editorLanguage] ?? 'en-US';
  }

  private createDialog(): void {
    const trans = this.options.trans;

    // Overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'md-dialog-overlay';
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    // Dialog
    this.dialog = document.createElement('div');
    this.dialog.className = 'md-dialog md-speechtotext-dialog';

    // Header
    const header = document.createElement('div');
    header.className = 'md-dialog-header';
    header.innerHTML = `
      <h3>${trans('Speech to Text')}</h3>
      <button type="button" class="md-dialog-close">\u00d7</button>
    `;
    header.querySelector('.md-dialog-close')!.addEventListener('click', () => this.close());

    // Body
    const body = document.createElement('div');
    body.className = 'md-dialog-body md-speechtotext-body';

    // Language selector row
    const langRow = document.createElement('div');
    langRow.className = 'md-speechtotext-lang-row';

    const langLabel = document.createElement('label');
    langLabel.className = 'md-speechtotext-label';
    langLabel.textContent = trans('Language');

    this.languageSelect = document.createElement('select');
    this.languageSelect.className = 'md-speechtotext-language';
    const defaultLang = this.getDefaultSpeechLang();
    for (const lang of SPEECH_LANGUAGES) {
      const opt = document.createElement('option');
      opt.value = lang.code;
      opt.textContent = lang.name;
      if (lang.code === defaultLang) opt.selected = true;
      this.languageSelect.appendChild(opt);
    }

    langRow.appendChild(langLabel);
    langRow.appendChild(this.languageSelect);

    // Status indicator
    this.statusEl = document.createElement('div');
    this.statusEl.className = 'md-speechtotext-status';
    this.statusEl.textContent = '';

    // Transcript area
    this.transcriptArea = document.createElement('div');
    this.transcriptArea.className = 'md-speechtotext-transcript';

    // Confidence indicator
    this.confidenceEl = document.createElement('div');
    this.confidenceEl.className = 'md-speechtotext-confidence';
    this.confidenceEl.textContent = '';

    // Controls
    const controls = document.createElement('div');
    controls.className = 'md-speechtotext-controls';

    this.startStopBtn = document.createElement('button');
    this.startStopBtn.type = 'button';
    this.startStopBtn.className = 'md-speechtotext-btn md-speechtotext-btn-start';
    this.startStopBtn.textContent = trans('Start');
    this.startStopBtn.addEventListener('click', () => this.toggleRecognition());

    this.insertBtn = document.createElement('button');
    this.insertBtn.type = 'button';
    this.insertBtn.className = 'md-speechtotext-btn md-speechtotext-btn-insert';
    this.insertBtn.textContent = trans('Insert');
    this.insertBtn.addEventListener('click', () => this.insertTranscript());

    this.clearBtn = document.createElement('button');
    this.clearBtn.type = 'button';
    this.clearBtn.className = 'md-speechtotext-btn md-speechtotext-btn-clear';
    this.clearBtn.textContent = trans('Clear');
    this.clearBtn.addEventListener('click', () => this.clearTranscript());

    controls.appendChild(this.startStopBtn);
    controls.appendChild(this.insertBtn);
    controls.appendChild(this.clearBtn);

    // Assemble body
    body.appendChild(langRow);
    body.appendChild(this.statusEl);
    body.appendChild(this.transcriptArea);
    body.appendChild(this.confidenceEl);
    body.appendChild(controls);

    // Assemble dialog
    this.dialog.appendChild(header);
    this.dialog.appendChild(body);
    this.overlay.appendChild(this.dialog);
    document.body.appendChild(this.overlay);

    // Keyboard handler
    this.dialog.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.close();
      }
    });
  }

  private toggleRecognition(): void {
    if (this.isListening) {
      this.stopRecognition();
    } else {
      this.startRecognition();
    }
  }

  private startRecognition(): void {
    const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionCtor) return;

    this.recognition = new SpeechRecognitionCtor();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
    this.recognition.lang = this.languageSelect?.value ?? this.getDefaultSpeechLang();
    this.recognition.onresult = this.handleResult.bind(this);
    this.recognition.onerror = this.handleError.bind(this);
    this.recognition.onend = this.handleEnd.bind(this);

    try {
      this.recognition.start();
      this.isListening = true;
      this.updateButtonState();
      this.setStatus(this.options.trans('Listening...'));
    } catch {
      // Already started or error
    }
  }

  private handleResult(event: SpeechRecognitionEvent): void {
    this.interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        const text = result[0].transcript;
        // Ensure a space between sentences when the new text doesn't start with one
        if (this.finalTranscript.length > 0 && !this.finalTranscript.endsWith(' ') && !text.startsWith(' ')) {
          this.finalTranscript += ' ';
        }
        this.finalTranscript += text;
        this.lastConfidence = result[0].confidence;
      } else {
        this.interimTranscript += result[0].transcript;
      }
    }
    this.updateTranscriptDisplay();
    this.updateConfidenceDisplay();
  }

  private handleError(event: SpeechRecognitionErrorEvent): void {
    const trans = this.options.trans;
    if (event.error === 'no-speech') {
      // Normal — Chrome's timeout fired without detecting speech.
      // Don't change status, just let onend handle the restart silently.
    } else if (event.error === 'not-allowed') {
      this.stopRecognition();
      this.setStatus(trans('Microphone access denied'));
    } else if (event.error === 'audio-capture') {
      this.stopRecognition();
      this.setStatus(trans('No microphone found'));
    } else if (event.error === 'network') {
      this.stopRecognition();
      this.setStatus(trans('Network error - speech recognition requires internet'));
    } else if (event.error !== 'aborted') {
      // Unknown error — don't stop, let it restart
    }
  }

  private handleEnd(): void {
    // Auto-restart if user hasn't stopped manually.
    // Use a short delay (300ms) to prevent tight loops but minimize
    // gaps where speech could be missed.
    if (this.isListening) {
      this.restartTimer = setTimeout(() => {
        if (!this.isListening) return;
        try {
          this.recognition?.start();
        } catch {
          // If start() fails on existing instance, create a fresh one
          const Ctor = getSpeechRecognitionConstructor();
          if (!Ctor) return;
          this.recognition = new Ctor();
          this.recognition.continuous = true;
          this.recognition.interimResults = true;
          this.recognition.maxAlternatives = 1;
          this.recognition.lang = this.languageSelect?.value ?? this.getDefaultSpeechLang();
          this.recognition.onresult = this.handleResult.bind(this);
          this.recognition.onerror = this.handleError.bind(this);
          this.recognition.onend = this.handleEnd.bind(this);
          try {
            this.recognition.start();
          } catch {
            // Give up
            this.stopRecognition();
          }
        }
      }, 300);
    }
  }

  private stopRecognition(): void {
    this.isListening = false;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore
      }
      this.recognition = null;
    }
    this.updateButtonState();
    this.setStatus('');
  }

  private updateButtonState(): void {
    const trans = this.options.trans;
    if (this.startStopBtn) {
      if (this.isListening) {
        this.startStopBtn.textContent = trans('Stop');
        this.startStopBtn.classList.remove('md-speechtotext-btn-start');
        this.startStopBtn.classList.add('md-speechtotext-btn-stop');
      } else {
        this.startStopBtn.textContent = trans('Start');
        this.startStopBtn.classList.remove('md-speechtotext-btn-stop');
        this.startStopBtn.classList.add('md-speechtotext-btn-start');
      }
    }
    if (this.statusEl) {
      this.statusEl.classList.toggle('md-speechtotext-status-active', this.isListening);
    }
  }

  private setStatus(text: string): void {
    if (this.statusEl) {
      this.statusEl.textContent = text;
    }
  }

  private updateTranscriptDisplay(): void {
    if (!this.transcriptArea) return;
    const finalSpan = `<span class="md-speechtotext-final">${this.escapeHtml(this.finalTranscript)}</span>`;
    const interimSpan = this.interimTranscript
      ? `<span class="md-speechtotext-interim">${this.escapeHtml(this.interimTranscript)}</span>`
      : '';
    this.transcriptArea.innerHTML = finalSpan + interimSpan;
    // Auto-scroll to bottom
    this.transcriptArea.scrollTop = this.transcriptArea.scrollHeight;
  }

  private updateConfidenceDisplay(): void {
    if (!this.confidenceEl) return;
    if (this.lastConfidence > 0) {
      const pct = Math.round(this.lastConfidence * 100);
      this.confidenceEl.textContent = `${this.options.trans('Confidence')}: ${pct}%`;
    }
  }

  private insertTranscript(): void {
    const text = this.finalTranscript.trim();
    if (!text) return;
    const tiptap = this.options.editor.getTipTap();
    if (tiptap) {
      tiptap.chain().focus().insertContent(text).run();
    }
    this.clearTranscript();
    this.close();
  }

  private clearTranscript(): void {
    this.finalTranscript = '';
    this.interimTranscript = '';
    this.lastConfidence = 0;
    if (this.transcriptArea) {
      this.transcriptArea.innerHTML = '';
    }
    if (this.confidenceEl) {
      this.confidenceEl.textContent = '';
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
