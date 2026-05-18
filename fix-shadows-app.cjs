const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// remove various tailwind shadows
content = content.replace(/ shadow-\[[^\]]*\]/g, '');
content = content.replace(/ drop-shadow-\[[^\]]*\]/g, '');
content = content.replace(/ drop-shadow-[a-z0-9-]+/g, '');
content = content.replace(/ shadow-[a-z0-9-]+/g, '');
content = content.replace(/ animate-pulse/g, '');

fs.writeFileSync('src/App.tsx', content);
console.log('done App.tsx');
