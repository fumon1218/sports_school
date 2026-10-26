import * as THREE from '../vendor/three/three.module.js';
import { GLTFLoader } from '../vendor/three/addons/loaders/GLTFLoader.js';
import { CONFIG, INFO, SPORTS, BUILDINGS, STATIONS, DECOR, CHERRY, GREEN, GATE, WORLD, CAMPUS, NATURE, LAKE, MAP, PLAYER_START, GUIDE_POS } from './config.js';
import * as P from './placeholders.js';

const $ = (s) => document.querySelector(s);
const store = {
  get(k, d) { try { const v = localStorage.getItem('ssw_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('ssw_' + k, JSON.stringify(v)); } catch (e) { /* 저장이 안 되어도 계속 진행 */ } },
};
const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const settings = { easy: store.get('easy', true), calm: store.get('calm', prefersReduced), avatar: store.get('avatar', 'boy') };
const medals = store.get('medals', {});
const flags = store.get('flags', {});
const sportById = Object.fromEntries(SPORTS.map((s) => [s.id, s]));

document.title = CONFIG.title;
$('#title-h').textContent = CONFIG.title;
$('#title-sub').textContent = CONFIG.subtitle;

/* ---------- three 기본 ---------- */
const canvas = $('#world');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const coarse = matchMedia('(pointer: coarse)').matches;
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, coarse ? 1.75 : 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const SKY = 0xcfeaff;
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 80, 170);
const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 400);
scene.add(new THREE.HemisphereLight(0xffffff, 0xb9d9a8, 1.35));
const sun = new THREE.DirectionalLight(0xfff3dc, 2.0);
sun.castShadow = true;
sun.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 5, far: 130 });
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);

/* ---------- 모델 불러오기·맞추기 ---------- */
const gltfLoader = new GLTFLoader();
const modelCache = new Map();
const loadedOk = []; const loadedFail = [];
function loadModel(file) {
  if (!modelCache.has(file)) {
    modelCache.set(file, gltfLoader.loadAsync(`assets/models/${file}`).then((g) => { loadedOk.push(file); return g.scene; }).catch(() => { loadedFail.push(file); return null; }));
  }
  return modelCache.get(file);
}
// 모델을 size(가장 긴 변)에 맞추고 바닥을 y=0, 가운데를 원점에 둡니다.
function fitModel(src, size, rotY = 0) {
  const inner = src.clone(true);
  const bb = new THREE.Box3().setFromObject(inner), sz = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
  const s = size / Math.max(sz.x, sz.y, sz.z);
  inner.scale.multiplyScalar(s);
  inner.position.set(-c.x * s, -bb.min.y * s, -c.z * s);
  inner.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const g = new THREE.Group(); g.add(inner); g.rotation.y = THREE.MathUtils.degToRad(rotY);
  return g;
}
// 자리를 만들고 임시 도형을 넣은 뒤, 모델이 준비되면 바꿔 넣습니다.
function place(cfg, fallbackFn) {
  const holder = new THREE.Group(); holder.position.set(cfg.x, cfg.y || 0, cfg.z); scene.add(holder);
  const ph = fallbackFn ? fallbackFn(cfg) : null; if (ph) holder.add(ph);
  loadModel(cfg.model).then((src) => { if (!src) return; if (ph) holder.remove(ph); holder.add(fitModel(src, cfg.size, cfg.rotY)); });
  return holder;
}
const footprint = (c) => { const swap = Math.abs((c.rotY || 0) % 180) === 90; const w = c.size * c.dim[0], d = c.size * c.dim[2]; return { w: swap ? d : w, d: swap ? w : d, h: c.size * c.dim[1] }; };
const blockFallback = (c) => { const f = footprint(c); return P.buildBlock({ w: f.w, d: f.d, h: Math.max(f.h, 2), color: c.color || 0xe3e6ee }); };

/* ---------- 충돌 ---------- */
const boxes = []; const circles = [];
const addBox = (x, z, w, d, extra = {}) => boxes.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, ...extra });

/* ---------- 땅, 광장, 길 ---------- */
(function ground() {
  const g = new THREE.Mesh(new THREE.PlaneGeometry(420, 380), P.mat(0xa9dc98, { flatShading: false }));
  g.rotation.x = -Math.PI / 2; g.receiveShadow = true; scene.add(g);
  const flat = (geo, color, x, z, y, basic) => { const m = new THREE.Mesh(geo, basic ? new THREE.MeshBasicMaterial({ color }) : P.mat(color, { flatShading: false })); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; scene.add(m); return m; };
  flat(new THREE.PlaneGeometry(420, 12), 0x8f98a8, 0, 36, 0.02);                    // 학교 앞 도로
  flat(new THREE.PlaneGeometry(420, 0.3), 0xffffff, 0, 36, 0.03, true);
  flat(new THREE.CircleGeometry(8.4, 64), 0xece7dc, 0, 0, 0.03);                   // 광장
  flat(new THREE.RingGeometry(6.4, 6.8, 64), 0xbfd7f5, 0, 0, 0.05, true);
  const star = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 1.2 : 2.9, a = i * Math.PI / 5 - Math.PI / 2; i ? star.lineTo(Math.cos(a) * r, Math.sin(a) * r) : star.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  flat(new THREE.ShapeGeometry(star), 0xffd966, 0, 0, 0.06, true).rotation.z = 0; // (별은 트로피 아래)
  const path = (w, d, x, z) => flat(new THREE.PlaneGeometry(w, d), 0xf3eee3, x, z, 0.035);
  path(5.5, 24, 0, 18);                         // 정문 → 광장
  path(66, 3.2, 8, 9.2);                        // 체험 구역 앞길
  path(24, 3, -19, -4.2); path(3, 8.5, -30, -6.6); path(3, 9, -12, 3);   // 광장 → 체육관
  path(3, 12, 0, -12);                          // 광장 → 교사동
  path(3, 9, 18, 3);                            // 광장 → 다목적관
})();

