// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettier,
  {
    ignores: ['dist/*', 'supabase/functions/**'],
  },
  {
    rules: {
      'bem-helper/case': 'off',
    },
  },
  {
    files: ['*.config.js', '*.config.cjs', 'metro.config.js', 'babel.config.js'],
    languageOptions: {
      globals: {
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        process: 'readonly',
      },
    },
  },
]);
