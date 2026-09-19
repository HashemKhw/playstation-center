import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      'build/**',
      'release/**',
      'desktop/server-bundle.cjs',
      'server/prisma/migrations/**',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['desktop/main.cjs', 'desktop/server-runner.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
