// Jest test setup
import '@testing-library/jest-dom';

// Mock window.getSelection
Object.defineProperty(window, 'getSelection', {
  value: () => ({
    removeAllRanges: () => {},
    addRange: () => {},
    getRangeAt: () => ({
      cloneRange: () => ({}),
      selectNodeContents: () => {},
      collapse: () => {},
    }),
    rangeCount: 0,
    anchorNode: null,
    focusNode: null,
  }),
});

// Mock document.createRange
document.createRange = () => ({
  setStart: () => {},
  setEnd: () => {},
  selectNodeContents: () => {},
  collapse: () => {},
  cloneRange: () => ({}),
  getBoundingClientRect: () => ({
    top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0,
    x: 0, y: 0, toJSON: () => {},
  }),
  getClientRects: () => [],
  commonAncestorContainer: document.body,
}) as unknown as Range;

// Mock ResizeObserver
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver;

// Mock IntersectionObserver
class IntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.IntersectionObserver = IntersectionObserver as any;

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockResolvedValue(undefined),
    readText: jest.fn().mockResolvedValue(''),
  },
  writable: true,
});

// Mock execCommand for copy/cut/paste
document.execCommand = jest.fn().mockReturnValue(true);

// Silence console warnings from TipTap in tests
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const msg = args[0];
  if (msg && typeof msg === 'string') {
    // Ignore these TipTap/toolbar warnings in tests
    if (msg.includes('Unknown toolbar button') ||
        msg.includes('[tiptap warn]') ||
        msg.includes('Duplicate extension')) {
      return;
    }
  }
  originalWarn.apply(console, args);
};
