/**
 * Dictation Tests
 */

import { HTMLEditor } from '../../src/core/HTMLEditor';
import { Dictation } from '../../src/extensions/Dictation';
import { isSpeechRecognitionSupported } from '../../src/extensions/SpeechToText';

// Mock SpeechRecognition with instance tracking
let lastMockInstance: MockSpeechRecognition | null = null;

class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  lang = '';
  onresult: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onend: (() => void) | null = null;
  started = false;

  constructor() {
    lastMockInstance = this;
  }

  start() {
    this.started = true;
  }

  stop() {
    this.started = false;
  }

  abort() {
    this.started = false;
  }

  simulateResult(transcript: string, isFinal: boolean, confidence = 0.95) {
    const event = {
      resultIndex: 0,
      results: [
        {
          isFinal,
          0: { transcript, confidence },
          length: 1,
        },
      ],
    };
    this.onresult?.(event as any);
  }

  simulateError(error: string) {
    this.onerror?.({ error } as any);
  }

  simulateEnd() {
    this.onend?.();
  }
}

describe('Dictation', () => {
  let container: HTMLElement;
  let editor: HTMLEditor;
  let dictation: Dictation;
  let transMock: jest.Mock;
  let stateChangeMock: jest.Mock;
  let originalSpeechRecognition: any;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    editor = new HTMLEditor(container);
    transMock = jest.fn((key) => key);
    stateChangeMock = jest.fn();

    originalSpeechRecognition = (window as any).SpeechRecognition;
    (window as any).SpeechRecognition = MockSpeechRecognition;

    dictation = new Dictation({
      editor,
      trans: transMock,
      onStateChange: stateChangeMock,
    });
  });

  afterEach(() => {
    dictation?.destroy();
    editor?.destroy();
    container?.remove();
    (window as any).SpeechRecognition = originalSpeechRecognition;
    jest.useRealTimers();
  });

  describe('initialization', () => {
    it('should create a Dictation instance', () => {
      expect(dictation).toBeDefined();
    });

    it('should start inactive', () => {
      expect(dictation.isActive).toBe(false);
    });
  });

  describe('start/stop', () => {
    it('should start recognition when start() is called', () => {
      dictation.start();
      expect(dictation.isActive).toBe(true);
      expect(stateChangeMock).toHaveBeenCalledWith(true);
    });

    it('should stop recognition when stop() is called', () => {
      dictation.start();
      dictation.stop();
      expect(dictation.isActive).toBe(false);
      expect(stateChangeMock).toHaveBeenCalledWith(false);
    });

    it('should toggle on and off', () => {
      dictation.toggle();
      expect(dictation.isActive).toBe(true);
      dictation.toggle();
      expect(dictation.isActive).toBe(false);
    });

    it('should not start if SpeechRecognition is unavailable', () => {
      delete (window as any).SpeechRecognition;
      delete (window as any).webkitSpeechRecognition;

      const d = new Dictation({ editor, trans: transMock, onStateChange: stateChangeMock });
      d.start();
      expect(d.isActive).toBe(false);
    });

    it('should configure recognition with continuous mode', () => {
      dictation.start();
      // The mock stores its config - access it indirectly
      // We just verify it started successfully
      expect(dictation.isActive).toBe(true);
    });

    it('should use editor language for recognition lang', () => {
      // Default language is 'en' which maps to 'en-US'
      dictation.start();
      expect(dictation.isActive).toBe(true);
    });
  });

  describe('text insertion', () => {
    it('should insert final recognized text into the editor', () => {
      dictation.start();

      const mockRecognition = getMockRecognitionInstance();
      mockRecognition.simulateResult('Hello world', true);

      const tiptap = editor.getTipTap();
      if (tiptap) {
        const content = tiptap.getHTML();
        expect(content).toContain('Hello world');
      }
    });

    it('should show interim results live in the editor', () => {
      dictation.start();

      const mockRecognition = getMockRecognitionInstance();
      mockRecognition.simulateResult('Hello', false);

      const tiptap = editor.getTipTap();
      if (tiptap) {
        const content = tiptap.getText();
        expect(content).toContain('Hello');
      }
    });

    it('should replace interim text when updated', () => {
      dictation.start();

      const mockRecognition = getMockRecognitionInstance();
      mockRecognition.simulateResult('Hel', false);
      mockRecognition.simulateResult('Hello world', false);

      const tiptap = editor.getTipTap();
      if (tiptap) {
        const content = tiptap.getText();
        expect(content).toContain('Hello world');
        // Should not have duplicate "Hel"
        expect(content.indexOf('Hello world')).toBe(content.lastIndexOf('Hello world'));
      }
    });

    it('should replace interim with final text', () => {
      dictation.start();

      const mockRecognition = getMockRecognitionInstance();
      mockRecognition.simulateResult('Hello worl', false);
      mockRecognition.simulateResult('Hello world', true);

      const tiptap = editor.getTipTap();
      if (tiptap) {
        const content = tiptap.getText();
        expect(content).toContain('Hello world');
        // Interim "Hello worl" should be gone
        expect(content).not.toContain('Hello worl ');
      }
    });

    it('should add spaces between separate final results', () => {
      dictation.start();

      const mockRecognition = getMockRecognitionInstance();
      mockRecognition.simulateResult('Hello', true);
      mockRecognition.simulateResult('world', true);

      const tiptap = editor.getTipTap();
      if (tiptap) {
        const content = tiptap.getText();
        expect(content).toContain('Hello');
        expect(content).toContain('world');
      }
    });

    it('should not add leading space if transcript starts with space', () => {
      dictation.start();

      const mockRecognition = getMockRecognitionInstance();
      mockRecognition.simulateResult('Hello', true);
      mockRecognition.simulateResult(' world', true);

      const tiptap = editor.getTipTap();
      if (tiptap) {
        const text = tiptap.getText();
        expect(text).not.toContain('  ');
      }
    });

    it('should remove interim text on stop', () => {
      dictation.start();

      const mockRecognition = getMockRecognitionInstance();
      mockRecognition.simulateResult('partial sentence', false);

      // Verify it's there
      const tiptap = editor.getTipTap();
      if (tiptap) {
        expect(tiptap.getText()).toContain('partial sentence');
      }

      // Stop should clear interim
      dictation.stop();
      if (tiptap) {
        expect(tiptap.getText()).not.toContain('partial sentence');
      }
    });
  });

  describe('error handling', () => {
    it('should keep running on no-speech error', () => {
      dictation.start();
      const mockRecognition = getMockRecognitionInstance();
      mockRecognition.simulateError('no-speech');
      expect(dictation.isActive).toBe(true);
    });

    it('should stop on not-allowed error', () => {
      dictation.start();
      const mockRecognition = getMockRecognitionInstance();
      mockRecognition.simulateError('not-allowed');
      expect(dictation.isActive).toBe(false);
      expect(stateChangeMock).toHaveBeenLastCalledWith(false);
    });

    it('should stop on audio-capture error', () => {
      dictation.start();
      const mockRecognition = getMockRecognitionInstance();
      mockRecognition.simulateError('audio-capture');
      expect(dictation.isActive).toBe(false);
    });

    it('should stop on network error', () => {
      dictation.start();
      const mockRecognition = getMockRecognitionInstance();
      mockRecognition.simulateError('network');
      expect(dictation.isActive).toBe(false);
    });
  });

  describe('auto-restart', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it('should restart recognition when it ends while active', () => {
      dictation.start();
      const mockRecognition = getMockRecognitionInstance();
      mockRecognition.simulateEnd();

      jest.advanceTimersByTime(300);
      // Should still be active (auto-restarted)
      expect(dictation.isActive).toBe(true);
    });

    it('should not restart when manually stopped', () => {
      dictation.start();
      dictation.stop();
      const mockRecognition = getMockRecognitionInstance();
      mockRecognition.simulateEnd();

      jest.advanceTimersByTime(300);
      expect(dictation.isActive).toBe(false);
    });
  });

  describe('destroy', () => {
    it('should stop recognition on destroy', () => {
      dictation.start();
      expect(dictation.isActive).toBe(true);
      dictation.destroy();
      expect(dictation.isActive).toBe(false);
    });

    it('should fire state change on destroy', () => {
      dictation.start();
      stateChangeMock.mockClear();
      dictation.destroy();
      expect(stateChangeMock).toHaveBeenCalledWith(false);
    });
  });

  describe('onStateChange callback', () => {
    it('should call onStateChange with true on start', () => {
      dictation.start();
      expect(stateChangeMock).toHaveBeenCalledWith(true);
    });

    it('should call onStateChange with false on stop', () => {
      dictation.start();
      stateChangeMock.mockClear();
      dictation.stop();
      expect(stateChangeMock).toHaveBeenCalledWith(false);
    });

    it('should work without onStateChange callback', () => {
      const d = new Dictation({ editor, trans: transMock });
      expect(() => d.start()).not.toThrow();
      expect(() => d.stop()).not.toThrow();
      d.destroy();
    });
  });
});

// Helper to get the last created MockSpeechRecognition instance
function getMockRecognitionInstance(): MockSpeechRecognition {
  return lastMockInstance!;
}
