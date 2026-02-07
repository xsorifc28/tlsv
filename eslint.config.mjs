import eslint from '@eslint/js';
import tsEslint from 'typescript-eslint';

export default tsEslint.config(
  {
    ignores: [
      "*.config.js",
      "*.config.ts",
      "dist/"
    ],
  },
  eslint.configs.recommended,
  ...tsEslint.configs.recommended,
  {
    rules: {
      "object-curly-spacing": ["error", "always"],
    },
    languageOptions: {
      parserOptions: {
        sourceType: "module",
      },
    },
  }
);
