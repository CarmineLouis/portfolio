/* ================= Navegação (SPA) + controle do canvas ================= */
const overlay = document.getElementById('home-overlay');
const pages = {
  portfolio: document.getElementById('portfolio'),
  contact: document.getElementById('contact'),
};
const bg = document.getElementById('bg'); // canvas do réptil

let running = true; // controla se o loop do réptil roda

function fadeShow(el){
  el.classList.remove('hidden','fade-out');
  el.classList.add('fade-in');
}
function fadeHide(el){
  el.classList.remove('fade-in');
  el.classList.add('fade-out');
  el.addEventListener('animationend', () => el.classList.add('hidden'), { once:true });
}

function showHome(){
  bg.classList.remove('is-hidden'); // mostra canvas
  running = true;                   // retoma animação
  fadeShow(overlay);
  Object.values(pages).forEach(p => { if (!p.classList.contains('hidden')) fadeHide(p); });
}
function showPage(id){
  bg.classList.add('is-hidden');    // oculta canvas
  running = false;                  // pausa animação
  fadeHide(overlay);
  Object.entries(pages).forEach(([key,el])=>{
    if (key===id) fadeShow(el); else if (!el.classList.contains('hidden')) fadeHide(el);
  });
}

document.querySelectorAll('[data-nav]').forEach(el=>{
  el.addEventListener('click', ()=>{
    const to = el.getAttribute('data-nav');
    if (to === 'home') showHome(); else showPage(to);
  });
});

showHome(); // estado inicial: home + canvas visível


/* ====================== Réptil (canvas interativo) ====================== */
const SETTINGS = {
  segments: 110, segLen: 14, bodyRadius: 14,
  followHead: 0.22,
  legEvery: 5, legLen: 22, toes: 3, toeLen: 5,
  wiggleAmp: 5, wiggleFreq: 0.012, dashAlpha: 0.22
};
const Input = { mouse: { x: innerWidth/2, y: innerHeight/2, left:false, middle:false, right:false } };

const canvas = document.getElementById('bg');
const ctx = canvas.getContext('2d');

function fit(){ canvas.width = innerWidth; canvas.height = innerHeight; }
fit(); addEventListener('resize', fit);

addEventListener('mousemove', e => { Input.mouse.x = e.clientX; Input.mouse.y = e.clientY; });
addEventListener('mousedown', e => { if(e.button===0)Input.mouse.left=true; if(e.button===1)Input.mouse.middle=true; if(e.button===2)Input.mouse.right=true; });
addEventListener('mouseup',   e => { if(e.button===0)Input.mouse.left=false; if(e.button===1)Input.mouse.middle=false; if(e.button===2)Input.mouse.right=false; });
addEventListener('contextmenu', e => e.preventDefault());

// espinha
const spine = Array.from({ length: SETTINGS.segments }, (_, i) => ({ x: innerWidth/2 - i*SETTINGS.segLen, y: innerHeight/2 }));
const lerp = (a,b,t)=>a+(b-a)*t;

function radiusAt(i,total){
  const t=i/(total-1), head=SETTINGS.bodyRadius;
  const base=head*(1-t)+2, lift=1+0.35*Math.sin(t*Math.PI);
  return Math.max(1.4, base*lift*(0.85+0.15*Math.cos(t*3.2)));
}

