/** v8.2.5 — UI-only extension. The protected map/routing engine is unchanged. */
import {deriveWalkingTurns,nextTurnCue} from './v825-walk-guidance.js';
import {makeRouteIndex} from './navigation-geometry.js';
import {applySelectedNavVoice} from './nav-voice-picker.js';
import './v825-navigation-experience.css';

const $=id=>document.getElementById(id);
const parseRemaining=text=>{
  const match=String(text||'').match(/([\d,.]+)\s*(km|m)/i);
  if(!match)return NaN;
  return Number(match[1].replaceAll(',',''))*(match[2].toLowerCase()==='km'?1000:1);
};
const isRealTurn=route=>Array.isArray(route?.maneuvers)&&route.maneuvers.some(x=>[9,10,11,12,13,14,15,16,18,19,20,21,23,24,26,27,40,41].includes(Number(x.type)));
export function installWalkingNavigationExperience(doc=document,win=window){
  const app=doc.getElementById('app'),card=doc.getElementById('nav-live-card');
  if(!app||!card)return ()=>{};
  let latest=null,selected='standard',turns=[],index=null,voiced=new Set(),lastRouteToken='',suppressedForReroute=false;
  const getRoute=()=>latest?.[selected]||latest?.standard||latest?.gentle;
  function resetTurnTracking(){
    const route=getRoute();
    index=null;turns=[];voiced=new Set();suppressedForReroute=false;
    if(!route?.coords?.length)return;
    try{index=makeRouteIndex(route.coords);}catch{return;}
    if(!isRealTurn(route))turns=deriveWalkingTurns(route.coords);
  }
  const onVariants=e=>{
    latest=e.detail;
    selected=latest?.standard?'standard':'gentle';
    resetTurnTracking();
  };
  const onNativeChoice=e=>{
    const button=e.target.closest?.('#route-variants [data-route-variant]');
    if(!button||!latest?.[button.dataset.routeVariant]||button.disabled)return;
    selected=button.dataset.routeVariant;resetTurnTracking();
  };
  let session=false;
  function updateState(){
    const guiding=app.classList.contains('route-guiding')&&!card.hidden;
    app.dataset.dj825NavActive=String(guiding);
    if(!guiding){session=false;voiced.clear();return;}
    if(!session){session=true;voiced.clear();}
    const marker=doc.querySelector('.nav-position-dot.maplibregl-marker');
    app.dataset.dj825HasGps=String(Boolean(marker));
    const warning=doc.getElementById('nav-warning');
    const errorText=warning?.textContent||'';
    warning?.classList.toggle('dj825-nav-alert',/거부|실패|낮아|오차가|정확도가|벗어|급격|재탐색/.test(errorText));
    if(/다시 찾는 중|새 경로|재탐색에/.test(errorText))suppressedForReroute=true;
    if(!index||!turns.length||suppressedForReroute)return;
    const accuracyText=doc.getElementById('nav-accuracy')?.textContent||'';
    const accuracy=Number((accuracyText.match(/(?:오차|정확도)\s*(?:약)?\s*(\d+)/)||[])[1]);
    if(!Number.isFinite(accuracy)||accuracy>40)return;
    const remain=parseRemaining(doc.getElementById('nav-remain-distance')?.textContent);
    if(!Number.isFinite(remain))return;
    const progress=Math.max(0,index.total-remain);
    const next=turns.find(t=>t.at>progress+5);
    if(!next)return;
    const dist=Math.max(0,next.at-progress);
    if(dist>165)return;
    const instruction=doc.getElementById('nav-instruction');
    // A routing provider's actual maneuver is authoritative. Supplement only
    // locally calculated paths that have no turn-by-turn instructions.
    if(instruction){
      const label=dist>18?`${Math.round(dist/5)*5}m 앞 · ${next.label} 방향`:`${next.label} 방향`;
      if(instruction.textContent!==label)instruction.textContent=label;
    }
    const cue=nextTurnCue(next,dist,voiced);
    if(!cue)return;
    voiced.add(cue.key);
    if(doc.getElementById('nav-voice')?.getAttribute('aria-pressed')!=='true'||doc.hidden)return;
    if(!win.speechSynthesis||!win.SpeechSynthesisUtterance)return;
    try{
      const utterance=new win.SpeechSynthesisUtterance(cue.text);
      utterance.lang='ko-KR';utterance.rate=1.02;utterance.volume=.95;
      applySelectedNavVoice(utterance);
      win.speechSynthesis.cancel();win.speechSynthesis.speak(utterance);
    }catch{}
  }
  const onReset=()=>{latest=null;index=null;turns=[];voiced.clear();};
  doc.getElementById('route-calc')?.addEventListener('click',onReset);
  doc.getElementById('route-clear')?.addEventListener('click',onReset);
  win.addEventListener('dongjak:route-variants-ready',onVariants);
  doc.getElementById('route-variants')?.addEventListener('click',onNativeChoice,true);
  const observer=new MutationObserver(()=>updateState());
  for(const [el,opts] of [
    [app,{attributes:true,attributeFilter:['class']}],
    [card,{attributes:true,attributeFilter:['hidden']}],
    [doc.getElementById('nav-remain-distance'),{childList:true,characterData:true,subtree:true}],
    [doc.getElementById('nav-warning'),{childList:true,characterData:true,subtree:true}],
    [doc.getElementById('nav-accuracy'),{childList:true,characterData:true,subtree:true}]
  ])if(el)observer.observe(el,opts);
  // Marker exists only after a successful GPS fix; do not draw a fake location.
  const mapRoot=doc.getElementById('map');
  if(mapRoot)observer.observe(mapRoot,{childList:true,subtree:true});
  updateState();
  return ()=>{observer.disconnect();win.removeEventListener('dongjak:route-variants-ready',onVariants);
    doc.getElementById('route-calc')?.removeEventListener('click',onReset);
    doc.getElementById('route-clear')?.removeEventListener('click',onReset);
    doc.getElementById('route-variants')?.removeEventListener('click',onNativeChoice,true);
    delete app.dataset.dj825NavActive;delete app.dataset.dj825HasGps;};
}
if(typeof document!=='undefined'){
  const boot=()=>installWalkingNavigationExperience();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
}
