import { generateMaze, Cell, getShortestPath, getFleeMove } from "./maze";
import { audio } from "./audio";
import { Entity, getDirAngle, getNearest } from "./engineTypes";

export class GameEngine {
  level: number = 1;
  mode: string = "survival_rat";
  cols: number = 10;
  rows: number = 10;
  maze: Cell[][] = [];
  entities: Entity[] = [];
  cellSize: number = 40; // Virtual sizing
  active: boolean = false;

  playerInput: "UP" | "DOWN" | "LEFT" | "RIGHT" | null = null;
  singleStepInput: boolean = false;
  onGameOver: (win: boolean) => void = () => {};
  gameEnding: boolean = false;

  // Stats
  score: number = 0;
  steps: number = 0;
  multiplier: number = 1;

  getPlayerFleeAI() {
    if (this.mode === "survival_rat") return "flee_cat";
    if (this.mode === "survival_cat") return "flee_dog";
    if (this.mode === "survival_deer") return "flee_lion";
    if (this.mode === "survival_rabbit") return "flee_wolf";
    if (this.mode === "survival_bug") return "flee_frog";
    return null;
  }

  initList(l: number, m: string, d: 'easy' | 'medium' | 'hard', aspectRatio: number, onEnd: (w: boolean) => void) {
    if (l === 1) {
      this.score = d === 'easy' ? 500 : (d === 'hard' ? 0 : 0);
      this.steps = 0;
    }
    
    let difficultyMultiplier = d === 'easy' ? 0.7 : (d === 'hard' ? 1.5 : 1.0);
    this.multiplier = l * (d === 'easy' ? 0.5 : (d === 'hard' ? 2.0 : 1.0));
    
    this.level = l;
    this.mode = m;
    this.onGameOver = onEnd;
    
    // Maze complexity affected by difficulty
    let sizeMult = d === 'easy' ? 0.7 : (d === 'hard' ? 1.3 : 1.0);
    this.cols = Math.min(25, Math.floor((10 + Math.floor(l / 4)) * sizeMult));
    this.rows = Math.ceil(this.cols * (aspectRatio || 1.0));
    
    // Dynamic difficulty: as level increases, braidRate drops making the maze have more dead ends and fewer shortcuts.
    const baseBraid = d === 'easy' ? 1.0 : (d === 'hard' ? 0.4 : 0.8);
    const currentBraidRate = Math.max(0.05, baseBraid - (l * 0.02 * difficultyMultiplier));
    this.maze = generateMaze(this.cols, this.rows, currentBraidRate);

    // Gradual speed increase across levels, affected by difficulty
    let baseSpeedMult = Math.min(2.0, (0.6 + l * 0.02) * difficultyMultiplier);
    let playerSpeedMult = Math.min(1.2, 0.8 + l * 0.01); // Player speed is not penalized as much
    this.entities = [];

    // Spawn helper
    const make = (
      sp: any,
      speed: number,
      ai: any,
      isPlayer: boolean,
      startX?: number,
      startY?: number,
    ) => {
      const e: Entity = {
        id: Math.random().toString(36),
        species: sp,
        isPlayer,
        ai,
        speed: speed * (isPlayer ? playerSpeedMult : baseSpeedMult),
        x: 0,
        y: 0,
        cx: 0,
        cy: 0,
        tx: 0,
        ty: 0,
        dir: 0,
        state: "idle",
        stateTimer: 0,
      };

      if (startX !== undefined && startY !== undefined) {
        e.x = startX;
        e.y = startY;
      } else {
        // Spawn enemies near the bottom-right corner
        let attempts = 0;
        do {
          e.x = this.cols - 3 + Math.floor(Math.random() * 3);
          e.y = this.rows - 3 + Math.floor(Math.random() * 3);
          attempts++;
        } while (
          this.entities.some((o) => o.x === e.x && o.y === e.y) &&
          attempts < 100
        );
      }

      e.cx = e.x * this.cellSize;
      e.cy = e.y * this.cellSize;
      e.tx = e.x;
      e.ty = e.y;
      this.entities.push(e);
      return e;
    };

    let playerSp = "rat";
    let targetSp = "cheese"; // Goal
    let predatorSp = "cat";

    if (m === "survival_rat") {
      playerSp = "rat";
      targetSp = "cheese";
      predatorSp = "cat";
    }
    if (m === "survival_cat") {
      playerSp = "cat";
      targetSp = "milk";
      predatorSp = "dog";
    }
    if (m === "survival_deer") {
      playerSp = "deer";
      targetSp = "water";
      predatorSp = "lion";
    }
    if (m === "survival_rabbit") {
      playerSp = "rabbit";
      targetSp = "carrot";
      predatorSp = "wolf";
    }
    if (m === "survival_bug") {
      playerSp = "bug";
      targetSp = "leaf";
      predatorSp = "frog";
    }

    if (m === "hunter_cat") {
      playerSp = "cat";
      targetSp = "rat";
      predatorSp = "none";
    }
    if (m === "hunter_dog") {
      playerSp = "dog";
      targetSp = "cat";
      predatorSp = "none";
    }
    if (m === "hunter_lion") {
      playerSp = "lion";
      targetSp = "deer";
      predatorSp = "none";
    }
    if (m === "hunter_wolf") {
      playerSp = "wolf";
      targetSp = "rabbit";
      predatorSp = "none";
    }
    if (m === "hunter_frog") {
      playerSp = "frog";
      targetSp = "bug";
      predatorSp = "none";
    }

    // Adjusted speeds: Player speed increased for better pacing
    const player = make(playerSp, 7, undefined, true, 0, 0);

    if (m.startsWith("survival")) {
      // Target is an exit/cheese/milk/water
      const ch = make(
        targetSp,
        0,
        undefined,
        false,
        this.cols - 1,
        this.rows - 1,
      );
      ch.isTarget = true;

      let numPreds = 1 + Math.floor(l / 15);
      for (let i = 0; i < numPreds; i++) {
        let strat = "direct";
        if (i % 3 === 1) strat = "intercept";
        if (i % 3 === 2) strat = "flank";
        make(predatorSp, 3.5 + i * 0.1, `chase_${playerSp}:${strat}`, false);
      }
    } else if (m.startsWith("hunter")) {
      let preySpeed = 4.0 + l * 0.05; // increases slowly
      const ch = make(targetSp, preySpeed, `flee_${playerSp}`, false);
      ch.isTarget = true;
    }

    this.active = true;
  }

