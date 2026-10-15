const cv = document.getElementById("game"), ctx = cv.getContext("2d");
const W = cv.width, H = cv.height, GROUND = H - 60;

// ---------- Settings ----------
const GRAVITY = 1500, FLAP = -430, SPEED = 150, GAP = 175, PIPE_W = 60, SPAWN = 1.5;
let best = 0;
try { best = +localStorage.getItem("flappydino-best") || 0; } catch (e) {}

// ---------- Colors: araw at gabi (feature/design) ----------
let night = 0; // 0 = araw, 1 = gabi
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => { const x = hex(a), y = hex(b); return "rgb(" + x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(",") + ")"; };
const colors = () => ({
  bg: mix("#bfe3ff", "#161c38", night),      // langit
  fg: mix("#535353", "#f0f0f0", night),      // dino
  cactus: mix("#3f8f4f", "#5cc27a", night),
  ground: mix("#8a6d3b", "#c9b27c", night),
  hill: mix("#a5c9e8", "#262e5a", night),
  cloud: mix("#ffffff", "#3a4468", night),
  text: mix("#23364a", "#ffffff", night),
});
const clouds = [{ x: 40, y: 80, s: 18 }, { x: 220, y: 150, s: 12 }, { x: 330, y: 40, s: 24 }, { x: 120, y: 230, s: 15 }];
const stars = Array.from({ length: 28 }, (_, i) => ({ x: (i * 97) % W, y: (i * 53) % (GROUND - 120) + 10, r: 1 + (i % 3) }));

// ---------- Dino sprite (feature/dino) ----------
const SPRITE = [
  "..........#######..",
  ".........##.######.",
  ".........#########.",
  ".........#########.",
  ".........####......",
  ".........#######...",
  "#.......####.......",
  "#.....########.....",
  "##...###########...",
  "###.############...",
  "#################..",
  ".################..",
  "..##############...",
  "...############....",
  "....#########......",
];
const LEGS = [
  [".....###..##.......", ".....##...##.......", ".....#....#........"],
  [".....##..###.......", ".....##...#........", ".....#....##......."],
];
const P = 3, DW = 19 * P, DH = 18 * P;
function drawDino(x, y, frame, tilt) {
  const { fg, bg } = colors();
  ctx.save();
  ctx.translate(x + DW / 2, y + DH / 2); ctx.rotate(tilt); ctx.translate(-DW / 2, -DH / 2);
  ctx.fillStyle = fg;
  [...SPRITE, ...LEGS[frame]].forEach((row, r) => [...row].forEach((c, k) => { if (c === "#") ctx.fillRect(k * P, r * P, P, P); }));
  // wing (flaps up/down)
  ctx.fillStyle = bg; ctx.fillRect(7 * P, (frame ? 8 : 10) * P, 4 * P, P);
  ctx.fillStyle = fg; ctx.fillRect(5 * P, (frame ? 6 : 11) * P, 5 * P, 2 * P);
  ctx.restore();
}

// ---------- State ----------
let state = "ready", dino, pipes, score, timer, t = 0, last = performance.now();
function reset() {
  dino = { x: 90, y: H / 2 - DH, vy: 0 };
  pipes = []; score = 0; timer = SPAWN - 0.4;
}
reset();

function flap() {
  if (state === "over") { if (t > 0.35) { reset(); state = "ready"; } return; }
  if (state === "ready") state = "playing";
  dino.vy = FLAP;
}
addEventListener("keydown", e => { if (["Space", "ArrowUp", "KeyW"].includes(e.code)) { e.preventDefault(); if (!e.repeat) flap(); } });
cv.addEventListener("pointerdown", e => { e.preventDefault(); flap(); });

// ---------- Pipes / cactus pillars (feature/pipes) ----------
function spawnPipe() {
  const top = 70 + Math.random() * (GROUND - GAP - 140);
  pipes.push({ x: W + 10, top, passed: false });
}
function drawPillar(x, y, h, flip) {
  ctx.fillStyle = colors().cactus;
  ctx.fillRect(x, y, PIPE_W, h);
  // cactus arms
  for (let i = 1; i < Math.floor(h / 70) + 1; i++) {
    const ay = flip ? y + h - i * 60 : y + i * 60 - 30;
    if (ay < y || ay > y + h - 12) continue;
    ctx.fillRect(x - 14, ay, 14, 8); ctx.fillRect(x - 14, ay - 18, 8, 26);
    ctx.fillRect(x + PIPE_W, ay + 14, 14, 8); ctx.fillRect(x + PIPE_W + 6, ay - 4, 8, 26);
  }
}

