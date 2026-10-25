module.exports = {
  ignorePatterns: ['lib', '*.js'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2018,
    project: './tsconfig.json',
  },
  extends: ['eslint:recommended', 'google'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    'no-restricted-globals': ['error', 'name', 'length'],
    'prefer-arrow-callback': 'error',
    quotes: ['error', 'double', { allowTemplateLiterals: true }],
  },
  overrides: [
    {
      files: ['**/*.spec.*'],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],
  globals: {},
};
