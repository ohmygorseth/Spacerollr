const _fontLink=document.createElement('link');
_fontLink.rel='stylesheet';
_fontLink.href='https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@700;900&display=swap';
document.head.appendChild(_fontLink);
const cv=document.getElementById('c'),cx=cv.getContext('2d');
cv.width=CONFIG.WIDTH;cv.height=CONFIG.HEIGHT;
const W=CONFIG.WIDTH,H=CONFIG.HEIGHT;
const{HORIZON_Y:HY,FOCAL,TRACK_COLS:COLS,TRACK_HW:THW,VIEW_DIST:VIEW,PLAYER_Z:PZ,BALL_RADIUS:BR,TILE_COLORS:EC}=CONFIG;
function pr(d){d=Math.max(d,0.05);const s=FOCAL/d;return{y:HY+(H-HY)*s,hw:W*0.46*s,s};}

// Levels er definert i levels.js
function currentLevelData(){return LEVELS[currentLevel];}

let track=[],tBase=0;
function mkRow(z){
  const i=Math.floor(z);
  if(i>=currentLevelData().length){return{c:[1,1,1,1],e:'n'};}
  const lvl=currentLevelData();return{c:lvl[Math.min(i,lvl.length-1)].slice(),e:'n'};
}
function getRow(wz){const i=Math.floor(wz)-tBase;return(i>=0&&i<track.length)?track[i]:null;}
function growTrack(cZ){const need=Math.floor(cZ)+VIEW+6;while(tBase+track.length<=need)track.push(mkRow(tBase+track.length));while(tBase<Math.floor(cZ)-4&&track.length>0){track.shift();tBase++;}}

function loadProgress(){try{return JSON.parse(localStorage.getItem('sr_progress'))||{unlocked:1,completed:[]};}catch(e){return{unlocked:1,completed:[]};}}
function saveProgress(p){try{localStorage.setItem('sr_progress',JSON.stringify(p));}catch(e){}}
function completeLevel(n){const p=loadProgress();if(!p.completed.includes(n))p.completed.push(n);p.unlocked=Math.max(p.unlocked,n+1);saveProgress(p);}
function loadHS(){try{return JSON.parse(localStorage.getItem('ballzy_hs'))||[];}catch(e){return[];}}
function saveHS(hs){try{localStorage.setItem('ballzy_hs',JSON.stringify(hs));}catch(e){}}
function isHighscore(s){const hs=loadHS();return hs.length<5||s>hs[hs.length-1].score;}
function addHS(name,s){const hs=loadHS();hs.push({name:name.slice(0,12),score:s});hs.sort((a,b)=>b.score-a.score);hs.splice(5);saveHS(hs);}

let camZ,px,pvx,jy,jvy,spd,score,state,hi=0,pts=[],rot=0,currentLevel=0,gameMode='main',menuState='main',scoreOffset=0;
let nameInput='',enteringName=false;

function reset(){camZ=0;px=0;pvx=0;jy=0;jvy=0;spd=CONFIG.BASE_SPEED;score=0;pts=[];rot=0;track=[];tBase=0;growTrack(0);state='play';}
function die(){
  stopMusic();playDie();
  if(gameMode==='select'){state='dead';return;}
  if(score>hi)hi=score;
  if(isHighscore(score)){state='enter_name';nameInput='';enteringName=true;}
  else{state='dead';}
  fetchGlobalScores();
}
function go(){if(gameMode==='select'){scoreOffset=999;playMusic(currentLevel);reset();}else{currentLevel=0;scoreOffset=0;playMusic(0);reset();}}
function startMainMode(){AC.resume();playMusic(0);gameMode='main';currentLevel=0;scoreOffset=0;menuState='main';reset();}
function startLevel(n){AC.resume();playMusic(n);gameMode='select';currentLevel=n;scoreOffset=999;menuState='play';reset();}
function nextLevel(){
  completeLevel(currentLevel);
  if(gameMode==='main'&&currentLevel+1<LEVELS.length){
    scoreOffset+=camZ;currentLevel++;camZ=0;px=0;pvx=0;jy=0;jvy=0;pts=[];rot=0;track=[];tBase=0;state='play';playMusic(currentLevel);growTrack(0);
  } else {
    completeLevel(currentLevel);
    if(score>hi)hi=score;
    if(isHighscore(score)){state='enter_name';nameInput='';enteringName=true;}
    else{state='levelcomplete';}
  }
}

const K={};
let tL=0,tR=0,tJ=0;

