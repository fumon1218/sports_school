/* 차시 장면(게임 공간) — 엑셀의 '3D 게임 공간'을 15가지 장면 틀로 묶었습니다.
   한 판을 풀 때마다 장면에 조각이 하나씩 생기고(꽃이 피고, 기차 칸이 붙고…), 마지막 판은 보너스, 다 풀면 장면 완성!
   그림: 제미나이로 만든 그림이 art/scene/<틀>.webp 에 들어오면 READY 에 이름을 넣으면 바로 바뀝니다.
         그 전에는 이미 있는 그림(fallback)을 씁니다. 조각 그림도 art/scene/<틀>_piece.webp 가 생기면 이모지 대신 씁니다. */
(function () {
  'use strict';
  var O = window.OKS, E = O.el;
  /* 제미나이 그림이 들어온 틀 이름 (예: 'forest', 'forest_piece') */
  var READY = window.OKS_SCENE_READY || [];
  var T = {
    forest:  { name: '숲', bg: 'art/scenes/treehouse.jpg', guide: 'owl', piece: '🌸', finale: '🌈', done: '숲이 활짝 피어났어요!', keys: ['숲', '정글', '생태', '소리 탐험'] },
    cafe:    { name: '카페', bg: 'art/jj/scenes/cafe.webp', guide: 'cat', piece: '☕', finale: '🎂', done: '카페 손님이 가득해요!', keys: ['카페', '베이커리', '스낵', '식당', '주방'] },
    post:    { name: '우체국', bg: 'icons/world-summer.jpg', guide: 'rabbit', piece: '✉️', finale: '📮', done: '편지가 모두 배달됐어요!', keys: ['우체국', '메시지', '낱말'] },
    station: { name: '기차역', bg: 'art/scenes/park.jpg', guide: 'panda', piece: '🚃', finale: '🚂', done: '기차가 출발해요! 칙칙폭폭!', keys: ['기차', '역', '버스', '환승', '정류장', '여행'] },
    stage:   { name: '무대', bg: 'art/jj/scenes/temple.webp', guide: 'parrot', piece: '💡', finale: '🎉', done: '무대에 불이 모두 켜졌어요!', keys: ['무대', '극장', '콘서트', '오케스트라', '뮤직', '음악', '리듬', '멜로디', '댄스', '사운드', '노래', '악기', '음높이', '타악기'] },
    gallery: { name: '미술관', bg: 'icons/bg-artroom.jpg', guide: 'fox', piece: '🖼️', finale: '🏆', done: '전시장이 작품으로 가득해요!', keys: ['미술', '아틀리에', '공방', '스튜디오', '갤러리', '벽화', '디자인', '아트', '조각', '정원(미술)'] },
    mart:    { name: '마트', bg: 'art/jj/scenes/snack.webp', guide: 'bear', piece: '🛍️', finale: '🧾', done: '장보기 완료! 장바구니가 가득해요!', keys: ['동물 마트', '가게', '브랜드', '장터', '심부름', '공장', '분류', '통계', '확률'] },
    lab:     { name: '실험실', bg: 'art/jj/scenes/crystal.webp', guide: 'penguin', piece: '🧪', finale: '🔬', done: '실험 성공! 새로운 걸 발견했어요!', keys: ['실험', '연구소', '탐구', '데이터', '과학', '실습관', '에코', '지킴이', '파동'] },
    sea:     { name: '바닷가', bg: 'art/scenes/pond.jpg', guide: 'penguin', piece: '🐠', finale: '🐳', done: '바다 친구들이 돌아왔어요!', keys: ['바다', '바닷가', '물놀이', '호수', '보호 본부'] },
    school:  { name: '학교', bg: 'icons/bg-artroom.jpg', guide: 'koala', piece: '⭐', finale: '🏅', done: '칭찬 스티커판 완성!', keys: ['학교', '교실', '진로', '면접', '방송국', '토론'] },
    sky:     { name: '하늘', bg: 'art/scenes/snow.jpg', guide: 'parrot', piece: '☁️', finale: '🌈', done: '맑은 하늘에 무지개가 떴어요!', keys: ['하늘', '날씨', '구름', '기후', '관측'] },
    arena:   { name: '경기장', bg: 'sports/assets/athletics/athletics_bg_main.webp', guide: 'dog', piece: '🏅', finale: '🏆', done: '멋진 경기였어요!', keys: ['경기장'] },
    village: { name: '마을', bg: 'icons/world-summer.jpg', guide: 'dog', piece: '🏠', finale: '🎆', done: '마을에 불이 반짝반짝 켜졌어요!', keys: ['마을', '광장', '타운', '지도', '안내소', '서비스', '놀이터', '섬', '거리', '인사'] },
    garden:  { name: '정원', bg: 'core/ui/greenhouse.webp', guide: 'rabbit', piece: '🌷', finale: '🌻', done: '정원에 꽃이 가득 피었어요!', keys: ['농장', '온실', '정원'] },
    museum:  { name: '박물관', bg: 'art/jj/scenes/ruins.webp', guide: 'sloth', piece: '🏺', finale: '👑', done: '보물을 모두 찾았어요!', keys: ['박물관', '역사', '유적', '이야기관', '동화'] },
    hall:    { name: '회의장', bg: 'art/scenes/park.jpg', guide: 'elephant', piece: '🗳️', finale: '🤝', done: '모두의 의견이 모였어요!', keys: ['회의', '의사결정', '갈등', '봉사', '권리', '함께 사는', '서류', '계약', '정보 센터', '탐정'] }
  };
  var ORDER = ['museum', 'school', 'garden', 'sea', 'sky', 'forest', 'cafe', 'post', 'station', 'lab', 'hall', 'mart', 'stage', 'gallery', 'village'];
  var SUBJ = { korean: 'post', math: 'mart', social: 'village', science: 'lab', english: 'cafe', art: 'gallery', music: 'stage' };
  function pick(lesson) {
    if (lesson.sceneKey && T[lesson.sceneKey]) return lesson.sceneKey;
    var s = lesson.space || '';
    var best = null;
    ORDER.forEach(function (k) { T[k].keys.forEach(function (w) { if (!best && s.indexOf(w) >= 0) best = k; }); });
    if (lesson.subject === 'music') best = 'stage';
    if (lesson.subject === 'art' && best !== 'museum') best = best === 'garden' ? 'garden' : 'gallery';
    return best || SUBJ[lesson.subject] || 'village';
  }
  /* 안내자: 교과 별의 별지기 (그림이 없으면 예전 동물) */
  var GUIDE = { physical: 'ok', korean: 'ok', english: 'ok', music: 'sea', art: 'sea', math: 'love', science: 'love', social: 'dream' };
  var ART = {}; ((window.OKS_ART && window.OKS_ART.ready) || []).forEach(function (p) { ART[p] = 1; });
  function guideSrc(lesson, t, pose) {
    var g = GUIDE[lesson.subject], p = g && 'art/char/' + g + '_' + pose + '.webp';
    if (g === 'ok' && pose === 'cheer') p = 'art/char/ok_clap.webp';
    return p && ART[p] ? p : 'art/jj/animals/' + t.guide + '.webp';
  }
  function src(k, kind) { var name = kind === 'piece' ? k + '_piece' : k; return READY.indexOf(name) >= 0 ? 'art/scene/' + name + '.webp' : null; }

  /* 장면 띠 달기 */
  function mount(sh, lesson, rounds) {
    var k = pick(lesson), t = T[k];
    var bg = lesson.sceneBg || src(k) || t.bg, pieceImg = src(k, 'piece');
    var strip = E('div', 'scene-strip');
    strip.style.backgroundImage = 'url(' + O.ROOT + bg + ')';
    strip.innerHTML = '<img class="sc-guide" src="' + O.ROOT + guideSrc(lesson, t, 'wave') + '" alt=""><div class="sc-title">〈' + O.esc(lesson.space) + '〉</div>' +
      '<div class="sc-track"></div><div class="sc-combo"></div>';
    var track = strip.querySelector('.sc-track'), slots = [];
    for (var i = 0; i < rounds; i++) {
      var sl = E('span', 'sc-slot' + (i === rounds - 1 ? ' last' : ''), i === rounds - 1 ? '🎁' : '');
      track.appendChild(sl); slots.push(sl);
    }
    sh.app.insertBefore(strip, sh.boardWrap || sh.board);
    /* 안내 말풍선을 장면 띠 안으로: 안내자(별지기) 한 명 + 문제 + 진행 칸을 한곳에 */
    if (sh.askEl) { var main = E('div', 'sc-main'); main.appendChild(sh.askEl); main.appendChild(strip.querySelector('.sc-track')); strip.appendChild(main); strip.classList.add('has-ask'); }
    sh.board.style.setProperty('--scene', 'url(' + O.ROOT + bg + ')');
    /* 화면 전체 배경 = 이 차시의 장면 하나 (선명하게) */
    document.body.style.setProperty('--play-bg', 'url(' + O.ROOT + bg + ')'); document.body.classList.add('has-scene-bg');
    var combo = 0, maxCombo = 0, goodN = 0;
    var guide = strip.querySelector('.sc-guide'), comboEl = strip.querySelector('.sc-combo');
    function hop() { guide.classList.remove('hop'); void guide.offsetWidth; guide.classList.add('hop'); }
    function pieceHtml() { return pieceImg ? '<img src="' + O.ROOT + pieceImg + '" alt="">' : '<b>' + t.piece + '</b>'; }
    return {
      key: k, tpl: t,
      now: function (i) { slots.forEach(function (s, j) { s.classList.toggle('now', j === i); }); },
      bonus: function () {
        sh.board.classList.add('bonus-round');
        var b = E('div', 'bonus-banner', '🎁 보너스 판!'); document.body.appendChild(b); setTimeout(function () { b.remove(); }, 1600);
        O.sfx('coin'); O.say('보너스 판이에요!', { noRepeat: true });
      },
      advance: function (i, good) {
        var s = slots[i]; if (!s) return;
        s.classList.remove('now'); s.classList.add('got', good ? 'good' : 'ok'); s.innerHTML = pieceHtml();
        hop();
        if (good) { combo++; goodN++; maxCombo = Math.max(maxCombo, combo); } else combo = 0;
        if (combo >= 2) {
          comboEl.textContent = combo + ' 콤보!'; comboEl.classList.remove('pop'); void comboEl.offsetWidth; comboEl.classList.add('pop');
          O.sfx('coin'); if (combo === 3 || combo === 5) O.say(combo + '번 연속! 대단해요!', { noRepeat: true });
        }
        [0, 1, 2, 3, 4, 5].forEach(function (n) { var p = E('i', 'sc-spark'); p.style.left = (s.offsetLeft + s.offsetWidth / 2) + 'px'; p.style.setProperty('--dx', (Math.random() * 80 - 40) + 'px'); p.style.setProperty('--dy', (-30 - Math.random() * 50) + 'px'); strip.appendChild(p); setTimeout(function () { p.remove(); }, 800); });
      },
      finale: function () {
        sh.board.classList.remove('bonus-round');
        strip.classList.add('complete');
        var f = E('div', 'sc-finale', '<div class="card"><span>' + t.finale + '</span><b>' + O.esc(t.done) + '</b><small>〈' + O.esc(lesson.space) + '〉 완성!</small></div>');
        for (var c = 0; c < 36; c++) { var q = E('i', 'confetti'); q.style.left = Math.random() * 100 + '%'; q.style.background = ['#ff7a59', '#ffd54f', '#43a047', '#1e88e5', '#ec407a'][c % 5]; q.style.animationDelay = (Math.random() * 0.4) + 's'; f.appendChild(q); }
        document.body.appendChild(f); setTimeout(function () { f.remove(); }, O.settings().calm ? 600 : 2400);
        O.sfx('win'); guide.src = O.ROOT + guideSrc(lesson, t, 'cheer'); hop();
        return O.say(t.done, { noRepeat: true }).then(function () { return O.wait(O.settings().calm ? 200 : 900); });
      },
      stats: function () { return { maxCombo: maxCombo, good: goodN }; }
    };
  }
  window.OKS_SCENE = { T: T, pick: pick, mount: mount, READY: READY };
})();
