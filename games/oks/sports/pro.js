/* ⚾ 스타 리그 (야구 전문가반)
   고등 과정을 마치면 열리는 야구 확장 코스. 3가지 모드 중 하나를 골라요.
   A 타자 중심 : 구종(직구·커브·슬라이더·체인지업)을 보고 타이밍에 맞춰 쳐요. 수비는 자동.
   B 타자+투수 : 공격은 치고, 수비는 구종을 골라 타이밍에 맞춰 던져요.
   C 감독      : 작전 카드를 골라요. 공격은 작전, 수비는 구종 선택. 타이밍 없음(조작이 가장 쉬워요).
   규칙: 3아웃 공수교대, 한 이닝 최대 5타자, 볼 4개 볼넷, 스트라이크 3개 삼진. 지거나 못 쳐도 별 1개는 받아요. */
(function (g) {
  'use strict';
  var O = g.OKS, E = O.el, A = './assets/baseball/';
  var FAST = /[?&]dev=fast/.test(location.search);
  var NAME = '스타 리그';
  var MODES = {
    a: { name: '타자 중심', emo: '🏏', desc: '구종을 보고 타이밍에 맞춰 쳐요. 수비는 친구들이 해 줘요.' },
    b: { name: '타자 + 투수', emo: '🤾', desc: '칠 때도, 던질 때도 내가 해요. 구종을 골라 상대 약점을 노려요.' },
    c: { name: '감독', emo: '📋', desc: '작전 카드를 골라 팀을 이끌어요. 타이밍 없이 생각으로 이겨요.' }
  };
  var PITCH = {
    fast: { k: 'fast', name: '직구', emo: '🔥', tip: '빠르고 곧게 와요', dur: .62, arc: .03, side: 0 },
    curve: { k: 'curve', name: '커브', emo: '🌀', tip: '느리게 와서 아래로 뚝!', dur: 1.25, arc: .2, side: 0 },
    slider: { k: 'slider', name: '슬라이더', emo: '↗️', tip: '옆으로 휘어요', dur: .95, arc: .05, side: .07 },
    change: { k: 'change', name: '체인지업', emo: '🐢', tip: '직구처럼 보이지만 느려요', dur: 1.5, arc: .07, side: 0 }
  };
  var KINDS_BY_LV = [['fast', 'change'], ['fast', 'change', 'curve'], ['fast', 'change', 'curve', 'slider'], ['fast', 'change', 'curve', 'slider'], ['fast', 'change', 'curve', 'slider']];
  var DUR = [2.9, 2.4, 2.0, 1.7, 1.4];
  var WIN = [[.78, 1.02], [.78, 1.02], [.82, 1.0], [.85, .995], [.88, .99]];
  var BALLP = [0, .3, .3, .35, .35];
  var MV = [.55, .7, .9, 1.1, 1.3], MZ = [.36, .3, .22, .17, .13];   /* 던지기 표시 속도·초록 칸 */
  var HITNAME = ['', '안타!', '2루타!', '3루타!', '홈런!'];
  var RULES = [
    ['몇 번 아웃이면 공격과 수비가 바뀔까요?', ['3번', 1], ['1번', 0], ['5번', 0]],
    ['볼이 4개가 되면 어떻게 될까요?', ['볼넷! 1루로 걸어가요', 1], ['삼진 아웃', 0], ['홈런', 0]],
    ['스트라이크가 몇 개면 삼진 아웃일까요?', ['3개', 1], ['2개', 0], ['4개', 0]],
    ['1점은 어떻게 얻을까요?', ['홈까지 돌아와요', 1], ['1루만 가요', 0], ['공을 잡아요', 0]],
    ['느리게 오다가 아래로 뚝 떨어지는 공은?', ['커브', 1], ['직구', 0], ['슬라이더', 0]],
    ['가장 빠르고 곧게 오는 공은?', ['직구', 1], ['체인지업', 0], ['커브', 0]],
    ['직구처럼 던지지만 느리게 오는 공은?', ['체인지업', 1], ['직구', 0], ['커브', 0]],
    ['홈런을 치면 몇 베이스를 돌까요?', ['4베이스(홈까지)', 1], ['1베이스', 0], ['2베이스', 0]],
    ['수비할 때 공을 받는 도구는?', ['글러브', 1], ['탁구채', 0], ['털장갑', 0]],
    ['옆으로 휘어서 오는 공은?', ['슬라이더', 1], ['직구', 0], ['체인지업', 0]]
  ];
  var BEST_KEY = 'oks_starleague_best_v1';
  function best() { return O.jget(BEST_KEY, {}); }
  function pick(a) { return a[Math.random() * a.length | 0]; }

  function mount(opt) {
    var sh = opt.sh, lv = opt.level, mode = opt.mode || 'a', board = sh.board, st = opt.stats, ctx = opt.ctx;
    var assisted = lv <= 2 || O.settings().scan || O.settings().slow;
    var calm = O.settings().calm || (g.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    var slowK = O.settings().slow ? 1.3 : 1;
    var KINDS = KINDS_BY_LV[lv - 1], INN = lv === 1 ? 2 : 3;
    var dead = false, t0 = Date.now(), score = 0, coins = 0, hits = 0, ks = 0, got = 0, metrics = [];
    var S = { our: 0, opp: 0, inn: 0, outs: 0, bases: [0, 0, 0], side: 'off' };
    var LU = []; try { LU = g.OKS_TYCOON && g.OKS_TYCOON.lineup ? g.OKS_TYCOON.lineup() : []; } catch (e) { LU = []; }
    board.className = 'oks-board in-scene bb-board pr-board';

    var bar = E('div', 'pr-bar');
    var stage = E('div', 'bb-stage');
    stage.innerHTML = '<div class="pr-cam"><div class="bb-sky"></div><img class="bb-ump" alt="" draggable="false"><img class="bb-catcher" alt="" draggable="false">' +
      '<img class="bb-pitcher" alt="" draggable="false"><img class="bb-batter" alt="" draggable="false"><img class="bb-zone" alt="" draggable="false">' +
      '<img class="bb-ball" alt="" draggable="false" hidden><div class="bb-fx"></div></div><div class="pr-slowtag">🎬 슬로우 모션</div><button type="button" class="pr-camtog"></button>' +
      '<div class="bb-hud"><span class="bb-count"></span><span class="bb-now"></span><span class="bb-score">⭐ <b>0</b></span></div>' +
      '<div class="pr-plate"></div><div class="bb-banner" aria-live="polite"></div>';
    var dock = E('div', 'bb-dock pr-dock');
    board.appendChild(bar); board.appendChild(stage); board.appendChild(dock);
    var $ = function (s) { return stage.querySelector(s); };
    var sky = $('.bb-sky'), ump = $('.bb-ump'), catcher = $('.bb-catcher'), pitcher = $('.bb-pitcher'), batter = $('.bb-batter'), zone = $('.bb-zone'), ball = $('.bb-ball'),
      fx = $('.bb-fx'), cam = $('.pr-cam'), slowTag = $('.pr-slowtag'), camTog = $('.pr-camtog'), cnt = $('.bb-count'), nowEl = $('.bb-now'), scoreEl = $('.bb-score b'), banner = $('.bb-banner'), plate = $('.pr-plate');
    sky.style.backgroundImage = 'url(' + A + 'bg_main.webp)'; zone.src = A + 'strikezone.webp'; ump.src = A + 'umpire_idle.webp'; ball.src = A + 'ball.webp';
    function sp(el, n) { if (el._n !== n) { el._n = n; el.src = A + n + '.webp'; } }
    sp(catcher, 'catcher_ready'); sp(pitcher, 'pitcher_ready'); sp(batter, 'batter_wait');
    /* 클로즈업 카메라: 차분 모드이거나 끄면 쓰지 않아요 */
    var camOn = !calm; try { if (localStorage.getItem('oks_pro_cam') === '0') camOn = false; } catch (e) { }
    function drawTog() { camTog.textContent = camOn ? '🎬 클로즈업 켜짐' : '🎬 클로즈업 꺼짐'; camTog.classList.toggle('off', !camOn); }
    camTog.onclick = function (e) { e.stopPropagation(); camOn = !camOn; try { localStorage.setItem('oks_pro_cam', camOn ? '1' : '0'); } catch (x) { } if (!camOn) zoom(1); drawTog(); O.sfx('tick'); };
    drawTog();
    function zoom(sc, ox, oy, ms) {
      if (!camOn && sc !== 1) return;
      cam._sc = sc; cam.style.transition = sc === 1 && !ms ? 'none' : 'transform ' + ((ms || 500) / (FAST ? 4 : 1)) + 'ms cubic-bezier(.3,.1,.2,1)';
      if (ox != null) cam.style.transformOrigin = ox + ' ' + oy;
      cam.style.transform = sc === 1 ? 'none' : 'scale(' + sc + ')';
    }

    var onMain = null, mainBtn = null, timers = [], raf = 0, last = 0, pit = null, fl = null, mt = null;
    function later(fn, ms) { var h = setTimeout(function () { if (!dead) fn(); }, ms / (FAST ? 4 : 1)); timers.push(h); return h; }
    function wait(ms) { return new Promise(function (res) { later(res, ms); }); }
    function say(t, ms) { banner.textContent = t; banner.classList.remove('show'); void banner.offsetWidth; banner.classList.add('show'); if (ms) later(function () { banner.classList.remove('show'); }, ms); }
    var J = g.OKS_JUICE.attach({ stage: stage, later: later, calm: calm, st: st, balls: function () { return [ball]; } });
    function addScore(n) { n = J.win(n); score += n; coins += Math.max(1, n / 10 | 0); scoreEl.textContent = score; }
    function setMain(label, fn, cls) {
      dock.innerHTML = ''; var b = E('button', 'oks-btn bb-main ' + (cls || ''), label); b.type = 'button'; mainBtn = b; onMain = fn;
      b.onclick = function () { if (onMain) onMain(); }; dock.appendChild(b); return b;
    }
    function glow(el) { ctx.target({ get: function () { return el || mainBtn; } }); }
    function press() { if (onMain && !dead) onMain(); }
    function onKey(e) {
      if (O.settings().scan || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || document.querySelector('.oks-overlay')) return;
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'Enter') { if (e.target.tagName === 'BUTTON' && e.key !== 'ArrowUp') return; e.preventDefault(); if (!e.repeat) press(); }
    }
    document.addEventListener('keydown', onKey);
    stage.addEventListener('pointerdown', function (e) { if (e.target.closest('button')) return; press(); });
    function stop() { dead = true; try { cam.style.transform = 'none'; } catch (e) { } cancelAnimationFrame(raf); timers.forEach(clearTimeout); document.removeEventListener('keydown', onKey); }
    addEventListener('pagehide', stop, { once: true });

    /* ---------- 점수판 ---------- */
    function drawBar() {
      var o = '';
      for (var i = 0; i < 3; i++) o += '<i class="' + (i < S.outs ? 'on' : '') + '"></i>';
      bar.innerHTML = '<div class="pr-tm"><b>우리</b><em>' + S.our + '</em></div><span class="pr-vs">:</span><div class="pr-tm opp"><em>' + S.opp + '</em><b>상대</b></div>' +
        '<div class="pr-inn">' + (S.inn + 1) + '회 ' + (S.side === 'off' ? '공격 ⚔️' : '수비 🛡️') + '</div><div class="pr-out"><small>아웃</small>' + o + '</div>' +
        '<div class="pr-dia" aria-label="주자"><u class="b2' + (S.bases[1] ? ' on' : '') + '"></u><u class="b3' + (S.bases[2] ? ' on' : '') + '"></u><u class="b1' + (S.bases[0] ? ' on' : '') + '"></u><u class="b0"></u></div>';
    }
    function drawCount(b, s) {
      var dots = function (n, max, c) { var h = ''; for (var i = 0; i < max; i++) h += '<i class="' + c + (i < n ? ' on' : '') + '"></i>'; return h; };
      cnt.innerHTML = '<em>볼</em>' + dots(b, 4, 'b') + '<em>스트라이크</em>' + dots(s, 3, 's');
    }
    function burst(x, y) { if (calm) return; var s = E('img', 'bb-burst'); s.src = A + 'hit_burst.webp'; s.style.left = x + 'px'; s.style.top = y + 'px'; fx.appendChild(s); later(function () { s.remove(); }, 700); }

    /* ---------- 공 길과 던지기 ---------- */
    function rects() {
      var keep = cam.style.transform; cam.style.transform = 'none'; var tr = cam.style.transition; cam.style.transition = 'none';
      var out = rects0(); cam.style.transform = keep; void cam.offsetWidth; cam.style.transition = tr; return out;
    }
    function rects0() {
      var S0 = stage.getBoundingClientRect(), Z = zone.getBoundingClientRect(), P = pitcher.getBoundingClientRect(), k = S0.width / (stage.clientWidth || S0.width) || 1;
      return { W: S0.width / k, H: S0.height / k, zx: (Z.left - S0.left + Z.width / 2) / k, zy: (Z.top - S0.top + Z.height / 2) / k, zw: Z.width / k, zh: Z.height / k, px: (P.left - S0.left + P.width * .22) / k, py: (P.top - S0.top + P.height * .3) / k };
    }
    function place(R, q, scale, pt) {
      var s = Math.sin(Math.PI * q);
      var x = R.sx + (R.tx - R.sx) * q + (R.sgn || 1) * (pt.side || 0) * R.W * s, y = R.sy + (R.ty - R.sy) * q - s * R.H * (pt.arc || .05);
      ball.style.left = x + 'px'; ball.style.top = y + 'px'; ball.style.setProperty('--s', scale); R.cx = x; R.cy = y;
    }
    function target(R, spec) { R.tx = R.zx + spec.ox * R.zw / 2; R.ty = R.zy + spec.oy * R.zh / 2; R.sx = R.px; R.sy = R.py; R.sgn = Math.random() < .5 ? -1 : 1; }
    function spec(first, forceStrike) {
      var isBall = !forceStrike && lv >= 2 && (first ? Math.random() < BALLP[lv - 1] * .5 : Math.random() < BALLP[lv - 1]), ox, oy;
      if (!isBall) { ox = (Math.random() - .5) * 1.1; oy = (Math.random() - .5) * 1.2; }
      else if (Math.random() < .5) { ox = (Math.random() < .5 ? -1 : 1) * (1.25 + Math.random() * .35); oy = (Math.random() - .5) * 1.4; }
      else { ox = (Math.random() - .5) * 1.2; oy = (Math.random() < .5 ? -1 : 1) * (1.2 + Math.random() * .3); }
      return { strike: !isBall, ox: ox, oy: oy };
    }
    function typeBadge(pt) { plate.innerHTML = '<b>' + pt.emo + ' ' + pt.name + '</b><small>' + pt.tip + '</small>'; plate.classList.add('show'); plate.dataset.k = pt.k; }
    function hideBadge() { plate.classList.remove('show'); }
    function reset() { ball.hidden = true; sp(pitcher, 'pitcher_ready'); sp(batter, 'batter_wait'); sp(ump, 'umpire_idle'); sp(catcher, 'catcher_ready'); }

    /* 타자가 치는 공 */
    function throwBat(pt, sp0) {
      return new Promise(function (res) {
        var R = rects(); target(R, sp0); typeBadge(pt); O.say(pt.name, { noRepeat: true });
        sp(pitcher, 'pitcher_windup'); sp(batter, 'batter_ready'); sp(ump, 'umpire_idle'); sp(catcher, 'catcher_ready'); ball.hidden = true;
        zoom(1.9, '84%', '40%', 600);
        later(function () {
          sp(pitcher, 'pitcher_throw'); O.sfx('tick'); later(function () { zoom(1, null, null, 450); }, 120);
          pit = { R: R, pt: pt, spec: sp0, p: 0, paused: false, active: true, res: res, swung: false, dur: DUR[lv - 1] * pt.dur * slowK };
          ball.hidden = false; ball.style.transition = 'none'; ball.classList.remove('hit'); place(R, 0, .35, pt);
          if (assisted && !sp0.strike) later(function () { if (pit && pit.active) say('존 밖이에요! 참아요 ✋', 1400); }, pit.dur * 450);
          later(function () { sp(pitcher, 'pitcher_ready'); }, 600);
        }, 900);
      });
    }
    function swing() {
      var P = pit; if (!P || !P.active || P.swung) return;
      if (assisted && P.spec.strike && !P.paused && P.p < .5) { say('조금만 기다려요', 700); return; }
      P.swung = true; sp(batter, 'batter_swing1'); O.sfx('pop'); if (mainBtn) mainBtn.classList.add('press');
      later(function () { sp(batter, 'batter_swing2'); }, 110); later(function () { sp(batter, 'batter_follow'); }, 320);
      if (!P.spec.strike) { P.res0 = 'swingball'; return; }
      var w = WIN[lv - 1];
      if (assisted && P.paused) { P.hit = { q: lv === 1 ? [1, 1, 2, 2, 4][Math.random() * 5 | 0] : [1, 1, 2, 4][Math.random() * 4 | 0] }; return; }
      if (P.p >= w[0] && P.p <= w[1]) {
        var d = Math.abs(P.p - .94), pf = lv === 3 ? .045 : .03, gd = lv === 3 ? .1 : .07;
        P.hit = { q: d <= pf ? 4 : d <= gd ? 2 : 1 };
      } else P.res0 = P.p < w[0] ? 'early' : 'late';
    }
    function endBat(result, extra) {
      var P = pit; if (!P) return; P.active = false; pit = null; onMain = null; if (mainBtn) mainBtn.classList.remove('press');
      extra = extra || {}; extra.result = result; extra.p = P.p; P.res(extra);
    }
    function batFrame(dt) {
      var P = pit; if (!P || !P.active) return;
      if (P.hit) { hitAway(P.R, P.hit.q); pit = null; onMain = null; if (mainBtn) mainBtn.classList.remove('press'); P.res({ result: 'hit', bases: P.hit.q }); return; }
      if (P.paused) return;
      P.p += dt / P.dur;
      place(P.R, Math.min(1.04, P.p), .35 + .65 * Math.min(1, P.p), P.pt);
      if (assisted && P.spec.strike && P.p >= .93) { P.p = .93; P.paused = true; say('지금 쳐요!', 0); glow(); if (mainBtn) mainBtn.classList.add('now'); }
      if (P.p >= 1) {
        sp(catcher, 'catcher_catch'); O.sfx('tick'); ball.hidden = true;
        if (P.spec.strike && !P.res0) { zoom(1.6, '44%', '78%', 220); later(function () { zoom(1, null, null, 500); }, 600); }
        var r = P.res0 === 'swingball' ? 'swingball' : P.res0 ? P.res0 : P.spec.strike ? 'strike' : 'ball';
        endBat(r);
      }
    }
    function hitAway(R, q) {
      var slow = camOn && q >= 2, T = slow ? (q >= 4 ? 2.2 : 1.7) : 1.1;
      ball.style.transition = 'left ' + T + 's cubic-bezier(.2,.7,.4,1), top ' + T + 's cubic-bezier(.3,.1,.2,1), transform ' + T + 's';
      if (slow) {
        slowTag.classList.add('show'); zoom(1.8, R.cx + 'px', R.cy + 'px', 260);
        later(function () { zoom(1, null, null, 1100); }, 700); later(function () { slowTag.classList.remove('show'); }, 1500);
      }
      burst(R.cx, R.cy); O.sfx('coin'); stage.classList.remove('shake'); void stage.offsetWidth; if (!calm) stage.classList.add('shake');
      ball.classList.add('hit'); ball.style.setProperty('--s', .28);
      var far = q >= 4 ? [.9, .06] : q === 2 ? [.78, .16] : [.62, .34];
      ball.style.left = R.W * far[0] + 'px'; ball.style.top = R.H * far[1] + 'px'; sp(catcher, 'catcher_ready');
    }
    /* 내가 던지는 공 / 자동으로 보여 주는 공 (타이밍 없이 날아가요) */
    function flyBall(pt, sp0, ms) {
      return new Promise(function (res) {
        var R = rects(); target(R, sp0); typeBadge(pt);
        sp(pitcher, 'pitcher_windup'); sp(batter, 'batter_ready'); ball.hidden = true; zoom(1.9, '84%', '40%', 500);
        later(function () {
          sp(pitcher, 'pitcher_throw'); O.sfx('tick'); later(function () { zoom(1, null, null, 400); }, 120); ball.hidden = false; ball.style.transition = 'none'; ball.classList.remove('hit'); place(R, 0, .35, pt);
          fl = { R: R, pt: pt, p: 0, dur: ms / 1000, res: res };
          later(function () { sp(pitcher, 'pitcher_ready'); }, 600);
        }, 600);
      });
    }
    function flyFrame(dt) {
      var F = fl; if (!F) return; F.p += dt / F.dur; place(F.R, Math.min(1, F.p), .35 + .65 * Math.min(1, F.p), F.pt);
      if (F.p >= 1) { fl = null; sp(catcher, 'catcher_catch'); ball.hidden = true; F.res(F.R); }
    }

    /* ---------- 확률표 ---------- */
    function bump() { return (lv - 3) * .03; }
    function hitKind(r, t) {     /* t = 단타 상한, 2루타 상한... */
      return r < t[0] ? 1 : r < t[1] ? 2 : r < t[2] ? 3 : 4;
    }
    function resolveDef(pk, weak, good) {         /* 내가 던진 공에 대한 상대 타자 결과 */
      var r = Math.random(), b = bump();
      if (!good) return { kind: 'ball' };
      if (pk === weak) { if (r < .6) return { kind: 'k' }; if (r < .88) return { kind: 'out', how: pick(['뜬공', '땅볼']) }; return { kind: 'hit', bases: 1 }; }
      if (r < .45 - b) return { kind: 'out', how: pick(['뜬공', '땅볼']) };
      var h = (r - (.45 - b)) / (.55 + b);
      return { kind: 'hit', bases: hitKind(h, [.62, .86, .93]) };
    }
    function autoDef() {
      var r = Math.random(), b = bump();
      if (r < .28 - b) return { kind: 'k' };
      if (r < .66 - b) return { kind: 'out', how: pick(['뜬공', '땅볼']) };
      if (r < .72) return { kind: 'walk' };
      return { kind: 'hit', bases: hitKind(Math.random(), [.66, .9, .95]) };
    }
    function resolveOff(plan, pow) {              /* 감독 모드 공격 작전 */
      var r = Math.random(), up = (pow - 1) * .03, b = bump();
      if (plan === 'power') { if (r < .42 - up + b) return { kind: 'k' }; if (r < .52 - up + b) return { kind: 'out', how: '뜬공' }; return { kind: 'hit', bases: hitKind(Math.random(), [.22, .5, .62]) }; }
      if (plan === 'contact') { if (r < .36 - up + b) return { kind: 'out', how: pick(['뜬공', '땅볼']) }; if (r < .42 - up + b) return { kind: 'k' }; return { kind: 'hit', bases: hitKind(Math.random(), [.8, .96, .985]) }; }
      if (r < .36 - up * .5) return { kind: 'walk' };
      if (r < .72) return { kind: 'out', how: pick(['뜬공', '땅볼']) };
      return { kind: 'hit', bases: 1 };
    }

    /* ---------- 베이스 계산 ---------- */
    function advance(n) {
      var nb = [0, 0, 0], runs = 0, b = S.bases;
      for (var i = 2; i >= 0; i--) if (b[i]) { var to = i + 1 + n; if (to >= 4) runs++; else nb[to - 1] = 1; }
      if (n >= 4) runs++; else nb[n - 1] = 1;
      S.bases = nb; return runs;
    }
    function walkRun() { var b = S.bases, r = 0; if (b[0]) { if (b[1]) { if (b[2]) r = 1; b[2] = 1; } b[1] = 1; } b[0] = 1; return r; }

    /* ---------- 타자 정보 ---------- */
    function batInfo(idx) {
      var c = LU[(S.inn * 5 + idx) % 9] || null;
      return { name: c ? c.name : ((S.inn * 5 + idx) % 9 + 1) + '번 타자', pow: c ? c.power : 1, img: c ? c.img : null };
    }
    function showPlate(txt, sub) { plate.innerHTML = '<b>' + txt + '</b>' + (sub ? '<small>' + sub + '</small>' : ''); plate.classList.add('show'); delete plate.dataset.k; }

    /* ---------- 공격: 직접 치기 (A·B) ---------- */
    function batEngine(idx) {
      var balls = 0, strikes = 0, n = 0, bi = batInfo(idx); drawCount(0, 0);
      nowEl.textContent = bi.name + (bi.img ? '' : '');
      function once() {
        var pt = PITCH[pick(KINDS)];
        setMain('🏏 휘둘러요!', function () { swing(); }); if (assisted) ctx.target({ get: function () { return null; } });
        return throwBat(pt, spec(n === 0)).then(function (r) {
          n++;
          if (r.result === 'hit') return { kind: 'hit', bases: r.bases };
          if (r.result === 'ball') { balls++; drawCount(balls, strikes); say('볼!', 900); O.sfx('tick'); }
          else { strikes++; drawCount(balls, strikes); sp(ump, 'umpire_out'); O.sfx('no'); say(r.result === 'swingball' ? '헛스윙! 존 밖이에요' : r.result === 'early' ? '너무 빨랐어요' : r.result === 'late' ? '조금 늦었어요' : '스트라이크!', 1000); }
          if (strikes >= 3) return { kind: 'k' };
          if (balls >= 4) return { kind: 'walk' };
          return wait(1100).then(once);
        });
      }
      return once();
    }

    /* ---------- 수비: 직접 던지기 (B) ---------- */
    function pitchEngine(idx) {
      var weak = pick(KINDS), balls = 0, bi = { name: '상대 ' + (idx + 1) + '번 타자' };
      nowEl.textContent = bi.name; drawCount(0, 0);
      function choose() {
        showPlate('🎯 약점: ' + PITCH[weak].emo + ' ' + PITCH[weak].name, '상대 타자가 약한 공이에요');
        return new Promise(function (res) {
          dock.innerHTML = ''; mainBtn = null; onMain = null; var row = E('div', 'pr-picks'), btns = [];
          KINDS.forEach(function (k) {
            var p = PITCH[k], b = E('button', 'oks-btn pr-pk ' + k, '<span>' + p.emo + '</span><b>' + p.name + '</b><small>' + p.tip + '</small>'); b.type = 'button'; btns.push(b);
            b.onclick = function () { if (b._d) return; b._d = 1; O.sfx('pop'); O.say(p.name, { noRepeat: true }); res(p); }; row.appendChild(b);
          });
          dock.appendChild(row);
          if (assisted) ctx.target({ get: function () { return btns[KINDS.indexOf(weak)]; } });
        });
      }
      function meter(p) {
        return new Promise(function (res) {
          dock.innerHTML = '<div class="pr-meterwrap"><div class="pr-meter"><div class="pr-mz"></div><i class="pr-mk"></i></div></div>';
          var w = dock.querySelector('.pr-meterwrap'), zEl = w.querySelector('.pr-mz'), mk = w.querySelector('.pr-mk');
          zEl.style.width = MZ[lv - 1] * 100 + '%';
          var b = E('button', 'oks-btn bb-main', '🤾 던져요!'); b.type = 'button'; w.appendChild(b); mainBtn = b;
          mt = { x: 0, dir: 1, mk: mk, paused: false, res: res, done: false };
          onMain = function () {
            if (!mt || mt.done) return;
            if (assisted && !mt.paused) { say('조금만 기다려요', 700); return; }
            mt.done = true; var good = assisted ? true : Math.abs(mt.x - .5) <= MZ[lv - 1] / 2; b.classList.add('press'); var m = mt; mt = null; onMain = null; m.res(good);
          };
          b.onclick = function () { if (onMain) onMain(); };
        });
      }
      function once() {
        return choose().then(function (p) {
          return meter(p).then(function (good) {
            dock.innerHTML = ''; hideBadge();
            var sp0 = good ? spec(false, true) : { strike: false, ox: (Math.random() < .5 ? -1 : 1) * 1.4, oy: (Math.random() - .5) * 1.2 }, res = resolveDef(p.k, weak, good);
            return flyBall(p, sp0, (assisted ? 1000 : 750) * (p.dur + .3)).then(function (R) {
              if (res.kind === 'ball') { balls++; drawCount(balls, 0); say('볼! 조금만 더 정확히', 1000); O.sfx('tick'); if (balls >= 4) return { kind: 'walk' }; return wait(900).then(once); }
              if (res.kind === 'hit') { sp(batter, 'batter_swing2'); hitAway(R, res.bases); }
              else if (res.kind === 'k') { sp(batter, 'batter_swing2'); sp(ump, 'umpire_out'); }
              return res;
            });
          });
        });
      }
      return once();
    }

    /* ---------- 감독 모드 ---------- */
    function planOff(idx) {
      var bi = batInfo(idx); nowEl.textContent = bi.name; drawCount(0, 0); sp(batter, 'batter_ready');
      showPlate('📋 ' + bi.name, '어떤 작전으로 칠까요?');
      var PL = [['power', '💪', '크게 휘둘러!', '홈런도 나오지만 삼진도 많아요'], ['contact', '🎯', '맞혀서 안타', '안정적으로 안타를 노려요'], ['wait', '👀', '잘 보고 기다려', '볼넷이 나올 수 있어요']];
      return new Promise(function (res) {
        dock.innerHTML = ''; mainBtn = null; onMain = null; var row = E('div', 'pr-picks'), btns = [];
        PL.forEach(function (p) {
          var b = E('button', 'oks-btn pr-pk ' + p[0], '<span>' + p[1] + '</span><b>' + p[2] + '</b><small>' + p[3] + '</small>'); b.type = 'button'; btns.push(b);
          b.onclick = function () { if (b._d) return; b._d = 1; O.sfx('pop'); O.say(p[2], { noRepeat: true }); res(p[0]); }; row.appendChild(b);
        });
        dock.appendChild(row); if (assisted) ctx.target({ get: function () { return btns[1]; } });
      }).then(function (plan) {
        dock.innerHTML = ''; hideBadge(); var r = resolveOff(plan, bi.pow), pt = PITCH[pick(KINDS)];
        return flyBall(pt, spec(false, true), 800 * (pt.dur + .3)).then(function (R) {
          if (r.kind === 'hit') { sp(batter, 'batter_swing2'); hitAway(R, r.bases); }
          else if (r.kind === 'k') { sp(batter, 'batter_swing2'); sp(ump, 'umpire_out'); }
          else if (r.kind === 'walk') { say('볼넷!', 800); }
          return r;
        });
      });
    }
    function planDef(idx) {
      var weak = pick(KINDS); nowEl.textContent = '상대 ' + (idx + 1) + '번 타자'; drawCount(0, 0);
      showPlate('🎯 약점: ' + PITCH[weak].emo + ' ' + PITCH[weak].name, '어떤 공을 던질까요?');
      return new Promise(function (res) {
        dock.innerHTML = ''; mainBtn = null; onMain = null; var row = E('div', 'pr-picks'), btns = [];
        KINDS.forEach(function (k) {
          var p = PITCH[k], b = E('button', 'oks-btn pr-pk ' + k, '<span>' + p.emo + '</span><b>' + p.name + '</b><small>' + p.tip + '</small>'); b.type = 'button'; btns.push(b);
          b.onclick = function () { if (b._d) return; b._d = 1; O.sfx('pop'); O.say(p.name, { noRepeat: true }); res(p); }; row.appendChild(b);
        });
        dock.appendChild(row); if (assisted) ctx.target({ get: function () { return btns[KINDS.indexOf(weak)]; } });
      }).then(function (p) {
        dock.innerHTML = ''; hideBadge(); var r = resolveDef(p.k, weak, true);
        return flyBall(p, spec(false, true), 800 * (p.dur + .3)).then(function (R) {
          if (r.kind === 'hit') { sp(batter, 'batter_swing2'); hitAway(R, r.bases); }
          else if (r.kind === 'k') { sp(batter, 'batter_swing2'); sp(ump, 'umpire_out'); }
          return r;
        });
      });
    }
    function autoShow() {
      var r = autoDef(), pt = PITCH[pick(KINDS)]; dock.innerHTML = ''; drawCount(0, 0);
      return flyBall(pt, spec(false, true), 600 * (pt.dur + .3)).then(function (R) {
        if (r.kind === 'hit') { sp(batter, 'batter_swing2'); hitAway(R, r.bases); }
        else if (r.kind === 'k') { sp(batter, 'batter_swing2'); sp(ump, 'umpire_out'); }
        hideBadge(); return r;
      });
    }

    /* ---------- 반 이닝 ---------- */
    function half(side) {
      S.side = side; S.outs = 0; S.bases = [0, 0, 0]; var n = 0; drawBar();
      say(S.inn + 1 + '회 ' + (side === 'off' ? '공격!' : '수비!'), 1200);
      nowEl.textContent = '';
      function next() {
        if (S.outs >= 3 || n >= 5) return Promise.resolve();
        var idx = n++; reset(); hideBadge(); sh.setRounds(INN * 2, S.inn * 2 + (side === 'off' ? 0 : 1));
        var p;
        if (side === 'off') p = mode === 'c' ? planOff(idx) : batEngine(idx);
        else p = mode === 'a' ? autoShow() : mode === 'b' ? pitchEngine(idx) : planDef(idx);
        return p.then(function (o) { return outcome(side, o); }).then(function () { drawBar(); return wait(700).then(next); });
      }
      return next().then(function () {
        reset(); hideBadge(); dock.innerHTML = ''; hideBadgeLater();
        return wait(300);
      });
    }
    function hideBadgeLater() { plate.classList.remove('show'); }
    function outcome(side, o) {
      var off = side === 'off', runs = 0; hideBadge();
      if (o.kind === 'hit') {
        runs = advance(o.bases);
        if (off) { hits++; sp(batter, 'batter_cheer'); say(HITNAME[o.bases] + (runs ? ' ' + runs + '점!' : ''), 1100); addScore(o.bases * 10 + runs * 10); O.sfx('win'); S.our += runs; }
        else { say('상대 ' + HITNAME[o.bases] + (runs ? ' ' + runs + '점' : ''), 1100); S.opp += runs; if (o.bases >= 3) st.mistakes++; }
      } else if (o.kind === 'walk') {
        runs = walkRun(); say('볼넷! 걸어서 1루로', 1000);
        if (off) { addScore(10 + runs * 10); S.our += runs; } else { S.opp += runs; }
      } else {
        S.outs++; var txt = o.kind === 'k' ? '삼진 아웃!' : (o.how || '뜬공') + ' 아웃!';
        if (off) { sp(ump, 'umpire_out'); say(txt + ' 다음 타자는 더 잘 쳐요', 1300); O.sfx('no'); if (o.kind === 'k') { ks++; st.mistakes++; } }
        else { got++; sp(ump, 'umpire_out'); say(txt, 1100); O.sfx('ok'); addScore(o.kind === 'k' ? 15 : 10); }
        if (S.outs >= 3) say(txt + ' 3아웃! 공수 교대', 1400);
      }
      drawBar();
      return wait(runs || o.kind === 'hit' ? 1300 : 1000);
    }

    /* ---------- 규칙 문제 (이닝 사이) ---------- */
    function quiz(i) {
      var R = RULES[(i * 3 + (mode === 'a' ? 0 : mode === 'b' ? 1 : 2)) % RULES.length], n = lv === 1 ? 2 : 3;
      var opts = O.shuffle([R[1]].concat(R.slice(2, 1 + n)));
      sh.ask(R[0]); O.say(R[0], { noRepeat: true }); reset(); hideBadge();
      var cards = opts.map(function (o) { return ctx.card({ emo: '⚾', label: o[0] }, { big: opts.length <= 2 }); }), okc = function (c) { return opts[cards.indexOf(c)][1] === 1; };
      dock.innerHTML = ''; mainBtn = null; onMain = null; var host = E('div', 'bb-gate'); host.appendChild(ctx.grid(cards, Math.min(3, cards.length))); dock.appendChild(host);
      ctx.target({ get: function () { return cards.filter(okc); } }); say('규칙 문제', 900);
      return new Promise(function (res) {
        cards.forEach(function (c) {
          c.onclick = function () {
            if (c._done) return; if (!okc(c)) { ctx.bad(c); return; }
            c._done = true; ctx.good(c); O.say(c._item.label, { noRepeat: true }); cards.forEach(function (x) { x.onclick = null; }); later(res, 950);
          };
        });
      });
    }

    /* ---------- 프레임 ---------- */
    function frame(t) {
      if (dead) return; raf = requestAnimationFrame(frame);
      var dt = Math.min(.05, (t - last) / 1000 || 0); last = t; if (document.hidden) return;
      for (var k = 0; k < (FAST ? 4 : 1); k++) {
        batFrame(dt); flyFrame(dt);
        if (mt && !mt.done) {
          if (!mt.paused) {
            mt.x += mt.dir * MV[lv - 1] * dt;
            if (mt.x >= 1) { mt.x = 1; mt.dir = -1; } if (mt.x <= 0) { mt.x = 0; mt.dir = 1; }
            if (assisted && mt.x >= .5) { mt.x = .5; mt.paused = true; say('지금 던져요!', 0); glow(mainBtn); if (mainBtn) mainBtn.classList.add('now'); }
          }
          mt.mk.style.left = mt.x * 100 + '%';
        }
      }
    }
    function begin() {
      last = performance.now(); raf = requestAnimationFrame(frame); drawBar(); drawCount(0, 0);
      var chain = Promise.resolve();
      for (var i = 0; i < INN; i++) (function (k) {
        chain = chain.then(function () { S.inn = k; J.round(k, INN); return half('off'); }).then(function () { return half('def'); })
          .then(function () { drawBar(); return k < INN - 1 ? quiz(k) : null; });
      })(i);
      return chain.then(function () {
        stop(); sh.setRounds(INN * 2, INN * 2);
        var sec = Math.round((Date.now() - t0) / 100) / 10, key = 'pro-' + mode + '-' + lv, B = best(), prev = B[key], newBest = prev == null || score > prev;
        if (newBest) { B[key] = score; O.jset(BEST_KEY, B); }
        var win = S.our > S.opp, tie = S.our === S.opp, stars = win ? 3 : (tie || S.our >= S.opp - 1) ? 2 : 1;
        var verdict = win ? '🏆 승리!' : tie ? '🤝 무승부' : '💪 아쉬워요, 다음엔 이겨요';
        var text = verdict + ' ' + S.our + ':' + S.opp + ' · 안타 ' + hits + '번 · 아웃 ' + got + '번' + (J.best() >= 3 ? ' · 최고 ' + J.best() + '연속' : '') + ' · 점수 ' + score + '점' + (newBest && prev != null ? ' (내 최고 기록!)' : '');
        return { sec: sec, prev: prev, newBest: newBest, coins: coins + (win ? 5 : 0), place: stars === 3 ? 1 : stars === 2 ? 2 : 3, metrics: metrics, mistakes: stars === 3 ? 0 : stars === 2 ? 2 : 4, stars: stars, text: text, score: score, win: win, our: S.our, opp: S.opp };
      });
    }
    g.OKS_PRO_STATE = function () { return { pit: pit ? { p: pit.p, strike: pit.spec.strike, paused: pit.paused, active: pit.active } : null, meter: mt ? { x: mt.x, paused: mt.paused, zone: MZ[lv - 1] } : null, S: S }; };
    return { begin: begin, stop: stop };
  }
  g.OKS_PRO = { mount: mount, MODES: MODES, NAME: NAME, best: best };
})(window);
