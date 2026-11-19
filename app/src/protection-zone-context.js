/** Visibility snapshot limited to research and optional facility overlays.
 * Deliberately leaves vector basemap, transit routes, station labels and 3D buildings alone.
 */
export const BACKGROUND_OVERLAY_IDS=[
 'safety-points','safety-glyphs','safety-hospital-overview','safety-hospital-names',
 'essential-points','essential-glyphs','public-points','public-glyphs','public-names',
 'crosswalk-points','crosswalk-glyphs'
];
export function createProtectionFocusContext(map){
  const previous=new Map();let active=false;
  const currentVisibility=id=>{
    try{return map.getLayoutProperty?.(id,'visibility')??map.getLayer(id)?.layout?.visibility??'visible';}
    catch{return map.getLayer(id)?.layout?.visibility??'visible';}
  };
  function sync(){
    if(!active)return;
    for(const id of BACKGROUND_OVERLAY_IDS){
      if(!map.getLayer(id))continue;
      if(!previous.has(id))previous.set(id,currentVisibility(id));
      if(currentVisibility(id)!=='none')map.setLayoutProperty(id,'visibility','none');
    }
  }
  function activate(){active=true;sync();}
  function restore(){
    active=false;
    for(const [id,value] of previous){
      if(map.getLayer(id)&&currentVisibility(id)!==value)map.setLayoutProperty(id,'visibility',value);
    }
    previous.clear();
  }
  return {activate,restore,sync,isActive:()=>active};
}
