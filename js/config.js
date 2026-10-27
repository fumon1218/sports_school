// 설정 파일 — 제목, 건물·체험 구역 배치, 종목 목록을 여기서 바꿉니다.
// 기관명·연락처·주소는 공개 저장소에 올라가므로 넣지 않았습니다. 필요하면 배포 전에 직접 고쳐 쓰세요.

export const CONFIG = {
  schoolName: '한국교원대학교부설특수학교',   // 시작 화면 제목, 정문 간판, 브라우저 탭 제목에 쓰입니다
  title: '한국교원대학교부설특수학교',
  subtitle: '체육 중점 스포츠 마을 · 걸어서 둘러보고 스포츠를 체험해요',
  levelEasy: 1,            // 쉬운 모드에서 시작하는 게임 수준 (1~5)
  levelNormal: 3,
  autoEnterSeconds: 1.4,   // 쉬운 모드에서 입장 원 안에 서 있으면 자동 입장하는 시간(초)
};

// 종목. open:true 이면 기존 게임에 연결, false 이면 '곧 열려요'.
// 기존 게임은 games/oks/ (옥쌤의 즐거운 교실 씽씽별 체육) 에서 가져왔습니다.
const GAME = (sport) => `games/oks/sports/?festival=summer&sport=${sport}&school=elem&lesson=1`;
const SCH = (id) => `games/school/${id}/?play=1`;
export const SPORTS = [
  { id: 'swimming', name: '수영', color: '#4aa3df', open: true, url: SCH('swimming'), sub: '물에서 힘차게 나아가요' },
  { id: 'athletics', name: '육상', color: '#ff8b45', open: true, url: GAME('athletics'), sub: '달리고 뛰어요' },
  { id: 'tabletennis', name: '탁구', color: '#f2b705', open: true, url: GAME('tabletennis'), sub: '작은 공을 주고받아요' },
  { id: 'badminton', name: '배드민턴', color: '#5bbf5a', open: true, url: SCH('badminton'), sub: '셔틀콕을 주고받아요' },
  { id: 'taekwondo', name: '태권도', color: '#9b7be0', open: true, url: SCH('taekwondo'), sub: '발차기로 송판을 격파해요' },
  { id: 'tennis', name: '테니스', color: '#ec6fa0', open: true, url: GAME('tennis'), sub: '공을 라켓으로 쳐요' },
  { id: 'judo', name: '유도', color: '#4f86e0', open: true, url: SCH('judo'), sub: '안전하게 넘어지고 일어나요' },
];

// 월드 좌표: x는 오른쪽, z는 화면 아래쪽(남쪽). 1 = 약 1m.
// 배치는 assets/ui/campus_map.webp(캠퍼스 조감도)와 비슷하게 맞췄습니다.
export const WORLD = { minX: -80, maxX: 80, minZ: -50, maxZ: 64 };
export const MAP = { img: 'assets/ui/campus_map.webp', minX: -45, maxX: 45, minZ: -30, maxZ: 30 };
export const PLAYER_START = { x: 0, z: 31.5 };
export const GUIDE_POS = { x: 4.5, z: 16 };

// model: assets/models/ 의 glb (없으면 임시 도형). size: 모델의 가장 긴 변 길이.
// dim: 모델 크기 비율 [가로, 높이, 세로] — 충돌 범위 계산용. rotY: 모델 앞면이 남쪽(+z)을 보도록 돌리는 각도(도).
// zone: 입장 원 위치. kind 'lobby' = 체육관 로비, 'game' = 해당 종목 게임으로 바로 입장.
export const BUILDINGS = [
  { id: 'gym', label: '체육관', model: 'gym.glb', size: 18, dim: [1, 0.47, 0.92], x: -30, z: -21, rotY: 0, zone: { kind: 'lobby', x: -30, z: -10.4 } },
  { id: 'teacher', label: '교사동', model: 'teacher.glb', size: 26, dim: [1, 0.42, 0.51], x: 0, z: -23, rotY: 0, soon: true },
  { id: 'pool', label: '수영장동', model: 'pool.glb', size: 20, dim: [1, 0.28, 0.99], x: 30, z: -18, rotY: 0, open: true, zone: { kind: 'game', sport: 'swimming', label: '수영', x: 16.3, z: -20 } },
  { id: 'dorm', label: '생활관', model: 'dorm.glb', size: 22, dim: [1, 0.32, 0.59], x: 32, z: 1, rotY: 0, soon: true },
  { id: 'hall', label: '안내관', model: 'hall.glb', size: 13, dim: [0.76, 0.44, 1], x: 16.5, z: -3.5, rotY: 0, zone: { kind: 'info', x: 9.8, z: -4.6 } },
  { id: 'expo', label: '전시관', model: 'expo.glb', size: 12, dim: [1, 0.28, 0.7], x: -15, z: -10.5, rotY: 0, soon: true },
  { id: 'stadium', label: '운동장', model: 'stadium.glb', size: 30, dim: [1, 0.16, 0.66], x: -28, z: 8, rotY: 0, soon: false, ring: { a: 14.4, b: 9.4, gap: 0.5 } },
];

