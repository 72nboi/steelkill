import test from 'node:test';
import assert from 'node:assert/strict';
import { Institute, makeMap, SIZE } from '../src/games/institute/engine.js';

test('the deterministic maze has sealed boundaries and a reachable exit', () => {
  const game = new Institute();
  assert.deepEqual(makeMap(), game.map);
  for (let i = 0; i < SIZE; i++) assert.ok(game.map[0][i] && game.map[SIZE - 1][i] && game.map[i][0] && game.map[i][SIZE - 1]);
  assert.ok(game.route(game.player, game.exit).length > 10);
});
test('Noah does not permanently block the only escape route', () => {
  const game = new Institute();
  game.map[Math.floor(game.noah.y)][Math.floor(game.noah.x)] = 1;
  assert.ok(game.route(game.player, game.exit).length > 0);
});
test('walking into a wall cannot cross it, including after a huge frame delay', () => {
  const game = new Institute(); game.start(); game.player.angle = Math.PI;
  for (let i = 0; i < 30; i++) game.update(100, { forward: 1, sprint: true });
  assert.ok(game.player.x >= 1.18); assert.ok(game.canStand(game.player.x, game.player.y));
});
test('paused and ready states freeze both actors and the timer', () => {
  const game = new Institute(); const before = JSON.stringify([game.player, game.noah, game.time]);
  game.update(.05, { forward: 1 }); assert.equal(JSON.stringify([game.player, game.noah, game.time]), before);
  game.start(); game.pause(); game.update(.05, { forward: 1 }); assert.equal(JSON.stringify([game.player, game.noah, game.time]), before);
  game.resume(); assert.equal(game.state, 'playing');
});
test('touching Noah loses, even when both actors are standing at the exit', () => {
  const game = new Institute(); game.start();
  game.player = { ...game.exit, angle: 0 }; game.noah = { ...game.exit, angle: 0 };
  game.update(.016); assert.equal(game.state, 'caught');
  game.update(.05); assert.equal(game.state, 'caught');
});
test('the exit awards escape only while playing and without contact', () => {
  const game = new Institute(); game.player = { ...game.exit, angle: 0 };
  game.update(.016); assert.equal(game.state, 'ready');
  game.start(); game.noah = { x: 1.5, y: 1.5, angle: 0 }; game.update(.016); assert.equal(game.state, 'escaped');
  game.reset(); assert.equal(game.state, 'ready'); assert.equal(game.time, 0); assert.equal(game.stamina, 100);
});
test('Noah sees an unobstructed player and follows a path without entering walls', () => {
  const game = new Institute(); game.start();
  const neighbor = game.route(game.noah, game.player)[0];
  game.player = { ...neighbor, angle: 0 };
  game.update(.01); assert.equal(game.noah.chasing, true);
  game.player = { x: 1.5, y: 1.5, angle: 0 };
  for (let i = 0; i < 1000 && game.state === 'playing'; i++) { game.update(.016); assert.ok(game.canStand(game.noah.x, game.noah.y, .17)); }
});
test('sprinting drains stamina and resting restores it', () => {
  const game = new Institute(); game.start(); game.update(.05, { forward: 1, sprint: true });
  const spent = game.stamina; assert.ok(spent < 100);
  game.update(.05); assert.ok(game.stamina > spent);
});
test('a complete run can escape with Noah actively patrolling and chasing', () => {
  const game = new Institute(), blocked = [];
  // Plan a detour around his starting patrol area, then restore the real maze.
  for (let y = 1; y < SIZE - 1; y++) for (let x = 1; x < SIZE - 1; x++) {
    if (!game.map[y][x] && Math.hypot(x + .5 - game.noah.x, y + .5 - game.noah.y) < 2.2) { blocked.push([x, y]); game.map[y][x] = 1; }
  }
  const path = game.route(game.player, game.exit);
  for (const [x, y] of blocked) game.map[y][x] = 0;
  assert.ok(path.length); game.start();
  for (let frames = 0; frames < 6000 && game.state === 'playing'; frames++) {
    const next = path[0]; if (!next) break;
    const dx = next.x - game.player.x, dy = next.y - game.player.y;
    if (Math.hypot(dx, dy) < .1) { path.shift(); continue; }
    game.player.angle = Math.atan2(dy, dx); game.update(1 / 60, { forward: 1 });
  }
  assert.equal(game.state, 'escaped');
});
