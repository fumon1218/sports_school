/* 씽씽별 럭비 게임 — 볼 스포츠 센터 '럭비'(태그 럭비)
   한 번 누르기(화면·스페이스·↑)로 즐기는 패스 달리기 게임이에요.
   - 공을 안고 달리다가 상대 친구가 깃발을 뽑으러 오면, 초록 띠에 들어올 때 옆 친구에게 패스해요.
   - 럭비는 앞으로 패스하지 않아요! 공은 항상 옆이나 뒤 친구에게 건네요.
   - 수준 1·2(그리고 스위치 모드)는 초록 띠에서 멈춰 기다려 줘요. 수준 3~5는 타이밍으로 패스해요.
   - 패스를 받은 친구가 끝 선까지 달려 공을 내려놓으면 트라이! 깃발을 뽑혀도 괜찮아요, 다시 해요.
   - 시간 제한·탈락·경쟁 없음. 내 최고 점수와만 비교해요. 공격 사이마다 럭비 규칙 문제를 풀어요. */
(function (g) {
  'use strict';
  var O = g.OKS, E = O.el, A = './assets/rugby/', BALLIMG = './assets/ballcenter/icon_rugby.webp';
  var FAST = /[?&]dev=fast/.test(location.search);
  var BEST_KEY = 'oks_rugby_best_v1';
  var VD = [.14, .18, .23, .28, .34];        /* 상대가 다가오는 빠르기(무대 너비/초) */
  var ZW = [.30, .22, .16, .12, .085];       /* 초록 띠 너비 */
  var ZLO = .15;                             /* 이 거리보다 가까워지면 깃발을 뽑혀요 */
  var BX0 = .12, BXCAP = .30, BRUN = .1, MATE = .14, TRYX = .80;
  /* 그림 높이(무대 높이 %) — 원본 그림 비율에 맞춰요 */
  var SH = { run_a: .46, run_b: .413, run_c: .432, pass: .43, catch: .41, kneel: .33, girl_chase: .5, girl_flag: .5, boy_cheer: .46 };
  var RUN = ['run_a', 'run_b', 'run_c', 'run_b'];

  function it(o) { var v = String(o[0] || ''); return v.indexOf('img:') === 0 ? { img: v.slice(4), label: o[1] } : { emo: v, label: o[1] }; }
  function best() { return O.jget(BEST_KEY, {}); }

  function mount(opt) {
    var sh = opt.sh, lv = opt.level, board = sh.board, st = opt.stats, ctx = opt.ctx, scene = opt.scene, lesson = opt.data;
    var assisted0 = lv <= 2 || O.settings().scan || O.settings().slow;
    var calm = O.settings().calm || (g.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    var slowK = O.settings().slow ? .8 : 1;
    var total = opt.total, dead = false, t0 = Date.now(), score = 0, coins = 0, made = 0, greats = 0, metrics = [];
    board.className = 'oks-board in-scene rg-board';

    var stage = E('div', 'rg-stage');
    stage.innerHTML = '<div class="rg-sky"></div><div class="rg-zone" hidden></div><img class="rg-cheer" alt="" draggable="false" hidden>' +
      '<img class="rg-def" alt="" draggable="false"><img class="rg-mate" alt="" draggable="false"><img class="rg-a" alt="" draggable="false">' +
      '<img class="rg-flag" alt="" draggable="false" hidden><img class="rg-ball" alt="" draggable="false" hidden><div class="rg-fx"></div>' +
      '<div class="rg-hud"><span class="rg-now"></span><span class="rg-score">⭐ <b>0</b></span></div><div class="rg-banner" aria-live="polite"></div>';
    var dock = E('div', 'rg-dock');
    board.appendChild(stage); board.appendChild(dock);
    var $ = function (s) { return stage.querySelector(s); };
    var sky = $('.rg-sky'), zone = $('.rg-zone'), cheer = $('.rg-cheer'), def = $('.rg-def'), mate = $('.rg-mate'), A1 = $('.rg-a'), flag = $('.rg-flag'),
      ball = $('.rg-ball'), fx = $('.rg-fx'), nowEl = $('.rg-now'), scoreEl = $('.rg-score b'), banner = $('.rg-banner');
    sky.style.backgroundImage = 'url(' + A + 'bg_side.webp)'; ball.src = BALLIMG; flag.src = A + 'flag_yellow.webp';
    function sp(el, n, flip) { if (el._n !== n) { el._n = n; el.src = A + n + '.webp'; el.style.height = (SH[n] * 100) + '%'; } el.style.setProperty('--f', flip ? -1 : 1); }
    function px(el, x) { el.style.left = (x * 100) + '%'; }
    sp(cheer, 'boy_cheer'); px(cheer, .93);

    var onMain = null, mainBtn = null, timers = [], raf = 0, last = 0, anims = [], tweens = [];
    var S = 'idle', B = BX0, D = .96, vd = 0, zw = .2, assisted = assisted0, phase = 0, P = null;
    function later(fn, ms) { var h = setTimeout(function () { if (!dead) fn(); }, ms / (FAST ? 4 : 1)); timers.push(h); return h; }
    function wait(ms) { return new Promise(function (res) { later(res, ms); }); }
    function say(t, ms) { banner.textContent = t; banner.classList.remove('show'); void banner.offsetWidth; banner.classList.add('show'); if (ms) later(function () { banner.classList.remove('show'); }, ms); }
    var J = g.OKS_JUICE.attach({ stage: stage, later: later, calm: calm, st: st, balls: function () { return [ball]; } });
    function addScore(n) { n = J.win(n); score += n; coins += Math.max(1, n / 10 | 0); scoreEl.textContent = score; }
    function setMain(label, fn, cls) {
      dock.innerHTML = ''; var b = E('button', 'oks-btn rg-main ' + (cls || ''), label); b.type = 'button'; mainBtn = b; onMain = fn;
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

    function dims() { return { W: stage.clientWidth || 800, H: stage.clientHeight || 380 }; }
    function burst(x, y) {
      if (calm) return; var s = E('span', 'rg-star', '⭐'); s.style.left = x + 'px'; s.style.top = y + 'px'; fx.appendChild(s); later(function () { s.remove(); }, 800);
    }

    /* ---------- 움직임 ---------- */
    function move(el, x0, x1, dur, cycle, flip) {
      return new Promise(function (res) { anims.push({ el: el, x0: x0, x1: x1, dur: dur, t: 0, cycle: cycle, flip: flip, res: res }); });
    }
    function stepAnims(dt) {
      for (var i = anims.length - 1; i >= 0; i--) {
        var a = anims[i]; a.t += dt; var u = Math.min(1, a.t / a.dur), x = a.x0 + (a.x1 - a.x0) * (u * (2 - u) * .5 + u * .5);
        px(a.el, x); if (a.cycle) sp(a.el, RUN[Math.floor(a.t / .14) % 4], a.flip);
        a.el._x = x; if (u >= 1) { anims.splice(i, 1); a.res(); }
      }
    }
    function fly(a, b, dur, arc) { return new Promise(function (res) { tweens.push({ a: a, b: b, dur: dur, arc: arc || 0, t: 0, res: res }); ball.hidden = false; }); }
    function stepTweens(dt) {
      for (var i = tweens.length - 1; i >= 0; i--) {
        var T = tweens[i]; T.t += dt; var u = Math.min(1, T.t / T.dur);
        ball.style.left = (T.a[0] + (T.b[0] - T.a[0]) * u) + 'px'; ball.style.top = (T.a[1] + (T.b[1] - T.a[1]) * u - Math.sin(Math.PI * u) * T.arc) + 'px';
        if (u >= 1) { tweens.splice(i, 1); T.res(); }
      }
    }

    /* ---------- 한 번의 공격 ---------- */
    function placeZone() {
      var lo = B + ZLO, w = zw; zone.style.left = (lo * 100) + '%'; zone.style.width = (w * 100) + '%';
    }
    function resetField() {
      anims.length = 0; tweens.length = 0; ball.hidden = true; flag.hidden = true; cheer.hidden = true; zone.hidden = true; zone.classList.remove('now');
      B = BX0; D = .96; phase = 0; sp(A1, 'run_a'); sp(mate, 'run_b'); sp(def, 'girl_chase'); px(A1, B); px(mate, B - MATE); px(def, D);
      A1.classList.remove('hide'); mate.classList.remove('hide');
      if (mainBtn) mainBtn.classList.remove('now');
    }
    function gap() { return D - B; }
    function zhi() { return ZLO + zw; }
    function finishRun(kind) { if (!P) return; var p = P; P = null; S = 'busy'; zone.classList.remove('now'); if (mainBtn) mainBtn.classList.remove('now'); onMain = null; p(kind); }
    function runFrame(dt) {
      if (S !== 'run' && S !== 'paused') return;
      phase += dt;
      if (S === 'run') {
        if (B < BXCAP) B = Math.min(BXCAP, B + BRUN * dt);
        D -= vd * slowK * dt;
        sp(A1, RUN[Math.floor(phase / .14) % 4]); sp(def, 'girl_chase');
        px(A1, B); px(mate, B - MATE); px(def, D); sp(mate, gap() <= zhi() + .1 ? 'catch' : RUN[(Math.floor(phase / .14) + 2) % 4]); placeZone();
        var gp = gap();
        if (gp <= zhi() + .04) { zone.hidden = false; }
        if (gp <= zhi() && gp >= ZLO) { zone.classList.add('now'); }
        if (assisted && gp <= ZLO + zw * .5) {
          S = 'paused'; sp(A1, 'run_c'); sp(mate, 'catch'); zone.classList.add('now'); say('지금 패스해요!', 0); glow(); if (mainBtn) mainBtn.classList.add('now');
        } else if (!assisted && gp < ZLO) { finishRun({ kind: 'pulled' }); }
      }
    }
    function doPlay(i, firstTry) {
      resetField(); vd = VD[lv - 1]; zw = ZW[lv - 1] * (assisted ? 1.15 : 1);
      var d = dims(); placeZone(); zone.hidden = false;
      if (i === 0 && firstTry) say('태그 럭비 시작!', 1100);
      return wait(firstTry ? 700 : 400).then(function () {
        return new Promise(function (resolve) {
          P = resolve; S = 'run'; zone.hidden = false;
          setMain('🏉 패스!', function () {
            if (S === 'paused') return finishRun({ kind: Math.abs(gap() - (ZLO + zw * .5)) <= zw * .3 ? 'great' : 'try' });
            if (S !== 'run') return;
            var gp = gap();
            if (gp <= zhi() && gp >= ZLO) return finishRun({ kind: Math.abs(gp - (ZLO + zw * .5)) <= zw * .3 ? 'great' : 'try' });
            if (assisted) { say('조금만 기다려요', 700); return; }
            finishRun({ kind: 'early' });
          });
          if (assisted) ctx.target({ get: function () { return null; } });
        });
      }).then(function (o) {
        var H = d.H, k = 1;
        if (o.kind === 'pulled' || o.kind === 'early') return fail(o.kind, d);
        /* 패스 성공: 공이 뒤(옆) 친구에게 */
        sp(A1, 'pass'); O.sfx('pop');
        var from = [B * d.W, H * (1 - .08 - SH.pass * .55)], to = [(B - MATE) * d.W, H * (1 - .03 - SH.catch * .55)];
        return wait(150).then(function () { return fly(from, to, .45, H * .12); }).then(function () {
          ball.hidden = true; O.sfx('tick'); sp(A1, 'run_c'); sp(mate, 'run_a'); say(o.kind === 'great' ? '멋진 패스!' : '패스 성공!', 900);
          return move(mate, B - MATE, TRYX, 1.9, true).then(function () {
            sp(mate, 'kneel'); px(mate, TRYX); O.sfx('coin'); burst(TRYX * d.W, H * .5); cheer.hidden = false; say('트라이! 🏉', 1200);
            return wait(900);
          });
        }).then(function () { return { kind: o.kind }; });
      });
    }
    function fail(kind, d) {
      O.sfx('no');
      if (kind === 'pulled') {
        sp(def, 'girl_flag'); flag.hidden = false; flag.classList.remove('go'); flag.style.left = (B * 100) + '%'; void flag.offsetWidth; flag.style.setProperty('--dx', ((D - B) * 100) + '%'); flag.classList.add('go');
        say('깃발을 뽑혔어요!', 1300);
      } else { sp(A1, 'pass'); say('너무 일렀어요! 공이 떨어졌어요', 1300); }
      return wait(1500).then(function () { return { kind: kind }; });
    }

    function award(res) {
      made++; var great = res.kind === 'great'; if (great) greats++; addScore(great ? 30 : 20); O.sfx('ok');
    }

    /* ---------- 문제(공격 사이) ---------- */
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
      var d = quizFor(i); sh.ask(d.q); O.say(d.q, { noRepeat: true }); zone.hidden = true;
      var cards = d.opts.map(function (o) { return ctx.card(it(o[0]), { big: d.opts.length <= 2 }); }), okc = function (c) { return d.opts[cards.indexOf(c)][1] === 1; };
      dock.innerHTML = ''; mainBtn = null; onMain = null; var host = E('div', 'rg-gate'); host.appendChild(ctx.grid(cards, Math.min(3, cards.length))); dock.appendChild(host);
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
      var m0 = st.mistakes, fails = 0; assisted = assisted0; nowEl.textContent = (i + 1) + '번째 공격';
      J.round(i, total); if (scene) { scene.now(i); if (i === total - 1) scene.bonus(); }
      function again() {
        return doPlay(i, fails === 0).then(function (res) {
          if (res.kind === 'pulled' || res.kind === 'early') { st.mistakes++; fails++; if (fails >= 2) assisted = true; return again(); }
          metrics.push({ at: i + 1, result: res.kind, tries: fails + 1 }); award(res); return wait(300);
        });
      }
      return again().then(function () { return quiz(i); }).then(function () {
        if (scene) scene.advance(i, st.mistakes === m0);
        return wait(300);
      });
    }

    function frame(t) {
      if (dead) return; raf = requestAnimationFrame(frame);
      var dt = Math.min(.05, (t - last) / 1000 || 0); last = t; if (document.hidden) return;
      for (var k = 0; k < (FAST ? 4 : 1); k++) { runFrame(dt); stepAnims(dt); stepTweens(dt); }
    }
    function begin() {
      last = performance.now(); raf = requestAnimationFrame(frame); resetField();
      var chain = Promise.resolve();
      for (var i = 0; i < total; i++) (function (k) { chain = chain.then(function () { return turn(k); }); })(i);
      return chain.then(function () {
        stop(); var sec = Math.round((Date.now() - t0) / 100) / 10, key = 'rugby-' + opt.school + '-' + opt.lesson + '-' + lv, Bt = best(), prev = Bt[key], newBest = prev == null || score > prev;
        if (newBest) { Bt[key] = score; O.jset(BEST_KEY, Bt); }
        var miss = st.mistakes, place = miss <= 1 ? 1 : miss <= 3 ? 2 : 3;
        var text = '트라이 ' + made + '번' + (greats ? ' · 멋진 패스 ' + greats : '') + (J.best() >= 3 ? ' · 최고 ' + J.best() + '연속' : '') + ' · 점수 ' + score + '점' + (newBest ? (prev != null ? ' (내 최고 점수!)' : '') : ' (내 최고 ' + prev + '점)');
        return { sec: sec, prev: prev, newBest: newBest, coins: coins, place: place, metrics: metrics, mistakes: miss, text: text, score: score };
      });
    }
    g.OKS_TAG_STATE = function () { return (S === 'run' || S === 'paused') ? { S: S, gap: gap(), zlo: ZLO, zhi: zhi(), zc: ZLO + zw * .5, assisted: assisted } : null; };
    return { begin: begin, stop: stop };
  }
  g.OKS_TAG = { mount: mount, best: best };
})(window);
