/* 씽씽별 농구 게임 — 볼 스포츠 센터 '농구'
   한 번 누르기(화면·스페이스·↑)로 즐기는 슛 게임이에요.
   - 콘이 놓인 자리에서 슛을 던져요. 아래 막대의 표시가 초록 칸에 올 때 누르면 골인!
   - 수준 1·2(그리고 스위치 모드)는 표시가 초록 칸에서 멈춰 기다려 줘요. 수준 3~5는 타이밍으로 던져요.
   - 던진 공은 골대 밑 친구가 받아서 다시 패스해 줘요. 슛 사이마다 농구 규칙 문제를 풀어요.
   - 시간 제한·탈락·경쟁 없음. 빗나가도 다시 던질 수 있어요. 내 최고 점수와만 비교해요. */
(function (g) {
  'use strict';
  var O = g.OKS, E = O.el, A = './assets/basketball/', BALLIMG = './assets/ballcenter/icon_basketball.webp';
  var FAST = /[?&]dev=fast/.test(location.search);
  var BEST_KEY = 'oks_basketball_best_v1';
  var SPEED = [.5, .65, .95, 1.25, 1.6];            /* 표시가 움직이는 빠르기(막대 길이/초) */
  var ZONE = [.5, .4, .28, .2, .14];                /* 초록 칸 너비 */
  var SPOTS = [.42, .30, .18];                      /* 가까이·중간·멀리(무대 너비 비율) */
  var SPOTNAME = ['가까운 곳', '중간 곳', '먼 곳'];
  var HOOP = [1073, 195];                           /* 배경 그림 속 림 위치 */
  var BGW = 1672, BGH = 941, POSY = 0;

  function it(o) { var v = String(o[0] || ''); return v.indexOf('img:') === 0 ? { img: v.slice(4), label: o[1] } : { emo: v, label: o[1] }; }
  function best() { return O.jget(BEST_KEY, {}); }

  function mount(opt) {
    var sh = opt.sh, lv = opt.level, board = sh.board, st = opt.stats, ctx = opt.ctx, scene = opt.scene, lesson = opt.data;
    var assisted = lv <= 2 || O.settings().scan || O.settings().slow;
    var calm = O.settings().calm || (g.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    var slowK = O.settings().slow ? .8 : 1;
    var total = opt.total, dead = false, t0 = Date.now(), score = 0, coins = 0, made = 0, swishes = 0, metrics = [];
    board.className = 'oks-board in-scene bk-board';

    var stage = E('div', 'bk-stage');
    stage.innerHTML = '<div class="bk-sky"></div><div class="bk-cones"></div><img class="bk-boy" alt="" draggable="false"><img class="bk-girl" alt="" draggable="false">' +
      '<img class="bk-ball" alt="" draggable="false" hidden><div class="bk-fx"></div>' +
      '<div class="bk-hud"><span class="bk-spot"></span><span class="bk-now"></span><span class="bk-score">⭐ <b>0</b></span></div>' +
      '<div class="bk-meter" hidden><i class="bk-zone"></i><i class="bk-mark"></i></div><div class="bk-banner" aria-live="polite"></div>';
    var dock = E('div', 'bk-dock');
    board.appendChild(stage); board.appendChild(dock);
    var $ = function (s) { return stage.querySelector(s); };
    var sky = $('.bk-sky'), cones = $('.bk-cones'), boy = $('.bk-boy'), girl = $('.bk-girl'), ball = $('.bk-ball'), fx = $('.bk-fx'),
      spotEl = $('.bk-spot'), nowEl = $('.bk-now'), scoreEl = $('.bk-score b'), meter = $('.bk-meter'), zoneEl = $('.bk-zone'), mark = $('.bk-mark'), banner = $('.bk-banner');
    sky.style.backgroundImage = 'url(' + A + 'bg_court.webp)'; ball.src = BALLIMG;
    function sp(el, n) { if (el._n !== n) { el._n = n; el.src = A + n + '.webp'; } }
    sp(girl, 'girl_dribble'); sp(boy, 'boy_catch');
    SPOTS.forEach(function (x, i) { var c = E('img', 'bk-cone'); c.src = A + 'cone.webp'; c.style.left = (x * 100 + 6) + '%'; c.dataset.i = i; cones.appendChild(c); });

    var onMain = null, mainBtn = null, timers = [], raf = 0, last = 0, tweens = [], M = null;
    function later(fn, ms) { var h = setTimeout(function () { if (!dead) fn(); }, ms / (FAST ? 4 : 1)); timers.push(h); return h; }
    function wait(ms) { return new Promise(function (res) { later(res, ms); }); }
    function say(t, ms) { banner.textContent = t; banner.classList.remove('show'); void banner.offsetWidth; banner.classList.add('show'); if (ms) later(function () { banner.classList.remove('show'); }, ms); }
    var J = g.OKS_JUICE.attach({ stage: stage, later: later, calm: calm, st: st, balls: function () { return [ball]; } });
    function addScore(n) { n = J.win(n); score += n; coins += Math.max(1, n / 10 | 0); scoreEl.textContent = score; }
    function setMain(label, fn, cls) {
      dock.innerHTML = ''; var b = E('button', 'oks-btn bk-main ' + (cls || ''), label); b.type = 'button'; mainBtn = b; onMain = fn;
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

    /* ---------- 좌표 ---------- */
    function dims() { var w = stage.clientWidth || 800, h = stage.clientHeight || 360; return { W: w, H: h }; }
    function bgPt(ix, iy) {
      var d = dims(), s = Math.max(d.W / BGW, d.H / BGH), dw = BGW * s, dh = BGH * s;
      return [ix * s - (dw - d.W) / 2, iy * s - (dh - d.H) * POSY];
    }
    function burst(x, y) {
      if (calm) return; var s = E('span', 'bk-star', '⭐'); s.style.left = x + 'px'; s.style.top = y + 'px'; fx.appendChild(s); later(function () { s.remove(); }, 800);
    }

    /* ---------- 공 움직임(작은 트윈) ---------- */
    function fly(a, b, dur, arc, s0, s1, ease) {
      return new Promise(function (res) { tweens.push({ a: a, b: b, dur: dur, arc: arc || 0, s0: s0, s1: s1, t: 0, ease: ease, res: res }); ball.hidden = false; });
    }
    function stepTweens(dt) {
      for (var i = tweens.length - 1; i >= 0; i--) {
        var T = tweens[i]; T.t += dt; var u = Math.min(1, T.t / T.dur), e = T.ease === 'in' ? u * u : T.ease === 'out' ? 1 - (1 - u) * (1 - u) : u;
        var x = T.a[0] + (T.b[0] - T.a[0]) * e, y = T.a[1] + (T.b[1] - T.a[1]) * e - Math.sin(Math.PI * u) * T.arc;
        ball.style.left = x + 'px'; ball.style.top = y + 'px'; ball.style.setProperty('--s', T.s0 + (T.s1 - T.s0) * u);
        if (u >= 1) { tweens.splice(i, 1); T.res(); }
      }
    }

    /* ---------- 슛 표시 막대 ---------- */
    function startMeter(spot) {
      var w = ZONE[lv - 1] * (lv >= 3 ? [1.3, 1, .75][spot] : 1), zc = lv >= 3 ? .35 + Math.random() * .3 : .5;
      zoneEl.style.left = (zc - w / 2) * 100 + '%'; zoneEl.style.width = w * 100 + '%'; meter.hidden = false; mark.style.left = '0%';
      M = { m: Math.random() * .3, dir: 1, zc: zc, w: w, active: true, paused: false, spot: spot, speed: SPEED[lv - 1] * slowK };
    }
    function meterFrame(dt) {
      if (!M || !M.active || M.paused) return;
      M.m += M.dir * M.speed * dt; if (M.m >= 1) { M.m = 1; M.dir = -1; } if (M.m <= 0) { M.m = 0; M.dir = 1; }
      mark.style.left = M.m * 100 + '%';
      if (assisted && Math.abs(M.m - M.zc) < Math.max(.03, M.speed * .06)) { M.m = M.zc; M.paused = true; mark.style.left = M.m * 100 + '%'; meter.classList.add('now'); say('지금 던져요!', 0); glow(); if (mainBtn) mainBtn.classList.add('now'); }
    }
    function shootPress(resolve) {
      var m = M; if (!m || !m.active) return;
      if (assisted && !m.paused) { say('조금만 기다려요', 700); return; }
      m.active = false; meter.hidden = true; meter.classList.remove('now'); if (mainBtn) mainBtn.classList.remove('now'); onMain = null;
      var d = Math.abs(m.m - m.zc), kind = assisted ? 'in' : d <= m.w * .25 ? 'swish' : d <= m.w * .5 ? 'in' : d <= m.w * 1.1 ? 'rim' : (m.m < m.zc ? 'short' : 'long');
      if (assisted && lv === 2 && Math.random() < .25) kind = 'swish';
      resolve({ kind: kind, spot: m.spot });
    }

    /* ---------- 슛 하나 ---------- */
    function doShot(i) {
      var spot = lv === 1 ? 0 : lv === 2 ? i % 2 : (i + (Math.random() * 3 | 0)) % 3, d = dims(), gx = SPOTS[spot] * d.W;
      spotEl.textContent = SPOTNAME[spot] + '에서'; nowEl.textContent = (i + 1) + '번째 슛';
      girl.style.left = gx + 'px'; sp(girl, 'girl_ready'); sp(boy, 'boy_catch');
      Array.prototype.forEach.call(cones.children, function (c) { c.classList.toggle('on', +c.dataset.i === spot); });
      return wait(i === 0 ? 700 : 500).then(function () {
        if (i === 0) say('슛 연습 시작!', 1000);
        return new Promise(function (resolve) {
          startMeter(spot); setMain('🏀 던져요!', function () { shootPress(resolve); }); if (assisted) ctx.target({ get: function () { return null; } });
        });
      }).then(function (o) {
        var gr = girl.getBoundingClientRect(), sr = stage.getBoundingClientRect(), k = sr.width / (stage.clientWidth || sr.width) || 1;
        var from = [(gr.left - sr.left + gr.width * .78) / k, (gr.top - sr.top + gr.height * .1) / k], rim = bgPt(HOOP[0], HOOP[1]), boyP = [d.W * .6, d.H * .52], H = d.H;
        sp(girl, 'girl_shoot'); O.sfx('pop');
        return wait(160).then(function () { sp(girl, 'girl_release'); return wait(200); }).then(function () {
          sp(girl, 'girl_cheer'); ball.hidden = false; O.sfx('tick');
          var sc0 = .9, sc1 = .62, res = { kind: o.kind, spot: spot };
          if (o.kind === 'swish' || o.kind === 'in') {
            return fly(from, rim, .95, H * .3, sc0, sc1).then(function () {
              burst(rim[0], rim[1] + 20); O.sfx('coin'); sp(girl, 'girl_cheer');
              say(o.kind === 'swish' ? '멋진 슛! 골인!' : '골인!', 1100);
              return fly(rim, [rim[0] - 8, rim[1] + H * .45], .5, 0, sc1, .8, 'in');
            }).then(function () { return res; });
          }
          var target = o.kind === 'rim' ? [rim[0] + d.W * .035, rim[1] - 4] : o.kind === 'short' ? [rim[0] - d.W * .1, rim[1] + H * .33] : [rim[0] + d.W * .09, rim[1] - H * .1];
          return fly(from, target, .95, H * (o.kind === 'short' ? .18 : .3), sc0, sc1).then(function () {
            O.sfx('no'); say(o.kind === 'rim' ? '아깝다! 림에 맞았어요' : o.kind === 'short' ? '공이 짧았어요' : '조금 길었어요', 1300);
            return fly(target, [target[0] - d.W * .06, H * .74], .55, o.kind === 'rim' ? H * .2 : H * .05, sc1, .85, 'in');
          }).then(function () { return res; });
        }).then(function (res) {
          /* 골대 밑 친구가 받아서 패스해 줘요 */
          return fly([ball.offsetLeft, ball.offsetTop], boyP, .5, H * .04, .85, .8).then(function () { sp(boy, 'boy_catch'); return wait(250); }).then(function () {
            sp(girl, 'girl_cheer'); return fly(boyP, [from[0] - d.W * .02, from[1] + H * .28], .8, H * .22, .8, .95);
          }).then(function () { ball.hidden = true; sp(girl, 'girl_ready'); return res; });
        });
      });
    }

    function award(res) {
      var pts = [10, 20, 30][res.spot];
      if (res.kind === 'swish') { made++; swishes++; addScore(Math.round(pts * 1.5)); O.sfx('ok'); }
      else if (res.kind === 'in') { made++; addScore(pts); O.sfx('ok'); }
      else { st.mistakes++; }
    }

    /* ---------- 문제(슛 사이) ---------- */
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
      var d = quizFor(i); sh.ask(d.q); O.say(d.q, { noRepeat: true }); meter.hidden = true; spotEl.textContent = '';
      var cards = d.opts.map(function (o) { return ctx.card(it(o[0]), { big: d.opts.length <= 2 }); }), okc = function (c) { return d.opts[cards.indexOf(c)][1] === 1; };
      dock.innerHTML = ''; mainBtn = null; onMain = null; var host = E('div', 'bk-gate'); host.appendChild(ctx.grid(cards, Math.min(3, cards.length))); dock.appendChild(host);
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
      var m0 = st.mistakes;
      J.round(i, total); if (scene) { scene.now(i); if (i === total - 1) scene.bonus(); }
      return doShot(i).then(function (res) {
        metrics.push({ at: i + 1, result: res.kind, spot: res.spot }); award(res); sp(girl, 'girl_ready');
        return wait(res.kind === 'swish' || res.kind === 'in' ? 500 : 900);
      }).then(function () { return quiz(i); }).then(function () {
        if (scene) scene.advance(i, st.mistakes === m0);
        return wait(300);
      });
    }

    function frame(t) {
      if (dead) return; raf = requestAnimationFrame(frame);
      var dt = Math.min(.05, (t - last) / 1000 || 0); last = t; if (document.hidden) return;
      for (var k = 0; k < (FAST ? 4 : 1); k++) { meterFrame(dt); stepTweens(dt); }
    }
    function begin() {
      last = performance.now(); raf = requestAnimationFrame(frame);
      var d = dims(); girl.style.left = SPOTS[0] * d.W + 'px';
      var chain = Promise.resolve();
      for (var i = 0; i < total; i++) (function (k) { chain = chain.then(function () { return turn(k); }); })(i);
      return chain.then(function () {
        stop(); var sec = Math.round((Date.now() - t0) / 100) / 10, key = 'basketball-' + opt.school + '-' + opt.lesson + '-' + lv, B = best(), prev = B[key], newBest = prev == null || score > prev;
        if (newBest) { B[key] = score; O.jset(BEST_KEY, B); }
        var miss = st.mistakes, place = miss <= 1 ? 1 : miss <= 3 ? 2 : 3;
        var text = '골인 ' + made + '번' + (swishes ? ' · 멋진 슛 ' + swishes : '') + (J.best() >= 3 ? ' · 최고 ' + J.best() + '연속' : '') + ' · 점수 ' + score + '점' + (newBest ? (prev != null ? ' (내 최고 점수!)' : '') : ' (내 최고 ' + prev + '점)');
        return { sec: sec, prev: prev, newBest: newBest, coins: coins, place: place, metrics: metrics, mistakes: miss, text: text, score: score };
      });
    }
    g.OKS_HOOP_STATE = function () { return M && M.active ? { m: M.m, zc: M.zc, w: M.w, paused: M.paused } : null; };
    return { begin: begin, stop: stop };
  }
  g.OKS_HOOP = { mount: mount, best: best };
})(window);
