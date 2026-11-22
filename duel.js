// Portraits are skinned relief meshes. The front and back surfaces meet at the cutout contour.
const models = new Map();
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const imagePath = name => 'assets/duel/' + name + '.webp';
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

function loadModel(name) {
  if (!models.has(name)) models.set(name, buildModel(name).catch(e => {models.delete(name); throw e;}));
  return models.get(name);
}
async function buildModel(name) {
  const img = new Image();
  img.src = imagePath(name);
  await img.decode();
  const cols = 85, rows = 85, count = cols * rows;
  const sample = document.createElement('canvas');
  sample.width = cols; sample.height = rows;
  const ctx = sample.getContext('2d');
  ctx.drawImage(img, 0, 0, cols, rows);
  const rgba = ctx.getImageData(0, 0, cols, rows).data;
  const inside = Array.from({length:count}, (_,i)=>rgba[i*4+3]>48);
  const depth = new Float32Array(count);
  // Distance inside the silhouette rounds each section into a volume.
  for (let i=0;i<count;i++) {
    const x=i%cols, y=Math.floor(i/cols);
    depth[i]=inside[i] ? Math.min(x,y,cols-1-x,rows-1-y) : 0;
    if(x) depth[i]=Math.min(depth[i],depth[i-1]+1);
    if(y) depth[i]=Math.min(depth[i],depth[i-cols]+1);
  }
  for(let i=count-1;i>=0;i--) {
    if(i%cols<cols-1) depth[i]=Math.min(depth[i],depth[i+1]+1);
    if(i<count-cols) depth[i]=Math.min(depth[i],depth[i+cols]+1);
  }
  const vertices=[], indices=[];
  for(const side of [1,-1]) for(let i=0;i<count;i++){
    const u=i%cols/(cols-1), v=Math.floor(i/cols)/(rows-1);
    const round=Math.sqrt(Math.min(1,depth[i]/24));
    const neck=1-.33*Math.exp(-((v-.64)**2)/.009);
    const z=round*(.115+.074*Math.sin(Math.PI*v))*neck*side;
    vertices.push((u-.5)*img.width/img.height,.5-v,z,u,v);
  }
  const cell=(x,y)=>x>=0&&x<cols-1&&y>=0&&y<rows-1&&[0,1,cols,cols+1].some(k=>inside[y*cols+x+k]);
  for(let y=0;y<rows-1;y++)for(let x=0;x<cols-1;x++){
    if(!cell(x,y))continue;
    const a=y*cols+x,b=a+1,c=a+cols,d=c+1;
    indices.push(a,c,b,b,c,d,a+count,b+count,c+count,b+count,d+count,c+count);
    const wall=(i,j)=>indices.push(i,j,i+count,j,j+count,i+count);
    if(!cell(x-1,y))wall(a,c);
    if(!cell(x+1,y))wall(d,b);
    if(!cell(x,y-1))wall(b,a);
    if(!cell(x,y+1))wall(c,d);
  }
  return {img,vertices:new Float32Array(vertices),indices:new Uint16Array(indices)};
}

const vert = `
attribute vec3 pos; attribute vec2 uv;
uniform vec2 canvasSize, center;
uniform float heightPx, face, yaw, tilt, lift, lean, jaw, brow;
varying vec2 tex; varying float depthLight;
void main(){
  vec3 p=pos;
  float neck=smoothstep(-.23,.18,p.y);
  float headTurn=yaw*neck;
  float co=cos(headTurn),si=sin(headTurn);
  p.xz=mat2(co,-si,si,co)*p.xz;
  float headTilt=tilt*(.2+.8*neck);
  p.y+=.13;
  p.xy=mat2(cos(headTilt),sin(headTilt),-sin(headTilt),cos(headTilt))*p.xy;
  p.y-=.13;
  float cheek=exp(-pow((uv.x-(face>0.0?.74:.30))/.19,2.0));
  p.y-=jaw*cheek*exp(-pow((uv.y-.54)/.10,2.0));
  p.y-=brow*cheek*exp(-pow((uv.y-.32)/.075,2.0));
  p.x+=lean*(.48+.52*neck);
  p.y+=lift*(.3+.7*neck);
  float perspective=3.7/(3.7-p.z);
  vec2 pixels=center+vec2(p.x,-p.y)*heightPx*perspective;
  gl_Position=vec4(2.0*pixels.x/canvasSize.x-1.0,1.0-2.0*pixels.y/canvasSize.y,-p.z,1.0);
  tex=uv;depthLight=p.z*.09+headTurn*p.x*.2;
}`;
const frag=`
precision mediump float;
varying vec2 tex; varying float depthLight;
uniform sampler2D skin; uniform vec3 tint;
void main(){vec4 c=texture2D(skin,tex);if(c.a<.10)discard;
gl_FragColor=vec4(c.rgb*(1.0+depthLight)+tint*c.rgb,c.a);}
`;
function program(gl) {
  const p=gl.createProgram();
  for(const [type,src] of [[gl.VERTEX_SHADER,vert],[gl.FRAGMENT_SHADER,frag]]){
    const shader=gl.createShader(type);gl.shaderSource(shader,src);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));
    gl.attachShader(p,shader);gl.deleteShader(shader);
  }
  gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));
  return p;
}

