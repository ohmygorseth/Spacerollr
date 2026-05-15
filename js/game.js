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
  return{c:LEVEL1[Math.min(i,currentLevelData().length-1)].slice(),e:'n'};
}
function getRow(wz){const i=Math.floor(wz)-tBase;return(i>=0&&i<track.length)?track[i]:null;}
function growTrack(cZ){const need=Math.floor(cZ)+VIEW+6;while(tBase+track.length<=need)track.push(mkRow(tBase+track.length));while(tBase<Math.floor(cZ)-4&&track.length>0){track.shift();tBase++;}}

function loadHS(){try{return JSON.parse(localStorage.getItem('ballzy_hs'))||[];}catch(e){return[];}}
function saveHS(hs){try{localStorage.setItem('ballzy_hs',JSON.stringify(hs));}catch(e){}}
function isHighscore(s){const hs=loadHS();return hs.length<5||s>hs[hs.length-1].score;}
function addHS(name,s){const hs=loadHS();hs.push({name:name.slice(0,12),score:s});hs.sort((a,b)=>b.score-a.score);hs.splice(5);saveHS(hs);}

let camZ,px,pvx,jy,jvy,spd,score,state,hi=0,pts=[],rot=0,currentLevel=0;
let nameInput='',enteringName=false;

function reset(){camZ=0;px=0;pvx=0;jy=0;jvy=0;spd=CONFIG.BASE_SPEED;score=0;pts=[];rot=0;track=[];tBase=0;growTrack(0);state='play';}
function die(){if(score>hi)hi=score;if(isHighscore(score)){state='enter_name';nameInput='';enteringName=true;}else{state='dead';}}
function go(){currentLevel=0;reset();}
function nextLevel(){currentLevel++;camZ=0;px=0;pvx=0;jy=0;jvy=0;pts=[];rot=0;track=[];tBase=0;growTrack(0);}

const K={};
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
  if((state==='dead'||state==='start'||state==='levelcomplete')&&e.key==='Enter')go();
});
document.addEventListener('keyup',e=>K[e.key]=0);
cv.addEventListener('click',()=>{if(state==='dead'||state==='start'||state==='levelcomplete')go();});

