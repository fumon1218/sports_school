import * as THREE from '../vendor/three/three.module.js';
import { GLTFLoader } from '../vendor/three/addons/loaders/GLTFLoader.js';
import { CONFIG, SPORTS, BUILDINGS, PROPS, WORLD, PLAYER_START, GYM_PORTAL, GUIDE_POS } from './config.js';
import * as P from './placeholders.js';

const $ = (s) => document.querySelector(s);
const store = {
  get(k, d) { try { const v = localStorage.getItem('ssw_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('ssw_' + k, JSON.stringify(v)); } catch (e) { /* 저장 불가여도 계속 진행 */ } },
};
const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const settings = { easy: store.get('easy', true), calm: store.get('calm', prefersReduced) };
const medals = store.get('medals', {});

/* ---------- 화면 글자 ---------- */
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
scene.fog = new THREE.Fog(SKY, 70, 150);
const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 400);

scene.add(new THREE.HemisphereLight(0xffffff, 0xb9d9a8, 1.25));
const sun = new THREE.DirectionalLight(0xfff3dc, 2.1);
sun.castShadow = true;
sun.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 5, far: 120 });
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);

/* ---------- 땅 ---------- */
function ground() {
  const g = new THREE.Mesh(new THREE.PlaneGeometry(220, 200), P.mat(0xa9dc98, { flatShading: false }));
  g.rotation.x = -Math.PI / 2; g.receiveShadow = true; scene.add(g);
  // 광장 (둥근 돌판) + 가운데 별
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(12, 64), P.mat(0xece7dc, { flatShading: false }));
  plaza.rotation.x = -Math.PI / 2; plaza.position.set(0, 0.03, 2); plaza.receiveShadow = true; scene.add(plaza);
  const ringL = new THREE.Mesh(new THREE.RingGeometry(9.2, 9.6, 64), new THREE.MeshBasicMaterial({ color: 0xbfd7f5 }));
  ringL.rotation.x = -Math.PI / 2; ringL.position.set(0, 0.05, 2); scene.add(ringL);
  const star = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 1.6 : 3.8, a = i * Math.PI / 5 - Math.PI / 2; i ? star.lineTo(Math.cos(a) * r, Math.sin(a) * r) : star.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  const starM = new THREE.Mesh(new THREE.ShapeGeometry(star), new THREE.MeshBasicMaterial({ color: 0xffd966 }));
  starM.rotation.x = -Math.PI / 2; starM.position.set(0, 0.06, 2); scene.add(starM);
  // 길: 정문→광장, 광장→체육관
  const path = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), P.mat(0xf3eee3, { flatShading: false })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.035, z); m.receiveShadow = true; scene.add(m); };
  path(6, 12, 0, 21.5); path(7, 8, 0, -9.5);
  path(18, 4.5, -17, 4); path(18, 4.5, 17, 4);
  // 체육관 앞 경사로 (완만한 쐐기)
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.1, 3.4), P.mat(0xd9d1c2));
  const rampG = new THREE.Group(); const slab = P.box(5.6, 0.5, 3.0, P.mat(0xd9d1c2)); slab.position.set(0, 0.2, -14.2); slab.rotation.x = 0.14; rampG.add(slab);
  scene.add(rampG);
}
ground();

/* ---------- 충돌 ---------- */
const boxes = [];   // {x0,x1,z0,z1}
const circles = []; // {x,z,r}

/* ---------- 건물 ---------- */
const holders = {};    // id -> Group (모델이 들어가는 자리)
const swapTargets = []; // glb 교체 대상
function placeBuilding(b) {
  const holder = new THREE.Group(); holder.position.set(b.x, 0, b.z); scene.add(holder);
  const ph = b.id === 'gym' ? P.buildGym(b) : P.buildBlock(b);
  holder.add(ph); holders[b.id] = holder;
  swapTargets.push({ cfg: b, holder, placeholder: ph });
  boxes.push({ x0: b.x - b.w / 2, x1: b.x + b.w / 2, z0: b.z - b.d / 2, z1: b.z + b.d / 2, id: b.id, locked: !b.enter, label: b.label });
  // 간판 (빈 판 위에 앱이 글자를 얹음)
  const sign = P.signPlate(CONFIG.signs[b.sign] || b.label, b.id === 'gym' ? 8 : 6, 1.5);
  sign.position.set(b.x, b.signY ?? 5, b.z + b.d / 2 + 0.18); scene.add(sign);
}
BUILDINGS.forEach(placeBuilding);

