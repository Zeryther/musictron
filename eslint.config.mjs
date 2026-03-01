import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y'
import nextPlugin from '@next/eslint-plugin-next'
import prettierConfig from 'eslint-config-prettier'
import globals from 'globals'

export default tseslint.config(
  // ─── Global ignores ───────────────────────────────────────────────────────────
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/dist-electron/**',
      '**/.next/**',
      '**/release/**',
      '**/.turbo/**',
      '**/build/**',
      '**/*.tsbuildinfo',
      '**/out/**',
      'pnpm-lock.yaml',
    ],
  },

  // ─── Base JS recommended rules ────────────────────────────────────────────────
  js.configs.recommended,

  // ─── TypeScript recommended rules ─────────────────────────────────────────────
  ...tseslint.configs.recommended,

  // ─── Global settings for all TS/TSX files ─────────────────────────────────────
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Enforce no explicit any - fix or suppress every instance
      '@typescript-eslint/no-explicit-any': 'error',

      // Catch unused variables but allow _ prefix convention
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // Encourage type-only imports
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      // Warn on non-null assertions
      '@typescript-eslint/no-non-null-assertion': 'warn',
    },
  },

  // ─── React rules for all JSX/TSX files ────────────────────────────────────────
  {
    files: ['**/*.{jsx,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // React recommended rules (manually applied for flat config)
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs['jsx-runtime'].rules,

      // React hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Not needed with TypeScript
      'react/prop-types': 'off',

      // Not needed with React 19 JSX transform
      'react/react-in-jsx-scope': 'off',

      // Too noisy for forwardRef patterns (shadcn/ui)
      'react/display-name': 'off',

      // Allow spreading props (common in UI primitives)
      'react/jsx-no-target-blank': 'error',

      // Accessibility rules
      ...jsxA11yPlugin.configs.recommended.rules,
    },
  },

  // ─── Browser globals for shared app and desktop renderer ──────────────────────
  {
    files: ['packages/app/src/**/*.{ts,tsx}', 'apps/desktop/src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },

  // ─── Next.js specific rules ───────────────────────────────────────────────────
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: {
      '@next/next': nextPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    settings: {
      next: {
        rootDir: 'apps/web/',
      },
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      // App Router doesn't use a pages directory
      '@next/next/no-html-link-for-pages': 'off',
    },
  },

  // ─── Electron main/preload (Node.js environment) ──────────────────────────────
  {
    files: ['apps/desktop/electron/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // Electron main process commonly uses require and process
      'no-console': 'off',
    },
  },

  // ─── General rules for all files ──────────────────────────────────────────────
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx,jsx}'],
    rules: {
      // Allow console.warn and console.error, warn on console.log
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // ─── Config/build files (relaxed rules) ───────────────────────────────────────
  {
    files: [
      '**/*.config.{js,mjs,cjs,ts}',
      '**/postcss.config.*',
      '**/tailwind.config.*',
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // ─── Type declaration files ───────────────────────────────────────────────────
  {
    files: ['**/*.d.ts'],
    rules: {
      // Declaration files commonly use any for external API types
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      // Triple-slash references are valid in .d.ts files
      '@typescript-eslint/triple-slash-reference': 'off',
    },
  },

  // ─── Prettier (must be last - disables formatting rules) ──────────────────────
  prettierConfig,
)