cv.addEventListener('touchstart',e=>{
  e.preventDefault();
  if(state!=='play'){
    if(state==='dead'||state==='levelcomplete'){state='start';menuState='main';return;}
    if(state==='start'){handleClick(e.changedTouches[0]);return;}
    return;
  }
  const r=cv.getBoundingClientRect();
  for(const t of e.changedTouches){
    const tx=(t.clientX-r.left)*(W/r.width);
    const ty=(t.clientY-r.top)*(H/r.height);
    if(ty>H*0.72){
      if(tx<W/3)tL=1;
      else if(tx<W*2/3)tJ=1;
      else tR=1;
    }
  }
},{passive:false});

cv.addEventListener('touchend',e=>{
  const r=cv.getBoundingClientRect();
  for(const t of e.changedTouches){
    const tx=(t.clientX-r.left)*(W/r.width);
    const ty=(t.clientY-r.top)*(H/r.height);
    if(ty>H*0.72){
      if(tx<W/3)tL=0;
      else if(tx<W*2/3)tJ=0;
      else tR=0;
    }
  }
});
document.addEventListener('keydown',e=>{
  if(enteringName){
    e.preventDefault();
    if(e.key==='Enter'&&nameInput.length>0){addHS(nameInput,score);enteringName=false;state=camZ+PZ>=currentLevelData().length?'levelcomplete':'dead';}
    else if(e.key==='Backspace'){nameInput=nameInput.slice(0,-1);}
    else if(e.key.length===1&&nameInput.length<12){nameInput+=e.key;}
    return;
  }
  K[e.key]=1;
  if([' ','ArrowLeft','ArrowRight','ArrowUp'].includes(e.key))e.preventDefault();
  if(state==='dead'&&e.key==='Enter')go();if(state==='levelcomplete'&&e.key==='Enter'){state='start';menuState='main';currentLevel=0;}
});
document.addEventListener('keyup',e=>K[e.key]=0);
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    if(state==='play'){stopMusic();state='start';menuState='main';currentLevel=0;scoreOffset=0;}
    else if(state==='dead'||state==='levelcomplete'){stopMusic();state='start';menuState='main';currentLevel=0;}
  }
});
cv.addEventListener('click',(e)=>{handleClick(e);});

function handleClick(e){
  if(state==='dead'){go();return;}
  if(state==='levelcomplete'){state='start';menuState='main';return;}
  if(state==='start'){
    const rect=cv.getBoundingClientRect();
    const mx=(e.clientX-rect.left)*(W/rect.width);
    const my=(e.clientY-rect.top)*(H/rect.height);
    if(menuState==='main'){
      // Match drawStartScreen: pw=260, buttons at py2=H*0.33+22, h=36
      const px2=W/2-130,py2=H*0.33+22,btnW=115,btnH=36;
      if(mx>px2+10&&mx<px2+10+btnW&&my>py2&&my<py2+btnH){startMainMode();}
      else if(mx>px2+135&&mx<px2+135+btnW&&my>py2&&my<py2+btnH){menuState='levelselect';}
    } else if(menuState==='levelselect'){
      // Match drawLevelSelect: pw=300, py2=H*0.33, bx/by coords
      const cx0=W/2,py2=H*0.33,ph=150;
      const p=loadProgress();
      LEVELS.forEach((_,i)=>{
        const bx=cx0-((LEVELS.length*80)/2)+(i*80)+5,by=py2+28,bw=70,bh=50;
        if(mx>bx&&mx<bx+bw&&my>by&&my<by+bh){
          startLevel(i);
        }
      });
      if(mx>cx0-55&&mx<cx0+55&&my>py2+ph-42&&my<py2+ph-12){menuState='main';}
    }
  }
}
function readGamepad(){const pads=navigator.getGamepads?navigator.getGamepads():[];for(const p of pads){if(p)return{left:p.axes[0]<-0.3||p.buttons[14]?.pressed,right:p.axes[0]>0.3||p.buttons[15]?.pressed,jump:p.buttons[0]?.pressed||p.buttons[1]?.pressed,start:p.buttons[9]?.pressed||p.buttons[8]?.pressed};}return{};}
let prevT=0;
function update(t){const gp=readGamepad();if(state!=='play'){if((state==='dead'||state==='start')&&(gp.start||gp.jump))go();return;}const dt=Math.min((t-prevT)/1000,.05);prevT=t;camZ+=spd*dt;score=(scoreOffset+camZ)*12|0;spd=Math.min(CONFIG.BASE_SPEED+(scoreOffset+camZ)*CONFIG.SPEED_GROWTH,CONFIG.MAX_SPEED);const left=K['ArrowLeft']||tL||gp.left,right=K['ArrowRight']||tR||gp.right,jump=K[' ']||K['ArrowUp']||tJ||gp.jump;pvx+=((right?CONFIG.LATERAL_SPEED:left?-CONFIG.LATERAL_SPEED:0)-pvx)*CONFIG.LATERAL_DRAG*dt;px=Math.max(-THW+.12,Math.min(THW-.12,px+pvx*dt));rot+=spd*dt*(1/BR)*8+pvx*3*dt;if(jump&&jy>=0){jvy=CONFIG.JUMP_VY;playJump();jy=-1;}jvy+=CONFIG.GRAVITY*dt;jy+=jvy*dt;if(jy>0){jy=0;jvy=0;}const row=getRow(camZ+PZ),col=Math.max(0,Math.min(COLS-1,Math.floor(px+THW))),solid=row&&row.c[col];if(jy>=0&&!solid){die();return;}if(solid&&jy>=0&&Math.abs(pvx)>1.5&&Math.random()<.15)spawnSpark();for(const p of pts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=300*dt;p.life-=dt;}pts=pts.filter(p=>p.life>0);growTrack(camZ);if(camZ+PZ>=currentLevelData().length){stopMusic();playFinish();if(gameMode==='select'){state='levelcomplete';}else{nextLevel();}}}
function spawnSpark(){const p=pr(PZ),bx=W/2+(px/THW)*p.hw;for(let i=0;i<3;i++)pts.push({x:bx,y:p.y,vx:(Math.random()-.5)*100,vy:-50-Math.random()*60,life:.35,col:['#ff00ff','#00ffff','#aa00ff'][Math.floor(Math.random()*3)]});}

