/* Analytics has plain, scoped CSS and needs no additional runtime package. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const destination = path.join(root, 'dist/assets/css/analytics.css');
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.copyFileSync(path.join(root, 'src/analytics.css'), destination);
console.log('Analytics CSS built.');