function pose(event, side, now) {
  const dir=side?-1:1, time=reduce.matches?0:now*.001;
  const state={yaw:dir*(.035+.026*Math.sin(time*.9+side)),tilt:0,lift:.005*Math.sin(time*1.65+side),lean:0,jaw:0,brow:0,tint:[0,0,0]};
  if(!event)return state;
  const progress=clamp((now-event.at)/620,0,1);
  const pulse=(start,end)=>progress<=start||progress>=end?0:Math.sin(Math.PI*(progress-start)/(end-start))**2;
  const push=pulse(.17,.77), wind=pulse(0,.33), recoil=pulse(.28,1);
  const actor=event.who===side, a=event.action;
  if(actor){
    if(a==='guard'){state.lean=-dir*.054*push;state.lift-=.055*push;state.tilt=dir*.12*push;state.brow=.016*push;state.tint=[0,.07*push,.12*push];}
    else if(a==='heal'||a==='repair'){state.tilt=-dir*.09*push;state.lift+=.027*push;state.jaw=.014*push;state.tint=[0,.16*push,.07*push];}
    else {const power=a==='heavy'?1.6:a==='pierce'?.86:1;state.lean=dir*power*(.105*push-.06*wind);state.tilt=dir*power*(.11*wind-.085*push);state.yaw+=dir*.17*push;state.lift+=(a==='pierce'?-.04:.021)*push;state.brow=.023*push;state.jaw=.019*push;}
  }else if(event.hit>0){state.lean=-dir*.09*recoil;state.tilt=dir*.11*recoil;state.yaw-=dir*.15*recoil;state.jaw=.025*recoil;state.tint=[.13*recoil,.015*recoil,0];}
  if(reduce.matches){state.lean=0;state.tilt=0;state.lift=0;state.yaw=0;}
  return state;
}

