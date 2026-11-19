/** Map-loading gate: initial vector tiles + district and transit layers.
 * External timetable, news and individual bus stop responses are NOT global
 * prerequisites. On timeout the user can continue rather than being trapped. */
export function createMapStartupLoader({map,documentRef=globalThis.document,timeoutMs=8500}={}){
  const element=documentRef?.getElementById?.('map-startup-overlay');
  const message=documentRef?.getElementById?.('map-startup-message');
  const note=documentRef?.getElementById?.('map-startup-note');
  const button=documentRef?.getElementById?.('map-startup-continue');
  if(!element)return {baseReady(){},boundaryReady(){},transportReady(){},error(){},dismiss(){}};
  const done={base:false,boundary:false,transport:false};
  let ended=false,painted=false;
  const stage=text=>{if(message&&!ended)message.textContent=text;};
  const dismiss=()=>{
    if(ended)return;
    ended=true;clearTimeout(timer);
    element.classList.add('is-hidden');
    element.setAttribute('aria-busy','false');
    setTimeout(()=>{element.hidden=true;},350);
  };
  const update=()=>{
    if(ended)return;
    if(!done.base){stage('지도를 불러오는 중입니다');return;}
    if(!done.boundary){stage('동작구 지도 정보를 준비하고 있습니다');return;}
    // The first navigable map must not wait for optional live-transit or every
    // offscreen tile. Continue heavy layers in the background.
    stage('지도 화면을 표시하고 있습니다');
    if(painted){requestAnimationFrame(()=>requestAnimationFrame(dismiss));return;}
    requestAnimationFrame(()=>{painted=true;requestAnimationFrame(()=>requestAnimationFrame(dismiss));});
  };
  const recover=()=>{
    if(ended)return;
    // Style loaded: show the usable map, even if external boundaries are delayed.
    if(done.base){dismiss();return;}
    stage('일부 지도 자료 연결이 지연되고 있습니다');
    if(note)note.textContent='기본 지도를 먼저 확인할 수 있습니다. 늦게 도착하는 자료는 계속 불러옵니다.';
    if(button)button.hidden=false;
  };
  const timer=setTimeout(recover,timeoutMs);
  button?.addEventListener('click',dismiss);
  map?.on?.('idle',()=>{painted=true;update();});
  return {
    baseReady(){done.base=true;update();},
    boundaryReady(){done.boundary=true;update();},
    transportReady(){done.transport=true;update();},
    error(){recover();},
    dismiss
  };
}
