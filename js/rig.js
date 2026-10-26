// 자동 리깅: 한 덩어리로 된 캐릭터 모델에 뼈대(Skeleton)와 스킨 가중치를 입히고, 대기·걷기 동작을 만듭니다.
// 모델이 사람 모양(A자 자세, 정면이 +z)이면 어떤 캐릭터든 같은 방식으로 움직여요.
// 나중에 Mixamo 등으로 직접 리깅한 glb(애니메이션 포함)를 넣으면 이 파일은 건너뛰고 그 애니메이션을 씁니다.
import * as THREE from '../vendor/three/three.module.js';

const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const segDist = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay; const t = Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
};

// 사람 모양 캐릭터: 관절 위치만 정해 주면 가중치를 만듭니다 (키를 1로 맞춘 좌표)
// hip 엉덩이 높이, knee 무릎, sx·sy 어깨, hx·hy 손끝, neck 목, legX 다리 간격
function humanoid(p) {
  const { hip, knee, sx, sy, hx, hy, neck, legX } = p;
  return {
    type: 'human', stride: p.stride || 1.15, kneeY: knee,
    bones: [['hips', null, 0, hip, 0], ['spine', 'hips', 0, hip + 0.07, 0], ['head', 'spine', 0, neck - 0.02, 0],
      ['armL', 'spine', sx, sy, 0], ['armR', 'spine', -sx, sy, 0],
      ['legL', 'hips', legX, hip, 0], ['legR', 'hips', -legX, hip, 0],
      ['kneeL', 'legL', legX, knee, 0], ['kneeR', 'legR', -legX, knee, 0]],
    weights(x, y) {
      const w = {}; const S = x >= 0 ? 'L' : 'R';
      const wH = ss(neck - 0.04, neck + 0.04, y);
      const ax = Math.abs(x);
      const dA = segDist(ax, y, sx, sy, hx, hy), dT = segDist(ax, y, 0, hip, 0, neck - 0.02);
      const wA = ss(-0.01, 0.04, dT - dA) * (1 - ss(sy, sy + 0.06, y)) * ss(hy - 0.07, hy - 0.01, y);
      const r = Math.max(0, 1 - wH - wA);
      const leg = r * (1 - ss(hip - 0.07, hip + 0.01, y)), torso = r - leg;
      const lowerK = ss(knee + 0.07, knee - 0.05, y);
      const sideL = ss(-0.03, 0.03, x);
      w.head = wH; w['arm' + S] = wA;
      for (const [side, f] of [['L', sideL], ['R', 1 - sideL]]) { w['leg' + side] = (w['leg' + side] || 0) + leg * f * (1 - lowerK); w['knee' + side] = (w['knee' + side] || 0) + leg * f * lowerK; }
      w.spine = torso * ss(hip + 0.01, hip + 0.11, y); w.hips = torso - w.spine;
      return w;
    },
  };
}
// 휠체어 이용 캐릭터: 바퀴 중심(wcx, wcy, wcz)과 반지름 wr
function wheelchair(p) {
  const { wcx, wcy, wcz, wr, sx, sy, hx, hy, neck } = p;
  return {
    type: 'wheel', stride: 1.0,
    bones: [['hips', null, 0, 0.45, 0], ['spine', 'hips', 0, 0.52, 0], ['head', 'spine', 0, neck - 0.02, 0],
      ['armL', 'spine', sx, sy, 0], ['armR', 'spine', -sx, sy, 0],
      ['wheelL', 'hips', wcx, wcy, wcz], ['wheelR', 'hips', -wcx, wcy, wcz]],
    weights(x, y, z) {
      const w = {}; const S = x >= 0 ? 'L' : 'R'; const ax = Math.abs(x);
      const wH = ss(neck - 0.04, neck + 0.04, y);
      const dA = segDist(ax, y, sx, sy, hx, hy), dT = segDist(ax, y, 0, 0.5, 0, neck - 0.02);
      const wA = ss(-0.01, 0.04, dT - dA) * (1 - ss(sy, sy + 0.06, y)) * ss(hy - 0.02, hy + 0.03, y) * ss(sx - 0.03, sx + 0.01, ax) * ss(wcz - 0.1, wcz - 0.04, z) * ss(0.11, 0.06, dA);
      const d = Math.hypot(y - wcy, z - wcz);
      const wW = ss(wr + 0.07, wr + 0.035, d) * ss(wcx - 0.1, wcx - 0.07, ax) * (1 - wA);
      const r = Math.max(0, 1 - wH - wA - wW);
      w.head = wH; w['arm' + S] = wA; w['wheel' + S] = wW;
      w.spine = r * ss(0.5, 0.6, y); w.hips = r - w.spine;
      return w;
    },
  };
}
const SPECS = {
  boy: humanoid({ hip: 0.45, knee: 0.23, sx: 0.13, sy: 0.66, hx: 0.34, hy: 0.35, neck: 0.70, legX: 0.07 }),
  teacher: humanoid({ hip: 0.40, knee: 0.17, sx: 0.15, sy: 0.70, hx: 0.24, hy: 0.33, neck: 0.78, legX: 0.07, stride: 1.0 }),
  coach: humanoid({ hip: 0.41, knee: 0.17, sx: 0.12, sy: 0.68, hx: 0.19, hy: 0.35, neck: 0.76, legX: 0.06, stride: 1.0 }),
  girl: humanoid({ hip: 0.39, knee: 0.17, sx: 0.13, sy: 0.63, hx: 0.21, hy: 0.33, neck: 0.70, legX: 0.06, stride: 1.05 }),
  kid: humanoid({ hip: 0.30, knee: 0.13, sx: 0.13, sy: 0.50, hx: 0.29, hy: 0.28, neck: 0.58, legX: 0.07, stride: 1.3 }),
  wheelchair: wheelchair({ wcx: 0.33, wcy: 0.26, wcz: -0.11, wr: 0.24, sx: 0.12, sy: 0.62, hx: 0.40, hy: 0.45, neck: 0.70 }),
  girl_wheelchair: wheelchair({ wcx: 0.31, wcy: 0.23, wcz: -0.13, wr: 0.23, sx: 0.14, sy: 0.64, hx: 0.32, hy: 0.40, neck: 0.68 }),
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
  for (const [, sm] of rigged) { sm.updateMatrixWorld(true); sm.bind(skeleton, sm.matrixWorld.clone()); }

  // ---- 동작 ----
  let phase = Math.random() * 6, amt = 0, wheel = 0, clock = Math.random() * 10, sit = 0;
  const dropY = spec.type === 'human' ? (spec.bones[0][3] - spec.kneeY) * H : 0;
  const stride = spec.stride;
  const rx = (b, a) => { if (b) b.rotation.x = a; };
  return {
    kind, bones,
    // dt: 시간(초), speed: 이동 속도(m/s), size: 모델 키(m) — 바퀴 굴림 계산용
    // 앉기: 0(서 있음) ~ 1(의자에 앉음). 다리를 앞으로, 무릎을 굽히고 엉덩이를 내려요.
    setSit(k) { sit = k; },
    update(dt, speed, size = 2.2) {
      clock += dt; const target = Math.min(1, speed / 5); amt += (target - amt) * (1 - Math.exp(-10 * dt));
      phase += dt * speed * stride * 1.25;
      const breathe = Math.sin(clock * 2.2) * (1 - amt);
      bones.spine.scale.y = 1 + breathe * 0.012;
      bones.head.rotation.x = Math.sin(clock * 1.3) * 0.03 * (1 - amt) + Math.sin(phase * 2) * 0.03 * amt;
      if (spec.type === 'human') {
        for (const S of ['L', 'R']) {
          const ph = phase + (S === 'L' ? 0 : Math.PI);
          rx(bones['leg' + S], -Math.sin(ph) * 0.65 * amt);
          rx(bones['knee' + S], Math.max(0, Math.cos(ph)) * 0.85 * amt);
          rx(bones['arm' + S], Math.sin(ph) * 0.55 * amt);
          bones['arm' + S].rotation.z = (S === 'L' ? -1 : 1) * (0.04 + Math.sin(clock * 2.2) * 0.01 * (1 - amt));
        }
        bones.spine.rotation.y = Math.sin(phase) * 0.12 * amt; bones.hips.rotation.y = -Math.sin(phase) * 0.06 * amt;
        bones.spine.rotation.x = 0.05 * amt;
        if (sit > 0.001) {
          for (const S of ['L', 'R']) { bones['leg' + S].rotation.x = bones['leg' + S].rotation.x * (1 - sit) - 1.5 * sit; bones['knee' + S].rotation.x = bones['knee' + S].rotation.x * (1 - sit) + 1.45 * sit; bones['arm' + S].rotation.x = bones['arm' + S].rotation.x * (1 - sit) - 0.55 * sit; }
          bones.spine.rotation.x *= (1 - sit);
        }
        bones.hips.position.y = bones.hips.userData.rest.y - dropY * sit;
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