const STARS=[];
for(let i=0;i<180;i++){STARS.push({x:(Math.random()-.5)*2,y:(Math.random()-.5)*2,size:Math.random()*1.8+0.3,col:['#ffffff','#aaccff','#ccaaff','#ffeebb'][Math.floor(Math.random()*4)],speed:0.3+Math.random()*0.7});}

function drawBg(){
  const g=cx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#00000f');g.addColorStop(0.5,'#0a0020');g.addColorStop(1,'#050010');cx.fillStyle=g;cx.fillRect(0,0,W,H);
  const n=cx.createRadialGradient(W*.3,H*.25,10,W*.3,H*.25,W*.45);n.addColorStop(0,'rgba(60,0,120,.18)');n.addColorStop(1,'rgba(0,0,0,0)');cx.fillStyle=n;cx.fillRect(0,0,W,H);
  const n2=cx.createRadialGradient(W*.75,H*.15,10,W*.75,H*.15,W*.35);n2.addColorStop(0,'rgba(0,40,120,.15)');n2.addColorStop(1,'rgba(0,0,0,0)');cx.fillStyle=n2;cx.fillRect(0,0,W,H);
  const cx0=W/2,cy0=H/2,zoom=1+((camZ*0.2)%80)/80*1;
  for(const s of STARS){const sx=cx0+s.x*W/2*zoom*s.speed,sy=cy0+s.y*H/2*zoom*s.speed;if(sx<0||sx>W||sy<0||sy>H)continue;const size=s.size*(0.5+zoom*s.speed*0.3),alpha=Math.min(1,zoom*s.speed*0.4);cx.globalAlpha=alpha;cx.fillStyle=s.col;cx.beginPath();cx.arc(sx,sy,size,0,Math.PI*2);cx.fill();if(spd>7&&size>1){cx.globalAlpha=alpha*0.3;cx.fillRect(sx,sy-size*spd*0.4,size*0.5,size*spd*0.8);}}cx.globalAlpha=1;
}

