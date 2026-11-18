/** v7.10.4 Mobile-only map-action proxies (keep existing PC handlers). */
export function installMobileMapActionRail(doc=document, win=window){
  const app=doc.getElementById('app');
  const mq=win.matchMedia?.('(max-width:699px)');
  if(!app||!mq)return ()=>{};
  const actions=[
    {id:'map-gesture-guide-open',label:'지도 도움말',symbol:'?'},
    {id:'map-compass',label:'북쪽 정렬',symbol:'N'},
    {id:'center-dongjak',label:'동작구 전체 보기',symbol:'⌂'},
    {id:'current-location',label:'현재 위치',symbol:'◎'}
  ];
  let rail=null;
  function mount(){
    if(rail||!mq.matches)return;
    rail=doc.createElement('nav');rail.id='dj-mobile-map-actions';rail.setAttribute('aria-label','지도 조작 도구');
    for(const action of actions){
      const button=doc.createElement('button');button.type='button';
      const original=doc.getElementById(action.id);
      // Clone the PC button's exact SVG/compass markup, never substitute text glyphs.
      if(original){button.innerHTML=original.innerHTML;button.classList.add('dj-mobile-pc-icon');}
      else button.textContent=action.symbol;
      button.setAttribute('aria-label',action.label);
      button.dataset.for=action.id;
      button.addEventListener('click',()=>doc.getElementById(action.id)?.click());
      rail.append(button);
    }
    app.append(rail);
  }
  function unmount(){rail?.remove();rail=null;}
  const sync=()=>mq.matches?mount():unmount();
  mq.addEventListener?.('change',sync);sync();
  return ()=>{mq.removeEventListener?.('change',sync);unmount();};
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
  const start=()=>installMobileMapActionRail();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}