function placeProp(p) {
  const holder = new THREE.Group(); holder.position.set(p.x, 0, p.z); scene.add(holder);
  const ph = p.id === 'gate' ? P.buildGate(p) : P.buildTrack(p);
  holder.add(ph); holders[p.id] = holder; swapTargets.push({ cfg: p, holder, placeholder: ph });
}
PROPS.forEach(placeProp);
// 정문 기둥과 울타리 충돌
boxes.push({ x0: -6.1, x1: -4.3, z0: 28.2, z1: 29.8 }, { x0: 4.3, x1: 6.1, z0: 28.2, z1: 29.8 });
boxes.push({ x0: -40, x1: -6.1, z0: 29.6, z1: 31 }, { x0: 6.1, x1: 40, z0: 29.6, z1: 31 });
// 정문 간판
const gateSign = P.signPlate(CONFIG.signs.gate, 7.6, 1.4); gateSign.position.set(0, 5.2, 29.72); scene.add(gateSign);
// 산울타리 (정문 양옆)
for (const sx of [-1, 1]) { const h = P.box(30, 1.4, 1.2, P.mat(0x63b565)); h.position.set(sx * 21.1, 0.7, 30.4); scene.add(h); }

/* ---------- 나무 ---------- */
function trees() {
  const spots = [[-12, 24, 'cherry'], [12, 24, 'cherry'], [-12, 14, 'cherry'], [12, 14, 'cherry'], [-9, -4, 'cherry'], [9, -4, 'cherry'], [-14, -14, 'green'], [14, -14, 'green'],
    [-33, 4, 'green'], [-33, -20, 'green'], [33, 4, 'green'], [33, -20, 'green'], [-20, -26, 'green'], [20, -26, 'green'], [-34, 26, 'green'], [34, 26, 'green'],
    [-16, 28, 'green'], [16, 28, 'green'], [30, -26, 'cherry'], [-30, -26, 'cherry'], [14, 8, 'green'], [-14, 8, 'green']];
  spots.forEach(([x, z, k]) => { const t = P.buildTree(k); t.position.set(x, 0, z); t.rotation.y = (x * 7 + z * 3) % 6; t.scale.setScalar(0.9 + ((x * z) % 5) / 20); scene.add(t); circles.push({ x, z, r: 0.7 }); });
}
trees();

/* ---------- 포털, 마커, 안내원, 주인공 ---------- */
const portal = P.buildPortal(); portal.position.set(GYM_PORTAL.x, 0.3, GYM_PORTAL.z); scene.add(portal);
const marker = P.buildMarker(); marker.position.set(GYM_PORTAL.x, 4.4, GYM_PORTAL.z); scene.add(marker);
const player = P.buildPlayer(); player.position.set(PLAYER_START.x, 0, PLAYER_START.z); scene.add(player);
let guide = null;
new THREE.TextureLoader().load('assets/ui/mascot.png', (t) => { t.colorSpace = THREE.SRGBColorSpace; guide = P.buildGuide(t); guide.position.set(GUIDE_POS.x, 0, GUIDE_POS.z); scene.add(guide); });

/* ---------- 정문이 카메라를 가릴 때 투명하게 ---------- */
let gateMats = null, gateAlpha = 1;
function collectGateMats() {
  const set = new Set(); holders.gate.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => set.add(m)); });
  if (gateSign.material) set.add(gateSign.material);
  gateMats = [...set].map((m) => ({ m, o: m.opacity, t: m.transparent }));
}
function fadeGate(dt) {
  if (!gateMats) collectGateMats();
  const want = camera.position.z > 27.5 ? 0.12 : 1;
  gateAlpha += (want - gateAlpha) * (1 - Math.exp(-8 * dt));
  const on = gateAlpha < 0.995;
  for (const g of gateMats) { g.m.transparent = on || g.t; g.m.opacity = g.o * gateAlpha; g.m.depthWrite = !on; }
}

