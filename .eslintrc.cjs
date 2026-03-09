module.exports = {
  root: true,
  ignorePatterns: [
    '**/dist/**',
    '**/node_modules/**',
    '**/coverage/**',
    '.seshflow/**',
  ],
  env: {
    es2022: true,
  },
  overrides: [
    {
      files: ['packages/cli/**/*.js', 'packages/shared/**/*.js'],
      env: {
        node: true,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      extends: ['eslint:recommended'],
      rules: {
        'no-useless-escape': 'off',
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      },
    },
    {
      files: ['packages/web/**/*.jsx'],
      env: {
        browser: true,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      extends: ['eslint:recommended'],
      rules: {
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^[A-Z]' }],
      },
    },
  ],
};