/* ---------- 건물 ---------- */
const zones = [];
function addLabel(text, x, y, z, scale = 1) {
  const s = P.labelSprite(text); s.position.set(x, y, z); s.scale.multiplyScalar(scale); scene.add(s); return s;
}
BUILDINGS.forEach((b) => {
  place(b, blockFallback);
  const f = footprint(b);
  addBox(b.x, b.z, f.w * 0.94, f.d * 0.94, { id: b.id, label: b.label, locked: !!b.soon });
  addLabel(b.label, b.x, f.h + 2.4, b.z + f.d * 0.12);
  if (b.zone) zones.push({ id: b.id, kind: b.zone.kind, x: b.zone.x, z: b.zone.z, r: 2.4, label: b.label, open: true });
});

// 정문
{
  place(GATE, (c) => { const g = P.buildGate({}); g.scale.setScalar(1.3); return g; });
  const f = footprint(GATE), half = f.w / 2, zf = GATE.z + f.d / 2 - 1.2;
  addBox(-(half + GATE.open) / 2 - GATE.open / 2 + 0.2, zf, half - GATE.open, 1.6); addBox((half + GATE.open) / 2 + GATE.open / 2 - 0.2, zf, half - GATE.open, 1.6);
  // 정문 양옆 산울타리
  for (const sx of [-1, 1]) { const w = CAMPUS.maxX - half - 0.4; const h = P.box(w, 1.3, 1.1, P.mat(0x63b565)); const cx = sx * (half + w / 2 + 0.2); h.position.set(cx, 0.65, zf); scene.add(h); addBox(cx, zf, w, 1.1); }
  addLabel(CONFIG.schoolName, GATE.x, f.h + 2.2, GATE.z + f.d * 0.3, 1.1);
}

/* ---------- 체험 구역 ---------- */
const ringMats = [];
STATIONS.forEach((st) => {
  place(st, blockFallback);
  const f = footprint(st);
  addBox(st.x, st.z, f.w * 0.9, f.d * 0.9);
  const sp = sportById[st.sport]; const open = !!sp.open;
  const zx = st.x, zz = st.z + f.d / 2 + 2.3;
  zones.push({ id: st.id, kind: 'game', sport: st.sport, x: zx, z: zz, r: 2.1, label: st.label, open });
  addLabel(`${st.label}${open ? '' : ' (곧)'}`, st.x, f.h + 2.0, st.z, 0.95);
});
// 입장 원(바닥 표시)
zones.forEach((z) => {
  const sp = z.sport ? sportById[z.sport] : null;
  const color = z.open ? (sp ? sp.color : '#35e0ff') : '#9aa3b5';
  const g = new THREE.Group(); g.position.set(z.x, 0.08, z.z);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(z.r - 0.45, z.r, 48), mat); ring.rotation.x = -Math.PI / 2; g.add(ring);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(z.r - 0.45, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22 })); disc.rotation.x = -Math.PI / 2; g.add(disc);
  scene.add(g); z.group = g; z.ring = ring; z.disc = disc; ringMats.push(mat);
});

/* ---------- 소품 ---------- */
DECOR.forEach((d) => {
  place(d, (c) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.4, 12), P.mat(0xdddddd)); m.position.y = 0.7; return m; });
  const f = footprint(d);
  if (d.r) circles.push({ x: d.x, z: d.z, r: d.r }); else addBox(d.x, d.z, f.w * 0.9, f.d * 0.9);
});
CHERRY.forEach(([x, z], i) => {
  const h = place({ model: 'tree_cherry.glb', size: 4.3 + (i % 3) * 0.4, rotY: (i * 73) % 360, x, z }, () => P.buildTree('cherry'));
  circles.push({ x, z, r: 0.9 });
});
GREEN.forEach(([x, z], i) => { const t = P.buildTree('green'); t.position.set(x, 0, z); t.rotation.y = i * 1.7; t.scale.setScalar(1.1 + (i % 4) * 0.12); scene.add(t); circles.push({ x, z, r: 0.8 }); });

