/* 씽씽별 육상: 차시별 수업 목표를 준비·출발·달리기·협동 행동으로 연결합니다. */
(function (global) {
  'use strict';
  var O = global.OKS, E = O.el, ASSET = './assets/athletics/';
  var SESSION_KEY = 'oks_athletics_sessions_v2';
  var COURSES = {
    elem: [
      { title: '달리기 출발과 도착', goal: '출발 신호를 기다리고 결승선까지 이동해요.', steps: ['signal', 'run', 'order'], transfer: '교사의 신호에 맞춰 출발하고 도착 지점에서 멈춰 봐요.' },
      { title: '달리기 준비와 안전', goal: '운동화와 준비운동을 확인하고 안전하게 달려요.', steps: ['gear', 'warmup', 'signal', 'run', 'safety'], transfer: '실제 운동화와 주변 공간을 확인하고, 할 수 있는 준비운동을 해 봐요.' },
      { title: '나의 달리기 기록', goal: '같은 방법으로 두 번 출발해 보고 내 화면 반응을 살펴봐요.', steps: ['signal', 'run', 'signal', 'run', 'reflect'], transfer: '같은 신호에 두 번 반응해 보고, 편안하게 참여할 수 있는 방법을 찾아요.' }
    ],
    middle: [
      { title: '달리기와 기록', goal: '출발 신호와 달리기 순서를 익히고 화면 활동 기록을 확인해요.', steps: ['gear', 'signal', 'run', 'hurdle', 'reflect'], transfer: '출발·이동·도착을 실제 활동으로 이어 보고 필요한 도움을 관찰해요.' },
      { title: '속도와 거리 조절', goal: '천천히·빠르게 신호에 맞춰 움직이고 멈춤 신호에 반응해요.', steps: ['goal', 'signal', 'pace', 'hurdle', 'safety'], transfer: '짧은 거리를 자신의 방식으로 이동하며 천천히·멈춤 신호를 연습해요.' },
      { title: '간이 이어달리기', goal: '내 구간을 이동한 뒤 친구에게 차례를 넘겨요.', steps: ['order', 'signal', 'relay', 'relay', 'reflect'], transfer: '친구와 번갈아 물건을 전달하거나 바통을 주고받아 봐요.' }
    ],
    high: [
      { title: '나의 육상 활동 계획', goal: '내 목표와 참여 방법을 고르고 계획한 활동을 마쳐요.', steps: ['goal', 'gear', 'signal', 'run', 'reflect'], transfer: '선택한 목표에 맞는 실제 활동을 교사와 계획하고 참여해요.' },
      { title: '기록 비교하기', goal: '동일한 조작 방법으로 두 번 참여하고 나의 화면 기록을 비교해요.', steps: ['signal', 'pace', 'signal', 'pace', 'reflect'], transfer: '화면 반응 기록과 실제 이동 기록을 구분해서 살펴봐요.' },
      { title: '안전한 운동 계획', goal: '몸과 공간을 살피고 준비·활동·마무리 순서로 참여해요.', steps: ['safety', 'warmup', 'signal', 'hurdle', 'cooldown'], transfer: '몸 상태·공간을 확인하고 나에게 맞는 준비와 마무리 활동을 해 봐요.' }
    ]
  };
  var TITLES = { gear: '운동 준비', warmup: '몸 풀기', signal: '신호 기다리기', run: '결승선까지', pace: '속도와 멈춤', hurdle: '장애물 넘기', relay: '친구에게 차례', order: '순서 기억하기', safety: '안전 약속', goal: '내 목표 고르기', reflect: '내 활동 돌아보기', cooldown: '마무리하기' };
  function course(school, no) { return (COURSES[school] || COURSES.elem)[Math.max(0, Math.min(2, no - 1))]; }
  function img(name, cls, alt) { var x = E('img', cls); x.src = ASSET + name + '.webp'; x.alt = alt || ''; x.draggable = false; return x; }
  function button(label, fn, cls) { var b = E('button', 'oks-btn ' + (cls || '')); b.type = 'button'; b.textContent = label; if (fn) b.onclick = fn; return b; }
  function sessions() { return O.jget(SESSION_KEY, []); }
  function newStep(kind, lv) { return { kind: kind, level: lv, attempts: 0, errors: 0, firstCorrect: null, completed: false, glow: 0, hand: 0, asked: 0 }; }
  function recordAttempt(step, correct) { step.attempts++; if (step.firstCorrect === null) step.firstCorrect = correct; if (!correct) step.errors++; }
  function csv(rows) {
    var head = ['날짜', '학교급', '차시', '수준', '조작', '과제', '첫반응정답', '시도', '오류', '반짝임', '시범', '도움요청', '완료', '신호반응ms', '도움정도', '실제활동관찰', '경기방식', '화면경기초', '리듬성공', '최대연속', '부스트', '허들성공', '허들재도전', '바통전달'];
    function cell(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }
    return '\uFEFF' + [head].concat(rows.flatMap(function (r) { return r.steps.map(function (s) { return [r.at, r.school, r.topic, r.level, r.input, TITLES[s.kind], s.firstCorrect, s.attempts, s.errors, s.glow, s.hand, s.asked, s.completed, s.reactionMs, r.independence, r.transferObservation || '미관찰', (s.race||{}).mode, (s.race||{}).seconds, (s.race||{}).rhythm, (s.race||{}).bestCombo, (s.race||{}).boosts, (s.race||{}).cleared, (s.race||{}).missed, (s.race||{}).baton]; }); })).map(function (r) { return r.map(cell).join(','); }).join('\n');
  }
  function mount(opt) {
    var sh = opt.sh, lv = opt.level, plan = course(opt.school, opt.lesson), board = sh.board;
    var prefs = O.jget('oks_athletics_input_v2', {}), single = !!O.settings().scan || prefs.single !== false || lv <= 2;
    var slow = O.settings().slow, calm = O.settings().calm || matchMedia('(prefers-reduced-motion: reduce)').matches;
    var raceController = null, racePrefs = O.jget('oks_athletics_race_preferences_v1', {}), assisted = lv <= 2 || O.settings().scan || racePrefs.assisted === true, rivals = racePrefs.rivals === true;
    var st, ctx, entry, current, stepNo = 0, generation = 0, handles = [], closed = false, paused = false, metrics = [], foot = 0;
    document.body.classList.add('athletics-lesson');
    if (calm) document.body.classList.add('calm');
    sh.top.querySelectorAll('button').forEach(function (b) { if (b.title && !b.textContent.trim()) b.setAttribute('aria-label', b.title); });
    sh.levelBtn.onclick = function () {
      var ov=E('div','oks-overlay'),box=E('div','oks-finish','<h2>수준 고르기</h2><p>수준을 바꾸면 처음부터 시작해요.</p>');
      ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');ov.setAttribute('aria-label','수준 고르기');
      O.LEVELS.forEach(function(L){var a=E('a','oks-btn blue',L.n+' '+L.name);a.href='?festival=summer&sport=athletics&school='+opt.school+'&lesson='+opt.lesson+'&level='+L.n+'&play=1';box.appendChild(a);});
      var close=button('닫기',function(){ov.remove();sh.levelBtn.focus();});box.appendChild(close);ov.appendChild(box);document.body.appendChild(ov);close.focus();
    };
    function later(fn, ms) { var gen = generation; var h = setTimeout(function () { if (gen === generation && !closed) fn(); }, ms); handles.push(h); return h; }
    function cancel() { if(raceController){raceController.stop();raceController=null;} generation++; handles.forEach(clearTimeout); handles = []; O.clearPrompt(); }
    function clear() { cancel(); board.innerHTML = ''; board.className = 'oks-board al-board'; }
    function focus(el) { later(function () { if (el && el.isConnected && !O.settings().scan) el.focus({ preventScroll: true }); }, 0); }
    function target(el) { ctx.target({ get: typeof el === 'function' ? el : function () { return el; } }); }
    function instruction(text) { sh.ask(text); }
    function attempt(correct) { recordAttempt(current, correct); if (!correct) { st.mistakes++; O.sfx('no'); sh.mood('soft'); O.toast('천천히 다시 해 봐요'); if (lv <= 3) O.showNow('glow'); } }
    function done(text, delay) {
      if (current.completed) return;
      current.completed = true; current.glow = st.glow - current.g0; current.hand = st.hand - current.h0; current.asked = st.asked - current.a0;
      current.seconds = Math.round((Date.now() - current.t0) / 100) / 10;
      delete current.g0; delete current.h0; delete current.a0; delete current.t0;
      metrics.push(current); O.clearPrompt(); board.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
      O.sfx('ok'); O.praise(text || '끝까지 해냈어요!'); stepNo++; later(next, delay == null ? 850 : delay);
    }
    function header(kind) {
      var h = E('div', 'al-mission'); h.innerHTML = '<span>미션 ' + (stepNo + 1) + ' / ' + plan.steps.length + '</span><b>' + TITLES[kind] + '</b>';
      var help=button('도와줘',function(){O.help();},'blue');h.appendChild(help);
      var pause = button('쉬기', function () { paused = true; st.mistakes-=current.errors;st.glow=current.g0;st.hand=current.h0;st.asked=current.a0;O.clearPrompt(); O.hush(); cancel();
        var ov = E('div', 'oks-overlay al-pause'); ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', '잠깐 쉬기');
        var box = E('div', 'oks-finish', '<h2>잠깐 쉬어요</h2><p>준비되면 같은 미션을 다시 시작해요.<br>멈춘 미션은 기록에 넣지 않아요.</p>');
        var resume = button('이어서 하기', function () { paused = false; ov.remove(); next(); }); box.appendChild(resume); ov.appendChild(box); document.body.appendChild(ov); resume.focus();
      }, 'blue'); h.appendChild(pause); board.appendChild(h);
      var p = E('div', 'al-checkpoints'); p.setAttribute('aria-label', '미션 진행');
      plan.steps.forEach(function (k, i) { var t = E('span', i < stepNo ? 'done' : i === stepNo ? 'now' : '', '<b>' + (i < stepNo ? '✓' : i + 1) + '</b><small>' + TITLES[k] + '</small>'); if (i === stepNo) t.setAttribute('aria-current', 'step'); p.appendChild(t); }); board.appendChild(p);
    }
    function scene(pose) {
      var stage = E('div', 'al-track'); stage.setAttribute('aria-label', '육상 경기장');
      var lane = E('div', 'al-lane'); var start = E('span', 'al-line al-start', '출발'); var finish = E('span', 'al-line al-end', '도착');
      var ribbon = img('finish_ribbon', 'al-ribbon'); var runner = E('div', 'al-runner'); runner.appendChild(img(pose || 'runner_ready', '', '달리기 선수'));
      stage.appendChild(lane); stage.appendChild(start); stage.appendChild(finish); stage.appendChild(ribbon); stage.appendChild(runner);
      var status = E('div', 'al-status', '준비해요'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); stage.appendChild(status);
      var controls = E('div', 'al-controls'); board.appendChild(stage); board.appendChild(controls);
      return { stage: stage, runner: runner, controls: controls, status: status, pose: function (name) { runner.firstChild.src = ASSET + name + '.webp'; }, move: function (n) { runner.style.left = (7 + n * 67) + '%'; }, message: function (t) { status.textContent = t; } };
    }
    function choices(question, items, right, completeText) {
      instruction(question); var host = E('div', 'al-choice-area'), cards = items.map(function (x) { return ctx.card(x, { big: items.length <= 2 }); }); host.appendChild(ctx.grid(O.shuffle(cards), Math.min(3, cards.length))); board.appendChild(host);
      target(function () { return cards.filter(function (c) { return right(c._item); }); });
      cards.forEach(function (c) { c.onclick = function () { if (current.completed) return; var yes = right(c._item); attempt(yes); if (yes) { c.classList.add('good'); current.answer = c._item.label; done(completeText || '잘 골랐어요!'); } }; }); focus(cards[0]);
    }
    function gear() {
      var data = [
        ['따뜻한 날 운동장에서 달려요. 발을 보호할 신발은?', 'outfit_sneakers', '운동화', 'outfit_sandals', '샌들'],
        ['따뜻한 날 가볍게 달려요. 입을 옷을 골라요.', 'outfit_tshirt', '티셔츠', 'outfit_coat', '두꺼운 겨울 외투'],
        ['햇빛이 있는 운동장에 나가요. 머리에 쓸 것은?', 'outfit_cap', '모자', 'outfit_swimsuit', '수영복']
      ][opt.school === 'high' ? 2 : opt.lesson === 2 ? 1 : 0];
      var items = [{ img: ASSET + data[1] + '.webp', label: data[2], correct: true }];
      if (lv > 1) items.push({ img: ASSET + data[3] + '.webp', label: data[4] });
      choices(data[0], items, function (x) { return !!x.correct; });
    }
    function warmup() {
      var s = scene('runner_idle'); instruction('화면 선수와 함께 몸을 풀어요. 앉아서 할 수 있는 동작도 좋아요.');
      var steps = ['팔을 편안하게 움직여요', '발이나 손을 가볍게 움직여요', '숨을 편안하게 쉬어요'], n = 0;
      s.message(steps[0]); var b = button('해 봤어요 · 다음 동작', function () { if (current.completed) return; attempt(true); n++; if (n === steps.length) done('준비 완료!'); else { s.message(steps[n]); instruction(steps[n]); } });
      var skip = button('내가 할 수 있는 동작으로 참여', function () { current.adaptedMovement = true; attempt(true); done('나의 방법으로 준비했어요!'); }, 'blue'); s.controls.appendChild(b); s.controls.appendChild(skip); target(b); focus(b);
    }
    function signal() {
      var s = scene(), green = false, started = false, readyAt = null;
      instruction('준비 신호에는 기다려요. “출발!” 글자와 소리가 나오면 눌러요.');
      var lights = E('div', 'al-lights'); lights.setAttribute('aria-hidden', 'true'); lights.innerHTML = '<i class="red on"></i><i class="amber"></i><i class="green"></i>'; s.stage.appendChild(lights);
      s.message('준비 · 기다려요');
      var b = button('신호를 기다려요', function () {
        if (current.completed || started) return;
        if (!green) { current.earlyPresses = (current.earlyPresses || 0) + 1; attempt(false); s.message('아직 준비 신호예요 · 기다려요'); return; }
        started = true; attempt(true); current.reactionMs = Math.round(performance.now() - readyAt); b.disabled = true;
        s.pose('runner_run_a'); s.move(1); s.message('출발했어요!'); O.sfx('pop'); later(function () { s.pose('runner_celebrate'); done('신호를 보고 출발했어요!'); }, calm ? 150 : 650);
      });
      // 낮은 수준·스캔은 준비 중 선택을 막아 정확한 출발 반응을 도와줍니다.
      b.disabled = lv <= 2 || O.settings().scan; s.controls.appendChild(b); focus(b);
      later(function () { lights.querySelector('.red').classList.remove('on'); lights.querySelector('.amber').classList.add('on'); s.message('준비 · 곧 출발해요'); }, slow ? 1500 : 900);
      later(function () { lights.querySelector('.amber').classList.remove('on'); lights.querySelector('.green').classList.add('on'); green = true; readyAt = performance.now(); s.message('출발!'); b.disabled = false; b.textContent = '출발!'; O.sfx('bell'); instruction('출발!'); target(b); focus(b); }, (slow ? 2500 : 1600) + Math.random() * 400);
    }
    function run(kind) {
      raceController = OKS_ATHLETICS_RACE.mount({board:board,kind:kind,level:lv,single:single,assisted:assisted,calm:calm,slow:slow,rivals:rivals,later:later,instruction:instruction,attempt:attempt,target:target,complete:function(result){current.race=result;done('멋지게 완주했어요!');}});
    }
    function hurdle() { run('hurdle'); }
    function order() {
      var seq = [{ img: ASSET + 'runner_ready.webp', label: '출발 준비' }, { img: ASSET + 'runner_run_a.webp', label: '달리기' }, { img: ASSET + 'runner_celebrate.webp', label: '도착' }], pos = 0;
      instruction('준비 → 달리기 → 도착 순서로 눌러요.'); var host = E('div', 'al-choice-area'), cards = seq.map(function (x) { return ctx.card(x); }); host.appendChild(ctx.grid(O.shuffle(cards), lv === 1 ? 1 : 3)); board.appendChild(host);
      if (lv === 1) cards.forEach(function (c, i) { c.hidden = i !== 0; }); target(function () { return cards[pos]; });
      cards.forEach(function (c, i) { c.onclick = function () { if (current.completed || c._done) return; var yes = i === pos; attempt(yes); if (!yes) return; c._done = true; c.disabled = true; c.classList.add('good'); pos++; O.sfx('tick'); if (pos === seq.length) done('순서대로 했어요!'); else { if (lv === 1) { c.hidden = true; cards[pos].hidden = false; } target(function () { return cards[pos]; }); instruction(seq[pos].label + '를 골라요'); } }; }); focus(cards[0]);
    }
    function safety() {
      var options = lv === 1 ? [{ emo: '↔️', label: '주변 공간을 확인해요', correct: true }] : [{ emo: '↔️', label: '주변 공간을 확인해요', correct: true }, { emo: '🙅', label: '친구를 밀며 출발해요' }];
      if (lv >= 4) options.push({ emo: '⚡', label: '몸이 불편해도 계속 달려요' });
      choices('친구와 안전하게 활동하려면 먼저 어떻게 할까요?', options, function (x) { return x.correct; }, '안전 약속을 기억했어요!');
    }
    function goal() {
      choices('오늘 내가 해 보고 싶은 목표를 골라요. 모두 좋은 목표예요.', [{ img: ASSET + 'runner_celebrate.webp', label: '끝까지 참여하기' }, { img: ASSET + 'start_signal.webp', label: '신호 기다리기' }, { img: ASSET + 'runner_ready.webp', label: '친구와 번갈아 하기' }].slice(0, lv === 1 ? 1 : 3), function () { return true; }, '내 목표를 정했어요!');
    }
    function reflect(cooldown) {
      var s = scene('runner_celebrate'), signals = metrics.filter(function (m) { return m.kind === 'signal'; });
      instruction(cooldown ? '활동을 마쳤어요. 숨을 고르고 몸의 느낌을 살펴봐요.' : '내가 참여한 활동을 돌아봐요. 어떤 느낌이었나요?');
      s.message(cooldown ? '천천히 숨 쉬고 마무리해요' : '내 속도로 끝까지 해냈어요');
      if (signals.length) { var rec = E('p', 'al-record-note'); rec.textContent = signals.map(function (m, i) { return (i + 1) + '번째 신호 ' + (m.reactionMs / 1000).toFixed(2) + '초'; }).join(' · ') + ' (화면 버튼 반응)'; board.appendChild(rec); }
      ['재미있어요', '도움이 필요했어요', '다시 해 보고 싶어요'].forEach(function (x) { s.controls.appendChild(button(x, function () { if (current.completed) return; attempt(true); current.feeling = x; done('내 마음을 표현했어요!'); }, 'blue')); }); target(s.controls.querySelector('button')); focus(s.controls.querySelector('button'));
    }
    function next() {
      if (closed || paused) return;
      if (stepNo >= plan.steps.length) return finish();
      clear(); var kind = plan.steps[stepNo]; current = newStep(kind, lv); current.g0 = st.glow; current.h0 = st.hand; current.a0 = st.asked; current.t0 = Date.now(); ctx.newStep(); sh.setRounds(plan.steps.length, stepNo); header(kind);
      ({ gear: gear, warmup: warmup, signal: signal, run: function () { run('run'); }, pace: function () { run('pace'); }, hurdle: hurdle, relay: function () { run('relay'); }, order: order, safety: safety, goal: goal, reflect: reflect, cooldown: function () { reflect(true); } })[kind]();
    }
    function finish() {
      cancel(); sh.setRounds(plan.steps.length, plan.steps.length);
      entry = { at: new Date().toISOString(), lesson: 'sports-athletics-' + opt.school + '-' + opt.lesson, subject: 'physical', school: opt.school, topic: plan.title, level: lv, engine: 'athletics-stadium-v2', rounds: metrics.length, mistakes: st.mistakes, glow: st.glow, hand: st.hand, asked: st.asked, sec: Math.round(metrics.reduce(function(n,m){return n+m.seconds;},0)), input: single ? 'one-button' : 'alternate', steps: metrics, transferObservation: '미관찰' };
      opt.save(3, st.mistakes);
      O.finish({ stats: st, entry: entry, stars: 3, noReward: true, title: '끝까지 참여했어요!', text: plan.title + ' · 미션 ' + metrics.length + '개 완료', buttons: [{ label: '한 번 더', onClick: function () { location.reload(); } }, { label: '육상 목차', color: 'blue', href: '?festival=summer&sport=athletics&school=' + opt.school }] });
      var all = sessions(); all.push(entry); O.jset(SESSION_KEY, all.slice(-200));
      var box = document.querySelector('.oks-overlay:last-child .oks-finish'); box.parentNode.setAttribute('role', 'dialog'); box.parentNode.setAttribute('aria-modal', 'true'); box.parentNode.setAttribute('aria-label', '육상 수업 완료');
      box.querySelectorAll('.oks-help-rec .oks-chip').forEach(function(b){b.addEventListener('click',function(){var list=sessions(),r=list.find(function(x){return x.at===entry.at;});if(r){r.independence=b.textContent;r.teacherSet=true;O.jset(SESSION_KEY,list);}});});
      var panel = E('div', 'al-transfer'); panel.innerHTML = '<b>교실에서 이어 해요</b><p>' + O.esc(plan.transfer) + '</p><small>별은 참여 보상이에요. 실제 운동 기능과 생활 적용은 교사가 관찰해요.</small>';
      var teacher = E('details', 'al-observation', '<summary>선생님 · 실제 활동 관찰</summary>');
      ['미관찰', '지원받아 참여', '독립 참여'].forEach(function (label) { var b = button(label, function () { var list = sessions(), r = list.find(function (x) { return x.at === entry.at; }); if (r) { r.transferObservation = label; O.jset(SESSION_KEY, list); } var logs = O.jget('oks_learning_log_v1', []), l = logs.find(function (x) { return x.at === entry.at; }); if (l) { l.transferObservation = label; O.jset('oks_learning_log_v1', logs); } teacher.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); }); b.setAttribute('aria-pressed', String(label === '미관찰')); teacher.appendChild(b); }); panel.appendChild(teacher); panel.appendChild(button('육상 수업 기록 CSV', exportRecords, 'blue')); box.appendChild(panel);
      var note = box.querySelector('.note'); note.textContent = '화면 활동 기록 · 시도 ' + metrics.reduce(function (n, m) { return n + m.attempts; }, 0) + '회 · 재시도 ' + st.mistakes + '회 · 도움 요청 ' + st.asked + '회';
      var first = box.querySelector('button'); if (first) first.focus();
    }
    function exportRecords() { var blob = new Blob([csv(sessions())], { type: 'text/csv;charset=utf-8' }), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = '씽씽별_육상_수업기록.csv'; a.click(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000); }
    function intro() {
      clear(); sh.ask(plan.goal, { silent: true }); board.classList.add('al-intro');
      var hero = E('div', 'al-intro-hero'); hero.appendChild(img('runner_idle', 'al-intro-runner')); hero.innerHTML += '<div><span class="al-tag">육상 모험 · 수준 ' + lv + '</span><h1>' + O.esc(plan.title) + '</h1><p>' + O.esc(plan.goal) + '</p></div>'; board.appendChild(hero);
      var list = E('div', 'al-route'); plan.steps.forEach(function (s, i) { list.appendChild(E('span', '', '<b>' + (i + 1) + '</b>' + TITLES[s])); }); board.appendChild(list);
      var settings = E('div', 'al-input');
      var one = button('큰 버튼 하나로', function () { single = true; storeInput(); }, 'blue'), two = button('왼발·오른발 번갈아', function () { single = false; storeInput(); }, 'blue'); two.disabled = lv <= 2 || O.settings().scan;
      function storeInput() { O.jset('oks_athletics_input_v2', { single: single }); one.setAttribute('aria-pressed', String(single)); two.setAttribute('aria-pressed', String(!single)); }
      storeInput(); settings.appendChild(one); settings.appendChild(two); board.appendChild(settings);
      var raceOptions=E('div','ar-options');
      var assist=button('기다려 주는 경기',function(){assisted=true;saveRacePrefs();},'blue'),timing=button('타이밍 도전',function(){assisted=false;saveRacePrefs();},'blue');
      timing.disabled=lv<=2||O.settings().scan;
      var together=button('친구와 함께 완주',function(){rivals=false;saveRacePrefs();},'blue'),compete=button('친구와 순위 도전',function(){rivals=true;saveRacePrefs();},'blue');
      function saveRacePrefs(){O.jset('oks_athletics_race_preferences_v1',{assisted:assisted,rivals:rivals});assist.setAttribute('aria-pressed',String(assisted));timing.setAttribute('aria-pressed',String(!assisted));together.setAttribute('aria-pressed',String(!rivals));compete.setAttribute('aria-pressed',String(rivals));}
      saveRacePrefs();raceOptions.appendChild(E('p','','경기 방식'));[assist,timing,together,compete].forEach(function(b){raceOptions.appendChild(b);});board.appendChild(raceOptions);
      var go = button('육상 모험 시작', function () { O.unlock(); clear(); st = O.newStats(); ctx = { sh: sh, board: board, level: lv, stats: st, cfg: {}, lesson: { topic: plan.title } }; O.kit(ctx); stepNo = 0; metrics = []; next(); }, 'orange'); var actions = E('div', 'al-intro-actions'); actions.appendChild(go);
      var ws = E('a', 'oks-btn blue', '학습지 인쇄'); ws.href = '../worksheet/?id=sp-athletics-' + opt.school + '-' + opt.lesson + '&level=' + lv; actions.appendChild(ws); board.appendChild(actions);
      var info = E('details', 'al-teacher-guide', '<summary>선생님 · 활동 방법과 기록</summary><p>시간 제한과 탈락은 없습니다. 터치·마우스·키보드로 참여할 수 있어요. 스위치 모드는 공통 설정에서 켜세요.</p><p>출발 반응은 화면 버튼을 누른 시간입니다. 실제 달리기 속도나 운동 능력으로 해석하지 않아요. 기록은 이 기기의 참여가 함께 저장됩니다.</p>');
      info.appendChild(button('이 기기의 육상 기록 CSV', exportRecords, 'blue')); board.appendChild(info); targetIntro(go); focus(go);
    }
    function targetIntro(go) { O.target({ get: function () { return go; } }, lv); }
    var keyHandler = function (e) {
      var overlays=document.querySelectorAll('.oks-overlay'),overlay=overlays[overlays.length-1];
      if(overlay){if(e.key==='Tab'){var els=Array.from(overlay.querySelectorAll('button,a[href],summary')).filter(function(x){return !x.disabled&&x.getBoundingClientRect().width>0;});if(els.length){var first=els[0],last=els[els.length-1];if(e.shiftKey&&(document.activeElement===first||!overlay.contains(document.activeElement))){e.preventDefault();last.focus();}else if(!e.shiftKey&&(document.activeElement===last||!overlay.contains(document.activeElement))){e.preventDefault();first.focus();}}}return;}
      if (O.settings().scan || closed || paused || !st) return; if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.repeat) return; var btns = Array.from(board.querySelectorAll('.al-controls button')).filter(function (b) { return !b.hidden && !b.disabled; });
      if ((e.key === ' ' && e.target.tagName !== 'BUTTON') || e.key === 'ArrowLeft' || e.key === 'ArrowRight') { var b = single ? btns[0] : e.key === 'ArrowRight' ? btns[1] : btns[0]; if (b) { e.preventDefault(); b.click(); } }
    };
    document.addEventListener('keydown', keyHandler);
    addEventListener('pagehide', function () { closed = true; cancel(); O.hush(); document.removeEventListener('keydown', keyHandler); }, { once: true });
    intro();
  }
  global.OKS_ATHLETICS = { mount: mount, course: course, courses: COURSES, newStep: newStep, recordAttempt: recordAttempt, csv: csv };
})(window);
