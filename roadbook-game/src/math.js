export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const hypot = (x, z) => Math.hypot(x, z);

export function rng(seed){
  let v=seed>>>0;
  return()=>((v=(Math.imul(v,1664525)+1013904223)>>>0)/4294967296)
}

export function formatTime(sec){
  let m=Math.floor(sec/60),s=Math.floor(sec%60);
  return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')
}
