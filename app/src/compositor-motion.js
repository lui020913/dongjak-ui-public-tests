/**
 * Compositor-first opacity motion. Native screen state stays with its caller.
 * Inline-important transition longhands deliberately override legacy CSS;
 * the browser interpolates opacity instead of JavaScript writing every frame.
 * No layout reads during interpolation, no root snapshots, no global loop.
 */
export const COMPOSITOR_MOTION=Object.freeze({
  tabEnter:300,tabReturn:220,easing:'cubic-bezier(.42,0,.58,1)'
});
const properties=['opacity','animation-name','transition-property','transition-duration','transition-timing-function','transition-delay','will-change'];
export function startOpacityMotion(nodes,{from=0,to=1,duration=300,easing=COMPOSITOR_MOTION.easing,win=globalThis.window,onFinish}={}){
  nodes=[...new Set(nodes||[])].filter(Boolean);
  if(!nodes.length||!win?.requestAnimationFrame||!win.getComputedStyle||
    !win.CSS?.supports?.('transition','opacity 1ms linear')||
    nodes.some(node=>!node.style||!node.addEventListener))return null;
  const saved=nodes.map(node=>({node,values:properties.map(key=>[key,node.style.getPropertyValue(key),node.style.getPropertyPriority(key)])}));
  let settled=false,frame=0,timer=0,started=false;
  const set=(node,key,value)=>node.style.setProperty(key,value,'important');
  const listener=event=>{if(started&&event.target===event.currentTarget&&event.propertyName==='opacity')finish(true);};
  function finish(complete){
    if(settled)return;
    settled=true;
    if(frame)win.cancelAnimationFrame?.(frame);
    if(timer)win.clearTimeout(timer);
    for(const node of nodes)node.removeEventListener('transitionend',listener);
    // Commit native hide/cleanup before restoring the outgoing layer.
    try{if(complete)onFinish?.();}
    finally{
      for(const {node,values} of saved){
        set(node,'transition-property','none');
        // Restore original opacity before the old transitions are reinstated.
        for(const [key,value,priority] of values){
          if(key==='transition-property')continue;
          if(value)node.style.setProperty(key,value,priority);else node.style.removeProperty(key);
        }
        const [key,value,priority]=values.find(x=>x[0]==='transition-property');
        if(value)node.style.setProperty(key,value,priority);else node.style.removeProperty(key);
      }
    }
  }
  for(const node of nodes){
    set(node,'animation-name','none');
    set(node,'transition-property','none');
    set(node,'will-change','opacity');
    set(node,'opacity',String(from));
    node.addEventListener('transitionend',listener);
  }
  // One style synchronization at the boundary, not one per rendered frame.
  for(const node of nodes)void win.getComputedStyle(node).opacity;
  timer=win.setTimeout(()=>finish(true),4500);
  frame=win.requestAnimationFrame(()=>{
    frame=0;if(settled)return;
    started=true;win.clearTimeout(timer);
    for(const node of nodes){
      set(node,'transition-duration',duration+'ms');
      set(node,'transition-timing-function',easing);
      set(node,'transition-delay','0ms');
      set(node,'transition-property','opacity');
      set(node,'opacity',String(to));
    }
    // Bounded cleanup even if Safari omits transitionend.
    timer=win.setTimeout(()=>finish(true),Math.max(700,duration+250));
  });
  return {cancel:()=>finish(false)};
}
