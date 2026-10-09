// Flat 3D-like Canvas world and debug map.
import { state } from './state.js';
import { TAU, clamp, hypot } from './math.js';
const el = (id) => document.getElementById(id);
const view = el('view');
const ctx = view.getContext('2d');
const mini = el('map').getContext('2d');

export function resize(){
  let width=view.getBoundingClientRect().width,height=view.getBoundingClientRect().height,pr=Math.min(window.devicePixelRatio||1,1.6);
  view.width=Math.round(width*pr);
  view.height=Math.round(height*pr);
  ctx.setTransform(pr,0,0,pr,0,0);
}

export function render(){
  let s=state;
  if(!s.course)return;
  let w=view.getBoundingClientRect().width,h=view.getBoundingClientRect().height,hor=h*.40,foc=w*.85,yaw=s.yaw,sin=Math.sin(yaw),cos=Math.cos(yaw);
  function camera(x,z){
    let dx=x-s.x,dz=z-s.z;
    return{
      r:dx*cos-dz*sin,f:dx*sin+dz*cos
    }
  }
  function proj(v,y=0){
    let depth=Math.max(.8,v.f);
    return{
      x:w/2+v.r*foc/depth,y:hor+(1.72-y)*foc/depth
    }
  }
  function polyWorld(p,fill){
    let points=p.map(v=>({
      ...camera(v.x,v.z),y:v.y||0
    }
    )),clipped=[];
    for(let j=0;
    j<points.length;
    j++){
      let a=points[j],b=points[(j+1)%points.length],insideA=a.f>=.75,insideB=b.f>=.75;
      if(insideA)clipped.push(a);
      if(insideA!==insideB){
        let t=(.75-a.f)/(b.f-a.f);
        clipped.push({
          r:a.r+(b.r-a.r)*t,f:.75,y:a.y+(b.y-a.y)*t
        }
        )
      }
    }
    if(clipped.length<3)return;
    ctx.beginPath();
    clipped.forEach((v,i)=>{
      let q=proj(v,v.y);
      if(!i)ctx.moveTo(q.x,q.y);
      else ctx.lineTo(q.x,q.y)
    }
    );
    ctx.closePath();
    ctx.fillStyle=fill;
    ctx.fill()
  }
  let sky=ctx.createLinearGradient(0,0,0,hor);
  sky.addColorStop(0,'#79b5c7');
  sky.addColorStop(1,'#c9ddd1');
  ctx.fillStyle=sky;
  ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#7e9e93';
  ctx.beginPath();
  ctx.moveTo(0,hor+20);
  for(let i=0;
  i<=w+12;
  i+=8){
    let a=i/w*TAU*2+yaw*.2;
    ctx.lineTo(i,hor-17+Math.sin(a)*11+Math.sin(a*2.7)*9)
  }
  ctx.lineTo(w,hor+35);
  ctx.lineTo(0,hor+35);
  ctx.fill();
  let grass=ctx.createLinearGradient(0,hor,0,h);
  grass.addColorStop(0,'#718f62');
  grass.addColorStop(1,'#2e583c');
  ctx.fillStyle=grass;
  ctx.fillRect(0,hor+12,w,h);
  let items=[];
  let c=s.course;
  for(const road of c.roads){
    let path=road.poly;
    for(let i=1;
    i<path.length;
    i++){
      let a=path[i-1],b=path[i],m={
        x:(a.x+b.x)/2,z:(a.z+b.z)/2
      }
      ,pos=camera(m.x,m.z);
      if(pos.f< -15||pos.f>180||Math.abs(pos.r)>pos.f*2+22)continue;
      let dx=b.x-a.x,dz=b.z-a.z,len=hypot(dx,dz),px=-dz/len,pz=dx/len;
      items.push({
        depth:pos.f,draw(){
          for(const[width,color] of[[5.8,'#405d41'],[4.65,'#a18d68'],[3.98,'#b3a283']])polyWorld([{
            x:a.x+px*width,z:a.z+pz*width
          }
          ,{
            x:b.x+px*width,z:b.z+pz*width
          }
          ,{
            x:b.x-px*width,z:b.z-pz*width
          }
          ,{
            x:a.x-px*width,z:a.z-pz*width
          }
          ],color)
        }
      }
      )
    }
  }
  for(const p of c.pts){
    let at=camera(p.x,p.z);
    if(at.f< -5||at.f>170||Math.abs(at.r)>at.f*2+15)continue;
    items.push({
      depth:at.f-.2,draw(){
        let vs=[];
        for(let i=0;
        i<14;
        i++){
          let a=TAU*i/14;
          vs.push({
            x:p.x+Math.cos(a)*4.6,z:p.z+Math.sin(a)*4.6
          }
          )
        }
        polyWorld(vs,'#b3a083')
      }
    }
    )
  }
  for(const tree of c.trees){
    let v=camera(tree.x,tree.z);
    if(v.f<1||v.f>160||Math.abs(v.r)>v.f*1.4+15)continue;
    items.push({
      depth:v.f,draw(){
        let bottom=proj(v,0),top=proj(v,tree.h),height=bottom.y-top.y;
        if(height<2)return;
        let cx=top.x,tw=height*.30;
        ctx.fillStyle='#4c4430';
        ctx.fillRect(cx-height*.024,top.y+height*.60,height*.052,height*.40);
        ctx.fillStyle=tree.dark>.5?'#214837':'#2c6242';
        for(let k=0;
        k<3;
        k++){
          let yy=top.y+height*(k*.17),bh=height*(.56-k*.1),hw=tw*(.60+k*.34);
          ctx.beginPath();
          ctx.moveTo(cx,yy);
          ctx.lineTo(cx-hw,yy+bh);
          ctx.lineTo(cx+hw,yy+bh);
          ctx.closePath();
          ctx.fill()
        }
        ctx.fillStyle='#47734f80';
        ctx.beginPath();
        ctx.moveTo(cx,top.y);
        ctx.lineTo(cx-height*.10,top.y+height*.46);
        ctx.lineTo(cx,top.y+height*.40);
        ctx.fill()
      }
    }
    )
  }
  for(const rock of c.rocks){
    let v=camera(rock.x,rock.z);
    if(v.f<1||v.f>140)continue;
    items.push({
      depth:v.f,draw(){
        let a=proj(v),b=proj(v,rock.h),sz=(a.y-b.y)*1.5;
        ctx.fillStyle='#6b7469';
        ctx.beginPath();
        ctx.moveTo(a.x-sz,a.y);
        ctx.lineTo(a.x-sz*.5,b.y);
        ctx.lineTo(a.x+sz*.5,b.y-sz*.2);
        ctx.lineTo(a.x+sz,a.y);
        ctx.fill()
      }
    }
    )
  }
  for(const node of c.pts){
    let v=camera(node.x+4.5,node.z+4.5);
    if(v.f<1||v.f>130)continue;
    items.push({
      depth:v.f-.5,draw(){
        let bottom=proj(v),a=proj(v,2.6),ht=bottom.y-a.y;
        if(ht<4)return;
        let side=ht*.28;
        ctx.strokeStyle='#58452f';
        ctx.lineWidth=clamp(ht*.06,1,6);
        ctx.beginPath();
        ctx.moveTo(bottom.x,bottom.y);
        ctx.lineTo(a.x,a.y);
        ctx.stroke();
        ctx.fillStyle=node.name==='赤い旗'?'#ba5540':'#d0bd83';
        ctx.fillRect(a.x-side,a.y,side*2,ht*.30);
        ctx.strokeStyle='#4d634f';
        ctx.lineWidth=1;
        ctx.strokeRect(a.x-side,a.y,side*2,ht*.30)
      }
    }
    )
  }
  items.sort((a,b)=>b.depth-a.depth);
  for(const item of items)item.draw();
  let closest=null,min=14;
  for(const p of c.pts){
    let d=hypot(s.x-p.x,s.z-p.z);
    if(d<min){
      min=d;
      closest=p
    }
  }
  el('landmark').textContent=closest?closest.name:'林道・森';
  el('feedback').textContent=closest?'近くの目印：'+closest.name:'コマ図の距離と分岐を照らし合わせよう';
  if(el('mapwrap').classList.contains('on'))drawMap();
}

