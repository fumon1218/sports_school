/* 씽씽별 야구 게임 — 볼 스포츠 센터 '야구'
   한 번 누르기(화면·스페이스·↑)로 즐기는 타격 게임이에요. 스크래치 야구 게임의 규칙(볼 4개 = 볼넷, 스트라이크 3개 = 삼진)을 가져왔어요.
   - 투수가 공을 던지면 스트라이크존 안으로 오는 공은 치고, 존 밖으로 벗어나는 공은 참아요.
   - 수준 1·2(그리고 스위치 모드)는 공이 알맞은 곳에서 멈춰 기다려 줘요. 수준 3~5는 타이밍으로 쳐요.
   - 치면 베이스를 달려요(안타 1 · 2루타 2 · 홈런 4베이스). 타석 사이에는 야구 규칙 문제를 풀어요.
   - 시간 제한·탈락·경쟁 없음. 삼진도 다음 타자에게 다시 기회가 와요. 내 최고 점수와만 비교해요. */
(function (g) {
  'use strict';
  var O = g.OKS, E = O.el, A = './assets/baseball/';
  var FAST = /[?&]dev=fast/.test(location.search);
  var BEST_KEY = 'oks_baseball_best_v1';
  var DUR = [2.9, 2.4, 1.9, 1.5, 1.2];            /* 공이 날아오는 시간(초) */
  var WIN = [[.78, 1.02], [.78, 1.02], [.82, 1.0], [.85, .995], [.88, .99]]; /* 칠 수 있는 구간 */
  var BALLP = [0, .35, .35, .4, .4];              /* 존 밖 공 비율 */
  var BASES = [[.499, .872], [.777, .506], [.5, .251], [.221, .509]];  /* 홈·1루·2루·3루 (그림 비율) */
  var HITNAME = ['', '안타!', '2루타!', '3루타!', '홈런!'];

  function it(o) { var v = String(o[0] || ''); return v.indexOf('img:') === 0 ? { img: v.slice(4), label: o[1] } : { emo: v, label: o[1] }; }
  function best() { return O.jget(BEST_KEY, {}); }

  function mount(opt) {
    var sh = opt.sh, lv = opt.level, board = sh.board, st = opt.stats, ctx = opt.ctx, scene = opt.scene, lesson = opt.data;
    var assisted = lv <= 2 || O.settings().scan || O.settings().slow;
    var calm = O.settings().calm || (g.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    var slowK = O.settings().slow ? 1.3 : 1;
    var total = opt.total, dead = false, t0 = Date.now(), score = 0, coins = 0, hits = 0, outs = 0, walks = 0, bestBases = 0, metrics = [];
    board.className = 'oks-board in-scene bb-board';

    var stage = E('div', 'bb-stage');
    stage.innerHTML = '<div class="bb-sky"></div><img class="bb-ump" alt="" draggable="false"><img class="bb-catcher" alt="" draggable="false">' +
      '<img class="bb-pitcher" alt="" draggable="false"><img class="bb-batter" alt="" draggable="false"><img class="bb-zone" alt="" draggable="false">' +
      '<img class="bb-ball" alt="" draggable="false" hidden><div class="bb-fx"></div>' +
      '<div class="bb-hud"><span class="bb-count"></span><span class="bb-now"></span><span class="bb-score">⭐ <b>0</b></span></div>' +
      '<div class="bb-banner" aria-live="polite"></div>' +
      '<div class="bb-diamond" hidden><div class="bb-dfill"></div><div class="bb-dwrap"><div class="bb-dbg"></div><img class="bb-runner" alt="" draggable="false"><img class="bb-call" alt="" draggable="false" hidden></div></div>';
    var dock = E('div', 'bb-dock');
    board.appendChild(stage); board.appendChild(dock);
    var $ = function (s) { return stage.querySelector(s); };
    var sky = $('.bb-sky'), ump = $('.bb-ump'), catcher = $('.bb-catcher'), pitcher = $('.bb-pitcher'), batter = $('.bb-batter'), zone = $('.bb-zone'), ball = $('.bb-ball'),
      fx = $('.bb-fx'), cnt = $('.bb-count'), nowEl = $('.bb-now'), scoreEl = $('.bb-score b'), banner = $('.bb-banner'),
      dia = $('.bb-diamond'), dbg = $('.bb-dbg'), dfill = $('.bb-dfill'), runner = $('.bb-runner'), call = $('.bb-call');
    sky.style.backgroundImage = 'url(' + A + 'bg_main.webp)'; dbg.style.backgroundImage = dfill.style.backgroundImage = 'url(' + A + 'bg_diamond.webp)';
    zone.src = A + 'strikezone.webp'; ump.src = A + 'umpire_idle.webp'; ball.src = A + 'ball.webp';
    function sp(el, n) { if (el._n !== n) { el._n = n; el.src = A + n + '.webp'; } }
    sp(catcher, 'catcher_ready'); sp(pitcher, 'pitcher_ready'); sp(batter, 'batter_wait');

    var mode = 'idle', onMain = null, mainBtn = null, timers = [], raf = 0, last = 0, pit = null;
    function later(fn, ms) { var h = setTimeout(function () { if (!dead) fn(); }, ms / (FAST ? 4 : 1)); timers.push(h); return h; }
    function wait(ms) { return new Promise(function (res) { later(res, ms); }); }
    function say(t, ms) { banner.textContent = t; banner.classList.remove('show'); void banner.offsetWidth; banner.classList.add('show'); if (ms) later(function () { banner.classList.remove('show'); }, ms); }
    var J = g.OKS_JUICE.attach({ stage: stage, later: later, calm: calm, st: st, balls: function () { return [ball]; } });
    function addScore(n) { n = J.win(n); score += n; coins += Math.max(1, n / 10 | 0); scoreEl.textContent = score; }
    function setMain(label, fn, cls) {
      dock.innerHTML = ''; var b = E('button', 'oks-btn bb-main ' + (cls || ''), label); b.type = 'button'; mainBtn = b; onMain = fn;
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

    function drawCount(b, s) {
      var dots = function (n, max, c) { var h = ''; for (var i = 0; i < max; i++) h += '<i class="' + c + (i < n ? ' on' : '') + '"></i>'; return h; };
      cnt.innerHTML = '<em>볼</em>' + dots(b, 4, 'b') + '<em>스트라이크</em>' + dots(s, 3, 's');
      cnt.setAttribute('aria-label', '볼 ' + b + '개, 스트라이크 ' + s + '개');
    }
    function burst(x, y) {
      if (calm) return; var s = E('img', 'bb-burst'); s.src = A + 'hit_burst.webp'; s.style.left = x + 'px'; s.style.top = y + 'px'; fx.appendChild(s); later(function () { s.remove(); }, 700);
    }

    /* ---------- 공 한 개 ---------- */
    function rects() {
      var S = stage.getBoundingClientRect(), Z = zone.getBoundingClientRect(), P = pitcher.getBoundingClientRect(), k = S.width / (stage.clientWidth || S.width) || 1;
      return { W: S.width / k, H: S.height / k, zx: (Z.left - S.left + Z.width / 2) / k, zy: (Z.top - S.top + Z.height / 2) / k, zw: Z.width / k, zh: Z.height / k, px: (P.left - S.left + P.width * .22) / k, py: (P.top - S.top + P.height * .3) / k };
    }
    function place(R, q, scale) {
      var x = R.sx + (R.tx - R.sx) * q, y = R.sy + (R.ty - R.sy) * q - Math.sin(Math.PI * q) * R.H * .05;
      ball.style.left = x + 'px'; ball.style.top = y + 'px'; ball.style.setProperty('--s', scale); R.cx = x; R.cy = y;
    }
    function spec(first) {
      var isBall = lv >= 2 && !first && Math.random() < BALLP[lv - 1] || (lv >= 2 && first && Math.random() < BALLP[lv - 1] * .5), ox, oy;
      if (!isBall) { ox = (Math.random() - .5) * 1.1; oy = (Math.random() - .5) * 1.2; }
      else if (Math.random() < .5) { ox = (Math.random() < .5 ? -1 : 1) * (1.25 + Math.random() * .35); oy = (Math.random() - .5) * 1.4; }
      else { ox = (Math.random() - .5) * 1.2; oy = (Math.random() < .5 ? -1 : 1) * (1.2 + Math.random() * .3); }
      var jit = lv >= 3 ? .85 + Math.random() * .3 : 1;
      return { strike: !isBall, ox: ox, oy: oy, dur: DUR[lv - 1] * jit * slowK };
    }
    function throwPitch(sp0) {
      return new Promise(function (res) {
        var R = rects(); R.tx = R.zx + sp0.ox * R.zw / 2; R.ty = R.zy + sp0.oy * R.zh / 2; R.sx = R.px; R.sy = R.py;
        sp(pitcher, 'pitcher_windup'); sp(batter, 'batter_ready'); sp(ump, 'umpire_idle'); sp(catcher, 'catcher_ready'); ball.hidden = true;
        later(function () {
          sp(pitcher, 'pitcher_throw'); O.sfx('tick');
          pit = { R: R, spec: sp0, p: 0, paused: false, active: true, res: res, swung: false, t: Date.now() };
          ball.hidden = false; ball.style.transition = 'none'; ball.classList.remove('hit'); place(R, 0, .35);
          if (assisted && !sp0.strike) { later(function () { if (pit && pit.active) say('존 밖이에요! 참아요 ✋', 1400); }, sp0.dur * 450); }
          later(function () { sp(pitcher, 'pitcher_ready'); }, 600);
        }, 700);
      });
    }
    function finishPitch(result, extra) {
      var P = pit; if (!P) return; P.active = false; pit = null; mode = 'idle'; onMain = null; if (mainBtn) mainBtn.classList.remove('press');
      extra = extra || {}; extra.result = result; extra.p = P.p; extra.spec = P.spec; P.res(extra);
    }
    function swing() {
      var P = pit; if (!P || !P.active || P.swung) return; var c = .94;
      if (assisted && P.spec.strike && !P.paused && P.p < .5) { say('조금만 기다려요', 700); return; }
      P.swung = true; sp(batter, 'batter_swing1'); O.sfx('pop'); if (mainBtn) mainBtn.classList.add('press');
      later(function () { sp(batter, 'batter_swing2'); }, 110); later(function () { sp(batter, 'batter_follow'); }, 320);
      if (!P.spec.strike) { P.res0 = 'swingball'; return; }                       /* 존 밖 공에 휘두름 */
      var w = WIN[lv - 1];
      if (assisted && P.paused) { P.hit = { q: lv === 1 ? [1, 1, 2, 2, 4][Math.random() * 5 | 0] : [1, 1, 2, 4][Math.random() * 4 | 0] }; return; }
      if (P.p >= w[0] && P.p <= w[1]) {
        var d = Math.abs(P.p - c), pf = lv === 3 ? .045 : .03, gd = lv === 3 ? .1 : .07;
        P.hit = { q: d <= pf ? 4 : d <= gd ? 2 : 1 };
      } else P.res0 = P.p < w[0] ? 'early' : 'late';
    }
    function pitchFrame(dt) {
      var P = pit; if (!P || !P.active) return;
      if (P.hit) {                                     /* 맞았어요 */
        var q = P.hit.q, R = P.R; P.active = false; ball.style.transition = 'left 1.1s cubic-bezier(.2,.7,.4,1), top 1.1s cubic-bezier(.3,.1,.2,1), transform 1.1s';
        burst(R.cx, R.cy); O.sfx('coin'); stage.classList.remove('shake'); void stage.offsetWidth; if (!calm) stage.classList.add('shake');
        ball.classList.add('hit'); ball.style.setProperty('--s', .28);
        var far = q >= 4 ? [.9, .06] : q === 2 ? [.78, .16] : [.62, .34];
        ball.style.left = R.W * far[0] + 'px'; ball.style.top = R.H * far[1] + 'px';
        pit = null; mode = 'idle'; onMain = null; if (mainBtn) mainBtn.classList.remove('press'); sp(catcher, 'catcher_ready');
        P.res({ result: 'hit', bases: q, p: P.p, spec: P.spec }); return;
      }
      if (P.paused) return;
      P.p += dt / P.spec.dur;
      var s = .35 + .65 * Math.min(1, P.p); place(P.R, Math.min(1.04, P.p), s);
      var w = WIN[lv - 1];
      if (assisted && P.spec.strike && P.p >= .93) {
        P.p = .93; P.paused = true; say('지금 쳐요!', 0); glow(); if (mainBtn) mainBtn.classList.add('now');
      }
      if (P.p >= 1) {                                  /* 포수에게 도착 */
        sp(catcher, 'catcher_catch'); O.sfx('tick'); ball.hidden = true;
        var r = P.res0 === 'swingball' ? 'swingball' : P.res0 ? 'miss' : P.spec.strike ? 'strike' : 'ball';
        if (r === 'miss') r = P.res0;
        finishPitch(r);
      }
    }

    /* ---------- 베이스 달리기 ---------- */
    function showDia(on) { dia.hidden = !on; stage.classList.toggle('on-dia', on); }
    function runnerAt(k, pose) { var B = BASES[k % 4]; runner.style.left = B[0] * 100 + '%'; runner.style.top = B[1] * 100 + '%'; if (pose) sp(runner, pose); }
    function runBases(n, auto) {
      return new Promise(function (res) {
        showDia(true); call.hidden = true; runner.style.transition = 'none'; runnerAt(0, 'batter_ready'); void runner.offsetWidth;
        var k = 0, busy = false, flip = false, anim = 0;
        function go() {
          if (busy || k >= n) return; busy = true; k++; var B = BASES[k % 4], dur = (assisted ? 1000 : 780) / (FAST ? 4 : 1);
          runner.style.transition = 'left ' + dur + 'ms linear, top ' + dur + 'ms linear'; runnerAt(k, 'runner_run_a'); O.sfx('tick');
          clearInterval(anim); anim = setInterval(function () { flip = !flip; sp(runner, flip ? 'runner_run_b' : 'runner_run_a'); }, 170 / (FAST ? 4 : 1)); timers.push(anim);
          later(function () {
            clearInterval(anim); busy = false;
            if (k < n) { sp(runner, 'runner_safe'); O.sfx('ok'); nextPrompt(); }
            else { sp(runner, n === 4 ? 'batter_cheer' : 'runner_safe'); call.src = A + 'umpire_safe.webp'; call.hidden = false; O.sfx('coin'); say(n === 4 ? '홈런! 득점!' : n === 1 ? '세이프! 1루 도착' : '세이프! ' + n + '루 도착', 0); later(function () { done(); }, 1400); }
          }, dur + 30);
        }
        function nextPrompt() {
          if (assisted) { later(go, 350); return; }
          setMain('🏃 다음 베이스로!', go); glow(); say((k + 1) + '번째 베이스로 달려요!', 0);
        }
        function done() { call.hidden = true; showDia(false); banner.classList.remove('show'); res(); }
        if (auto) { say('걸어서 1루로 가요', 0); later(go, 400); }
        else { setMain('🏃 달려요!', go); glow(); say('달려요! 1루로!', 0); }
      });
    }

    /* ---------- 문제(타석 사이) ---------- */
    function quizFor(i) {
      var L = lesson, nOpt = lv === 1 ? 1 : lv === 2 ? 2 : 3, data;
      if (i % 2 === 0) {
        var right = L.i[(i >> 1) % L.i.length], wrong = O.shuffle(L.n.slice()).slice(0, Math.max(0, nOpt - 1));
        data = { q: L.q, opts: O.shuffle([[right, 1]].concat(wrong.map(function (w) { return [w, 0]; }))) };
      } else {
        var T = L.t[(i >> 1) % L.t.length], good = T.o.filter(function (x) { return x[2]; }), bad = O.shuffle(T.o.filter(function (x) { return !x[2]; })).slice(0, Math.max(0, nOpt - 1));
        data = { q: T.q, opts: O.shuffle([[good[0], 1]].concat(bad.map(function (b0) { return [b0, 0]; }))) };
      }
      return data;
    }
    function quiz(i) {
      var d = quizFor(i); sh.ask(d.q); O.say(d.q, { noRepeat: true }); sp(batter, 'batter_wait');
      var cards = d.opts.map(function (o) { return ctx.card(it(o[0]), { big: d.opts.length <= 2 }); }), okc = function (c) { return d.opts[cards.indexOf(c)][1] === 1; };
      dock.innerHTML = ''; mainBtn = null; onMain = null; var host = E('div', 'bb-gate'); host.appendChild(ctx.grid(cards, Math.min(3, cards.length))); dock.appendChild(host);
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

    /* ---------- 타석 하나 ---------- */
    function atBat(i) {
      var balls = 0, strikes = 0, pitches = 0, m = { at: i + 1, pitches: 0, swings: 0, result: '' }; drawCount(0, 0); nowEl.textContent = (i + 1) + '번째 타자';
      sp(batter, 'batter_wait'); sp(pitcher, 'pitcher_ready'); sp(catcher, 'catcher_ready'); sp(ump, 'umpire_idle');
      function pitchOnce() {
        if (i === 0 && pitches === 0) say('플레이볼!', 1100);
        setMain('🏏 휘둘러요!', function () { swing(); }); mode = 'bat'; if (assisted) ctx.target({ get: function () { return null; } });
        return throwPitch(spec(pitches === 0)).then(function (r) {
          pitches++; m.pitches = pitches; if (r.result !== 'strike' && r.result !== 'ball') m.swings++;
          if (r.result === 'hit') { m.result = HITNAME[r.bases]; return { kind: 'hit', bases: r.bases }; }
          if (r.result === 'ball') { balls++; drawCount(balls, strikes); sp(ump, 'umpire_idle'); say('볼!', 900); if (assisted) say('좋아요, 잘 참았어요!', 1000); O.sfx(assisted ? 'ok' : 'tick'); }
          else { strikes++; drawCount(balls, strikes); sp(ump, 'umpire_out'); O.sfx('no');
            say(r.result === 'swingball' ? '헛스윙! 존 밖이에요' : r.result === 'early' ? '너무 빨랐어요' : r.result === 'late' ? '조금 늦었어요' : '스트라이크!', 1100); }
          if (strikes >= 3) { m.result = '삼진'; return { kind: 'out' }; }
          if (balls >= 4) { m.result = '볼넷'; return { kind: 'walk' }; }
          return wait(1200).then(pitchOnce);
        });
      }
      return pitchOnce().then(function (o) { metrics.push(m); return o; });
    }

    function turn(i) {
      var m0 = st.mistakes;
      J.round(i, total); if (scene) { scene.now(i); if (i === total - 1) scene.bonus(); }
      return atBat(i).then(function (o) {
        mode = 'idle'; onMain = null; ball.hidden = true; var step;
        if (o.kind === 'hit') {
          hits++; bestBases = Math.max(bestBases, o.bases); sp(batter, 'batter_cheer'); say(HITNAME[o.bases], 900); addScore(o.bases * 10);
          step = wait(1100).then(function () { return runBases(o.bases, false); });
        } else if (o.kind === 'walk') {
          walks++; addScore(10); say('볼넷! 걸어서 1루로', 1000); sp(batter, 'batter_cheer');
          step = wait(900).then(function () { return runBases(1, true); });
        } else {
          outs++; st.mistakes++; sp(ump, 'umpire_out'); say('삼진 아웃! 다음 타자는 더 잘 쳐요', 1500); O.sfx('no');
          step = wait(1700);
        }
        return step;
      }).then(function () { return quiz(i); }).then(function () {
        if (scene) scene.advance(i, st.mistakes === m0);
        return wait(300);
      });
    }

    /* ---------- 프레임 ---------- */
    function frame(t) {
      if (dead) return; raf = requestAnimationFrame(frame);
      var dt = Math.min(.05, (t - last) / 1000 || 0); last = t; if (document.hidden) return;
      for (var k = 0; k < (FAST ? 4 : 1); k++) pitchFrame(dt);
      if (pit && pit.active && dock.querySelector('.bb-main')) { /* 단추는 항상 남아 있어요 */ }
    }
    function begin() {
      last = performance.now(); raf = requestAnimationFrame(frame); drawCount(0, 0);
      var chain = Promise.resolve();
      for (var i = 0; i < total; i++) (function (k) { chain = chain.then(function () { return turn(k); }); })(i);
      return chain.then(function () {
        stop(); var sec = Math.round((Date.now() - t0) / 100) / 10, key = 'baseball-' + opt.school + '-' + opt.lesson + '-' + lv, B = best(), prev = B[key], newBest = prev == null || score > prev;
        if (newBest) { B[key] = score; O.jset(BEST_KEY, B); }
        var miss = st.mistakes, place = miss <= 1 ? 1 : miss <= 3 ? 2 : 3;
        var text = '안타 ' + hits + '번' + (walks ? ' · 볼넷 ' + walks : '') + (J.best() >= 3 ? ' · 최고 ' + J.best() + '연속' : '') + ' · 점수 ' + score + '점' + (newBest ? (prev != null ? ' (내 최고 점수!)' : '') : ' (내 최고 ' + prev + '점)');
        return { sec: sec, prev: prev, newBest: newBest, coins: coins, place: place, metrics: metrics, mistakes: miss, text: text, score: score };
      });
    }
    g.OKS_BALL_STATE = function () { return pit ? { p: pit.p, strike: pit.spec.strike, paused: pit.paused, active: pit.active } : null; };
    return { begin: begin, stop: stop };
  }
  g.OKS_BALL = { mount: mount, best: best };
})(window);