/* ---------- glb 교체 ---------- */
// assets/models/ 에 config.js 에 적힌 이름의 glb 가 있으면 자동으로 임시 도형을 대신합니다.
const loader = new GLTFLoader();
const swapped = [];
async function trySwap(t) {
  const { cfg, holder, placeholder } = t;
  let gltf;
  try { gltf = await loader.loadAsync(`assets/models/${cfg.model}`); } catch (e) { return; }
  const wrap = new THREE.Group();
  wrap.add(gltf.scene);
  wrap.rotation.y = THREE.MathUtils.degToRad(cfg.rotY || 0);
  wrap.updateMatrixWorld(true);
  let bb = new THREE.Box3().setFromObject(wrap), sz = bb.getSize(new THREE.Vector3());
  if (!isFinite(sz.x) || sz.x === 0) return;
  const s = Math.min(cfg.w / sz.x, cfg.d / sz.z, (cfg.h * 1.7) / sz.y);
  wrap.scale.setScalar(s); wrap.updateMatrixWorld(true);
  bb = new THREE.Box3().setFromObject(wrap);
  const c = bb.getCenter(new THREE.Vector3());
  wrap.position.set(-c.x, -bb.min.y, -c.z);
  wrap.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
  holder.remove(placeholder); holder.add(wrap); swapped.push(cfg.id);
  console.info('[모델 적용]', cfg.model);
}
Promise.all(swapTargets.map(trySwap)).then(() => { gateMats = null; if (swapped.length) showToast(`모델 ${swapped.length}개 적용됨`); });

/* ---------- 입력 ---------- */
const keys = new Set();
addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  keys.add(e.key.toLowerCase());
  if ((e.key === ' ' || e.key === 'Enter') && mode === 'world' && !e.repeat) doAction();
  if (e.key === 'Escape' && mode !== 'world' && mode !== 'title') closeOverlay();
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());

const pad = $('#pad'), knob = $('#knob'); const joy = { x: 0, y: 0, id: null };
function padMove(e) {
  const r = pad.getBoundingClientRect(); const R = r.width / 2;
  let dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R); const len = Math.hypot(dx, dy);
  const k = len > R * 0.8 ? (R * 0.8) / len : 1; dx *= k; dy *= k;
  knob.style.transform = `translate(${dx}px,${dy}px)`;
  const m = Math.hypot(dx, dy) / (R * 0.8); const dead = 0.18;
  if (m < dead) { joy.x = joy.y = 0; return; }
  joy.x = dx / (R * 0.8); joy.y = dy / (R * 0.8);
}
pad.addEventListener('pointerdown', (e) => { joy.id = e.pointerId; pad.setPointerCapture(e.pointerId); cancelAuto(); padMove(e); e.preventDefault(); });
pad.addEventListener('pointermove', (e) => { if (e.pointerId === joy.id) padMove(e); });
const padEnd = (e) => { if (e.pointerId !== joy.id) return; joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; };
pad.addEventListener('pointerup', padEnd); pad.addEventListener('pointercancel', padEnd);

$('#act').addEventListener('click', () => doAction());

/* ---------- 상태 ---------- */
let mode = 'title'; // title | world | lobby | game
const vel = new THREE.Vector3(); let facing = 0; let walkT = 0;
let auto = null; // {x,z} 자동 안내 목표
let dwell = 0; let nearLocked = null;
const groundY = (x, z) => (Math.abs(x) < 2.8 && z < -12.6 && z > -15.6) ? (-12.6 - z) / 3 * 0.46 : 0;