// 체험 구역: 들어가면 해당 종목 게임이 바로 열립니다. (open:false 종목은 '곧 열려요')
export const STATIONS = [
  { id: 'st-tt', sport: 'tabletennis', label: '탁구', model: 'pingpong.glb', size: 4.4, dim: [0.66, 0.38, 1], x: -6, z: 10, rotY: 0 },
  { id: 'st-tn', sport: 'tennis', label: '테니스', model: 'tennis.glb', size: 12, dim: [0.74, 0.22, 1], x: 12, z: 10, rotY: 0 },
  { id: 'st-at', sport: 'athletics', label: '육상', model: 'hurdles.glb', size: 11, dim: [0.62, 0.26, 1], x: 22, z: 10, rotY: 0 },
  { id: 'st-tk', sport: 'taekwondo', label: '태권도', model: 'boxing.glb', size: 8, dim: [1, 0.52, 0.96], x: 31, z: 11, rotY: 0 },
  { id: 'st-bd', sport: 'badminton', label: '배드민턴', model: 'badminton.glb', size: 9, dim: [1, 0.2, 0.5], x: 40, z: 22, rotY: 0 },
  { id: 'st-jd', sport: 'judo', label: '유도', model: 'judo.glb', size: 7.5, dim: [1, 0.17, 0.97], x: 40, z: 10.5, rotY: 0 },
];

// 장식 소품 (충돌 있음)
export const DECOR = [
  { id: 'trophy', model: 'trophy.glb', size: 3.4, dim: [1, 0.96, 0.59], x: 0, z: 0, rotY: 0, r: 1.2, y: 0 },
  { id: 'patio', model: 'patio.glb', size: 13.5, dim: [0.99, 0.45, 0.57], x: -1.5, z: -13.5, rotY: 0, walk: true },
  { id: 'holo1', model: 'holosign.glb', size: 3.6, dim: [0.9, 1, 0.45], x: -9, z: 3, rotY: 0, r: 0.8 },
  { id: 'holo2', model: 'holosign.glb', size: 3.6, dim: [0.9, 1, 0.45], x: 5.0, z: 6.4, rotY: 0, r: 0.8 },
  { id: 'racer', model: 'racer.glb', size: 3.4, dim: [1, 0.46, 0.49], x: -9.5, z: 16, rotY: 90, r: 1.2 },
];

// 벚나무 (모델 복제)
export const CHERRY = [[-9, -5], [8, -10], [-10.5, 8], [3.6, 1.2], [-34, -8], [36, -10], [42, -5], [-5, -27], [8, -27]];
// 일반 나무 (임시 도형)
export const GREEN = [[-42, 22], [-36, 24], [-28, 22], [-20, 24], [-42, 12], [28, 24], [20, 23], [-42, -24], [-42, -2], [46, -26], [14, -27], [-14, -26], [24, 18], [-24, 19], [-17, -14], [20, 8]];

// 정문
export const GATE = { model: 'gate.glb', size: 20, dim: [1, 0.31, 0.55], x: 0, z: 23, rotY: 0, open: 3.2 };

// 학교 울타리 안쪽 범위 (바깥은 열린 자연 지대)
export const CAMPUS = { minX: -44.5, maxX: 50, minZ: -29.5, maxZ: 30.5 };

