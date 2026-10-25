import { base, noComments } from '@replo/config/eslint'

export default [
  ...base,
  noComments,
  {
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['**/apps/**', '@replo/api'], message: 'evals must not import apps.' },
          ],
        },
      ],
    },
  },
]