function cancelAuto() { if (auto) { auto = null; $('#act').classList.remove('guiding'); } }
function doAction() {
  if (mode !== 'world') return;
  const dp = Math.hypot(player.position.x - GYM_PORTAL.x, player.position.z - GYM_PORTAL.z);
  if (dp < GYM_PORTAL.r + 0.6) return enterGym();
  if (nearLocked) { say(`${nearLocked.label}은(는) 곧 문을 열어요. 먼저 체육관에 가 볼까요?`); return; }
  auto = { x: GYM_PORTAL.x, z: GYM_PORTAL.z }; $('#act').classList.add('guiding'); say('따라와요! 체육관으로 안내할게요.');
}

function resolve(p, r) {
  for (let it = 0; it < 3; it++) {
    for (const b of boxes) {
      const nx = Math.max(b.x0, Math.min(p.x, b.x1)), nz = Math.max(b.z0, Math.min(p.z, b.z1));
      let dx = p.x - nx, dz = p.z - nz; const d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x += dx / d * (r - d); p.z += dz / d * (r - d); }
        else { // 상자 안쪽: 가장 가까운 면으로 밀어냄
          const l = p.x - b.x0, rr = b.x1 - p.x, t = p.z - b.z0, bt = b.z1 - p.z, m = Math.min(l, rr, t, bt);
          if (m === l) p.x = b.x0 - r; else if (m === rr) p.x = b.x1 + r; else if (m === t) p.z = b.z0 - r; else p.z = b.z1 + r;
        }
      }
    }
    for (const c of circles) {
      const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), rr = r + c.r;
      if (d < rr && d > 1e-6) { p.x += dx / d * (rr - d); p.z += dz / d * (rr - d); }
    }
  }
  p.x = Math.max(WORLD.minX, Math.min(WORLD.maxX, p.x)); p.z = Math.max(WORLD.minZ, Math.min(WORLD.maxZ, p.z));
}

/* ---------- 안내 말풍선 ---------- */
let sayTimer = 0, lastSay = '';
function say(t, hold = 0) { if (t === lastSay && !hold) return; lastSay = t; $('#guide-text').textContent = t; if (hold) sayTimer = hold; }
function showToast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(showToast._t); showToast._t = setTimeout(() => el.classList.remove('show'), 2400); }

/* ---------- 화면 전환 ---------- */
const fade = $('#fade');
function transition(fn) {
  fade.classList.add('on');
  setTimeout(() => { fn(); requestAnimationFrame(() => fade.classList.remove('on')); }, settings.calm ? 80 : 380);
}
function setMode(m) { mode = m; document.body.dataset.mode = m; }

function enterGym() {
  cancelAuto(); vel.set(0, 0, 0); joy.x = joy.y = 0;
  transition(() => { setMode('lobby'); renderLobby(); $('#lobby').hidden = false; $('#lobby .sport.open')?.focus({ preventScroll: true }); });
}
function closeOverlay() {
  if (mode === 'game') return closeGame();
  if (mode === 'lobby') transition(() => {
    $('#lobby').hidden = true; setMode('world');
    player.position.set(GYM_PORTAL.x, groundY(0, -11.2), -11.2); dwell = -1.5; // 나오자마자 다시 들어가지 않게 잠시 쉼
    say('체육관 구경 잘했어요! 광장도 둘러볼까요?');
  });
}
$('#lobby-back').addEventListener('click', closeOverlay);

/* ---------- 체육관 로비 ---------- */
function renderLobby() {
  const grid = $('#sports'); grid.innerHTML = '';
  SPORTS.forEach((s) => {
    const b = document.createElement('button'); b.type = 'button';
    b.className = 'sport ' + (s.open ? 'open' : 'soon'); b.style.setProperty('--c', s.color);
    b.innerHTML = `<span class="emo" aria-hidden="true">${s.emo}</span><b>${s.name}</b><small>${s.sub}</small>${medals[s.id] ? '<i class="medal" title="참여 메달">🏅</i>' : ''}`;
    b.setAttribute('aria-label', `${s.name}. ${s.open ? '체험하기' : '준비 중'}`);
    b.addEventListener('click', () => { if (s.open) openGame(s); else showToast(`${s.name}은(는) 곧 열려요!`); });
    grid.appendChild(b);
  });
  const got = SPORTS.filter((s) => medals[s.id]).length;
  $('#medal-row').innerHTML = SPORTS.map((s) => `<span class="mslot ${medals[s.id] ? 'got' : ''}" title="${s.name}">${medals[s.id] ? '🏅' : s.emo}</span>`).join('');
  $('#medal-count').textContent = `${got} / ${SPORTS.length}`;
}