  placeTrap() {
    const player = this.entities.find((e) => e.isPlayer);
    if (!player) return;

    // Determine trap based on what the player is hunting OR what the player is fleeing?
    // Hunter mode: Player is predator, places trap for prey.
    // Survival mode: Player is prey, places trap for predator?
    let trapType = "";
    if (this.mode === "survival_rat") trapType = "trap_cat"; // Rat places trap for Cat
    if (this.mode === "survival_cat") trapType = "trap_dog"; // Cat for Dog
    if (this.mode === "survival_deer") trapType = "trap_lion"; // Deer for Lion
    if (this.mode === "survival_rabbit") trapType = "trap_wolf";
    if (this.mode === "survival_bug") trapType = "trap_frog";

    if (this.mode === "hunter_cat") trapType = "trap_rat"; // Cat for Rat
    if (this.mode === "hunter_dog") trapType = "trap_cat"; // Dog for Cat
    if (this.mode === "hunter_lion") trapType = "trap_deer"; // Lion for Deer
    if (this.mode === "hunter_wolf") trapType = "trap_rabbit";
    if (this.mode === "hunter_frog") trapType = "trap_bug";

    const existingTrapIndex = this.entities.findIndex(
      (e) => e.species === trapType,
    );
    if (existingTrapIndex !== -1) {
      // Pick up the trap
      this.entities.splice(existingTrapIndex, 1);
      audio.play("trap");
      return;
    }

    const trap: Entity = {
      id: Math.random().toString(36),
      species: trapType as any,
      isPlayer: false,
      x: player.x,
      y: player.y,
      cx: player.x * this.cellSize,
      cy: player.y * this.cellSize,
      tx: player.x,
      ty: player.y,
      dir: 0,
      speed: 0,
      state: "idle",
      stateTimer: 4.0,
    };
    this.entities.push(trap);
    audio.play("trap");
  }