/* ---------- 학교 울타리와 열린 자연 지대 ---------- */
(function surroundings() {
  const hedge = (x, z, w, d) => { const h = P.box(w, 1.3, d, P.mat(0x63b565)); h.position.set(x, 0.65, z); scene.add(h); addBox(x, z, w, d); };
  const cw = CAMPUS.maxX - CAMPUS.minX, ch = CAMPUS.maxZ - CAMPUS.minZ;
  hedge(0, CAMPUS.minZ, cw, 1.1);                                          // 북쪽
  hedge(CAMPUS.minX, (CAMPUS.minZ + CAMPUS.maxZ) / 2, 1.1, ch);              // 서쪽
  hedge(CAMPUS.maxX, (CAMPUS.minZ + CAMPUS.maxZ) / 2, 1.1, ch);              // 동쪽
  // 호수
  const lake = new THREE.Mesh(new THREE.CircleGeometry(LAKE.r, 48), new THREE.MeshStandardMaterial({ color: 0x6cc3ea, roughness: 0.25, metalness: 0.1 }));
  lake.rotation.x = -Math.PI / 2; lake.position.set(LAKE.x, 0.04, LAKE.z); lake.receiveShadow = true; scene.add(lake);
  const edge = new THREE.Mesh(new THREE.RingGeometry(LAKE.r, LAKE.r + 1.1, 48), P.mat(0xe8dfc9, { flatShading: false })); edge.rotation.x = -Math.PI / 2; edge.position.set(LAKE.x, 0.035, LAKE.z); scene.add(edge);
  for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; circles.push({ x: LAKE.x + Math.cos(a) * (LAKE.r - 1.2), z: LAKE.z + Math.sin(a) * (LAKE.r - 1.2), r: 1.8 }); }
  circles.push({ x: LAKE.x, z: LAKE.z, r: LAKE.r - 3 });
  // 자연물 흩뿌리기 (같은 결과가 나오도록 고정된 난수)
  let seed = 20260; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const road = (z) => z > 29.5 && z < 42.5;
  const inCampus = (x, z) => x > CAMPUS.minX - 1.5 && x < CAMPUS.maxX + 1.5 && z > CAMPUS.minZ - 1.5 && z < CAMPUS.maxZ + 1.5;
  const nearLake = (x, z) => Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 2.5;
  const fallbacks = { tree: () => P.buildTree('green'), tree2: () => P.buildTree('cherry'), pine: P.buildPine, rock: P.buildRock, bush: P.buildBush, flower: P.buildFlower, log: P.buildLog };
  const inForest = (x, z) => Math.abs(x) > 52 || z < -36 || z > 56 || (Math.abs(x) > 46 && Math.abs(z) < 45);
  NATURE.forEach((n) => {
    const holders = [];
    for (let i = 0, tries = 0; i < n.count && tries < n.count * 40; tries++) {
      const x = WORLD.minX + 2 + rnd() * (WORLD.maxX - WORLD.minX - 4), z = WORLD.minZ + 2 + rnd() * (WORLD.maxZ - WORLD.minZ - 4);
      if (inCampus(x, z) || road(z) || nearLake(x, z) || Math.hypot(x - PLAYER_START.x, z - PLAYER_START.z) < 6) continue;
      if (n.zone === 'forest' && !inForest(x, z)) continue; if (n.zone === 'meadow' && inForest(x, z)) continue;
      const size = n.size[0] + rnd() * (n.size[1] - n.size[0]); const rot = rnd() * 360;
      const h = new THREE.Group(); h.position.set(x, 0, z); h.rotation.y = rot * Math.PI / 180; const fb = fallbacks[n.fallback](); fb.scale.setScalar(size / (n.fallback === 'tree' || n.fallback === 'tree2' ? 4.2 : n.fallback === 'pine' ? 4.6 : n.fallback === 'rock' ? 1.8 : n.fallback === 'bush' ? 1.4 : n.fallback === 'log' ? 3 : 1)); h.add(fb); scene.add(h);
      holders.push({ h, fb, size }); if (n.r) circles.push({ x, z, r: n.r * (size / (n.size[0] + n.size[1]) * 2) }); i++;
    }
    loadModel('nature/' + n.file).then((src) => { if (!src) return; holders.forEach(({ h, fb, size }) => { h.remove(fb); h.add(fitModel(src, size)); }); });
  });
})();

/* ---------- 포털, 핀(목표 표시) ---------- */
const gymZone = zones.find((z) => z.id === 'gym');
const portalHolder = new THREE.Group(); portalHolder.position.set(gymZone.x, 0.05, gymZone.z - 0.4); scene.add(portalHolder);
const portalFallback = P.buildPortal(); portalHolder.add(portalFallback);
loadModel('portal.glb').then((src) => { if (!src) return; portalHolder.remove(portalFallback); const m = fitModel(src, 3.6); portalHolder.add(m); portalHolder.userData.model = m; });
const pinHolder = new THREE.Group(); scene.add(pinHolder);
const pinFallback = P.buildMarker(); pinHolder.add(pinFallback);
loadModel('pin.glb').then((src) => { if (!src) return; pinHolder.remove(pinFallback); const m = fitModel(src, 2.2); pinHolder.add(m); });

/* ---------- 주인공, 친구, 안내원 ---------- */
const AVATARS = { boy: { model: 'boy.glb', size: 2.4, name: '소년' }, wheelchair: { model: 'wheelchair.glb', size: 2.2, name: '휠체어 선수' } };
const player = new THREE.Group(); player.position.set(PLAYER_START.x, 0, PLAYER_START.z); scene.add(player);
const playerBody = new THREE.Group(); player.add(playerBody);
const npc = new THREE.Group(); npc.position.set(-3, 0, 16); scene.add(npc);
function setAvatar(key) {
  settings.avatar = key; store.set('avatar', key);
  playerBody.clear(); npc.clear();
  const other = key === 'boy' ? 'wheelchair' : 'boy';
  const fb = P.buildPlayer(); playerBody.add(fb);
  loadModel(AVATARS[key].model).then((src) => { if (!src) return; playerBody.remove(fb); playerBody.add(fitModel(src, AVATARS[key].size)); });
  loadModel(AVATARS[other].model).then((src) => { if (!src) return; npc.add(fitModel(src, AVATARS[other].size)); });
}
let guide = null;
new THREE.TextureLoader().load('assets/ui/mascot.png', (t) => { t.colorSpace = THREE.SRGBColorSpace; guide = P.buildGuide(t); guide.position.set(GUIDE_POS.x, 0, GUIDE_POS.z); scene.add(guide); });

