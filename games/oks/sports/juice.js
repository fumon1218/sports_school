/* 씽씽별 볼 스포츠 공통 "신나는 효과" — 연속 성공, 응원, 색종이, 황금 공, 경기 분위기
   야구·농구·럭비·테니스·탁구 게임이 함께 써요. 점수를 깎거나 탈락시키는 효과는 없어요.
   - 연속 성공(콤보): 3·5·8·12번 연속이면 불꽃 배지와 색종이, 보너스 점수
   - 황금 공: 4번째 공마다(4·8번째) 점수가 2배! 공이 반짝여요
   - 경기 분위기: 낮 → 노을 → 저녁 조명 → 새벽빛으로 바뀌어요
   - 관중 응원: 성공하면 박수·환호 이모지가 떠올라요
   '움직임 줄이기' 설정(calm)에서는 글자 배지만 보여 줘요. */
(function (g) {
  'use strict';
  var O = g.OKS, E = O.el;
  var MOODS = ['', 'sunset', '', 'night', 'dawn'];
  var MOODNAME = ['', '노을 경기장', '', '저녁 조명 경기', '새벽빛 경기'];
  var CHEER = ['👏', '🎉', '🙌', '📣', '⭐', '🎊'];
  var QUIPS = ['멋져요!', '대단해요!', '최고예요!', '잘하고 있어요!'];
  var MILE = { 3: ['🔥 3연속!', 1], 5: ['🔥🔥 5연속!', 2], 8: ['🌟 8연속!', 3], 12: ['🏆 12연속!', 3] };

  function attach(o) {
    var stage = o.stage, later = o.later, calm = !!o.calm, st = o.st, balls = o.balls || function () { return []; };
    var combo = 0, bestC = 0, gold = false, lastM = st ? st.mistakes : 0, quip = 0, goldCount = 0;
    var tint = E('div', 'oj-tint'), badge = E('div', 'oj-combo'), gb = E('div', 'oj-gold-banner'), lay = E('div', 'oj-layer');
    badge.hidden = true;
    var first = stage.firstElementChild; if (first) first.after(tint); else stage.appendChild(tint);
    stage.appendChild(lay); stage.appendChild(badge); stage.appendChild(gb);

    function dims() { return { W: stage.clientWidth || 800, H: stage.clientHeight || 380 }; }
    function confetti(n) {
      if (calm) return; var D = dims(), cols = ['#ff5d6c', '#ffc93c', '#3ddc6f', '#49a8ff', '#c77dff', '#ff9a3c'];
      for (var i = 0; i < n; i++) {
        var p = E('i', 'oj-conf'); p.style.left = (Math.random() * 100) + '%'; p.style.background = cols[i % cols.length];
        p.style.setProperty('--dx', ((Math.random() - .5) * 120) + 'px'); p.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
        p.style.animationDelay = (Math.random() * .25) + 's'; p.style.animationDuration = (1.1 + Math.random() * .7) + 's'; lay.appendChild(p);
        (function (el) { later(function () { el.remove(); }, 2200); })(p);
      }
    }
    function cheer(n) {
      if (calm) return;
      for (var i = 0; i < n; i++) {
        var p = E('span', 'oj-cheer', CHEER[(Math.random() * CHEER.length) | 0]); p.style.left = (6 + Math.random() * 88) + '%';
        p.style.animationDelay = (Math.random() * .35) + 's'; p.style.fontSize = (22 + Math.random() * 16) + 'px'; lay.appendChild(p);
        (function (el) { later(function () { el.remove(); }, 1800); })(p);
      }
    }
    function punch() { if (calm) return; stage.classList.remove('oj-punch'); void stage.offsetWidth; stage.classList.add('oj-punch'); later(function () { stage.classList.remove('oj-punch'); }, 500); }
    function showBadge() {
      if (combo < 2) { badge.hidden = true; return; }
      badge.hidden = false; badge.textContent = '🔥 ' + combo + '연속'; badge.classList.remove('pop'); void badge.offsetWidth; badge.classList.add('pop');
    }
    function setGold(on) {
      gold = on; balls().forEach(function (b) { if (b) b.classList.toggle('oj-gold', on); }); stage.classList.toggle('oj-goldmode', on);
    }

    /* 새 공(차례)이 시작돼요 */
    function round(i, total) {
      var m = MOODS[i % MOODS.length]; tint.className = 'oj-tint' + (m ? ' ' + m : '');
      var isG = (i % 4 === 3) && total >= 4; setGold(isG);
      if (isG) { goldCount++; gb.textContent = '⭐ 황금 공! 점수 2배'; gb.classList.remove('show'); void gb.offsetWidth; gb.classList.add('show'); later(function () { gb.classList.remove('show'); }, 1800); O.sfx('coin'); }
      else if (m && i > 0) { gb.textContent = (m === 'sunset' ? '🌇 ' : m === 'night' ? '🌙 ' : '🌅 ') + MOODNAME[i % MOODS.length]; gb.classList.remove('show'); void gb.offsetWidth; gb.classList.add('show'); later(function () { gb.classList.remove('show'); }, 1500); }
    }
    /* 성공! 점수를 받아 보너스를 더한 점수를 돌려줘요 */
    function win(n) {
      if (st && st.mistakes > lastM) { combo = 0; }
      lastM = st ? st.mistakes : 0;
      combo++; if (combo > bestC) bestC = combo;
      var pts = n * (gold ? 2 : 1) + (combo >= 3 ? 5 : 0);
      cheer(Math.min(3 + combo, 9)); if (n >= 30 || gold) confetti(18);
      showBadge();
      var m = MILE[combo];
      if (m) {
        confetti(30 + m[1] * 10); punch(); cheer(10); O.sfx('win'); pts += m[1] * 10;
        later(function () { O.say(QUIPS[quip++ % QUIPS.length], { noRepeat: false }); }, 350);
      } else if (gold) { O.sfx('coin'); }
      return pts;
    }
    function best() { return bestC; }
    function golds() { return goldCount; }
    return { round: round, win: win, best: best, golds: golds, confetti: confetti, cheer: cheer };
  }
  g.OKS_JUICE = { attach: attach };

  /* ---------- 랠리 난이도 고르기 (테니스·탁구 공용) ----------
     n = 한 번의 공에서 주고받는 횟수, ramp = 한 번 칠 때마다 공이 빨라지는 정도(0이면 그대로) */
  var RALLY = [
    { id: 0, name: '한 번씩', n: 1, ramp: 0, desc: '한 번 치고 문제를 풀어요 (예전 방식)' },
    { id: 1, name: '쉬움', n: 3, ramp: 0, desc: '3번 주고받아요 · 속도는 그대로' },
    { id: 2, name: '보통', n: 5, ramp: .04, desc: '5번 주고받아요 · 조금씩 빨라져요' },
    { id: 3, name: '어려움', n: 8, ramp: .07, desc: '8번 주고받아요 · 점점 빨라져요' }
  ];
  function choose(key) {
    var O = g.OKS, E = O.el, K = 'oks_rally_' + key + '_v1', saved = O.jget(K, 2);
    var pick = RALLY.filter(function (r) { return r.id === saved; })[0] || RALLY[2];
    if (/[?&]dev=fast/.test(location.search)) return Promise.resolve(pick);
    return new Promise(function (res) {
      var ov = E('div', 'oks-overlay'), box = E('div', 'oks-finish oks-levelpick');
      box.innerHTML = '<h2>랠리 난이도</h2><p>공을 몇 번 주고받을까요?</p><div class="btns"></div><div class="note">친구와 공을 주고받을수록 랠리 점수가 쌓여요. 놓쳐도 괜찮아요.</div>';
      var btns = box.querySelector('.btns');
      RALLY.forEach(function (r) {
        var b = E('button', 'oks-lv' + (r.id === pick.id ? ' on' : ''), '<b>' + (r.n > 1 ? r.n : '1') + '</b><span><strong>' + r.name + '</strong><small>' + O.esc(r.desc) + '</small></span>');
        b.type = 'button'; b.onclick = function () { O.jset(K, r.id); ov.remove(); res(r); }; btns.appendChild(b);
      });
      ov.appendChild(box); document.body.appendChild(ov);
      try { O.say('공을 몇 번 주고받을까요?', { noRepeat: true }); } catch (e) {}
    });
  }
  g.OKS_RALLYSEL = { choose: choose, LIST: RALLY };
})(window);
