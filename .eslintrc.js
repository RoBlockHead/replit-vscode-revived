module.exports = {
  parser: '@typescript-eslint/parser',
  extends: ['airbnb/base', 'plugin:@typescript-eslint/recommended', 'prettier/@typescript-eslint'],
  plugins: ['@typescript-eslint', 'prettier'],
  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts'],
    },
    'import/resolver': {
      typescript: {},
    },
  },
  env: {
    browser: true,
    node: true,
  },
  rules: {
    'import/prefer-default-export': 'off',
    'import/extensions': 'off',
    'import/no-unresolved': 'off',
    indent: 'off',
    'function-paren-newline': 'off',
    'space-before-function-paren': 'off',
    'no-restricted-syntax': ['error', 'LabeledStatement', 'WithStatement'],
    'no-await-in-loop': 'off',
    'implicit-arrow-linebreak': 'off', // conflicts with prettier
    'no-unused-expressions': 'off', // breaks optional chaining
    '@typescript-eslint/no-unused-expressions': 'error',
    'max-len': ['error', { code: 120, ignoreComments: true }],
    '@typescript-eslint/no-empty-function': 'off',
    'no-shadow': 'off',
    '@typescript-eslint/no-shadow': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-non-null-assertion': 'error',
    // Typescript already checks this, and respects an _ prefix meaning it is purposely
    //  unused, while this rule does not
    '@typescript-eslint/no-unused-vars': 'off',
    'operator-linebreak': 'off',
    'no-param-reassign': ['error', { props: false }],
    'object-curly-newline': 'off',
    'consistent-return': 'off',
    'no-console': 'off',
    'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
  },
};
