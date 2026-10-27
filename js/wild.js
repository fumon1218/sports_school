// 숲속 친구들(토끼·사슴)과 보물 글자 찾기
import * as THREE from '../vendor/three/three.module.js';

export const TREASURE_TEXT = '한국교원대학교부설체育특수학교'.replace('育', '육'); // 15글자
const SPOTS = [[-62, -14], [-64, 12], [-60, 36], [-34, -44], [-10, -46], [14, -44], [40, -42], [62, -26], [66, -4], [64, 20], [60, 46], [30, 52], [-6, 58], [-22, 46], [-70, -34]];
const ANIMALS = [
  { file: 'nature/rabbit.glb', size: 1.5, hop: true, home: [58, -6], r: 8, v: 1.6, turn: 0 },
  { file: 'nature/rabbit.glb', size: 1.5, hop: true, home: [-58, 6], r: 8, v: 1.6, turn: 0 },
  { file: 'nature/deer.glb', size: 3.6, hop: false, home: [60, 22], r: 9, v: 1.3, turn: 0 },
  { file: 'nature/deer.glb', size: 3.6, hop: false, home: [-26, -40], r: 9, v: 1.3, turn: 0 },
];

export function initWild(ctx) {
  const { scene, loadModel, fitModel, blockedAt, player, say, medalPop, flags, store, P, burst } = ctx;
  const found = new Set(flags.treasure || []);

  /* ---------- 동물 ---------- */
  const animals = ANIMALS.map((def, i) => {
    const g = new THREE.Group(); g.position.set(def.home[0], 0, def.home[1]); scene.add(g);
    const a = { def, g, inner: new THREE.Group(), tx: def.home[0], tz: def.home[1], wait: 1 + i, face: i * 1.7, t: Math.random() * 6, moving: false };
    g.add(a.inner);
    loadModel(def.file).then((src) => { if (!src) return; a.inner.add(fitModel(src, def.size, def.turn)); });
    return a;
  });
  const free = (x, z) => !blockedAt(x, z, 0.9);
  function pickTarget(a) {
    for (let k = 0; k < 20; k++) { const ang = Math.random() * 6.283, d = 2 + Math.random() * a.def.r, x = a.def.home[0] + Math.cos(ang) * d, z = a.def.home[1] + Math.sin(ang) * d; if (free(x, z)) { a.tx = x; a.tz = z; return; } }
    a.wait = 2;
  }

  /* ---------- 보물상자 ---------- */
  const chests = SPOTS.map(([sx, sz], i) => {
    let x = sx, z = sz;
    for (let k = 0; k < 60 && !free(x, z); k++) { const ang = k * 2.4, d = 1 + k * 0.35; x = sx + Math.cos(ang) * d; z = sz + Math.sin(ang) * d; }
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = i * 1.3; scene.add(g);
    const wood = P.mat(0x8a5a2b), gold = P.mat(0xf2c230);
    const base = P.box(1.0, 0.55, 0.65, wood); base.position.y = 0.28; g.add(base);
    const lidPivot = new THREE.Group(); lidPivot.position.set(0, 0.56, -0.32); g.add(lidPivot);
    const lid = P.box(1.04, 0.28, 0.69, wood); lid.position.set(0, 0.14, 0.32); lidPivot.add(lid);
    const band = P.box(1.08, 0.3, 0.12, gold); band.position.set(0, 0.14, 0.32); lidPivot.add(band);
    const lock = P.box(0.16, 0.2, 0.06, gold); lock.position.set(0, 0.42, 0.34); g.add(lock);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.5, 9, 14, 1, true), beamMat); beam.position.y = 4.6; g.add(beam);
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.7, 1.15, 28), new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    halo.rotation.x = -Math.PI / 2; halo.position.y = 0.05; g.add(halo);
    const c = { g, lidPivot, beam, halo, x, z, i, open: found.has(i), pop: null, popT: 0 };
    if (c.open) { lidPivot.rotation.x = -1.7; beam.visible = halo.visible = false; }
    return c;
  });

  /* ---------- 글자판 (아래 가운데) ---------- */
  const bar = document.createElement('div'); bar.id = 'treasure-bar'; bar.setAttribute('aria-label', '보물 글자');
  const slots = [...TREASURE_TEXT].map((ch) => { const s = document.createElement('span'); s.textContent = '?'; s.dataset.ch = ch; bar.appendChild(s); return s; });
  document.body.appendChild(bar);
  const paint = () => { slots.forEach((s, i) => { const on = found.has(i); s.classList.toggle('on', on); s.textContent = on ? s.dataset.ch : '?'; }); bar.title = `보물 글자 ${found.size} / ${TREASURE_TEXT.length}`; };
  paint();

  function collect(c) {
    c.open = true; found.add(c.i); flags.treasure = [...found]; store.set('flags', flags); paint();
    const ch = TREASURE_TEXT[c.i]; c.popT = 2.4; const sp = P.labelSprite(ch); sp.position.set(c.x, 1.8, c.z); sp.scale.multiplyScalar(2.2); scene.add(sp); c.pop = sp;
    if (found.size === TREASURE_TEXT.length) { medalPop('보물 글자 완성! 한국교원대학교부설체육특수학교'); say('모든 글자를 찾았어요! 한국교원대학교부설체육특수학교 🎉', 6); if (burst) burst(player.position.x, player.position.z); bar.classList.add('done'); }
    else say(`'${ch}' 글자를 찾았어요! (${found.size} / ${TREASURE_TEXT.length})`, 3.5);
  }
  if (found.size === TREASURE_TEXT.length) bar.classList.add('done');

  return {
    setVisible(v) { bar.style.display = v ? '' : 'none'; },
    update(dt, t, calm) {
      for (const a of animals) {
        const p = a.g.position; a.t += dt;
        const dpl = Math.hypot(player.position.x - p.x, player.position.z - p.z);
        let moving = false;
        if (!calm) {
          if (a.wait > 0) a.wait -= dt;
          else { const dx = a.tx - p.x, dz = a.tz - p.z, d = Math.hypot(dx, dz); if (d < 0.4) { a.wait = 1.5 + Math.random() * 4; pickTarget(a); } else { const nx = p.x + dx / d * a.def.v * dt, nz = p.z + dz / d * a.def.v * dt; if (free(nx, nz)) { p.x = nx; p.z = nz; a.face = Math.atan2(dx, dz); moving = true; } else { a.wait = 0.5; pickTarget(a); } } }
        }
        let df = a.face - a.g.rotation.y; df = Math.atan2(Math.sin(df), Math.cos(df)); a.g.rotation.y += df * Math.min(1, dt * 6);
        a.inner.position.y = a.def.hop ? (moving ? Math.abs(Math.sin(a.t * 7)) * 0.35 : 0) : (moving ? Math.abs(Math.sin(a.t * 4)) * 0.06 : 0);
        a.inner.rotation.x = a.def.hop && moving ? Math.sin(a.t * 7) * 0.12 : 0;
      }
      for (const c of chests) {
        if (!c.open) {
          const k = 1 + Math.sin(t * 3 + c.i) * 0.12; c.halo.scale.setScalar(k); c.beam.material.opacity = 0.22 + Math.sin(t * 2.4 + c.i) * 0.08;
          if (Math.hypot(player.position.x - c.x, player.position.z - c.z) < 1.9) collect(c);
        } else if (c.lidPivot.rotation.x > -1.7) { c.lidPivot.rotation.x -= dt * 4; c.beam.visible = c.halo.visible = false; }
        if (c.pop) { c.popT -= dt; c.pop.position.y += dt * 0.5; if (c.popT <= 0) { scene.remove(c.pop); c.pop = null; } }
      }
    },
  };
}
