const symbols = {operator:'Л',switch:'ϟ',fan:'≈',relay:'⚿',tomato:'●',home:'⌂',mechanic:'И',archivist:'М',anchor:'⊥',power:'ϟ',boss:'!',enemy:'×',pump:'≈',record:'≡',cache:'+',drone:'◇'};
const motion = new WeakMap();
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
export function instrumentBounds(canvas) {
  const r=canvas.getBoundingClientRect();
  const ox=r.width<600?17:34, oy=29;
  return {r,ox,oy,sx:(r.width-ox*2)/25,sy:(r.height-oy-45)/25};
}
function movingPoint(canvas,position,chapter,now){
  const x=position%25+.5,y=Math.floor(position/25)+.5;
  let m=motion.get(canvas);
  if(!m||m.chapter!==chapter){m={x,y,toX:x,toY:y,fromX:x,fromY:y,since:now,chapter};motion.set(canvas,m);}
  if(m.toX!==x||m.toY!==y){
    const adjacent=Math.abs(x-m.toX)+Math.abs(y-m.toY)===1;
    Object.assign(m,{fromX:adjacent?m.x:x,fromY:adjacent?m.y:y,toX:x,toY:y,since:now});
  }
  const f=reduced.matches?1:Math.min(1,(now-m.since)/145), ease=f*f*(3-2*f);
  m.x=m.fromX+(m.toX-m.fromX)*ease;m.y=m.fromY+(m.toY-m.fromY)*ease;
  return m;
}
export function drawInstrument(canvas,c,selected,shade){
  const {r,ox,oy,sx,sy}=instrumentBounds(canvas);
  if(sx<=0||sy<=0)return;
  const dpr=Math.min(devicePixelRatio,2),w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  const g=canvas.getContext('2d'),now=performance.now(),tile=Math.min(sx,sy);
  g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,r.width,r.height);
  g.save();g.translate(ox,oy);
  const xy=id=>[(id%25+.5)*sx,(Math.floor(id/25)+.5)*sy];
  const line=(x,y,xx,yy)=>{g.moveTo(x,y);g.lineTo(xx,yy);};
  g.fillStyle='#344a49';
  for(let row=0;row<=25;row++)for(let col=0;col<=25;col++)g.fillRect(col*sx-.65,row*sy-.65,1.3,1.3);
  g.lineWidth=1;g.strokeStyle='#324e4e';g.beginPath();
  for(let i=0;i<=25;i+=5){line(i*sx,0,i*sx,25*sy);line(0,i*sy,25*sx,i*sy);}
  g.globalAlpha=.46;g.stroke();g.globalAlpha=1;
  g.strokeStyle='#55716e';g.strokeRect(0,0,25*sx,25*sy);
  g.fillStyle='#809c92';g.font='10px Consolas,monospace';g.textAlign='center';g.textBaseline='middle';
  for(let i=0;i<25;i+=5){g.fillText(String(i).padStart(2,'0'),(i+.5)*sx,-10);if(ox>20)g.fillText(String(i).padStart(2,'0'),-16,(i+.5)*sy);}
  const visible=new Set(c.visible);
  for(let id=0;id<625;id++){
    if(!c.explored[id]||!c.map.cells[id])continue;
    const col=id%25,row=Math.floor(id/25),x=col*sx,y=row*sy;
    const target=visible.has(id)?1:.46;shade[id]+=(target-shade[id])*.18;
    g.globalAlpha=Math.max(.34,shade[id]);g.fillStyle=c.chapter==='archive'&&c.map.cells[id]>1?'#2a6670':'#29524d';if(c.chapter==='gardens'&&c.flags.light){
      const both=c.flagsOf('copper')?.power==='train';
      if(row===17&&(both||c.flags.light==='warm'))g.fillStyle='#927045';
      if(row===7&&(both||c.flags.light==='cold'))g.fillStyle='#39798b';
    }
    g.fillRect(x,y,sx+.2,sy+.2);
    g.strokeStyle=c.chapter==='archive'?'#93d7db':'#8bcec0';g.lineWidth=1.2;g.beginPath();
    const floor=n=>c.explored[n]&&c.map.cells[n];
    if(!col||!floor(id-1))line(x,y,x,y+sy);if(col===24||!floor(id+1))line(x+sx,y,x+sx,y+sy);
    if(!row||!floor(id-25))line(x,y,x+sx,y);if(row===24||!floor(id+25))line(x,y+sy,x+sx,y+sy);g.stroke();
    if(c.map.cells[id]>1){g.fillStyle='#d8bd84';g.fillRect(x+sx*.36,y+sy*.47,sx*.28,1.2);}
  }
  g.globalAlpha=1;
  function trace(path,color,dashed){
    g.setLineDash(dashed?[5,5]:[]);g.lineDashOffset=reduced.matches?0:-now*.012;
    g.strokeStyle=color;g.lineWidth=2;g.lineJoin='round';g.beginPath();let prev=false;
    for(const id of path){if(!c.explored[id]){prev=false;continue;}const [x,y]=xy(id);if(prev)g.lineTo(x,y);else g.moveTo(x,y);prev=true;}g.stroke();g.setLineDash([]);
  }
  if(c.anchoredPath)trace(c.anchoredPath,'#c99760',false);
  trace([c.position,...c.route],'#c9f9da',true);
  const radius=Math.max(5.5,Math.min(tile*.43,12));
  for(const o of c.objects){
    if(!c.active(o))continue;
    const [x,y]=xy(o.id), hostile=o.type==='enemy'||o.type==='boss';
    const col=o.key==='gardener'&&c.flags.boss?'#a9cde2':hostile?'#f3a190':o.type==='home'?'#a9cde2':'#eac58d';
    g.fillStyle='#102024';g.strokeStyle=col;g.lineWidth=o.id===selected?2.2:1.3;g.beginPath();
    if(hostile){g.moveTo(x,y-radius-1);g.lineTo(x+radius+1,y);g.lineTo(x,y+radius+1);g.lineTo(x-radius-1,y);g.closePath();}else{g.arc(x,y,radius,0,Math.PI*2);}
    g.fill();g.stroke();g.fillStyle=col;g.font='bold '+Math.max(10,radius*1.48)+'px monospace';g.fillText(o.key==='gardener'&&c.flags.boss?'⌂':symbols[o.type]||'?',x,y+.5);
  }
  if(selected!==null){const [x,y]=xy(selected);g.strokeStyle='#ffe6b8';g.lineWidth=1.4;g.strokeRect(x-sx/2,y-sy/2,sx,sy);}
  if(c.flags.boarding){
    trace([c.flags.trainPosition,...c.flags.boarding],'#ffe698',false);
    const t=movingPoint(canvas.parentElement,c.flags.trainPosition,c.chapter,now);
    g.fillStyle='#ffe4a0';g.fillRect(t.x*sx-radius,t.y*sy-radius*.55,radius*2,radius*1.1);
  }
  if(c.companion!==null){const [x,y]=xy(c.companion);g.fillStyle='#e9aa64';g.beginPath();g.arc(x,y,3,0,7);g.fill();}
  const m=movingPoint(canvas,c.position,c.chapter,now),x=m.x*sx,y=m.y*sy;
  const pulse=reduced.matches?.5:(1+Math.sin(now*.003))/2;
  g.beginPath();g.arc(x,y,radius+2+pulse*3,0,7);g.strokeStyle='rgba(174,255,214,'+(.48-pulse*.22)+')';g.stroke();
  g.fillStyle='#e2ffed';g.shadowColor='#83f4be';g.shadowBlur=9;g.beginPath();g.arc(x,y,Math.max(4,radius*.56),0,7);g.fill();g.shadowBlur=0;
  g.restore();
}