// 자연 환경 (오픈 월드). file 이 assets/models/nature/ 에 있으면 그 모델을, 없으면 임시 도형을 흩뿌립니다.
// 로블록스 등에서 만든 식물·바위·구조물 glb 를 같은 이름으로 넣으면 자동으로 바뀝니다.
// size: [최소, 최대] 크기, r: 충돌 반지름(0 이면 통과), zone: forest(숲 가장자리) · meadow(들판) · any
export const NATURE = [
  { id: 'tree_a', file: 'tree_a.glb', fallback: 'tree', count: 22, size: [6.5, 9], r: 0.9, zone: 'forest' },
  { id: 'tree_b', file: 'tree_b.glb', fallback: 'tree2', count: 20, size: [6.5, 9.5], r: 0.8, zone: 'forest' },
  { id: 'maple', file: 'maple.glb', fallback: 'tree', count: 12, size: [6, 8.5], r: 0.9, zone: 'forest' },
  { id: 'pine', file: 'pine.glb', fallback: 'pine', count: 32, size: [8, 12], r: 0.8, zone: 'forest' },
  { id: 'palm', file: 'palm.glb', fallback: 'pine', count: 5, size: [6, 8], r: 0.6, zone: 'meadow' },
  { id: 'bush', file: 'bush.glb', fallback: 'bush', count: 46, size: [1.4, 2.4], r: 0.6, zone: 'any' },
  { id: 'rock_a', file: 'rock_a.glb', fallback: 'rock', count: 14, size: [2.2, 4.2], r: 1.1, zone: 'any' },
  { id: 'rock_b', file: 'rock_b.glb', fallback: 'rock', count: 14, size: [1.8, 3.2], r: 0.9, zone: 'any' },
  { id: 'flower', file: 'flower.glb', fallback: 'flower', count: 70, size: [0.7, 1.1], r: 0, zone: 'meadow' },
  { id: 'log', file: 'log.glb', fallback: 'log', count: 8, size: [2.6, 3.6], r: 0.8, zone: 'forest' },
];
export const LAKE = { x: -48, z: 52, r: 13 };

// 안내관(학교 소개 · 육성 종목 · 입학 안내)에 나오는 글. 확정된 내용으로 바꿔 쓰세요.
// 개인정보(전화번호, 주소, 학생 정보)는 공개 저장소에 올라가므로 넣지 않습니다.
export const INFO = {
  about: [
    { h: '체육 중점 특수학교', p: '운동을 통해 몸과 마음이 함께 자라는 특수학교예요. 학생 한 사람 한 사람의 속도에 맞춰 배우고 도전해요.' },
    { h: '모두가 함께하는 시설', p: '문턱 없는 입구와 완만한 경사로, 휠체어 이용 학생을 위한 시설을 갖춘 건물로 만들고 있어요.' },
    { h: '육성 종목 7개', p: '수영, 육상, 탁구, 배드민턴, 태권도, 테니스, 유도를 배우고 체험해요.' },
    { h: '실패해도 괜찮아요', p: '점수를 깎거나 탈락시키지 않아요. 도전하는 모습을 함께 응원해요.' },
  ],
  sports: {
    swimming: '물과 친해지고 몸을 가볍게 움직여요. 휠체어를 이용하는 학생도 함께할 수 있는 승강 시설을 갖춰요.',
    athletics: '달리기, 허들, 이어달리기로 속도와 균형을 길러요. 휠체어 레이싱도 함께해요.',
    tabletennis: '작은 공을 주고받으며 눈과 손의 협응을 길러요. 휠체어도 가까이 설 수 있는 탁구대를 써요.',
    badminton: '라켓으로 셔틀콕을 쳐 넘기며 반응 속도를 길러요.',
    taekwondo: '품새와 발차기로 몸의 균형과 자신감을 길러요.',
    tennis: '라켓으로 공을 쳐서 네트 너머로 보내며 친구와 주고받아요.',
    judo: '매트 위에서 안전하게 넘어지고 일어나는 법을 익히며 서로 존중하는 마음을 배워요.',
  },
  admission: {
    note: '입학 전형 안내는 확정되는 대로 이곳에 알려 드려요.',
    items: [   // text 가 비어 있으면 '준비 중이에요'로 보입니다
      { h: '모집 대상', p: '중학교 1학년부터 입학할 수 있어요.' },
      { h: '지원 시기', p: '' },
      { h: '전형 방법', p: '' },
      { h: '준비할 것', p: '' },
      { h: '문의', p: '' },
    ],
  },
};
