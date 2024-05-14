module.exports = {
  root: true,
  extends: 'airbnb-base',
  env: {
    browser: true,
  },
  ignorePatterns: [
    'src/deps/**',
    'dist/**',
  ],
  rules: {
    // airbnb-base is far to arrogant for me ;)
    // not trying to boil an ocean.
    'no-multiple-empty-lines': 'off',
    'import/prefer-default-export': 'off',
    'max-classes-per-file': 'off',
    'no-plusplus': 'off',
    'no-restricted-syntax': 'off',
    // allow reassigning param
    'no-param-reassign': [2, { props: false }],
    'linebreak-style': ['error', 'unix'],
    'import/extensions': ['error', {
      js: 'always',
    }],
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
