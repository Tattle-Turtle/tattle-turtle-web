const fs = require('fs');
const path = 'src/App.tsx';
let s = fs.readFileSync(path, 'utf8');
const marker = "  if (mode === 'parent') {";
const endMarker = '  // Incoming Call Screen';
const start = s.indexOf(marker);
const end = s.indexOf(endMarker, start);
if (start !== -1 && end !== -1) {
  s = s.slice(0, start) + s.slice(end);
  fs.writeFileSync(path, s);
  console.log('Removed parent block');
} else {
  console.log('start', start, 'end', end);
}
