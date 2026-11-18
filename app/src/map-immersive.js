/**
 * Hide only the map's white header, sheet and bottom navigation after intentional
 * user map interaction. A small explicit button restores the original interface.
 * Map is still interactive; navigation is never permanently lost.
 */
export function installMapImmersive({map,app,restoreButton,canHide=()=>true,onRestore=()=>{}}){
  const isOnMap=()=>app?.dataset?.tab==='map';
  function hide(){
    // v5.4: navigation and search are persistent; map gestures never hide them.
    return;
  }
  function restore(){
    app?.classList.remove('map-immersive');
    if(restoreButton)restoreButton.hidden=true;
    onRestore();
  }
  if(restoreButton)restoreButton.hidden=true;
  restoreButton?.addEventListener('click',restore);
  map.on('dragstart',hide);
  map.on('rotatestart',hide);
  map.on('pitchstart',hide);
  map.on('zoomstart',event=>{
    // Programmatic flyTo/fitBounds must not collapse the user interface.
    if(event?.originalEvent)hide();
  });
  return {hide,restore,isHidden:()=>app.classList.contains('map-immersive')};
}
