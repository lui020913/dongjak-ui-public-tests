/** One native transform animation per settings navigation owner. A new
 * navigation cancels the previous animation before changing view state.
 */
export function createSubpageMotion({reduced=()=>false}={}){
 let active=null;
 function cancel(){const previous=active;active=null;try{previous?.cancel();}catch{}}
 function enter(target,direction='forward'){
  cancel();
  if(!target||reduced()||typeof target.animate!=='function')return;
  const x=direction==='back'?-44:44;
  try{
   const animation=target.animate([{opacity:1,transform:`translateX(${x}px)`},{opacity:1,transform:'translateX(0)'}],{duration:360,easing:'cubic-bezier(.18,.72,.24,1)'});
   active=animation;
   const clear=()=>{if(active===animation)active=null;};
   Promise.resolve(animation.finished).then(clear,clear);
  }catch{/* Appearance must never block navigation. */}
 }
 return {enter,cancel};
}