function readGamepad(){const pads=navigator.getGamepads?navigator.getGamepads():[];for(const p of pads){if(p)return{left:p.axes[0]<-0.3||p.buttons[14]?.pressed,right:p.axes[0]>0.3||p.buttons[15]?.pressed,jump:p.buttons[0]?.pressed||p.buttons[1]?.pressed,start:p.buttons[9]?.pressed||p.buttons[8]?.pressed};}return{};}
let prevT=0;
function update(t){const gp=readGamepad();if(state!=='play'){if((state==='dead'||state==='start'||state==='levelcomplete')&&(gp.start||gp.jump))go();return;}const dt=Math.min((t-prevT)/1000,.05);prevT=t;camZ+=spd*dt;score=camZ*12|0;spd=Math.min(CONFIG.BASE_SPEED+camZ*CONFIG.SPEED_GROWTH,CONFIG.MAX_SPEED);const left=K['ArrowLeft']||gp.left,right=K['ArrowRight']||gp.right,jump=K[' ']||K['ArrowUp']||gp.jump;pvx+=((right?CONFIG.LATERAL_SPEED:left?-CONFIG.LATERAL_SPEED:0)-pvx)*CONFIG.LATERAL_DRAG*dt;px=Math.max(-THW+.12,Math.min(THW-.12,px+pvx*dt));rot+=spd*dt*(1/BR)*8+pvx*3*dt;if(jump&&jy>=0){jvy=CONFIG.JUMP_VY;jy=-1;}jvy+=CONFIG.GRAVITY*dt;jy+=jvy*dt;if(jy>0){jy=0;jvy=0;}const row=getRow(camZ+PZ),col=Math.max(0,Math.min(COLS-1,Math.floor(px+THW))),solid=row&&row.c[col];if(jy>=0&&!solid){die();return;}if(solid&&jy>=0&&Math.abs(pvx)>1.5&&Math.random()<.15)spawnSpark();for(const p of pts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=300*dt;p.life-=dt;}pts=pts.filter(p=>p.life>0);growTrack(camZ);if(camZ+PZ>=currentLevelData().length){if(score>hi)hi=score;if(isHighscore(score)){state='enter_name';nameInput='';enteringName=true;}else if(currentLevel+1<LEVELS.length){nextLevel();}else{state='levelcomplete';}}}
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
  const NEON=[['#ff00ff','#cc00cc','#ff66ff'],['#00ffff','#00aaaa','#66ffff'],['#aa00ff','#7700bb','#cc66ff'],['#ff0099','#bb006f','#ff66cc'],['#ff6600','#bb4400','#ff9944'],['#00ff88','#00aa55','#66ffaa'],['#ffff00','#aaaa00','#ffff66'],['#ff4444','#aa1111','#ff8888']];
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
      cx.shadowColor=nc[0];cx.shadowBlur=8*pulse*fade;
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
      cx.shadowBlur=0;
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
  cx.shadowColor = '#ffd700';
  cx.shadowBlur = 18 * pulse;
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
  cx.shadowBlur = 0;
  // Label når du er nærme
  if(dist < 12){
    cx.textAlign='center';
    cx.fillStyle='rgba(255,215,0,'+(1-dist/12)+')';
    cx.font='bold 16px monospace';
    cx.fillText('🏁 MÅL!', W/2, p.y - 12);
    cx.textAlign='left';
  }
}
function drawBall(){const p=pr(PZ),bx=W/2+(px/THW)*p.hw,gY=p.y-BR,by=gY+jy;cx.beginPath();cx.ellipse(bx,gY+3,BR*.75,BR*.2,0,0,Math.PI*2);cx.fillStyle='rgba(0,0,0,'+Math.max(0,.4+jy*.003)+')';cx.fill();cx.save();cx.translate(bx,by);cx.rotate(rot);const g=cx.createRadialGradient(-BR*.3,-BR*.35,BR*.05,0,0,BR);g.addColorStop(0,'#aaf5f0');g.addColorStop(.4,'#00c8c0');g.addColorStop(1,'#006f6a');cx.beginPath();cx.arc(0,0,BR,0,Math.PI*2);cx.fillStyle=g;cx.fill();cx.beginPath();cx.arc(-BR*.28,-BR*.32,BR*.2,0,Math.PI*2);cx.fillStyle='rgba(255,255,255,.45)';cx.fill();cx.restore();}
function drawParticles(){for(const p of pts){cx.beginPath();cx.arc(p.x,p.y,Math.max(1,3*p.life),0,Math.PI*2);cx.fillStyle=p.col+(Math.min(255,(p.life*2*255)|0).toString(16).padStart(2,'0'));cx.fill();}}
function drawHUD(){cx.textAlign='left';cx.fillStyle='#fff';cx.font='bold 17px monospace';cx.fillText('SCORE '+score,10,24);if(hi){cx.fillStyle='rgba(255,255,255,.4)';cx.font='11px monospace';cx.fillText('BEST '+hi,10,39);}cx.textAlign='left';}

function drawHighscoreList(x,y){
  const hs=loadHS();cx.textAlign='center';cx.fillStyle='#e0b4ff';cx.font='bold 15px monospace';cx.fillText('🏆 HIGHSCORE',x,y);
  if(hs.length===0){cx.fillStyle='rgba(255,255,255,.4)';cx.font='12px monospace';cx.fillText('Ingen scores ennå',x,y+24);}
  else{hs.forEach((e,i)=>{const medal=['🥇','🥈','🥉','4.','5.'][i];cx.fillStyle=i===0?'#ffd700':i===1?'#c0c0c0':i===2?'#cd7f32':'rgba(255,255,255,.7)';cx.font='13px monospace';cx.fillText(`${medal} ${e.name} — ${e.score}`,x,y+22+i*20);});}
  cx.textAlign='left';
}

