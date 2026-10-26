import * as THREE from '../vendor/three/three.module.js';
import { GLTFLoader } from '../vendor/three/addons/loaders/GLTFLoader.js';
import { CONFIG, INFO, SPORTS, BUILDINGS, STATIONS, DECOR, CHERRY, GREEN, GATE, WORLD, CAMPUS, NATURE, LAKE, MAP, PLAYER_START, GUIDE_POS } from './config.js';
import { autoRig } from './rig.js';
import * as P from './placeholders.js';

const $ = (s) => document.querySelector(s);
const store = {
  get(k, d) { try { const v = localStorage.getItem('ssw_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('ssw_' + k, JSON.stringify(v)); } catch (e) { /* 저장이 안 되어도 계속 진행 */ } },
};
const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const settings = { easy: store.get('easy', true), calm: store.get('calm', prefersReduced), avatar: ['boy', 'girl', 'squirrel'].includes(store.get('avatar', 'boy')) ? store.get('avatar', 'boy') : 'boy' };
const medals = store.get('medals', {});
const flags = store.get('flags', {});
const sportById = Object.fromEntries(SPORTS.map((s) => [s.id, s]));

document.title = CONFIG.title;
{ const mt = CONFIG.title.match(/^(.+?대학교)(.+)$/); const th = $('#title-h'); if (mt) { th.innerHTML = ''; for (const part of [mt[1], mt[2]]) { const s = document.createElement('span'); s.textContent = part; th.appendChild(s); } } else th.textContent = CONFIG.title; }
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
const courtFallback = (c) => {
  const f = footprint(c), g = new THREE.Group(), w = f.w, d = f.d;
  { const fl = P.box(w, 0.2, d, P.mat(0x3f9f6e)); fl.position.set(0, 0.1, 0); g.add(fl); }
  const line = (lw, ld, x, z) => { const b = P.box(lw, 0.04, ld, P.mat(0xffffff)); b.position.set(x, 0.22, z); g.add(b); };
  line(w * 0.92, 0.12, 0, d * 0.45); line(w * 0.92, 0.12, 0, -d * 0.45); line(0.12, d * 0.9, w * 0.45, 0); line(0.12, d * 0.9, -w * 0.45, 0); line(0.1, d * 0.9, 0, 0);
  for (const s of [-1, 1]) { const p = P.box(0.18, 1.6, 0.18, P.mat(0x233a6b)); p.position.set(0, 0.9, s * d * 0.5); g.add(p); }
  const net = P.box(0.06, 0.9, d, new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })); net.position.set(0, 1.2, 0); g.add(net);
  return g;
};
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
const labelSprites = [];
function addLabel(text, x, y, z, scale = 1) {
  const s = P.labelSprite(text); labelSprites.push(s); s.position.set(x, y, z); s.scale.multiplyScalar(scale); scene.add(s); return s;
}
BUILDINGS.forEach((b) => {
  place(b, blockFallback);
  const f = footprint(b);
  if (b.ring) { // 운동장: 타원 울타리를 따라 막고, 동쪽 한 곳은 열어 둠
    const n = 46; for (let i = 0; i < n; i++) { const a = (i + 0.5) / n * Math.PI * 2; if (Math.abs(a - Math.PI * 2 * (a > Math.PI ? 1 : 0)) < b.ring.gap) continue; circles.push({ x: b.x + Math.cos(a) * b.ring.a, z: b.z + Math.sin(a) * b.ring.b, r: 0.9 }); }
  } else if (b.open) { // 수영장: 바깥 둘레만 막고 안으로 들어갈 수 있게
    const f2 = footprint(b); const x0 = b.x - f2.w / 2 + 0.3, x1 = b.x + f2.w / 2 - 0.3, z0 = b.z - f2.d / 2 + 0.3, z1 = b.z + f2.d / 2 - 0.3;
    addBox((x0 + x1) / 2, z0, x1 - x0, 0.8); addBox(x1, (z0 + z1) / 2, 0.8, z1 - z0);
    addBox(x0, (z0 + z1) / 2, 0.8, z1 - z0); addBox(x0 + (x1 - x0) * 0.74, z1, (x1 - x0) * 0.52, 0.8);
  } else addBox(b.x, b.z, f.w * 0.94, f.d * 0.94, { id: b.id, label: b.label, locked: !!b.soon });
  addLabel(b.label, b.x, f.h + 2.4, b.z + f.d * 0.12);
  if (b.zone) zones.push({ id: b.id, kind: b.zone.kind, sport: b.zone.sport, x: b.zone.x, z: b.zone.z, r: 2.4, label: b.zone.label || b.label, open: true, tip: { x: b.zone.x, y: Math.max(f.h * 0.5, 5.5), z: b.zone.z } });
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
  place(st, st.sport === 'badminton' ? courtFallback : blockFallback);
  const f = footprint(st);
  addBox(st.x, st.z, f.w * 0.9, f.d * 0.9);
  const sp = sportById[st.sport]; const open = !!sp.open;
  const zx = st.x, zz = st.z + f.d / 2 + 2.3;
  zones.push({ id: st.id, kind: 'game', sport: st.sport, x: zx, z: zz, r: 2.1, label: st.label, open, tip: { x: zx, y: Math.max(f.h + 1.6, 4.2), z: zz } });
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
const decorHolder = {}, decorCircle = {};
DECOR.forEach((d) => {
  decorHolder[d.id] = place(d, (c) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.4, 12), P.mat(0xdddddd)); m.position.y = 0.7; return m; });
  const f = footprint(d);
  if (d.r) { const c = { x: d.x, z: d.z, r: d.r }; circles.push(c); decorCircle[d.id] = c; } else if (!d.walk) addBox(d.x, d.z, f.w * 0.9, f.d * 0.9);
});
CHERRY.forEach(([x, z], i) => {
  const h = place({ model: 'tree_cherry.glb', size: 4.3 + (i % 3) * 0.4, rotY: (i * 73) % 360, x, z }, () => P.buildTree('cherry'));
  circles.push({ x, z, r: 0.9 });
});
const TREE_SET = ['nature/tree_a.glb', 'nature/tree_b.glb', 'nature/maple.glb', 'nature/tree_a.glb', 'nature/tree_b.glb'];
GREEN.forEach(([x, z], i) => { place({ model: TREE_SET[i % TREE_SET.length], size: 5.4 + (i % 4) * 0.5, rotY: (i * 61) % 360, x, z }, () => { const t = P.buildTree('green'); t.scale.setScalar(1.1); return t; }); circles.push({ x, z, r: 0.8 }); });

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

