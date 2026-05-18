export interface Cell {
  x: number; y: number;
  n: boolean; s: boolean; e: boolean; w: boolean;
  visited: boolean;
}

export function generateMaze(width: number, height: number, braidRate: number = 0.5): Cell[][] {
  const grid: Cell[][] = Array.from({length: height}, (_, y) =>
    Array.from({length: width}, (_, x) => ({
      x, y,
      n: true, s: true, e: true, w: true,
      visited: false
    }))
  );

  // DFS backtracker
  const stack = [grid[0][0]];
  grid[0][0].visited = true;

  const getUnvisitedNeighbors = (c: Cell) => {
    const list = [];
    if (c.y > 0 && !grid[c.y-1][c.x].visited) list.push({c: grid[c.y-1][c.x], dir: 'n'});
    if (c.y < height - 1 && !grid[c.y+1][c.x].visited) list.push({c: grid[c.y+1][c.x], dir: 's'});
    if (c.x > 0 && !grid[c.y][c.x-1].visited) list.push({c: grid[c.y][c.x-1], dir: 'w'});
    if (c.x < width - 1 && !grid[c.y][c.x+1].visited) list.push({c: grid[c.y][c.x+1], dir: 'e'});
    return list;
  };

  while (stack.length > 0) {
    const curr = stack[stack.length - 1];
    const neighbors = getUnvisitedNeighbors(curr);
    if (neighbors.length === 0) {
      stack.pop();
    } else {
      const next = neighbors[Math.floor(Math.random() * neighbors.length)];
      if (next.dir === 'n') { curr.n = false; next.c.s = false; }
      if (next.dir === 's') { curr.s = false; next.c.n = false; }
      if (next.dir === 'e') { curr.e = false; next.c.w = false; }
      if (next.dir === 'w') { curr.w = false; next.c.e = false; }
      next.c.visited = true;
      stack.push(next.c);
    }
  }

  // Pass 1: Make it a bit more open but keep structure
  for (let pass = 0; pass < 1; pass++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const c = grid[y][x];
        const isDeadEnd = [c.n, c.s, c.e, c.w].filter(w => w).length === 3;
        
        if (isDeadEnd && Math.random() < braidRate) {
            const walls = [];
            if (c.n && y > 0) walls.push('n');
            if (c.s && y < height - 1) walls.push('s');
            if (c.e && x < width - 1) walls.push('e');
            if (c.w && x > 0) walls.push('w');

            if (walls.length > 0) {
                const toRemove = walls[Math.floor(Math.random() * walls.length)];
                if (toRemove === 'n') { c.n = false; grid[y-1][x].s = false; }
                if (toRemove === 's') { c.s = false; grid[y+1][x].n = false; }
                if (toRemove === 'e') { c.e = false; grid[y][x+1].w = false; }
                if (toRemove === 'w') { c.w = false; grid[y][x-1].e = false; }
            }
        }
      }
    }
  }

  // Pass 2: Random openings with low probability to break up long corridors and add shortcuts
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const c = grid[y][x];
      // Randomly remove some other walls to create extra shortcuts
      if ([c.n, c.s, c.e, c.w].filter(w => w).length > 2 && Math.random() < (braidRate * 0.5)) {
          const remWalls = [];
          if (c.n && y > 0) remWalls.push('n');
          if (c.s && y < height - 1) remWalls.push('s');
          if (c.e && x < width - 1) remWalls.push('e');
          if (c.w && x > 0) remWalls.push('w');
          if (remWalls.length > 0) {
              const toRemove = remWalls[Math.floor(Math.random() * remWalls.length)];
              if (toRemove === 'n') { c.n = false; grid[y-1][x].s = false; }
              if (toRemove === 's') { c.s = false; grid[y+1][x].n = false; }
              if (toRemove === 'e') { c.e = false; grid[y][x+1].w = false; }
              if (toRemove === 'w') { c.w = false; grid[y][x-1].e = false; }
          }
      }
    }
  }

  return grid;
}

