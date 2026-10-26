/* 씽씽별 테니스 게임 — 볼 스포츠 센터 '테니스'
   한 번 누르기(화면·스페이스·↑)로 즐기는 랠리 게임이에요.
   - 건너편 친구가 공을 쳐 주면, 공이 내 라켓 앞(동그란 표시)에 올 때 눌러서 쳐요.
   - 수준 1·2(그리고 스위치 모드)는 공이 표시에서 멈춰 기다려 줘요. 수준 3~5는 타이밍으로 쳐요.
   - 너무 일찍 치거나 놓쳐도 괜찮아요. 다시 쳐 줘요. 쳐서 넘기면 득점!
   - 시간 제한·탈락·경쟁 없음. 점수는 내 최고 점수와만 비교해요. 공격 사이마다 테니스 규칙 문제를 풀어요. */
(function (g) {
  'use strict';
  var O = g.OKS, E = O.el, A = './assets/tennis/';
  var FAST = /[?&]dev=fast/.test(location.search);
  var BEST_KEY = 'oks_tennis_best_v1';
  var DUR = [2.3, 1.95, 1.6, 1.35, 1.15];     /* 공이 날아오는 시간(초) */
  var ZW = [.2, .14, .09, .065, .045];        /* 칠 수 있는 구간(도착 시각 앞뒤) */
  var BX = .30, FX = .70;                     /* 내 자리, 건너편 친구 자리(무대 너비 비율) */
  var GFAR = .72;                             /* 먼 곳 그림 크기 */
  /* 그림 높이(무대 높이 비율) — 원본 그림 크기에 맞춰요 */
  var U = .52 / 1347;
  var HT = { boy_ready: 1347, boy_back: 1307, boy_back2: 1340, boy_hit: 1223, boy_follow: 1318, boy_serve: 1309, boy_cheer: 1381, girl_ready: 1313, girl_hit: 1209 };

  function it(o) { var v = String(o[0] || ''); return v.indexOf('img:') === 0 ? { img: v.slice(4), label: o[1] } : { emo: v, label: o[1] }; }
  function best() { return O.jget(BEST_KEY, {}); }

  function mount(opt) {
    var sh = opt.sh, lv = opt.level, board = sh.board, st = opt.stats, ctx = opt.ctx, scene = opt.scene, lesson = opt.data;
    var assisted0 = lv <= 2 || O.settings().scan || O.settings().slow;
    var calm = O.settings().calm || (g.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    var slowK = O.settings().slow ? 1.25 : 1;
    var total = opt.total, dead = false, t0 = Date.now(), score = 0, coins = 0, made = 0, greats = 0, metrics = [];
    board.className = 'oks-board in-scene tn-board';

    var stage = E('div', 'tn-stage');
    stage.innerHTML = '<div class="tn-sky"></div><img class="tn-girl" alt="" draggable="false"><div class="tn-ring" hidden></div>' +
      '<img class="tn-boy" alt="" draggable="false"><img class="tn-ball" alt="" draggable="false" hidden><div class="tn-fx"></div>' +
      '<div class="tn-hud"><span class="tn-now"></span><span class="tn-rally" hidden>🔥 랠리 <b>0</b></span><span class="tn-score">⭐ <b>0</b></span></div><div class="tn-banner" aria-live="polite"></div>';
    var dock = E('div', 'tn-dock');
    board.appendChild(stage); board.appendChild(dock);
    var $ = function (s) { return stage.querySelector(s); };
    var sky = $('.tn-sky'), girl = $('.tn-girl'), ring = $('.tn-ring'), boy = $('.tn-boy'), ball = $('.tn-ball'), fx = $('.tn-fx'),
      nowEl = $('.tn-now'), scoreEl = $('.tn-score b'), banner = $('.tn-banner');
    sky.style.backgroundImage = 'url(' + A + 'bg_main.webp)'; ball.src = A + 'ball.webp';
    var farMax = 1e9;                                     /* 건너편 친구가 네트 뒤에서 화면 밖으로 잘리지 않을 최대 높이(px) */
    function hOf(n, far) { var pct = HT[n] * U * (far ? GFAR : 1) * 100; return far && farMax < 1e9 ? 'min(' + pct + '%,' + farMax + 'px)' : pct + '%'; }
    function sp(el, n, far) { if (el._n !== n) { el._n = n; el.src = A + n + '.webp'; el.style.height = hOf(n, far); } }
    /* 건너편 친구는 네트 '뒤'에 서야 해요: 배경의 네트 위치(그림 안 40%~52%)를 화면 크기에 맞춰 계산하고,
       네트 띠만 앞에 한 번 더 덮어 친구의 아랫부분이 네트에 가려지게 해요. */
    var netFG = E('div', 'tn-netfg'); stage.insertBefore(netFG, ring);
    function layoutNet() {
      var D = d(), W = D.W, H = D.H, sc = Math.max(W / 1672, H / 941), Hi = 941 * sc, offY = (H - Hi) * .85;
      var top = offY + .395 * Hi, bot = offY + .518 * Hi, feet = offY + .50 * Hi;
      netFG.style.backgroundImage = sky.style.backgroundImage;
      netFG.style.clipPath = 'inset(' + Math.max(0, top).toFixed(1) + 'px 0 ' + Math.max(0, H - bot).toFixed(1) + 'px 0)';
      girl.style.bottom = (H - feet).toFixed(1) + 'px';
      farMax = Math.max(60, feet - 10);
      if (girl._n) girl.style.height = hOf(girl._n, true);
    }
    function d() { return { W: stage.clientWidth || 800, H: stage.clientHeight || 380 }; }
    var RL = { n: 5, ramp: .04 }, rallyEl = $('.tn-rally');
    function setRally(n) { rallyEl.hidden = n < 2; rallyEl.querySelector('b').textContent = n; rallyEl.classList.remove('pop'); void rallyEl.offsetWidth; rallyEl.classList.add('pop'); }
    boy.style.left = (BX * 100) + '%'; girl.style.left = (FX * 100) + '%';
    sp(boy, 'boy_ready'); sp(girl, 'girl_ready', true); layoutNet(); addEventListener('resize', layoutNet);

    var onMain = null, mainBtn = null, timers = [], raf = 0, last = 0;
    var S = 'idle', u = 0, dur = 2, zw = .1, assisted = assisted0, P = null, paused = false;
    function later(fn, ms) { var h = setTimeout(function () { if (!dead) fn(); }, ms / (FAST ? 4 : 1)); timers.push(h); return h; }
    function wait(ms) { return new Promise(function (res) { later(res, ms); }); }
    function say(t, ms) { banner.textContent = t; banner.classList.remove('show'); void banner.offsetWidth; banner.classList.add('show'); if (ms) later(function () { banner.classList.remove('show'); }, ms); }
    var J = g.OKS_JUICE.attach({ stage: stage, later: later, calm: calm, st: st, balls: function () { return [ball]; } });
    function addScore(n) { n = J.win(n); score += n; coins += Math.max(1, n / 10 | 0); scoreEl.textContent = score; }
    function setMain(label, fn) {
      dock.innerHTML = ''; var b = E('button', 'oks-btn tn-main', label); b.type = 'button'; mainBtn = b; onMain = fn;
      b.onclick = function () { if (onMain) onMain(); }; dock.appendChild(b); return b;
    }
    function glow() { if (mainBtn) ctx.target({ get: function () { return mainBtn; } }); }
    function press() { if (onMain && !dead) onMain(); }
    function onKey(e) {
      if (O.settings().scan || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || document.querySelector('.oks-overlay')) return;
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'Enter') { if (e.target.tagName === 'BUTTON' && e.key !== 'ArrowUp') return; e.preventDefault(); if (!e.repeat) press(); }
    }
    document.addEventListener('keydown', onKey);
    stage.addEventListener('pointerdown', function (e) { if (e.target.closest('button')) return; press(); });
    function stop() { dead = true; cancelAnimationFrame(raf); timers.forEach(clearTimeout); document.removeEventListener('keydown', onKey); }
    addEventListener('pagehide', stop, { once: true });
    function burst(x, y) { if (calm) return; var s = E('span', 'tn-star', '⭐'); s.style.left = x + 'px'; s.style.top = y + 'px'; fx.appendChild(s); later(function () { s.remove(); }, 800); }

    /* ---------- 좌표 ---------- */
    function pts() {
      var D = d(), W = D.W, H = D.H;
      var hit = [BX * W + .18 * H, .64 * H];                       /* 내 라켓 앞 */
      var rel = [FX * W + .13 * H, .27 * H];                       /* 건너편 친구가 치는 곳 */
      var bnc = [hit[0] + .16 * W, .84 * H];                       /* 공이 코트에 튀는 곳 */
      return { W: W, H: H, hit: hit, rel: rel, bnc: bnc };
    }
    var PT = pts();
    function lerp(a, b, t) { return a + (b - a) * t; }
    function ballAt(uu) {                                          /* 0=친구가 침, 1=내 라켓 앞 */
      var p = PT, x, y, s;
      if (uu <= .55) { var t = uu / .55; x = lerp(p.rel[0], p.bnc[0], t); y = lerp(p.rel[1], p.bnc[1], t * t) - Math.sin(Math.PI * t) * p.H * .06; s = lerp(.42, .95, t); }
      else if (uu <= 1) { var t2 = (uu - .55) / .45; x = lerp(p.bnc[0], p.hit[0], t2); y = lerp(p.bnc[1], p.hit[1], t2) - Math.sin(Math.PI * t2) * p.H * .2; s = lerp(.95, 1, t2); }
      else { var t3 = Math.min(1, (uu - 1) / .4); x = lerp(p.hit[0], p.hit[0] - .22 * p.W, t3); y = lerp(p.hit[1], p.H * .92, t3 * t3); s = 1.05; }
      ball.style.left = x + 'px'; ball.style.top = y + 'px'; ball.style.setProperty('--s', s);
    }
    /* 되받아 치는 공: 네트를 넘어 건너편 코트로 */
    var tweens = [];
    function fly(a, b, t, arc, s0, s1) { return new Promise(function (res) { tweens.push({ a: a, b: b, dur: t, arc: arc, s0: s0, s1: s1, t: 0, res: res }); ball.hidden = false; }); }
    function stepTweens(dt) {
      for (var i = tweens.length - 1; i >= 0; i--) {
        var T = tweens[i]; T.t += dt; var k = Math.min(1, T.t / T.dur);
        ball.style.left = lerp(T.a[0], T.b[0], k) + 'px'; ball.style.top = (lerp(T.a[1], T.b[1], k) - Math.sin(Math.PI * k) * T.arc) + 'px'; ball.style.setProperty('--s', lerp(T.s0, T.s1, k));
        if (k >= 1) { tweens.splice(i, 1); T.res(); }
      }
    }

    /* ---------- 공 날아오기 ---------- */
    function fin(kind) { if (!P) return; var p = P; P = null; S = 'busy'; ring.classList.remove('now'); if (mainBtn) mainBtn.classList.remove('now'); onMain = null; p(kind); }
    function frame(t) {
      if (dead) return; raf = requestAnimationFrame(frame);
      var dt = Math.min(.05, (t - last) / 1000 || 0); last = t; if (document.hidden) return;
      for (var k = 0; k < (FAST ? 4 : 1); k++) {
        stepTweens(dt);
        if (S === 'in') {
          u += dt / (dur * slowK); if (u > 1.4) u = 1.4;
          ballAt(u);
          if (u >= 1 - zw && u <= 1 + zw) ring.classList.add('now'); else ring.classList.remove('now');
          if (assisted && u >= 1) { u = 1; ballAt(1); S = 'hold'; ring.classList.add('now'); say('지금 쳐요!', 0); glow(); if (mainBtn) mainBtn.classList.add('now'); if (boy._n !== 'boy_back') sp(boy, 'boy_back'); }
          else if (!assisted && u > 1 + zw) fin({ kind: 'late' });
          else if (u >= 1 - zw * 1.8 && boy._n === 'boy_ready') sp(boy, 'boy_back');
        }
      }
    }
    function doPlay(i, first, k, more) {
      k = k || 0;
      var D = d(); PT = pts(); u = 0; dur = DUR[lv - 1] * Math.max(.62, Math.pow(1 - RL.ramp, k)); zw = ZW[lv - 1] * (assisted ? 1.2 : 1);
      sp(boy, 'boy_ready'); sp(girl, 'girl_ready', true); girl.classList.add('flip'); ball.hidden = true; paused = false;
      ring.style.left = PT.hit[0] + 'px'; ring.style.top = PT.hit[1] + 'px'; ring.hidden = false; ring.classList.remove('now');
      if (i === 0 && first) say('테니스 시작!', 1100);
      return wait(first ? 800 : (k ? 80 : 500)).then(function () {
        sp(girl, 'girl_hit', true); O.sfx('tick'); return wait(k ? 90 : 160);
      }).then(function () {
        ball.hidden = false; ballAt(0); O.sfx('pop');
        return new Promise(function (resolve) {
          P = resolve; S = 'in';
          setMain('🎾 쳐요!', function () {
            if (S === 'hold') return fin({ kind: 'good', dt: 0 });
            if (S !== 'in') return;
            var dd = Math.abs(u - 1);
            if (dd <= zw) return fin({ kind: dd <= zw * .4 ? 'great' : 'good', dt: dd });
            if (assisted) { say('조금만 기다려요', 700); return; }
            fin({ kind: u < 1 ? 'early' : 'late' });
          });
          if (assisted) ctx.target({ get: function () { return null; } });
        });
      }).then(function (o) {
        ring.hidden = true; S = 'busy'; var H = PT.H, W = PT.W;
        if (o.kind === 'early' || o.kind === 'late') return fail(o.kind);
        /* 치기: 뒤로 → 맞추기 → 마무리 */
        sp(boy, 'boy_hit'); O.sfx('pop'); sp(girl, 'girl_ready', true);
        var from = PT.hit, tgt = [FX * W - (o.kind === 'great' ? .16 : .06) * W, H * (o.kind === 'great' ? .5 : .46)], net = [lerp(from[0], tgt[0], .5), H * .3];
        return wait(110).then(function () {
          ball.hidden = false; ball.style.left = from[0] + 'px'; ball.style.top = from[1] + 'px';
          return fly(from, tgt, .8, H * .34, 1, .5);
        }).then(function () {
          sp(boy, 'boy_follow'); burst(tgt[0], tgt[1]); O.sfx('coin');
          if (more) return { kind: o.kind, cont: true };                /* 랠리 계속: 친구가 되받아 쳐요 */
          say(k > 0 ? '랠리 ' + (k + 1) + '번 성공!' : (o.kind === 'great' ? '멋진 샷! 득점!' : '넘겼어요! 득점!'), 1200);
          return wait(300).then(function () {
            return fly(tgt, [tgt[0] + .04 * W, tgt[1] + H * .1], .35, H * .05, .5, .5);
          }).then(function () { ball.hidden = true; sp(boy, 'boy_cheer'); return wait(900); }).then(function () { return { kind: o.kind }; });
        });
      });
    }
    function fail(kind) {
      O.sfx('no'); var H = PT.H, W = PT.W;
      sp(boy, 'boy_hit');
      if (kind === 'early') { S = 'busy'; ball.hidden = false; say('너무 일렀어요!', 1300); }
      else say('공이 지나갔어요!', 1300);
      return wait(150).then(function () { sp(boy, 'boy_follow'); }).then(function () {
        { S = 'idle'; return new Promise(function (res) { (function go() { if (dead) return; u = Math.min(1.4, u + .06); ballAt(u); if (u < 1.4) later(go, 30); else res(); })(); }); }
      }).then(function () { ball.hidden = true; return wait(700); }).then(function () { return { kind: kind }; });
    }
    function award(res, k) { made++; var great = res.kind === 'great'; if (great) greats++; addScore((great ? 30 : 20) + Math.min(k || 0, 10) * 5); O.sfx('ok'); }

    /* ---------- 문제(랠리 사이) ---------- */
    function quizFor(i) {
      var L = lesson, nOpt = lv === 1 ? 1 : lv === 2 ? 2 : 3;
      if (i % 2 === 0) {
        var right = L.i[(i >> 1) % L.i.length], wrong = O.shuffle(L.n.slice()).slice(0, Math.max(0, nOpt - 1));
        return { q: L.q, opts: O.shuffle([[right, 1]].concat(wrong.map(function (w) { return [w, 0]; }))) };
      }
      var T = L.t[(i >> 1) % L.t.length], good = T.o.filter(function (x) { return x[2]; }), bad = O.shuffle(T.o.filter(function (x) { return !x[2]; })).slice(0, Math.max(0, nOpt - 1));
      return { q: T.q, opts: O.shuffle([[good[0], 1]].concat(bad.map(function (b0) { return [b0, 0]; }))) };
    }
    function quiz(i) {
      var q = quizFor(i); sh.ask(q.q); O.say(q.q, { noRepeat: true }); ring.hidden = true;
      var cards = q.opts.map(function (o) { return ctx.card(it(o[0]), { big: q.opts.length <= 2 }); }), okc = function (c) { return q.opts[cards.indexOf(c)][1] === 1; };
      dock.innerHTML = ''; mainBtn = null; onMain = null; var host = E('div', 'tn-gate'); host.appendChild(ctx.grid(cards, Math.min(3, cards.length))); dock.appendChild(host);
      ctx.target({ get: function () { return cards.filter(okc); } });
      say('규칙 문제', 900);
      return new Promise(function (res) {
        cards.forEach(function (c) {
          c.onclick = function () {
            if (c._done) return; if (!okc(c)) { ctx.bad(c); return; }
            c._done = true; ctx.good(c); O.say(c._item.label, { noRepeat: true }); cards.forEach(function (x) { x.onclick = null; }); later(res, 950);
          };
        });
      });
    }

    function turn(i) {
      var m0 = st.mistakes, fails = 0; assisted = assisted0; nowEl.textContent = (i + 1) + '번째 공'; setRally(0);
      J.round(i, total); if (scene) { scene.now(i); if (i === total - 1) scene.bonus(); }
      function again() { return rally(0); }
      /* 랠리: 내가 칠 때마다 친구가 되받아 쳐 줘요(정해진 횟수까지). 도중에 놓쳐도 괜찮아요 */
      function rally(k) {
        var more = k + 1 < RL.n;
        return doPlay(i, fails === 0 && k === 0, k, more).then(function (res) {
          if (res.kind === 'early' || res.kind === 'late') {
            if (k === 0) { st.mistakes++; fails++; if (fails >= 2) assisted = true; return rally(0); }
            say('랠리 ' + k + '번! 잘했어요', 1400); O.sfx('ok'); return wait(900);
          }
          metrics.push({ at: i + 1, result: res.kind, tries: fails + 1, rally: k + 1 }); award(res, k); setRally(k + 1);
          return res.cont ? rally(k + 1) : wait(300);
        });
      }
      return again().then(function () { return quiz(i); }).then(function () {
        if (scene) scene.advance(i, st.mistakes === m0);
        return wait(300);
      });
    }

    function begin() { return g.OKS_RALLYSEL.choose('tennis').then(function (r) { RL = r; return run(); }); }
    function run() {
      last = performance.now(); raf = requestAnimationFrame(frame);
      var chain = Promise.resolve();
      for (var i = 0; i < total; i++) (function (k) { chain = chain.then(function () { return turn(k); }); })(i);
      return chain.then(function () {
        stop(); var sec = Math.round((Date.now() - t0) / 100) / 10, key = 'tennis-' + opt.school + '-' + opt.lesson + '-' + lv, Bt = best(), prev = Bt[key], newBest = prev == null || score > prev;
        if (newBest) { Bt[key] = score; O.jset(BEST_KEY, Bt); }
        var miss = st.mistakes, place = miss <= 1 ? 1 : miss <= 3 ? 2 : 3;
        var text = '득점 ' + made + '번' + (greats ? ' · 멋진 샷 ' + greats : '') + (J.best() >= 3 ? ' · 최고 ' + J.best() + '연속' : '') + ' · 점수 ' + score + '점' + (newBest ? (prev != null ? ' (내 최고 점수!)' : '') : ' (내 최고 ' + prev + '점)');
        return { sec: sec, prev: prev, newBest: newBest, coins: coins, place: place, metrics: metrics, mistakes: miss, text: text, score: score };
      });
    }
    g.OKS_RALLY_STATE = function () { return (S === 'in' || S === 'hold') ? { S: S, u: u, zw: zw, assisted: assisted } : null; };
    return { begin: begin, stop: stop };
  }
  g.OKS_RALLY = { mount: mount, best: best };
})(window);
