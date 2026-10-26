/* 씽씽별 육상 달리기 게임
   한 번 누르기(화면·스페이스·↑)만으로 즐기는 옆으로 달리기 게임입니다.
   - 차시(OKS_ATHLETICS.course)의 활동 순서가 그대로 '구간'이 됩니다. 구간마다 별 마을 장면 칸이 하나씩 채워져요.
   - 달리면서 별을 모으고, 허들은 점프로 넘어요. 문제 문(게이트)에서는 알맞은 그림을 골라야 문이 열려요.
   - 수준 1·2(그리고 스위치 모드)는 허들 앞에서 기다려 줘요. 수준 3~5는 타이밍으로 넘고, 걸려도 비틀거릴 뿐 끝나지 않아요.
   - 시간 제한·탈락·경쟁 없음. 내 최고 기록과만 비교해요. */
(function (g) {
  'use strict';
  var O = g.OKS, E = O.el, A = './assets/athletics/';
  var FAST = /[?&]dev=fast/.test(location.search);
  var BEST_KEY = 'oks_athletics_run_best_v1';
  var SPEED = [210, 250, 310, 370, 430], JUMP_T = 0.72, JUMP_H = 100;
  var OUT = { sneakers: '운동화', sandals: '샌들', tshirt: '티셔츠', coat: '두꺼운 겨울 외투', cap: '모자', swimsuit: '수영복' };
  function oi(n) { return { img: A + 'outfit_' + n + '.webp', label: OUT[n] }; }
  function pi(n, label) { return { img: A + n + '.webp', label: label }; }

  /* ---------- 활동 이름 ---------- */
  var NAME = { gear: '운동 준비', warmup: '몸 풀기', signal: '출발 신호', run: '달리기', pace: '속도와 멈춤', hurdle: '허들 넘기', relay: '바통 전달', order: '순서 기억', safety: '안전 약속', goal: '내 목표', reflect: '돌아보기', cooldown: '마무리' };

  /* ---------- 문제 문(게이트) 내용 ---------- */
  function quiz(kind, school, lesson) {
    if (kind === 'gear') {
      var d = school === 'high' ? ['햇빛이 있는 운동장에 나가요. 머리에 쓸 것은?', 'cap', ['swimsuit', 'coat']]
        : lesson === 2 ? ['따뜻한 날 가볍게 달려요. 입을 옷은?', 'tshirt', ['coat', 'swimsuit']]
        : ['운동장에서 달려요. 발을 보호할 신발은?', 'sneakers', ['sandals', 'swimsuit']];
      return { q: d[0], right: [oi(d[1])], wrong: d[2].map(oi) };
    }
    if (kind === 'safety') return { q: '친구와 안전하게 달리려면 먼저 어떻게 할까요?', right: [{ emo: '↔️', label: '주변 공간을 확인해요' }], wrong: [{ emo: '🙅', label: '친구를 밀며 출발해요' }, { emo: '⚡', label: '아파도 계속 달려요' }] };
    if (kind === 'order') return { q: '준비 → ? → 도착. 가운데에 알맞은 것은?', right: [pi('runner_run_a', '달리기')], wrong: [{ emo: '😴', label: '앉아서 쉬기' }, { emo: '🏠', label: '집에 가기' }] };
    if (kind === 'goal') return { q: '오늘 나의 목표를 골라요. 모두 좋은 목표예요.', any: true, right: [pi('runner_celebrate', '끝까지 참여하기'), pi('start_signal', '신호 기다리기'), pi('runner_run_a', '내 속도로 달리기')], wrong: [] };
    return { q: '오늘 활동은 어땠나요? 내 마음을 골라요.', any: true, right: [{ emo: '😄', label: '재미있어요' }, { emo: '🙋', label: '도움이 필요했어요' }, { emo: '🔁', label: '다시 해 보고 싶어요' }], wrong: [] };
  }
  var QUIZ = { gear: 1, safety: 1, order: 1, goal: 1, reflect: 1 };
  var MOVES = { warmup: ['팔을 편안하게 움직여요', '발이나 손을 가볍게 움직여요', '숨을 편안하게 쉬어요'], cooldown: ['천천히 걸어요', '팔을 내려놓아요', '숨을 깊게 쉬어요'] };

  function best() { return O.jget(BEST_KEY, {}); }

  /* ---------- 본체 ---------- */
  function mount(opt) {
    var sh = opt.sh, lv = opt.level, board = sh.board, st = opt.stats, ctx = opt.ctx, scene = opt.scene;
    var course = g.OKS_ATHLETICS.course(opt.school, opt.lesson), steps = course.steps.slice();
    var assisted = lv <= 2 || O.settings().scan || O.settings().slow;
    var calm = O.settings().calm || (g.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    var base = SPEED[lv - 1] * (O.settings().slow ? 0.8 : 1);
    var metrics = [], cur = null, coins = 0, bumps = 0, cleared = 0, dead = false, t0 = Date.now();
    board.className = 'oks-board in-scene rn-board';

    /* 무대 */
    var stage = E('div', 'rn-stage');
    stage.innerHTML = '<div class="rn-sky"></div><div class="rn-far"></div><div class="rn-track"><i class="rn-edge top"></i><i class="rn-edge bot"></i></div>' +
      '<div class="rn-world"></div><img class="rn-runner" alt="" draggable="false"><div class="rn-hud"><span class="rn-coins">⭐ <b>0</b></span><span class="rn-now"></span></div>' +
      '<div class="rn-lights" hidden><i class="r on"></i><i class="a"></i><i class="gr"></i></div><div class="rn-banner" aria-live="polite"></div>';
    var dock = E('div', 'rn-dock');
    board.appendChild(stage); board.appendChild(dock);
    var world = stage.querySelector('.rn-world'), runner = stage.querySelector('.rn-runner'), track = stage.querySelector('.rn-track'), far = stage.querySelector('.rn-far'),
      sky = stage.querySelector('.rn-sky'), banner = stage.querySelector('.rn-banner'), lights = stage.querySelector('.rn-lights'),
      coinEl = stage.querySelector('.rn-coins b'), nowEl = stage.querySelector('.rn-now');
    sky.style.backgroundImage = 'url(' + A + 'athletics_bg_main.webp)';
    far.innerHTML = '<span style="left:8%">☁️</span><span style="left:46%">🌳</span><span style="left:78%">☁️</span>';

    /* 상태 */
    var pos = 0, mode = 'idle', hold = false, jt = -1, jy = 0, stumble = 0, zoneMul = 1, objs = [], segEnd = 0, segDone = null, onMain = null, onTick = null,
      pose = '', stepAcc = 0, flip = false, last = 0, raf = 0, timers = [], mainBtn = null, stopTapped = false;

    function later(fn, ms) { var h = setTimeout(function () { if (!dead) fn(); }, ms); timers.push(h); return h; }
    function setPose(n) { if (pose !== n) { pose = n; runner.src = A + n + '.webp'; } }
    function say(t, ms) { banner.textContent = t; banner.classList.remove('show'); void banner.offsetWidth; banner.classList.add('show'); if (ms) later(function () { banner.classList.remove('show'); }, ms); }
    function addCoins(n) { coins += n; coinEl.textContent = coins; }
    function W() { return stage.clientWidth || 800; }
    function rx() { return W() * 0.2; }

    /* 하나로 누르는 단추 */
    function setMain(label, fn, cls, disabled) {
      dock.innerHTML = ''; var b = E('button', 'oks-btn rn-main ' + (cls || ''), label); b.type = 'button'; b.disabled = !!disabled; mainBtn = b; onMain = fn;
      b.onclick = function () { if (onMain && !b.disabled) onMain(); }; dock.appendChild(b); return b;
    }
    function glowMain() { if (mainBtn) ctx.target({ get: function () { return mainBtn; } }); }
    function press() { if (onMain && mainBtn && !mainBtn.disabled && !dead) onMain(); }
    function onKey(e) {
      if (O.settings().scan || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || document.querySelector('.oks-overlay')) return;
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'Enter') { if (e.target.tagName === 'BUTTON' && e.key !== 'ArrowUp') return; e.preventDefault(); if (!e.repeat) press(); }
    }
    document.addEventListener('keydown', onKey);
    stage.addEventListener('pointerdown', function (e) { if (e.target.closest('button')) return; press(); });
    function stop() { dead = true; cancelAnimationFrame(raf); timers.forEach(clearTimeout); document.removeEventListener('keydown', onKey); }
    addEventListener('pagehide', stop, { once: true });

    /* 물체 */
    function obj(type, x, o) {
      o = o || {}; var el = E('div', 'rn-o ' + type + (o.cls ? ' ' + o.cls : ''), o.html || ''); el.style.setProperty('--y', (o.y || 0) + 'px');
      world.appendChild(el); var ob = { type: type, x: x, el: el, y: o.y || 0, done: false, safe: false }; objs.push(ob); return ob;
    }
    function clearObjs() { objs.forEach(function (o) { o.el.remove(); }); objs = []; }

    /* 점프 */
    function jump() { if (jt >= 0) return; jt = 0; O.sfx('pop'); if (mainBtn) mainBtn.classList.add('press'); later(function () { if (mainBtn) mainBtn.classList.remove('press'); }, 160); }

    /* 프레임 */
    function frame(t) {
      if (dead) return; raf = requestAnimationFrame(frame);
      var dt = Math.min(0.05, (t - last) / 1000 || 0); last = t; if (document.hidden) return; for (var k = 0; k < (FAST ? 4 : 1); k++) update(dt);
    }
    function update(dt) {
      var w = W(), X = rx();
      if (jt >= 0) { jt += dt * (O.settings().slow ? 0.8 : 1); var u = jt / JUMP_T; if (u >= 1) { jt = -1; jy = 0; } else jy = 4 * JUMP_H * u * (1 - u); }
      stumble = Math.max(0, stumble - dt);
      var sp = 0;
      if (mode === 'run' && !hold) sp = base * zoneMul * (stumble > 0 ? 0.35 : 1);
      pos += sp * dt;
      track.style.backgroundPositionX = (-pos) + 'px'; far.style.transform = 'translateX(' + (-(pos * 0.12) % w) + 'px)';
      /* 달리는 자세 */
      if (mode === 'run' && sp > 0 && jt < 0) { stepAcc += dt * (sp / base) * 7; if (stepAcc >= 1) { stepAcc = 0; flip = !flip; } setPose(stumble > 0 ? 'runner_idle' : flip ? 'runner_run_b' : 'runner_run_a'); }
      else if (jt >= 0) setPose('runner_run_a');
      runner.style.transform = 'translate3d(0,' + (-jy) + 'px,0)'; runner.style.left = X + 'px';
      /* 물체 놓기·부딪힘 */
      objs.forEach(function (o) {
        var sx = X + (o.x - pos); o.sx = sx;
        o.el.style.transform = 'translate3d(' + sx + 'px,0,0)';
        if (o.done || mode !== 'run') return;
        if (o.type === 'coin') {
          if (Math.abs(sx - X) < 40 && Math.abs(o.y - jy) < 62) { o.done = true; addCoins(1); O.sfx('coin'); o.el.classList.add('got'); }
        } else if (o.type === 'hurdle') {
          if (assisted && !o.safe && sx - X > 0 && sx - X < 190 && !hold && jt < 0) { hold = true; pending = o; setPose('runner_ready'); say('점프!', 0); glowMain(); }
          if (Math.abs(sx - X) < 30) {
            o.done = true;
            if (o.safe || jy > 62) { cleared++; O.sfx('tick'); o.el.classList.add('ok'); }
            else { bumps++; stumble = 0.8; O.sfx('no'); o.el.classList.add('hit'); runner.classList.remove('bump'); void runner.offsetWidth; runner.classList.add('bump'); say('앗! 점프로 넘어요', 900); }
          }
        } else if (o.type === 'flag' && sx - X < 150 && !hold) {
          hold = true; setPose('runner_idle');
          if (stopTapped) { o.done = true; flagOk(true); } else if (assisted) { pendingFlag = o; glowMain(); say('멈춰요!', 0); } else { o.done = true; flagOk(false); }
        } else if (o.type === 'friend' && sx - X < 170 && !hold) { hold = true; setPose('runner_idle'); pendingFriend = o; setMain('바통 전달!', passBaton, '', false); glowMain(); say('친구에게 바통을 전달해요', 0); }
        else if (o.type === 'ribbon' && sx - X < 10) { o.done = true; o.el.classList.add('cut'); O.sfx('win'); setPose('runner_celebrate'); hold = true; sparkle(); later(function () { segEnd = pos; hold = false; }, 900); }
      });
      if (onTick) onTick(dt);
      if (mode === 'run' && segDone && pos >= segEnd && !hold) { var f = segDone; segDone = null; f(); }
    }
    var pending = null, pendingFlag = null, pendingFriend = null;

    /* 구간 달리기 */
    function runSeg(spec) {
      return new Promise(function (res) {
        clearObjs(); hold = false; pending = pendingFlag = pendingFriend = null; stopTapped = false; zoneMul = 1; var p0 = pos; segEnd = p0 + spec.len; jt = -1; jy = 0;
        (spec.coins || []).forEach(function (c) { obj('coin', p0 + c[0], { y: c[1], html: '⭐' }); });
        (spec.hurdles || []).forEach(function (x) { obj('hurdle', p0 + x, { html: '<i></i><i></i><b></b>' }); });
        if (spec.flag) obj('flag', p0 + spec.flag, { html: '<span>🚩</span><em>멈춤</em>' });
        if (spec.friend) obj('friend', p0 + spec.friend, { html: '<img src="' + A + 'runner_ready.webp" alt="">' });
        if (spec.ribbon) obj('ribbon', p0 + spec.ribbon, { html: '<img src="' + A + 'finish_ribbon.webp" alt="">' });
        if (spec.gate) obj('gate', p0 + spec.gate, { html: '<b>🚧</b><em>문제 문</em>' });
        var zones = spec.zones || [];
        zones.forEach(function (z) { obj('zone', p0 + z.from, { html: '<span>' + z.sign + '</span>', cls: z.cls }); });
        onTick = function () { var m = 1; zones.forEach(function (z) { if (pos >= p0 + z.from && pos < p0 + z.to) m = z.mul; }); if (m !== zoneMul) { zoneMul = m; if (m !== 1) { say(m < 1 ? '🐢 천천히' : '🐇 빠르게', 900); } } };
        mode = 'run';
        /* 허들 앞 대기에서 누르면 점프 */
        setMain(spec.hurdles && spec.hurdles.length ? '점프!' : (spec.flag ? '멈춰요!' : '달려요'), function () {
          if (pending && hold) { pending.safe = true; hold = false; pending = null; ctx.untarget(); jump(); return; }
          if (spec.flag) { if (pendingFlag) { var f = pendingFlag; pendingFlag = null; ctx.untarget(); f.done = true; flagOk(true); } else stopTapped = true; return; }
          jump();
        }, spec.flag ? 'orange' : '');
        if (spec.flag) { /* 멈춤 깃발 구간은 점프 대신 멈춤 단추 */ }
        segDone = function () { mode = 'idle'; onTick = null; res(); };
      });
    }
    function flagOk(good) {
      if (good) { O.sfx('ok'); say('딱 멈췄어요!', 1000); } else { st.mistakes++; O.sfx('no'); say('깃발에서 멈춰요', 1200); }
      later(function () { hold = false; setPose('runner_idle'); }, 700);
    }
    function passBaton() {
      if (!pendingFriend) return; var f = pendingFriend; pendingFriend = null; f.done = true; ctx.untarget(); O.sfx('ok'); mainBtn.disabled = true;
      var b = E('span', 'rn-baton', '🥖'); stage.appendChild(b); later(function () { b.remove(); }, 900);
      f.el.classList.add('go'); O.praise('바통 전달 성공!'); later(function () { hold = false; }, 800);
    }
    function sparkle() {
      for (var i = 0; i < 14; i++) { var s = E('i', 'rn-spark'); s.style.left = (rx() + 20 + Math.random() * 120) + 'px'; s.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px'); s.style.setProperty('--dy', (-80 - Math.random() * 120) + 'px'); s.style.background = ['#ff7a59', '#ffd54f', '#43a047', '#1e88e5', '#ec407a'][i % 5]; stage.appendChild(s); (function (x) { later(function () { x.remove(); }, 1100); })(s); }
    }

    /* 구간 만들기 */
    function specFor(kind, i) {
      var L = 1300 + lv * 160, coinsA = [];
      function line(n, from, gap) { for (var k = 0; k < n; k++) coinsA.push([from + k * gap, 0]); }
      if (kind === 'hurdle') {
        var n = [2, 3, 4, 5, 6][lv - 1], hs = [], cs = [], gap = 400 - lv * 8;
        for (var k = 0; k < n; k++) { var x = 520 + k * gap; hs.push(x); cs.push([x, 96 + (lv > 3 ? 0 : 0)]); }
        line(3, 260, 80);
        return { len: 520 + n * gap + 360, hurdles: hs, coins: coinsA.concat(cs) };
      }
      if (kind === 'pace') {
        line(4, 800, 110);
        return { len: 2300, zones: [{ from: 380, to: 1000, mul: 0.55, sign: '🐢', cls: 'slow' }, { from: 1100, to: 1700, mul: 1.5, sign: '🐇', cls: 'fast' }], coins: coinsA, flag: 2150 };
      }
      if (kind === 'relay') { line(4, 300, 120); return { len: 1500, coins: coinsA, friend: 1480 }; }
      var hs2 = lv >= 5 ? [820, 1250] : lv >= 3 ? [900] : [];
      line(5, 240, 130); hs2.forEach(function (x) { coinsA.push([x, 96]); });
      return { len: L, coins: coinsA, hurdles: hs2 };
    }

    /* 출발 신호 */
    function signalSeg() {
      return new Promise(function (res) {
        mode = 'idle'; hold = true; clearObjs(); setPose('runner_ready'); lights.hidden = false; var green = false, started = false, t1 = 0;
        lights.querySelector('.r').classList.add('on'); lights.querySelector('.a').classList.remove('on'); lights.querySelector('.gr').classList.remove('on');
        say('준비', 0);
        var b = setMain('신호를 기다려요', function () {
          if (started) return;
          if (!green) { cur.early = (cur.early || 0) + 1; ctx.bad(); say('아직! 초록불을 기다려요', 1200); return; }
          started = true; cur.reactionMs = Math.round(performance.now() - t1); ctx.untarget(); O.sfx('pop'); lights.hidden = true; say('출발!', 900);
          hold = false; mode = 'run'; res();
        }, 'orange', assisted);
        later(function () { lights.querySelector('.r').classList.remove('on'); lights.querySelector('.a').classList.add('on'); say('곧 출발해요', 0); }, O.settings().slow ? 1600 : 1000);
        later(function () { lights.querySelector('.a').classList.remove('on'); lights.querySelector('.gr').classList.add('on'); green = true; t1 = performance.now(); b.disabled = false; b.textContent = '출발!'; say('출발!', 0); O.sfx('coin'); glowMain(); }, O.settings().slow ? 3200 : 2100);
      });
    }

    /* 몸 풀기·마무리 */
    function moveSeg(kind) {
      return new Promise(function (res) {
        mode = 'idle'; hold = true; clearObjs(); var list = MOVES[kind], n = 0; setPose('runner_idle'); say(list[0], 0); sh.ask(list[0]);
        function nextMove() {
          setMain('해 봤어요', function () {
            n++; O.sfx('tick'); setPose(n % 2 ? 'runner_ready' : 'runner_idle'); recordOk();
            if (n >= list.length) { ctx.untarget(); O.praise('잘했어요!'); mainBtn.disabled = true; later(res, 700); return; }
            say(list[n], 0); sh.ask(list[n]); glowMain();
          }, ''); glowMain();
        }
        nextMove();
      });
    }
    function recordOk() { g.OKS_ATHLETICS.recordAttempt(cur, true); }

    /* 문제 문 */
    function gateSeg(kind) {
      var data = quiz(kind, opt.school, opt.lesson);
      return runSeg({ len: 640, gate: 760, coins: [[200, 0], [320, 0], [440, 0]] }).then(function () {
        hold = true; setPose('runner_idle'); mode = 'idle'; sh.ask(data.q); O.say(data.q, { noRepeat: true }); say('문제 문!', 900);
        var nOpt = lv === 1 ? 1 : lv === 2 ? 2 : 3, right = O.shuffle(data.right.slice()), cards, opts;
        if (data.any) opts = right.slice(0, Math.max(nOpt, 2)); else opts = [right[0]].concat(O.shuffle(data.wrong.slice()).slice(0, nOpt - 1));
        opts = O.shuffle(opts); cards = opts.map(function (x) { return ctx.card(x, { big: opts.length <= 2 }); });
        dock.innerHTML = ''; mainBtn = null; onMain = null; var host = E('div', 'rn-gate'); host.appendChild(ctx.grid(cards, Math.min(3, cards.length))); dock.appendChild(host);
        var ok = function (c) { return data.any || c._item.label === data.right[0].label; };
        ctx.target({ get: function () { return cards.filter(ok); } });
        return new Promise(function (res) {
          cards.forEach(function (c) {
            c.onclick = function () {
              if (c._done) return; var yes = ok(c); g.OKS_ATHLETICS.recordAttempt(cur, yes);
              if (!yes) { ctx.bad(c); return; }
              c._done = true; ctx.good(c); O.say(c._item.label, { noRepeat: true }); cards.forEach(function (x) { x.onclick = null; });
              objs.forEach(function (o) { if (o.type === 'gate') o.el.classList.add('open'); }); later(function () { hold = false; mode = 'run'; res(); }, 900);
            };
          });
        });
      }).then(function () { return runSegShort(); });
    }
    function runSegShort() { return runSeg({ len: 360, coins: [[120, 0], [220, 0]] }); }

    /* 결승선 */
    function finishSeg() {
      return runSeg({ len: 1200, ribbon: 760, coins: [[240, 0], [360, 0], [480, 0]] }).then(function () { return null; });
    }
    function afterFinish() {
      return new Promise(function (res) { mode = 'idle'; later(res, 1300); });
    }

    /* 구간 순서 실행 */
    function playStep(i) {
      if (i >= steps.length) return Promise.resolve();
      var kind = steps[i]; cur = g.OKS_ATHLETICS.newStep(kind, lv); cur.t0 = Date.now(); ctx.newStep(); dock.innerHTML = ''; nowEl.textContent = (i + 1) + '/' + steps.length + ' ' + NAME[kind];
      sh.setRounds(steps.length, i); if (scene) { scene.now(i); if (i === steps.length - 1) scene.bonus(); } lights.hidden = true; ctx.untarget();
      var m0 = st.mistakes, p;
      if (kind === 'signal') { sh.ask('초록불이 켜지면 눌러서 출발해요!'); p = signalSeg(); }
      else if (kind === 'warmup' || kind === 'cooldown') p = moveSeg(kind);
      else if (QUIZ[kind]) { sh.ask('달리다 보면 문제 문이 나와요!'); p = gateSeg(kind); }
      else {
        var tip = kind === 'hurdle' ? '허들 앞에서 점프! 별도 모아요.' : kind === 'pace' ? '🐢는 천천히, 🐇는 빠르게. 깃발에서는 멈춰요!' : kind === 'relay' ? '친구에게 바통을 전달해요.' : '달리며 별을 모아요!';
        sh.ask(tip); O.say(tip, { noRepeat: true });
        /* 신호가 따로 없는 구간(run 등)이 처음이면 바로 달려요 */
        p = runSeg(specFor(kind, i));
      }
      return p.then(function () {
        cur.completed = true; cur.seconds = Math.round((Date.now() - cur.t0) / 100) / 10; delete cur.t0; metrics.push(cur); O.clearPrompt();
        if (kind === 'warmup' || kind === 'cooldown' || kind === 'signal') { /* 뛰기 전·후 동작은 달리기 이어짐 */ }
        if (scene) scene.advance(i, st.mistakes === m0);
        return O.wait(450).then(function () { return playStep(i + 1); });
      });
    }

    /* 시작 */
    last = performance.now(); raf = requestAnimationFrame(frame); setPose('runner_ready'); update(0);
    /* 달리기 구간이 신호 없이 시작하면 달리는 모션으로 */
    function begin() {
      return playStep(0).then(function () { return finishSeg(); }).then(afterFinish).then(function () {
        stop(); var sec = Math.round((Date.now() - t0) / 100) / 10, key = 'athletics-' + opt.school + '-' + opt.lesson + '-' + lv, B = best(), prev = B[key];
        var newBest = !prev || sec < prev; if (newBest) { B[key] = sec; O.jset(BEST_KEY, B); }
        var miss = st.mistakes + Math.floor(bumps / 2), place = miss <= 1 ? 1 : miss <= 3 ? 2 : 3;
        return { sec: sec, prev: prev, newBest: newBest, coins: coins, bumps: bumps, cleared: cleared, place: place, metrics: metrics, mistakes: st.mistakes + Math.floor(bumps / 2) };
      });
    }
    return { begin: begin, stop: stop };
  }

  g.OKS_RUN = { mount: mount, NAME: NAME, best: best };
})(window);