export function getShortestPath(maze: Cell[][], sx: number, sy: number, tx: number, ty: number) {
  if (sx === tx && sy === ty) return [];
  const queue = [{x: sx, y: sy, path: [] as {x: number, y: number}[]}];
  const visited = new Set();
  visited.add(`${sx},${sy}`);

  while(queue.length > 0) {
    const curr = queue.shift()!;
    if (curr.x === tx && curr.y === ty) return curr.path;
    
    const cell = maze[curr.y][curr.x];
    const neighbors = [];
    if (!cell.n) neighbors.push({x: curr.x, y: curr.y - 1});
    if (!cell.s) neighbors.push({x: curr.x, y: curr.y + 1});
    if (!cell.e) neighbors.push({x: curr.x + 1, y: curr.y});
    if (!cell.w) neighbors.push({x: curr.x - 1, y: curr.y});

    for (const n of neighbors) {
      if (!visited.has(`${n.x},${n.y}`)) {
        visited.add(`${n.x},${n.y}`);
        queue.push({x: n.x, y: n.y, path: [...curr.path, {x: n.x, y: n.y}]});
      }
    }
  }
  return [];
}

export function getFleeMove(maze: Cell[][], sx: number, sy: number, tx: number, ty: number) {
   const c = maze[sy][sx];
   let bestMove = null;
   let maxScore = -Infinity;
   
   // Calculate distance from threat to all cells using BFS
   const threatDist = new Map<string, number>();
   const pq = [{x: tx, y: ty, d: 0}];
   threatDist.set(`${tx},${ty}`, 0);
   let idx = 0;
   while (idx < pq.length) {
       let curr = pq[idx++];
       const cell = maze[curr.y][curr.x];
       const nd = curr.d + 1;
       const check = (nx: number, ny: number) => {
           let nk = `${nx},${ny}`;
           if (!threatDist.has(nk)) {
               threatDist.set(nk, nd);
               pq.push({x: nx, y: ny, d: nd});
           }
       };
       if (!cell.n) check(curr.x, curr.y - 1);
       if (!cell.s) check(curr.x, curr.y + 1);
       if (!cell.e) check(curr.x + 1, curr.y);
       if (!cell.w) check(curr.x - 1, curr.y);
   }

   const currThreatDist = threatDist.get(`${sx},${sy}`) || 0;

   const tryMove = (nx: number, ny: number) => {
      const distToThreat = threatDist.get(`${nx},${ny}`) || 0;
      
      // Lookahead: Calculate maximum safe distance we can reach
      let maxReachableDist = distToThreat;
      let safeSpace = 0;
      const q2 = [{x: nx, y: ny, d: 0}];
      const visited = new Set([`${sx},${sy}`, `${tx},${ty}`]); 
      let j = 0;
      // Search depth increased to plan further ahead
      while (j < q2.length && j < 150) { 
          let curr = q2[j++];
          safeSpace++;
          
          let dThreat = threatDist.get(`${curr.x},${curr.y}`) || 0;
          if (dThreat > maxReachableDist) {
              maxReachableDist = dThreat;
          }
          
          const cell = maze[curr.y][curr.x];
          const nd = curr.d + 1;
          const walk = (nnx: number, nny: number) => {
              let nk = `${nnx},${nny}`;
              if (!visited.has(nk)) {
                  let dt = threatDist.get(nk) || 0;
                  // Only count space that doesn't put us very close to the threat
                  if (dt >= distToThreat - 2) { 
                      visited.add(nk);
                      q2.push({x: nnx, y: nny, d: nd});
                  }
              }
          };
          if (!cell.n) walk(curr.x, curr.y - 1);
          if (!cell.s) walk(curr.x, curr.y + 1);
          if (!cell.e) walk(curr.x + 1, curr.y);
          if (!cell.w) walk(curr.x - 1, curr.y);
      }

      // Maximize the maximum distance from threat we can run to, and safe space
      let score = (maxReachableDist * 1000) + (safeSpace * 10) + distToThreat;
      
      if (distToThreat <= currThreatDist) {
         score -= 10000; // heavy penalty for moving towards threat
      }

      if (score > maxScore) {
         maxScore = score;
         bestMove = {x: nx, y: ny};
      }
   }

   if (!c.n) tryMove(sx, sy - 1);
   if (!c.s) tryMove(sx, sy + 1);
   if (!c.e) tryMove(sx + 1, sy);
   if (!c.w) tryMove(sx - 1, sy);
   
   return bestMove;
}
