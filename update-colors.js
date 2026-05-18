const fs = require('fs');
let content = fs.readFileSync('src/GameCanvas.tsx', 'utf8');
content = content.replace(/#b86010/g, '#8b5a2b');
content = content.replace(/#050200/g, '#16181d');
content = content.replace(/#0f0904/g, '#242a33');
fs.writeFileSync('src/GameCanvas.tsx', content);