/* ---------- 구조물과 상호작용: 벤치, 카페 의자, 수영장 의자·출발대, 축구공, 파란 휠체어 ---------- */
const spots = [];
const addSpot = (o) => { const sp = { r: 2.3, y: 0, ...o }; sp.tip = sp.tip || { x: sp.x, y: 2.8, z: sp.z }; spots.push(sp); return sp; };
const gy_ = (x, z) => 0; // (바닥 높이는 아래 groundY 에서 계산)
// 벚나무 아래 벤치
CHERRY.forEach(([cx, cz], i) => {
  let placed = 0;
  for (const [ox, oz] of [[-2.3, 2.7], [2.3, 2.7], [0, 3.6], [-3.4, 0.8], [3.4, 0.8]]) {
    if (placed >= 2) break; const bx = cx + ox, bz = cz + oz;
    if ([-1.1, 0, 1.1].some((k) => blockedAt(bx + k, bz, 0.7)) || Math.hypot(bx + 13.6, bz - 8) < 6) continue; // 운동장 입구는 비워 둠
    place({ model: 'bench.glb', size: 2.3, rotY: 0, x: bx, z: bz }, () => { const b = P.box(2.2, 0.5, 0.7, P.mat(0x8a5a2b)); b.position.y = 0.3; return b; });
    addBox(bx, bz - 0.15, 2.3, 0.6); placed++;
    addSpot({ kind: 'sit', x: bx, z: bz + 0.1, face: 0, stand: { x: bx, z: bz + 1.5 }, label: '앉기', ico: '🪑', say: '벚꽃나무 아래 벤치예요. 편하게 쉬어요! 걸으면 일어나요.', tip: { x: bx, y: 2.3, z: bz } });
  }
});
// 카페(파티오) 의자: 탁자 두 개 둘레 (위에서 본 모습으로 맞춘 값)
{ const pa = DECOR.find((d) => d.id === 'patio'); const F = pa.size;
  for (const [tx, tz] of [[-0.305, 0.02], [0.305, 0.02]]) { const cx = pa.x + tx * F, cz = pa.z + tz * F;
    for (const a of [0, 1, 2, 3]) { const ang = a * Math.PI / 2 + Math.PI / 4, ex = cx + Math.cos(ang) * 1.55, ez = cz + Math.sin(ang) * 1.45;
      addSpot({ kind: 'sit', x: ex, z: ez, face: Math.atan2(cx - ex, cz - ez), stand: { x: cx + Math.cos(ang) * 2.8, z: cz + Math.sin(ang) * 2.7 }, label: '앉기', ico: '☕', r: 1.7, camOff: [5.2, 8.8], say: '카페 의자에 앉았어요. 걸으면 일어나요.', tip: { x: ex, y: 2.2, z: ez } }); } } }
// 수영장: 승강 의자(앉기), 출발대(올라서서 수영장 정면 보기), 물속 걷기
const POOL = { deck: { x0: 20.4, x1: 39.6, z0: -27.6, z1: -8.4 }, water: { x0: 21.9, x1: 36.9, z0: -25.2, z1: -9.6 }, chair: { x: 37.0, z: -15.4 } };
addSpot({ kind: 'sit', x: POOL.chair.x, z: POOL.chair.z, y: 0.28, face: -Math.PI / 2, stand: { x: 38.5, z: POOL.chair.z + 1.2, y: 0.28 }, label: '앉기', ico: '♿', r: 2.4, camOff: [6, 8], say: '수영장 승강 의자예요. 휠체어 친구들이 물에 들어갈 때 써요!', tip: { x: POOL.chair.x, y: 3, z: POOL.chair.z } });
for (const bx of [24.2, 28.6, 33.2]) addSpot({ kind: 'view', x: bx, z: -26.3, y: 1.15, face: 0, stand: { x: bx, z: -23.6, y: -0.2 }, label: '출발대 서기', ico: '🏊', r: 1.9, say: '출발대 위에서 수영장 정면을 바라봐요! 걸으면 내려와요.', tip: { x: bx, y: 3, z: -26.3 } });
// 거리 분위기용 가로등
for (const [lx, lz] of [[-3.2, 27], [3.2, 27], [-3.2, 20], [3.2, 20], [-16, 13.5], [14, 9.4], [-3.2, -8], [3.2, -8], [-18, -1.5], [18, 1]]) {
  place({ model: 'lamp.glb', size: 4.4, rotY: lx > 0 ? 180 : 0, x: lx, z: lz }, () => { const l = P.box(0.2, 4, 0.2, P.mat(0x55555f)); l.position.y = 2; return l; }); circles.push({ x: lx, z: lz, r: 0.35 });
}
// 축구공과 골대: 운동장
const STAD = BUILDINGS.find((b) => b.id === 'stadium');
const FIELD = { x0: STAD.x - 8.9, x1: STAD.x + 8.9, z0: STAD.z - 6.2, z1: STAD.z + 5.4, cx: STAD.x, cz: STAD.z - 0.4, goalZ: STAD.z - 0.4, goalHalf: 2.1 };
const ballTex = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 64); g.fillStyle = '#222'; for (const [x, y] of [[20, 20], [64, 14], [108, 20], [40, 48], [88, 48], [0, 46], [128, 46]]) { g.beginPath(); for (let k = 0; k < 5; k++) { const a = k * 1.2566 - 1.57; g.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9); } g.fill(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const ball = { m: new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14), new THREE.MeshStandardMaterial({ map: ballTex, roughness: 0.55 })), x: FIELD.cx, z: FIELD.cz, vx: 0, vz: 0, reset: 0, goals: 0, hop: 0 };
ball.m.castShadow = true; ball.m.position.set(ball.x, 0.5, ball.z); scene.add(ball.m);
const confetti = []; for (let i = 0; i < 28; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.05), new THREE.MeshBasicMaterial({ color: [0xff6b6b, 0xffd24a, 0x4aa3df, 0x5bbf5a, 0xec6fa0][i % 5] })); m.visible = false; scene.add(m); confetti.push({ m, vx: 0, vy: 0, vz: 0, life: 0 }); }

