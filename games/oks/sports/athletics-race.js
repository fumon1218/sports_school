/* 씽씽별 운동회: 같은 경기에서 조작 지원과 타이밍 도전을 선택합니다. */
(function (global) {
  'use strict';
  var O = global.OKS, E = O.el, A = './assets/athletics/';
  var NAMES = { run: '스타 달리기', pace: '리듬 달리기', hurdle: '폴짝 허들', relay: '우정 이어달리기' };
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function create(kind, assisted) {
    return { kind: kind, assisted: assisted, distance: 0, elapsed: 0, speed: 0, energy: 0, charge: 0, boosts: 0, boostLeft: 0, rhythm: 0, combo: 0, bestCombo: 0, taps: 0, lastTap: null, lastSide: null, cleared: 0, missed: 0, hurdleIndex: 0, jumpLeft: 0, partner: false, passed: false, waiting: false, event: '', done: false, rivals: [2, 5] };
  }
  function tap(s, at, side, alternate, beat) {
    if (s.done || s.waiting || (alternate && side === s.lastSide)) return false;
    if (s.lastTap !== null && at - s.lastTap < .18) return false; // 연타만으로 유리해지지 않도록 입력 간격을 둡니다.
    var good = s.lastTap !== null && Math.abs(at - s.lastTap - beat) <= beat * .4;
    s.lastTap = at; s.lastSide = side; s.taps++;
    s.combo = good ? s.combo + 1 : 0; s.bestCombo = Math.max(s.bestCombo, s.combo);
    if (good) s.rhythm++;
    s.energy = clamp(s.energy + (good ? 1.8 : .9), 0, 4);
    s.charge = clamp(s.charge + (good ? 26 : 17), 0, 100);
    if (s.assisted) s.distance = Math.min(100, s.distance + 7);
    return { good: good };
  }
  function tick(s, dt) {
    if (s.done || s.waiting) return;
    s.elapsed += dt; s.energy = Math.max(0, s.energy - dt * .65); s.boostLeft = Math.max(0, s.boostLeft - dt); s.jumpLeft = Math.max(0, s.jumpLeft - dt);
    s.speed = 3.4 + s.energy + (s.boostLeft ? 3 : 0);
    if (!s.assisted) s.distance = Math.min(100, s.distance + s.speed * dt);
    s.rivals = s.rivals.map(function (p, i) { return s.assisted ? Math.max(0, s.distance + (i ? 5 : -3) - s.rhythm * .9 - s.boosts * 4) : Math.min(100, p + (i ? 4.4 : 4.8) * dt); });
    if (s.distance >= 100) s.done = true;
  }
  function boost(s) { if (s.charge < 100 || s.done || s.waiting) return false; s.charge = 0; s.boostLeft = 2.5; s.boosts++; if (s.assisted) s.distance = Math.min(100, s.distance + 9); return true; }
  function mount(o) {
    var kind = o.kind, assisted = o.assisted, calm = o.calm, beat = o.slow ? 1.25 : .85, state = create(kind, assisted), active = false, stopped = false, visiblePause = false, resolved = false, eventAt = 0, jumpCooldown = 0, lastFrame = performance.now(), poseFrame = -1;
    var board = o.board, root = E('section', 'ar-game'), stage = E('div', 'ar-stage'), hud = E('div', 'ar-hud');
    root.classList.toggle('ar-calm', calm); root.classList.toggle('ar-assisted', assisted);
    hud.innerHTML = '<div><small>' + NAMES[kind] + '</small><b class="ar-distance">0 / 100 m</b></div><div><small>' + (o.rivals ? '지금 순위' : '친구와 함께') + '</small><b class="ar-place">준비!</b></div><div><small>좋은 리듬</small><b class="ar-combo">0회</b></div>';
    root.appendChild(hud); stage.setAttribute('aria-label', NAMES[kind] + ' 경기장');
    stage.innerHTML = '<div class="ar-sky"></div><div class="ar-field"></div><div class="ar-track-lines"></div><div class="ar-track-marks"></div><div class="ar-distance-sign">50 m</div><div class="ar-finish-line"><span>도착</span></div><div class="ar-zone"><span>점프 구간</span></div><div class="ar-obstacle"><b></b><i></i><i></i></div><div class="ar-baton"></div>';
    var runners = [];
    ['새봄', '하늘', '나'].forEach(function (name, i) { var r = E('div', 'ar-athlete ar-athlete-' + i); r.innerHTML = '<span>' + name + '</span><img src="' + A + 'runner_ready.webp" alt="' + name + ' 선수"><i></i>'; stage.appendChild(r); runners.push(r); });
    var status = E('div', 'ar-callout', '준비됐나요?'); status.setAttribute('role', 'status'); stage.appendChild(status); root.appendChild(stage);
    var distanceBar = E('progress', 'ar-progress'); distanceBar.max = 100; distanceBar.value = 0; distanceBar.setAttribute('aria-label','경기 이동 거리');root.appendChild(distanceBar);
    var rhythm = E('div', 'ar-rhythm', '<span>이 박자에 맞춰요</span><div class="ar-beat"><i></i><b></b></div><strong>천천히 톡, 톡</strong>'); root.appendChild(rhythm);
    var controls = E('div', 'al-controls ar-controls'), runButtons = [], action = btn('경기 출발', start, 'orange'), boostButton = btn('응원 모으기 0%', useBoost, 'blue'); boostButton.disabled = true;
    controls.appendChild(action); root.appendChild(controls); board.appendChild(root);
    var obstacle = stage.querySelector('.ar-obstacle'), zone = stage.querySelector('.ar-zone'), baton = stage.querySelector('.ar-baton'); obstacle.hidden = true; zone.hidden = true; baton.hidden = true;
    o.instruction(assisted ? '버튼을 누를 때 앞으로 가요. 점프와 바통 차례에는 기다려 줄게요.' : '선수가 계속 달려요. 느린 박자에 맞춰 누르면 더 힘차게 달려요.');
    o.target(action); action.focus({ preventScroll: true });
    function btn(text, fn, color) { var b = E('button', 'oks-btn ' + (color || '')); b.type = 'button'; b.textContent = text; b.onclick = fn; return b; }
    function call(text) { if (status.textContent !== text) status.textContent = text; }
    function start() {
      if (active) return; O.unlock(); active = true; root.classList.add('ar-running'); controls.innerHTML = '';
      var sides = o.single ? ['리듬 맞춰 달리기'] : ['왼발', '오른발'];
      sides.forEach(function (label, i) { var b = btn(label, function () { input(String(i)); }, i ? 'orange' : 'blue'); runButtons.push(b); controls.appendChild(b); });
      action = btn(kind === 'relay' ? '바통 전달' : kind === 'pace' ? '멈춰요' : '점프!', special, 'orange');
      if (kind !== 'run') controls.appendChild(action); else action.hidden = true;
      controls.appendChild(boostButton); action.disabled = true;
      o.target(runButtons[0]);runButtons[0].focus({preventScroll:true});call('출발! 내 박자로 달려요');
      lastFrame = performance.now(); loop();
    }
    function input(side) {
      if (!active || stopped || visiblePause || state.done || state.waiting) return;
      var r = tap(state, state.elapsed, side, !o.single, beat); if (!r) return;
      o.attempt(true); O.sfx('tick');
      if (r.good) { call('좋은 리듬! ' + state.combo + '번 연속'); root.classList.add('ar-hit'); o.later(function () { root.classList.remove('ar-hit'); }, 180); }
      else call('좋아요 · 천천히 톡, 톡');
      checkEvents(); render();
    }
    function useBoost() { if (stopped || visiblePause || !boost(state)) return; o.attempt(true); O.sfx('bell'); call('응원의 힘! 힘차게 앞으로'); checkEvents();render(); }
    function checkEvents() {
      if (state.event) return;
      if (kind === 'hurdle' && state.hurdleIndex < 3) {
        var at = [28, 55, 82][state.hurdleIndex];
        if (state.distance >= at - 9) {
          state.event = 'hurdle'; eventAt = at; action.disabled = false; call('점프 구간! 폴짝 뛰어요');
          if (assisted) { state.distance = at - 4; state.waiting = true; }
          o.target(action);
        }
      }
      if (kind === 'relay' && !state.passed && state.distance >= 42) {
        state.event = 'relay'; eventAt = 58; action.disabled = false; baton.hidden = false; zone.hidden = false;zone.querySelector('span').textContent = '바통 교대 구간';call('친구가 기다려요 · 바통을 전달해요');
        if (assisted) { state.distance = 48;state.waiting = true; } o.target(action);
      }
      if (kind === 'pace' && !state.passed && state.distance >= 48) {
        state.event = 'stop'; state.waiting = true; action.disabled = false;call('멈춤 신호! 멈춰요 버튼');o.target(action);
      }
    }
    function special() {
      if (!active || stopped || visiblePause || state.done || action.disabled) return;
      if (kind === 'hurdle') {
        if (jumpCooldown > 0) return;
        var success = state.event === 'hurdle' && state.distance >= eventAt - 9 && state.distance <= eventAt + 3;
        o.attempt(success); jumpCooldown = .7; state.jumpLeft = .65;
        if (success) { state.cleared++; state.hurdleIndex++; state.energy = Math.min(4,state.energy+1.5);state.charge = Math.min(100,state.charge+25); state.waiting = false;state.event = '';call('폴짝! 허들 ' + state.cleared + '개 성공');action.disabled = true; O.sfx('pop'); if(assisted)state.distance=eventAt+4; }
        else call('다음 점프 구간을 기다려요');
      } else if (kind === 'relay') {
        o.attempt(true);state.passed = true;state.partner = true;state.waiting = false;state.event = '';state.energy = 4;baton.classList.add('ar-passed');runners[2].querySelector('span').textContent='친구';action.disabled = true;call('바통 전달 성공! 친구 차례예요');O.sfx('bell');zone.hidden=true;
      } else if (kind === 'pace') {
        o.attempt(true);state.event = 'resume';state.waiting = true;state.passed = true;action.textContent = '다시 앞으로';action.onclick = function () { if(stopped)return;state.waiting=false;state.event='';action.disabled=true;call('다시 출발! 내 박자로 달려요');o.target(runButtons[0]); };call('잘 멈췄어요 · 준비되면 다시 앞으로');
      }
      o.target(state.waiting?action:runButtons[0]);render();
    }
    function loop() {
      if (stopped || resolved) return;
      var now=performance.now(),dt=Math.min(.1,Math.max(0,(now-lastFrame)/1000));lastFrame=now;
      var overlay=!!document.querySelector('.oks-overlay');
      if (!visiblePause && !overlay) {
        tick(state,dt);jumpCooldown=Math.max(0,jumpCooldown-dt);checkEvents();
        if (!assisted && state.event === 'hurdle' && state.distance > eventAt + 3) {
          state.missed++;state.hurdleIndex++;state.event='';state.energy=0;action.disabled=true;o.attempt(false);call('괜찮아요! 다음 허들에서 다시 도전');
        }
        if (!assisted && state.event === 'relay' && state.distance > eventAt) {state.distance=eventAt;state.waiting=true;call('교대 구역에서 기다려요 · 바통을 전달해요');}
        render();if(state.done && !state.event){finish();return;}
      }
      o.later(loop,50);
    }
    function render() {
      var d=state.distance, p=clamp(d/100,0,1), playerX=28+Math.max(0,d-85)*2.7;
      root.dataset.distance=d.toFixed(2);root.dataset.phase=state.event|| (state.done?'finished':'running');
      hud.querySelector('.ar-distance').textContent=Math.floor(d)+' / 100 m';hud.querySelector('.ar-combo').textContent=state.rhythm+'회';
      var rank=1+state.rivals.filter(function(x){return x>d;}).length;hud.querySelector('.ar-place').textContent=o.rivals?rank+' / 3':'함께 완주';
      distanceBar.value=d;boostButton.disabled=state.charge<100||state.waiting||state.done;boostButton.textContent=state.charge>=100?'응원 부스트!':'응원 모으기 '+Math.floor(state.charge)+'%';
      runButtons.forEach(function(b){b.disabled=state.waiting||state.done;});
      var frame=Math.floor(state.elapsed* (state.speed>6?7:4))%2;
      runners.forEach(function(r,i){
        var x=i===2?playerX:clamp(playerX+(state.rivals[i]-d)*2.3,3,89);r.style.left=x+'%';
        if(frame!==poseFrame)r.querySelector('img').src=A+(state.waiting?'runner_idle':frame?'runner_run_a':'runner_run_b')+'.webp';
      });poseFrame=frame;
      runners[2].style.setProperty('--jump',state.jumpLeft&&!calm?(-Math.sin((.65-state.jumpLeft)/.65*Math.PI)*75)+'px':'0px');
      root.classList.toggle('ar-boosting',state.boostLeft>0);root.classList.toggle('ar-waiting',state.waiting);
      if(!calm){stage.querySelector('.ar-track-marks').style.backgroundPosition=(-d*24)+'px 0';stage.querySelector('.ar-sky').style.backgroundPosition=(-d*1.5)+'px center';}
      stage.querySelector('.ar-finish-line').style.left=(playerX+(100-d)*2.3)+'%';stage.querySelector('.ar-distance-sign').style.left=(playerX+(50-d)*2.3)+'%';
      var beatP=(state.elapsed%beat)/beat;rhythm.querySelector('.ar-beat i').style.left=(beatP*100)+'%';rhythm.querySelector('strong').textContent=state.waiting?'화면의 신호를 골라요':state.boostLeft?'응원 부스트!':'천천히 톡, 톡';
      if(kind==='hurdle'){
        var at=[28,55,82][state.hurdleIndex];obstacle.hidden=at===undefined;zone.hidden=at===undefined;
        if(at!==undefined){obstacle.style.left=(playerX+(at-d)*2.3)+'%';zone.style.left=(playerX+(at-9-d)*2.3)+'%';}
      }
      if(kind==='relay'){baton.style.left=(playerX+9)+'%';zone.style.left=(playerX+(42-d)*2.3)+'%';}
    }
    function finish() {
      if(resolved)return;resolved=true;root.classList.remove('ar-running');root.classList.add('ar-finished');runners[2].querySelector('img').src=A+'runner_celebrate.webp';
      controls.innerHTML='';rhythm.hidden=true;call('결승선 통과! 끝까지 해냈어요');O.sfx('ok');
      var key=[kind,o.level,assisted?'assist':'timing',o.single?'single':'alternate',o.slow?'slow':'normal',calm?'calm':'motion'].join('-');
      var book=O.jget('oks_athletics_racebook_v1',{total:0,best:{}}),previous=book.best[key];
      var result={kind:kind,mode:assisted?'assist':'timing',distance:100,seconds:+state.elapsed.toFixed(2),rhythm:state.rhythm,bestCombo:state.bestCombo,boosts:state.boosts,cleared:state.cleared,missed:state.missed,baton:state.passed&&kind==='relay',taps:state.taps,rank:1+state.rivals.filter(function(x){return x>=100;}).length};
      var score=assisted?state.rhythm:state.elapsed,isBest=previous==null||(assisted?score>previous:score<previous);
      if(isBest)book.best[key]=score;book.total++;O.jset('oks_athletics_racebook_v1',book);
      var panel=E('div','ar-result');panel.innerHTML='<b>'+NAMES[kind]+' 완주!</b><p>좋은 리듬 '+state.rhythm+'회 · 응원 부스트 '+state.boosts+'회'+(kind==='hurdle'?' · 허들 '+state.cleared+'/3':'')+'</p><p>'+(assisted?'내 속도로 100m 완주':state.elapsed.toFixed(2)+'초 · 화면 경기 기록')+'</p><small>'+(isBest?'이 기기 · 같은 설정의 새 기록!':'이 기기 · 같은 설정의 최고 '+previous+(assisted?'회':'초'))+'</small>';
      var rewards=['outfit_sneakers','outfit_cap','outfit_tshirt'],unlocked=Math.min(3,Math.floor(book.total/3)+1);var shelf=E('div','ar-rewards');
      rewards.forEach(function(name,i){var badge=E('div',i<unlocked?'':'locked');badge.innerHTML='<img src="'+A+name+'.webp" alt="'+['운동화 배지','모자 배지','운동복 배지'][i]+'"><small>'+(i<unlocked?'획득!':(i*3)+'경기')+'</small>';shelf.appendChild(badge);});panel.appendChild(shelf);
      controls.appendChild(panel);var next=btn('다음 미션',function(){next.disabled=true;o.complete(result);},'orange');controls.appendChild(next);o.target(next);next.focus({preventScroll:true});
    }
    function visibility(){visiblePause=document.hidden;lastFrame=performance.now();}
    document.addEventListener('visibilitychange',visibility);
    return { stop:function(){stopped=true;document.removeEventListener('visibilitychange',visibility);}, state:state };
  }
  global.OKS_ATHLETICS_RACE={mount:mount,create:create,tap:tap,tick:tick,boost:boost};
})(window);
