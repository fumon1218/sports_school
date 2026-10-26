// 임시 도형 모델. glb 가 준비되기 전까지 건물·소품을 기본 도형으로 대신합니다.
import * as THREE from '../vendor/three/three.module.js';

const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.02, flatShading: true, ...opts });
const box = (w, h, d, m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.castShadow = o.receiveShadow = true; return o; };

// 빈 간판 판 위에 글자를 그려 얹습니다 (앱이 글자를 얹는 방식)
export function signPlate(text, w = 7, h = 1.6, bg = '#ffffff', fg = '#27407a') {
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w);
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#9fb7e8'; g.lineWidth = 10; g.strokeRect(5, 5, c.width - 10, c.height - 10);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  let size = c.height * 0.56; g.font = `800 ${size}px "Pretendard","Noto Sans KR","Malgun Gothic",sans-serif`;
  while (g.measureText(text).width > c.width * 0.86 && size > 12) { size -= 4; g.font = `800 ${size}px "Pretendard","Noto Sans KR","Malgun Gothic",sans-serif`; }
  g.fillText(text, c.width / 2, c.height / 2 + 3);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t }));
  return m;
}

// 체육관 (흰 은색 벽 + 사선 유리띠 + 아래층 나무 + 경사로 + 천창)
export function buildGym(b) {
  const g = new THREE.Group();
  const white = mat(0xf2f5fa), wood = mat(0xc99a62), glass = mat(0x8fd0ee, { transparent: true, opacity: 0.78, roughness: 0.2, flatShading: false });
  const body = box(b.w, b.h, b.d, white); body.position.y = b.h / 2; g.add(body);
  const floor1 = box(b.w + 0.2, 3, b.d + 0.2, wood); floor1.position.y = 1.5; g.add(floor1);
  const band = box(b.w + 0.3, 2.2, b.d + 0.3, glass); band.position.y = b.h * 0.62; band.rotation.z = -0.1; g.add(band);
  const roof = box(b.w + 0.8, 0.5, b.d + 0.8, mat(0xdde3ee)); roof.position.y = b.h + 0.25; g.add(roof);
  for (const sx of [-4.5, 4.5]) { const sky = box(4, 0.35, 3.2, glass); sky.position.set(sx, b.h + 0.65, 0); g.add(sky); }
  // 넓은 문
  const door = box(5, 3.4, 0.25, mat(0x6bb8dc, { transparent: true, opacity: 0.85 })); door.position.set(0, 1.7, b.d / 2 + 0.05); g.add(door);
  const frame = box(5.6, 3.9, 0.2, mat(0xffffff)); frame.position.set(0, 1.95, b.d / 2 - 0.02); g.add(frame);
  g.userData.fullHeight = b.h + 1;
  return g;
}

// 일반 건물 (벽 + 창 줄무늬 + 지붕)
export function buildBlock(b) {
  const g = new THREE.Group();
  const body = box(b.w, b.h, b.d, mat(b.color || 0xeeeeee)); body.position.y = b.h / 2; g.add(body);
  const roof = box(b.w + 0.6, 0.45, b.d + 0.6, mat(0xb9c0cf)); roof.position.y = b.h + 0.22; g.add(roof);
  const winM = mat(0x9ed4ee, { roughness: 0.3 });
  const floors = Math.max(1, Math.round(b.h / 3.2));
  const cols = Math.max(2, Math.round(b.w / 3));
  for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) {
    const wd = box(1.5, 1.3, 0.12, winM);
    wd.position.set(-b.w / 2 + (c + 0.5) * (b.w / cols), 2.4 + f * 3.1, b.d / 2 + 0.03); g.add(wd);
  }
  const door = box(2.2, 2.4, 0.15, mat(0x7aa6d9)); door.position.set(0, 1.2, b.d / 2 + 0.05); g.add(door);
  return g;
}

