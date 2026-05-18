const fs = require('fs');
let content = fs.readFileSync('src/GameCanvas.tsx', 'utf8');

// Also replace the exact string that didn't get caught
content = content.replace(/shadow-\[0_0_40px_rgba\(255,0,0,0\.3\)\]/g, 'shadow-none');
content = content.replace(/shadow-\[0_0_40px_rgba\(255,255,0,0\.2\)\]/g, 'shadow-none');
content = content.replace(/ md:shadow-xl /g, ' ');

// make sure no remaining text shadow or drop shadows exist
content = content.replace(/drop-shadow/g, ''); 

fs.writeFileSync('src/GameCanvas.tsx', content);
console.log('done');