export function drawMap(){
  let c=state.course;
  if(!c)return;
  let width=420,height=360,canvas=el('map');
  mini.clearRect(0,0,width,height);
  mini.fillStyle='#172c26';
  mini.fillRect(0,0,width,height);
  let s=width/350,cx=width/2,cy=height/2;
  let p=(x,z)=>({
    x:cx+x*s,y:cy+z*s
  }
  );
  mini.strokeStyle='#7f9287';
  mini.lineWidth=4;
  for(const road of c.roads){
    mini.beginPath();
    road.poly.forEach((pt,i)=>{
      let a=p(pt.x,pt.z);
      if(!i)mini.moveTo(a.x,a.y);
      else mini.lineTo(a.x,a.y)
    }
    );
    mini.stroke()
  }
  mini.strokeStyle='#d7ef7a';
  mini.lineWidth=6;
  mini.beginPath();
  c.route.forEach((id,i)=>{
    let a=p(c.pts[id].x,c.pts[id].z);
    if(!i)mini.moveTo(a.x,a.y);
    else mini.lineTo(a.x,a.y)
  }
  );
  mini.stroke();
  for(const point of c.pts){
    let a=p(point.x,point.z);
    mini.fillStyle='#d5decb';
    mini.beginPath();
    mini.arc(a.x,a.y,3.5,0,TAU);
    mini.fill()
  }
  let a=p(state.x,state.z);
  mini.fillStyle='#ffffff';
  mini.beginPath();
  mini.arc(a.x,a.y,6,0,TAU);
  mini.fill();
  mini.strokeStyle='#fff';
  mini.beginPath();
  mini.moveTo(a.x,a.y);
  mini.lineTo(a.x+Math.sin(state.yaw)*18,a.y+Math.cos(state.yaw)*18);
  mini.stroke()
}
