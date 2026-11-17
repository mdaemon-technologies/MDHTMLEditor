// ESLint flat config. It checks for code that type-checks and passes the tests
// but is almost always a mistake: promises nobody handles, HTML written into the
// DOM from a value that isn't constant, and a few correctness slips. Unused code
// is left to tsc (noUnusedLocals / noUnusedParameters in tsconfig.json).
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import nounsanitized from 'eslint-plugin-no-unsanitized';

export default tseslint.config(
  {
    files: ['src/**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    plugins: { 'no-unsanitized': nounsanitized },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Promises: a rejection nobody handles fails silently, off the tested path.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',

      // HTML written into the DOM from anything but a constant or escaped text.
      'no-unsanitized/method': ['error', { escape: { methods: ['escapeHtml'] } }],
      'no-unsanitized/property': ['error', { escape: { methods: ['escapeHtml'] } }],

      // Correctness slips the recommended sets leave out.
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      // Warnings to the host are deliberate; a stray console.log is not.
      'no-console': ['error', { allow: ['warn', 'debug'] }],
      'no-self-compare': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-template-curly-in-string': 'error',

      // tsc already reports unused locals and parameters.
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
);
