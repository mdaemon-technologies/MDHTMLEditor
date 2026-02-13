/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/__tests__'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  moduleNameMapper: {
    '\\.(css|scss)$': '<rootDir>/__tests__/__mocks__/styleMock.js',
    '^@tiptap/extension-code-block-lowlight$': '<rootDir>/__tests__/__mocks__/@tiptap/extension-code-block-lowlight.ts',
    '^lowlight$': '<rootDir>/__tests__/__mocks__/lowlight.js',
  },
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
};