/* ---------- 길 찾기 (자동 안내용) ---------- */
const CELL = 1, GX0 = WORLD.minX, GZ0 = WORLD.minZ, GW = Math.ceil((WORLD.maxX - WORLD.minX) / CELL) + 1, GH = Math.ceil((WORLD.maxZ - WORLD.minZ) / CELL) + 1;
function blockedAt(x, z, r = 0.85) {
  if (x < WORLD.minX + 0.5 || x > WORLD.maxX - 0.5 || z < WORLD.minZ + 0.5 || z > WORLD.maxZ - 0.5) return true;
  for (const b of boxes) { const nx = Math.max(b.x0, Math.min(x, b.x1)), nz = Math.max(b.z0, Math.min(z, b.z1)); if ((x - nx) ** 2 + (z - nz) ** 2 < r * r) return true; }
  for (const c of circles) if ((x - c.x) ** 2 + (z - c.z) ** 2 < (r + c.r) ** 2) return true;
  return false;
}
let grid = null;
function buildGrid() { grid = new Uint8Array(GW * GH); for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) grid[j * GW + i] = blockedAt(GX0 + i * CELL, GZ0 + j * CELL) ? 1 : 0; }
function los(a, b) { const d = Math.hypot(b.x - a.x, b.z - a.z), n = Math.ceil(d / 0.5); for (let k = 1; k < n; k++) { const t = k / n; if (blockedAt(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, 0.75)) return false; } return true; }
function findPath(from, to) {
  if (!grid) buildGrid();
  const idx = (x, z) => [Math.round((x - GX0) / CELL), Math.round((z - GZ0) / CELL)];
  const nearestFree = (i, j) => { if (!grid[j * GW + i]) return [i, j]; for (let r = 1; r < 8; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { const a = i + di, b = j + dj; if (a >= 0 && b >= 0 && a < GW && b < GH && !grid[b * GW + a]) return [a, b]; } return [i, j]; };
  const [si, sj] = nearestFree(...idx(from.x, from.z)), [ti, tj] = nearestFree(...idx(to.x, to.z));
  const open = [[si, sj]], g = new Map([[sj * GW + si, 0]]), prev = new Map(), f = new Map([[sj * GW + si, 0]]);
  const h = (i, j) => Math.hypot(i - ti, j - tj);
  const closed = new Set();
  while (open.length) {
    let bi = 0; for (let k = 1; k < open.length; k++) if (f.get(open[k][1] * GW + open[k][0]) < f.get(open[bi][1] * GW + open[bi][0])) bi = k;
    const [ci, cj] = open.splice(bi, 1)[0]; const ck = cj * GW + ci;
    if (ci === ti && cj === tj) { const pts = [[ci, cj]]; let k = ck; while (prev.has(k)) { k = prev.get(k); pts.push([k % GW, Math.floor(k / GW)]); } pts.reverse(); return smooth(pts.map(([i, j]) => ({ x: GX0 + i * CELL, z: GZ0 + j * CELL })), from, to); }
    closed.add(ck);
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue; const ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= GW || nj >= GH) continue; const nk = nj * GW + ni;
      if (grid[nk] || closed.has(nk)) continue; if (di && dj && (grid[cj * GW + ni] || grid[nj * GW + ci])) continue;
      const ng = g.get(ck) + Math.hypot(di, dj);
      if (!g.has(nk) || ng < g.get(nk)) { g.set(nk, ng); prev.set(nk, ck); f.set(nk, ng + h(ni, nj)); if (!open.some((o) => o[0] === ni && o[1] === nj)) open.push([ni, nj]); }
    }
  }
  return [to];
}
function smooth(pts, from, to) { // 보이는 곳까지 곧장 가도록 중간 점을 줄임
  const out = []; let cur = { x: from.x, z: from.z }, i = 0;
  while (i < pts.length) { let far = i; for (let k = pts.length - 1; k > i; k--) if (los(cur, pts[k])) { far = k; break; } out.push(pts[far]); cur = pts[far]; i = far + 1; }
  out.push({ x: to.x, z: to.z }); return out;
}

/* ---------- 입력 ---------- */
const keys = new Set();
addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  keys.add(e.key.toLowerCase());
  if ((e.key === ' ' || e.key === 'Enter') && mode === 'world' && !e.repeat) doAction();
  if (e.key === 'Escape' && (mode === 'lobby' || mode === 'game' || mode === 'info')) closeOverlay();
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());
const pad = $('#pad'), knob = $('#knob'); const joy = { x: 0, y: 0, id: null };
function padMove(e) {
  const r = pad.getBoundingClientRect(); const R = r.width / 2;
  let dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R); const len = Math.hypot(dx, dy);
  const k = len > R * 0.8 ? (R * 0.8) / len : 1; dx *= k; dy *= k;
  knob.style.transform = `translate(${dx}px,${dy}px)`;
  const m = Math.hypot(dx, dy) / (R * 0.8);
  if (m < 0.18) { joy.x = joy.y = 0; return; }
  joy.x = dx / (R * 0.8); joy.y = dy / (R * 0.8);
}
pad.addEventListener('pointerdown', (e) => { joy.id = e.pointerId; pad.setPointerCapture(e.pointerId); cancelAuto(); padMove(e); e.preventDefault(); });
pad.addEventListener('pointermove', (e) => { if (e.pointerId === joy.id) padMove(e); });
const padEnd = (e) => { if (e.pointerId !== joy.id) return; joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; };
pad.addEventListener('pointerup', padEnd); pad.addEventListener('pointercancel', padEnd);
$('#act').addEventListener('click', () => doAction());

