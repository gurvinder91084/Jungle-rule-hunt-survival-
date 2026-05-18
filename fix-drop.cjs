const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/drop-shadow-md/g, '');

fs.writeFileSync('src/App.tsx', content);
console.log('done');
