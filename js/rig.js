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
    type: 'human', stride: p.stride || 1.15, kneeY: knee, hand: [sx, sy, hx, hy],
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
    type: 'wheel', stride: 1.0, hand: [sx, sy, hx, hy],
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
  // 테니스 같은 자세 덮어쓰기: ready 0~1(준비 자세), swing 0~1(스윙 진행, -1이면 쉬는 중)
  const pose = { ready: 0, swing: -1 };
  const hand = new THREE.Vector3(-(spec.hand[2] - spec.hand[0]) * H, (spec.hand[3] - spec.hand[1]) * H, 0); // 오른손 위치(오른팔 뼈 기준)
  const mix = (a, b, k) => a + (b - a) * k;
  const pk = (s, pts) => { for (let i = 1; i < pts.length; i++) if (s <= pts[i][0]) { const [t0, v0] = pts[i - 1], [t1, v1] = pts[i]; const k = (s - t0) / (t1 - t0); return mix(v0, v1, k * k * (3 - 2 * k)); } return pts[pts.length - 1][1]; };
  return {
    kind, bones, pose, hand, H, type: spec.type,
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
        if (pose.ready > 0.001 && sit < 0.5) {
          const r = pose.ready, sw = pose.swing, hit = sw >= 0;
          const yaw = hit ? pk(sw, [[0, 0], [0.3, -0.75], [0.52, 0.85], [1, 0]]) : 0;
          const armX = hit ? pk(sw, [[0, -0.95], [0.3, -0.55], [0.52, -1.55], [0.75, -1.2], [1, -0.95]]) : -0.95;
          const armZ = hit ? pk(sw, [[0, 0.3], [0.3, 0.55], [0.52, -0.3], [1, 0.3]]) : 0.3;
          const lean = hit ? pk(sw, [[0, 0.2], [0.3, 0.12], [0.52, 0.32], [1, 0.2]]) : 0.2;
          for (const S of ['L', 'R']) { const l = bones['leg' + S], k = bones['knee' + S]; l.rotation.x = mix(l.rotation.x, S === 'L' ? -0.3 : -0.38, r); k.rotation.x = mix(k.rotation.x, S === 'L' ? 0.55 : 0.62, r); }
          bones.armR.rotation.x = mix(bones.armR.rotation.x, armX, r); bones.armR.rotation.z = mix(bones.armR.rotation.z, armZ, r);
          bones.armL.rotation.x = mix(bones.armL.rotation.x, hit ? pk(sw, [[0, -0.5], [0.3, -0.9], [0.52, -0.35], [1, -0.5]]) : -0.5, r); bones.armL.rotation.z = mix(bones.armL.rotation.z, -0.25, r);
          bones.spine.rotation.x = mix(bones.spine.rotation.x, lean, r); bones.spine.rotation.y = mix(bones.spine.rotation.y, yaw, r); bones.hips.rotation.y = mix(bones.hips.rotation.y, yaw * 0.4, r);
          bones.hips.position.y -= dropY * 0.2 * r;
        }
      } else {
        // 휠체어: 바퀴·팔을 따로 돌리면 모양이 구부러지고 늘어나서, 몸통만 살짝 기울여요 (바퀴는 위치 이동으로 굴러가는 느낌)
        bones.wheelL.rotation.x = bones.wheelR.rotation.x = 0; bones.armL.rotation.x = bones.armR.rotation.x = 0;
        bones.spine.rotation.x = 0.04 * amt;
        if (pose.ready > 0.001) { const sw = pose.swing; bones.spine.rotation.y = pose.ready * (sw >= 0 ? pk(sw, [[0, 0], [0.3, -0.5], [0.52, 0.6], [1, 0]]) : 0); bones.spine.rotation.x += pose.ready * 0.1; }
      }
    },
  };
}