function drawTrack(){
  const NEON=[['#ff00ff','#cc00cc','#ff66ff'],['#00ffff','#00aaaa','#66ffff'],['#aa00ff','#7700bb','#cc66ff'],['#ff0099','#bb006f','#ff66cc']];
  const pulse=0.85+Math.sin(Date.now()*0.004)*0.15;
  for(let i=VIEW;i>=0;i--){
    const wz=Math.floor(camZ)+i,df=wz-camZ,db=wz+1-camZ;
    if(df<.08)continue;
    const pF=pr(df),pB=pr(db);
    if(pB.y>H+12||pF.y<HY-4)continue;
    const row=getRow(wz);if(!row)continue;
    const twF=pF.hw*2/COLS,twB=pB.hw*2/COLS,fade=Math.min(1,pF.s*1.8);
    for(let c=0;c<COLS;c++){
      if(!row.c[c])continue;
      const x1f=W/2-pF.hw+c*twF,x2f=x1f+twF,x1b=W/2-pB.hw+c*twB,x2b=x1b+twB;
      const nc=NEON[(c+Math.floor(wz/6))%NEON.length];
      cx.globalAlpha=.3+fade*.5;
      cx.beginPath();cx.moveTo(x1f,pF.y);cx.lineTo(x2f,pF.y);cx.lineTo(x2b,pB.y);cx.lineTo(x1b,pB.y);cx.closePath();
      cx.fillStyle='rgba(10,0,30,.9)';cx.fill();
      const ng=cx.createLinearGradient(x1f,pF.y,x2f,pF.y);
      ng.addColorStop(0,nc[2]+'33');ng.addColorStop(0.5,nc[0]+'55');ng.addColorStop(1,nc[2]+'33');
      cx.fillStyle=ng;cx.fill();
      cx.globalAlpha=1;
      cx.shadowBlur=0;
      cx.strokeStyle=nc[0];cx.lineWidth=1.5;
      cx.beginPath();cx.moveTo(x1f,pF.y);cx.lineTo(x2f,pF.y);cx.stroke();
      cx.lineWidth=0.8;
      // Venstre kant
      cx.beginPath();cx.moveTo(x1f,pF.y);cx.lineTo(x1b,pB.y);cx.stroke();
      // Høyre kant
      cx.beginPath();cx.moveTo(x2f,pF.y);cx.lineTo(x2b,pB.y);cx.stroke();
      // Bakre kant
      cx.lineWidth=0.6;
      cx.beginPath();cx.moveTo(x1b,pB.y);cx.lineTo(x2b,pB.y);cx.stroke();
      }
  }
}

function drawFinishLine(){
  const finishZ = currentLevelData().length - 5;
  const dist = finishZ - camZ;
  if(dist < 0 || dist > VIEW) return;
  const p = pr(dist);
  if(p.y > H+12 || p.y < HY-4) return;
  const pulse = 0.7 + Math.sin(Date.now()*0.006)*0.3;
  const x1 = W/2 - p.hw, x2 = W/2 + p.hw;
  // Glow
  
  cx.shadowBlur=0;
  cx.strokeStyle = '#ffd700';
  cx.lineWidth = 3;
  cx.beginPath();
  cx.moveTo(x1, p.y);
  cx.lineTo(x2, p.y);
  cx.stroke();
  // Checkerboard pattern
  const sq = (x2-x1)/8;
  for(let i=0;i<8;i++){
    cx.fillStyle = i%2===0 ? 'rgba(255,215,0,0.8)' : 'rgba(255,255,255,0.8)';
    cx.fillRect(x1+i*sq, p.y-4, sq, 4);
  }
  cx.shadowBlur=0;
  // Label når du er nærme
  if(dist < 12){
    cx.textAlign='center';
    cx.fillStyle='rgba(255,215,0,'+(1-dist/12)+')';
    cx.font='bold 16px Share Tech Mono, monospace';
    cx.fillText('🏁 END OF LEVEL '+(currentLevel+1), W/2, p.y - 12);
    cx.textAlign='left';
  }
}
function drawBall(){const p=pr(PZ),bx=W/2+(px/THW)*p.hw,gY=p.y-BR,by=gY+jy;cx.beginPath();cx.ellipse(bx,gY+3,BR*.75,BR*.2,0,0,Math.PI*2);cx.fillStyle='rgba(0,0,0,'+Math.max(0,.4+jy*.003)+')';cx.fill();cx.save();cx.translate(bx,by);cx.rotate(rot);const g=cx.createRadialGradient(-BR*.3,-BR*.35,BR*.05,0,0,BR);g.addColorStop(0,'#aaf5f0');g.addColorStop(.4,'#00c8c0');g.addColorStop(1,'#006f6a');cx.beginPath();cx.arc(0,0,BR,0,Math.PI*2);cx.fillStyle=g;cx.fill();cx.beginPath();cx.arc(-BR*.28,-BR*.32,BR*.2,0,Math.PI*2);cx.fillStyle='rgba(255,255,255,.45)';cx.fill();cx.restore();}
function drawParticles(){for(const p of pts){cx.beginPath();cx.arc(p.x,p.y,Math.max(1,3*p.life),0,Math.PI*2);cx.fillStyle=p.col+(Math.min(255,(p.life*2*255)|0).toString(16).padStart(2,'0'));cx.fill();}}
function drawHUD(){if(gameMode==='select')return;cx.textAlign='left';cx.fillStyle='#fff';cx.font='bold 17px Share Tech Mono, monospace';cx.fillText('SCORE '+score,10,24);if(hi){cx.fillStyle='rgba(255,255,255,.4)';cx.font='11px Share Tech Mono, monospace';cx.fillText('BEST '+hi,10,39);}cx.textAlign='left';}

