module.exports = {
  '*.{js,jsx,ts,tsx}': [
    () => 'npm run build',
    () => 'npm run build:test',
    'standard --fix',
    () => 'git add', // we need this to add possibly changed files in ./resources (through build scripts)
    () => 'npm test'
  ],
  'src/nodes/*.html': [() => 'npm run documentation']
}
