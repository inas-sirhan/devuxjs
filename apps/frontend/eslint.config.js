import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import importZod from 'eslint-plugin-import-zod'
import unusedImports from 'eslint-plugin-unused-imports'
import sonarjs from 'eslint-plugin-sonarjs'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'

export default tseslint.config(
  { ignores: ['dist', 'vite.config.ts'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended], // sonarjs.configs.recommended
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: './tsconfig.app.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'import-zod': importZod,
      'unused-imports': unusedImports,
      sonarjs,
      react,
      'react-hooks': reactHooks,
    },
    rules: {
      'import-zod/prefer-zod-namespace': 'error',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'warn',
      'sonarjs/no-ignored-return': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
)