function drawHighscoreList(x,y){
  const hs=loadHS();
  const pw=130,ph=112,gap=10;
  const lx=x-pw-gap/2,rx=x+gap/2;

  // YOU panel
  drawPanel(lx,y,pw,ph,'#00ffff');
  cx.textAlign='center';
  cx.fillStyle='#00ffff';cx.font='bold 11px Share Tech Mono, monospace';
  cx.fillText('YOU',lx+pw/2,y+14);
  if(!hs.length){
    cx.fillStyle='rgba(255,255,255,.3)';cx.font='10px Share Tech Mono, monospace';
    cx.fillText('No scores yet',lx+pw/2,y+34);
  } else {
    hs.slice(0,5).forEach((e,i)=>{
      cx.fillStyle=i===0?'#ffd700':i===1?'#c0c0c0':i===2?'#cd7f32':'rgba(255,255,255,.5)';
      cx.font=(i<3?'bold ':'')+'10px Share Tech Mono, monospace';
      cx.fillText((i+1)+'. '+e.name+' '+e.score,lx+pw/2,y+28+i*17);
    });
  }

  // WORLD panel
  drawPanel(rx,y,pw,ph,'#aa00ff');
  cx.fillStyle='#aa00ff';cx.font='bold 11px Share Tech Mono, monospace';
  cx.fillText('WORLD',rx+pw/2,y+14);
  if(!globalScores.length){
    cx.fillStyle='rgba(255,255,255,.3)';cx.font='10px Share Tech Mono, monospace';
    cx.fillText('Loading...',rx+pw/2,y+34);
  } else {
    globalScores.slice(0,5).forEach((e,i)=>{
      cx.fillStyle=i===0?'#ffd700':i===1?'#c0c0c0':i===2?'#cd7f32':'rgba(255,255,255,.5)';
      cx.font=(i<3?'bold ':'')+'10px Share Tech Mono, monospace';
      cx.fillText((i+1)+'. '+e.name+' '+e.score,rx+pw/2,y+28+i*17);
    });
  }
  cx.textAlign='left';
}

