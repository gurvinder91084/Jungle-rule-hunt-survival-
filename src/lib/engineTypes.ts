import { Cell, getShortestPath, getFleeMove } from './maze';
import { audio } from './audio';

export interface Entity {
  id: string;
  species: 'rat' | 'cat' | 'dog' | 'deer' | 'lion' | 'rabbit' | 'wolf' | 'bug' | 'frog' | 'cheese' | 'milk' | 'water' | 'carrot' | 'leaf' | 'trap';
  isPlayer?: boolean;
  isTarget?: boolean;
  ai?: 'chase_rat' | 'chase_cat' | 'chase_deer' | 'chase_rabbit' | 'chase_bug' | 'flee_cat' | 'flee_dog' | 'flee_lion' | 'flee_wolf' | 'flee_frog' | 'flee' | 'random' | 'none';
  x: number; y: number;
  cx: number; cy: number;
  tx: number; ty: number;
  dir: number; // angle in radians. 0=N, PI/2=E, PI=S, -PI/2=W
  speed: number;
  state: 'idle' | 'moving' | 'eating' | 'caught' | 'catching' | 'dead';
  stateTimer: number;
}

export function getDirAngle(dx: number, dy: number) {
  if (dx > 0) return Math.PI / 2;
  if (dx < 0) return -Math.PI / 2;
  if (dy > 0) return Math.PI;
  return 0; // default UP
}

export function getNearest(entities: Entity[], species: string, px: number, py: number) {
  let best = null;
  let minDist = Infinity;
  for (const e of entities) {
    if (e.species === species && e.state !== 'caught') {
      const d = Math.abs(e.x - px) + Math.abs(e.y - py);
      if (d < minDist) { minDist = d; best = e; }
    }
  }
  return best;
}
