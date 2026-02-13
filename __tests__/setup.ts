// Jest test setup
import '@testing-library/jest-dom';

// Mock window.getSelection
Object.defineProperty(window, 'getSelection', {
  value: () => ({
    removeAllRanges: () => {},
    addRange: () => {},
  }),
});

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