function drawPanel(x,y,w,h,color){
  color=color||'#00ffff';
  cx.fillStyle='rgba(4,0,15,0.92)';cx.fillRect(x,y,w,h);
  cx.strokeStyle=color;cx.lineWidth=1.5;cx.strokeRect(x,y,w,h);
  const s=8;cx.strokeStyle='rgba(255,255,255,.4)';cx.lineWidth=1;
  cx.beginPath();cx.moveTo(x,y+s);cx.lineTo(x,y);cx.lineTo(x+s,y);cx.stroke();
  cx.beginPath();cx.moveTo(x+w-s,y);cx.lineTo(x+w,y);cx.lineTo(x+w,y+s);cx.stroke();
  cx.beginPath();cx.moveTo(x,y+h-s);cx.lineTo(x,y+h);cx.lineTo(x+s,y+h);cx.stroke();
  cx.beginPath();cx.moveTo(x+w-s,y+h);cx.lineTo(x+w,y+h);cx.lineTo(x+w,y+h-s);cx.stroke();
}
function drawNeonBtn(x,y,w,h,label,color){
  color=color||'#00ffff';
  cx.fillStyle='rgba(0,0,0,0.4)';cx.fillRect(x,y,w,h);
  cx.strokeStyle=color;cx.lineWidth=1.5;cx.strokeRect(x,y,w,h);
  cx.fillStyle=color;cx.font='bold 12px Share Tech Mono, monospace';cx.textAlign='center';
  cx.fillText(label,x+w/2,y+h/2+5);cx.textAlign='left';
}
function drawSpaceRollrLogo(cx0,y){
  const letters=[{l:'S',c:'#ff00ff'},{l:'P',c:'#cc00ff'},{l:'A',c:'#00ffff'},{l:'C',c:'#ff00ff'},{l:'E',c:'#aa00ff'},{l:' ',c:'#fff'},{l:'R',c:'#00ffff'},{l:'O',c:'#ff0099'},{l:'L',c:'#ff00ff'},{l:'L',c:'#cc00ff'},{l:'R',c:'#00ffff'}];
  const fontSize=44,letterW=32,totalW=letters.length*letterW;
  const startX=cx0-totalW/2;
  cx.font='bold '+fontSize+'px Orbitron, monospace';cx.textAlign='left';
  letters.forEach(function(lt,i){
    if(lt.l===' ')return;
    const x=startX+i*letterW,ly=y;
    cx.fillStyle=lt.c;cx.fillText(lt.l,x,ly);
  });
  cx.textAlign='left';
}
function drawSpaceBg(){
  const bg=cx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,'#000008');bg.addColorStop(0.5,'#050018');bg.addColorStop(1,'#000008');
  cx.fillStyle=bg;cx.fillRect(0,0,W,H);
  for(const s of STARS){
    const sx=W/2+s.x*W/2*s.speed,sy=H/2+s.y*H/2*s.speed;
    if(sx<0||sx>W||sy<0||sy>H)continue;
    cx.globalAlpha=Math.min(1,s.speed*0.5);cx.fillStyle=s.col;
    cx.beginPath();cx.arc(sx,sy,s.size*.7,0,Math.PI*2);cx.fill();
  }
  cx.globalAlpha=1;
}
function drawOverlay(title,sub1,sub2){
  const cx0=W/2;
  cx.fillStyle='rgba(0,0,8,.75)';cx.fillRect(0,0,W,H);
  cx.textAlign='center';
  cx.fillStyle='#e0b4ff';cx.font='bold 36px Share Tech Mono, monospace';cx.fillText(title,cx0,H*0.25);
  if(gameMode!=='select'){
    if(sub1){cx.fillStyle='#fff';cx.font='17px Share Tech Mono, monospace';cx.fillText(sub1,cx0,H*0.25+40);}
    drawHighscoreList(cx0,H*0.25+70);
  }
  cx.fillStyle='#4cc9f0';cx.font='13px Share Tech Mono, monospace';
  cx.fillText('ENTER / CLICK TO TRY AGAIN',cx0,H-20);
  cx.textAlign='left';
}

function drawLevelComplete(){
  const cx0=W/2;
  drawSpaceBg();
  drawSpaceRollrLogo(cx0,H*0.22);
  const pw=260,ph=gameMode==='select'?90:120,px2=cx0-pw/2,py2=H*0.34;
  drawPanel(px2,py2,pw,ph,'#00ff88');
  cx.textAlign='center';
  cx.fillStyle='#00ff88';cx.font='bold 14px Share Tech Mono, monospace';
  cx.fillText(gameMode==='select'?'LEVEL COMPLETE!':'LEVEL COMPLETE!',cx0,py2+24);
  if(gameMode!=='select'){
    cx.fillStyle='#fff';cx.font='15px Share Tech Mono, monospace';cx.fillText('Score: '+score,cx0,py2+50);
    if(hi){cx.fillStyle='rgba(255,255,255,.5)';cx.font='11px Share Tech Mono, monospace';cx.fillText('Best: '+hi,cx0,py2+70);}
  }
  const btnLabel=gameMode==='select'?'ENTER / CLICK TO TRY AGAIN':'ENTER / CLICK TO CONTINUE';
  drawNeonBtn(px2+10,py2+ph-44,pw-20,32,btnLabel,'#00ff88');
  cx.textAlign='left';
}

function drawEnterName(){
  const cx0=W/2;
  drawSpaceBg();
  drawSpaceRollrLogo(cx0,H*0.22);
  const hs=loadHS();const place=hs.filter(function(e){return e.score>score;}).length+1;
  const placeStr=place===1?'🥇 1. PLASS!':place===2?'🥈 2. PLASS!':place===3?'🥉 3. PLASS!':place+'. PLASS!';
  const pw=280,ph=150,px2=cx0-pw/2,py2=H*0.34;
  drawPanel(px2,py2,pw,ph,'#ffd700');
  cx.textAlign='center';
  cx.fillStyle='#ffd700';cx.font='bold 15px Share Tech Mono, monospace';cx.fillText(placeStr,cx0,py2+22);
  cx.fillStyle='#fff';cx.font='13px Share Tech Mono, monospace';cx.fillText('Score: '+score,cx0,py2+44);
  cx.fillStyle='rgba(255,255,255,.5)';cx.font='10px Share Tech Mono, monospace';cx.fillText('ENTER YOUR NAME:',cx0,py2+64);
  drawPanel(px2+20,py2+72,pw-40,34,'#00ffff');
  cx.fillStyle='#fff';cx.font='bold 15px Share Tech Mono, monospace';cx.fillText(nameInput+'|',cx0,py2+95);
  cx.fillStyle='rgba(255,255,255,.35)';cx.font='10px Share Tech Mono, monospace';cx.fillText('PRESS ENTER TO SAVE',cx0,py2+ph-12);
  cx.textAlign='left';
}

