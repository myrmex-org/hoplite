module.exports = {
  root: true,
  env: {
    node: true,
  },
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
  ],
  extends: [
    'eslint:recommended',
    'airbnb-typescript/base',
    'plugin:@typescript-eslint/recommended',
  ],
  overrides: [{
    files: ['features/**/*'],
    rules: {
      'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
    },
  }],
  parserOptions: {
    project: './tsconfig.eslint.json',
  },
};