class DuelView extends HTMLElement {
  constructor(){
    super();this.parts=new Map();this.frame=0;this.foe='sentinel';
    this.canvas=document.createElement('canvas');
    this.canvas.className='duel-render';this.canvas.setAttribute('aria-hidden','true');
    this.effects=document.createElement('div');this.effects.className='duel-effects';
    this.fallback=[0,1].map(side=>{const img=new Image();img.className='duel-backup side-'+side;img.alt='';return img;});
    this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.gl=null;this.classList.remove('gpu-ready');});
    this.canvas.addEventListener('webglcontextrestored',()=>{this.tried=false;this.parts.clear();this.prepare();});
  }
  connectedCallback(){
    if(!this.canvas.parentNode)this.append(...this.fallback,this.canvas,this.effects);
    this.observer??=new ResizeObserver(()=>{
      if(this.id==='classic-duel'&&!this.classList.contains('last-beat')){
        const top=document.querySelector('header').getBoundingClientRect().bottom;
        this.style.top=top+'px';this.style.height=Math.max(0,document.querySelector('#combat').getBoundingClientRect().top-top)+'px';
      }
      this.bounds=this.getBoundingClientRect();this.start();
    });
    if(this.id==='classic-duel')for(const node of document.querySelectorAll('header,#combat'))this.observer.observe(node);
    this.observer.observe(this);this.bounds=this.getBoundingClientRect();
    this.start();
  }
  disconnectedCallback(){cancelAnimationFrame(this.frame);this.frame=0;this.observer?.disconnect();}
  start(){if(!this.frame&&this.isConnected)this.frame=requestAnimationFrame(t=>this.draw(t));}
  configure(foe,area,event){
    if(this.classList.contains('last-beat')&&event!==this.event){
      clearTimeout(this.exitTimer);this.classList.remove('last-beat');
      if(this.id!=='classic-duel')this.removeAttribute('style');
    }
    this.foe=foe;this.dataset.area=area;
    for(const [i,name] of ['conductor',foe].entries()){
      if(this.fallback[i].dataset.skin!==name){this.fallback[i].dataset.skin=name;this.fallback[i].src=imagePath(name);}
    }
    this.prepare();
    if(event&&this.event!==event){this.event=event;this.feedback(event);}
    if(!event){this.event=null;this.effects.replaceChildren();}
    this.start();
  }
  finishBeat(){
    const rect=this.getBoundingClientRect();
    if(!rect.width)return;
    const classic=this.id==='classic-duel';
    if(!classic){
      Object.assign(this.style,{position:'fixed',left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'});
      document.body.append(this);
    }
    this.classList.add('last-beat');
    clearTimeout(this.exitTimer);
    this.exitTimer=setTimeout(()=>{
      this.classList.remove('last-beat');
      if(!classic&&this.parentNode===document.body){this.remove();this.removeAttribute('style');}
    },460);
  }
  feedback(e){
    const feedback=(side,text,type)=>{
      const el=document.createElement('span');el.className='duel-number '+type+' side-'+side;el.textContent=text;
      this.effects.append(el);el.addEventListener('animationend',()=>el.remove(),{once:true});setTimeout(()=>el.remove(),1200);
    };
    if(e.hit>0)feedback(1-e.who,'♥ −'+Math.ceil(e.hit),'damage');
    if(e.heal>0)feedback(e.who,'♥ +'+Math.ceil(e.heal),'mend');
    if(e.action==='guard'||e.action==='repair')feedback(e.who,e.action==='guard'?'⬟':'⚙','ward');
  }
  prepare(){
    if(!this.tried){
      this.tried=true;
      try{
        const gl=this.canvas.getContext('webgl',{antialias:true,alpha:true,premultipliedAlpha:false});
        if(!gl)return;
        this.p=program(gl);gl.useProgram(this.p);this.gl=gl;
        this.loc=Object.fromEntries(['canvasSize','center','heightPx','face','yaw','tilt','lift','lean','jaw','brow','tint'].map(n=>[n,gl.getUniformLocation(this.p,n)]));
        this.pos=gl.getAttribLocation(this.p,'pos');this.uv=gl.getAttribLocation(this.p,'uv');
        gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
      }catch{this.gl=null;}
    }
    const gl=this.gl;if(!gl)return;
    for(const name of ['conductor',this.foe]){
      if(this.parts.has(name))continue;
      this.parts.set(name,null);
      loadModel(name).then(({img,vertices,indices})=>{
        if(this.gl!==gl)return;
        const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);
        const index=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);
        const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
        for(const k of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,k,gl.LINEAR);
        for(const k of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,k,gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
        this.parts.set(name,{buffer,index,texture,count:indices.length});this.start();
      }).catch(()=>{this.parts.delete(name);});
    }
  }
  draw(now){
    this.frame=0;
    if(!this.isConnected||this.hidden)return;
    const r=this.bounds;if(!r||!r.width||!r.height){return;}
    const w=r.width,h=r.height,pixelRatio=Math.min(devicePixelRatio,2);
    const size=Math.min(h*1.06,w*(w<620?.68:.50));
    const gl=this.gl,ready=!!(gl&&this.parts.get('conductor')&&this.parts.get(this.foe));
    this.classList.toggle('gpu-ready',ready);
    if(ready){
      const rw=Math.round(w*pixelRatio),rh=Math.round(h*pixelRatio);
      if(this.canvas.width!==rw||this.canvas.height!==rh){this.canvas.width=rw;this.canvas.height=rh;}
      gl.viewport(0,0,rw,rh);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniform2f(this.loc.canvasSize,w,h);
    }
    for(const [side,name] of ['conductor',this.foe].entries()){
      const s=pose(this.event,side,now);
      if(!ready){const img=this.fallback[side];img.style.height=size+'px';img.style.transform='translateX(-50%) translate('+s.lean*size+'px,'+(-s.lift*size)+'px) rotate('+(-s.tilt)+'rad)';continue;}
      const m=this.parts.get(name);
      gl.bindBuffer(gl.ARRAY_BUFFER,m.buffer);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,m.index);gl.bindTexture(gl.TEXTURE_2D,m.texture);
      gl.enableVertexAttribArray(this.pos);gl.vertexAttribPointer(this.pos,3,gl.FLOAT,false,20,0);
      gl.enableVertexAttribArray(this.uv);gl.vertexAttribPointer(this.uv,2,gl.FLOAT,false,20,12);
      gl.uniform2f(this.loc.center,w*(side?.735:.265),h-size*.475);
      gl.uniform1f(this.loc.heightPx,size);gl.uniform1f(this.loc.face,side?-1:1);
      for(const k of ['yaw','tilt','lift','lean','jaw','brow'])gl.uniform1f(this.loc[k],s[k]);
      gl.uniform3fv(this.loc.tint,s.tint);gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_SHORT,0);
    }
    this.start();
  }
}
customElements.define('duel-view',DuelView);
