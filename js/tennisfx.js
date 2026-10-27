// 테니스 코트: 공 기계가 공을 보내 주고, 코트에 서서 '치기' 버튼으로 받아쳐요. 실패나 점수 깎기는 없어요.
import * as THREE from '../vendor/three/three.module.js';

export const COURT = { x0: 8.4, x1: 15.6, z0: 5.4, z1: 15.8, net: 10.2, y: 0.8 };
const MACHINE = { x: 12, z: 6.1, mouthY: 1.25, turn: 0, size: 1.9 };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (k) => k * k * (3 - 2 * k);

export function courtHeight(x, z) { // 코트 둘레는 완만한 오르막으로 이어요
  const dx = Math.max(COURT.x0 - 0.2 - x, 0, x - (COURT.x1 + 0.2)), dz = Math.max(COURT.z0 - 0.2 - z, 0, z - (COURT.z1 + 0.1)), d = Math.hypot(dx, dz);
  return d >= 1 ? 0 : COURT.y * (1 - d);
}

export function initTennis(ctx) {
  const { scene, loadModel, fitModel, player, say, settings, getRig } = ctx;
  const g = new THREE.Group(); scene.add(g);

  /* ---------- 공 기계 ---------- */
  const machine = new THREE.Group(); machine.position.set(MACHINE.x, COURT.y, MACHINE.z); g.add(machine);
  const mInner = new THREE.Group(); machine.add(mInner);
  loadModel('ballmachine.glb').then((src) => { if (!src) return; mInner.add(fitModel(src, MACHINE.size, MACHINE.turn)); });
  // 켜져 있다는 표시 불빛
  const lampMat = new THREE.MeshBasicMaterial({ color: 0x66ff88 });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), lampMat); lamp.position.set(0, MACHINE.size + 0.12, 0); machine.add(lamp);

  /* ---------- 공, 그림자, 도착 표시 ---------- */
  const ballMat = new THREE.MeshStandardMaterial({ color: 0xd9f24a, emissive: 0x6a7a10, roughness: 0.6 });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), ballMat); ball.castShadow = true; ball.visible = false; g.add(ball);
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.22, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false })); blob.rotation.x = -Math.PI / 2; blob.visible = false; g.add(blob);
  const mark = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.78, 32), new THREE.MeshBasicMaterial({ color: 0xffd84a, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false })); mark.rotation.x = -Math.PI / 2; mark.visible = false; g.add(mark);

  /* ---------- 라켓 (코트에 올라가면 손에 나타나요) ---------- */
  const racket = new THREE.Group(); racket.visible = false; player.add(racket);
  { const frame = new THREE.MeshStandardMaterial({ color: 0x2a6fe0, roughness: 0.5 }), grip = new THREE.MeshStandardMaterial({ color: 0x222831 });
    const piv = new THREE.Group(); racket.add(piv); racket.userData.piv = piv;
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 8), grip); h.position.y = 0.25; piv.add(h);
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 8), frame); sh.position.y = 0.65; piv.add(sh);
    const head = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.03, 8, 28), frame); head.scale.set(0.85, 1, 1); head.position.y = 1.0; piv.add(head);
    const net = new THREE.Mesh(new THREE.CircleGeometry(0.25, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })); net.scale.set(0.85, 1.05, 1); net.position.y = 1.0; piv.add(net);
    piv.scale.setScalar(1.1); racket.position.set(0.55, 0.95, 0.35); }

  // 3D 라켓: 캐릭터 뼈대의 오른손에 붙여요 (뼈대가 없는 캐릭터는 위의 간단한 라켓을 써요)
  let rk = null, rkSrc = null, rig = null; const rkPivot = new THREE.Group(); rkPivot.visible = false;
  loadModel('racket.glb').then((src) => { rkSrc = src; });
  function attach() {
    const r = getRig ? getRig() : null; if (r === rig && (rk || !rkSrc || !r)) return; rig = r;
    if (rkPivot.parent) rkPivot.parent.remove(rkPivot); if (rk) { rkPivot.remove(rk); rk = null; }
    if (!rig || !rkSrc || !rig.bones.armR) return;
    rk = fitModel(rkSrc, rig.H * 0.62, 0); rk.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    rkPivot.add(rk); rkPivot.position.copy(rig.hand); rig.bones.armR.add(rkPivot);
  }

  /* ---------- 반짝이 ---------- */
  const sparks = []; const sMat = new THREE.MeshBasicMaterial({ color: 0xffe27a });
  for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), sMat); m.visible = false; g.add(m); sparks.push({ m, v: new THREE.Vector3(), l: 0 }); }
  function pop(p, n = 10) { if (settings.calm) return; let k = 0; for (const s of sparks) { if (s.l > 0 || k >= n) continue; k++; s.l = 0.55; s.m.visible = true; s.m.position.copy(p); const a = Math.random() * 6.283, v = 1.5 + Math.random() * 2.5; s.v.set(Math.cos(a) * v, 2 + Math.random() * 2.5, Math.sin(a) * v); } }

  /* ---------- 상태 ---------- */
  const api = { active: false, hittable: false, count: 0, hints: 0 };
  let swingT = -1, pending = false, readyK = 0;
  let b = null, wait = 1.4, swing = 0, recoil = 0, bonk = 0, wasActive = false, missMsg = 0, autoT = 0;
  const P = new THREE.Vector3(), A = new THREE.Vector3(), B = new THREE.Vector3();
  const slow = () => (settings.calm ? 1.4 : 1) * (settings.easy ? 1.3 : 1);

  function parab(a, c, apex, k, out) { out.x = a.x + (c.x - a.x) * k; out.z = a.z + (c.z - a.z) * k; out.y = a.y + (c.y - a.y) * k + apex * 4 * k * (1 - k); return out; }
  function launch() {
    const px = clamp(player.position.x, COURT.x0 + 0.9, COURT.x1 - 0.9), pz = clamp(player.position.z, COURT.net + 2.4, COURT.z1 - 0.5);
    const jx = settings.easy ? 0 : (Math.random() - 0.5) * 2.4, jz = settings.easy ? 0 : (Math.random() - 0.5) * 1.2;
    const to = new THREE.Vector3(clamp(px + jx, COURT.x0 + 0.8, COURT.x1 - 0.8), COURT.y + 0.2, clamp(pz + jz, COURT.net + 2.2, COURT.z1 - 0.4));
    b = { ph: 'in', t: 0, T: 2.1 * slow(), from: new THREE.Vector3(MACHINE.x, COURT.y + MACHINE.mouthY, MACHINE.z + 0.5), to, apex: 2.6, hit: false };
    recoil = 1; pop(b.from, 6);
    mark.position.set(to.x, COURT.y + 0.03, to.z); mark.visible = true;
  }
  function finish(msg) { b = null; ball.visible = false; blob.visible = false; mark.visible = false; wait = 1.2; api.hittable = false; if (msg) say(msg, 2.2); }

  api.press = function () {
    if (swingT >= 0 && swingT < 0.35) return true; // 이미 휘두르는 중
    swing = 1; swingT = 0; pending = !!(b && api.hittable && !b.hit);
    return pending;
  };
  function hitBall() {
    b.hit = true; pending = false; api.count++; mark.visible = false;
    const from = ball.position.clone(), to = new THREE.Vector3(MACHINE.x + (Math.random() - 0.5) * 1.2, COURT.y + 1.0, MACHINE.z + 0.9);
    b.ph = 'back'; b.t = 0; b.T = 1.15; b.from = from; b.to = to; b.apex = 3.0 + Math.random() * 0.6;
    pop(from, 12); api.hittable = false;
    say(['좋은 샷! 🎾', '멋져요!', '쾅! 잘 쳤어요!', '와! 시원해요!'][api.count % 4] + (api.count % 5 === 0 ? ` ${api.count}번 쳤어요!` : ''), 2.2);
  }

  api.update = function (dt, t, calm) {
    const p = player.position;
    const inCourt = p.x > COURT.x0 - 0.3 && p.x < COURT.x1 + 0.3 && p.z > COURT.net + 0.4 && p.z < COURT.z1 + 0.3;
    api.active = inCourt;
    if (inCourt !== wasActive) { wasActive = inCourt; if (inCourt) { wait = 1.6; say('공 기계가 공을 보내요! 공이 가까이 오면 치기 버튼을 눌러요.', 4); } else if (b) finish(); }
    // 기계 반동, 불빛
    recoil = Math.max(0, recoil - dt * 4); bonk = Math.max(0, bonk - dt * 5);
    machine.scale.set(1 + bonk * 0.12 - recoil * 0.04, 1 - bonk * 0.1 + recoil * 0.06, 1 + bonk * 0.12 - recoil * 0.04);
    lampMat.color.setHex(inCourt ? (b ? 0xffb347 : 0x66ff88) : 0x888888);
    // 라켓 휘두르기
    attach();
    readyK += ((inCourt ? 1 : 0) - readyK) * (1 - Math.exp(-8 * dt));
    if (api.freeze != null) swingT = api.freeze;
    else if (swingT >= 0) { swingT += dt / 0.6; if (pending && swingT >= 0.5 && b && !b.hit) { pending = false; hitBall(); } if (swingT >= 1) { swingT = -1; pending = false; } }
    const piv = racket.userData.piv, sk = swingT >= 0 ? Math.sin(swingT * Math.PI) : 0;
    if (rk) {
      racket.visible = false; rkPivot.visible = readyK > 0.05; rig.pose.ready = readyK; rig.pose.swing = swingT;
      const wheel = rig.type === 'wheel', sw = swingT;
      const key = (pts) => { for (let i = 1; i < pts.length; i++) if (sw <= pts[i][0]) { const k = (sw - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]); return pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * ease(k); } return pts[pts.length - 1][1]; };
      rk.rotation.x = sw < 0 ? (wheel ? 0.9 : 1.7) : wheel ? key([[0, 0.9], [0.3, 0.0], [0.52, 1.9], [0.75, 1.5], [1, 0.9]]) : key([[0, 1.7], [0.3, 1.2], [0.52, 2.7], [0.75, 2.2], [1, 1.7]]);
      rk.rotation.z = 0; rk.rotation.y = sw < 0 ? 1.3 : key([[0, 1.3], [0.3, 1.3], [0.52, 0.5], [0.75, 0.9], [1, 1.3]]);
      if (api.rkRot) rk.rotation.set(api.rkRot[0], api.rkRot[1], api.rkRot[2]);
    } else {
      racket.visible = inCourt; swing = Math.max(0, swing - dt * 3.2);
      piv.rotation.set(-0.5 - sk * 1.6, 0, -0.35 + sk * 0.6); racket.rotation.y = sk * -0.5;
      if (rig) rig.pose.ready = 0;
    }
    // 반짝이
    for (const s of sparks) { if (s.l <= 0) continue; s.l -= dt; s.v.y -= 9 * dt; s.m.position.addScaledVector(s.v, dt); s.m.scale.setScalar(Math.max(0.01, s.l / 0.55)); if (s.l <= 0) s.m.visible = false; }
    if (!inCourt) { api.hittable = false; return; }
    // 공 만들기
    if (!b) { wait -= dt; if (wait <= 0) launch(); return; }
    b.t += dt; const k = clamp(b.t / b.T, 0, 1);
    if (b.ph === 'in') {
      parab(b.from, b.to, b.apex, k, P); ball.position.copy(P);
      if (k >= 1) { b.ph = 'bounce'; b.t = 0; b.T = 0.8 * slow(); b.from = b.to.clone(); b.to = new THREE.Vector3(clamp(b.to.x + (p.x - b.to.x) * 0.3, COURT.x0 + 0.5, COURT.x1 - 0.5), COURT.y + 0.2, Math.min(b.to.z + 1.6, COURT.z1 - 0.2)); b.apex = 1.35; }
    } else if (b.ph === 'bounce') {
      parab(b.from, b.to, b.apex, k, P); ball.position.copy(P);
      if (k >= 1) { b.ph = 'roll'; b.t = 0; b.T = 1.0; b.from = b.to.clone(); b.to = new THREE.Vector3(b.to.x, COURT.y + 0.2, Math.min(b.to.z + 1.2, COURT.z1 + 0.6)); b.apex = 0.35; }
    } else if (b.ph === 'roll') {
      parab(b.from, b.to, b.apex, k, P); ball.position.copy(P);
      if (k >= 1) { api.hittable = false; return finish(api.count > 0 ? '괜찮아요! 다음 공이 와요.' : '괜찮아요! 다음엔 공 가까이에서 눌러 봐요.'); }
    } else if (b.ph === 'back') {
      parab(b.from, b.to, b.apex, k, P); ball.position.copy(P);
      if (k >= 1) { bonk = 1; pop(b.to, 8); return finish(); }
    }
    ball.visible = true; ball.rotation.x += dt * 12;
    blob.visible = true; blob.position.set(ball.position.x, COURT.y + 0.03, ball.position.z); const hh = clamp(1 - (ball.position.y - COURT.y) / 4, 0.25, 1); blob.scale.setScalar(hh * 1.1);
    if (mark.visible) { mark.scale.setScalar(1 + Math.sin(t * 7) * 0.08); mark.material.opacity = calm ? 0.7 : 0.6 + Math.sin(t * 7) * 0.3; }
    // 칠 수 있는 순간인지 확인
    if (b.ph === 'bounce' || b.ph === 'roll' || (b.ph === 'in' && k > 0.75)) {
      const d = Math.hypot(ball.position.x - p.x, ball.position.z - p.z), reach = settings.easy ? 3.1 : 2.5, ok = d < reach && ball.position.y - COURT.y < 3.2 && !b.hit;
      api.hittable = ok;
      if (ok && settings.easy && d < 1.5) { autoT += dt; if (autoT > 0.35) { autoT = 0; api.press(); } } else autoT = 0;
    } else api.hittable = false;
  };
  api.dbg = () => ({ rk, rig });
  return api;
}
