import { Institute } from './engine.js';
import { Renderer } from './renderer.js';

const canvas = document.querySelector('#institute');
const game = new Institute();
const sprite = new Image();
let renderer, ready = false, map = false, motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
let lastTime = 0, lastState = '', previousStatus = '', soundEnabled = false, audio;
const held = new Set(), touches = new Set();
const ui = id => document.getElementById(id);
ui('start').disabled = true;
ui('motion').setAttribute('aria-pressed', String(!motion));
document.body.classList.toggle('reduced', !motion);

function message(text) { if (text !== previousStatus) { ui('game-status').textContent = text; previousStatus = text; } }
function clearInput() { held.clear(); touches.clear(); document.querySelectorAll('[data-control]').forEach(button => button.classList.remove('active')); }
function unlock() { if (document.pointerLockElement === canvas) document.exitPointerLock(); }
function pause() { game.pause(); clearInput(); unlock(); audio?.suspend(); }
function begin(restart = false) {
  if (!ready) return;
  if (restart) game.reset();
  game.state === 'paused' ? game.resume() : game.start();
  clearInput(); canvas.focus({ preventScroll: true });
  if (soundEnabled) audio?.resume();
  lastTime = performance.now();
}
ui('start').addEventListener('click', () => begin());
ui('resume').addEventListener('click', () => begin());
document.querySelectorAll('.restart').forEach(button => button.addEventListener('click', () => begin(true)));
ui('pause').addEventListener('click', () => game.state === 'playing' ? pause() : begin());
function toggleMap() { map = !map; ui('map').setAttribute('aria-pressed', String(map)); }
ui('map').addEventListener('click', toggleMap);
ui('motion').addEventListener('click', () => { motion = !motion; ui('motion').setAttribute('aria-pressed', String(!motion)); document.body.classList.toggle('reduced', !motion); });

