window.OKS_SPORTS_DATA = {
  source: '2022 개정 특수교육 기본 교육과정 체육·즐거운 생활',
  principles: [
    '움직임과 스포츠를 직접 경험하며 기능을 익힌다.',
    '알기 → 따라 하기 → 직접 하기 → 게임에 적용하기 순으로 난이도를 높인다.',
    '학생의 운동 기능과 교육적 요구에 맞게 규칙·거리·속도·보기 수를 조절한다.',
    '놀이와 신체활동에 안전하고 즐겁게 참여하도록 한다.',
    '다른 학생과 비교하기보다 개인의 시작점과 변화 정도를 기록한다.'
  ],
  levels: [
    {n:1,name:'느껴 보기',desc:'큰 그림·소리·한 번 누르기로 종목을 경험해요.'},
    {n:2,name:'따라 해 보기',desc:'2개 보기에서 알맞은 동작과 도구를 골라요.'},
    {n:3,name:'직접 해 보기',desc:'순서·방향·타이밍을 직접 조작해요.'},
    {n:4,name:'게임에 써 보기',desc:'간단한 규칙이 있는 미니게임에 적용해요.'},
    {n:5,name:'스스로 즐기기',desc:'스스로 선택하고 기록하며 생활 속 활동으로 이어가요.'}
  ],
  festivals: [
    {id:'summer',name:'하계 올림픽',sub:'달리고 · 뛰고 · 헤엄치고 · 겨뤄요',image:'assets/summer_hub.webp',active:true},
    {id:'winter',name:'동계 올림픽',sub:'눈과 얼음 위 스포츠',emo:'❄️',active:false},
    {id:'summer_para',name:'하계 패럴림픽',sub:'함께 즐기는 여름 스포츠',emo:'♿',active:false},
    {id:'winter_para',name:'동계 패럴림픽',sub:'함께 즐기는 겨울 스포츠',emo:'🏂',active:false},
    {id:'asian',name:'아시안게임',sub:'아시아의 다양한 스포츠',emo:'🏅',active:false}
  ],
  sports: [
    {id:'athletics',name:'육상',emo:'🏃',color:'#ff8b45',title:'달리고 뛰며 기록해요',goal:'출발·달리기·도착의 순서를 알고 안전하게 움직여요.',concepts:['출발','달리기','도착','기록','안전'],image:'assets/sports_building_athletics.webp',scene:'assets/athletics.webp'},
    {id:'swimming',name:'수영',emo:'🏊',color:'#38bdf8',title:'물에서 안전하게 움직여요',goal:'수영장의 기본 시설과 안전 약속을 알고 기초 움직임을 경험해요.',concepts:['수영장','레인','고글','호흡','안전'],image:'assets/sports_building_swimming.webp',scene:'assets/swimming.webp'},
    {id:'archery',name:'양궁',emo:'🏹',color:'#76c94f',title:'과녁의 중심을 향해요',goal:'과녁과 방향을 살피고 주의 집중하여 목표를 맞혀요.',concepts:['과녁','중심','방향','집중','안전'],image:'assets/sports_building_archery.webp',scene:'assets/archery.webp'},
    {id:'gymnastics',name:'체조',emo:'🤸',color:'#bf78ef',title:'몸의 균형을 느껴요',goal:'서기·팔 벌리기·한 발 균형 동작을 차례로 경험해요.',concepts:['자세','균형','순서','몸','안전'],image:'assets/sports_building_gymnastics.webp',scene:'assets/gymnastics.webp'},
    {id:'taekwondo',name:'태권도',emo:'🥋',color:'#ef6c68',title:'기본 발차기를 익혀요',goal:'준비 자세와 발차기 방향을 알고 안전한 목표를 향해 움직여요.',concepts:['준비','발차기','방향','예절','안전'],image:'assets/sports_building_taekwondo.webp',scene:'assets/taekwondo.webp'},
    {id:'soccer',name:'축구',emo:'⚽',color:'#f3c24b',title:'공을 목표로 보내요',goal:'공과 골대의 관계를 알고 발로 공을 보내는 기초 움직임을 경험해요.',concepts:['공','골대','차기','패스','협동'],image:'assets/sports_building_soccer.webp',scene:'assets/soccer.webp'},
    {id:'baseball',name:'야구',emo:'⚾',color:'#3b82f6',title:'공을 보고 치고 달려요',goal:'공을 끝까지 보고 방망이를 휘두른 뒤 베이스로 달리는 야구의 기본을 경험해요.',concepts:['공','방망이','스트라이크','베이스','세이프'],image:'assets/baseball/card_baseball.webp',scene:'assets/baseball/scene.webp'},
    {id:'basketball',name:'농구',emo:'🏀',color:'#ff8b45',title:'공을 주고받고 골대에 던져요',goal:'공을 주고받고 알맞은 힘으로 골대를 향해 던지며 함께 즐기는 농구의 기본을 경험해요.',concepts:['공','패스','드리블','슛','골대'],image:'assets/ballcenter/card_basketball.webp',scene:'assets/basketball/bg_gym.webp'},
    {id:'rugby',name:'럭비',emo:'🏉',color:'#2fa84f',title:'공을 안고 달리고 패스해요',goal:'공을 안고 달리다가 옆 친구에게 패스하고 끝 선에 공을 내려놓는 태그 럭비의 기본을 경험해요.',concepts:['공','깃발','패스','달리기','트라이'],image:'assets/ballcenter/card_rugby.webp',scene:'assets/rugby/bg_side.webp'},
    {id:'tennis',name:'테니스',emo:'🎾',color:'#3b82f6',title:'공을 보고 라켓으로 쳐요',goal:'공을 끝까지 보고 라켓을 휘둘러 네트 너머로 보내며 친구와 주고받는 테니스의 기본을 경험해요.',concepts:['라켓','공','네트','서브','랠리'],image:'assets/ballcenter/card_tennis.webp',scene:'assets/tennis/bg_scene.webp'},
    {id:'tabletennis',name:'탁구',emo:'🏓',color:'#ef6c68',title:'작은 공을 주고받아요',goal:'탁구대에 튕기는 작은 공을 끝까지 보고 탁구채로 쳐서 친구와 주고받는 탁구의 기본을 경험해요.',concepts:['탁구채','공','탁구대','서브','랠리'],image:'assets/ballcenter/card_tabletennis.webp',scene:'assets/tabletennis/bg_scene.webp'}
  ],
  summerBuildings: [
    {id:'athletics',type:'sport',name:'육상 경기장',sub:'달리기 · 허들 · 이어달리기',image:'assets/sports_building_athletics.webp',color:'#ff8b45'},
    {id:'swimming',type:'sport',name:'수영 센터',sub:'물놀이 안전 · 기초 수영',image:'assets/sports_building_swimming.webp',color:'#38bdf8'},
    {id:'archery',type:'sport',name:'양궁장',sub:'과녁 · 방향 · 집중',image:'assets/sports_building_archery.webp',color:'#76c94f'},
    {id:'gymnastics',type:'sport',name:'체조관',sub:'균형 · 순서 · 표현',image:'assets/sports_building_gymnastics.webp',color:'#bf78ef'},
    {id:'taekwondo',type:'sport',name:'태권도장',sub:'예절 · 방향 · 발차기',image:'assets/sports_building_taekwondo.webp',color:'#ef6c68'},
    {id:'soccer',type:'sport',name:'축구장',sub:'공 · 패스 · 협동',image:'assets/sports_building_soccer.webp',color:'#f3c24b'},
    {id:'info',type:'utility',name:'볼 스포츠 센터',sub:'야구 · 농구 · 럭비 · 테니스 · 탁구',image:'assets/sports_building_info_center.webp',color:'#4cb9e9'},
    {id:'medal',type:'utility',name:'메달 하우스',sub:'나의 기록 · 참여 메달',image:'assets/sports_building_medal_house.webp',color:'#f4b83f'},
    {id:'play',type:'utility',name:'놀이 체험장',sub:'가볍게 몸을 움직여요',image:'assets/sports_building_play_zone.webp',color:'#65c77a'},
    {id:'training',type:'utility',name:'복습 훈련장',sub:'배운 종목 다시 연습하기',image:'assets/sports_building_training_zone.webp',color:'#7e9ee8'}
  ],
  lessons: {
    athletics:[
      {id:'know',no:'1',name:'육상과 친해져요',goal:'출발선, 트랙, 결승선을 알아봐요.'},
      {id:'move',no:'2',name:'달리기 움직임',goal:'출발하고 달려서 도착하는 순서를 익혀요.'},
      {id:'safe',no:'3',name:'기록과 안전',goal:'나의 기록을 살펴보고 안전한 달리기 약속을 익혀요.'}
    ],
    swimming:[
      {id:'know',no:'1',name:'수영장과 도구',goal:'수영장, 레인, 물안경을 알아봐요.'},
      {id:'move',no:'2',name:'물에서 움직여요',goal:'호흡과 기초 움직임을 차례로 경험해요.'},
      {id:'safe',no:'3',name:'물놀이 안전',goal:'준비운동과 안전 약속을 익혀요.'}
    ],
    archery:[
      {id:'know',no:'1',name:'양궁과 과녁',goal:'활과 과녁의 생김새와 중심을 알아봐요.'},
      {id:'move',no:'2',name:'중심을 향해요',goal:'방향을 살피고 목표 가까이에 맞혀요.'},
      {id:'safe',no:'3',name:'집중과 안전',goal:'차례와 안전 약속을 지키며 집중해요.'}
    ],
    gymnastics:[
      {id:'know',no:'1',name:'체조 동작 알아보기',goal:'서기와 팔 벌리기 동작을 알아봐요.'},
      {id:'move',no:'2',name:'균형 잡기',goal:'몸의 균형을 잡는 기초 동작을 해 봐요.'},
      {id:'safe',no:'3',name:'순서와 안전',goal:'동작 순서를 지키고 안전하게 움직여요.'}
    ],
    taekwondo:[
      {id:'know',no:'1',name:'태권도와 예절',goal:'준비 자세와 기본 예절을 알아봐요.'},
      {id:'move',no:'2',name:'발차기 방향',goal:'왼쪽과 오른쪽 목표를 향해 움직여요.'},
      {id:'safe',no:'3',name:'안전하게 겨뤄요',goal:'거리와 차례를 지키며 안전하게 연습해요.'}
    ],
    soccer:[
      {id:'know',no:'1',name:'축구와 공',goal:'공, 골대, 경기장을 알아봐요.'},
      {id:'move',no:'2',name:'차고 패스해요',goal:'발로 공을 보내는 기초 움직임을 경험해요.'},
      {id:'safe',no:'3',name:'함께하는 축구',goal:'빈 공간을 찾고 친구와 협동해요.'}
    ]
  }
};