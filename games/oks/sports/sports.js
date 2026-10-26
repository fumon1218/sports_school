(function(){
'use strict';
var O=window.OKS,D=window.OKS_SPORTS_DATA,E=O.el;
var q=new URLSearchParams(location.search);
var festival=q.get('festival'),sid=q.get('sport'),school=q.get('school')||'elem',lessonNo=+(q.get('lesson')||1),
    level=Math.max(1,Math.min(5,+(q.get('level')||2))),play=q.get('play')==='1';

var SCHOOLS=[
 {key:'elem',floor:'1층',name:'초등',desc:'기초 움직임과 안전하게 즐기기'},
 {key:'middle',floor:'2층',name:'중등',desc:'기초 기능을 익혀 간이 게임에 적용하기'},
 {key:'high',floor:'3층',name:'고등',desc:'스스로 선택하고 생활 속 스포츠로 이어가기'}
];
var LEVELS=O.LEVELS;

function byId(id){return D.sports.filter(function(s){return s.id===id})[0];}
function schoolInfo(){return SCHOOLS.filter(function(x){return x.key===school})[0]||SCHOOLS[0];}
function top(title,sub,back,label,compact,fit){
 return O.shell({title:title,subtitle:sub,back:back||'../',backLabel:label||'뒤로',level:level,compact:compact!==false,fit:fit==null?compact!==false:fit});
}
function tryBg(el,s){var src=s.scene||s.image,im=new Image();im.onload=function(){el.classList.add('sports-bg');el.style.setProperty('--sport-bg',"url('"+src+"')")};im.src=src;}
function progress(){try{return JSON.parse(localStorage.getItem('oks_sports_progress_v4')||'{}')}catch(e){return{}}}
function save(key,stars,mistakes){
 var p=progress();p[key]=p[key]||{plays:0,best:{}};p[key].plays++;p[key].last=level;p[key].best[level]=Math.max(p[key].best[level]||0,stars||0);p[key].mistakes=mistakes;
 try{localStorage.setItem('oks_sports_progress_v4',JSON.stringify(p))}catch(e){}
}
function info(s,sk,no){
 if(s.id==='athletics'&&window.OKS_ATHLETICS){var c=OKS_ATHLETICS.course(sk,no);return [c.title,c.goal]}
 var map=window.OKS_SPORT_TITLES;

 return (map[s.id]&&map[s.id][sk]&&map[s.id][sk][Math.max(0,Math.min(2,no-1))])||[s.title,s.goal];
}

/* ---------- 씽씽 별 마을 (우리 별 마을과 같은 틀: 지도 배경 + 건물 + 이름표 + 안내자) ---------- */
var HUB_W=1672,HUB_H=941;
var HUB=[
 {id:'summer',name:'하계 올림픽',sub:'달리고 · 뛰고 · 헤엄쳐요',img:'hub_bld_summer',x:840,y:445,w:330,open:true,url:'?festival=summer',say:'하계 올림픽 마을로 들어가요!'},
 {id:'winter',name:'동계 올림픽',sub:'눈과 얼음 위 스포츠',img:'hub_bld_winter',x:895,y:152,w:250,say:'동계 올림픽 마을은 곧 열려요. 조금만 기다려요!'},
 {id:'summer_para',name:'하계 패럴림픽',sub:'함께 즐기는 여름 스포츠',img:'hub_bld_summer_para',x:392,y:308,w:290,say:'하계 패럴림픽 마을은 곧 열려요. 조금만 기다려요!'},
 {id:'winter_para',name:'동계 패럴림픽',sub:'함께 즐기는 겨울 스포츠',img:'hub_bld_winter_para',x:1280,y:312,w:280,say:'동계 패럴림픽 마을은 곧 열려요. 조금만 기다려요!'},
 {id:'asian',name:'아시안게임',sub:'아시아의 다양한 스포츠',img:'hub_bld_asian',x:355,y:632,w:330,say:'아시안게임 마을은 곧 열려요. 조금만 기다려요!'},
 {id:'medal',name:'메달 하우스',sub:'나의 기록 · 참여 메달',img:'hub_bld_medal',x:1340,y:660,w:250,open:true,util:'medal'},
 {id:'info',name:'볼 스포츠 센터',sub:'야구 · 농구 · 럭비 · 테니스 · 탁구',img:'hub_bld_info',x:835,y:714,w:200,open:true,util:'info'}
];
function villageHub(){
 document.body.classList.add('sports-hubmap');
 var root=E('div','sh-root'),
 hello='씽씽 별 마을에 오신 것을 환영해요! 건물을 눌러 보세요. 하계 올림픽 마을부터 시작해요.';
 root.innerHTML='<div class="sh-back" style="background-image:url(assets/hub_map.webp)"></div><div class="sh-scroll"><div class="sh-map"><img class="sh-bg" src="assets/hub_map.webp" alt="씽씽 별 마을 지도"></div></div>'+
  '<div class="sh-top"><a class="oks-pill sh-exit" href="../">🚀 <span>우주로</span></a><div class="sh-title"><b>씽씽 별 마을</b><span>체육 · 놀이 · 건물을 눌러요</span></div><div class="sh-hud"></div></div>'+
  '<div class="sh-guide"><img src="../art/char/ok_wave.webp" alt=""><div class="sh-bubble"></div></div>'+
  '<button type="button" class="sh-tycoon"><img src="assets/baseball/mascot.webp" alt=""><span><b>🏟️ 스포츠 타이쿤</b><small>카드 모으고 구단 키우기</small></span></button>';
 var map=root.querySelector('.sh-map'),bub=root.querySelector('.sh-bubble'),guide=root.querySelector('.sh-guide');
 (function(){var tb=root.querySelector('.sh-tycoon');try{var nn=OKS_TYCOON.owned().length-Object.keys((OKS_TYCOON.load().seen)||{}).filter(function(k){return k!=='_init'}).length;if(nn>0)tb.insertAdjacentHTML('beforeend','<i>NEW '+nn+'</i>')}catch(e){}
  tb.onclick=function(){O.sfx('pop');talk('스포츠 타이쿤으로 가요!');setTimeout(function(){location.href='?tycoon=1'},450)};})();
 function talk(t,speak){bub.textContent=t;guide.dataset.say=t;guide.classList.remove('pop');void guide.offsetWidth;guide.classList.add('pop');guide.classList.remove('quiet');clearTimeout(talk.t);talk.t=setTimeout(function(){guide.classList.add('quiet')},7000);if(speak!==false)O.say(t,{noRepeat:true});}
 guide.onclick=function(){guide.classList.remove('quiet');clearTimeout(talk.t);talk.t=setTimeout(function(){guide.classList.add('quiet')},7000);if(guide.dataset.say)O.say(guide.dataset.say)};
 HUB.forEach(function(b,i){
  var e=E('button','sh-bld'+(b.open?'':' lock'));e.type='button';e.dataset.id=b.id;
  e.style.left=b.x/HUB_W*100+'%';e.style.top=b.y/HUB_H*100+'%';e.style.width=b.w/HUB_W*100+'%';e.style.zIndex=Math.round(b.y);e.style.animationDelay=(i*70)+'ms';
  e.innerHTML='<img class="sh-img" src="assets/'+b.img+'.webp" alt="">'+(b.open?'':'<img class="sh-cloud" src="../art/space/space_cloud.webp" alt="">')+
   '<span class="sh-name"><b>'+O.esc(b.name)+'</b><small>'+(b.open?O.esc(b.sub):'🔒 곧 만나요')+'</small></span>';
  e.onclick=function(){
   if(b.open){O.sfx('pop');if(b.util){utilityBuilding(b.util);return}talk(b.say);setTimeout(function(){location.href=b.url},650);}
   else{O.sfx('tick');talk(b.say);O.toast('이 스포츠 마을은 준비 중이에요');e.classList.remove('shake');void e.offsetWidth;e.classList.add('shake');}
  };
  map.appendChild(e);
 });
 document.body.innerHTML='';document.body.appendChild(root);
 var sc=root.querySelector('.sh-scroll');sc.scrollLeft=(sc.scrollWidth-sc.clientWidth)/2;
 if(O.eco&&O.eco.hud){try{O.eco.hud(root.querySelector('.sh-hud'))}catch(x){}}
 talk(hello);
}
/* ---------- 하계 올림픽 종목 ---------- */
var SUMMER_PADS={athletics:[302,262],swimming:[553,262],archery:[829,262],gymnastics:[1105,262],taekwondo:[1368,262],
 soccer:[277,728],info:[541,728],medal:[829,728],play:[1118,728],training:[1393,728]};
function summerHub(){
 document.body.classList.add('sports-hubmap');
 var root=E('div','sh-root sh-summer'),
 hello='가 보고 싶은 건물을 눌러 보세요.';
 root.innerHTML='<div class="sh-back" style="background-image:url(assets/summer_map.webp)"></div><div class="sh-scroll"><div class="sh-map"><img class="sh-bg" src="assets/summer_map.webp" alt="하계 스포츠 마을 지도"></div></div>'+
  '<div class="sh-top"><a class="oks-pill sh-exit" href="./">🌌 <span>씽씽 별 마을</span></a><div class="sh-title"><b>하계 스포츠 마을</b><span>건물을 눌러 운동과 놀이를 시작해요</span></div><div class="sh-hud"></div></div>'+
  '<div class="sh-guide"><img src="../art/char/ok_wave.webp" alt=""><div class="sh-bubble"></div></div>';
 var map=root.querySelector('.sh-map'),bub=root.querySelector('.sh-bubble'),guide=root.querySelector('.sh-guide');
 function talk(t){bub.textContent=t;guide.dataset.say=t;guide.classList.remove('pop');void guide.offsetWidth;guide.classList.add('pop');guide.classList.remove('quiet');clearTimeout(talk.t);talk.t=setTimeout(function(){guide.classList.add('quiet')},7000);}
 guide.onclick=function(){guide.classList.remove('quiet');clearTimeout(talk.t);talk.t=setTimeout(function(){guide.classList.add('quiet')},7000);if(guide.dataset.say)O.say(guide.dataset.say)};
 var prog=progress(),today=null;
 function starsOf(id){var tot=0,plays=0;Object.keys(prog).forEach(function(k){if(k===id||k.indexOf(id+'-')===0){var x=prog[k]||{};plays+=x.plays||0;Object.keys(x.best||{}).forEach(function(lv){tot+=x.best[lv]||0})}});return {tot:tot,plays:plays}}
 var sportsB=(D.summerBuildings||[]).filter(function(b){return b.type==='sport'});
 for(var q=0;q<sportsB.length;q++){if(!starsOf(sportsB[q].id).plays){today=sportsB[q].id;break}}
 (D.summerBuildings||[]).forEach(function(b,i){
  var pad=SUMMER_PADS[b.id]||[836,470],e=E('button','sh-bld'+(b.id===today?' today':''));e.type='button';e.dataset.id=b.id;
  var w=b.id==='training'?236:250;
  e.style.left=pad[0]/HUB_W*100+'%';e.style.top=pad[1]/HUB_H*100+'%';e.style.width=w/HUB_W*100+'%';e.style.zIndex=pad[1]+i;e.style.animationDelay=(i*60)+'ms';e.style.setProperty('--bcolor',b.color||'#55cfff');
  var st=b.type==='sport'?starsOf(b.id):null;
  e.innerHTML='<img class="sh-img" src="assets/sb_'+b.id+'.webp" alt="">'+
   (b.id===today?'<span class="sh-today">오늘!</span>':'')+(st&&st.tot?'<span class="sh-stars">★ '+st.tot+'</span>':'')+
   '<span class="sh-name"><b>'+O.esc(b.name)+'</b><small>'+O.esc(b.sub)+'</small></span>';
  e.onclick=function(){
   O.sfx('pop');
   if(b.type==='sport'){talk(b.name+'으로 가요!');setTimeout(function(){location.href='?festival=summer&sport='+b.id},500);return}
   utilityBuilding(b.id);
  };
  map.appendChild(e);
 });
 document.body.innerHTML='';document.body.appendChild(root);
 var sc=root.querySelector('.sh-scroll');sc.scrollLeft=(sc.scrollWidth-sc.clientWidth)/2;
 if(O.eco&&O.eco.hud){try{O.eco.hud(root.querySelector('.sh-hud'))}catch(x){}}
 var t=today&&byId(today);talk(t?hello+' 오늘은 '+t.name+'부터!':hello);
}
function utilityBuilding(id){
 var old=document.querySelector('.summer-utility-modal');if(old)old.remove();
 var modal=E('div','summer-utility-modal'),box=E('section','summer-utility-box'),close=E('button','summer-utility-close','×');
 close.type='button';close.setAttribute('aria-label','닫기');close.onclick=function(){modal.remove();O.sfx('pop')};
 box.appendChild(close);
 var data=(D.summerBuildings||[]).filter(function(x){return x.id===id})[0]||{};
 var head=E('div','summer-utility-head','<img src="'+(id==='info'?'assets/ballcenter/center_building.webp':(data.image||''))+'" alt=""><div><small>하계 스포츠 마을</small><h2>'+(data.name||'스포츠 안내')+'</h2><p>'+(data.sub||'')+'</p></div>');
 box.appendChild(head);
 var body=E('div','summer-utility-body');box.appendChild(body);
 if(id==='info'){
   var BALLS=[
    {id:'baseball',name:'야구',emo:'⚾',open:true,img:'assets/ballcenter/card_baseball.webp',ic:'assets/ballcenter/icon_baseball.webp',sub:'공을 보고 치고 달려요'},
    {id:'basketball',name:'농구',emo:'🏀',open:true,img:'assets/ballcenter/card_basketball.webp',ic:'assets/ballcenter/icon_basketball.webp',sub:'공을 던져 골대에 넣어요'},
    {id:'rugby',name:'럭비',emo:'🏉',open:true,img:'assets/ballcenter/card_rugby.webp',ic:'assets/ballcenter/icon_rugby.webp',sub:'공을 들고 달리고 패스해요'},
    {id:'tennis',name:'테니스',emo:'🎾',open:true,img:'assets/ballcenter/card_tennis.webp',ic:'assets/ballcenter/icon_tennis.webp',sub:'공을 라켓으로 쳐요'},
    {id:'tabletennis',name:'탁구',emo:'🏓',open:true,img:'assets/ballcenter/card_tabletennis.webp',ic:'assets/ballcenter/icon_tabletennis.webp',sub:'작은 공을 주고받아요'}];
   var pr=progress(),gates=E('div','ball-gates');
   BALLS.forEach(function(g){
    var tot=0,plays=0;Object.keys(pr).forEach(function(k){if(k.indexOf(g.id+'-')===0){var x=pr[k]||{};plays+=x.plays||0;Object.keys(x.best||{}).forEach(function(lv){tot+=x.best[lv]||0})}});
    var c=E(g.open?'a':'button','ball-gate'+(g.open?'':' lock'));if(g.open){c.href='?festival=summer&sport='+g.id}else c.type='button';
    c.innerHTML='<span class="ball-pic"><img src="'+g.img+'" alt=""><img class="ball-ic" src="'+g.ic+'" alt=""></span><b>'+g.name+'</b><small>'+(g.open?g.sub:'🔒 곧 열려요')+'</small>'+(tot?'<i>★ '+tot+'</i>':'');
    if(!g.open)c.onclick=function(){O.sfx('tick');O.toast(g.name+' 경기장은 준비 중이에요');O.say(g.name+'은 곧 열려요')};
    gates.appendChild(c);
   });
   body.innerHTML='<div class="ball-lobby" style="background-image:url(assets/ballcenter/center_lobby.webp)"></div><p class="summer-note">좋아하는 공 운동을 골라 보세요. 야구부터 열려 있어요.</p>';body.appendChild(gates);
   body.insertAdjacentHTML('beforeend','<div class="summer-tip"><b>오늘은 이렇게 시작해요</b><p>처음이라면 야구 1수준 ‘느껴 보기’부터 시작해 보세요. 공이 멈추면 단추를 눌러 휘두르면 돼요. 학생의 반응 속도에 따라 수준을 자유롭게 바꿀 수 있어요.</p></div>');
 }else if(id==='medal'){
   var p=progress(),keys=Object.keys(p),plays=0,stars=0;
   keys.forEach(function(k){if(k.indexOf('-')<0)return;var x=p[k]||{};plays+=x.plays||0;Object.keys(x.best||{}).forEach(function(lv){stars+=x.best[lv]||0})});
   body.innerHTML='<div class="summer-medal-stats"><div><b>'+plays+'</b><small>참여한 활동</small></div><div><b>'+stars+'</b><small>모은 별</small></div><div><b>'+keys.length+'</b><small>기록된 차시</small></div></div><p class="summer-note">순위보다 참여와 나의 변화가 더 중요해요. 같은 종목도 다른 수준으로 다시 도전할 수 있어요.</p>';
 }else if(id==='play'){
   body.innerHTML='<p class="summer-note">수업 사이에 짧고 즐겁게 몸을 움직이는 놀이 공간이에요.</p>';
   var l=E('a','oks-btn blue','🎮 미니게임 놀이터 가기');l.href='../minigames/';body.appendChild(l);
 }else{
   body.innerHTML='<p class="summer-note">배웠던 종목을 골라 다시 연습해 보세요. 각 경기장에서 학년과 수준을 다시 선택할 수 있어요.</p><div class="summer-training-links"></div>';
   var links=body.querySelector('.summer-training-links');
   D.sports.forEach(function(s){var a=E('a','summer-training-link','<img src="'+s.image+'" alt=""><span><b>'+s.name+'</b><small>'+s.title+'</small></span>');a.href='?festival=summer&sport='+s.id;var im=a.querySelector('img');im.onerror=function(){if(s.scene&&this.src.indexOf(s.scene)<0)this.src=s.scene};links.appendChild(a)});
 }
 modal.onclick=function(e){if(e.target===modal)modal.remove()};modal.appendChild(box);document.body.appendChild(modal);
}

/* ---------- ⚾ 스타 리그 (야구 전문가반) ---------- */
function proUnlocked(){
 var p=progress(),ok=[1,2,3].every(function(n){return (p['baseball-high-'+n]||{}).plays>0});
 var open=false;try{open=localStorage.getItem('oks_pro_open')==='1'||!!O.settings().openAll}catch(e){}
 return ok||open;
}
function proBlock(){
 var P=window.OKS_PRO;if(!P)return null;
 var p=progress(),done=[1,2,3].filter(function(n){return (p['baseball-high-'+n]||{}).plays>0}).length,un=proUnlocked();
 var box=E('section','pro-block'+(un?'':' lock'));
 box.innerHTML='<div class="pro-head"><span class="pro-ic">'+(un?'🌟':'🔒')+'</span><div><h2>⚾ '+P.NAME+' <small>야구 전문가반</small></h2><p>'+(un?'기초를 모두 마친 선수들을 위한 진짜 야구! 하고 싶은 방식을 골라요.':'고등 1~3차시를 한 번씩 마치면 열려요. 지금 '+done+'/3')+'</p></div></div>';
 var modes=E('div','pro-modes');
 ['a','b','c'].forEach(function(k){
  var m=P.MODES[k],c=E('div','pro-mode'),lv='';
  O.LEVELS.forEach(function(L){lv+=un?'<a href="?festival=summer&sport=baseball&pro=1&mode='+k+'&school=high&lesson=1&level='+L.n+'&play=1" title="'+O.esc(L.name)+'">'+L.n+'</a>':'<span>'+L.n+'</span>'});
  c.innerHTML='<div class="pro-mic">'+m.emo+'</div><b>'+String.fromCharCode(65+['a','b','c'].indexOf(k))+'. '+m.name+'</b><small>'+m.desc+'</small><div class="pro-lv"><em>수준</em>'+lv+'</div>';
  modes.appendChild(c);
 });
 box.appendChild(modes);
 if(!un){
  var t=E('details','pro-teacher','<summary>선생님 · 미리 열기</summary><p>이 기기에서 스타 리그를 미리 열어요. 기초 과정을 건너뛰고 해 볼 수 있어요.</p>');
  var b=E('button','oks-btn blue','🔓 전문가반 열기');b.type='button';b.onclick=function(){try{localStorage.setItem('oks_pro_open','1')}catch(e){}location.reload()};t.appendChild(b);box.appendChild(t);
 }
 return box;
}
function proActivity(){
 var P=window.OKS_PRO,mode=['a','b','c'].indexOf(q.get('mode'))>=0?q.get('mode'):'a',M=P.MODES[mode],lvl=level;
 var sh=top('⚾ '+P.NAME+' · '+M.name,'야구 전문가반','?festival=summer&sport=baseball','야구 목차',true,true);
 document.body.classList.add('oks-play','sports-play');document.title=P.NAME+' · 옥쌤의 즐거운 교실';
 if(O.eco){var ehud=O.eco.hud(sh.menu);sh.menu.insertBefore(ehud,sh.levelBtn);}
 var base='?festival=summer&sport=baseball&pro=1&mode='+mode+'&school=high&lesson=1';
 sh.levelBtn.onclick=function(){
  var ov=E('div','oks-overlay'),box=E('div','oks-finish oks-levelpick');
  box.innerHTML='<h2>수준 고르기</h2><p>'+O.esc(P.NAME+' · '+M.name)+'</p><div class="btns"></div><div class="note">수준을 바꾸면 처음부터 다시 시작해요.</div>';
  O.LEVELS.forEach(function(L){var b=E('button','oks-lv'+(L.n===level?' on':''),'<b>'+L.n+'</b><span><strong>'+L.name+'</strong></span>');b.type='button';b.onclick=function(){location.href=base+'&level='+L.n+'&play=1'};box.querySelector('.btns').appendChild(b)});
  var close=E('button','oks-btn blue','닫기');close.type='button';close.onclick=function(){ov.remove()};box.querySelector('.btns').appendChild(close);ov.appendChild(box);document.body.appendChild(ov);
 };
 var inn=lvl===1?2:3;sh.setLevel(lvl);sh.setRounds(inn*2,0);sh.ask(P.NAME+'! 시작해 볼까요?',{silent:true});
 var start=E('div','oks-start');
 start.innerHTML='<div class="oks-start-lv">'+LEVELS[lvl-1].name+'</div><p class="gdesc">'+M.emo+' <b>'+M.name+'</b> — '+O.esc(M.desc)+'</p><p>'+inn+'이닝 · 3아웃이면 공수 교대 · 이기지 못해도 별은 받아요</p>';
 var go=E('button','oks-btn',O.iconHtml('icon_play.png','시작하기'));go.type='button';start.appendChild(go);sh.board.appendChild(start);
 O.target({get:function(){return go}},Math.min(lvl,2));
 go.onclick=function(){
  O.unlock();O.clearPrompt();
  var st=O.newStats(),ctx={sh:sh,board:sh.board,level:lvl,stats:st,cfg:{},lesson:{topic:P.NAME},id:'sports-baseball-pro'};
  O.kit(ctx);ctx.clear=function(){O.clearPrompt();sh.board.innerHTML='';sh.board.className='oks-board in-scene'};ctx.newStep=function(){sh.mood('idle')};
  st.t0=Date.now();st.glow=0;st.hand=0;ctx.clear();
  var g=P.mount({sh:sh,level:lvl,mode:mode,stats:st,ctx:ctx});
  g.begin().then(function(r){
   var stars=r.stars;save('baseball-pro-'+mode,stars,r.mistakes);
   var sec=Math.round((Date.now()-st.t0)/1000),entry={at:new Date().toISOString(),lesson:'sports-baseball-pro-'+mode,subject:'physical',school:'high',topic:P.NAME+' '+M.name,level:lvl,mistakes:r.mistakes,glow:st.glow,hand:st.hand,asked:st.asked,sec:sec,rounds:inn*2};
   var season=q.get('season')==='1'&&window.OKS_TYCOON?OKS_TYCOON.inning('baseball',stars,{pro:true}):null;
   O.finish({stats:st,entry:entry,title:r.win?'스타 리그 승리!':'멋진 경기였어요!',text:'⚾ '+P.NAME+' · '+M.name+' · '+LEVELS[lvl-1].name+' · '+r.text+' · ⭐ '+r.coins,stars:stars,extraCoins:Math.min(5,Math.floor(r.coins/4)),
    buttons:(season?[{label:season.done?'🏆 시즌 결과 보기':'다음 이닝 ▶ (남은 '+season.left+')',color:'orange',href:'?tycoon=1'}]:[]).concat([
     {label:'한 번 더',onClick:function(){location.reload()}},
     lvl<5?{label:'다음 수준 ('+(lvl+1)+')',color:'orange',href:base+'&level='+(lvl+1)+'&play=1'}:null,
     {label:'다른 모드 고르기',color:'blue',href:'?festival=summer&sport=baseball'},
     {label:'🏟️ 스포츠 타이쿤',color:'blue',href:'?tycoon=1'}
    ]).filter(Boolean)});
  }).catch(function(e){console.error(e);O.toast('앗, 문제가 생겼어요. 다시 시작해 주세요.')});
 };
}
/* ---------- 종목 차시 + 수준 ---------- */
function sportToc(){
 var s=byId(sid);if(!s){summerHub();return}
 var sh=top(s.name+' 경기장','하계 올림픽 · 체육 · 놀이','?festival=summer','하계 올림픽',false);
 sh.ask(s.name+' 경기장이에요. 층을 고르고 차시와 수준을 눌러요.',{silent:true});
 var host=E('div','sport-toc');
 host.innerHTML='<div class="sport-toc-head"><img src="'+s.image+'" alt=""><div><small>하계 스포츠</small><h1>'+s.name+' 경기장</h1><p>'+s.goal+'</p></div></div><div class="sports-floor-tabs"></div><div class="sports-lesson-list"></div>';
 var heroImg=host.querySelector('.sport-toc-head img');heroImg.onerror=function(){if(s.scene&&this.src.indexOf(s.scene)<0)this.src=s.scene};
 var tabs=host.querySelector('.sports-floor-tabs'),list=host.querySelector('.sports-lesson-list'),sel=school;
 SCHOOLS.slice().reverse().forEach(function(sc){
  var t=E('button','sports-floor');t.dataset.k=sc.key;t.innerHTML='<b>'+sc.floor+'</b> '+sc.name+' <small>3</small>';
  t.onclick=function(){sel=sc.key;school=sel;draw();O.sfx('tick');O.say(sc.name,{noRepeat:true})};tabs.appendChild(t);
 });
 function draw(){
  Array.from(tabs.children).forEach(function(t){t.classList.toggle('on',t.dataset.k===sel)});
  list.innerHTML='';[1,2,3].forEach(function(no){list.appendChild(lessonRow(s,sel,no))});
 }
 draw();sh.board.innerHTML='';sh.board.appendChild(host);
 if(s.id==='baseball'){var pb=proBlock();if(pb)host.appendChild(pb);}
}
function lessonRow(s,sk,no){
 var li=info(s,sk,no),key=s.id+'-'+sk+'-'+no,pr=progress()[key]||{},row=E('article','sports-lesson');
 row.innerHTML='<div class="sports-lesson-head"><span class="sports-no">체육 '+no+'</span><div><b>'+li[0]+'</b><small>〈'+s.name+'〉 '+li[1]+'</small></div><em>'+(pr.plays||0)+'번</em></div><div class="sports-level-row"></div>';
 var lv=row.querySelector('.sports-level-row'),cur=pr.last||level;
 LEVELS.forEach(function(L){
  var a=E('a','sports-level-btn'+(L.n===cur?' cur':'')+(pr.best&&pr.best[L.n]?' got':''));
  var stars=pr.best&&pr.best[L.n]?'<i>'+'★'.repeat(pr.best[L.n])+'</i>':'';
  a.innerHTML='<b>'+L.n+'</b><small>'+L.name+'</small>'+stars;
  a.href='?festival=summer&sport='+s.id+'&school='+sk+'&lesson='+no+'&level='+L.n+'&play=1';lv.appendChild(a);
 });
 return row;
}

/* ---------- 우리 별 마을 차시 화면과 같은 공통 활동 틀 ---------- */
function sceneLesson(s){
 var bg=s.id==='athletics'?'sports/assets/athletics/athletics_bg_main.webp':s.id==='baseball'?'sports/assets/baseball/scene.webp':s.id==='basketball'?'sports/assets/basketball/bg_gym.webp':s.id==='rugby'?'sports/assets/rugby/bg_front.webp':s.id==='tennis'?'sports/assets/tennis/bg_scene.webp':s.id==='tabletennis'?'sports/assets/tabletennis/bg_scene.webp':'sports/'+(s.scene||s.image);
 return {subject:'physical',space:s.name+' 경기장',sceneKey:'arena',sceneBg:bg};
}
function sessionsKey(){return 'oks_athletics_sessions_v2'}
function exportRecords(){
 var rows=O.jget(sessionsKey(),[]),blob=new Blob([OKS_ATHLETICS.csv(rows)],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='씽씽별_육상_수업기록.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},500);
}
function activity(){
 var s=byId(sid);if(!s){summerHub();return}
 var li=info(s,school,lessonNo),sc=schoolInfo(),ath=s.id==='athletics'&&window.OKS_RUN&&window.OKS_ATHLETICS;
 var sh=top(s.name+' '+lessonNo+'차시 · '+li[0],'〈'+s.name+' 경기장〉 '+li[1],'?festival=summer&sport='+s.id+'&school='+school,s.name+' 목차',true,true);
 document.body.classList.add('oks-play','sports-play');
 document.title=li[0]+' · 옥쌤의 즐거운 교실';
 if(O.eco){var ehud=O.eco.hud(sh.menu);sh.menu.insertBefore(ehud,sh.levelBtn);}
 sh.levelBtn.onclick=function(){
  var ov=E('div','oks-overlay'),box=E('div','oks-finish oks-levelpick');
  box.innerHTML='<h2>수준 고르기</h2><p>'+O.esc(li[0])+'</p><div class="btns"></div><div class="note">수준을 바꾸면 처음부터 다시 시작해요.</div>';
  O.LEVELS.forEach(function(L){
   var b=E('button','oks-lv'+(L.n===level?' on':''),'<b>'+L.n+'</b><span><strong>'+L.name+'</strong><small>'+O.esc(levelDesc(s,li,L.n))+'</small></span>');
   b.type='button';b.onclick=function(){location.href='?festival=summer&sport='+s.id+'&school='+school+'&lesson='+lessonNo+'&level='+L.n+'&play=1'};
   box.querySelector('.btns').appendChild(b);
  });
  var close=E('button','oks-btn blue','닫기');close.type='button';close.onclick=function(){ov.remove()};box.querySelector('.btns').appendChild(close);
  ov.appendChild(box);document.body.appendChild(ov);
 };
 var total=ath?OKS_ATHLETICS.course(school,lessonNo).steps.length:(level===1?3:5);
 sh.setLevel(level);sh.setRounds(total,0);
 sh.ask(li[0]+'! 시작해 볼까요?',{silent:true});

 var start=E('div','oks-start');
 start.innerHTML='<div class="oks-start-lv">'+LEVELS[level-1].name+'</div><p class="gdesc">'+levelDesc(s,li,level)+'</p><p>'+O.esc(li[1])+'</p>';
 var go=E('button','oks-btn',O.iconHtml('icon_play.png','시작하기'));go.type='button';start.appendChild(go);
 var ws=E('a','oks-btn blue oks-extra','학습지 인쇄');ws.href='../worksheet/?id=sp-'+s.id+'-'+school+'-'+lessonNo+'&level='+level;start.appendChild(ws);
 if(ath){var dt=E('details','rn-teacher','<summary>선생님 · 수업 기록</summary><p>화면 활동 기록(첫 반응·시도·도움)을 이 기기에 모아 CSV로 내려받아요. 실제 운동 기능은 교사가 관찰해 주세요.</p>');
  var ex=E('button','oks-btn blue','육상 기록 CSV');ex.type='button';ex.onclick=exportRecords;dt.appendChild(ex);start.appendChild(dt);}
 sh.board.appendChild(start);
 O.target({get:function(){return go}},Math.min(level,2));
 go.onclick=function(){O.unlock();O.clearPrompt();begin(sh,s,li,total,ath)};
}
function levelDesc(s,li,lv){
 lv=lv||level;
 if(s.id==='tabletennis')return [
  '큰 단추 하나로 쳐요. 공이 표시에 멈추면 쳐요!',
  '동그란 표시에 공이 올 때 쳐요.',
  '탁구대에서 튕겨 오는 공을 보고 타이밍에 맞춰 쳐요.',
  '더 빠른 공! 좁은 타이밍에 쳐요.',
  '가장 빠른 공도 스스로 판단해 쳐서 넘겨요.'][lv-1];
 if(s.id==='tennis')return [
  '큰 단추 하나로 쳐요. 공이 표시에 멈추면 쳐요!',
  '동그란 표시에 공이 올 때 쳐요.',
  '날아오는 공을 보고 타이밍에 맞춰 쳐요.',
  '더 빠른 공! 좁은 타이밍에 쳐요.',
  '가장 빠른 공도 스스로 판단해 쳐서 넘겨요.'][lv-1];
 if(s.id==='rugby')return [
  '큰 단추 하나로 패스해요. 친구가 준비되면 기다려 줘요.',
  '초록 띠에서 옆 친구에게 패스해요.',
  '상대가 다가오는 타이밍에 맞춰 패스해요.',
  '더 좁은 띠! 빠르게 오는 상대를 보고 패스해요.',
  '가장 빠른 상대에게도 스스로 판단해 패스하고 트라이해요.'][lv-1];
 if(s.id==='basketball')return [
  '큰 단추 하나로 던져요. 표시가 멈추면 눌러요!',
  '초록 칸에 표시가 올 때 던져요.',
  '움직이는 표시를 보고 타이밍에 맞춰 던져요.',
  '더 좁은 칸! 멀리서도 던져 봐요.',
  '가장 빠른 표시와 먼 자리도 스스로 도전해요.'][lv-1];
 if(s.id==='baseball')return [
  '큰 단추 하나로 쳐요. 공이 멈추면 휘둘러요!',
  '존 안의 공은 치고, 벗어난 공은 참아 봐요.',
  '공이 오는 타이밍에 맞춰 쳐요.',
  '더 빠른 공! 쳐야 할 공과 참을 공을 가려요.',
  '가장 빠른 공도 스스로 판단해 홈런에 도전해요.'][lv-1];
 if(s.id==='athletics')return [
  '큰 단추 하나로 달려요. 허들 앞에서는 기다려 줘요.',
  '허들 앞에서 점프! 문제 문에서 알맞은 그림을 골라요.',
  '허들을 타이밍에 맞춰 넘고 문제를 풀며 결승선까지!',
  '더 빠른 트랙! 허들도 문제도 스스로 해결해요.',
  '가장 빠른 트랙에서 모든 도전을 완주해요.'][lv-1];
 return [
  '큰 그림과 움직임을 눌러 보며 '+s.name+'을 느껴 봐요.',
  '두 가지 보기에서 알맞은 것을 골라 봐요.',
  '직접 옮기고 순서를 맞추며 움직임을 익혀요.',
  '힌트 없이 스스로 판단하며 미니게임에 도전해요.',
  '새로운 상황에서 나에게 맞는 방법을 선택하고 적용해요.'][lv-1];
}
function begin(sh,s,li,total,ath){
 var st=O.newStats(),ctx={sh:sh,board:sh.board,level:level,stats:st,cfg:{},lesson:{topic:li[0]},id:'sports-'+s.id};
 O.kit(ctx);ctx.clear=function(){O.clearPrompt();sh.board.innerHTML='';sh.board.className='oks-board in-scene'};ctx.newStep=function(){sh.mood('idle')};
 st.t0=Date.now();st.glow=0;st.hand=0;ctx.clear();
 var scene=window.OKS_SCENE?OKS_SCENE.mount(sh,sceneLesson(s),total):null;
 var BALLG=s.id==='baseball'?window.OKS_BALL:s.id==='basketball'?window.OKS_HOOP:s.id==='rugby'?window.OKS_TAG:s.id==='tennis'?window.OKS_RALLY:s.id==='tabletennis'?window.OKS_PING:null;
 if(BALLG){
  var bgm=BALLG.mount({sh:sh,school:school,lesson:lessonNo,level:level,stats:st,ctx:ctx,scene:scene,data:lessonData(s),total:total});
  return bgm.begin().then(function(r){
   var fin=scene?scene.finale():Promise.resolve();
   return fin.then(function(){endSport(sh,s,li,st,scene,total,r)});
  }).catch(function(e){console.error(e);O.toast('앗, 문제가 생겼어요. 다시 시작해 주세요.')});
 }
 if(ath){
  var game=OKS_RUN.mount({sh:sh,school:school,lesson:lessonNo,level:level,stats:st,ctx:ctx,scene:scene});
  return game.begin().then(function(r){
   var fin=scene?scene.finale():Promise.resolve();
   return fin.then(function(){endSport(sh,s,li,st,scene,total,r)});
  }).catch(function(e){console.error(e);O.toast('앗, 문제가 생겼어요. 다시 시작해 주세요.')});
 }
 runGame(sh,s,li,st,ctx,scene,total);
}
function endSport(sh,s,li,st,scene,total,r){
 sh.setRounds(total,total);
 var mistakes=r?r.mistakes:(st.mistakes||0),stars=mistakes<=1?3:mistakes<=3?2:1,sc=scene?scene.stats():{maxCombo:0},sec=Math.round((Date.now()-st.t0)/1000);
 save(s.id+'-'+school+'-'+lessonNo,stars,mistakes);
 var entry={at:new Date().toISOString(),lesson:'sports-'+s.id+'-'+school+'-'+lessonNo,subject:'physical',school:school,topic:li[0],level:level,mistakes:mistakes,glow:st.glow,hand:st.hand,asked:st.asked,sec:sec,rounds:total};
 if(sc.maxCombo>=2)entry.combo=sc.maxCombo;
 var text=s.name+' · '+li[0]+' · '+LEVELS[level-1].name+(sc.maxCombo>=2?' · 최고 '+sc.maxCombo+'콤보':'');
 if(r&&r.text)text+=' · '+r.text+' · ⭐ '+r.coins;
 else if(r)text+=' · ⭐ '+r.coins+'개 · '+['🥇 금메달','🥈 은메달','🥉 동메달'][r.place-1]+' · '+r.sec+'초'+(r.newBest?(r.prev?' (내 최고 기록!)':''):(r.prev?' (내 최고 '+r.prev+'초)':''));
 var base='?festival=summer&sport='+s.id+'&school='+school+'&lesson='+lessonNo;
 var season=q.get('season')==='1'&&window.OKS_TYCOON?OKS_TYCOON.inning(s.id,stars):null;
 O.finish({stats:st,entry:entry,title:scene?scene.tpl.done:'멋진 스포츠 탐험!',text:text,stars:r?stars:undefined,extraCoins:(sc.maxCombo>=2?sc.maxCombo:0)+(r?Math.min(5,Math.floor(r.coins/4)):0),
  buttons:(season?[{label:season.done?'🏆 시즌 결과 보기':'다음 이닝 ▶ (남은 '+season.left+')',color:'orange',href:'?tycoon=1'}]:[]).concat([
   {label:'한 번 더',onClick:function(){location.reload()}},
   level<5?{label:'다음 수준 ('+(level+1)+')',color:'orange',href:base+'&level='+(level+1)+'&play=1'}:null,
   {label:'📄 학습지 인쇄',color:'blue',href:'../worksheet/?id=sp-'+s.id+'-'+school+'-'+lessonNo+'&level='+level},
   {label:s.name+' 목차',color:'blue',href:base.replace(/&lesson=\d+/,'')}
  ]).filter(Boolean)});
 if(r&&s.id==='athletics'&&window.OKS_ATHLETICS){
  var all=O.jget(sessionsKey(),[]);all.push({at:entry.at,school:school,topic:li[0],level:level,input:'run-game',engine:'athletics-run-v1',mistakes:mistakes,steps:r.metrics,coins:r.coins,seconds:r.sec});O.jset(sessionsKey(),all.slice(-200));
  var box=document.querySelector('.oks-overlay:last-child .oks-finish'),c=OKS_ATHLETICS.course(school,lessonNo);
  if(box){var note=E('div','al-transfer','<b>교실에서 이어 해요</b><p>'+O.esc(c.transfer)+'</p><small>별은 참여 보상이에요. 실제 운동 기능과 생활 적용은 교사가 관찰해요.</small>');
   var anchor=box.querySelector('.btns')||box.lastChild;box.insertBefore(note,anchor);}
 }
}
function runGame(sh,s,li,st,ctx,scene,total){
 var round=0,LD=lessonData(s)||OKS_SPORT_LESSONS[s.id].elem[0],PLAN=makePlan(s,LD,ctx);
 if(q.get('dev')==='game'&&level>=4){PLAN=[PLAN[level===4?3:2]];total=1}
 function next(){
  if(round>=total)return (scene?scene.finale():Promise.resolve()).then(function(){endSport(sh,s,li,st,scene,total)});
  sh.setRounds(total,round);ctx.clear();ctx.newStep();var m0=st.mistakes;
  if(scene){scene.now(round);if(round===total-1)scene.bonus()}
  var playArea=E('div','sports-play-area');sh.board.appendChild(playArea);
  return Promise.resolve(PLAN[round](playArea)).then(function(){O.clearPrompt();if(scene)scene.advance(round,st.mistakes===m0);round++;return O.wait(650).then(next)}).catch(function(e){console.error(e);O.toast('앗, 문제가 생겼어요. 다시 시작해 주세요.')});
 }
 next();
}
/* ---------- 라운드 만들기: 차시 자료(lessons.js)에서 수준에 맞게 ---------- */
function lessonData(s){
 var A=window.OKS_SPORT_LESSONS&&OKS_SPORT_LESSONS[s.id],arr=A&&(A[school]||A.elem);
 return arr&&arr[Math.max(0,Math.min(arr.length-1,lessonNo-1))];
}
function item(o){
  var v=o[0]||'';
  if(String(v).indexOf('img:')===0) return {img:String(v).slice(4),label:o[1]};
  return {emo:v,label:o[1]};
}
function makePlan(s,L,ctx){
 var it=O.shuffle(L.i.slice()),nr=O.shuffle(L.n.slice()),tt=O.shuffle(L.t.slice()),R=[],gm=String(L.g||'').split(':'),gk=gm[0],ga=gm[1];
 function game(){return function(host){return OKS_SPORT_GAMES[gk](ctx,host,{level:level,arg:ga,lesson:L,sport:s})}}
 function explore(i){return function(host){
  var a=[];for(var k=0;k<3;k++)a.push(it[(i*2+k)%it.length]);
  ctx.sh.ask('그림을 하나씩 눌러 보세요. '+(L.q||'').replace(/을 골라요|를 골라요/,'을 알아봐요'));
  var cards=a.map(function(x){return ctx.card(item(x),{big:true})});host.appendChild(ctx.grid(cards));
  return new Promise(function(res){var left=cards.length;ctx.target({get:function(){return cards.filter(function(c){return!c._done})}});
   cards.forEach(function(c){c.onclick=function(){if(c._done)return;c._done=true;c.classList.add('good');O.say(c._item.label,{noRepeat:true});O.sfx('pop');left--;if(!left){O.praise();setTimeout(res,900)}else ctx.target({get:function(){return cards.filter(function(x){return!x._done})}})}})});
 }}
 function pick(i,nopt){return function(host){
  var right=it[i%it.length],wr=O.shuffle(nr.slice()).slice(0,nopt-1),opts=O.shuffle([right].concat(wr));
  ctx.sh.ask(L.q);var cards=opts.map(function(x){return ctx.card(item(x),{big:nopt<=2})});host.appendChild(ctx.grid(cards,nopt>3?2:undefined));
  var ok=cards.filter(function(c){return c._item.label===right[1]})[0];ctx.target({get:function(){return ok}});
  O.say(L.q,{noRepeat:true});
  return ctx.tapWait(cards,function(c){return c===ok}).then(function(c){ctx.good(c);O.say(c._item.label,{noRepeat:true});return O.wait(800)});
 }}
 function drag(i){return function(host){
  var right=it[i%it.length],wrong=nr[i%nr.length];
  ctx.sh.ask('알맞은 것을 "'+L.z+'"(으)로 옮겨 보세요.');
  var row=E('div','sports-drag-row'),zone=E('div','sports-dropzone','<b>'+s.emo+'</b><span>'+L.z+'</span>'),items=O.shuffle([ctx.card(item(right)),ctx.card(item(wrong))]),good=items.filter(function(c){return c._item.label===right[1]})[0];
  row.appendChild(ctx.grid(items,2));row.appendChild(zone);host.appendChild(row);ctx.target({get:function(){return good},to:zone});
  return ctx.dnd(items,[zone],function(c){return c._item.label===right[1]},function(c){ctx.good(c);zone.innerHTML='<b>'+c.querySelector('.pic').innerHTML+'</b><span>'+O.esc(right[1])+' · 잘 옮겼어요!</span>'},function(){return !!good._done}).then(function(){return O.wait(800)});
 }}
 function order(){return function(host){
  var seq=L.s.slice(0,4),cards,k=0;ctx.sh.ask('일이 일어나는 순서대로 눌러 보세요.');
  cards=O.shuffle(seq.slice()).map(function(x){return ctx.card(item(x))});host.appendChild(ctx.grid(cards,Math.min(4,seq.length)));
  ctx.target({get:function(){return cards.filter(function(c){return c._item.label===seq[k][1]})}});
  return new Promise(function(res){cards.forEach(function(c){c.onclick=function(){if(c._done||k>=seq.length)return;
   if(c._item.label===seq[k][1]){c._done=true;c.classList.add('good');O.sfx('tick');O.say(c._item.label,{noRepeat:true});k++;
    if(k===seq.length){O.praise();setTimeout(res,800)}else ctx.target({get:function(){return cards.filter(function(x){return!x._done&&x._item.label===seq[k][1]})}})}else ctx.bad(c)}})});
 }}
 function nextStep(i){return function(host){
  var seq=L.s.slice(0,4),n=seq.length,kk=1+(i%(n-2)),right=seq[kk],others=seq.filter(function(x,idx){return idx!==kk&&idx!==kk-1});
  ctx.sh.ask('다음에 할 일은 무엇일까요?');
  var done=E('div','sports-done-row',seq.slice(0,kk).map(function(x){return '<span>'+x[0]+' '+O.esc(x[1])+'</span>'}).join('<i>→</i>')+'<i>→</i><span class="q">❓</span>');host.appendChild(done);
  var opts=O.shuffle([right].concat(O.shuffle(others).slice(0,2))),cards=opts.map(function(x){return ctx.card(item(x))});host.appendChild(ctx.grid(cards));
  var ok=cards.filter(function(c){return c._item.label===right[1]})[0];ctx.target({get:function(){return ok}});
  return ctx.tapWait(cards,function(c){return c===ok}).then(function(c){ctx.good(c);O.say(c._item.label,{noRepeat:true});return O.wait(800)});
 }}
 function situ(i,nopt){return function(host){
  var T=tt[i%tt.length],good=T.o.filter(function(x){return x[2]}),bad=T.o.filter(function(x){return!x[2]});
  var opts=nopt?O.shuffle([good[0]].concat(O.shuffle(bad.slice()).slice(0,nopt-1))):O.shuffle(T.o.slice());
  ctx.sh.ask(T.q);O.say(T.q,{noRepeat:true});
  var cards=opts.map(function(x){return ctx.card({emo:x[0],label:x[1]})});host.appendChild(ctx.grid(cards));
  var need=nopt?1:Math.min(2,good.length),got=0;ctx.target({get:function(){return cards.filter(function(c,idx){return opts[idx][2]&&!c._done})}});
  return new Promise(function(res){cards.forEach(function(c,idx){c.onclick=function(){
   if(c._done)return;
   if(opts[idx][2]){c._done=true;c.classList.add('good');got++;O.sfx('ok');O.say(opts[idx][1],{noRepeat:true});
    if(got>=need){O.praise();setTimeout(res,900)}else ctx.target({get:function(){return cards.filter(function(x,j){return opts[j][2]&&!x._done})}})}
   else ctx.bad(c)}})});
 }}
 if(level===1){for(var a=0;a<3;a++)R.push(explore(a));}
 else if(level===2){R=[pick(0,2),pick(1,2),pick(2,2),pick(3,2),situ(0,2)];}
 else if(level===3){R=[drag(0),order(),drag(1),nextStep(0),drag(2)];}
 else if(level===4){R=[pick(0,4),pick(1,4),pick(2,4),game(),situ(1,3)];}
 else{R=[situ(0),situ(1),game(),situ(2),situ(3)];}
 return R;
}

if(q.get('tycoon')==='1'&&window.OKS_TYCOON)OKS_TYCOON.open();
else if(play&&sid==='baseball'&&q.get('pro')==='1'&&window.OKS_PRO&&proUnlocked())proActivity();
else if(play&&sid)activity();
else if(festival==='summer'&&sid)sportToc();
else if(festival==='summer')summerHub();
else villageHub();
})();