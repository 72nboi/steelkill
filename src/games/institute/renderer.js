import { SIZE } from './engine.js';
const WALL = 64;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export class Renderer {
  constructor(canvas, sprite) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false });
    this.width = canvas.width; this.height = canvas.height; this.sprite = sprite;
    this.frame = this.ctx.createImageData(this.width, this.height); this.depth = new Float32Array(this.width);
    this.walls = Array.from({ length: 4 }, (_, type) => this.wall(type));
    this.exitSprite = this.exitDoor();
  }
  wall(type) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = WALL;
    const ctx = canvas.getContext('2d'); const image = ctx.createImageData(WALL, WALL);
    for (let y = 0; y < WALL; y++) for (let x = 0; x < WALL; x++) {
      const i = (y * WALL + x) * 4, noise = ((x * 17 + y * 47 + x * y * 3) % 19) - 9;
      let c = y > 35 ? [53, 75, 71] : [117, 124, 111];
      if (y === 35 || y === 36) c = [31, 42, 41];
      if (x % 32 === 0 || y % 16 === 0) c = c.map(v => v - 10);
      if (type === 1) {
        c = [73, 86, 81];
        if (x > 12 && x < 52 && y > 10 && y < 43) c = [12, 24, 23];
        if (x > 12 && x < 52 && y > 10 && y < 43 && (x % 8 < 2 || y === 26)) c = [108, 119, 105];
        if (x > 6 && x < 10 && y > 39 && y < 43) c = [169, 153, 98];
      }
      if (type === 2 && x > 4 && x < 60 && y > 14 && y < 35) c = [26, 35, 32];
      if (type === 3 && x % 10 < 3) c = [38, 50, 48];
      image.data[i] = clamp(c[0] + noise, 0, 255); image.data[i + 1] = clamp(c[1] + noise, 0, 255); image.data[i + 2] = clamp(c[2] + noise, 0, 255); image.data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    if (type === 2) {
      ctx.fillStyle = '#b8b8a0'; ctx.textAlign = 'center'; ctx.font = 'bold 7px monospace'; ctx.fillText('INSTITUTE', 32, 23); ctx.font = '6px monospace'; ctx.fillStyle = '#b26057'; ctx.fillText('WARD 97', 32, 31);
    }
    return ctx.getImageData(0, 0, WALL, WALL).data;
  }
  exitDoor() {
    const c = document.createElement('canvas'); c.width = 96; c.height = 144; const ctx = c.getContext('2d');
    ctx.fillStyle = '#101c19'; ctx.fillRect(2, 0, 92, 144); ctx.fillStyle = '#58665b'; ctx.fillRect(9, 28, 78, 116);
    ctx.fillStyle = '#172c28'; ctx.fillRect(22, 42, 52, 50); ctx.strokeStyle = '#899685'; ctx.lineWidth = 3; ctx.strokeRect(22, 42, 52, 50);
    ctx.fillStyle = '#90d2a0'; ctx.fillRect(6, 4, 84, 20); ctx.font = 'bold 15px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#10281d'; ctx.fillText('EXIT', 48, 19);
    ctx.fillStyle = '#aaa983'; ctx.fillRect(61, 105, 17, 4); return c;
  }
  render(game, showMap = false, motion = true) {
    const { width: w, height: h, ctx, frame } = this;
    const data = frame.data, p = game.player, ca = Math.cos(p.angle), sa = Math.sin(p.angle), fov = .66;
    const horizon = Math.floor(h * .47 + (motion ? Math.sin(game.steps * 5) * 1.8 : 0));
    for (let y = 0; y < h; y++) {
      const floor = y > horizon, row = Math.max(1, Math.abs(y - horizon));
      const distance = h * .5 / row, fog = clamp(1 - distance / 15, .055, .8);
      for (let x = 0; x < w; x++) {
        const camera = (x / w * 2 - 1) * fov;
        const fx = p.x + distance * (ca - sa * camera), fy = p.y + distance * (sa + ca * camera);
        const tx = ((fx % 1) + 1) % 1, ty = ((fy % 1) + 1) % 1;
        const joint = tx < .023 || ty < .023;
        const noise = (Math.floor(fx * 40) * 7 + Math.floor(fy * 40) * 11) & 7;
        let r = floor ? 62 : 67, g = floor ? 67 : 74, b = floor ? 57 : 67;
        if (joint) { r -= 15; g -= 15; b -= 15; }
        if (!floor && Math.floor(fx) % 3 === 0 && Math.floor(fy) % 3 === 0 && tx > .2 && tx < .8 && ty > .35 && ty < .65) { r = 170; g = 190; b = 155; }
        const i = (y * w + x) * 4;
        data[i] = (r + noise) * fog; data[i + 1] = (g + noise) * fog; data[i + 2] = (b + noise) * fog; data[i + 3] = 255;
      }
    }
    for (let x = 0; x < w; x++) {
      const camera = (x / w * 2 - 1) * fov, dx = ca - sa * camera, dy = sa + ca * camera;
      let mx = Math.floor(p.x), my = Math.floor(p.y), side = 0;
      const deltaX = Math.abs(1 / dx), deltaY = Math.abs(1 / dy), stepX = dx < 0 ? -1 : 1, stepY = dy < 0 ? -1 : 1;
      let distX = (dx < 0 ? p.x - mx : mx + 1 - p.x) * deltaX;
      let distY = (dy < 0 ? p.y - my : my + 1 - p.y) * deltaY;
      for (let steps = 0; steps < 60; steps++) {
        if (distX < distY) { distX += deltaX; mx += stepX; side = 0; } else { distY += deltaY; my += stepY; side = 1; }
        if (game.map[my]?.[mx] !== 0) break;
      }
      const distance = Math.max(.01, side ? distY - deltaY : distX - deltaX); this.depth[x] = distance;
      const height = h / distance, top = horizon - height / 2, bottom = horizon + height / 2;
      const offset = side ? p.x + distance * dx : p.y + distance * dy;
      let tx = Math.floor((offset - Math.floor(offset)) * WALL); if ((!side && dx > 0) || (side && dy < 0)) tx = WALL - tx - 1;
      const type = (mx * 7 + my * 13) % 13, tex = this.walls[type === 0 ? 2 : type < 4 ? 1 : type === 5 ? 3 : 0];
      const beam = 1 - Math.abs(x / w * 2 - 1) * .22;
      const fog = clamp((1 - distance / 15) * beam * (side ? .69 : .9), .05, 1);
      for (let y = Math.max(0, Math.floor(top)); y < Math.min(h, bottom); y++) {
        const ty = clamp(Math.floor((y - top) / height * WALL), 0, WALL - 1), ti = (ty * WALL + tx) * 4, i = (y * w + x) * 4;
        data[i] = tex[ti] * fog; data[i + 1] = tex[ti + 1] * fog; data[i + 2] = tex[ti + 2] * fog;
      }
    }
    ctx.putImageData(frame, 0, 0); ctx.imageSmoothingEnabled = false;
    const sprites = [{ ...game.exit, image: this.exitSprite, scale: .98 }, { ...game.noah, image: this.sprite, scale: 1.12 }];
    sprites.sort((a, b) => Math.hypot(b.x - p.x, b.y - p.y) - Math.hypot(a.x - p.x, a.y - p.y));
    for (const sprite of sprites) {
      if (!sprite.image || !sprite.image.width) continue;
      const rx = sprite.x - p.x, ry = sprite.y - p.y, z = rx * ca + ry * sa, lateral = -rx * sa + ry * ca;
      if (z < .12) continue;
      const height = h / z * sprite.scale, width = height * sprite.image.width / sprite.image.height;
      const screenX = w * .5 * (1 + lateral / (z * fov)), top = horizon + h / z * .5 - height;
      const left = screenX - width / 2;
      ctx.globalAlpha = clamp(1 - z / 20, .13, 1);
      for (let x = Math.max(0, Math.floor(left)); x < Math.min(w, left + width); x++) if (z < this.depth[x]) {
        const sourceX = clamp(Math.floor((x - left) / width * sprite.image.width), 0, sprite.image.width - 1);
        ctx.drawImage(sprite.image, sourceX, 0, 1, sprite.image.height, x, top, 1, height);
      }
    }
    ctx.globalAlpha = 1;
    const proximity = Math.hypot(p.x - game.noah.x, p.y - game.noah.y);
    const gradient = ctx.createRadialGradient(w / 2, h / 2, h * .15, w / 2, h / 2, w * .65);
    gradient.addColorStop(0, 'transparent'); gradient.addColorStop(1, proximity < 4 ? 'rgba(70,8,5,.75)' : 'rgba(0,0,0,.9)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#b3ba9c'; ctx.fillRect(w / 2 - 2, horizon, 4, 1); ctx.fillRect(w / 2, horizon - 2, 1, 4);
    if (showMap) this.map(game);
  }
  map(game) {
    const { ctx } = this, unit = 6, ox = 12, oy = 12;
    ctx.fillStyle = '#050908ed'; ctx.fillRect(ox - 5, oy - 5, SIZE * unit + 10, SIZE * unit + 10);
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      ctx.fillStyle = game.map[y][x] ? '#34413b' : '#a3ab8b';
      if (!game.seen.has(`${x},${y}`)) ctx.fillStyle = '#101711';
      ctx.fillRect(ox + x * unit, oy + y * unit, unit - 1, unit - 1);
    }
    if (game.seen.has(`${Math.floor(game.exit.x)},${Math.floor(game.exit.y)}`)) { ctx.fillStyle = '#7cff9a'; ctx.fillRect(ox + Math.floor(game.exit.x) * unit, oy + Math.floor(game.exit.y) * unit, unit, unit); }
    ctx.fillStyle = '#e6c777'; ctx.beginPath(); ctx.arc(ox + game.player.x * unit, oy + game.player.y * unit, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#e6c777'; ctx.beginPath(); ctx.moveTo(ox + game.player.x * unit, oy + game.player.y * unit); ctx.lineTo(ox + (game.player.x + Math.cos(game.player.angle)) * unit, oy + (game.player.y + Math.sin(game.player.angle)) * unit); ctx.stroke();
  }
}