function setupAudio() {
  if (audio) return;
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return;
  audio = new Audio();
  const volume = audio.createGain(); volume.gain.value = .025; volume.connect(audio.destination);
  for (const frequency of [53, 79.5]) { const oscillator = audio.createOscillator(); oscillator.frequency.value = frequency; oscillator.type = 'sine'; oscillator.connect(volume); oscillator.start(); }
}
ui('sound').addEventListener('click', () => {
  setupAudio();
  if (!audio) { message('Audio is unavailable in this browser.'); return; }
  soundEnabled = !soundEnabled;
  if (soundEnabled && game.state === 'playing') audio.resume(); else audio.suspend();
  ui('sound').textContent = soundEnabled ? 'Sound on' : 'Sound off'; ui('sound').setAttribute('aria-pressed', String(soundEnabled));
});
window.addEventListener('keydown', event => {
  if (event.target instanceof HTMLButtonElement && ['Enter', 'Space'].includes(event.code)) return;
  if (['KeyW','KeyA','KeyS','KeyD','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','ShiftLeft','ShiftRight','KeyC','KeyM','Escape','KeyP'].includes(event.code)) {
    if (game.state === 'playing') event.preventDefault();
    if (!event.repeat && event.code === 'KeyM') toggleMap();
    if (!event.repeat && ['Escape','KeyP'].includes(event.code)) { game.state === 'playing' ? pause() : game.state === 'paused' && begin(); return; }
    if (game.state === 'playing') held.add(event.code);
  }
});
window.addEventListener('keyup', event => held.delete(event.code));
window.addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement !== canvas && game.state === 'playing') pause(); });
canvas.addEventListener('click', () => {
  if (game.state === 'playing' && matchMedia('(pointer:fine)').matches && canvas.requestPointerLock) {
    try { const request = canvas.requestPointerLock(); request?.catch?.(() => message('Use arrow keys to look around.')); } catch { message('Use arrow keys to look around.'); }
  }
});
document.addEventListener('mousemove', event => { if (game.state === 'playing' && document.pointerLockElement === canvas) game.player.angle += event.movementX * .0027; });
let drag = null;
canvas.addEventListener('pointerdown', event => { if (event.pointerType !== 'mouse' && game.state === 'playing') { drag = { id: event.pointerId, x: event.clientX }; canvas.setPointerCapture(event.pointerId); } });
canvas.addEventListener('pointermove', event => { if (drag?.id === event.pointerId && game.state === 'playing') { game.player.angle += (event.clientX - drag.x) * .008; drag.x = event.clientX; } });
for (const event of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(event, () => { drag = null; });
document.querySelectorAll('[data-control]').forEach(button => {
  button.addEventListener('pointerdown', event => { if (game.state !== 'playing') return; event.preventDefault(); button.setPointerCapture(event.pointerId); touches.add(button.dataset.control); button.classList.add('active'); });
  for (const event of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(event, () => { touches.delete(button.dataset.control); button.classList.remove('active'); });
});
ui('copy-code').addEventListener('click', async () => {
  if (game.state !== 'escaped') return;
  const value = ui('reward').textContent;
  try { await navigator.clipboard.writeText(value); ui('copy-status').textContent = 'Code copied. You earned your discharge.'; }
  catch { const range = document.createRange(); range.selectNodeContents(ui('reward')); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); ui('copy-status').textContent = 'Select and copy the code above.'; }
});
function updateUI() {
  if (game.state !== lastState) {
    lastState = game.state;
    ui('overlay').hidden = game.state === 'playing';
    for (const [id, state] of [['briefing','ready'],['paused','paused'],['caught','caught'],['escaped','escaped']]) ui(id).hidden = game.state !== state;
    ui('pause').disabled = !['playing','paused'].includes(game.state);
    ui('pause').textContent = game.state === 'paused' ? 'Resume' : 'Pause';
    if (['caught','escaped'].includes(game.state)) { clearInput(); unlock(); audio?.suspend(); }
    if (game.state === 'escaped') { ui('reward').textContent = 'noahindainstitute'; ui('copy-status').textContent = ''; }
    else ui('reward').textContent = '';
    if (game.state !== 'playing') message({ ready: 'Find the exit. Avoid Noah.', paused: 'Paused. The chair waits.', caught: 'No reward. Noah made contact.', escaped: 'Escape confirmed. Your code is unlocked.' }[game.state]);
    if (game.state === 'caught') ui('caught').querySelector('button').focus({ preventScroll: true });
    if (game.state === 'escaped') ui('copy-code').focus({ preventScroll: true });
    if (game.state === 'paused') ui('resume').focus({ preventScroll: true });
  }
  ui('timer').textContent = `${String(Math.floor(game.time / 60)).padStart(2,'0')}:${String(Math.floor(game.time % 60)).padStart(2,'0')}`;
  ui('stamina-fill').style.width = `${game.stamina}%`;
  if (game.state === 'playing') {
    const distance = Math.hypot(game.player.x - game.noah.x, game.player.y - game.noah.y);
    const status = game.noah.chasing ? 'HE KNOWS.' : distance < 4 ? 'THE CHAIR IS CLOSE.' : 'KEEP MOVING.';
    ui('condition').textContent = status;
    message(game.noah.chasing ? 'Noah is following. Break line of sight.' : distance < 4 ? 'You hear the chair. Keep your distance.' : 'Find the green exit sign.');
  } else ui('condition').textContent = { ready:'AWAITING ADMISSION', paused:'ON HOLD', caught:'STAY EXTENDED', escaped:'DISCHARGED' }[game.state];
}
function frame(timestamp) {
  const dt = lastTime ? (timestamp - lastTime) / 1000 : 0; lastTime = timestamp;
  if (ready) {
    const key = (...codes) => codes.some(code => held.has(code));
    game.update(dt, {
      forward: Number(key('KeyW','ArrowUp') || touches.has('forward')) - Number(key('KeyS','ArrowDown') || touches.has('back')),
      strafe: Number(key('KeyD') || touches.has('right')) - Number(key('KeyA') || touches.has('left')),
      turn: Number(key('ArrowRight') || touches.has('turnRight')) - Number(key('ArrowLeft') || touches.has('turnLeft')),
      sprint: key('ShiftLeft','ShiftRight') || touches.has('sprint'), sneak: key('KeyC') || touches.has('sneak'),
    });
    renderer.render(game, map, motion); updateUI();
  }
  requestAnimationFrame(frame);
}
sprite.onload = () => {
  renderer = new Renderer(canvas, sprite); ready = true; ui('start').disabled = false; ui('load-status').hidden = true;
};
sprite.onerror = () => { ui('load-status').textContent = 'Could not load Noah. Reload the page to try again.'; };
sprite.src = canvas.dataset.sprite;
requestAnimationFrame(frame);
