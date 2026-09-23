/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/__tests__'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
    }],
  },
  moduleNameMapper: {
    '\\.(css|scss)$': '<rootDir>/__tests__/__mocks__/styleMock.js',
    '^@tiptap/extension-code-block-lowlight$': '<rootDir>/__tests__/__mocks__/@tiptap/extension-code-block-lowlight.ts',
    '^lowlight$': '<rootDir>/__tests__/__mocks__/lowlight.js',
    // marked is ESM-only from v16 on, and this preset only transforms .ts. The
    // package still ships a UMD build, so point Jest at it to keep the real
    // parser (not a stub) under test.
    '^marked$': '<rootDir>/node_modules/marked/lib/marked.umd.js',
  },
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
};
