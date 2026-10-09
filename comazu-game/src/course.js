// Seeded course / route / roadbook generation, without browser dependencies.
import { clamp, hypot, rng } from './math.js';
const names=['木の看板','白いポール','大きな岩','赤い旗','切り株','小さな小屋'];

export function generate(seed){
  let r=rng(seed),pts=[],adj=Array.from({
    length:25
  }
  ,()=>[]),edges=[],possible=[];
  for(let z=0;
  z<5;
  z++)for(let x=0;
  x<5;
  x++){
    let id=z*5+x;
    pts.push({
      x:(x-2)*59+(r()-.5)*15,z:(z-2)*59+(r()-.5)*15,id,name:names[Math.floor(r()*names.length)]
    }
    );
    if(x)possible.push([id-1,id]);
    if(z)possible.push([id-5,id]);
  }
  const set=new Set([0]);
  function link(a,b){
    adj[a].push(b);
    adj[b].push(a);
    edges.push([a,b]);
  }
  while(set.size<25){
    const fringe=possible.filter(([a,b])=>set.has(a)!==set.has(b));
    const[a,b]=fringe[Math.floor(r()*fringe.length)];
    link(a,b);
    set.add(a);
    set.add(b)
  }
  let parent=Array(25).fill(-1),q=[0],visited=new Set([0]);
  for(let k=0;
  k<q.length;
  k++){
    for(const n of adj[q[k]])if(!visited.has(n)){
      visited.add(n);
      parent[n]=q[k];
      q.push(n)
    }
  }
  let route=[24];
  while(route[0]!==0)route.unshift(parent[route[0]]);
  for(const[a,b] of possible){
    if(!adj[a].includes(b)&&r()<.24)link(a,b)
  }
  let roads=[],total=0,curves={
  }
  ;
  for(const[a,b] of edges){
    let p=pts[a],t=pts[b],dx=t.x-p.x,dz=t.z-p.z,len=hypot(dx,dz),bend=(r()-.5)*14,poly=[];
    for(let i=0;
    i<=9;
    i++){
      let v=i/9,offset=Math.sin(Math.PI*v)*bend;
      poly.push({
        x:p.x+dx*v-dz/len*offset,z:p.z+dz*v+dx/len*offset
      }
      )
    }
    let length=0;
    for(let i=1;
    i<poly.length;
    i++)length+=hypot(poly[i].x-poly[i-1].x,poly[i].z-poly[i-1].z);
    roads.push({
      a,b,poly,length
    }
    );
    curves[a+','+b]=length;
    curves[b+','+a]=length
  }
  let mileage=0,book=[];
  for(let i=0;
  i<route.length;
  i++){
    let id=route[i];
    if(i)mileage+=curves[route[i-1]+','+id];
    book.push({
      id,km:mileage,prev:route[i-1],next:route[i+1],label:i===0?'スタート':i===route.length-1?'ゴール':pts[id].name
    }
    )
  }
  total=mileage;
  const dRoad=(x,z)=>{
    let best=1e9;
    for(const road of roads){
      let pp=road.poly;
      for(let i=1;
      i<pp.length;
      i++){
        let a=pp[i-1],b=pp[i],dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1);
        best=Math.min(best,hypot(x-a.x-dx*t,z-a.z-dz*t))
      }
    }
    return best
  }
  ;
  let trees=[],rocks=[];
  for(let i=0;
  i<560;
  i++){
    let x=(r()-.5)*390,z=(r()-.5)*390,near=dRoad(x,z);
    if(near<8.5)continue;
    trees.push({
      x,z,h:5+r()*9,s:r(),dark:r()
    }
    )
  }
  for(let i=0;
  i<85;
  i++){
    let x=(r()-.5)*385,z=(r()-.5)*385;
    if(dRoad(x,z)>6)rocks.push({
      x,z,h:.5+r()*1.3
    }
    )
  }
  return{
    seed,pts,roads,route,book,total,adj,trees,rocks,dRoad
  }
  ;
}