/* ---------- 포털, 핀(목표 표시) ---------- */
const gymZone = zones.find((z) => z.id === 'gym');
const portalHolder = new THREE.Group(); portalHolder.position.set(gymZone.x, 0.05, gymZone.z - 0.4); scene.add(portalHolder);
const portalFallback = P.buildPortal(); portalHolder.add(portalFallback);
loadModel('portal.glb').then((src) => { if (!src) return; portalHolder.remove(portalFallback); const m = fitModel(src, 3.6); portalHolder.add(m); portalHolder.userData.model = m; });
const pinHolder = new THREE.Group(); scene.add(pinHolder);
const pinFallback = P.buildMarker(); pinHolder.add(pinFallback);
loadModel('pin.glb').then((src) => { if (!src) return; pinHolder.remove(pinFallback); const m = fitModel(src, 2.2); pinHolder.add(m); });

/* ---------- 주인공, 친구, 안내원 ---------- */
const AVATARS = { boy: { model: 'boy.glb', size: 2.4, name: '소년' }, wheelchair: { model: 'wheelchair.glb', size: 2.2, name: '휠체어 선수' },
  girl: { model: 'girl.glb', size: 2.3, name: '여학생' }, girl_wheelchair: { model: 'girl_wheelchair.glb', size: 2.2, name: '휠체어 여학생' },
  squirrel: { model: 'mascot.glb', size: 2.7, name: '다람쥐', hop: true } };
const PARTNER = { boy: 'wheelchair', wheelchair: 'boy', girl: 'girl_wheelchair', girl_wheelchair: 'girl', squirrel: 'girl' };
const player = new THREE.Group(); player.position.set(PLAYER_START.x, 0, PLAYER_START.z); scene.add(player);
const playerBody = new THREE.Group(); player.add(playerBody);
const npc = new THREE.Group(); npc.position.set(-3, 0, 16); scene.add(npc);
let playerRig = null, npcRig = null;
function setAvatar(key) {
  settings.avatar = key; store.set('avatar', key);
  playerBody.clear(); npc.clear(); playerRig = null; npcRig = null;
  const other = PARTNER[key] || 'boy';
  const fb = P.buildPlayer(); playerBody.add(fb);
  loadModel(AVATARS[key].model).then((src) => { if (!src) return; playerBody.remove(fb); const m = fitModel(src, AVATARS[key].size); playerBody.add(m); playerRig = AVATARS[key].hop ? null : autoRig(m, key); });
  loadModel(AVATARS[other].model).then((src) => { if (!src) return; const m = fitModel(src, AVATARS[other].size); npc.add(m); npcRig = autoRig(m, other); });
}

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

