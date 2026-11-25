// Deterministic simulation, independent of the renderer and browser controls.
export const SIZE = 19;
export function makeMap() {
  const cells = Array.from({ length: SIZE }, () => Array(SIZE).fill(1));
  let seed = 970719;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  function carve(x, y) {
    cells[y][x] = 0;
    const directions = [[2, 0], [-2, 0], [0, 2], [0, -2]];
    for (let i = directions.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [directions[i], directions[j]] = [directions[j], directions[i]]; }
    for (const [dx, dy] of directions) {
      const nx = x + dx, ny = y + dy;
      if (nx > 0 && ny > 0 && nx < SIZE - 1 && ny < SIZE - 1 && cells[ny][nx]) { cells[y + dy / 2][x + dx / 2] = 0; carve(nx, ny); }
    }
  }
  carve(1, 1);
  // Open extra connections: the chair must never be an unavoidable corridor gate.
  for (let i = 0; i < 34; i++) {
    const candidates = [];
    for (let y = 1; y < SIZE - 1; y++) for (let x = 1; x < SIZE - 1; x++) {
      if (cells[y][x] && ((!cells[y][x - 1] && !cells[y][x + 1]) || (!cells[y - 1][x] && !cells[y + 1][x]))) candidates.push([x, y]);
    }
    if (candidates.length) { const [x, y] = candidates[Math.floor(random() * candidates.length)]; cells[y][x] = 0; }
  }
  return cells;
}

export class Institute {
  constructor() { this.reset(); }
  reset() {
    this.map = makeMap(); this.player = { x: 1.5, y: 1.5, angle: 0 };
    this.exit = { x: 17.5, y: 17.5 }; this.noah = { x: 11.5, y: 11.5, angle: 0, chasing: false };
    this.state = 'ready'; this.time = 0; this.stamina = 100; this.steps = 0; this.pathTimer = 0; this.path = [];
    this.seen = new Set(); this.lastKnown = null; this.patrol = 0;
    this.patrolPoints = [[11, 11], [17, 13], [5, 15], [9, 5]];
    const spawn = this.nearestOpen(11, 11); this.noah.x = spawn[0] + .5; this.noah.y = spawn[1] + .5;
    this.reveal();
  }
  start() { if (this.state === 'ready') this.state = 'playing'; }
  pause() { if (this.state === 'playing') this.state = 'paused'; }
  resume() { if (this.state === 'paused') this.state = 'playing'; }
  open(x, y) { return this.map[Math.floor(y)]?.[Math.floor(x)] === 0; }
  nearestOpen(x, y) {
    for (let r = 0; r < SIZE; r++) for (let j = Math.max(1, y - r); j <= Math.min(SIZE - 2, y + r); j++) for (let i = Math.max(1, x - r); i <= Math.min(SIZE - 2, x + r); i++) if (!this.map[j][i]) return [i, j];
    return [1, 1];
  }
  canStand(x, y, radius = .19) { return [[-radius, -radius], [radius, -radius], [-radius, radius], [radius, radius]].every(([dx, dy]) => this.open(x + dx, y + dy)); }
  move(actor, dx, dy, radius = .19) {
    if (this.canStand(actor.x + dx, actor.y, radius)) actor.x += dx;
    if (this.canStand(actor.x, actor.y + dy, radius)) actor.y += dy;
  }
  lineOfSight(a, b) {
    const distance = Math.hypot(a.x - b.x, a.y - b.y), steps = Math.ceil(distance / .08);
    for (let i = 1; i <= steps; i++) if (!this.open(a.x + (b.x - a.x) * i / steps, a.y + (b.y - a.y) * i / steps)) return false;
    return true;
  }
  route(from, to) {
    const start = [Math.floor(from.x), Math.floor(from.y)], goal = this.nearestOpen(Math.floor(to.x), Math.floor(to.y));
    const queue = [start], previous = new Map([[start.join(','), null]]);
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i]; if (x === goal[0] && y === goal[1]) break;
      for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        const next = [x + dx, y + dy], key = next.join(',');
        if (this.open(next[0] + .5, next[1] + .5) && !previous.has(key)) { previous.set(key, [x, y]); queue.push(next); }
      }
    }
    if (!previous.has(goal.join(','))) return [];
    const path = []; let cell = goal;
    while (cell && cell.join(',') !== start.join(',')) { path.push({ x: cell[0] + .5, y: cell[1] + .5 }); cell = previous.get(cell.join(',')); }
    return path.reverse();
  }
  reveal() {
    const px = Math.floor(this.player.x), py = Math.floor(this.player.y);
    for (let y = py - 2; y <= py + 2; y++) for (let x = px - 2; x <= px + 2; x++) if (x >= 0 && y >= 0 && x < SIZE && y < SIZE) this.seen.add(`${x},${y}`);
  }
  update(dt, input = {}) {
    if (this.state !== 'playing') return;
    dt = Math.max(0, Math.min(dt, .05)); this.time += dt;
    this.player.angle += (input.turn || 0) * dt * 2.1;
    const moving = !!(input.forward || input.strafe), sprint = input.sprint && moving && this.stamina > 1;
    const speed = input.sneak ? .95 : sprint ? 3.25 : 2.05;
    this.stamina = Math.max(0, Math.min(100, this.stamina + (sprint ? -28 : 17) * dt));
    let forward = input.forward || 0, strafe = input.strafe || 0;
    const length = Math.hypot(forward, strafe); if (length > 1) { forward /= length; strafe /= length; }
    const ca = Math.cos(this.player.angle), sa = Math.sin(this.player.angle);
    this.move(this.player, (ca * forward - sa * strafe) * speed * dt, (sa * forward + ca * strafe) * speed * dt);
    if (moving) this.steps += dt * speed;
    this.reveal();
    const distance = Math.hypot(this.player.x - this.noah.x, this.player.y - this.noah.y);
    const visible = distance < 8 && this.lineOfSight(this.noah, this.player);
    const heard = moving && !input.sneak && distance < (sprint ? 6 : 2.5) && this.route(this.noah, this.player).length < (sprint ? 9 : 4);
    if (visible || heard) { this.lastKnown = { ...this.player }; this.noah.chasing = true; }
    this.pathTimer -= dt;
    if (this.pathTimer <= 0) {
      this.pathTimer = .65;
      const target = this.lastKnown || { x: this.patrolPoints[this.patrol][0] + .5, y: this.patrolPoints[this.patrol][1] + .5 };
      this.path = this.route(this.noah, target);
      if (this.path.length === 0) {
        this.lastKnown = null; this.noah.chasing = false; this.patrol = (this.patrol + 1) % this.patrolPoints.length;
      }
    }
    const target = this.path[0];
    if (target) {
      const dx = target.x - this.noah.x, dy = target.y - this.noah.y, remaining = Math.hypot(dx, dy);
      const step = Math.min(remaining, dt * (this.noah.chasing ? 1.55 : .72));
      this.noah.angle = Math.atan2(dy, dx);
      if (remaining > .001) this.move(this.noah, dx / remaining * step, dy / remaining * step, .18);
      if (remaining < .08) this.path.shift();
    }
    // Contact takes precedence over escape; no reward for reaching the door while caught.
    if (Math.hypot(this.player.x - this.noah.x, this.player.y - this.noah.y) < .48 && this.lineOfSight(this.player, this.noah)) this.state = 'caught';
    else if (Math.hypot(this.player.x - this.exit.x, this.player.y - this.exit.y) < .62) this.state = 'escaped';
  }
}
