// Roadbook canvas and trip / mode UI.
import { state } from './state.js';
import { TAU, clamp, hypot } from './math.js';
const el = (id) => document.getElementById(id);
const paper = el('symbol').getContext('2d');

export function syncModes(){
  const s=state;
  for(const[id,on,label] of[['runmode',s.runMode,'🏃 走る'],['returnmode',s.returnMode,'↩ 戻る']]){
    const b=el(id);
    b.classList.toggle('on',on);
    b.setAttribute('aria-pressed',String(on));
    b.textContent=label+' '+(on?'ON':'OFF');
  }
  const status=el('tripmode');
  status.textContent=s.returnMode?'減算中 −':'加算中 ＋';
  status.classList.toggle('reverse',s.returnMode);
}

export function renderNote(){
  const s=state,c=s.course,b=c.book[s.note],p=c.pts[b.id];
  el('pos').textContent=String(s.note+1).padStart(2,'0')+' / '+String(c.book.length).padStart(2,'0');
  el('note').querySelector('.km').textContent=(b.km/1000).toFixed(3)+' km';
  el('note').querySelector('.detail').textContent=b.label;
  el('note').querySelector('.caption').textContent=b.next===undefined?'この地点がゴールです。':b.prev===undefined?'ここから出発。次のコマの距離と景色を確認します。':'分岐と目印を確認して、強調された方向へ進んでください。';
  paper.clearRect(0,0,230,230);
  paper.fillStyle='#f1f5e9';
  paper.fillRect(0,0,230,230);
  let inx,inz;
  if(b.prev===undefined){
    let n=c.pts[b.next];
    inx=n.x-p.x;
    inz=n.z-p.z
  }
  else{
    let n=c.pts[b.prev];
    inx=p.x-n.x;
    inz=p.z-n.z
  }
  let ll=hypot(inx,inz);
  inx/=ll;
  inz/=ll;
  let right={
    x:inz,z:-inx
  }
  ;
  function pt(id){
    let n=c.pts[id],dx=n.x-p.x,dz=n.z-p.z,len=hypot(dx,dz);
    return{
      x:115+80*(dx*right.x+dz*right.z)/len,y:115-80*(dx*inx+dz*inz)/len
    }
  }
  const stem={
    x:115,y:205
  }
  ;
  function stroke(x,y,color,width){
    paper.beginPath();
    paper.moveTo(115,115);
    paper.lineTo(x,y);
    paper.strokeStyle=color;
    paper.lineWidth=width;
    paper.lineCap='round';
    paper.stroke()
  }
  for(const nb of c.adj[b.id]){
    const e=pt(nb);
    stroke(e.x,e.y,'#a4b1a7',16)
  }
  if(b.prev!==undefined)stroke(stem.x,stem.y,'#219b75',12);
  else stroke(stem.x,stem.y,'#219b75',12);
  if(b.next!==undefined){
    const e=pt(b.next);
    stroke(e.x,e.y,'#219b75',12);
    const angle=Math.atan2(e.y-115,e.x-115);
    paper.fillStyle='#177b5d';
    paper.beginPath();
    paper.moveTo(e.x,e.y);
    paper.lineTo(e.x-19*Math.cos(angle-.48),e.y-19*Math.sin(angle-.48));
    paper.lineTo(e.x-19*Math.cos(angle+.48),e.y-19*Math.sin(angle+.48));
    paper.fill()
  }
  else{
    paper.fillStyle='#227f61';
    paper.beginPath();
    paper.arc(115,115,17,0,TAU);
    paper.fill();
    paper.fillStyle='white';
    paper.font='bold 14px sans-serif';
    paper.textAlign='center';
    paper.fillText('G',115,120)
  }
  paper.beginPath();
  paper.arc(115,115,5,0,TAU);
  paper.fillStyle='#183e32';
  paper.fill();
  paper.fillStyle='#344d3f';
  paper.font='bold 14px sans-serif';
  paper.textAlign='center';
  paper.fillText(String(s.note+1),200,28);
}

export function note(n){
  state.note=clamp(state.note+n,0,state.course.book.length-1);
  renderNote()
}