// 정문 게이트
export function buildGate(p) {
  const g = new THREE.Group();
  const stone = mat(0xe9edf5);
  for (const sx of [-5.2, 5.2]) { const pl = box(1.5, 5, 1.5, stone); pl.position.set(sx, 2.5, 0); g.add(pl); }
  const arch = box(12.4, 1.2, 1.4, stone); arch.position.set(0, 5.2, 0); g.add(arch);
  // 꽃밭
  const dirt = mat(0x8a6a4c);
  for (const sx of [-8, 8]) {
    const bed = box(4, 0.5, 1.6, dirt); bed.position.set(sx, 0.25, 0.4); g.add(bed);
    for (let i = 0; i < 6; i++) {
      const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), mat([0xff7aa8, 0xffd23f, 0xffffff, 0xff9a4a, 0xb18cff, 0xff7aa8][i]));
      f.position.set(sx - 1.5 + i * 0.6, 0.78, 0.4 + (i % 2 ? 0.25 : -0.25)); f.castShadow = true; g.add(f);
    }
  }
  return g;
}

// 운동장 트랙 (걸어 들어갈 수 있는 평평한 타원)
export function buildTrack(p) {
  const g = new THREE.Group();
  const rx = p.w / 2, rz = p.d / 2;
  const ellipse = (sx, sz, y, color) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(1, 64), mat(color, { flatShading: false }));
    m.rotation.x = -Math.PI / 2; m.scale.set(sx, sz, 1); m.position.y = y; m.receiveShadow = true; return m;
  };
  g.add(ellipse(rx, rz, 0.04, 0xe1735a));
  g.add(ellipse(rx - 2.8, rz - 2.8, 0.06, 0xe1735a));
  g.add(ellipse(rx - 3.0, rz - 3.0, 0.07, 0x8fd18a));
  // 레인 선
  for (let i = 1; i <= 2; i++) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(1 - 0.012, 1, 96), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    ring.rotation.x = -Math.PI / 2; ring.scale.set(rx - i * 0.9, rz - i * 0.9, 1); ring.position.y = 0.075; g.add(ring);
  }
  // 골대
  for (const sx of [-1, 1]) {
    const goal = box(0.2, 1.6, 3, mat(0xffffff)); goal.position.set(sx * (rx - 5.5), 0.8, 0); g.add(goal);
  }
  return g;
}

export function buildTree(kind = 'green') {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 1.9, 6), mat(0x8b6240)); trunk.position.y = 0.95; trunk.castShadow = true; g.add(trunk);
  const leaf = kind === 'cherry' ? [0xffb7cf, 0xffa3c2, 0xffc9dc] : [0x6cc06a, 0x58b05b, 0x7fcf74];
  [[0, 2.7, 0, 1.35], [0.7, 2.3, 0.2, 0.95], [-0.6, 2.4, -0.3, 1.0]].forEach(([x, y, z, r], i) => {
    const l = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), mat(leaf[i % 3])); l.position.set(x, y, z); l.castShadow = true; g.add(l);
  });
  return g;
}

// 입장 포털 (빛나는 고리)
export function buildPortal() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 0.3, 24), mat(0xc9ced8, { flatShading: false })); base.position.y = 0.15; base.receiveShadow = true; g.add(base);
  const ringM = new THREE.MeshStandardMaterial({ color: 0x35e0ff, emissive: 0x2cc8ff, emissiveIntensity: 1.4, roughness: 0.3 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.14, 12, 40), ringM); ring.position.y = 1.7; g.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.06, 8, 40), new THREE.MeshStandardMaterial({ color: 0xb78bff, emissive: 0x9a6bff, emissiveIntensity: 1.2 })); ring2.position.y = 1.7; g.add(ring2);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.28, 32), new THREE.MeshBasicMaterial({ color: 0x7fe9ff, transparent: true, opacity: 0.22, side: THREE.DoubleSide })); disc.position.y = 1.7; g.add(disc);
  g.userData = { ring, ring2, disc, ringM };
  return g;
}

// 떠 있는 위치 마커 (노란 핀)
export function buildMarker() {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xffb300, emissiveIntensity: 0.7, roughness: 0.4, flatShading: true });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.1, 4), m); cone.rotation.x = Math.PI; cone.position.y = 0.55; g.add(cone);
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), m); ball.position.y = 1.35; g.add(ball);
  return g;
}

