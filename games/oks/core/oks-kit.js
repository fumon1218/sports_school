/* 게임 도우미 모음(ctx): 차시 게임과 가게 영업이 함께 씁니다.
   OKS.kit(ctx) — ctx 에 sh(화면 틀), level, stats, cfg 가 있으면 카드·누르기·옮기기·날리기 도우미를 붙여 줍니다. */
(function () {
  'use strict';
  var O = window.OKS, E = O.el;
  O.kit = function (ctx) {
    var sh = ctx.sh, level = ctx.level, st = ctx.stats;
    ctx.O = O; ctx.el = E; ctx.wait = O.wait; ctx.shuffle = O.shuffle; ctx.pick = O.pick; ctx.say = O.say; ctx.sfx = O.sfx;
    ctx.cfg = ctx.cfg || {};
    ctx.img = function (p) { return /^(https?:|data:|\.\.?\/)/.test(p) ? p : O.ROOT + p; };
    ctx.target = function (t) { O.target(t, ctx.level); };
    ctx.untarget = function () { O.target(null); };
  /* 그림 카드 */
    /* 3D 모델이 있는 그림이면 오른쪽 위에 '3D' 단추 (누르면 크게 돌려 보기) */
    function m3d(path, label) {
      var M = window.OKS_MODELS; if (!M || !window.OKS3D || !OKS3D.ok()) return '';
      var n = String(path).split('/').pop().replace(/\.\w+$/, '');
      return M.indexOf(n) >= 0 ? '<span class="m3d" role="button" tabindex="0" data-m3d="' + n + '" data-label="' + O.esc(label || '') + '" aria-label="3D로 돌려 보기">3D</span>' : '';
    }
    ctx.pic = function (item) {
      var sc = item.scale ? ' style="transform:scale(' + item.scale + ')"' : '';
      if (item.svg) return item.svg;
      if (item.img) return '<img src="' + ctx.img(item.img) + '" alt=""' + sc + '>' + m3d(item.img, item.label);
      if (item.color) return '<span class="swatch" style="background:' + item.color + '"></span>';
      /* 그림 사전(art/art-ready.js)에 있는 이모지는 그림으로 */
      var AI = window.OKS_ART && window.OKS_ART.icons;
      if (AI && item.emo && AI[item.emo]) return '<img class="artemo" src="' + ctx.img(AI[item.emo]) + '" alt=""' + sc + '>' + m3d(AI[item.emo], item.label);
      return '<span class="emo"' + sc + '>' + (item.emo || '❓') + '</span>';
    };
    ctx.card = function (item, o) {
      o = o || {};
      var c = E('button', 'oks-card oks-pop' + (o.big ? ' big' : '') + (o.cls ? ' ' + o.cls : ''));
      c.type = 'button';
      c.innerHTML = '<div class="pic">' + ctx.pic(item) + '</div>' + (o.noLabel ? '' : '<div class="lab">' + O.esc(o.label != null ? o.label : item.label || '') + '</div>');
      c._item = item;
      return c;
    };
    ctx.grid = function (els, cols) {
      var g = E('div', 'oks-grid');
      var n = cols || els.length; if (n > 4) n = Math.ceil(n / 2) <= 4 ? Math.ceil(n / 2) : 4;
      g.style.gridTemplateColumns = 'repeat(' + n + ', minmax(0, ' + (els.length === 1 ? 300 : 220) + 'px))';
      els.forEach(function (e) { g.appendChild(e); });
      return g;
    };
    /* 항목을 소리/말로 들려주기 */
    ctx.voice = function (item, how) {
      how = how || ctx.cfg.voice || 'label';
      if (item.inst) { O.inst(item.inst, item.freq); if (how === 'inst') return O.wait(700); }
      if (how === 'en' && item.en) return O.say(item.en, { lang: 'en-US', noRepeat: true });
      if (how === 'sound' && item.snd) return O.say(item.snd, { noRepeat: true, rate: 0.9 });
      return O.say(item.sayAs || item.label, { noRepeat: true });
    };
    ctx.good = function (el, text) {
      O.clearPrompt(); O.sfx('ok');
      if (el) { el.classList.add('good'); }
      if (text !== false) O.praise(text);
    };
    var stepMiss = 0;
    ctx.bad = function (el) {
      O.sfx("no"); ctx.stats.mistakes++; stepMiss++;
      if (el) { el.classList.remove('wobble'); void el.offsetWidth; el.classList.add('wobble'); }
      sh.mood('soft');
      if (ctx.level <= 3) O.showNow(stepMiss >= 2 ? 'hand' : 'glow');
      else if (stepMiss >= 3) O.showNow('glow');
      O.say(['다시 해 볼까요?', '괜찮아요, 한 번 더!', '천천히 다시 봐요.'][stepMiss % 3], { noRepeat: true });
    };
    ctx.newStep = function () { stepMiss = 0; sh.mood('idle'); };

    /* 누르기 기다리기: right(el) 이 참인 것을 누를 때까지. 틀리면 흔들림 + 촉진 */
    ctx.tapWait = function (els, right, onWrong) {
      return new Promise(function (res) {
        els.forEach(function (e) {
          e.onclick = function () {
            if (e.classList.contains('dim') || e._done) return;
            if (right(e)) { els.forEach(function (x) { x.onclick = null; }); res(e); }
            else { ctx.bad(e); if (onWrong) onWrong(e); }
          };
        });
      });
    };

    /* 옮기기(끌어다 놓기 + 눌러서 고르고 눌러서 놓기 둘 다 됨)
       items: 옮길 요소들, zones: 놓을 곳들, check(item, zone) → true면 성공
       성공할 때마다 onPlace(item, zone) 실행, done() 이 true를 돌려주면 끝 */
    ctx.dnd = function (items, zones, check, onPlace, done) {
      return new Promise(function (res) {
        var sel = null, drag = null;
        function select(it) { if (sel) sel.classList.remove('sel'); sel = it; if (it) it.classList.add('sel'); }
        function tryPlace(it, z) {
          if (!it || !z) return;
          if (check(it, z)) {
            it._done = true; it.classList.remove('sel'); select(null);
            O.sfx('pop'); O.clearPrompt();
            var r = onPlace(it, z);
            if (done()) { cleanup(); res(); }
            return r;
          } else { ctx.bad(it); select(null); }
        }
        function zoneAt(x, y) { /* 겹쳐 있으면 가운데가 가장 가까운 곳 */
          var best = null, bd = 1e9;
          for (var i = 0; i < zones.length; i++) { var r = zones[i].getBoundingClientRect(); if (x >= r.left - 12 && x <= r.right + 12 && y >= r.top - 12 && y <= r.bottom + 12) {
            var d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2)) / Math.max(20, Math.min(r.width, r.height)); if (d < bd) { bd = d; best = zones[i]; } } }
          return best;
        }
        function down(e) {
          var it = e.currentTarget; if (it._done) return;
          var r = it.getBoundingClientRect();
          drag = { it: it, x0: e.clientX, y0: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, ghost: null, moved: false, w: r.width, h: r.height };
          try { it.setPointerCapture(e.pointerId); } catch (x) {}
        }
        function move(e) {
          if (!drag) return;
          if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 10) {
            drag.moved = true;
            var g = drag.it.cloneNode(true); g.classList.add('ghost'); g.classList.remove('oks-glow', 'oks-pop');
            g.style.width = drag.w + 'px'; g.style.height = drag.h + 'px'; document.body.appendChild(g); drag.ghost = g;
            drag.it.classList.add('lifted'); O.sfx('tick');
          }
          if (drag.ghost) {
            drag.ghost.style.transform = 'translate(' + (e.clientX - drag.dx) + 'px,' + (e.clientY - drag.dy) + 'px)';
            zones.forEach(function (z) { z.classList.remove('hover'); }); var z = zoneAt(e.clientX, e.clientY); if (z) z.classList.add('hover');
          }
        }
        function up(e) {
          if (!drag) return; var d = drag; drag = null;
          zones.forEach(function (z) { z.classList.remove('hover'); });
          if (d.ghost) { d.ghost.remove(); d.it.classList.remove('lifted'); var z = zoneAt(e.clientX, e.clientY); if (z) tryPlace(d.it, z); }
          else { if (sel === d.it) select(null); else { select(d.it); O.sfx('tick'); } }
        }
        function zclick(e) { if (sel) tryPlace(sel, e.currentTarget); }
        items.forEach(function (it) { it.style.touchAction = 'none'; it.addEventListener('pointerdown', down); it.addEventListener('pointermove', move); it.addEventListener('pointerup', up); it.addEventListener('pointercancel', up); it.onclick = null; });
        zones.forEach(function (z) { z.addEventListener('click', zclick); });
        function cleanup() {
          items.forEach(function (it) { it.removeEventListener('pointerdown', down); it.removeEventListener('pointermove', move); it.removeEventListener('pointerup', up); it.removeEventListener('pointercancel', up); });
          zones.forEach(function (z) { z.removeEventListener('click', zclick); });
        }
      });
    };
    /* 요소를 다른 곳으로 날려 보내기(애니메이션) */
    ctx.fly = function (from, to, html) {
      var a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
      var f = E('div', 'oks-fly', html || from.innerHTML); document.body.appendChild(f);
      f.style.width = a.width + 'px'; f.style.height = a.height + 'px'; f.style.left = a.left + 'px'; f.style.top = a.top + 'px';
      var dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
      var an = f.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.45)', opacity: .6 }], { duration: O.settings().calm ? 10 : 520, easing: 'ease-in' });
      return new Promise(function (r) { an.onfinish = function () { f.remove(); r(); }; });
    };
    return ctx;
  };
  /* '3D' 단추: 카드 고르기와 섞이지 않게 먼저 가로챔 */
  if (!window.__oksM3d) {
    window.__oksM3d = true;
    var openM = function (el) { var O2 = window.OKS; if (O2 && O2.say && el.dataset.label) O2.say(el.dataset.label, { noRepeat: true }); OKS3D.open((O2 ? O2.ROOT : '') + 'art/3d/' + el.dataset.m3d + '.glb', { title: el.dataset.label || '' }); };
    ['pointerdown', 'mousedown', 'touchstart'].forEach(function (t) { document.addEventListener(t, function (e) { if (e.target.closest && e.target.closest('.m3d')) e.stopPropagation(); }, true); });
    document.addEventListener('click', function (e) { var m = e.target.closest && e.target.closest('.m3d'); if (!m) return; e.stopPropagation(); e.preventDefault(); openM(m); }, true);
    document.addEventListener('keydown', function (e) { var m = e.target.closest && e.target.closest('.m3d'); if (m && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); openM(m); } }, true);
  }
})();

