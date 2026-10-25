import js from '@eslint/js'
import tseslint from 'typescript-eslint'

const IGNORES = [
  '**/node_modules/**',
  '**/.next/**',
  '**/out/**',
  '**/dist/**',
  '**/coverage/**',
  '**/drizzle/**',
]

export const base = [
  { ignores: IGNORES },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-expect-error': 'allow-with-description' },
      ],
    },
  },
]

export const noComments = {
  plugins: {
    replo: {
      rules: {
        'no-comments': {
          meta: {
            type: 'suggestion',
            schema: [],
            messages: {
              noComment:
                'No comments in code: names, types and tests carry the meaning (MEM D-064).',
            },
          },
          create(context) {
            return {
              Program() {
                for (const comment of context.sourceCode.getAllComments())
                  context.report({ loc: comment.loc, messageId: 'noComment' })
              },
            }
          },
        },
      },
    },
  },
  rules: { 'replo/no-comments': 'error' },
}

const restrict = (group, message) => ({
  rules: { 'no-restricted-imports': ['error', { patterns: [{ group, message }] }] },
})

const BACKEND_PATTERNS = [
  '@replo/ai',
  '@replo/ai/*',
  '@replo/repo-analysis',
  '@replo/repo-analysis/*',
  '@replo/api',
  '@replo/api/*',
]

export const frontendBoundaries = restrict(
  [...BACKEND_PATTERNS, '**/apps/api/**'],
  'Frontends may only import @replo/contracts (types) and @replo/ui. See RULES.md §1.',
)

export const landingBoundaries = restrict(
  [...BACKEND_PATTERNS, '@replo/contracts', '@replo/contracts/*', '**/apps/**'],
  'The landing page may only import @replo/ui. See RULES.md §1.',
)

export const leafPackageBoundaries = restrict(
  ['@replo/*', '!@replo/config', '!@replo/config/*', '**/apps/**'],
  'Leaf packages must not import other internal packages or apps. See RULES.md §1.',
)

export const apiBoundaries = restrict(
  [
    '@replo/product',
    '@replo/landing',
    '@replo/ui',
    '@replo/ui/*',
    '**/apps/product/**',
    '**/apps/landing/**',
  ],
  'The API must not import frontend code. See RULES.md §1.',
)

export { tseslint }
