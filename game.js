const cv = document.getElementById("game"), ctx = cv.getContext("2d");
const W = cv.width, H = cv.height, GROUND = H - 60;

// ---------- Settings ----------
const GRAVITY = 1500, FLAP = -430, SPEED = 150, GAP = 175, PIPE_W = 60, SPAWN = 1.5;
let best = 0;
try { best = +localStorage.getItem("flappydino-best") || 0; } catch (e) {}

// ---------- Colors (follows light/dark mode) ----------
const dark = matchMedia("(prefers-color-scheme: dark)");
const colors = () => dark.matches ? { bg: "#202124", fg: "#d0d0d0" } : { bg: "#f7f7f7", fg: "#535353" };

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
  ctx.fillStyle = colors().fg;
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
  ctx.fillStyle = colors().fg; ctx.font = `bold ${size}px "Courier New", monospace`; ctx.textAlign = align; ctx.fillText(s, x, y);
}
function draw() {
  const { bg, fg } = colors();
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  // ground
  ctx.fillStyle = fg; ctx.fillRect(0, GROUND, W, 2);
  for (let i = 0; i < 14; i++) ctx.fillRect(((i * 57 - t * SPEED * (state === "playing" ? 1 : 0)) % (W + 40) + W + 40) % (W + 40) - 20, GROUND + 14 + (i % 3) * 12, 8 + (i % 2) * 6, 2);
  pipes.forEach(p => { drawPillar(p.x, 0, p.top, true); drawPillar(p.x, p.top + GAP, GROUND - p.top - GAP, false); });
  drawDino(dino.x, dino.y, Math.floor(t * 10) % 2, Math.max(-0.4, Math.min(0.8, dino.vy / 700)));
  text(String(score), W / 2, 70, 44);
  text("HI " + best, W - 14, 28, 16, "right");
  if (state === "ready") { text("FLAPPY DINO", W / 2, 200, 32); text("Press Space or tap", W / 2, 240, 16); }
  if (state === "over") { text("GAME OVER", W / 2, 250, 36); text("Score " + score + "  Best " + best, W / 2, 290, 18); text("Tap / Space to retry", W / 2, 325, 16); }
}
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000); last = now;
  update(dt); draw(); requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
