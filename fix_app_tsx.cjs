const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');

const badLineIndex = lines.findIndex(l => l.includes('</but') && l.includes('div'));
if (badLineIndex !== -1) {
    console.log('Found bad line at index', badLineIndex);
    // Replace the specific range of lines
    // Line 456 is badLineIndex (starting from 0)
    // We want to replace from line 456 down to where the mess ends.
    // Let's look at the lines:
    // 456: </but ...
    // 457: empty?
    // 458: {/* Controller Settings */}
    // 459: <div ... {/* Controller Settings */}
    // 460: <div ...
    
    lines.splice(badLineIndex, 5, 
        '                        </button>',
        '                      </div>',
        '                    </div>',
        '                  </div>',
        '',
        '                  <div className="w-full h-px bg-[#15803d]/30 my-[-10px]"></div>',
        '',
        '                  {/* Controller Settings */}',
        '                  <div className="flex flex-col gap-3">'
    );
    
    fs.writeFileSync('src/App.tsx', lines.join('\n'));
    console.log('Fixed App.tsx successfully');
} else {
    console.error('Could not find bad line');
}
