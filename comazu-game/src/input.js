// Keyboard, mouse and touch event bindings.
import { state } from './state.js?v=20261010-landmarks-v4';
import { note, syncModes } from './roadbook.js?v=20261010-landmark-variety-v10';
import { drawMap } from './scene.js?v=20261010-landmarks-v4';
const el=(id)=>document.getElementById(id);

export function setupInput(start) {
const view=el('view');
el('runmode').addEventListener('click',()=>{
  state.runMode=!state.runMode;
  syncModes()
}
);
el('returnmode').addEventListener('click',()=>{
  state.returnMode=!state.returnMode;
  syncModes()
}
);
el('next').addEventListener('click',()=>note(1));
el('prev').addEventListener('click',()=>note(-1));
el('plus').addEventListener('click',()=>{
  state.trip+=10;
  el('trip').textContent=(state.trip/1000).toFixed(3)
}
);
el('minus').addEventListener('click',()=>{
  state.trip=Math.max(0,state.trip-10);
  el('trip').textContent=(state.trip/1000).toFixed(3)
}
);
const newCourse=()=>start((Math.random()*4294967295)>>>0);
el('new').addEventListener('click',newCourse);
el('again').addEventListener('click',newCourse);
el('restart').addEventListener('click', () => {
  const currentSeed = state.course.seed;
  start(currentSeed, true); // Same course: reset position and trip; keep elapsed time.
});
el('hints').addEventListener('click', () => {
  state.hintsVisible = !state.hintsVisible;
  const shown = state.hintsVisible;
  el('game').classList.toggle('hints-off', !shown);
  const button = el('hints');
  button.setAttribute('aria-pressed', String(shown));
  button.textContent = shown ? '💡 ヒント ON' : '💡 ヒント OFF';
  button.classList.toggle('on', shown);
});
el('mapbtn').addEventListener('click',()=>{
  let on=el('mapwrap').classList.toggle('on');
  el('mapbtn').textContent=on?'地図を隠す':'地図（確認用）';
  if(on)drawMap()
}
);
const keyTable={
  w:'w',a:'a',s:'s',d:'d',Shift:'Shift',ArrowRight:'ArrowRight',ArrowLeft:'ArrowLeft'
}
;
addEventListener('keydown',e=>{
  if(['ArrowRight','ArrowLeft','ArrowUp','ArrowDown',' '].includes(e.key))e.preventDefault();
  if(e.key==='ArrowDown'&&!e.repeat)note(1);
  if(e.key==='ArrowUp'&&!e.repeat)note(-1);
  if(e.key==='j'&&!e.repeat){
    state.trip=Math.max(0,state.trip-10)
  }
  if(e.key==='k'&&!e.repeat)state.trip+=10;
  if(e.key.toLowerCase()==='f'&&!e.repeat){
    state.runMode=!state.runMode;
    syncModes()
  }
  if(e.key.toLowerCase()==='r'&&!e.repeat){
    state.returnMode=!state.returnMode;
    syncModes()
  }
  if(keyTable[e.key])state.keys.add(keyTable[e.key])
}
);
addEventListener('keyup',e=>{
  if(keyTable[e.key])state.keys.delete(keyTable[e.key])
}
);
addEventListener('blur',()=>state.keys.clear());
const gameRoot=el('game');
for(const type of['selectstart','contextmenu','dragstart']){
  gameRoot.addEventListener(type,e=>e.preventDefault());
}
for(const control of document.querySelectorAll('#mobile [data-hold], #view')){
  control.addEventListener('touchstart',e=>e.preventDefault(),{
    passive:false
  }
  );
  control.addEventListener('touchmove',e=>e.preventDefault(),{
    passive:false
  }
  );
}
for(const b of document.querySelectorAll('[data-hold]')){
  let act=b.dataset.hold;
  b.addEventListener('pointerdown',e=>{
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    state.keys.add(act);
    b.classList.add('on')
  }
  );
  const up=e=>{
    state.keys.delete(act);
    b.classList.remove('on')
  }
  ;
  b.addEventListener('pointerup',up);
  b.addEventListener('pointercancel',up);
  b.addEventListener('lostpointercapture',up)
}
let oldX=0;
view.addEventListener('pointerdown',e=>{
  state.drag=true;
  oldX=e.clientX;
  view.setPointerCapture(e.pointerId)
}
);
view.addEventListener('pointermove',e=>{
  if(state.drag){
    state.yaw+=(e.clientX-oldX)*.006;
    oldX=e.clientX
  }
}
);
view.addEventListener('pointerup',()=>state.drag=false);
view.addEventListener('pointercancel',()=>state.drag=false);

}