/* ---------- 게임 열기 (기존 게임을 그대로 연결) ---------- */
let curSport = null, gameOpenedAt = 0, autoStart = 0;
const frame = $('#game-frame');
function openGame(s) {
  curSport = s; gameOpenedAt = Date.now();
  const lv = settings.easy ? CONFIG.levelEasy : CONFIG.levelNormal;
  $('#game-title').textContent = `${s.emo} ${s.name}`;
  $('#game').hidden = false; setMode('game');
  frame.src = `${s.url}&level=${lv}&play=1`;
}
frame.addEventListener('load', () => {
  // 수업용 목차·시작 안내를 건너뛰고 바로 시작 (같은 출처일 때만 가능)
  clearInterval(autoStart); let n = 0, started = false;
  autoStart = setInterval(() => {
    n++; if (n > 40) return clearInterval(autoStart);
    try {
      const d = frame.contentDocument; if (!d || !d.body) return;
      if (!d.getElementById('ssw-style')) {
        const st = d.createElement('style'); st.id = 'ssw-style';
        st.textContent = 'a.oks-pill,a.oks-extra{display:none!important}'; // 수업용 목차·학습지 인쇄 링크 숨김
        d.head.appendChild(st);
      }
      const vis = (x) => x.offsetParent !== null;
      const lv = [...d.querySelectorAll('button.oks-lv')].filter(vis);
      if (lv.length) { // 난이도 고르기: 쉬운 모드는 두 번째(쉬움), 일반은 기본 선택
        const pick = settings.easy ? (lv[1] || lv[0]) : (lv.find((x) => x.classList.contains('on')) || lv[0]);
        pick.click(); return clearInterval(autoStart);
      }
      if (!started) {
        const btn = [...d.querySelectorAll('button')].find((x) => /시작하기/.test(x.textContent) && vis(x));
        if (btn) { btn.click(); started = true; }
      }
    } catch (e) { clearInterval(autoStart); }
  }, 250);
});
function closeGame() {
  clearInterval(autoStart);
  const played = Date.now() - gameOpenedAt > 12000;
  frame.src = 'about:blank'; $('#game').hidden = true; setMode('lobby');
  if (curSport && played && !medals[curSport.id]) { medals[curSport.id] = true; store.set('medals', medals); showToast(`${curSport.name} 참여 메달을 받았어요! 🏅`); }
  renderLobby();
}
$('#game-back').addEventListener('click', closeGame);

/* ---------- 설정 ---------- */
const setPanel = $('#settings');
$('#gear').addEventListener('click', () => { setPanel.hidden = !setPanel.hidden; });
$('#opt-easy').checked = settings.easy; $('#opt-calm').checked = settings.calm;
$('#opt-easy').addEventListener('change', (e) => { settings.easy = e.target.checked; store.set('easy', settings.easy); });
$('#opt-calm').addEventListener('change', (e) => { settings.calm = e.target.checked; store.set('calm', settings.calm); });
$('#settings-close').addEventListener('click', () => { setPanel.hidden = true; });
$('#start').addEventListener('click', () => {
  settings.easy = $('#t-easy').checked; store.set('easy', settings.easy); $('#opt-easy').checked = settings.easy;
  transition(() => { $('#title').hidden = true; setMode('world'); say('방향 버튼으로 걸어 봐요. 노란 표시가 체육관 입구예요!'); });
});
$('#t-easy').checked = settings.easy;

