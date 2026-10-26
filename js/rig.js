// 자동 리깅: 한 덩어리로 된 캐릭터 모델에 뼈대(Skeleton)와 스킨 가중치를 입히고, 대기·걷기 동작을 만듭니다.
// 모델이 사람 모양(A자 자세, 정면이 +z)이면 어떤 캐릭터든 같은 방식으로 움직여요.
// 나중에 Mixamo 등으로 직접 리깅한 glb(애니메이션 포함)를 넣으면 이 파일은 건너뛰고 그 애니메이션을 씁니다.
import * as THREE from '../vendor/three/three.module.js';

const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const segDist = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay; const t = Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
};

// 관절 위치와 가중치 규칙 (키를 1로 맞춘 좌표)
const SPECS = {
  boy: {
    bones: [['hips', null, 0, 0.45, 0], ['spine', 'hips', 0, 0.52, 0], ['head', 'spine', 0, 0.70, 0],
      ['armL', 'spine', 0.13, 0.66, 0], ['armR', 'spine', -0.13, 0.66, 0],
      ['legL', 'hips', 0.07, 0.45, 0], ['legR', 'hips', -0.07, 0.45, 0],
      ['kneeL', 'legL', 0.07, 0.23, 0], ['kneeR', 'legR', -0.07, 0.23, 0]],
    weights(x, y) {
      const w = {}; const s = x >= 0 ? 1 : -1, S = s > 0 ? 'L' : 'R';
      const wH = ss(0.66, 0.74, y);
      const dA = segDist(Math.abs(x), y, 0.13, 0.66, 0.34, 0.35), dT = segDist(Math.abs(x), y, 0, 0.45, 0, 0.68);
      const wA = ss(-0.01, 0.04, dT - dA) * (1 - ss(0.66, 0.72, y)) * ss(0.28, 0.34, y);
      const r = Math.max(0, 1 - wH - wA);
      const leg = r * (1 - ss(0.38, 0.46, y)), torso = r - leg;
      const lowerK = ss(0.30, 0.18, y);
      const sideL = ss(-0.03, 0.03, x);
      w.head = wH; w['arm' + S] = wA;
      for (const [side, f] of [['L', sideL], ['R', 1 - sideL]]) { w['leg' + side] = (w['leg' + side] || 0) + leg * f * (1 - lowerK); w['knee' + side] = (w['knee' + side] || 0) + leg * f * lowerK; }
      w.spine = torso * ss(0.46, 0.56, y); w.hips = torso - w.spine;
      return w;
    },
    walk: { stride: 1.15 },
  },
  wheelchair: {
    bones: [['hips', null, 0, 0.45, 0], ['spine', 'hips', 0, 0.52, 0], ['head', 'spine', 0, 0.68, 0],
      ['armL', 'spine', 0.12, 0.62, 0], ['armR', 'spine', -0.12, 0.62, 0],
      ['wheelL', 'hips', 0.33, 0.26, -0.11], ['wheelR', 'hips', -0.33, 0.26, -0.11]],
    weights(x, y, z) {
      const w = {}; const S = x >= 0 ? 'L' : 'R';
      const wH = ss(0.64, 0.72, y);
      const dA = segDist(Math.abs(x), y, 0.12, 0.62, 0.40, 0.45), dT = segDist(Math.abs(x), y, 0, 0.5, 0, 0.66);
      const wA = ss(-0.01, 0.04, dT - dA) * (1 - ss(0.64, 0.70, y)) * ss(0.38, 0.43, y) * ss(0.09, 0.13, Math.abs(x)) * ss(-0.22, -0.16, z) * ss(0.11, 0.06, dA);
      const d = Math.hypot(y - 0.26, z + 0.11);
      const wW = ss(0.31, 0.275, d) * ss(0.23, 0.26, Math.abs(x)) * (1 - wA);
      const r = Math.max(0, 1 - wH - wA - wW);
      w.head = wH; w['arm' + S] = wA; w['wheel' + S] = wW;
      w.spine = r * ss(0.5, 0.6, y); w.hips = r - w.spine;
      return w;
    },
    walk: { stride: 1.0 },
  },
};