function drawTouchBtns(){
  const bw=W/4-8,bh=52,by=H-bh-8;
  const btns=[[8,'←',tL],[W/2-bw/2,'●',tJ],[W-bw-8,'→',tR]];
  btns.forEach(([x,lbl,on])=>{
    cx.fillStyle=on?'rgba(0,255,255,.25)':'rgba(255,255,255,.07)';
    cx.fillRect(x,by,bw,bh);
    cx.strokeStyle=on?'#00ffff':'rgba(255,255,255,.15)';
    cx.lineWidth=1.5;cx.strokeRect(x,by,bw,bh);
    cx.fillStyle=on?'#00ffff':'rgba(255,255,255,.5)';
    cx.font='bold 22px Share Tech Mono, monospace';cx.textAlign='center';
    cx.fillText(lbl,x+bw/2,by+34);
  });
  // Mobile warning
  const isMobile=/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  if(isMobile){
    const ww=320,wh=44,wx=cx0-ww/2,wy=H-60;
    cx.fillStyle='rgba(255,160,0,.15)';cx.fillRect(wx,wy,ww,wh);
    cx.strokeStyle='#ffaa00';cx.lineWidth=1;cx.strokeRect(wx,wy,ww,wh);
    cx.fillStyle='#ffaa00';cx.font='11px Share Tech Mono, monospace';cx.textAlign='center';
    cx.fillText('⚠️ Dette spillet er best på PC',cx0,wy+18);
    cx.fillText('med tastatur',cx0,wy+33);
  }
  cx.textAlign='left';
}

function drawLevelSelect(){
  const cx0=W/2;
  drawSpaceBg();
  drawSpaceRollrLogo(cx0,H*0.22);
  const pw=300,ph=150,px2=cx0-pw/2,py2=H*0.33;
  drawPanel(px2,py2,pw,ph,'#aa00ff');
  cx.textAlign='center';cx.fillStyle='#aa00ff';cx.font='bold 11px Share Tech Mono, monospace';
  cx.fillText('SELECT LEVEL',cx0,py2+16);
  const p=loadProgress();
  LEVELS.forEach(function(_,i){
    const bx=cx0-((LEVELS.length*80)/2)+(i*80)+5,by=py2+28,bw=70,bh=50;
    const unlocked=true,completed=p.completed.includes(i);
    const col=completed?'#00ff88':unlocked?'#00ffff':'#333';
    drawPanel(bx,by,bw,bh,col);
    cx.fillStyle=col;cx.font='bold 15px Share Tech Mono, monospace';cx.textAlign='center';
    cx.fillText('L'+(i+1),bx+bw/2,by+26);
    if(completed){cx.fillStyle='#00ff88';cx.font='11px Share Tech Mono, monospace';cx.fillText('✓',bx+bw/2,by+42);}
    else if(!unlocked){cx.fillStyle='#555';cx.font='13px Share Tech Mono, monospace';cx.fillText('🔒',bx+bw/2,by+42);}
  });
  drawNeonBtn(cx0-55,py2+ph-42,110,30,'← BACK','rgba(255,255,255,0.3)');
  cx.textAlign='left';
}

function drawStartScreen(){
  const cx0=W/2;
  drawSpaceBg();
  drawSpaceRollrLogo(cx0,H*0.22);
  cx.textAlign='center';
  cx.fillStyle='rgba(255,255,255,.25)';cx.font='10px Share Tech Mono, monospace';
  cx.fillText('← → MOVE   |   SPACE JUMP',cx0,H*0.22+20);
  const pw=260,ph=110,px2=cx0-pw/2,py2=H*0.33;
  drawPanel(px2,py2,pw,ph,'#aa00ff');
  cx.textAlign='center';cx.fillStyle='rgba(170,0,255,.5)';cx.font='9px Share Tech Mono, monospace';
  cx.fillText('SELECT MODE',cx0,py2+14);
  drawNeonBtn(px2+10,py2+22,115,36,'MAIN MODE','#00ffff');
  drawNeonBtn(px2+135,py2+22,115,36,'SELECT LEVEL','#aa00ff');
  const hpy=py2+ph+10;
  drawHighscoreList(cx0,hpy);
  cx.textAlign='left';
}