/* ---------- 캠퍼스를 오가는 사람들, 광장 안내 다람쥐 ---------- */
const CROWD = [
  { file: 'pe_teacher.glb', rig: 'teacher', size: 2.5, v: 2.3 }, { file: 'coach.glb', rig: 'coach', size: 2.4, v: 2.2 },
  { file: 'girl.glb', rig: 'girl', size: 2.3, v: 2.4 }, { file: 'kid.glb', rig: 'kid', size: 1.7, v: 2.0 },
  { file: 'girl_wheelchair.glb', rig: 'girl_wheelchair', size: 2.2, v: 2.4 }, { file: 'boy.glb', rig: 'boy', size: 2.4, v: 2.4 },
  { file: 'wheelchair.glb', rig: 'wheelchair', size: 2.2, v: 2.4 }, { file: 'kid.glb', rig: 'kid', size: 1.7, v: 2.1 }, { file: 'girl.glb', rig: 'girl', size: 2.3, v: 2.2 },
];
const WALK_PTS = [[-20, 17], [-6, 19], [6, 17], [12, 19], [22, 18], [31, 19], [40, 18], [-12, 4], [0, 7], [10, 3], [-2, -6], [20, -8], [-22, -2], [-36, 17], [0, -14], [36, -6], [-8, 24], [8, 26], [-24, 12], [25, 4]].map(([x, z]) => ({ x, z }));
const crowd = [];
// 지나가던 친구들이 학교를 재미있게 소개해요 (가까이 가면 말풍선이 떠요)
const LINES = {
  teacher: ['안녕! 여기는 한국교원대학교부설특수학교, 체육 중점 학교야 🏫', '우리 학교는 7가지 종목을 키워요. 수영, 육상, 탁구, 배드민턴, 태권도, 테니스, 유도!', '입학은 중학교 1학년부터예요. 중1이 되면 여기서 만나요! 😊', '실패해도 괜찮아요. 점수를 깎지 않고 도전을 응원해요 👏'],
  coach: ['태권도는 발차기로 송판 격파! 쾅! 🥋', '유도는 먼저 안전하게 넘어지는 법부터 배워요. 탁! 팔로 매트를 쳐요.', '운동장에서 축구공을 뻥 차 봤어요? 골대에 쏙 넣어 봐요! ⚽', '수영장 출발대에 올라서면 물이 한눈에 보여요 🏊'],
  girl: ['나는 탁구가 제일 좋아! 작은 공이 쌩쌩~ 🏓', '배드민턴은 셔틀콕이 하늘에서 천천히 내려와요. 눈으로 따라가 봐요! 🏸', '테니스는 라켓으로 공을 팡! 네트 너머로 보내요 🎾', '벚꽃나무 아래 벤치에 앉아서 쉬어 봐요. 앉기 버튼!'],
  kid: ['나도 중학생이 되면 이 학교에 올 거야! 🎒', '여기는 중학교 1학년부터 다닐 수 있대요!', '카페 의자에도 앉을 수 있어요. 빨간 우산 보여요? ☂️', '운동장에서 골을 넣으면 폭죽이 터져요 🎉'],
  girl_wheelchair: ['수영장에는 승강 의자가 있어서 휠체어 친구도 물에 들어가요 ♿🏊', '문턱이 없어서 어디든 갈 수 있어요!', '육상은 휠체어 레이싱도 해요. 쌩쌩! 🏁', '나는 탁구도 좋아해요. 탁구대 아래가 넓어서 편해요 🏓'],
  boy: ['난 육상이 좋아! 허들을 넘으면 기분이 상쾌해 🏃', '파란 휠체어 레이서 타 봤어요? 광장 왼쪽에 있어요!', '체육 중점 학교라서 운동을 많이 해요. 몸이 튼튼해져요 💪', '종목이 7개나 돼요. 다 체험하면 메달을 받아요 🥇'],
  wheelchair: ['휠체어 레이싱은 정말 빨라요! 바람이 쌩쌩 🌬️', '수영, 육상, 탁구… 휠체어 친구도 함께해요.', '체육관에서 메달을 모아 봐요 🥇', '이 학교는 모두가 함께 운동하는 곳이에요 🤝'],
};
function spawnCrowd() {
  const n = matchMedia('(max-width: 700px)').matches ? 5 : CROWD.length;
  const pts = WALK_PTS.filter((p) => !blockedAt(p.x, p.z, 1.2));
  for (let i = 0; i < n; i++) {
    const def = CROWD[i], start = pts[(i * 7 + 3) % pts.length];
    const g = new THREE.Group(); g.position.set(start.x, 0, start.z); g.rotation.y = i * 2.1; scene.add(g);
    const c = { g, def, rig: null, route: [], wait: Math.random() * 3, face: g.rotation.y, spd: 0 };
    loadModel(def.file).then((src) => { if (!src) return; const m = fitModel(src, def.size); g.add(m); c.rig = autoRig(m, def.rig); });
    crowd.push(c);
  }
}
function pickRoute(c) {
  const pts = WALK_PTS.filter((p) => !blockedAt(p.x, p.z, 1.2) && Math.hypot(p.x - c.g.position.x, p.z - c.g.position.z) > 8);
  const t = pts[Math.floor(Math.random() * pts.length)]; if (!t) return;
  c.route = findPath({ x: c.g.position.x, z: c.g.position.z }, t);
}
function updateCrowd(dt) {
  for (const c of crowd) {
    const p = c.g.position; let target = 0;
    if (!settings.calm) {
      const dp = Math.hypot(player.position.x - p.x, player.position.z - p.z);
      if (c.wait > 0) c.wait -= dt;
      else if (!c.route.length) { pickRoute(c); if (!c.route.length) c.wait = 2; }
      else if (dp > 4.2) {
        const t = c.route[0], dx = t.x - p.x, dz = t.z - p.z, d = Math.hypot(dx, dz);
        if (d < 0.5) { c.route.shift(); if (!c.route.length) c.wait = 2 + Math.random() * 5; }
        else { target = c.def.v; p.x += dx / d * target * dt; p.z += dz / d * target * dt; c.face = Math.atan2(dx, dz); }
      }
    }
    { const dxp = player.position.x - p.x, dzp = player.position.z - p.z, dp2 = Math.hypot(dxp, dzp); if (dp2 < 4.6 && !settings.calm) c.face = Math.atan2(dxp, dzp); }
    c.spd += (target - c.spd) * (1 - Math.exp(-6 * dt));
    let da = c.face - c.g.rotation.y; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
    c.g.rotation.y += da * (1 - Math.exp(-8 * dt));
    if (c.rig) c.rig.update(dt, c.spd * 2.2, c.def.size);
  }
}
const npcSay = document.createElement('div'); npcSay.id = 'npc-say'; npcSay.hidden = true; document.body.appendChild(npcSay);
const nsV = new THREE.Vector3(); let nsWho = null, nsT = 0, nsI = 0;
function updateNpcSay(dt) {
  let best = null, bd = 7.5; if (mode === 'world') for (const c of crowd) { if (!c.rig) continue; const d = Math.hypot(player.position.x - c.g.position.x, player.position.z - c.g.position.z); if (d < bd) { bd = d; best = c; } }
  if (!best) { if (!npcSay.hidden) npcSay.hidden = true; nsWho = null; return; }
  if (best !== nsWho) { nsWho = best; nsT = 0; nsI = Math.floor(Math.random() * 4); }
  nsT += dt; if (nsT > 5.5) { nsT = 0; nsI++; }
  const L = LINES[best.def.rig] || LINES.girl; const txt = L[nsI % L.length]; if (npcSay.textContent !== txt) npcSay.textContent = txt;
  nsV.set(best.g.position.x, best.def.size * 1.08, best.g.position.z).project(camera);
  if (nsV.z > 1) { npcSay.hidden = true; return; }
  npcSay.style.left = ((nsV.x * 0.5 + 0.5) * innerWidth) + 'px'; npcSay.style.top = ((-nsV.y * 0.5 + 0.5) * innerHeight) + 'px'; npcSay.hidden = false;
}
// 광장 안내 다람쥐: 제자리에서 통통 뛰며 가까이 오는 사람을 바라봐요.
const mascotG = new THREE.Group(); mascotG.position.set(GUIDE_POS.x, 0, GUIDE_POS.z); scene.add(mascotG); circles.push({ x: GUIDE_POS.x, z: GUIDE_POS.z, r: 1.0 });
loadModel('mascot.glb').then((src) => { if (!src) return; const m = fitModel(src, 3.4); mascotG.add(m); mascotG.userData.m = m; });
function updateMascot(t, dt) {
  const m = mascotG.userData.m; if (!m) return;
  const dx = player.position.x - GUIDE_POS.x, dz = player.position.z - GUIDE_POS.z, near = Math.hypot(dx, dz) < 12;
  if (near) { let da = Math.atan2(dx, dz) - mascotG.rotation.y; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2; mascotG.rotation.y += da * (1 - Math.exp(-5 * dt)); }
  if (settings.calm) { m.position.y *= 0.8; m.rotation.z *= 0.8; return; }
  const hop = near ? 0.22 : 0.08; m.position.y = Math.abs(Math.sin(t * (near ? 3.2 : 1.6))) * hop; m.rotation.z = Math.sin(t * (near ? 3.2 : 1.6)) * 0.05;
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

let camMix = 0, bobY = 0, seat = null, sitK = 0, camView = 0, camZoom = 1, riding = false;
const racer = { holder: decorHolder.racer, spot: null };
if (racer.holder) racer.spot = addSpot({ kind: 'ride', x: DECOR.find((d) => d.id === 'racer').x, z: DECOR.find((d) => d.id === 'racer').z, r: 2.6, label: '타기', ico: '🏁', say: '파란 레이싱 휠체어예요! 타기 버튼을 눌러 보세요.', tip: { x: DECOR.find((d) => d.id === 'racer').x, y: 2.6, z: DECOR.find((d) => d.id === 'racer').z } });
const nearSpot = () => { let best = null, bd = 1e9; for (const sp of spots) { if (sp.kind === 'ride' && riding) continue; const d = Math.hypot(player.position.x - sp.x, player.position.z - sp.z); if (d < sp.r && d < bd) { bd = d; best = sp; } } return best; };
function sitDown(sp) {
  if (sp.kind === 'ride') return mountRacer();
  cancelAuto(); vel.set(0, 0, 0); joy.x = joy.y = 0; seat = sp; player.position.set(sp.x, sp.y, sp.z); facing = sp.face; player.rotation.y = facing; say(sp.say, 4.5);
}
function standUp() {
  if (riding) return dismountRacer();
  if (!seat) return; const sp = seat; seat = null; if (sp.stand) player.position.set(sp.stand.x, sp.stand.y || 0, sp.stand.z); say('좋아요! 다시 둘러봐요.', 2);
}
function mountRacer() {
  cancelAuto(); vel.set(0, 0, 0); riding = true; seat = null; const c = decorCircle.racer; if (c) c.r = 0;
  player.position.set(racer.spot.x, 0, racer.spot.z); say('출발! 방향 버튼으로 쌩쌩 달려요. 내리려면 내리기 버튼!', 5);
}
function dismountRacer() {
  riding = false; const c = decorCircle.racer, h = racer.holder; if (c && h) { c.x = h.position.x; c.z = h.position.z; c.r = 1.2; } if (racer.spot && h) { racer.spot.x = h.position.x; racer.spot.z = h.position.z; racer.spot.tip = { x: h.position.x, y: 2.6, z: h.position.z }; }
  const f = facing; player.position.x += Math.sin(f + Math.PI / 2) * 2.2; player.position.z += Math.cos(f + Math.PI / 2) * 2.2; say('멋진 드라이브였어요!', 2.5);
}
const groundY = (x, z) => { if (x > POOL.deck.x0 && x < POOL.deck.x1 && z > POOL.deck.z0 && z < POOL.deck.z1) { const w = POOL.water; return (x > w.x0 && x < w.x1 && z > w.z0 && z < w.z1) ? -0.25 : 0.28; } return 0; };
// 축구
function kickBall(power, dirx, dirz) { const l = Math.hypot(dirx, dirz) || 1; ball.vx = dirx / l * power; ball.vz = dirz / l * power; ball.hop = 0.001; }
function nearBall() { return Math.hypot(player.position.x - ball.x, player.position.z - ball.z) < 3.0 && !seat && !riding; }
function updateBall(dt, sp) {
  const p = player.position, dx = ball.x - p.x, dz = ball.z - p.z, d = Math.hypot(dx, dz);
  if (ball.reset > 0) { ball.reset -= dt; if (ball.reset <= 0) { ball.x = FIELD.cx; ball.z = FIELD.cz; ball.vx = ball.vz = 0; ball.m.visible = true; } }
  else {
    if (d < 1.25 && sp > 0.8 && !seat && !riding) { const base = Math.max(6, sp * 1.7); kickBall(base, dx * 0.8 + vel.x * 0.35, dz * 0.8 + vel.z * 0.35); ball.x = p.x + dx / (d || 1) * 1.3; ball.z = p.z + dz / (d || 1) * 1.3; }
    ball.x += ball.vx * dt; ball.z += ball.vz * dt; const fr = Math.exp(-0.95 * dt); ball.vx *= fr; ball.vz *= fr;
    const inGoalZ = Math.abs(ball.z - FIELD.goalZ) < FIELD.goalHalf;
    for (const side of [-1, 1]) { const lim = side < 0 ? FIELD.x0 : FIELD.x1; if ((side < 0 && ball.x < lim) || (side > 0 && ball.x > lim)) { if (inGoalZ) { ball.vx = ball.vz = 0; ball.reset = 2.6; ball.goals++; ball.m.visible = false; goalParty(lim, side); } else { ball.x = lim; ball.vx *= -0.55; } } }
    if (ball.z < FIELD.z0) { ball.z = FIELD.z0; ball.vz *= -0.55; } if (ball.z > FIELD.z1) { ball.z = FIELD.z1; ball.vz *= -0.55; }
    // 공이 필드 밖으로 나온 사람에게 밀리지 않게 가운데로 되돌림 (사람이 공을 들고 나가면 리셋)
    if (Math.hypot(p.x - FIELD.cx, p.z - FIELD.cz) > 24 && Math.hypot(ball.vx, ball.vz) < 0.2) { ball.x = FIELD.cx; ball.z = FIELD.cz; }
  }
  if (ball.hop > 0) { ball.hop += dt; if (ball.hop > 0.5) ball.hop = 0; }
  const spd = Math.hypot(ball.vx, ball.vz); ball.m.position.set(ball.x, 0.5 + (ball.hop ? Math.sin(ball.hop / 0.5 * Math.PI) * 0.5 : 0), ball.z);
  if (spd > 0.05) { ball.m.rotation.z -= ball.vx * dt / 0.5; ball.m.rotation.x += ball.vz * dt / 0.5; }
  for (const c of confetti) if (c.life > 0) { c.life -= dt; c.m.position.x += c.vx * dt; c.m.position.y += c.vy * dt; c.m.position.z += c.vz * dt; c.vy -= 9 * dt; c.m.rotation.x += 6 * dt; c.m.rotation.y += 4 * dt; if (c.life <= 0 || c.m.position.y < 0) { c.life = 0; c.m.visible = false; } }
}
function goalParty(gx, side) {
  say(`골~!! ⚽ 멋진 슛이에요! (${ball.goals}골)`, 3.5); medalPop(`골! ${ball.goals}번째 슛 성공!`);
  confetti.forEach((c, i) => { c.m.visible = true; c.life = 1.6; c.m.position.set(gx - side * 1.2, 2.2, FIELD.goalZ + (i % 7 - 3) * 0.5); c.vx = -side * (1 + Math.random() * 3); c.vy = 5 + Math.random() * 4; c.vz = (Math.random() - 0.5) * 6; });
}
const onField = () => Math.abs(player.position.x - FIELD.cx) < 9.6 && Math.abs(player.position.z - FIELD.cz) < 6.4;

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
  if (seat || riding) return standUp();
  const sp0 = nearSpot(); if (sp0) return sitDown(sp0);
  if (nearBall() && onField()) { const dx = Math.sin(facing), dz = Math.cos(facing); const bx = ball.x - player.position.x, bz = ball.z - player.position.z; kickBall(15, dx + bx * 0.15, dz + bz * 0.15); say('뻥! ⚽ 골대에 넣어 봐요!', 2); return; }
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
  frame.src = `${s.url}${s.url.includes('?') ? '&' : '?'}level=${lv}&play=1`;
}
frame.addEventListener('load', () => {
  clearInterval(autoStart); if (!frame.src.includes('games/oks')) return; let n = 0, started = false; // 수업용 안내를 건너뛰고 바로 시작
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
function goHome() {
  cancelAuto(); vel.set(0, 0, 0); joy.x = joy.y = 0; clearInterval(autoStart);
  transition(() => { frame.src = 'about:blank'; for (const id of ['lobby', 'game', 'info', 'settings']) { const e = document.getElementById(id); if (e) e.hidden = true; } $('#title').hidden = false; setMode('title'); });
}
document.querySelectorAll('[data-home]').forEach((b) => b.addEventListener('click', goHome));
$('#home').addEventListener('click', goHome);
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
const clock = new THREE.Clock(); const camPos = new THREE.Vector3(); let camInit = false; const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
let topDown = false, camDbg = null;

/* ---------- 종목 위에 떠 있는 '들어가기' 말풍선 ---------- */
const tipEl = document.createElement('button'); tipEl.id = 'zone-tip'; tipEl.hidden = true; tipEl.type = 'button';
tipEl.innerHTML = '<span class="ti"></span><b></b><i>▼</i>'; document.body.appendChild(tipEl);
let tipZone = null; const tipV = new THREE.Vector3();
tipEl.addEventListener('click', (e) => { e.stopPropagation(); if (tipZone) { if (tipZone.ico) { if (seat || riding) standUp(); else sitDown(tipZone); } else enterZone(tipZone); } });
tipEl.addEventListener('pointerdown', (e) => e.stopPropagation());
function updateTip() {
  let best = null, bd = 1e9;
  if (mode === 'world' && !route) {
    for (const z of zones) { const d = Math.hypot(player.position.x - z.x, player.position.z - z.z); if (d < z.r + 9 && d < bd) { bd = d; best = z; } }
    if (seat || riding) best = seat || racer.spot;
    else for (const sp of spots) { const d = Math.hypot(player.position.x - sp.x, player.position.z - sp.z); if (d < sp.r + 4 && d < bd) { bd = d; best = sp; } }
  }
  if (!best) { if (!tipEl.hidden) { tipEl.hidden = true; tipZone = null; } return; }
  tipV.set(best.tip.x, best.tip.y, best.tip.z).project(camera);
  if (tipV.z > 1) { tipEl.hidden = true; return; }
  const stKey = (seat || riding) ? 's' : 'n';
  if (tipZone !== best || tipEl.dataset.k !== stKey) {
    tipEl.dataset.k = stKey; tipZone = best; tipEl.className = best.open ? 'open' : 'soon';
    if (best.ico) { tipEl.className = 'open'; tipEl.querySelector('.ti').textContent = best.ico; tipEl.querySelector('b').textContent = (seat || riding) ? (riding ? '내리기' : '일어나기') : best.label; }
    else {
    tipEl.querySelector('.ti').textContent = best.kind === 'info' ? '📖' : best.open ? '🚪' : '🔒';
    tipEl.querySelector('b').textContent = best.kind === 'info' ? `${best.label} 알아보기` : best.open ? `${best.label} 들어가기` : `${best.label} 곧 열려요`; }
  }
  const near = best.ico ? true : bd < best.r + 0.6; tipEl.classList.toggle('near', near);
  tipEl.style.left = ((tipV.x * 0.5 + 0.5) * innerWidth) + 'px'; tipEl.style.top = ((-tipV.y * 0.5 + 0.5) * innerHeight) + 'px';
  tipEl.hidden = false;
}

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
    if (seat && l > 0.5 && !route) standUp();
    if (seat) { ix = iz = 0; l = 0; }
    if (route) {
      const p = player.position; let wp = route[0];
      while (route.length > 1 && Math.hypot(wp.x - p.x, wp.z - p.z) < 0.9) { route.shift(); wp = route[0]; }
      const dx = wp.x - p.x, dz = wp.z - p.z, d = Math.hypot(dx, dz);
      if (route.length === 1 && d < 0.7) cancelAuto(); else { ix = dx / d; iz = dz / d; l = 1; }
    }
    const speed = (settings.easy ? 6.4 : 9) * (riding ? 1.55 : 1);
    vel.lerp(tmp.set(ix * speed, 0, iz * speed), 1 - Math.exp(-(settings.easy ? 9 : 12) * dt));
    const p = player.position; if (!seat) { p.x += vel.x * dt; p.z += vel.z * dt; resolve(p, riding ? 0.95 : 0.6); }
    const sp = Math.hypot(vel.x, vel.z);
    if (sp > 0.3) { const a = Math.atan2(vel.x, vel.z); let da = a - facing; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2; facing += da * (1 - Math.exp(-14 * dt)); }
    player.rotation.y = facing;
    { const ty = seat ? seat.y : groundY(p.x, p.z); p.y += (ty - p.y) * (1 - Math.exp(-(seat ? 8 : 12) * dt)); }
    sitK += (((seat && seat.kind === 'sit') || riding ? 1 : 0) - sitK) * (1 - Math.exp(-9 * dt));
    camMix += ((seat && seat.camOff ? 1 : 0) - camMix) * (1 - Math.exp(-3.5 * dt));
    { const hide = camView > 0.25; for (const l of labelSprites) l.visible = !hide; }
    camView += ((seat && seat.kind === 'view' ? 1 : 0) - camView) * (1 - Math.exp(-3.5 * dt));
    camZoom += ((seat && seat.kind === 'sit' ? 0.72 : riding ? 0.9 : 1) - camZoom) * (1 - Math.exp(-3 * dt));
    if (racer.holder && riding) { racer.holder.position.set(p.x, 0, p.z); racer.holder.rotation.y = facing; }
    playerBody.userData.sit = sitK; if (playerRig && playerRig.setSit) playerRig.setSit(sitK);
    updateBall(dt, Math.hypot(vel.x, vel.z));
    updateCrowd(dt); updateNpcSay(dt); updateMascot(t, dt);
    if (playerRig) playerRig.update(dt, settings.calm ? 0 : sp, AVATARS[settings.avatar].size);
    if (npcRig) npcRig.update(dt, 0);
    if (sp > 0.3 && !settings.calm) { walkT += dt * sp * 1.4; const hop = AVATARS[settings.avatar].hop ? 2.6 : 1; bobY = Math.abs(Math.sin(walkT * (hop > 1 ? 1.5 : 1))) * 0.09 * hop; playerBody.rotation.z = Math.sin(walkT) * 0.05 * hop; } else { bobY *= 0.8; playerBody.rotation.z *= 0.8; }
    playerBody.position.y = bobY - (!playerRig ? 0.35 * sitK : 0) + (riding ? 0.18 * sitK : 0); playerBody.position.z = riding ? -0.55 * sitK : 0;

    // 주변 확인
    const zn = zoneNear(p.x, p.z);
    nearLocked = null; for (const b of boxes) if (b.locked) { const nx = Math.max(b.x0, Math.min(p.x, b.x1)), nz = Math.max(b.z0, Math.min(p.z, b.z1)); if (Math.hypot(p.x - nx, p.z - nz) < 3.2) nearLocked = b; }
    const act = $('#act'); let label = '안내', ico = '👣';
    const spN = (seat || riding) ? null : nearSpot(), ballN = !seat && !riding && onField() && nearBall();
    if (seat || riding) { label = riding ? '내리기' : '일어나기'; ico = '🧍'; }
    else if (spN) { label = spN.label; ico = spN.ico; }
    else if (ballN) { label = '공 차기'; ico = '⚽'; }
    else if (zn) { label = zn.open ? '들어가기' : '알아보기'; ico = zn.open ? '🚪' : '❓'; } else if (nearLocked) { label = '알아보기'; ico = '❓'; }
    if (act.dataset.label !== label) { act.dataset.label = label; act.querySelector('b').textContent = label; act.querySelector('span').textContent = ico; }
    act.classList.toggle('ready', !!((zn && zn.open) || spN || ballN || seat || riding));
    if (sayTimer > 0) sayTimer -= dt;
    else if (spN) say(spN.hint || (spN.kind === 'ride' ? spN.say : spN.kind === 'view' ? '출발대에 올라설 수 있어요! 서기 버튼을 눌러요.' : '앉을 수 있어요! 앉기 버튼을 눌러요.'));
    else if (ballN) say('공이 있어요! 걸어가서 차거나 버튼을 눌러요. 골대에 넣어 봐요!');
    else if (onField() && !zn) say('운동장이에요! 공을 발로 차서 양쪽 골대에 넣어 봐요.');
    else if (zn) say(!zn.open ? `${zn.label}은(는) 곧 열려요!` : settings.easy ? `${zn.label}! 잠깐 서 있으면 들어가요.` : `${zn.label}! 들어가기 버튼을 눌러요.`);
    else if (nearLocked) say(`${nearLocked.label}이에요. 곧 문을 열어요!`);
    else if (Math.hypot(p.x - GUIDE_POS.x, p.z - GUIDE_POS.z) < 6) say('안녕! 나는 안내 다람쥐야. 노란 핀이 있는 곳으로 가 봐요.');
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
  npc.rotation.y = Math.sin(t * 0.5) * 0.4;

  // 카메라: 고정 각도로 따라감
  const portrait = camera.aspect < 0.85; const dist = (portrait ? 1.7 : 1.0) * camZoom;
  if (camDbg) { camera.position.set(...camDbg.pos); camera.up.set(0, 1, 0); camera.lookAt(...camDbg.look); scene.fog = null; }
  else if (topDown) { camera.position.set(0, 120, 8); camera.up.set(0, 0, -1); camera.lookAt(0, 0, 4); scene.fog = null; }
  else if (mode === 'title') {
    const a = t * 0.05 + 0.6, R = portrait ? 105 : 78;
    camPos.set(Math.sin(a) * R, portrait ? 52 : 40, Math.cos(a) * R * 0.8 - 6); camInit = true; camera.position.copy(camPos); camera.lookAt(0, 0, -4);
  } else {
    tmp.set(player.position.x, 0, player.position.z).add(new THREE.Vector3(0, 17 * dist, 15.5 * dist));
    if (camMix > 0.001 && seat && seat.camOff) tmp.lerp(tmp2.set(player.position.x + (seat.camOff[2] || 0), player.position.y + seat.camOff[0], player.position.z + seat.camOff[1]), camMix);
    if (camView > 0.001) { const f = player.rotation.y; tmp.lerp(tmp2.set(player.position.x - Math.sin(f) * 6.5, player.position.y + 6.2, player.position.z - Math.cos(f) * 6.5), camView); }
    if (!camInit) { camPos.copy(tmp); camInit = true; }
    camPos.lerp(tmp, 1 - Math.exp(-(calm ? 20 : 5) * dt)); camera.position.copy(camPos);
    const lx = player.position.x * 0.98, lz = player.position.z * 0.98 - 2.2;
    if (camView > 0.001) { const f = player.rotation.y; camera.lookAt(THREE.MathUtils.lerp(lx, player.position.x + Math.sin(f) * 10, camView), THREE.MathUtils.lerp(1.2, 0.2, camView), THREE.MathUtils.lerp(lz, player.position.z + Math.cos(f) * 10, camView)); }
    else camera.lookAt(lx, 1.2, lz);
  }
  sun.position.set(player.position.x - 22, 38, player.position.z + 16); sun.target.position.copy(player.position); sun.target.updateMatrixWorld();
  updateTip();
  renderer.render(scene, camera);
  if (mode === 'world') drawMap(t);
}
setAvatar(settings.avatar); spawnCrowd();
frameLoop();

// 점검용
function debugShow() { // 충돌 범위와 입장 원을 위에서 본 모습으로 확인
  const m = new THREE.MeshBasicMaterial({ color: 0xff2255, transparent: true, opacity: 0.35 });
  boxes.forEach((b) => { const o = new THREE.Mesh(new THREE.BoxGeometry(b.x1 - b.x0, 2, b.z1 - b.z0), m); o.position.set((b.x0 + b.x1) / 2, 1, (b.z0 + b.z1) / 2); scene.add(o); });
  circles.forEach((c) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(c.r, c.r, 2, 16), m); o.position.set(c.x, 1, c.z); scene.add(o); });
  const m2 = new THREE.MeshBasicMaterial({ color: 0x00ccff }); spots.forEach((sp) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 6, 8), m2); o.position.set(sp.x, 3, sp.z); scene.add(o); });
}
window.__ssw = { crowd, spots, ball, FIELD, POOL, get seat() { return seat; }, get riding() { return riding; }, sitDown, standUp, kickBall, blockedAt, player, get mode() { return mode; }, enterGym, openGame, enterZone, zones, SPORTS, scene, camera, boxes, circles, debugShow, topDown: (v = true) => { topDown = v; }, setCam: (pos, look) => { camDbg = pos ? { pos, look } : null; }, findPath, loadedOk, loadedFail, medals, flags, startGuide, get route() { return route; }, setAvatar };
