module.exports = {
  '*.{js,jsx,ts,tsx}': [
    () => 'npm run build',
    () => 'npm run build:test',
    'standard --fix src/ scripts/ --ignore testcafe/',
    () => 'npm test'
  ],
  'src/nodes/*.html': [() => 'npm run documentation']
}
