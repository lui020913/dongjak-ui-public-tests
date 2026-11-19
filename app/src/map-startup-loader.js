/** Map-loading gate: initial vector tiles + district and transit layers.
 * External timetable, news and individual bus stop responses are NOT global
 * prerequisites. On timeout the user can continue rather than being trapped. */
export function createMapStartupLoader({map,documentRef=globalThis.document,timeoutMs=8500}={}){
  const element=documentRef?.getElementById?.('map-startup-overlay');
  const message=documentRef?.getElementById?.('map-startup-message');
  const note=documentRef?.getElementById?.('map-startup-note');
  const button=documentRef?.getElementById?.('map-startup-continue');
  if(!element)return {baseReady(){},boundaryReady(){},transportReady(){},error(){},dismiss(){}};
  // Milestone-based visual estimate, not network-byte progress. Optional
  // transit/live data stays outside the initial navigable-map gate.
  const win=documentRef?.defaultView||globalThis;
  const done={base:false,boundary:false};
  let ended=false,renderQueued=false,complete=false,recoveryOffered=false;
  let progress=0,timer=null,finishTimer=null,frame=null;
  const reduced=()=>Boolean(win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
  const requestFrame=fn=>typeof win.requestAnimationFrame==='function'
    ?win.requestAnimationFrame(fn):win.setTimeout(fn,16);
  const cancelFrame=id=>typeof win.requestAnimationFrame==='function'
    ?win.cancelAnimationFrame?.(id):win.clearTimeout(id);
  const stage=text=>{if(message&&!ended)message.textContent=text;};
  const advance=value=>{
    if(ended||element.hidden||value<=progress)return;
    progress=Math.min(1,value);
    element.style.setProperty('--start-progress',String(progress));
  };
  const dismiss=()=>{
    if(ended)return;
    ended=true;
    if(timer!==null)win.clearTimeout(timer);
    if(finishTimer!==null)win.clearTimeout(finishTimer);
    if(frame!==null)cancelFrame(frame);
    frame=null;
    button?.removeEventListener('click',dismiss);
    map?.off?.('idle',onIdle);
    element.classList.add('is-hidden');
    element.setAttribute('aria-busy','false');
    if(reduced())element.hidden=true;
    else win.setTimeout(()=>{element.hidden=true;},350);
  };
  const update=()=>{
    if(ended||complete||element.hidden)return;
    if(!done.base){
      if(!recoveryOffered)stage('지도를 불러오는 중입니다');
      return;
    }
    advance(.58);
    if(!done.boundary){
      if(!recoveryOffered)stage('동작구 지도 정보를 준비하고 있습니다');
      return;
    }
    // Queue once even if map idle, duplicate callbacks, or late transit arrive.
    if(renderQueued)return;
    renderQueued=true;
    advance(.87);
    stage('지도 화면을 표시하고 있습니다');
    if(note)note.textContent='지도 화면을 마무리하고 있습니다.';
    frame=requestFrame(()=>{
      frame=requestFrame(()=>{
        frame=null;
        if(ended||element.hidden)return;
        complete=true;
        if(timer!==null)win.clearTimeout(timer);
        if(button)button.hidden=true;
        advance(1);
        stage('지도 준비가 완료되었습니다');
        // Let the CSS fill reach its endpoint before starting the overlay fade.
        finishTimer=win.setTimeout(dismiss,reduced()?0:500);
      });
    });
  };
  function onIdle(){update();}
  const recover=()=>{
    if(ended||complete||element.hidden)return;
    // Do not fake a full bar when taking the existing degraded/timeout path.
    if(done.base){dismiss();return;}
    recoveryOffered=true;
    stage('일부 지도 자료 연결이 지연되고 있습니다');
    if(note)note.textContent='기본 지도를 먼저 확인할 수 있습니다. 늦게 도착하는 자료는 계속 불러옵니다.';
    if(button)button.hidden=false;
  };
  timer=win.setTimeout(recover,timeoutMs);
  button?.addEventListener('click',dismiss);
  map?.on?.('idle',onIdle);
  element.setAttribute('data-dj-startup-controller','true');
  advance(.12);
  return {
    baseReady(){if(!ended){done.base=true;update();}},
    boundaryReady(){if(!ended){done.boundary=true;update();}},
    transportReady(){/* Optional layer: never blocks or completes initial startup. */},
    error(){recover();},
    dismiss
  };
}