/* ---------- 상태 ---------- */
let mode = 'title'; // title | world | lobby | game
const vel = new THREE.Vector3(); let facing = 0, walkT = 0, dwell = 0, nearLocked = null;
let route = null, routeTarget = null; // 자동 안내 경로
const zoneNear = (px, pz, pad_ = 0) => zones.find((z) => Math.hypot(px - z.x, pz - z.z) < z.r + pad_);

function nextTarget() {
  if (!flags.gym) return zones.find((z) => z.id === 'gym');
  const todo = zones.filter((z) => z.kind === 'game' && z.open && !medals[z.sport]);
  const pool = todo.length ? todo : [zones.find((z) => z.id === 'gym')];
  const p = player.position; return pool.sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
}
function cancelAuto() { if (route) { route = null; routeTarget = null; $('#act').classList.remove('guiding'); } }
function startGuide() { const t = nextTarget(); routeTarget = t; route = findPath({ x: player.position.x, z: player.position.z }, { x: t.x, z: t.z }); $('#act').classList.add('guiding'); say(`따라와요! ${t.label}(으)로 안내할게요.`, 3); }
function doAction() {
  if (mode !== 'world') return;
  const z = zoneNear(player.position.x, player.position.z, 0.6);
  if (z) return enterZone(z);
  if (nearLocked) { say(`${nearLocked.label}은(는) 곧 문을 열어요. 다른 곳을 둘러볼까요?`, 3); return; }
  startGuide();
}
function enterZone(z) {
  if (z.kind === 'lobby') return enterGym();
  if (z.kind === 'info') { cancelAuto(); vel.set(0, 0, 0); joy.x = joy.y = 0; flags.info = true; store.set('flags', flags); return transition(() => openInfo('world')); }
  if (!z.open) { say(`${z.label}은(는) 곧 열려요!`, 2.5); return; }
  cancelAuto(); vel.set(0, 0, 0); joy.x = joy.y = 0;
  transition(() => openGame(sportById[z.sport], 'world'));
}
function resolve(p, r) {
  for (let it = 0; it < 3; it++) {
    for (const b of boxes) {
      const nx = Math.max(b.x0, Math.min(p.x, b.x1)), nz = Math.max(b.z0, Math.min(p.z, b.z1));
      const dx = p.x - nx, dz = p.z - nz, d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x += dx / d * (r - d); p.z += dz / d * (r - d); }
        else { const l = p.x - b.x0, rr = b.x1 - p.x, t = p.z - b.z0, bt = b.z1 - p.z, m = Math.min(l, rr, t, bt); if (m === l) p.x = b.x0 - r; else if (m === rr) p.x = b.x1 + r; else if (m === t) p.z = b.z0 - r; else p.z = b.z1 + r; }
      }
    }
    for (const c of circles) { const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), rr = r + c.r; if (d < rr && d > 1e-6) { p.x += dx / d * (rr - d); p.z += dz / d * (rr - d); } }
  }
  p.x = Math.max(WORLD.minX, Math.min(WORLD.maxX, p.x)); p.z = Math.max(WORLD.minZ, Math.min(WORLD.maxZ, p.z));
}

/* ---------- 말풍선, 알림 ---------- */
let sayTimer = 0, lastSay = '';
function say(t, hold = 0) { if (t === lastSay && !hold) return; lastSay = t; $('#guide-text').textContent = t; if (hold) sayTimer = hold; }
function showToast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(showToast._t); showToast._t = setTimeout(() => el.classList.remove('show'), 2400); }
function medalPop(text) {
  const el = $('#medal-pop'); el.querySelector('p').textContent = text; el.classList.add('show'); clearTimeout(medalPop._t); medalPop._t = setTimeout(() => el.classList.remove('show'), settings.calm ? 3000 : 2600);
}

/* ---------- 화면 전환 ---------- */
const fade = $('#fade');
function transition(fn) { fade.classList.add('on'); setTimeout(() => { fn(); requestAnimationFrame(() => fade.classList.remove('on')); }, settings.calm ? 80 : 380); }
function setMode(m) { mode = m; document.body.dataset.mode = m; }
function enterGym() {
  cancelAuto(); vel.set(0, 0, 0); joy.x = joy.y = 0; flags.gym = true; store.set('flags', flags);
  transition(() => { setMode('lobby'); renderLobby(); $('#lobby').hidden = false; });
}
function backToWorld(zone) {
  $('#lobby').hidden = true; $('#game').hidden = true; setMode('world'); dwell = -2;
  if (zone) { player.position.set(zone.x, 0, zone.z + 2.6); }
}
function closeOverlay() {
  if (mode === 'game') return closeGame();
  if (mode === 'info') return closeInfo();
  if (mode === 'lobby') transition(() => { backToWorld(gymZone); say('체육관 구경 잘했어요! 다른 체험 장소도 가 볼까요?', 4); });
}
$('#lobby-back').addEventListener('click', closeOverlay);