  update(dt: number) {
    if (!this.active) return;

    // Process movement for all entities
    for (const e of this.entities) {
      if (e.species.includes("trap") && e.state === "idle" && this.mode.startsWith("survival")) {
        e.stateTimer -= dt;
        if (e.stateTimer <= 0) {
          e.state = "dead";
          continue;
        }
      }

      if (
        e.state === "caught" ||
        e.state === "eating" ||
        e.state === "catching"
      ) {
        e.stateTimer -= dt;
        if (e.stateTimer <= 0) {
          if (e.state === "caught" && e.species.includes("trap")) {
            // Remove trap after 4 seconds
            e.state = "dead";
          } else if (e.state === "eating" && !e.species.includes("trap")) {
            e.state = "idle"; // Resume hunting/fleeing after trap duration is over
          }
        }
        continue; // Wait until animation done
      }

      if (e.isPlayer && !e.speed) continue; // Cheese doesn't move

      // Allow instant reversal processing
      if (e.isPlayer && this.playerInput && (e.x !== e.tx || e.y !== e.ty)) {
        let reversed = false;
        if (e.tx > e.x && this.playerInput === "LEFT") reversed = true;
        if (e.tx < e.x && this.playerInput === "RIGHT") reversed = true;
        if (e.ty > e.y && this.playerInput === "UP") reversed = true;
        if (e.ty < e.y && this.playerInput === "DOWN") reversed = true;
        if (reversed) {
          const oldX = e.x;
          const oldY = e.y;
          e.x = e.tx;
          e.y = e.ty;
          e.tx = oldX;
          e.ty = oldY;
          e.dir = getDirAngle(e.tx - e.x, e.ty - e.y);
          if (this.singleStepInput) {
            this.playerInput = null;
            this.singleStepInput = false;
          }
        }
      }

      // If finished moving to target, snap and decide next
      if (e.x !== e.tx || e.y !== e.ty) {
        e.state = "moving";
        const tCX = e.tx * this.cellSize;
        const tCY = e.ty * this.cellSize;
        const dx = tCX - e.cx;
        const dy = tCY - e.cy;
        const dist = Math.hypot(dx, dy);
        const step = e.speed * this.cellSize * dt;

        if (dist < 0.1 || step >= dist) {
          e.cx = tCX;
          e.cy = tCY;
          e.x = e.tx;
          e.y = e.ty;
          e.state = "idle";
        } else {
          e.cx += (dx / dist) * step;
          e.cy += (dy / dist) * step;
        }
      }

      // Decide next move if idle
      if (e.state === "idle" && e.speed > 0) {
        if (e.isPlayer) {
          if (this.playerInput) {
            const c = this.maze[e.y][e.x];
            let nx = e.x;
            let ny = e.y;
            let moved = false;

            if (this.playerInput === "UP" && !c.n && ny > 0) {
              ny--;
              moved = true;
            } else if (this.playerInput === "DOWN" && !c.s && ny < this.rows - 1) {
              ny++;
              moved = true;
            } else if (this.playerInput === "LEFT" && !c.w && nx > 0) {
              nx--;
              moved = true;
            } else if (this.playerInput === "RIGHT" && !c.e && nx < this.cols - 1) {
              nx++;
              moved = true;
            }

            if (this.singleStepInput) {
               this.playerInput = null;
               this.singleStepInput = false;
            }

            // Input smoothing: if desired direction is blocked, try to keep moving in previous direction.
            // This prevents getting stuck on walls due to slight joystick inaccuracies, and allows pre-turning.
            if (!moved) {
              const eps = 0.1;
              let fallback: string | null = null;
              if (Math.abs(e.dir - 0) < eps) fallback = "UP";
              else if (Math.abs(e.dir - Math.PI / 2) < eps) fallback = "RIGHT";
              else if (
                Math.abs(e.dir - Math.PI) < eps ||
                Math.abs(e.dir - -Math.PI) < eps
              )
                fallback = "DOWN";
              else if (Math.abs(e.dir - -Math.PI / 2) < eps) fallback = "LEFT";

              if (fallback === "UP" && !c.n && e.y > 0) ny--;
              else if (fallback === "DOWN" && !c.s && e.y < this.rows - 1) ny++;
              else if (fallback === "LEFT" && !c.w && e.x > 0) nx--;
              else if (fallback === "RIGHT" && !c.e && e.x < this.cols - 1) nx++;
            }

            if (nx !== e.x || ny !== e.y) {
              e.tx = nx;
              e.ty = ny;
              e.dir = getDirAngle(nx - e.x, ny - e.y);
              e.state = "moving";
              if (e.isPlayer) {
                this.steps++;
                this.score += 10 * this.multiplier;
              }
            }
          }
        } else {
          // AI
          const currentAi = e.ai;
          
          if (currentAi && currentAi.startsWith("chase_")) {
            const [targetSpecies, strat] = currentAi.replace("chase_", "").split(":");
            const target = getNearest(this.entities, targetSpecies, e.x, e.y);
            if (target) {
              let path: any[] = [];
              let pX = target.tx;
              let pY = target.ty;
              let pDirX = target.tx - target.x;
              let pDirY = target.ty - target.y;

              if (pDirX === 0 && pDirY === 0 && this.playerInput) {
                if (this.playerInput === "UP") pDirY = -1;
                if (this.playerInput === "DOWN") pDirY = 1;
                if (this.playerInput === "LEFT") pDirX = -1;
                if (this.playerInput === "RIGHT") pDirX = 1;
              }

              let directPath = getShortestPath(this.maze, e.x, e.y, target.tx, target.ty);
              
              // If we are very close to the target, just go directly for it.
              // This prevents predators from making inefficient "flanking" detours 
              // or running away to an intercept point when they could just attack.
              if (directPath.length > 0 && directPath.length <= 4) {
                 path = directPath;
              } else if (strat === "intercept" || (!strat && Math.random() < 0.6)) {
                // intercept: project player 3-4 tiles ahead
                for (let i = 0; i < 4; i++) {
                  if (pX < 0 || pX >= this.cols || pY < 0 || pY >= this.rows) break;
                  const c = this.maze[pY][pX];
                  if (pDirX === 1 && !c.e) pX++;
                  else if (pDirX === -1 && !c.w) pX--;
                  else if (pDirY === 1 && !c.s) pY++;
                  else if (pDirY === -1 && !c.n) pY--;
                  else break;
                }
                path = getShortestPath(this.maze, e.x, e.y, pX, pY);
              } else if (strat === "flank") {
                // flank: project 2 tiles ahead, then turn perpendicular if possible
                for (let i = 0; i < 2; i++) {
                  if (pX < 0 || pX >= this.cols || pY < 0 || pY >= this.rows) break;
                  const c = this.maze[pY][pX];
                  if (pDirX === 1 && !c.e) pX++;
                  else if (pDirX === -1 && !c.w) pX--;
                  else if (pDirY === 1 && !c.s) pY++;
                  else if (pDirY === -1 && !c.n) pY--;
                  else break;
                }
                const c = this.maze[pY][pX];
                if (pDirX !== 0) { // moving horiz, try to offset vert
                   if (!c.n) pY--;
                   else if (!c.s) pY++;
                } else if (pDirY !== 0) {
                   if (!c.e) pX++;
                   else if (!c.w) pX--;
                }
                path = getShortestPath(this.maze, e.x, e.y, pX, pY);
              }

              if (path.length === 0) {
                // strict shortest path or fallback
                path = directPath.length > 0 ? directPath : getShortestPath(this.maze, e.x, e.y, target.x, target.y);
              }

              if (path.length > 0) {
                e.tx = path[0].x;
                e.ty = path[0].y;
                e.dir = getDirAngle(e.tx - e.x, e.ty - e.y);
                e.state = "moving";
              }
            }
          } else if (currentAi && currentAi.startsWith("flee_")) {
            const threatSpecies = currentAi.replace("flee_", "");
            const threat = getNearest(this.entities, threatSpecies, e.x, e.y);
            if (threat) {
              const move = getFleeMove(this.maze, e.x, e.y, threat.x, threat.y);
              if (move) {
                e.tx = move.x;
                e.ty = move.y;
                e.dir = getDirAngle(e.tx - e.x, e.ty - e.y);
                e.state = "moving";
              }
            }
          } else if (currentAi === "random") {
            const c = this.maze[e.y][e.x];
            const avail = [];
            if (!c.n) avail.push({ x: e.x, y: e.y - 1 });
            if (!c.s) avail.push({ x: e.x, y: e.y + 1 });
            if (!c.e) avail.push({ x: e.x + 1, y: e.y });
            if (!c.w) avail.push({ x: e.x - 1, y: e.y });

            if (avail.length > 0) {
              const choice = avail[Math.floor(Math.random() * avail.length)];
              e.tx = choice.x;
              e.ty = choice.y;
              e.dir = getDirAngle(e.tx - e.x, e.ty - e.y);
              e.state = "moving";
            }
          }
        }
      }

      // Check heartbeat for player
      if (e.isPlayer && this.mode.startsWith("survival")) {
        let predType = "cat";
        if (this.mode === "survival_cat") predType = "dog";
        if (this.mode === "survival_deer") predType = "lion";
        if (this.mode === "survival_rabbit") predType = "wolf";
        if (this.mode === "survival_bug") predType = "frog";

        const pred = getNearest(this.entities, predType, e.x, e.y);
        if (pred) {
          const d = Math.abs(pred.x - e.x) + Math.abs(pred.y - e.y);
          if (d <= 3 && Math.random() < dt * 2) {
            audio.play("heartbeat");
          }
        }
      }
    }

    // Check overlaps
    for (let i = 0; i < this.entities.length; i++) {
      for (let j = i + 1; j < this.entities.length; j++) {
        const a = this.entities[i];
        const b = this.entities[j];
        if (
          ["dead", "caught"].includes(a.state) ||
          ["dead", "caught"].includes(b.state)
        )
          continue;
        
        const dx = a.cx - b.cx;
        const dy = a.cy - b.cy;
        const distSq = dx * dx + dy * dy;
        const threshold = (this.cellSize * 0.65) * (this.cellSize * 0.65);
        if (distSq < threshold) {
          this.handleCollision(a, b);
        }
      }
    }

    this.entities = this.entities.filter((e) => e.state !== "dead");
  }

