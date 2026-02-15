module.exports = {
  parser: 'babel-eslint',
  env: {
    browser: true,
    amd: true,
    node: true,
    es6: true
  },
  rules: {
    'no-console': 'off'
  },
  plugins: [
    'testcafe'
  ],
  extends: [
    'eslint:recommended',
    'plugin:testcafe/recommended'
  ]
}