/* Pernas e dedos */
function drawToes(foot, baseAngle, color){
  const toes=SETTINGS.toes, spread=0.7;
  ctx.strokeStyle=color; ctx.lineWidth=1.2;
  for(let t=0;t<toes;t++){
    const a = baseAngle + (t-(toes-1)/2)*spread/Math.max(1,(toes-1));
    ctx.beginPath();
    ctx.moveTo(foot.x,foot.y);
    ctx.lineTo(foot.x+Math.cos(a)*SETTINGS.toeLen, foot.y+Math.sin(a)*SETTINGS.toeLen);
    ctx.stroke();
  }
}
function drawLegs(a,b,i,time,color){
  if(i%SETTINGS.legEvery!==0 || i===0) return;
  const dx=b.x-a.x, dy=b.y-a.y, ang=Math.atan2(dy,dx), nx=-Math.sin(ang), ny=Math.cos(ang);
  const phase=(i/SETTINGS.legEvery)%2===0?0:Math.PI;
  const gait=Math.sin(time*0.015 + i*0.25 + phase)*0.6;
  const r=Math.max(2, radiusAt(i,spine.length)*0.55);
  const hipL={x:b.x+nx*(r+2), y:b.y+ny*(r+2)}, hipR={x:b.x-nx*(r+2), y:b.y-ny*(r+2)};
  const len=SETTINGS.legLen*(0.7+0.3*(i/spine.length)), tilt=0.6*gait;
  const footL={x:hipL.x+nx*(len*.2)+Math.cos(ang+Math.PI/2+tilt)*len, y:hipL.y+ny*(len*.2)+Math.sin(ang+Math.PI/2+tilt)*len};
  const footR={x:hipR.x-nx*(len*.2)+Math.cos(ang-Math.PI/2-tilt)*len, y:hipR.y-ny*(len*.2)+Math.sin(ang-Math.PI/2-tilt)*len};
  ctx.strokeStyle=color; ctx.lineWidth=1.2;
  ctx.beginPath(); ctx.moveTo(hipL.x,hipL.y); ctx.lineTo(footL.x,footL.y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(hipR.x,hipR.y); ctx.lineTo(footR.x,footR.y); ctx.stroke();
  drawToes(footL, ang+Math.PI/2+tilt, color);
  drawToes(footR, ang-Math.PI/2-tilt, color);
}

/* Cores */
function currentColor(t){
  if(Input.mouse.left)   return "#ff6b6b";
  if(Input.mouse.middle) return `hsl(${(t*0.1)%360},100%,70%)`;
  if(Input.mouse.right)  return "#74c0fc";
  return "#cfe3f7";
}
const shade=(hex,delta)=>"#"+((n)=>{
  let r=((n>>16)&255)+delta,g=((n>>8)&255)+delta,b=(n&255)+delta;
  r=Math.max(0,Math.min(255,r)); g=Math.max(0,Math.min(255,g)); b=Math.max(0,Math.min(255,b));
  return((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
})(parseInt(hex.slice(1),16));

/* Update */
function update(time){
  const head=spine[0];
  head.x=lerp(head.x, Input.mouse.x, SETTINGS.followHead);
  head.y=lerp(head.y, Input.mouse.y, SETTINGS.followHead);

  const vx=Input.mouse.x-head.x, vy=Input.mouse.y-head.y;
  const ang=Math.atan2(vy,vx), wiggle=SETTINGS.wiggleAmp*Math.sin(time*SETTINGS.wiggleFreq);
  head.x += -Math.sin(ang)*wiggle*0.25;
  head.y +=  Math.cos(ang)*wiggle*0.25;

  for(let i=1;i<spine.length;i++){
    const prev=spine[i-1], curr=spine[i];
    const sway=SETTINGS.wiggleAmp*0.35*Math.sin(time*SETTINGS.wiggleFreq + i*0.3);
    const dx=curr.x-prev.x, dy=curr.y-prev.y, d=Math.hypot(dx,dy)||1e-4, nx=dx/d, ny=dy/d;
    const tx=prev.x+nx*SETTINGS.segLen - ny*sway*0.2;
    const ty=prev.y+ny*SETTINGS.segLen + nx*sway*0.2;
    curr.x=lerp(curr.x,tx,0.9); curr.y=lerp(curr.y,ty,0.9);
  }
}

/* Draw */
function draw(time){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const color=currentColor(time), colorLeg=shade(color,-25);

  for(let i=0;i<spine.length-1;i++){
    const a=spine[i], b=spine[i+1];
    const dx=b.x-a.x, dy=b.y-a.y, ang=Math.atan2(dy,dx);
    const r=radiusAt(i,spine.length);

    ctx.globalAlpha=SETTINGS.dashAlpha; ctx.lineWidth=2; ctx.strokeStyle=color;

    const cx=(a.x+b.x)/2, cy=(a.y+b.y)/2, rx=r*1.2, ry=r*0.55;
    ctx.beginPath();
    const steps=20;
    for(let s=0;s<=steps;s++){
      const t=(s/steps)*Math.PI*2, ex=cx+Math.cos(t)*rx, ey=cy+Math.sin(t)*ry;
      const px=cx+(ex-cx)*Math.cos(ang)-(ey-cy)*Math.sin(ang);
      const py=cy+(ex-cx)*Math.sin(ang)+(ey-cy)*Math.cos(ang);
      if(s===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
    }
    ctx.stroke(); ctx.globalAlpha=1;

    drawLegs(a,b,i,performance.now(),colorLeg);
  }

  // cabeça
  const h=spine[0];
  ctx.fillStyle=color;
  ctx.beginPath(); ctx.arc(h.x,h.y,radiusAt(0,spine.length)*0.7,0,Math.PI*2); ctx.fill();

  // cauda
  const t=spine.length-1, tail=spine[t], prev=spine[t-1];
  const angTail=Math.atan2(tail.y-prev.y, tail.x-prev.x);
  ctx.strokeStyle=color; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(tail.x,tail.y);
  ctx.lineTo(tail.x+Math.cos(angTail)*10, tail.y+Math.sin(angTail)*10);
  ctx.stroke();
}

/* Loop com pausa */
let start=performance.now();
(function loop(now){
  const t=now-start;
  if(running){ update(t); draw(t); }
  requestAnimationFrame(loop);
})(start);
