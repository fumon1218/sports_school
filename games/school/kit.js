// 학교 체험 게임 공통 도구: 화면 맞춤, 큰 버튼 하나, 효과음, 사람 그리기, 끝 화면
// 모든 게임은 방향·버튼 중 '버튼 하나'로 하고, 실패나 시간 제한이 없어요.
const Kit = (() => {
  const q = new URLSearchParams(location.search); const level = +q.get('level') || 1; const easy = level <= 2;
  const cv = document.createElement('canvas'); document.body.appendChild(cv); const ctx = cv.getContext('2d');
  const K = { q, level, easy, ctx, W: 0, H: 0, t: 0 };
  function fit() { const d = Math.min(devicePixelRatio || 1, 2); K.W = innerWidth; K.H = innerHeight; cv.width = K.W * d; cv.height = K.H * d; ctx.setTransform(d, 0, 0, d, 0, 0); }
  addEventListener('resize', fit); fit();
  const say = document.createElement('div'); say.id = 'say'; document.body.appendChild(say);
  const hud = document.createElement('div'); hud.id = 'hud'; document.body.appendChild(hud);
  const act = document.createElement('button'); act.id = 'act'; act.type = 'button'; document.body.appendChild(act);
  const ov = document.createElement('div'); ov.id = 'overlay'; ov.hidden = true; document.body.appendChild(ov);
  K.say = (t) => { say.textContent = t; say.style.opacity = t ? 1 : 0; };
  K.hud = (t) => { hud.textContent = t; };
  K.label = (t) => { act.textContent = t; };
  let handler = null;
  K.onPress = (fn) => { handler = fn; };
  const fire = (e) => { if (e) e.preventDefault(); if (!ov.hidden) return; act.classList.add('down'); setTimeout(() => act.classList.remove('down'), 90); if (handler) handler(); };
  act.addEventListener('pointerdown', fire);
  addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) fire(e); });
  cv.addEventListener('pointerdown', fire);
  // 소리
  let ac = null;
  K.beep = (f = 660, d = 0.12, type = 'sine', v = 0.12) => { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f; g.gain.value = v; g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + d); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + d); } catch (e) {} };
  K.good = () => { K.beep(660, 0.1); setTimeout(() => K.beep(880, 0.14), 90); };
  K.soft = () => K.beep(300, 0.12, 'triangle', 0.08);
  // 안내 · 끝 화면
  K.start = (title, text, go) => { ov.hidden = false; ov.innerHTML = `<div class="card"><h2>${title}</h2><p>${text}</p><button type="button">시작하기</button></div>`; ov.querySelector('button').onclick = () => { ov.hidden = true; K.beep(520, 0.1); go(); }; };
  K.finish = (title, text, stars, again) => { ov.hidden = false; ov.innerHTML = `<div class="card"><h2>${title}</h2><div class="stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div><p>${text}</p><button type="button">한 번 더</button></div>`; K.good(); ov.querySelector('button').onclick = () => { ov.hidden = true; again(); }; };
  // 반복
  K.run = (update, draw) => { let last = performance.now(); const f = (n) => { requestAnimationFrame(f); const dt = Math.min((n - last) / 1000, 0.05); last = n; K.t += dt; update(dt); draw(ctx, K.W, K.H); }; requestAnimationFrame(f); };
  // 그리기 도구
  K.rr = (x, y, w, h, r, fill, stroke) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); } };
  K.circle = (x, y, r, fill) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); };
  K.text = (t, x, y, size, color = '#233a6b', align = 'center') => { ctx.font = `900 ${size}px "Pretendard","Noto Sans KR",system-ui,sans-serif`; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.fillText(t, x, y); };
  K.ring = (x, y, r, p, color = '#ff7a2f') => { // p: 1(크게) → 0(맞는 순간)
    ctx.lineWidth = 6; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke(); ctx.strokeStyle = color; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(x, y, r + r * 1.2 * Math.max(0, p), 0, 7); ctx.stroke(); };
  K.sky = (h, c1 = '#8fd0ff', c2 = '#e8f7ff') => { const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.fillRect(0, 0, K.W, h); };
  K.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  K.lerp = (a, b, t) => a + (b - a) * t;
  // 가는 선으로 팔다리를 그리는 사람. pose: 각도(라디안, 0=아래, 양수=앞쪽(+x))
  K.person = (x, y, s, o = {}) => {
    const c = Object.assign({ gi: '#fff', pants: '#fff', belt: '#222', skin: '#f2c29b', hair: '#3a2a22', face: 1, rot: 0, lean: 0, aU: [0.25, 0.25], aF: [0.1, 0.1], lU: [0.12, -0.12], lF: [0.12, -0.12], cap: null, outline: '#0002' }, o);
    ctx.save(); ctx.translate(x, y); ctx.rotate(c.rot); ctx.scale(c.face, 1);
    const limb = (x0, y0, a1, l1, a2, l2, w, col) => { const x1 = x0 + Math.sin(a1) * l1, y1 = y0 + Math.cos(a1) * l1, x2 = x1 + Math.sin(a2) * l2, y2 = y1 + Math.cos(a2) * l2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); return [x2, y2]; };
    const hipY = -s * 0.95, shY = -s * 1.55, lean = c.lean * s;
    for (const i of [1, 0]) limb(0, hipY, c.lU[i], s * 0.5, c.lF[i], s * 0.5, s * 0.2, c.pants);
    ctx.fillStyle = '#fff'; for (const i of [1, 0]) { const a = c.lU[i], b = c.lF[i]; const fx = Math.sin(a) * s * 0.5 + Math.sin(b) * s * 0.5, fy = hipY + Math.cos(a) * s * 0.5 + Math.cos(b) * s * 0.5; K.circle(fx + s * 0.06, fy, s * 0.11, c.skin); }
    ctx.lineCap = 'round'; ctx.strokeStyle = c.gi; ctx.lineWidth = s * 0.55; ctx.beginPath(); ctx.moveTo(0, hipY); ctx.lineTo(lean, shY); ctx.stroke();
    ctx.strokeStyle = c.belt; ctx.lineWidth = s * 0.14; ctx.beginPath(); ctx.moveTo(-s * 0.27, hipY - s * 0.05); ctx.lineTo(s * 0.27, hipY - s * 0.05); ctx.stroke();
    for (const i of [1, 0]) { const hand = limb(lean, shY + s * 0.04, c.aU[i], s * 0.42, c.aF[i], s * 0.4, s * 0.17, c.gi); K.circle(hand[0], hand[1], s * 0.1, c.skin); }
    K.circle(lean, shY - s * 0.28, s * 0.3, c.skin);
    ctx.fillStyle = c.hair; ctx.beginPath(); ctx.arc(lean - s * 0.03, shY - s * 0.32, s * 0.32, Math.PI * 1.02, Math.PI * 1.98); ctx.fill();
    if (c.cap) { ctx.fillStyle = c.cap; ctx.beginPath(); ctx.arc(lean, shY - s * 0.3, s * 0.32, Math.PI, 0); ctx.fill(); }
    K.circle(lean + s * 0.1, shY - s * 0.27, s * 0.035, '#222'); K.circle(lean + s * 0.2, shY - s * 0.2, s * 0.035, '#222');
    ctx.strokeStyle = '#c0665a'; ctx.lineWidth = s * 0.03; ctx.beginPath(); ctx.arc(lean + s * 0.16, shY - s * 0.14, s * 0.06, 0.2, 2.6); ctx.stroke();
    ctx.restore();
  };

  // 옥쌤의 즐거운 교실 캐릭터(스프라이트)를 가져와 써요: 발 중앙이 기준점
  const BASE = new URL('../oks/sports/assets/', document.currentScript ? document.currentScript.src : location.href).href;
  const FILES = { run_idle: 'athletics/runner_idle', run_ready: 'athletics/runner_ready', run_a: 'athletics/runner_run_a', run_b: 'athletics/runner_run_b', hurdle: 'athletics/runner_hurdle', win: 'athletics/runner_celebrate',
    tt_boy: 'tabletennis/boy_ready', tt_boy_hit: 'tabletennis/boy_hit', tt_girl: 'tabletennis/girl_ready', tt_girl_hit: 'tabletennis/girl_hit', tt_girl_cheer: 'tabletennis/girl_cheer',
    tn_boy: 'tennis/boy_ready', tn_boy_hit: 'tennis/boy_hit', tn_boy_serve: 'tennis/boy_serve', tn_boy_cheer: 'tennis/boy_cheer', tn_girl: 'tennis/girl_ready', tn_girl_hit: 'tennis/girl_hit' };
  const SP = {};
  const trim = (img) => { const w = img.naturalWidth, h = img.naturalHeight, cn = document.createElement('canvas'); cn.width = w; cn.height = h; const g = cn.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, w, h).data;
    // 가장자리에 남은 부스러기를 빼려고, 4칸씩 묶어서 가장 큰 덩어리만 남겨요
    const B = 4, gw = Math.ceil(w / B), gh = Math.ceil(h / B), on = new Uint8Array(gw * gh); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) on[((y / B) | 0) * gw + ((x / B) | 0)] = 1;
    const lab = new Int32Array(gw * gh), sizes = []; let n = 0;
    for (let i = 0; i < gw * gh; i++) if (on[i] && !lab[i]) { n++; let c = 0; const st = [i]; lab[i] = n; while (st.length) { const j = st.pop(); c++; const jx = j % gw, jy = (j / gw) | 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const nx = jx + dx, ny = jy + dy; if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue; const k = ny * gw + nx; if (on[k] && !lab[k]) { lab[k] = n; st.push(k); } } } sizes[n] = c; }
    let best = 1; for (let i = 1; i <= n; i++) if (sizes[i] > sizes[best]) best = i;
    let x0 = gw, x1 = 0, y0 = gh, y1 = 0; for (let i = 0; i < gw * gh; i++) if (lab[i] === best) { const x = i % gw, y = (i / gw) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    x0 *= B; y0 *= B; x1 = Math.min(w, (x1 + 1) * B); y1 = Math.min(h, (y1 + 1) * B);
    return { img, sx: x0, sy: y0, sw: x1 - x0, sh: y1 - y0 }; };
  const load = (k, url) => { const im = new Image(); im.onload = () => { try { SP[k] = trim(im); } catch (e) { SP[k] = { img: im, sx: 0, sy: 0, sw: im.naturalWidth, sh: im.naturalHeight }; } }; im.src = url; };
  for (const k in FILES) load(k, BASE + FILES[k] + '.webp');
  load('sq', new URL('../../assets/ui/av_squirrel.webp', document.currentScript ? document.currentScript.src : location.href).href); // 학교 다람쥐 마스코트
  // 새로 만든 그림(games/school/img): 여러 포즈가 같은 크기로 맞춰져 있어서 자르지 않고 그대로 써요
  const IMG = new URL('img/', document.currentScript ? document.currentScript.src : location.href).href;
  for (const k of ['swim_a', 'swim_b', 'tkd_ready', 'tkd_kick', 'judo_0', 'judo_1', 'judo_2', 'judo_3', 'judo_bow', 'item_top', 'item_pants', 'item_belt']) { const im = new Image(); im.onload = () => { SP[k] = { img: im, sx: 0, sy: 0, sw: im.naturalWidth, sh: im.naturalHeight }; }; im.src = IMG + k + '.webp'; }
  // K.spr(이름, 발 x, 발 y, 키(px), {face:-1이면 왼쪽 보기, rot, alpha, shadow, px:기준점 가로비율}) → 그려진 가로 너비
  K.spr = (name, x, y, h, o = {}) => { const a = SP[name]; if (!a) return 0; const keep = o.crop || 1, sh = a.sh * keep, w = h * a.sw / sh;
    if (o.shadow !== false) { ctx.fillStyle = '#0002'; ctx.beginPath(); ctx.ellipse(x, y + 2, w * 0.42, h * 0.045, 0, 0, 7); ctx.fill(); }
    ctx.save(); ctx.translate(x, y - (o.lift || 0)); if (o.rot) ctx.rotate(o.rot); ctx.scale(o.face || 1, 1); if (o.alpha != null) ctx.globalAlpha = o.alpha; if (o.filter) ctx.filter = o.filter;
    ctx.drawImage(a.img, a.sx, a.sy, a.sw, sh, -w * (o.px == null ? 0.5 : o.px), -h, w, h); ctx.restore(); return w; };
  K.sprW = (name, h) => { const a = SP[name]; return a ? h * a.sw / a.sh : h * 0.6; };
  K.particles = []; K.burst = (x, y, color = '#ffd24a', n = 14) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = 80 + Math.random() * 200; K.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, life: 0.7 + Math.random() * 0.4, c: color }); } };
  K.drawParticles = (dt) => { for (const p of K.particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt; K.circle(p.x, p.y, 5, p.c); } K.particles = K.particles.filter((p) => p.life > 0); };
  return K;
})();