// ---------- Collision (feature/collision) ----------
function hits() {
  const a = { x: dino.x + 10, y: dino.y + 8, w: DW - 22, h: DH - 16 };
  if (a.y + a.h >= GROUND) return true;
  return pipes.some(p => a.x < p.x + PIPE_W && a.x + a.w > p.x && (a.y < p.top || a.y + a.h > p.top + GAP));
}

// ---------- Update / draw loop ----------
function update(dt) {
  t += dt;
  night += ((Math.floor(score / 10) % 2) - night) * Math.min(1, dt * 1.5);
  clouds.forEach(c => { c.x -= c.s * dt; if (c.x < -80) { c.x = W + 20; c.y = 40 + Math.random() * 180; } });
  if (state !== "playing") { if (state === "ready") dino.y = H / 2 - DH + Math.sin(t * 4) * 8; return; }
  dino.vy += GRAVITY * dt; dino.y += dino.vy * dt;
  if (dino.y < 0) { dino.y = 0; dino.vy = 0; }
  timer += dt; if (timer >= SPAWN) { timer = 0; spawnPipe(); }
  pipes.forEach(p => { p.x -= SPEED * dt; if (!p.passed && p.x + PIPE_W < dino.x) { p.passed = true; score++; } });
  pipes = pipes.filter(p => p.x > -PIPE_W - 20);
  if (hits()) {
    state = "over"; t = 0;
    if (score > best) { best = score; try { localStorage.setItem("flappydino-best", best); } catch (e) {} }
  }
}
function text(s, x, y, size, align = "center") {
  ctx.fillStyle = colors().text; ctx.font = `bold ${size}px "Courier New", monospace`; ctx.textAlign = align; ctx.fillText(s, x, y);
}
function cloud(x, y) { ctx.fillRect(x, y + 12, 60, 14); ctx.fillRect(x + 10, y + 4, 36, 12); ctx.fillRect(x + 22, y, 18, 8); }
function draw() {
  const c = colors();
  ctx.fillStyle = c.bg; ctx.fillRect(0, 0, W, H);
  // bituin (lumalabas sa gabi)
  ctx.fillStyle = "#fff"; ctx.globalAlpha = night;
  stars.forEach(st => ctx.fillRect(st.x, st.y, st.r, st.r));
  // araw -> buwan
  ctx.globalAlpha = 1 - night; ctx.fillStyle = "#ffd54a"; ctx.beginPath(); ctx.arc(330, 100, 26, 0, 7); ctx.fill();
  ctx.globalAlpha = night; ctx.fillStyle = "#f4f1de"; ctx.beginPath(); ctx.arc(330, 100, 24, 0, 7); ctx.fill();
  ctx.fillStyle = c.bg; ctx.beginPath(); ctx.arc(340, 94, 20, 0, 7); ctx.fill();
  ctx.globalAlpha = 1;
  // bundok
  ctx.fillStyle = c.hill;
  ctx.beginPath(); ctx.moveTo(0, GROUND); ctx.lineTo(70, GROUND - 90); ctx.lineTo(140, GROUND); ctx.lineTo(220, GROUND - 130); ctx.lineTo(310, GROUND); ctx.lineTo(370, GROUND - 70); ctx.lineTo(W, GROUND); ctx.fill();
  // ulap
  ctx.fillStyle = c.cloud; clouds.forEach(cl => cloud(cl.x, cl.y));
  // lupa
  ctx.fillStyle = c.ground; ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = c.fg; ctx.fillRect(0, GROUND, W, 3);
  ctx.fillStyle = c.cactus;
  for (let i = 0; i < 14; i++) ctx.fillRect(((i * 57 - t * SPEED * (state === "playing" ? 1 : 0)) % (W + 40) + W + 40) % (W + 40) - 20, GROUND + 16 + (i % 3) * 12, 8 + (i % 2) * 6, 3);
  pipes.forEach(p => { drawPillar(p.x, 0, p.top, true); drawPillar(p.x, p.top + GAP, GROUND - p.top - GAP, false); });
  drawDino(dino.x, dino.y, Math.abs(Math.floor(t * 10)) % 2, Math.max(-0.4, Math.min(0.8, dino.vy / 700)));
  text(String(score), W / 2, 70, 44);
  text("HI " + best, W - 14, 28, 16, "right");
  if (state === "ready") { text("FLAPPY DINO", W / 2, 200, 32); text("Press Space or tap", W / 2, 240, 16); }
  if (state === "over") { text("GAME OVER", W / 2, 250, 36); text("Score " + score + "  Best " + best, W / 2, 290, 18); text("Tap / Space to retry", W / 2, 325, 16); }
}
function loop(now) {
  const dt = Math.max(0, Math.min(0.033, (now - last) / 1000)); last = now;
  update(dt); draw(); requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