/* ---------- 미니맵 ---------- */
const mm = $('#minimap'), mg = mm.getContext('2d');
function drawMap() {
  const W = mm.width, H = mm.height, sx = W / (WORLD.maxX - WORLD.minX + 8), sz = H / (WORLD.maxZ - WORLD.minZ + 8);
  const X = (x) => (x - WORLD.minX + 4) * sx, Z = (z) => (z - WORLD.minZ + 4) * sz;
  mg.clearRect(0, 0, W, H); mg.fillStyle = '#b9e3a6'; mg.fillRect(0, 0, W, H);
  mg.fillStyle = '#efe9dc'; mg.beginPath(); mg.arc(X(0), Z(2), 12 * sx, 0, 7); mg.fill();
  mg.fillStyle = '#e1735a'; mg.beginPath(); mg.ellipse(X(27), Z(17), 13 * sx, 8.5 * sz, 0, 0, 7); mg.fill();
  mg.fillStyle = '#8fd18a'; mg.beginPath(); mg.ellipse(X(27), Z(17), 9 * sx, 5.5 * sz, 0, 0, 7); mg.fill();
  BUILDINGS.forEach((b) => { mg.fillStyle = b.enter ? '#6aa7ff' : '#c9ced8'; mg.fillRect(X(b.x - b.w / 2), Z(b.z - b.d / 2), b.w * sx, b.d * sz); });
  mg.fillStyle = '#ffd23f'; mg.beginPath(); mg.arc(X(GYM_PORTAL.x), Z(GYM_PORTAL.z), 5, 0, 7); mg.fill(); mg.strokeStyle = '#a67c00'; mg.lineWidth = 1.5; mg.stroke();
  mg.save(); mg.translate(X(player.position.x), Z(player.position.z)); mg.rotate(-facing + Math.PI);
  mg.fillStyle = '#ff5a2a'; mg.beginPath(); mg.moveTo(0, -7); mg.lineTo(5, 5); mg.lineTo(-5, 5); mg.closePath(); mg.fill(); mg.strokeStyle = '#fff'; mg.lineWidth = 1.5; mg.stroke(); mg.restore();
}

/* ---------- 크기 ---------- */
function resize() {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  document.documentElement.style.setProperty('--vh', h * 0.01 + 'px');
}
addEventListener('resize', resize); resize();

