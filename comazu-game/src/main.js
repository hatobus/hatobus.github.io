// Application entrypoint / frame loop.
import { generate } from './course.js?v=20261010-cap-v9';
import { state, resetState } from './state.js?v=20261010-landmarks-v4';
import { clamp, hypot, formatTime } from './math.js?v=20261010-landmarks-v4';
import { renderNote, syncModes } from './roadbook.js?v=20261010-cap-v9';
import { render, drawMap, resize } from './scene.js?v=20261010-cap-v9';
import { setupInput } from './input.js?v=20261010-hints-v8';
import { moveWithinRoad } from './movement.js?v=20261010-road-only-v7';
import { capFromYaw, formatCap } from './heading.js?v=20261010-cap-v9';
const el=(id)=>document.getElementById(id);

function start(seed, preserveElapsed=false){
  const elapsed = preserveElapsed && state.course ? state.secs : 0;
  const hintsVisible = state.hintsVisible ?? false;
  let course=generate(seed),p=course.pts[course.route[0]],next=course.pts[course.route[1]];
  resetState({
    course,x:p.x,z:p.z,yaw:Math.PI - (course.book[0].cap * Math.PI / 180),trip:0,actualDistance:0,returnMode:false,runMode:false,note:0,secs:elapsed,hintsVisible,started:performance.now(),passed:1,done:false,keys:new Set(),drag:false,hover:''
  }
  );
  el('clock').textContent=formatTime(elapsed);
  el('trip').textContent='0.000';
  el('cap').textContent=formatCap(capFromYaw(state.yaw));
  el('seed').textContent='SEED '+seed;
  el('distance').textContent=Math.round(course.total)+' m';
  el('notes').textContent=course.book.length+' コマ';
  el('win').classList.remove('on');
  el('mapwrap').classList.remove('on');
  el('mapbtn').textContent='地図（確認用）';
  el('game').classList.toggle('hints-off', !hintsVisible);
  const hintButton=el('hints');
  hintButton.textContent=hintsVisible ? '💡 ヒント ON' : '💡 ヒント OFF';
  hintButton.setAttribute('aria-pressed', String(hintsVisible));
  hintButton.classList.toggle('on', hintsVisible);
  renderNote();
  syncModes();
  drawMap();
}

function tick(t){
  let s=state,delta=Math.min((t-(tick.last||t))/1000,.05);
  tick.last=t;
  if(s.course&&!s.done){
    let k=s.keys,move=(k.has('forward')||k.has('w')||k.has('ArrowUp')?1:0)-(k.has('back')||k.has('s')?1:0),side=(k.has('d')?1:0)-(k.has('a')?1:0);
    let turn=(k.has('turnR')||k.has('ArrowRight')?1:0)-(k.has('turnL')||k.has('ArrowLeft')?1:0);
    s.yaw+=turn*delta*1.8;
    const speed=(s.runMode||k.has('Shift')?18:9)*delta;
    let dx=Math.sin(s.yaw)*move+Math.cos(s.yaw)*side,dz=Math.cos(s.yaw)*move-Math.sin(s.yaw)*side,mag=Math.max(1,hypot(dx,dz));
    dx=dx/mag*speed;
    dz=dz/mag*speed;
    const oldX=s.x,oldZ=s.z;
    const position=moveWithinRoad(s.course,s.x,s.z,dx,dz);
    s.x=position.x;
    s.z=position.z;
    const moved=hypot(s.x-oldX,s.z-oldZ);
    s.actualDistance+=moved;
    s.trip=Math.max(0,s.trip+(s.returnMode?-moved:moved));
    if(s.passed<s.course.route.length){
      let pt=s.course.pts[s.course.route[s.passed]];
      if(hypot(s.x-pt.x,s.z-pt.z)<10){
        s.passed++;
        if(s.passed===s.course.route.length){
          s.done=true;
          el('win').classList.add('on');
          el('result').innerHTML='正解ルート '+Math.round(s.course.total)+'m を走破！<br>実際の移動距離 '+Math.round(s.actualDistance)+'m／所要時間 '+formatTime(s.secs)+'<br>このシード：'+s.course.seed;
        }
      }
    }
    s.secs+=delta;
    el('trip').textContent=(s.trip/1000).toFixed(3);
    el('clock').textContent=formatTime(s.secs);
    el('cap').textContent=formatCap(capFromYaw(s.yaw));
    render()
  }
  requestAnimationFrame(tick)
}

resize();
window.addEventListener('resize',resize);
start(20261009);
setupInput(start);
requestAnimationFrame(tick);