/* 🔘 스위치(스캔) 모드: 설정에서 켜면, 누를 수 있는 것을 불빛이 차례로 비추고
   큰 스위치 버튼 · 스페이스 · 엔터 하나로 고를 수 있어요 (본원 보조공학실 방식). */
(function () {
  'use strict';
  var O = window.OKS;
  var SEL = '.oks-overlay button, .oks-overlay a.oks-btn, .oks-board button:not(.dim):not([disabled]), .oks-board a.oks-btn, .oks-board a.shop-card, .oks-board .dropzone, .oks-board .rub-area, .subjects button, .schools button, .lessons a.lv, .town-map .sign, .town-list .tl, .learn-top a';
  var cur = -1, list = [], timer = null, btn = null, lit = null;
  function visible(e) { var r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && !e._done; }
  function candidates() {
    var ov = document.querySelectorAll('.oks-overlay'); var root = ov.length ? ov[ov.length - 1] : document;
    return Array.prototype.filter.call(root.querySelectorAll(ov.length ? 'button, a.oks-btn, a.shop-card' : SEL), function (e) { return visible(e) && !e.closest('.scan-switch') && !e.classList.contains('big-switch'); });
  }
  function step() {
    if (document.querySelector('.big-switch')) { clear(); return; } /* 스위치 체험은 스스로 비춤 */
    list = candidates(); if (!list.length) { clear(); return; }
    cur = (cur + 1) % list.length; clear(); lit = list[cur]; lit.classList.add('scan-lit');
    try { lit.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {}
    O.sfx('tick');
  }
  function clear() { if (lit) lit.classList.remove('scan-lit'); lit = null; }
  function press() {
    if (document.querySelector('.big-switch')) return;
    var e = lit; if (!e || !e.isConnected) { step(); return; }
    var r = e.getBoundingClientRect(), o = { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1, isPrimary: true };
    try { e.dispatchEvent(new PointerEvent('pointerdown', o)); e.dispatchEvent(new PointerEvent('pointerup', o)); } catch (x) {}
    e.click(); cur = -1;
    clearInterval(timer); setTimeout(function () { step(); timer = setInterval(step, (O.settings().scanSec || 1.6) * 1000); }, 500);
  }
  function start() {
    if (!O.settings().scan || btn) return;
    btn = O.el('button', 'scan-switch', '🔘<small>스위치</small>'); btn.type = 'button';
    btn.addEventListener('click', function (e) { e.stopPropagation(); press(); });
    document.body.appendChild(btn);
    document.addEventListener('keydown', function (e) { if ((e.key === ' ' || e.key === 'Enter') && !document.querySelector('.big-switch') && !/INPUT|TEXTAREA/.test((e.target || {}).tagName)) { e.preventDefault(); press(); } });
    timer = setInterval(step, (O.settings().scanSec || 1.6) * 1000);
  }
  O.scanner = { start: start, press: press };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 300); }); else setTimeout(start, 300);
  /* '3D' 단추: 카드 고르기와 섞이지 않게 먼저 가로챔 */
  if (!window.__oksM3d) {
    window.__oksM3d = true;
    var openM = function (el) { var O2 = window.OKS; if (O2 && O2.say && el.dataset.label) O2.say(el.dataset.label, { noRepeat: true }); OKS3D.open((O2 ? O2.ROOT : '') + 'art/3d/' + el.dataset.m3d + '.glb', { title: el.dataset.label || '' }); };
    ['pointerdown', 'mousedown', 'touchstart'].forEach(function (t) { document.addEventListener(t, function (e) { if (e.target.closest && e.target.closest('.m3d')) e.stopPropagation(); }, true); });
    document.addEventListener('click', function (e) { var m = e.target.closest && e.target.closest('.m3d'); if (!m) return; e.stopPropagation(); e.preventDefault(); openM(m); }, true);
    document.addEventListener('keydown', function (e) { var m = e.target.closest && e.target.closest('.m3d'); if (m && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); openM(m); } }, true);
  }
})();