/* ---------- 안내관 (학교 소개 · 육성 종목 · 입학 안내) ---------- */
let infoFrom = 'world';
const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
function renderInfo(tab) {
  document.querySelectorAll('#info .tabs button').forEach((b) => b.classList.toggle('on', b.dataset.t === tab));
  const body = $('#info-body'); body.scrollTop = 0;
  if (tab === 'about') body.innerHTML = '<div class="facts">' + INFO.about.map((f) => `<div class="fact"><h3>${esc(f.h)}</h3><p>${esc(f.p)}</p></div>`).join('') + '</div>';
  else if (tab === 'sports') body.innerHTML = '<div class="sgrid">' + SPORTS.map((s) => `<div class="sintro"><img src="assets/ui/icon_${s.id}.webp" alt=""><div><h3>${esc(s.name)}</h3><p>${esc(INFO.sports[s.id] || '')}</p><span class="tag ${s.open ? '' : 'soon'}">${s.open ? '게임으로 체험할 수 있어요' : '체험은 곧 열려요'}</span></div></div>`).join('') + '</div>';
  else body.innerHTML = `<p class="note">${esc(INFO.admission.note)}</p><div class="facts">` + INFO.admission.items.map((f) => `<div class="fact ${f.p ? '' : 'empty'}"><h3>${esc(f.h)}</h3><p>${esc(f.p || '준비 중이에요')}</p></div>`).join('') + '</div>';
}
function openInfo(from) {
  infoFrom = from; $('#info-title').textContent = CONFIG.schoolName; renderInfo('about');
  $('#info').hidden = false; setMode('info');
}
function closeInfo() {
  const back = () => { $('#info').hidden = true; if (infoFrom === 'title') { setMode('title'); } else { backToWorld(zones.find((z) => z.kind === 'info')); say('안내관 구경 잘했어요! 이제 체육관에 가 볼까요?', 4); } };
  transition(back);
}
document.querySelectorAll('#info .tabs button').forEach((b) => b.addEventListener('click', () => renderInfo(b.dataset.t)));
$('#info-close').addEventListener('click', closeInfo);
$('#open-info').addEventListener('click', () => transition(() => openInfo('title')));

/* ---------- 체육관 로비 ---------- */
function renderLobby() {
  const grid = $('#sports'); grid.innerHTML = '';
  SPORTS.forEach((s) => {
    const b = document.createElement('button'); b.type = 'button';
    b.className = 'sport ' + (s.open ? 'open' : 'soon'); b.style.setProperty('--c', s.color);
    b.innerHTML = `<img src="assets/ui/icon_${s.id}.webp" alt="" draggable="false"><b>${s.name}</b><small>${s.sub}</small>${medals[s.id] ? '<i class="medal"><img src="assets/ui/medal_gold.webp" alt="참여 메달"></i>' : ''}`;
    b.setAttribute('aria-label', `${s.name}. ${s.open ? '체험하기' : '준비 중'}`);
    b.addEventListener('click', () => { if (s.open) openGame(s, 'lobby'); else showToast(`${s.name}은(는) 곧 열려요!`); });
    grid.appendChild(b);
  });
  const got = SPORTS.filter((s) => medals[s.id]).length;
  $('#medal-row').innerHTML = SPORTS.map((s) => `<span class="mslot ${medals[s.id] ? 'got' : ''}" title="${s.name}"><img src="assets/ui/${medals[s.id] ? 'medal_gold' : 'icon_' + s.id}.webp" alt=""></span>`).join('');
  $('#medal-count').textContent = `${got} / ${SPORTS.length}`;
}

/* ---------- 게임 (기존 스포츠 게임을 그대로 연결) ---------- */
let curSport = null, gameFrom = 'lobby', gameOpenedAt = 0, autoStart = 0;
const frame = $('#game-frame');
function openGame(s, from) {
  curSport = s; gameFrom = from; gameOpenedAt = Date.now();
  const lv = settings.easy ? CONFIG.levelEasy : CONFIG.levelNormal;
  $('#game-title').innerHTML = `<img src="assets/ui/icon_${s.id}.webp" alt=""> ${s.name}`;
  $('#game-back').textContent = from === 'world' ? '← 마을로' : '← 체육관으로';
  $('#lobby').hidden = true; $('#game').hidden = false; setMode('game');
  frame.src = `${s.url}&level=${lv}&play=1`;
}
frame.addEventListener('load', () => {
  clearInterval(autoStart); let n = 0, started = false; // 수업용 안내를 건너뛰고 바로 시작
  autoStart = setInterval(() => {
    n++; if (n > 40) return clearInterval(autoStart);
    try {
      const d = frame.contentDocument; if (!d || !d.body) return;
      if (!d.getElementById('ssw-style')) { const st = d.createElement('style'); st.id = 'ssw-style'; st.textContent = 'a.oks-pill,a.oks-extra{display:none!important}'; d.head.appendChild(st); }
      const vis = (x) => x.offsetParent !== null;
      const lv = [...d.querySelectorAll('button.oks-lv')].filter(vis);
      if (lv.length) { const pick = settings.easy ? (lv[1] || lv[0]) : (lv.find((x) => x.classList.contains('on')) || lv[0]); pick.click(); return clearInterval(autoStart); }
      if (!started) { const btn = [...d.querySelectorAll('button')].find((x) => /시작하기/.test(x.textContent) && vis(x)); if (btn) { btn.click(); started = true; } }
    } catch (e) { clearInterval(autoStart); }
  }, 250);
});
function closeGame() {
  clearInterval(autoStart);
  const played = Date.now() - gameOpenedAt > 12000, first = curSport && !medals[curSport.id];
  frame.src = 'about:blank'; $('#game').hidden = true;
  const got = curSport && played && first;
  if (got) { medals[curSport.id] = true; store.set('medals', medals); }
  const finish = () => {
    if (gameFrom === 'world') { const z = zones.find((q) => q.sport === curSport.id); backToWorld(z); }
    else { setMode('lobby'); $('#lobby').hidden = false; renderLobby(); }
    if (got) medalPop(`${curSport.name} 참여 메달을 받았어요!`);
  };
  transition(finish);
}
$('#game-back').addEventListener('click', closeGame);