// 주인공 (스포츠 재킷, 모자) — 특정 인물을 닮지 않은 기본형
export function buildPlayer() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.55, 4, 10), mat(0xff7a45, { flatShading: false })); body.position.y = 0.95; body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 12), mat(0xffd9b8, { flatShading: false })); head.position.y = 1.7; head.castShadow = true; g.add(head);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.38, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x2f6fe0, { flatShading: false })); cap.position.y = 1.78; cap.castShadow = true; g.add(cap);
  const brim = box(0.44, 0.06, 0.3, mat(0x2f6fe0)); brim.position.set(0, 1.76, 0.36); g.add(brim);
  const eyeM = new THREE.MeshBasicMaterial({ color: 0x222222 });
  for (const ex of [-0.12, 0.12]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeM); e.position.set(ex, 1.68, 0.33); g.add(e); }
  for (const sx of [-0.18, 0.18]) { const leg = box(0.2, 0.4, 0.24, mat(0x2b3a67)); leg.position.set(sx, 0.2, 0); g.add(leg); }
  return g;
}

// 안내원 (옥쌤 그림을 세워 둠)
export function buildGuide(texture) {
  const aspect = texture.image.width / texture.image.height;
  const h = 3.4;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  s.scale.set(h * aspect, h, 1); s.center.set(0.5, 0);
  return s;
}

// 글자를 둥근 판에 그려 허공에 띄우는 이름표 (카메라를 항상 바라봄)
export function labelSprite(text, fg = '#27407a') {
  const c = document.createElement('canvas'); const g = c.getContext('2d');
  const font = '800 56px "Pretendard","Noto Sans KR","Malgun Gothic",sans-serif'; g.font = font;
  const w = Math.ceil(g.measureText(text).width) + 72; c.width = w; c.height = 100;
  g.font = font; g.fillStyle = '#ffffffee'; g.strokeStyle = '#9fb7e8'; g.lineWidth = 8;
  const r = 40; g.beginPath(); g.moveTo(r, 4); g.arcTo(w - 4, 4, w - 4, 96, r); g.arcTo(w - 4, 96, 4, 96, r); g.arcTo(4, 96, 4, 4, r); g.arcTo(4, 4, w - 4, 4, r); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, 54);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  sp.scale.set(w / 100 * 0.95, 0.95, 1); sp.renderOrder = 10; return sp;
}

export function buildPine() {
  const g = new THREE.Group(); const t = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.4, 6), mat(0x7a5638)); t.position.y = 0.7; t.castShadow = true; g.add(t);
  [[0, 1.5, 1.5], [0, 2.7, 1.15], [0, 3.8, 0.8]].forEach(([x, y, r], i) => { const c = new THREE.Mesh(new THREE.ConeGeometry(r, 1.7, 7), mat([0x3f9a5b, 0x4aa866, 0x58b574][i])); c.position.y = y + 0.4; c.castShadow = true; g.add(c); });
  return g;
}
export function buildRock() {
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9, 0), mat(0x9aa0aa)); m.scale.set(1.2, 0.8, 1); m.position.y = 0.55; m.castShadow = true; const g = new THREE.Group(); g.add(m); return g;
}
export function buildBush() {
  const g = new THREE.Group(); [[0, 0.6, 0, 0.7], [0.55, 0.45, 0.2, 0.5], [-0.5, 0.45, -0.1, 0.5]].forEach(([x, y, z, r]) => { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), mat(0x5fb860)); b.position.set(x, y, z); b.castShadow = true; g.add(b); }); return g;
}
export function buildFlower() {
  const g = new THREE.Group(); const cols = [0xff7aa8, 0xffd23f, 0xffffff, 0xb18cff, 0xff9a4a];
  for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), mat(cols[(i * 2 + 1) % 5])); f.position.set((i - 1) * 0.35, 0.35 + (i % 2) * 0.1, (i % 2) * 0.2); g.add(f); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 4), mat(0x4a9a4a)); st.position.set((i - 1) * 0.35, 0.17, (i % 2) * 0.2); g.add(st); }
  return g;
}
export function buildLog() {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 3, 8), mat(0x8b6240)); m.rotation.z = Math.PI / 2; m.position.y = 0.4; m.castShadow = true; const g = new THREE.Group(); g.add(m); return g;
}

export { mat, box };
