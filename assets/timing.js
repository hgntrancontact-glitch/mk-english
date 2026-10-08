const entries=[];
export function recordTiming(phase,ms,detail={}) {
  entries.push({phase,ms:Math.round(ms),...detail});
  if(entries.length>100)entries.shift();
}
export function timingReport() {
  return JSON.stringify({version:'0.3.1',measurements:entries},null,2);
}
