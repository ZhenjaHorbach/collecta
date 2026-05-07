// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier');
const reactCompiler = require('eslint-plugin-react-compiler');

module.exports = defineConfig([
  expoConfig,
  prettier,
  {
    ignores: ['dist/*', '.expo/**', 'supabase/functions/**', '.claude/design/**'],
  },
  // React Compiler lint rule. The compiler itself runs in the babel
  // pipeline (app.json → experiments.reactCompiler + babel-preset-expo);
  // this rule statically flags components / hooks that the compiler will
  // refuse to optimise (mutating props, conditional hooks, etc.) so we
  // catch the regression at lint time instead of seeing un-memoised
  // builds in prod.
  {
    plugins: { 'react-compiler': reactCompiler },
    rules: {
      'react-compiler/react-compiler': 'error',
    },
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