/* ---------- 설정, 시작 ---------- */
const setPanel = $('#settings');
$('#gear').addEventListener('click', () => { setPanel.hidden = !setPanel.hidden; });
$('#opt-easy').checked = settings.easy; $('#opt-calm').checked = settings.calm;
$('#opt-easy').addEventListener('change', (e) => { settings.easy = e.target.checked; store.set('easy', settings.easy); });
$('#opt-calm').addEventListener('change', (e) => { settings.calm = e.target.checked; store.set('calm', settings.calm); });
$('#settings-close').addEventListener('click', () => { setPanel.hidden = true; });
$('#t-easy').checked = settings.easy;
document.querySelectorAll('.avatar').forEach((b) => {
  b.classList.toggle('on', b.dataset.k === settings.avatar);
  b.addEventListener('click', () => { document.querySelectorAll('.avatar').forEach((x) => x.classList.toggle('on', x === b)); setAvatar(b.dataset.k); });
});
$('#start').addEventListener('click', () => {
  settings.easy = $('#t-easy').checked; store.set('easy', settings.easy); $('#opt-easy').checked = settings.easy;
  transition(() => { $('#title').hidden = true; setMode('world'); say('방향 버튼으로 걸어 봐요. 노란 핀이 갈 곳을 알려 줘요!', 4); });
});

/* ---------- 미니맵 (캠퍼스 조감도 위에 표시) ---------- */
const mm = $('#minimap'), mg = mm.getContext('2d'); const mapImg = new Image(); mapImg.src = MAP.img;
const mx = (x) => Math.max(0, Math.min(1, (x - MAP.minX) / (MAP.maxX - MAP.minX))) * mm.width, mz = (z) => Math.max(0, Math.min(1, (z - MAP.minZ) / (MAP.maxZ - MAP.minZ))) * mm.height;
function drawMap(t) {
  mg.clearRect(0, 0, mm.width, mm.height);
  if (mapImg.complete && mapImg.naturalWidth) mg.drawImage(mapImg, 0, 0, mm.width, mm.height); else { mg.fillStyle = '#b9e3a6'; mg.fillRect(0, 0, mm.width, mm.height); }
  const tg = routeTarget || nextTarget();
  zones.forEach((z) => { if (!z.open) return; const isT = z === tg; mg.fillStyle = isT ? '#ffd23f' : '#ffffffcc'; mg.strokeStyle = isT ? '#a67c00' : '#4b6aa8'; mg.lineWidth = 2; mg.beginPath(); mg.arc(mx(z.x), mz(z.z), isT ? 8 + Math.sin(t * 5) * 1.5 : 4.5, 0, 7); mg.fill(); mg.stroke(); });
  mg.save(); mg.translate(mx(player.position.x), mz(player.position.z)); mg.rotate(-facing + Math.PI);
  mg.fillStyle = '#ff5a2a'; mg.beginPath(); mg.moveTo(0, -9); mg.lineTo(7, 7); mg.lineTo(-7, 7); mg.closePath(); mg.fill(); mg.strokeStyle = '#fff'; mg.lineWidth = 2.5; mg.stroke(); mg.restore();
}

/* ---------- 크기 ---------- */
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