export function autoRig(group, kind) {
  const spec = SPECS[kind]; if (!spec) return null;
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const meshes = []; group.traverse((o) => { if (o.isMesh && !o.isSkinnedMesh) meshes.push(o); });
  if (!meshes.length) return null;
  // 키(H) 계산
  const box = new THREE.Box3(); for (const m of meshes) box.expandByObject(m);
  const H = box.max.y - Math.min(0, box.min.y) || 1; const y0 = box.min.y;

  // 뼈대
  const bones = {}, list = [];
  for (const [name, parent, x, y, z] of spec.bones) {
    const b = new THREE.Bone(); b.name = name; bones[name] = b; list.push(b);
    b.userData.rest = new THREE.Vector3(x * H, y * H + y0, z * H);
    if (parent) { bones[parent].add(b); b.position.copy(b.userData.rest).sub(bones[parent].userData.rest); } else b.position.copy(b.userData.rest);
  }
  const root = list[0];
  const skeleton = new THREE.Skeleton(list);
  const idx = Object.fromEntries(list.map((b, i) => [b.name, i]));

  const rigged = [];
  for (const m of meshes) {
    const g0 = m.geometry; const n = g0.attributes.position.count;
    const mat = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld);
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3), nor = g0.attributes.normal ? new Float32Array(n * 3) : null;
    const v = new THREE.Vector3(); const nm = new THREE.Matrix3().getNormalMatrix(mat);
    for (let i = 0; i < n; i++) {
      v.fromBufferAttribute(g0.attributes.position, i).applyMatrix4(mat); pos.set([v.x, v.y, v.z], i * 3);
      if (nor) { v.fromBufferAttribute(g0.attributes.normal, i).applyMatrix3(nm).normalize(); nor.set([v.x, v.y, v.z], i * 3); }
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); if (nor) g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    if (g0.attributes.uv) g.setAttribute('uv', g0.attributes.uv); if (g0.index) g.setIndex(g0.index);
    const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const w = spec.weights(pos[i * 3] / H, (pos[i * 3 + 1] - y0) / H, pos[i * 3 + 2] / H);
      const ent = Object.entries(w).filter(([, a]) => a > 0.001).sort((a, b) => b[1] - a[1]).slice(0, 4);
      let sum = ent.reduce((s, e) => s + e[1], 0); if (!ent.length) { ent.push(['hips', 1]); sum = 1; }
      ent.forEach(([k, a], j) => { si[i * 4 + j] = idx[k]; sw[i * 4 + j] = a / sum; });
    }
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    const sm = new THREE.SkinnedMesh(g, m.material); sm.castShadow = true; sm.receiveShadow = true; sm.frustumCulled = false;
    rigged.push([m, sm]);
  }
  for (const [m, sm] of rigged) { m.parent.remove(m); group.add(sm); }
  group.add(root); group.updateMatrixWorld(true); skeleton.calculateInverses();
  for (const [, sm] of rigged) sm.bind(skeleton, new THREE.Matrix4());

  // ---- 동작 ----
  let phase = Math.random() * 6, amt = 0, wheel = 0, clock = Math.random() * 10;
  const stride = spec.walk.stride;
  const rx = (b, a) => { if (b) b.rotation.x = a; };
  return {
    kind, bones,
    // dt: 시간(초), speed: 이동 속도(m/s), size: 모델 키(m) — 바퀴 굴림 계산용
    update(dt, speed, size = 2.2) {
      clock += dt; const target = Math.min(1, speed / 5); amt += (target - amt) * (1 - Math.exp(-10 * dt));
      phase += dt * speed * stride * 1.25;
      const breathe = Math.sin(clock * 2.2) * (1 - amt);
      bones.spine.scale.y = 1 + breathe * 0.012;
      bones.head.rotation.x = Math.sin(clock * 1.3) * 0.03 * (1 - amt) + Math.sin(phase * 2) * 0.03 * amt;
      if (kind === 'boy') {
        for (const S of ['L', 'R']) {
          const ph = phase + (S === 'L' ? 0 : Math.PI);
          rx(bones['leg' + S], -Math.sin(ph) * 0.65 * amt);
          rx(bones['knee' + S], Math.max(0, Math.cos(ph)) * 0.85 * amt);
          rx(bones['arm' + S], Math.sin(ph) * 0.55 * amt);
          bones['arm' + S].rotation.z = (S === 'L' ? -1 : 1) * (0.04 + Math.sin(clock * 2.2) * 0.01 * (1 - amt));
        }
        bones.spine.rotation.y = Math.sin(phase) * 0.12 * amt; bones.hips.rotation.y = -Math.sin(phase) * 0.06 * amt;
        bones.spine.rotation.x = 0.05 * amt;
      } else {
        wheel += speed * dt / (0.26 * size);   // 바퀴 반지름 약 0.26 × 키
        for (const S of ['L', 'R']) {
          bones['wheel' + S].rotation.x = wheel;
          rx(bones['arm' + S], Math.sin(phase * 1.2) * 0.25 * amt);
        }
        bones.spine.rotation.x = (0.06 + Math.max(0, Math.sin(phase * 1.2)) * 0.1) * amt;
      }
    },
  };
}
