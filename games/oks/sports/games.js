/* 씽씽 별 마을 체육 미니게임: 종목마다 다른 조작을 해 봐요.
   aim(양궁) · breath(수영 호흡) · lane(수영 레인) · hold(체조 균형) · pose(체조 동작 기억) · dir(태권도 방향) · pass(축구 패스와 슛)
   각 게임은 (ctx, host, o) 를 받아 끝나면 풀리는 약속(Promise)을 돌려줍니다. o = {level, arg, lesson, sport}
   틀리면 ctx.bad 로 실수만 세고, 계속 다시 해 볼 수 있어요(막히지 않아요). */
(function () {
  'use strict';
  var O = window.OKS, E = O.el;
  var G = window.OKS_SPORT_GAMES = {};

  function box(cls, html) { return E('div', 'sg ' + cls, html || ''); }
  function btn(label, cls) { var b = E('button', 'oks-btn sg-btn ' + (cls || ''), label); b.type = 'button'; return b; }
  function reduced() { return (O.settings && O.settings().calm) || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function scan() { return !!(O.settings && O.settings().scan); }
  function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }
  function until(el) { /* 화면이 바뀌면(요소가 사라지면) 반복 멈추기 */ return function () { return !el.isConnected; }; }

  /* ---------- 양궁: 움직이는 조준 ---------- */
  G.aim = function (ctx, host, o) {
    var lv = o.level, far = o.arg === 'far';
    var band = (lv >= 5 ? .22 : .34) * (far ? .8 : 1);     /* 가운데로 인정하는 폭(반지름 비율) */
    var period = (lv >= 5 ? 1500 : 2100) * (far ? .85 : 1);
    var need = lv >= 5 ? 3 : 2, hits = 0, misses = 0;
    var w = box('sg-aim');
    var rings = ['#fff', '#2b2b2b', '#3b82d6', '#e53935', '#ffd23f'], cx = 50, cy = 50, R = far ? 28 : 38;
    var svg = '<svg viewBox="0 0 100 62" class="sg-target"><rect x="0" y="0" width="100" height="62" rx="6" fill="#dff3e0"/>' +
      '<rect x="47.5" y="46" width="5" height="16" fill="#8a5a2b"/>';
    for (var i = 0; i < 5; i++) { var r = R * (1 - i * .2) * .62; svg += '<ellipse cx="50" cy="30" rx="' + (r * 1.0).toFixed(2) + '" ry="' + (r * 1.0).toFixed(2) + '" fill="' + rings[i] + '" stroke="#555" stroke-width=".3"/>'; }
    svg += '<g class="sg-arrows"></g><line class="sg-aimline" x1="0" y1="2" x2="0" y2="58" stroke="#ff2e6e" stroke-width="1.2" stroke-dasharray="2 1.5"/><circle class="sg-aimdot" cx="0" cy="30" r="2.2" fill="none" stroke="#ff2e6e" stroke-width="1"/></svg>';
    w.innerHTML = svg + '<div class="sg-score"></div>';
    var fire = btn('🏹 쏘기!', 'orange');
    var line = w.querySelector('.sg-aimline'), dot = w.querySelector('.sg-aimdot'), arrows = w.querySelector('.sg-arrows'), score = w.querySelector('.sg-score');
    function draw() { var h = ''; for (var k = 0; k < need; k++) h += '<i class="' + (k < hits ? 'on' : '') + '">🎯</i>'; score.innerHTML = h; }
    draw();
    host.appendChild(w); host.appendChild(fire);
    ctx.sh.ask('빨간 선이 과녁 가운데를 지날 때 "쏘기!"를 눌러요.');
    var t0 = performance.now(), x = 0, gone = until(w), assist = 1;
    function pos(t) { var p = ((t - t0) % period) / period; return (p < .5 ? p * 2 : (1 - p) * 2); }  /* 0~1~0 */
    function frame(t) {
      if (gone()) return;
      var f = reduced() ? .5 + .45 * Math.sin((t - t0) / period * 6.283) : pos(t);
      x = 6 + f * 88; line.setAttribute('x1', x); line.setAttribute('x2', x); dot.setAttribute('cx', x);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    ctx.target({ get: function () { return fire; } });
    return new Promise(function (res) {
      fire.onclick = function () {
        var d = Math.abs(x - 50) / 50 * 1.0;                  /* 0(가운데)~ */
        var ok = d <= band * assist * 1.15;
        var a = '<g class="sg-arrow"><line x1="' + x + '" y1="30" x2="' + (x + 5) + '" y2="38" stroke="#6b4c2b" stroke-width="1.1"/><circle cx="' + x + '" cy="30" r=".9" fill="#222"/></g>';
        if (ok) {
          hits++; arrows.insertAdjacentHTML('beforeend', '<g><line x1="' + (50 + (x - 50) * .15) + '" y1="30" x2="' + (55 + (x - 50) * .15) + '" y2="39" stroke="#6b4c2b" stroke-width="1.1"/></g>');
          ctx.good(fire, hits >= need ? undefined : false); draw();
          if (hits >= need) { fire.disabled = true; setTimeout(res, 900); }
        } else {
          misses++; ctx.bad(fire); if (misses % 3 === 0) assist += .3;
          arrows.insertAdjacentHTML('beforeend', '<g opacity=".5"><line x1="' + x + '" y1="30" x2="' + (x + 5) + '" y2="39" stroke="#999" stroke-width="1"/></g>');
          if (arrows.children.length > 8) arrows.removeChild(arrows.firstChild);
        }
      };
    });
  };

  /* ---------- 수영: 호흡 리듬 ---------- */
  G.breath = function (ctx, host, o) {
    var lv = o.level, period = lv >= 5 ? 2200 : 3200, need = lv >= 5 ? 4 : 3, got = 0, tol = lv >= 5 ? .12 : .2;
    var w = box('sg-breath', '<div class="sg-swimmer">🏊</div><div class="sg-bub-wrap"><div class="sg-ring"></div><div class="sg-bub"></div></div><div class="sg-cue">숨을 들이쉬어요…</div><div class="sg-score"></div>');
    var bub = w.querySelector('.sg-bub'), cue = w.querySelector('.sg-cue'), score = w.querySelector('.sg-score');
    var go = btn('🫧 후~ 내쉬기!', 'blue');
    host.appendChild(w); host.appendChild(go);
    function draw() { var h = ''; for (var k = 0; k < need; k++) h += '<i class="' + (k < got ? 'on' : '') + '">🫧</i>'; score.innerHTML = h; } draw();
    ctx.sh.ask('동그란 방울이 점선 동그라미만큼 커졌을 때 "후~ 내쉬기!"를 눌러요.');
    var t0 = performance.now(), prog = 0, gone = until(w), pause = 0;
    function frame(t) {
      if (gone()) return;
      var p = ((t - t0) % period) / period; prog = p;
      var s = reduced() ? .3 + .7 * p : .25 + .75 * p;
      bub.style.transform = 'scale(' + s + ')';
      cue.textContent = p < .85 ? '숨을 들이쉬어요…' : '지금 후~!';
      cue.classList.toggle('now', p >= .85);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    ctx.target({ get: function () { return go; } });
    return new Promise(function (res) {
      go.onclick = function () {
        var d = Math.abs(prog - .94);
        if (d <= tol || (prog > .8 && prog < 1)) {
          got++; draw(); ctx.good(go, got >= need ? undefined : false); O.say('후~', { noRepeat: false });
          t0 = performance.now();
          if (got >= need) { go.disabled = true; setTimeout(res, 900); }
        } else { ctx.bad(go); }
      };
    });
  };

  /* ---------- 수영: 레인 찾기 ---------- */
  G.lane = function (ctx, host, o) {
    var lv = o.level, rounds = lv >= 5 ? 4 : 3, k = 0, nums = ['1', '2', '3', '4'], ord = ['첫째', '둘째', '셋째', '넷째'];
    var w = box('sg-lane', '<div class="sg-pool"></div><div class="sg-ask"></div>');
    var pool = w.querySelector('.sg-pool'), ask = w.querySelector('.sg-ask'), want = 0;
    var lanes = [0, 1, 2, 3].map(function (i) {
      var l = E('button', 'sg-lanebtn', '<b>' + nums[i] + '</b><span class="sg-sw">🏊</span>'); l.type = 'button'; l.dataset.i = i; pool.appendChild(l); return l;
    });
    host.appendChild(w);
    function next() {
      want = Math.floor(Math.random() * 4);
      var txt = lv >= 5 && k % 2 ? '왼쪽에서 ' + ord[want] + ' 레인으로 가요.' : nums[want] + '번 레인으로 가요.';
      ask.textContent = txt; ctx.sh.ask(txt); ctx.target({ get: function () { return lanes[want]; } });
      lanes.forEach(function (l) { l.classList.remove('good', 'wobble'); });
    }
    return new Promise(function (res) {
      next();
      lanes.forEach(function (l, i) {
        l.onclick = function () {
          if (i === want) {
            l.classList.add('good'); ctx.good(l, false); k++;
            if (k >= rounds) { setTimeout(res, 800); lanes.forEach(function (x) { x.onclick = null; }); } else setTimeout(next, 700);
          } else ctx.bad(l);
        };
      });
    });
  };

  /* ---------- 체조: 균형 버티기 ---------- */
  G.hold = function (ctx, host, o) {
    var lv = o.level, T = lv >= 5 ? 4000 : 3000, rounds = lv >= 5 ? 3 : 2, k = 0;
    var pic = (o.lesson && o.lesson.i && o.lesson.i[0]) || ['🦩', ''];
    var w = box('sg-hold', '<div class="sg-pose">🦩</div><div class="sg-meter"><i></i></div><div class="sg-cue">버튼을 꾹 누르고 있어요</div><div class="sg-score"></div>');
    var meter = w.querySelector('.sg-meter i'), cue = w.querySelector('.sg-cue'), score = w.querySelector('.sg-score'), fig = w.querySelector('.sg-pose');
    var b = btn('🧘 꾹 누르고 균형 잡기', 'orange');
    host.appendChild(w); host.appendChild(b);
    function draw() { var h = ''; for (var i = 0; i < rounds; i++) h += '<i class="' + (i < k ? 'on' : '') + '">⭐</i>'; score.innerHTML = h; } draw();
    ctx.sh.ask('버튼을 ' + Math.round(T / 1000) + '초 동안 꾹 누르고 균형을 잡아요.');
    var start = 0, raf = 0, auto = scan() || lv <= 3, gone = until(w);
    function stop(ok) { cancelAnimationFrame(raf); start = 0; fig.classList.remove('wob'); if (!ok) { meter.style.width = '0'; cue.textContent = '조금 더! 다시 눌러요'; } }
    function tick(t) {
      if (gone()) return;
      var p = Math.min(1, (t - start) / T); meter.style.width = (p * 100) + '%';
      fig.classList.toggle('wob', p > .15 && p < .9);
      cue.textContent = p < 1 ? '균형을 잡고 있어요… ' + Math.ceil((1 - p) * T / 1000) : '좋아요!';
      if (p >= 1) { stop(true); k++; draw(); ctx.good(b, k >= rounds ? undefined : false); if (k >= rounds) { b.disabled = true; setTimeout(done, 900); } else { cue.textContent = '한 번 더 해요'; setTimeout(function () { meter.style.width = '0'; }, 600); } return; }
      raf = requestAnimationFrame(tick);
    }
    var done; ctx.target({ get: function () { return b; } });
    function press(e) { if (e) e.preventDefault(); if (start || b.disabled) return; start = performance.now(); raf = requestAnimationFrame(tick); }
    function release() { if (start && !auto) stop(false); }
    return new Promise(function (res) {
      done = res;
      var ptr = false; b.addEventListener('pointerdown', function () { ptr = true; });
      b.addEventListener('click', function () { if (!ptr && !start) { auto = true; press(); } ptr = false; });  /* 포인터 없이 눌러도(스위치·보조기기) 자동으로 */
      b.addEventListener('pointerdown', press); b.addEventListener('pointerup', release); b.addEventListener('pointerleave', release); b.addEventListener('pointercancel', release);
      b.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') press(e); }); b.addEventListener('keyup', function (e) { if (e.key === ' ' || e.key === 'Enter') release(); });
      if (auto) { b.textContent = '🧘 눌러서 균형 잡기'; }
    });
  };

  /* ---------- 체조: 동작 기억하기 ---------- */
  G.pose = function (ctx, host, o) {
    var lv = o.level, L = o.lesson || { i: [] }, pool = (L.i || []).slice(0, 5), rounds = 3, k = 0, len = lv >= 5 ? 3 : 1;
    if (pool.length < 3) pool = pool.concat([['🧍', '바르게 서기'], ['🙆', '팔 벌리기'], ['🦩', '한 발 서기']]);
    var w = box('sg-pose-game', '<div class="sg-show"></div><div class="sg-ask"></div>');
    var show = w.querySelector('.sg-show'), ask = w.querySelector('.sg-ask');
    host.appendChild(w);
    function emo(it) { return '<div class="sg-pc"><span>' + it[0] + '</span><b>' + O.esc(it[1]) + '</b></div>'; }
    function round() {
      var seq = O.shuffle(pool.slice()).slice(0, len), idx = 0;
      ask.textContent = '잘 보고 기억해요!'; ctx.sh.ask('나오는 동작을 잘 보고 기억해요.');
      return new Promise(function (resolve) {
        function showNext() {
          if (idx >= seq.length) { show.innerHTML = ''; choose(); return; }
          show.innerHTML = emo(seq[idx]); O.say(seq[idx][1], { noRepeat: false }); idx++;
          setTimeout(showNext, 1500);
        }
        function choose() {
          var got = 0; ask.textContent = len > 1 ? '본 순서대로 눌러요.' : '어떤 동작이었나요?'; ctx.sh.ask(ask.textContent);
          var opts = O.shuffle(pool.slice()).slice(0, Math.min(pool.length, 4));
          seq.forEach(function (s) { if (!opts.some(function (x) { return x[1] === s[1]; })) opts[0] = s; });
          opts = O.shuffle(opts);
          var cards = opts.map(function (x) { return ctx.card({ emo: x[0], label: x[1] }, { big: false }); });
          var g = ctx.grid(cards); show.appendChild(g);
          ctx.target({ get: function () { return cards.filter(function (c) { return seq[got] && c._item.label === seq[got][1] && !c._done; }); } });
          cards.forEach(function (c) {
            c.onclick = function () {
              if (c._done) return;
              if (c._item.label === seq[got][1]) {
                c._done = true; ctx.good(c, false); got++;
                if (got >= seq.length) { cards.forEach(function (x) { x.onclick = null; }); setTimeout(resolve, 900); }
              } else ctx.bad(c);
            };
          });
        }
        showNext();
      });
    }
    return (function loop() { if (k >= rounds) return Promise.resolve(); return round().then(function () { k++; show.innerHTML = ''; return loop(); }); })();
  };

  /* ---------- 태권도: 방향 발차기 ---------- */
  G.dir = function (ctx, host, o) {
    var lv = o.level, rounds = lv >= 5 ? 3 : 5, k = 0, seqLen = lv >= 5 ? 3 : 1;
    var w = box('sg-dir', '<div class="sg-cue-big"></div><div class="sg-arena"><button type="button" class="sg-pad l"><span>⬅️</span><i>왼쪽</i></button><div class="sg-kid">🥋</div><button type="button" class="sg-pad r"><span>➡️</span><i>오른쪽</i></button></div><div class="sg-score"></div>');
    var cue = w.querySelector('.sg-cue-big'), pl = w.querySelector('.sg-pad.l'), pr = w.querySelector('.sg-pad.r'), kid = w.querySelector('.sg-kid'), score = w.querySelector('.sg-score');
    host.appendChild(w);
    function draw() { var h = ''; for (var i = 0; i < rounds; i++) h += '<i class="' + (i < k ? 'on' : '') + '">🥋</i>'; score.innerHTML = h; } draw();
    var want = [], pos = 0;
    function next() {
      want = []; for (var i = 0; i < seqLen; i++) want.push(Math.random() < .5 ? 0 : 1); pos = 0;
      var words = want.map(function (d) { return d ? '오른쪽' : '왼쪽'; });
      if (seqLen > 1) {
        cue.textContent = '잘 보고 기억해요!'; ctx.sh.ask('나오는 방향을 기억해서 차례대로 눌러요.');
        var j = 0; (function flash() { if (j >= want.length) { cue.textContent = '차례대로 차요!'; return; } cue.textContent = words[j]; O.say(words[j], { noRepeat: false }); j++; setTimeout(flash, 1100); })();
      } else { cue.textContent = words[0] + '!'; ctx.sh.ask(words[0] + ' 목표를 발로 차요.'); O.say(words[0], { noRepeat: false }); }
      ctx.target({ get: function () { return want[pos] ? pr : pl; } });
    }
    function kick(d) {
      kid.classList.remove('kl', 'kr'); void kid.offsetWidth; kid.classList.add(d ? 'kr' : 'kl');
      (d ? pr : pl).classList.add('hit'); setTimeout(function () { pl.classList.remove('hit'); pr.classList.remove('hit'); }, 400);
    }
    return new Promise(function (res) {
      next();
      [pl, pr].forEach(function (p, d) {
        p.onclick = function () {
          if (d === want[pos]) {
            kick(d); O.sfx('pop'); pos++;
            if (pos >= want.length) { k++; draw(); ctx.good(p, k >= rounds ? undefined : false); if (k >= rounds) { pl.onclick = pr.onclick = null; setTimeout(res, 900); } else setTimeout(next, 900); }
            else ctx.target({ get: function () { return want[pos] ? pr : pl; } });
          } else ctx.bad(p);
        };
      });
    });
  };

  /* ---------- 축구: 패스와 슛 ---------- */
  G.pass = function (ctx, host, o) {
    var lv = o.level, rounds = lv >= 5 ? 4 : 3, k = 0;
    var w = box('sg-field', '<div class="sg-goal"><span class="sg-keeper">🧤</span></div><div class="sg-mates"></div><div class="sg-ball">⚽</div><div class="sg-ask"></div><div class="sg-score"></div>');
    var mates = w.querySelector('.sg-mates'), ask = w.querySelector('.sg-ask'), ball = w.querySelector('.sg-ball'), goal = w.querySelector('.sg-goal'), keeper = w.querySelector('.sg-keeper'), score = w.querySelector('.sg-score');
    host.appendChild(w);
    function draw() { var h = ''; for (var i = 0; i < rounds; i++) h += '<i class="' + (i < k ? 'on' : '') + '">⚽</i>'; score.innerHTML = h; } draw();
    function passRound() {
      mates.innerHTML = ''; goal.classList.remove('shoot'); keeper.style.left = '50%'; ball.style.transform = '';
      var n = lv >= 5 ? 4 : 3, open = Math.floor(Math.random() * n), els = [];
      for (var i = 0; i < n; i++) {
        var e = E('button', 'sg-mate' + (i === open ? ' open' : ' guarded'), '<span class="sg-p">🧒</span>' + (i === open ? '<em>✨ 빈 곳</em>' : '<span class="sg-d">🛡️</span>')); e.type = 'button'; e._open = i === open; mates.appendChild(e); els.push(e);
      }
      ask.textContent = '수비가 없는 친구에게 패스해요.'; ctx.sh.ask(ask.textContent); ctx.target({ get: function () { return els[open]; } });
      return new Promise(function (res) {
        els.forEach(function (e) {
          e.onclick = function () {
            if (e._open) {
              ctx.good(e, false); O.sfx('pop'); ball.style.transform = 'translate(' + (e.offsetLeft + e.offsetWidth / 2 - w.clientWidth / 2) + 'px,' + (-(w.clientHeight * .42)) + 'px)';
              els.forEach(function (x) { x.onclick = null; }); setTimeout(res, 850);
            } else ctx.bad(e);
          };
        });
      });
    }
    function shootRound() {
      mates.innerHTML = ''; var side = Math.random() < .5 ? 0 : 1; keeper.style.left = side ? '70%' : '30%';
      var l = E('button', 'sg-shoot l', '⬅️ 왼쪽으로 슛'), r = E('button', 'sg-shoot r', '오른쪽으로 슛 ➡️'); l.type = r.type = 'button'; mates.appendChild(l); mates.appendChild(r);
      ask.textContent = '골키퍼가 없는 쪽으로 슛해요.'; ctx.sh.ask(ask.textContent);
      var good = side ? l : r; ctx.target({ get: function () { return good; } });
      return new Promise(function (res) {
        [l, r].forEach(function (b) {
          b.onclick = function () {
            if (b === good) { ctx.good(b, false); O.sfx('ok'); goal.classList.add('shoot'); ball.style.transform = 'translate(' + (b === l ? '-26vw' : '26vw') + ',-46vh)'; l.onclick = r.onclick = null; setTimeout(res, 900); }
            else ctx.bad(b);
          };
        });
      });
    }
    return (function loop() {
      if (k >= rounds) { return Promise.resolve(); }
      var p = (o.arg === 'shoot' || (o.arg !== 'pass' && k % 2 === 1)) ? shootRound() : passRound();
      return p.then(function () { k++; draw(); return O.wait(300); }).then(loop);
    })();
  };
})();