/* ---------- 루프 ---------- */
const clock = new THREE.Clock(); const camPos = new THREE.Vector3(); let camInit = false; const tmp = new THREE.Vector3();
let topDown = false;
function frameLoop() {
  requestAnimationFrame(frameLoop);
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  if (mode !== 'world' && mode !== 'title') return; // 로비·게임 화면에서는 3D를 쉬어 배터리를 아낌

  if (mode === 'world') {
    let ix = 0, iz = 0;
    if (keys.has('arrowleft') || keys.has('a')) ix -= 1; if (keys.has('arrowright') || keys.has('d')) ix += 1;
    if (keys.has('arrowup') || keys.has('w')) iz -= 1; if (keys.has('arrowdown') || keys.has('s')) iz += 1;
    if (joy.x || joy.y) { ix += joy.x; iz += joy.y; }
    let l = Math.hypot(ix, iz); if (l > 1) { ix /= l; iz /= l; l = 1; }
    if (l > 0.05) cancelAuto();
    if (route) {
      const p = player.position; let wp = route[0];
      while (route.length > 1 && Math.hypot(wp.x - p.x, wp.z - p.z) < 0.9) { route.shift(); wp = route[0]; }
      const dx = wp.x - p.x, dz = wp.z - p.z, d = Math.hypot(dx, dz);
      if (route.length === 1 && d < 0.7) cancelAuto(); else { ix = dx / d; iz = dz / d; l = 1; }
    }
    const speed = settings.easy ? 6.4 : 9;
    vel.lerp(tmp.set(ix * speed, 0, iz * speed), 1 - Math.exp(-(settings.easy ? 9 : 12) * dt));
    const p = player.position; p.x += vel.x * dt; p.z += vel.z * dt; resolve(p, 0.6);
    const sp = Math.hypot(vel.x, vel.z);
    if (sp > 0.3) { const a = Math.atan2(vel.x, vel.z); let da = a - facing; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2; facing += da * (1 - Math.exp(-14 * dt)); }
    player.rotation.y = facing;
    if (sp > 0.3 && !settings.calm) { walkT += dt * sp * 1.4; playerBody.position.y = Math.abs(Math.sin(walkT)) * 0.09; playerBody.rotation.z = Math.sin(walkT) * 0.05; } else { playerBody.position.y *= 0.8; playerBody.rotation.z *= 0.8; }

    // 주변 확인
    const zn = zoneNear(p.x, p.z);
    nearLocked = null; for (const b of boxes) if (b.locked) { const nx = Math.max(b.x0, Math.min(p.x, b.x1)), nz = Math.max(b.z0, Math.min(p.z, b.z1)); if (Math.hypot(p.x - nx, p.z - nz) < 3.2) nearLocked = b; }
    const act = $('#act'); let label = '안내', ico = '👣';
    if (zn) { label = zn.open ? '들어가기' : '알아보기'; ico = zn.open ? '🚪' : '❓'; } else if (nearLocked) { label = '알아보기'; ico = '❓'; }
    if (act.dataset.label !== label) { act.dataset.label = label; act.querySelector('b').textContent = label; act.querySelector('span').textContent = ico; }
    act.classList.toggle('ready', !!(zn && zn.open));
    if (sayTimer > 0) sayTimer -= dt;
    else if (zn) say(!zn.open ? `${zn.label}은(는) 곧 열려요!` : settings.easy ? `${zn.label}! 잠깐 서 있으면 들어가요.` : `${zn.label}! 들어가기 버튼을 눌러요.`);
    else if (nearLocked) say(`${nearLocked.label}이에요. 곧 문을 열어요!`);
    else if (Math.hypot(p.x - GUIDE_POS.x, p.z - GUIDE_POS.z) < 5) say('안녕! 노란 핀이 있는 곳으로 가 봐요.');
    else if (!route) say(flags.gym ? '체험 장소의 동그란 빛에 서면 게임이 열려요!' : '방향 버튼으로 걷고, 노란 핀이 체육관 입구예요!');
    if (zn && zn.open && settings.easy) { dwell += dt; $('#dwell').style.setProperty('--p', Math.min(1, Math.max(0, dwell) / CONFIG.autoEnterSeconds)); if (dwell >= CONFIG.autoEnterSeconds) { dwell = 0; enterZone(zn); } }
    else { if (dwell !== 0) dwell = Math.min(0, dwell + dt); $('#dwell').style.setProperty('--p', 0); }
  }

  // 움직이는 표시들
  const calm = settings.calm; const pulse = calm ? 1 : 1 + Math.sin(t * 3) * 0.05;
  const pu = portalFallback.userData; pu.ring.rotation.z = calm ? 0 : t * 0.8; pu.ring2.rotation.z = calm ? 0 : -t * 1.4;
  if (portalHolder.userData.model && !calm) portalHolder.userData.model.rotation.y = Math.sin(t * 0.6) * 0.12;
  zones.forEach((z) => { const s = z.open ? pulse : 1; z.ring.scale.setScalar(s); });
  const tg = routeTarget || nextTarget();
  pinHolder.position.set(tg.x, 3.2 + (calm ? 0 : Math.sin(t * 2.4) * 0.35), tg.z); pinHolder.rotation.y = calm ? 0 : t * 1.2;
  if (guide) guide.position.y = calm ? 0 : Math.abs(Math.sin(t * 2)) * 0.06;
  npc.rotation.y = Math.sin(t * 0.5) * 0.4;

  // 카메라: 고정 각도로 따라감
  const portrait = camera.aspect < 0.85; const dist = portrait ? 1.7 : 1.0;
  if (topDown) { camera.position.set(0, 120, 8); camera.up.set(0, 0, -1); camera.lookAt(0, 0, 4); scene.fog = null; }
  else {
    tmp.set(player.position.x, 0, player.position.z).add(new THREE.Vector3(0, 17 * dist, 15.5 * dist));
    if (!camInit) { camPos.copy(tmp); camInit = true; }
    camPos.lerp(tmp, 1 - Math.exp(-(calm ? 20 : 5) * dt)); camera.position.copy(camPos);
    camera.lookAt(player.position.x * 0.98, 1.2, player.position.z * 0.98 - 2.2);
  }
  sun.position.set(player.position.x - 22, 38, player.position.z + 16); sun.target.position.copy(player.position); sun.target.updateMatrixWorld();
  renderer.render(scene, camera);
  if (mode === 'world') drawMap(t);
}
setAvatar(settings.avatar);
frameLoop();

// 점검용
function debugShow() { // 충돌 범위와 입장 원을 위에서 본 모습으로 확인
  const m = new THREE.MeshBasicMaterial({ color: 0xff2255, transparent: true, opacity: 0.35 });
  boxes.forEach((b) => { const o = new THREE.Mesh(new THREE.BoxGeometry(b.x1 - b.x0, 2, b.z1 - b.z0), m); o.position.set((b.x0 + b.x1) / 2, 1, (b.z0 + b.z1) / 2); scene.add(o); });
  circles.forEach((c) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(c.r, c.r, 2, 16), m); o.position.set(c.x, 1, c.z); scene.add(o); });
}
window.__ssw = { player, get mode() { return mode; }, enterGym, openGame, enterZone, zones, SPORTS, scene, camera, boxes, circles, debugShow, topDown: (v = true) => { topDown = v; }, findPath, loadedOk, loadedFail, medals, flags, startGuide, get route() { return route; }, setAvatar };
