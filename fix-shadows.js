const fs = require('fs');
let content = fs.readFileSync('src/GameCanvas.tsx', 'utf8');

content = content.replace(/ shadow-\[[^\]]*\]/g, '');
content = content.replace(/ drop-shadow-\[[^\]]*\]/g, '');
content = content.replace(/ drop-shadow-[a-z]+/g, '');
content = content.replace(/ shadow-[a-z]+/g, '');
content = content.replace(/ animate-pulse/g, '');

fs.writeFileSync('src/GameCanvas.tsx', content);
console.log('done');
