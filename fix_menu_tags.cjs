const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Use a very simple search that doesn't care about the whole block's indentation if possible
// But here the block is messy, so I'll find the specific comment.
const comment = '                                     {/* Bottom area (Buttons moved to top) */}';
const buttonLine = '                        </button>';

const startIdx = content.indexOf(comment);
if (startIdx === -1) {
    console.error('Could not find comment line');
    process.exit(1);
}

const endText = '              </motion.div>';
const endIdx = content.indexOf(endText, startIdx);

if (endIdx === -1) {
    console.error('Could not find end of menu');
    process.exit(1);
}

const fixed = `                    </div>
                 </div>
                 </div>

                 {/* More Games Button at bottom */}
                 <div className="mt-4 mb-10 pb-4">
                    <button 
                        onClick={() => {
                            window.open('https://ai.google.dev/', '_blank');
                        }}
                        className={\`max-w-[200px] \${theme === 'oled' ? 'bg-[#333] border-[#555] text-white hover:bg-[#444]' : 'bg-[#15803d] border-[#022c22] text-white hover:bg-[#166534]'} border-2 border-b-[4px] rounded-xl py-2 px-6 flex items-center justify-center gap-2 font-black text-[11px] tracking-widest transition-all active:border-b-2 active:translate-y-[2px] cursor-pointer shadow-lg relative z-50\`}
                    >
                        <Gamepad2 size={18} />
                        MORE GAMES
                    </button>
                 </div>
              </motion.div>`;

const newContent = content.substring(0, startIdx-1) + fixed + content.substring(endIdx + endText.length);
fs.writeFileSync('src/App.tsx', newContent);
console.log('Fixed App.tsx successfully');
