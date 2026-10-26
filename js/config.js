// 설정 파일 — 학교 이름, 간판 글자, 건물 배치, 종목 목록을 여기서 바꿉니다.
// 기관명·연락처·주소는 공개 저장소에 올라가므로 넣지 않습니다. 필요하면 배포 전에 직접 고쳐 쓰세요.

export const CONFIG = {
  title: '스포츠 마을',
  subtitle: '걸어서 둘러보고, 건물에 들어가 체험해요',
  // 광장 간판에 얹는 글자 (모델의 빈 간판 판 위에 앱이 그려 줍니다)
  signs: { gate: '어서 와요', gym: '체육관', teacher: '교사동', pool: '수영장동', dorm: '생활관' },
  // 체험 게임 수준: 쉬운 모드 1, 일반 3 (1~5)
  levelEasy: 1,
  levelNormal: 3,
  // 쉬운 모드에서 입장 원 안에 머무르면 자동으로 들어가는 시간(초)
  autoEnterSeconds: 1.4,
};

// 체육관 안에서 고르는 종목. open:true 이면 기존 게임에 연결, false 이면 '준비 중'.
// 기존 게임은 games/oks/ (옥쌤의 즐거운 교실 씽씽별 체육) 에서 가져왔습니다.
const GAME = (sport) => `games/oks/sports/?festival=summer&sport=${sport}&school=elem&lesson=1`;
export const SPORTS = [
  { id: 'tabletennis', name: '탁구', emo: '🏓', color: '#ef6c68', open: true, url: GAME('tabletennis'), sub: '작은 공을 주고받아요' },
  { id: 'athletics', name: '육상', emo: '🏃', color: '#ff8b45', open: true, url: GAME('athletics'), sub: '달리고 뛰어요' },
  { id: 'tennis', name: '테니스', emo: '🎾', color: '#4caf6a', open: true, url: GAME('tennis'), sub: '공을 라켓으로 쳐요' },
  { id: 'swimming', name: '수영', emo: '🏊', color: '#4aa3df', open: false, sub: '곧 열려요' },
  { id: 'badminton', name: '배드민턴', emo: '🏸', color: '#8e7cc3', open: false, sub: '곧 열려요' },
  { id: 'taekwondo', name: '태권도', emo: '🥋', color: '#e0a526', open: false, sub: '곧 열려요' },
  { id: 'judo', name: '유도', emo: '🥇', color: '#5b7fd1', open: false, sub: '곧 열려요' },
];

// 월드 좌표: x는 오른쪽, z는 화면 아래쪽(남쪽). 단위는 미터 비슷한 값.
// model: assets/models/ 에 이 이름의 glb 를 넣으면 임시 도형 대신 자동으로 쓰입니다.
// w,d,h: 건물이 차지할 가로·세로·높이 (glb 는 이 발자국에 맞춰 크기가 조절됩니다)
// signY: 간판 판의 높이 (glb 로 바꾸면 모델에 맞게 조절)
// rotY: glb 의 앞면이 남쪽(+z)을 보도록 돌리는 각도(도)
export const BUILDINGS = [
  { id: 'gym', label: '체육관', x: 0, z: -22, w: 20, d: 13, h: 10, model: 'gym.glb', rotY: 0, enter: true, sign: 'gym', signY: 5.6 },
  { id: 'teacher', label: '교사동', x: -26, z: -8, w: 16, d: 9, h: 12, model: 'teacher.glb', rotY: 0, enter: false, sign: 'teacher', signY: 5.2, color: 0xe9dcc6 },
  { id: 'pool', label: '수영장동', x: 26, z: -8, w: 16, d: 9, h: 7, model: 'pool.glb', rotY: 0, enter: false, sign: 'pool', signY: 5.2, color: 0xcfe8f7 },
  { id: 'dorm', label: '생활관', x: -27, z: 16, w: 12, d: 10, h: 10, model: 'dorm.glb', rotY: 0, enter: false, sign: 'dorm', signY: 5.2, color: 0xf2e4d3 },
];

// 건물이 아닌 물건 중 glb 로 바꿀 수 있는 것
export const PROPS = [
  { id: 'gate', x: 0, z: 29, w: 14, d: 3, h: 6, model: 'gate.glb', rotY: 0 },
  { id: 'track', x: 27, z: 17, w: 26, d: 17, h: 0.6, model: 'track.glb', rotY: 0 },
];

export const WORLD = { minX: -36, maxX: 36, minZ: -33, maxZ: 31 };
export const PLAYER_START = { x: 0, z: 25 };
export const GYM_PORTAL = { x: 0, z: -13.6, r: 2.4 };
export const GUIDE_POS = { x: 6, z: 19 };
