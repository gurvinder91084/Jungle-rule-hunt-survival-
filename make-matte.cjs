const fs = require('fs');

function makeMatte(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace gradients with flat backgrounds
  content = content.replace(/bg-gradient-to-b from-\[([^\]]+)\] to-\[([^\]]+)\]/g, 'bg-[$1]');
  content = content.replace(/bg-gradient-to-b from-([^ ]+) to-([^ ]+)/g, 'bg-$1');
  
  // Replace neon colors with matte equivalents
  content = content.replace(/#bef264/gi, '#65a30d'); // neon lime -> matte lime
  content = content.replace(/#d9f99d/gi, '#84cc16'); // bright lime -> softer lime
  content = content.replace(/#ef4444/gi, '#cc0000'); // neon red -> matte red
  content = content.replace(/#eab308/gi, '#b38600'); // neon yellow -> matte yellow
  
  // Also remove blur and glass effects for pure matte?
  content = content.replace(/backdrop-blur-sm/g, '');

  fs.writeFileSync(filePath, content);
}

makeMatte('src/App.tsx');
makeMatte('src/GameCanvas.tsx');
makeMatte('src/lib/renderer.ts');

console.log('done matte');
