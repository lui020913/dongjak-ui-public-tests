/** v7.9.2: mobile header dimmer and R2 shortcut conflict prevention.
 * This file does not alter MapLibre, API traffic or desktop positioning. */
import {installR2Ui} from './v729-r2-new-ui.js';
export function installMobileHeaderFix(doc=document,win=window){
  const app=doc.getElementById('app');
  if(!app || !win.matchMedia)return()=>{};
  const mq=win.matchMedia('(max-width: 699px)');
  const mapOptions=doc.getElementById('map-tools-toggle');
  let scrim=null;
  let shortcutObserver=null;
  function removeShortcut(){doc.getElementById('dj-r2-history-shortcut')?.remove();}
  function update(){
    if(mq.matches){
      if(!scrim){
        scrim=doc.createElement('div');
        scrim.id='dj-mobile-header-dim';
        scrim.setAttribute('aria-hidden','true');
        app.appendChild(scrim);
      }
      removeShortcut();
      // If R2's one-time initializer runs after ours, remove the mobile-only
      // duplicate as soon as it is inserted. No other DOM elements are changed.
      if(!shortcutObserver && mapOptions?.parentElement){
        shortcutObserver=new MutationObserver(removeShortcut);
        shortcutObserver.observe(mapOptions.parentElement,{childList:true});
      }
    }else{
      shortcutObserver?.disconnect();shortcutObserver=null;
      scrim?.remove();scrim=null;
      // The original R2 shortcut stays available on desktop, including
      // resize from mobile. Its original click listener remains unchanged.
      installR2Ui(doc);
    }
  }
  if(mq.addEventListener)mq.addEventListener('change',update);
  else mq.addListener(update);
  update();
  return()=>{
    if(mq.removeEventListener)mq.removeEventListener('change',update);
    else mq.removeListener(update);
    shortcutObserver?.disconnect();
    scrim?.remove();scrim=null;
  };
}
if(typeof document!=='undefined' && typeof window!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>installMobileHeaderFix(),{once:true});
  else installMobileHeaderFix();
}
