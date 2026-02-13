/**
 * Mock for @tiptap/extension-code-block-lowlight
 * This mock is needed because the extension has compatibility issues in Jest
 */

import { Extension } from '@tiptap/core';

// Create a mock extension that mimics CodeBlockLowlight
export const CodeBlockLowlight = Extension.create({
  name: 'codeBlockLowlight',

  addOptions() {
    return {
      lowlight: null,
      defaultLanguage: null,
      exitOnArrowDown: true,
      exitOnTripleEnter: true,
    };
  },
});