  handleCollision(a: Entity, b: Entity) {
    if (this.gameEnding) return;

    // Check for traps first
    if (a.species === "trap_" + b.species) {
      a.state = "caught"; // Remove trap
      a.stateTimer = 4.0;
      b.state = "eating"; // Get trapped
      b.stateTimer = 4.0;
      return;
    }
    if (b.species === "trap_" + a.species) {
      b.state = "caught";
      b.stateTimer = 4.0;
      a.state = "eating";
      a.stateTimer = 4.0;
      return;
    }

    const isPlayerInvolved = a.isPlayer || b.isPlayer;
    if (!isPlayerInvolved) return; // Ignore AI vs AI (mostly)

    const player = a.isPlayer ? a : b;
    const other = a.isPlayer ? b : a;

    if (this.mode.startsWith("survival")) {
      let isGoal = false;
      if (this.mode === "survival_rat" && other.species === "cheese")
        isGoal = true;
      if (this.mode === "survival_cat" && other.species === "milk")
        isGoal = true;
      if (this.mode === "survival_deer" && other.species === "water")
        isGoal = true;
      if (this.mode === "survival_rabbit" && other.species === "carrot")
        isGoal = true;
      if (this.mode === "survival_bug" && other.species === "leaf")
        isGoal = true;

      if (isGoal) {
        // WIN! Reached goal
        this.gameEnding = true;
        this.score += 1000 * this.multiplier;
        player.state = "eating";
        player.stateTimer = 0.5;
        other.state = "caught";
        audio.play("ding");
        audio.play("win");
        this.active = false;
        this.onGameOver(true);
      } else if (other.ai?.startsWith(`chase_${player.species}`)) {
        // LOSE! Caught by predator
        this.gameEnding = true;
        other.state = "catching";
        other.stateTimer = 0.5;
        player.state = "caught";
        audio.play("caught");
        setTimeout(() => {
          audio.play("lose");
          this.active = false;
          this.onGameOver(false);
        }, 500);
      }
    } else if (this.mode.startsWith("hunter")) {
      // Hunter mode - catching prey
      if (
        other.ai === `flee_${player.species}` ||
        other.species === this.mode.replace("hunter_", "")
      ) {
        // WIN! Caught prey
        this.gameEnding = true;
        this.score += 1000 * this.multiplier;
        player.state = "catching";
        player.stateTimer = 0.5;
        other.state = "caught";
        audio.play("ding");
        audio.play("win");
        this.active = false;
        this.onGameOver(true);
      } else if (other.ai?.startsWith(`chase_${player.species}`)) {
        // LOSE! If we had larger predators
        this.gameEnding = true;
        other.state = "catching";
        other.stateTimer = 0.5;
        player.state = "caught";
        audio.play("caught");
        setTimeout(() => {
          audio.play("lose");
          this.active = false;
          this.onGameOver(false);
        }, 500);
      }
    }
  }
}