/* ---------- 루프 ---------- */
const clock = new THREE.Clock(); const camPos = new THREE.Vector3(); let camInit = false;
const tmp = new THREE.Vector3();
function frameLoop() {
  requestAnimationFrame(frameLoop);
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  const active = mode === 'world' || mode === 'title';
  if (!active) return; // 로비·게임 화면에서는 3D를 쉬어 배터리를 아낌

  if (mode === 'world') {
    // 입력 → 이동 벡터
    let ix = 0, iz = 0;
    if (keys.has('arrowleft') || keys.has('a')) ix -= 1; if (keys.has('arrowright') || keys.has('d')) ix += 1;
    if (keys.has('arrowup') || keys.has('w')) iz -= 1; if (keys.has('arrowdown') || keys.has('s')) iz += 1;
    if (joy.x || joy.y) { ix += joy.x; iz += joy.y; }
    let l = Math.hypot(ix, iz); if (l > 1) { ix /= l; iz /= l; l = 1; }
    if (l > 0.05) cancelAuto();
    if (auto) {
      const dx = auto.x - player.position.x, dz = auto.z - player.position.z, d = Math.hypot(dx, dz);
      if (d < 0.5) cancelAuto(); else { ix = dx / d; iz = dz / d; l = 1; }
    }
    const speed = settings.easy ? 6.2 : 8.8;
    const target = tmp.set(ix * speed, 0, iz * speed);
    vel.lerp(target, 1 - Math.exp(-(settings.easy ? 9 : 12) * dt));
    const p = player.position; p.x += vel.x * dt; p.z += vel.z * dt;
    resolve(p, 0.65);
    p.y = groundY(p.x, p.z);
    const sp = Math.hypot(vel.x, vel.z);
    if (sp > 0.3) { const a = Math.atan2(vel.x, vel.z); let da = a - facing; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2; facing += da * (1 - Math.exp(-14 * dt)); }
    player.rotation.y = facing;
    if (sp > 0.3 && !settings.calm) { walkT += dt * sp * 1.5; player.children[0].position.y = 0.95 + Math.abs(Math.sin(walkT)) * 0.1; player.rotation.z = Math.sin(walkT) * 0.05; }
    else { player.rotation.z *= 0.8; }

    // 주변 상황
    const dp = Math.hypot(p.x - GYM_PORTAL.x, p.z - GYM_PORTAL.z), inPortal = dp < GYM_PORTAL.r;
    nearLocked = null;
    for (const b of boxes) if (b.locked) { const nx = Math.max(b.x0, Math.min(p.x, b.x1)), nz = Math.max(b.z0, Math.min(p.z, b.z1)); if (Math.hypot(p.x - nx, p.z - nz) < 3.2) nearLocked = b; }
    const actBtn = $('#act');
    let label = '안내', ico = '👣';
    if (inPortal) { label = '들어가기'; ico = '🚪'; } else if (nearLocked) { label = '알아보기'; ico = '❓'; }
    if (actBtn.dataset.label !== label) { actBtn.dataset.label = label; actBtn.querySelector('b').textContent = label; actBtn.querySelector('span').textContent = ico; }
    actBtn.classList.toggle('ready', inPortal);
    if (sayTimer > 0) sayTimer -= dt;
    else if (inPortal) say(settings.easy ? '여기예요! 잠깐 서 있으면 들어가요.' : '들어가기 버튼을 눌러요!');
    else if (nearLocked) say(`${nearLocked.label}이에요. 곧 문을 열어요!`);
    else if (Math.hypot(p.x - GUIDE_POS.x, p.z - GUIDE_POS.z) < 5) say('안녕! 노란 표시를 따라 체육관으로 가 봐요.');
    else if (!auto) say('방향 버튼으로 걷고, 노란 표시가 체육관 입구예요!');
    // 쉬운 모드: 입구에 머무르면 자동 입장
    if (inPortal && settings.easy) { dwell += dt; $('#dwell').style.setProperty('--p', Math.min(1, Math.max(0, dwell) / CONFIG.autoEnterSeconds)); if (dwell >= CONFIG.autoEnterSeconds) { dwell = 0; enterGym(); } }
    else { if (dwell > 0 || !inPortal) dwell = Math.min(0, dwell + dt); $('#dwell').style.setProperty('--p', 0); }
  }

  // 포털·마커 움직임
  const u = portal.userData; const pulse = settings.calm ? 1 : 1 + Math.sin(t * 3) * 0.06;
  u.ring.rotation.z = settings.calm ? 0 : t * 0.8; u.ring2.rotation.z = settings.calm ? 0 : -t * 1.4; u.ring.scale.setScalar(pulse); u.disc.material.opacity = 0.2 + (settings.calm ? 0 : Math.sin(t * 3) * 0.06);
  marker.position.y = 4.4 + (settings.calm ? 0 : Math.sin(t * 2.4) * 0.35); marker.rotation.y = settings.calm ? 0 : t * 1.2;
  if (guide) guide.position.y = settings.calm ? 0 : Math.abs(Math.sin(t * 2)) * 0.06;

  // 카메라: 고정 각도로 따라감
  const portrait = camera.aspect < 0.85; const dist = portrait ? 1.7 : 1.0;
  tmp.set(player.position.x, 0, player.position.z).add(new THREE.Vector3(0, 17 * dist, 15.5 * dist));
  if (!camInit) { camPos.copy(tmp); camInit = true; }
  camPos.lerp(tmp, 1 - Math.exp(-(settings.calm ? 20 : 5) * dt));
  camera.position.copy(camPos);
  camera.lookAt(player.position.x * 0.98, 1.2, player.position.z * 0.98 - 2.2);
  sun.position.set(player.position.x - 22, 38, player.position.z + 16); sun.target.position.copy(player.position); sun.target.updateMatrixWorld();

  fadeGate(dt);
  renderer.render(scene, camera);
  if (mode === 'world') drawMap();
}
frameLoop();

// 디버그/점검용
window.__ssw = { player, get mode() { return mode; }, enterGym, openGame, swapped, SPORTS, scene, camera };
