// Single owner for mutually exclusive analytical road overlays. Point layers
// do not participate. A lease also cancels a late asynchronous layer load.
export function createRoadLayerSelection(){
 let active=null;
 return {claim(key,onRelease){
  if(active?.key===key)return active;
  const previous=active;
  const lease={key,onRelease,isCurrent:()=>active===lease,release:()=>{if(active===lease)active=null;}};
  active=lease;
  previous?.onRelease?.();
  return lease;
 }};
}
const selection=createRoadLayerSelection();
export const claimRoadLayer=(key,onRelease)=>selection.claim(key,onRelease);
export function announcePilotLayer(key){
 if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('dongjak:pilot-layer-enabled',{detail:{key}}));
}