// ===== GLOBAL LEADERBOARD =====
let globalScores=[];
async function fetchGlobalScores(){
  if(window.fbGetScores){
    try{
      const result=await window.fbGetScores();
      globalScores=result||[];
    }catch(e){globalScores=[];}
  }
}
async function submitGlobalScore(name,score){
  if(window.fbSubmitScore){
    await window.fbSubmitScore(name,score);
    await setTimeout(fetchGlobalScores,500);setInterval(fetchGlobalScores,15000);
  }
}
setTimeout(fetchGlobalScores,500);setInterval(fetchGlobalScores,15000);

// ===== AUDIO =====
const AC = new (window.AudioContext||window.webkitAudioContext)();

function playJump(){
  const o=AC.createOscillator(),g=AC.createGain();
  o.connect(g);g.connect(AC.destination);
  o.type='sine';o.frequency.setValueAtTime(220,AC.currentTime);
  o.frequency.exponentialRampToValueAtTime(340,AC.currentTime+0.1);
  g.gain.setValueAtTime(0.12,AC.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+0.15);
  o.start();o.stop(AC.currentTime+0.15);
}

function playDie(){
  const o=AC.createOscillator(),g=AC.createGain();
  o.connect(g);g.connect(AC.destination);
  o.type='sawtooth';o.frequency.setValueAtTime(280,AC.currentTime);
  o.frequency.exponentialRampToValueAtTime(40,AC.currentTime+0.4);
  g.gain.setValueAtTime(0.3,AC.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+0.4);
  o.start();o.stop(AC.currentTime+0.4);
  // Extra crunch
  const o2=AC.createOscillator(),g2=AC.createGain();
  o2.connect(g2);g2.connect(AC.destination);
  o2.type='square';o2.frequency.setValueAtTime(120,AC.currentTime);
  o2.frequency.exponentialRampToValueAtTime(30,AC.currentTime+0.3);
  g2.gain.setValueAtTime(0.15,AC.currentTime);
  g2.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+0.3);
  o2.start();o2.stop(AC.currentTime+0.3);
}

function playFinish(){
  const notes=[440,554,659,880];
  notes.forEach((freq,i)=>{
    const o=AC.createOscillator(),g=AC.createGain();
    o.connect(g);g.connect(AC.destination);
    o.type='sine';o.frequency.setValueAtTime(freq,AC.currentTime+i*0.12);
    g.gain.setValueAtTime(0,AC.currentTime+i*0.12);
    g.gain.linearRampToValueAtTime(0.2,AC.currentTime+i*0.12+0.05);
    g.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+i*0.12+0.3);
    o.start(AC.currentTime+i*0.12);
    o.stop(AC.currentTime+i*0.12+0.3);
  });
}

// Music system
const TRACKS=['audio/level1.mp3','audio/level2.mp3','audio/level3.mp3','audio/level4.mp3','audio/level5.mp3'];
let musicEl=null,currentTrack=-1;
function playMusic(level){
  const idx=Math.min(level,TRACKS.length-1);
  if(idx===currentTrack)return;
  if(musicEl){musicEl.pause();musicEl.currentTime=0;}
  currentTrack=idx;
  musicEl=new Audio(TRACKS[idx]);
  musicEl.loop=true;
  musicEl.volume=0.05;
  musicEl.play().catch(()=>{});
}
function stopMusic(){
  if(musicEl){musicEl.pause();musicEl.currentTime=0;currentTrack=-1;}
}
state='start';reset();state='start';
function loop(t){
  try{
    update(t);
    if(state==='start'){
      if(menuState==='main')drawStartScreen();
      else if(menuState==='levelselect')drawLevelSelect();
    } else {
      drawBg();drawTrack();drawFinishLine();drawParticles();drawBall();drawHUD();
      if(state==='dead')drawOverlay('GAME OVER',gameMode==='select'?'':'Score: '+score,'');

      if(state==='levelcomplete')drawLevelComplete();
      if(state==='enter_name')drawEnterName();
    }
  }catch(err){console.error(err);}
  requestAnimationFrame(loop);
}
requestAnimationFrame(t=>{prevT=t;requestAnimationFrame(loop);});
