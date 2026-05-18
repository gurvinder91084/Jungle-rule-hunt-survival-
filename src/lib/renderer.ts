// src/lib/renderer.ts

function shadow(ctx: CanvasRenderingContext2D, color: string, blur: number) {
  // disabled for matte look
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
}
function noShadow(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
}

export function drawEntity(
  ctx: CanvasRenderingContext2D, 
  species: string, 
  cx: number, cy: number, 
  dir: number, 
  time: number, 
  state: 'idle' | 'moving' | 'eating' | 'caught' | 'catching' | 'dead',
  isTarget?: boolean
) {
  ctx.save();
  ctx.translate(cx, cy);

  const isMoving = state === 'moving' || state === 'catching';
  const bobY = isMoving ? Math.sin(time * 0.02) * -3 : 0;
  
  // To keep the face always straight (ghumey na), we only apply the bobbing, NOT rotation based on `dir`
  ctx.translate(0, bobY);
  
  if (state === 'caught') {
    if (isTarget) {
      // Target item collected - Shimmer effect!
      ctx.save();
      for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 / 12) * i + time * 0.005;
        const dist = 15 + Math.sin(time * 0.02 + i) * 12;
        const sx = Math.cos(angle) * dist;
        const sy = Math.sin(angle) * dist;
        ctx.globalAlpha = Math.random() * 0.5 + 0.5;
        ctx.fillStyle = i % 2 === 0 ? '#FFD700' : '#FFFFFF';
        ctx.beginPath();
        ctx.arc(sx, sy, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
      }
      ctx.restore();
    } else if (!['cheese', 'milk', 'water', 'carrot', 'leaf'].includes(species) && !species.includes('trap')) {
       ctx.globalAlpha = 0.6;
       ctx.fillStyle = '#ff3333';
       ctx.beginPath();
       ctx.arc(0, 0, 15, 0, Math.PI*2);
       ctx.fill();
    }
  }

  // Shadow for 2D float effect
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;

  ctx.font = '24px Arial'; // Slightly larger for better visibility
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let emoji = '❔';
  if (species === 'cheese') emoji = '🧀';
  if (species === 'milk') emoji = '🥛';
  if (species === 'water') emoji = '💧';
  if (species === 'carrot') emoji = '🥕';
  if (species === 'leaf') emoji = '🌿';
  if (species === 'trap_rat') emoji = '🧀';
  if (species === 'trap_cat') emoji = '🥛';
  if (species === 'trap_dog') emoji = '🥩';
  if (species === 'trap_lion') emoji = '🥩';
  if (species === 'trap_deer') emoji = '💧';
  if (species === 'trap_rabbit') emoji = '🥕';
  if (species === 'trap_wolf') emoji = '🥩';
  if (species === 'trap_bug') emoji = '🌿';
  if (species === 'trap_frog') emoji = '🦟';
  if (species === 'rat') emoji = '🐭';
  if (species === 'cat') emoji = '🐱';
  if (species === 'dog') emoji = '🐶';
  if (species === 'deer') emoji = '🦌';
  if (species === 'lion') emoji = '🦁';
  if (species === 'rabbit') emoji = '🐰';
  if (species === 'wolf') emoji = '🐺';
  if (species === 'bug') emoji = '🐛';
  if (species === 'frog') emoji = '🐸';

  if (state === 'caught' && !isTarget && !['cheese', 'milk', 'water', 'carrot', 'leaf'].includes(species) && !species.includes('trap')) {
     emoji = '💥';
     ctx.globalAlpha = Math.max(0.4, Math.random());
  }

  if (state === 'eating') {
    ctx.scale(1.2, 1.2);
  }

  // Ensure fillStyle is opaque (and white for monochrome fallbacks) before drawing text
  ctx.fillStyle = '#FFFFFF';

  // Draw emoji slightly larger and centered
  ctx.fillText(emoji, 0, 2);
  ctx.restore();
}
