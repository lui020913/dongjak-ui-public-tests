import {fadePanelOut} from './v852-panel-transition.js';
/** v7.13.0 presentation-only: iOS Safari install guidance and overlay coordination.
 * MapLibre sources, transit estimators and all safety calculations are unchanged.
 */
export function installPlatformUx7130(doc=document,win=window){
  const app=doc.getElementById('app');if(!app)return ()=>{};
  // v886: never auto-open the iOS install guide on top of interactive sheets.
  // The same instructions remain available on demand under 지도 조작 안내 >
  // iPhone에서 앱처럼 사용하기. A non-modal tip is preferable to an
  // unsolicited prompt, which previously sat on top of 도보 길찾기 and
  // intercepted route/search interactions.
  // Opening a transit detail closes any floating 'more' popover and makes
  // the map action rail unavailable until the original panel is closed.
  const panel=doc.getElementById('transport-sheet');
  const sync=()=>{
    const open=!!(panel&&!panel.hidden);
    app.classList.toggle('dj-transport-interaction-open',open);
    if(open){
      const utilities=doc.getElementById('dj-mobile-utilities');
      if(utilities&&!utilities.hidden){
        fadePanelOut(utilities,win,190);
        app.classList.remove('dj-mobile-more-open');
        doc.getElementById('dj-mobile-more-trigger')?.setAttribute('aria-expanded','false');
      }
    }
  };
  const observer=new MutationObserver(sync);
  if(panel)observer.observe(panel,{attributes:true,attributeFilter:['hidden']});sync();
  return ()=>{observer.disconnect();app.classList.remove('dj-transport-interaction-open');};
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
  const boot=()=>installPlatformUx7130();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
}
