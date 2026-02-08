module.exports = {
  root: true,
  overrides: [
    {
      files: [
        'Game/src/data/**/*.js',
        'Game/src/core/core-wave-rules.js',
        'Game/src/core/core-wave-start-rules.js',
        'Game/src/core/core-wave-transition-rules.js',
        'Game/src/core/core-spawn-rules.js',
        'Game/src/core/core-input-bindings.js'
      ],
      env: {
        browser: true,
        es2021: true
      },
      globals: {
        Admin: 'readonly',
        Game: 'readonly',
        PVP_CONFIG: 'readonly',
        SKILL_CONFIG: 'readonly',
        WORLD_HEIGHT: 'readonly',
        WORLD_WIDTH: 'readonly'
      },
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'script'
      },
      rules: {
        'no-unused-vars': ['error', {
          args: 'none',
          caughtErrors: 'none',
          ignoreRestSiblings: true,
          varsIgnorePattern: '^_'
        }],
        'no-undef': 'error'
      }
    },
    {
      files: ['Test/scripts/**/*.js', 'Test/tests/**/*.js', 'Test/playwright.config.js'],
      env: {
        node: true,
        browser: true,
        es2021: true
      },
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'script'
      },
      rules: {
        'no-unused-vars': ['error', {
          args: 'none',
          caughtErrors: 'none',
          ignoreRestSiblings: true,
          varsIgnorePattern: '^_'
        }],
        'no-undef': 'error'
      }
    }
  ]
};
