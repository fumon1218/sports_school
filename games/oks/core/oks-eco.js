/* 옥쌤의 즐거운 교실 — 게임 경제(정글 점프 방식)
   코인 · 경험치(레벨) · 오늘의 미션 · 배지 · 마을 열림. 차시 게임과 가게 영업이 모두 여기로 모입니다.
   저장: localStorage 'oks_eco_v1' */
(function () {
  'use strict';
  var O = window.OKS; if (!O) return;
  var KEY = 'oks_eco_v1';
  var TITLES = ['새싹 탐험가', '꼬마 일꾼', '씩씩한 도우미', '솜씨 좋은 장인', '마을 인기 스타', '학교 대표 선수', '꿈꾸는 사장님', '옥쌤 반 전설'];
  var PLACE_LV = { gn: 1, cc: 2, wj: 3 };
  var PLACES = {
    gn: { name: '우리 학교', icon: '🌊', url: 'index.html' },
    cc: { name: '본원', icon: '🏞️', url: 'town/?c=cc' },
    wj: { name: '분원', icon: '⛰️', url: 'town/?c=wj' }
  };
  var MISSIONS = [
    { k: 'lesson', icon: '🌱', text: '배움 지도 차시 게임 1판 하기', need: 1 },
    { k: 'shop', icon: '🏪', text: '가게 하루 영업하기', need: 1 },
    { k: 'cust', icon: '🙋', text: '손님 5명 맞이하기', need: 5 }
  ];
  var BADGES = [
    { k: 'first_lesson', icon: '🌱', name: '첫 배움' }, { k: 'first_shop', icon: '🏪', name: '첫 영업' },
    { k: 'cust10', icon: '🙋', name: '손님 10명' }, { k: 'cust50', icon: '🎉', name: '손님 50명' }, { k: 'cust150', icon: '👑', name: '인기 가게' },
    { k: 'visit_cc', icon: '🏞️', name: '본원 방문' }, { k: 'visit_wj', icon: '⛰️', name: '분원 방문' },
    { k: 'king', icon: '🦍', name: '고릴라 대장 손님' }, { k: 'reg', icon: '💛', name: '첫 단골손님' },
    { k: 'star5', icon: '🌟', name: '생활로 별 3개' }, { k: 'deco', icon: '🎀', name: '가게 꾸미기' }, { k: 'mission', icon: '🎁', name: '오늘의 미션 완료' }
  ];
  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function data() {
    var d = O.jget(KEY, null) || {};
    d.coins = d.coins || 0; d.xp = d.xp || 0; d.badges = d.badges || {}; d.shops = d.shops || {}; d.cust = d.cust || 0;
    if (d.mDay !== today()) { d.mDay = today(); d.m = {}; d.mGift = false; }
    d.m = d.m || {};
    return d;
  }
  function save(d) { O.jset(KEY, d); refreshHud(); }
  function lvOf(xp) { var lv = 1; while (xp >= need(lv + 1)) lv++; return lv; }
  function need(lv) { return 30 * (lv - 1) * lv; } /* 2:60 3:180 4:360 5:600 ... */
  function info() {
    var d = data(), lv = lvOf(d.xp), a = need(lv), b = need(lv + 1);
    return { coins: d.coins, xp: d.xp, lv: lv, title: TITLES[Math.min(lv - 1, TITLES.length - 1)], pct: Math.round((d.xp - a) / (b - a) * 100), toNext: b - d.xp, cust: d.cust };
  }
  function placeOpen(c) { return !!O.settings().openAll || lvOf(data().xp) >= (PLACE_LV[c] || 1); }

  /* 보상 주기: {coins, xp, mission:{k:n}, badge:[..], why} */
  function reward(r) {
    var d = data(), lv0 = lvOf(d.xp);
    d.coins += r.coins || 0; d.xp += r.xp || 0;
    if (r.cust) d.cust += r.cust;
    var doneNow = [];
    if (r.mission) Object.keys(r.mission).forEach(function (k) {
      var ms = MISSIONS.filter(function (m) { return m.k === k; })[0]; if (!ms) return;
      var before = d.m[k] || 0; d.m[k] = before + r.mission[k];
      if (before < ms.need && d.m[k] >= ms.need) { d.coins += 30; doneNow.push(ms); }
    });
    var got = [];
    (r.badge || []).forEach(function (k) { if (!d.badges[k]) { d.badges[k] = today(); got.push(k); } });
    [['cust10', 10], ['cust50', 50], ['cust150', 150]].forEach(function (p) { if (d.cust >= p[1] && !d.badges[p[0]]) { d.badges[p[0]] = today(); got.push(p[0]); } });
    var allDone = MISSIONS.every(function (m) { return (d.m[m.k] || 0) >= m.need; });
    if (allDone && !d.mGift) { d.mGift = true; d.coins += 50; d.xp += 30; if (!d.badges.mission) { d.badges.mission = today(); got.push('mission'); } }
    save(d);
    var lv1 = lvOf(d.xp);
    setTimeout(function () {
      doneNow.forEach(function (m, i) { setTimeout(function () { O.toast('🎯 미션 완료! ' + m.text + ' · 🪙30', 2200); }, i * 2300); });
      got.forEach(function (k, i) { var b = BADGES.filter(function (x) { return x.k === k; })[0]; if (b) setTimeout(function () { O.toast(b.icon + ' 배지를 받았어요: ' + b.name, 2200); }, (doneNow.length + i) * 2300); });
      if (lv1 > lv0) levelUp(lv0, lv1);
    }, r.delay || 400);
    return { coins: r.coins || 0, xp: r.xp || 0, lvUp: lv1 > lv0 };
  }
  function levelUp(a, b) {
    O.sfx('win');
    var opened = Object.keys(PLACE_LV).filter(function (c) { return PLACE_LV[c] > a && PLACE_LV[c] <= b; });
    var ov = O.el('div', 'oks-overlay eco-lvup');
    ov.innerHTML = '<div class="oks-finish"><div class="lvbig">⬆️</div><h2>레벨 업! Lv.' + b + '</h2><p>' + TITLES[Math.min(b - 1, TITLES.length - 1)] + '</p>' +
      (opened.length ? '<p class="open">' + opened.map(function (c) { return PLACES[c].icon + ' <b>' + PLACES[c].name + '</b>이 열렸어요! 버스를 타고 가 봐요'; }).join('<br>') + '</p>' : '') + '<div class="btns"></div></div>';
    var ok = O.el('button', 'oks-btn orange', '좋아요!'); ok.type = 'button'; ok.onclick = function () { ov.remove(); };
    ov.querySelector('.btns').appendChild(ok); document.body.appendChild(ov);
    O.say('레벨 업! 레벨 ' + b + '! ' + (opened.length ? PLACES[opened[0]].name + '이 열렸어요' : ''), { noRepeat: true });
  }
  function spend(n) { var d = data(); if (d.coins < n) return false; d.coins -= n; save(d); return true; }

  /* 가게 기록 */
  function shop(id) { var d = data(); var s = d.shops[id] || { days: 0, served: 0, best: {}, deco: { owned: [], eq: {} }, regs: {}, kingDay: '' }; s.deco = s.deco || { owned: [], eq: {} }; s.regs = s.regs || {}; s.best = s.best || {}; return s; }
  function saveShop(id, s) { var d = data(); d.shops[id] = s; save(d); }

  /* 화면 위 작은 정보판: 🪙 · Lv · 미션 */
  var huds = [];
  function hud(host, opt) {
    opt = opt || {};
    var h = O.el('div', 'eco-hud' + (opt.cls ? ' ' + opt.cls : ''));
    host.appendChild(h); huds.push(h); draw(h);
    h.addEventListener('click', function (e) { var t = e.target.closest('[data-eco]'); if (!t) return; if (t.dataset.eco === 'm') missionsView(); if (t.dataset.eco === 'lv') badgesView(); });
    return h;
  }
  function draw(h) {
    var i = info(), d = data();
    var md = MISSIONS.filter(function (m) { return (d.m[m.k] || 0) >= m.need; }).length;
    h.innerHTML = '<button type="button" class="eco-coin" data-eco="lv" title="코인">🪙 <b>' + i.coins + '</b></button>' +
      '<button type="button" class="eco-lv" data-eco="lv" title="' + i.title + '"><b>Lv.' + i.lv + '</b><i><span style="width:' + i.pct + '%"></span></i></button>' +
      '<button type="button" class="eco-m" data-eco="m" title="오늘의 미션">🎯 <b>' + md + '/3</b></button>';
  }
  function refreshHud() { huds = huds.filter(function (h) { return h.isConnected; }); huds.forEach(function (h) { var old = h.querySelector('.eco-coin b'); var v0 = old ? old.textContent : null; draw(h); if (v0 !== null && v0 !== String(data().coins)) { h.classList.remove('bump'); void h.offsetWidth; h.classList.add('bump'); } }); }
  function missionsView() {
    var d = data();
    var ov = O.el('div', 'oks-overlay'), box = O.el('div', 'oks-finish');
    box.innerHTML = '<h2>🎯 오늘의 미션</h2><p>하나마다 🪙30, 모두 하면 🎁 🪙50 선물!</p><div class="eco-mlist">' + MISSIONS.map(function (m) {
      var v = Math.min(m.need, d.m[m.k] || 0); return '<div class="eco-mi' + (v >= m.need ? ' done' : '') + '"><span>' + m.icon + '</span><b>' + m.text + '</b><em>' + (v >= m.need ? '✔' : v + '/' + m.need) + '</em></div>';
    }).join('') + '</div><div class="btns"></div>';
    var ok = O.el('button', 'oks-btn blue', '닫기'); ok.type = 'button'; ok.onclick = function () { ov.remove(); };
    box.querySelector('.btns').appendChild(ok); ov.appendChild(box); document.body.appendChild(ov);
  }
  function badgesView() {
    var d = data(), i = info();
    var ov = O.el('div', 'oks-overlay'), box = O.el('div', 'oks-finish');
    box.innerHTML = '<h2>Lv.' + i.lv + ' ' + i.title + '</h2><p>다음 레벨까지 경험치 ' + i.toNext + ' · 🪙 ' + i.coins + ' · 맞이한 손님 ' + i.cust + '명</p><div class="eco-badges">' + BADGES.map(function (b) {
      return '<div class="eco-b' + (d.badges[b.k] ? ' on' : '') + '"><span>' + b.icon + '</span><small>' + b.name + '</small></div>'; }).join('') + '</div><div class="btns"></div>';
    var ok = O.el('button', 'oks-btn blue', '닫기'); ok.type = 'button'; ok.onclick = function () { ov.remove(); };
    box.querySelector('.btns').appendChild(ok); ov.appendChild(box); document.body.appendChild(ov);
  }

  O.eco = { data: data, info: info, reward: reward, spend: spend, shop: shop, saveShop: saveShop, hud: hud, refresh: refreshHud,
    placeOpen: placeOpen, PLACES: PLACES, PLACE_LV: PLACE_LV, MISSIONS: MISSIONS, BADGES: BADGES, today: today, missionsView: missionsView, badgesView: badgesView };
})();