function drawOverlay(title,sub1,sub2){
  cx.fillStyle='rgba(0,0,8,.75)';cx.fillRect(0,0,W,H);cx.textAlign='center';
  cx.fillStyle='#e0b4ff';cx.font='bold 44px monospace';cx.fillText(title,W/2,H/2-80);
  cx.fillStyle='#fff';cx.font='19px monospace';cx.fillText(sub1,W/2,H/2-40);
  cx.fillStyle='rgba(255,255,255,.5)';cx.font='13px monospace';cx.fillText(sub2,W/2,H/2-18);
  drawHighscoreList(W/2,H/2+20);
  cx.fillStyle='#4cc9f0';cx.font='14px monospace';cx.fillText('ENTER eller klikk for å spille',W/2,H-20);
  cx.textAlign='left';
}

function drawLevelComplete(){
  cx.fillStyle='rgba(0,0,8,.75)';cx.fillRect(0,0,W,H);cx.textAlign='center';
  cx.fillStyle='#ffd700';cx.font='bold 44px monospace';cx.fillText('🎉 LEVEL 1!',W/2,H/2-60);
  cx.fillStyle='#fff';cx.font='22px monospace';cx.fillText('FULLFØRT!',W/2,H/2-20);
  cx.fillStyle='rgba(255,255,255,.6)';cx.font='16px monospace';cx.fillText('Score: '+score,W/2,H/2+14);
  cx.fillStyle='#4cc9f0';cx.font='14px monospace';cx.fillText('ENTER eller klikk for å spille igjen',W/2,H/2+50);
  cx.textAlign='left';
}

function drawEnterName(){
  cx.fillStyle='rgba(0,0,8,.85)';cx.fillRect(0,0,W,H);cx.textAlign='center';
  const hs=loadHS();const place=hs.filter(e=>e.score>score).length+1;
  const placeStr=place===1?'🥇 1. PLASS!':place===2?'🥈 2. PLASS!':place===3?'🥉 3. PLASS!':place+'. PLASS!';
  cx.fillStyle='#ffd700';cx.font='bold 28px monospace';cx.fillText(placeStr,W/2,H/2-70);
  cx.fillStyle='#fff';cx.font='18px monospace';cx.fillText('Score: '+score,W/2,H/2-38);
  cx.fillStyle='rgba(255,255,255,.6)';cx.font='14px monospace';cx.fillText('Skriv inn navnet ditt:',W/2,H/2-10);
  const bw=220,bh=36,bx=W/2-bw/2,by=H/2+6;
  cx.fillStyle='rgba(255,255,255,.1)';cx.fillRect(bx,by,bw,bh);
  cx.strokeStyle='#4cc9f0';cx.lineWidth=2;cx.strokeRect(bx,by,bw,bh);
  cx.fillStyle='#fff';cx.font='bold 20px monospace';cx.fillText(nameInput+'|',W/2,by+25);
  cx.fillStyle='rgba(255,255,255,.4)';cx.font='12px monospace';cx.fillText('Trykk Enter for å lagre',W/2,H/2+60);
  cx.textAlign='left';
}

state='start';reset();state='start';
function loop(t){
  try{
    update(t);drawBg();drawTrack();drawFinishLine();drawParticles();drawBall();drawHUD();
    if(state==='start')drawOverlay('BALLZY','','Piletaster styr | Space hopp');
    if(state==='dead')drawOverlay('GAME OVER','Score: '+score,'');
    if(state==='levelcomplete')drawLevelComplete();
    if(state==='enter_name')drawEnterName();
  }catch(err){console.error(err);}
  requestAnimationFrame(loop);
}
requestAnimationFrame(t=>{prevT=t;requestAnimationFrame(loop);});
