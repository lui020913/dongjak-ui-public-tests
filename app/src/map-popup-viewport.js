/**
 * Keep every MapLibre popup inside the visible map viewport.
 * Long popup content scrolls internally; edge popups are shifted inward.
 */
export function popupViewportOffset(popupRect,viewportRect,margin=12){
  let x=0,y=0;
  const width=popupRect.right-popupRect.left;
  const height=popupRect.bottom-popupRect.top;
  const availableWidth=viewportRect.right-viewportRect.left-2*margin;
  const availableHeight=viewportRect.bottom-viewportRect.top-2*margin;
  if(width<=availableWidth){
    if(popupRect.left<viewportRect.left+margin)x=viewportRect.left+margin-popupRect.left;
    else if(popupRect.right>viewportRect.right-margin)x=viewportRect.right-margin-popupRect.right;
  }else x=viewportRect.left+margin-popupRect.left;
  if(height<=availableHeight){
    if(popupRect.top<viewportRect.top+margin)y=viewportRect.top+margin-popupRect.top;
    else if(popupRect.bottom>viewportRect.bottom-margin)y=viewportRect.bottom-margin-popupRect.bottom;
  }else y=viewportRect.top+margin-popupRect.top;
  return {x:Math.round(x),y:Math.round(y)};
}

export function installViewportSafeMapPopups({map,margin=12}={}){
  const container=map?.getContainer?.();
  if(!container||typeof MutationObserver==='undefined')return ()=>{};
  let framePending=false,disposed=false;
  const schedule=()=>{
    if(framePending||disposed)return;
    framePending=true;
    const raf=globalThis.requestAnimationFrame||((callback)=>setTimeout(callback,16));
    raf(()=>{
      framePending=false;
      if(disposed)return;
      const viewport=container.getBoundingClientRect?.();
      if(!viewport||viewport.width<=0||viewport.height<=0)return;
      for(const popup of container.querySelectorAll?.('.maplibregl-popup')||[]){
        const content=popup.querySelector?.('.maplibregl-popup-content');
        // A facility card on a phone must leave the right-side map buttons
        // and bottom navigation visible. Other popups retain their bounds.
        const placePopup=popup.classList?.contains('dj-place-detail-popup');
        const onPhone=globalThis.matchMedia?.('(max-width:699px)')?.matches;
        const onDesktop=globalThis.matchMedia?.('(min-width:1080px)')?.matches;
        // On phones the chosen facility is a bottom sheet, NOT a geo-anchored
        // popup. Its independent real-location pin remains on the map.
        if(placePopup&&onPhone){
          for(const key of ['width','max-width','translate'])popup.style.removeProperty(key);
          content?.style.removeProperty('max-height');
          continue;
        }
        let viewportForPopup=viewport;
        const liveTrainPopup=onPhone&&popup.classList?.contains('dj-live-vehicle-popup');
        if(liveTrainPopup){
          const shown=node=>node&&getComputedStyle(node).display!=='none'&&getComputedStyle(node).visibility!=='hidden'&&node.getBoundingClientRect().width>0;
          const rail=[...document.querySelectorAll('#dj-mobile-map-actions,.map-actions')].find(shown);
          const nav=document.getElementById('bottom-nav');
          const topbar=document.querySelector('.topbar'),tools=document.getElementById('djNext-rail');
          const right=shown(rail)?Math.min(viewport.right,rail.getBoundingClientRect().left-4):viewport.right;
          const bottom=shown(nav)?Math.min(viewport.bottom,nav.getBoundingClientRect().top-5):viewport.bottom;
          const top=Math.max(viewport.top,...[topbar,tools].filter(shown).map(n=>n.getBoundingClientRect().bottom+5));
          if(right-viewport.left>=220&&bottom-top>=210)viewportForPopup={left:viewport.left,right,top,bottom};
        }
        if(placePopup){
          const controls=[...document.querySelectorAll('#dj-mobile-map-actions, .map-actions')]
            .find(node=>getComputedStyle(node).display!=='none');
          const railLeft=controls?controls.getBoundingClientRect().left:viewport.right-66;
          const nav=document.getElementById('bottom-nav');
          const navTop=onPhone&&nav&&getComputedStyle(nav).display!=='none'
            ?nav.getBoundingClientRect().top:viewport.bottom;
          const leftReserve=onPhone?0:Math.min(190,Math.max(0,viewport.width*.13));
          viewportForPopup={left:viewport.left+leftReserve,top:viewport.top+16,
            right:Math.max(viewport.left+leftReserve+165,Math.min(viewport.right,railLeft-10)),
            bottom:Math.max(viewport.top+240,Math.min(viewport.bottom-12,navTop-10))};
        }
        if(content){
          if(liveTrainPopup){
            const width=Math.max(150,Math.floor(viewportForPopup.right-viewportForPopup.left-2*margin));
            popup.style.setProperty('max-width',width+'px','important');
            popup.style.setProperty('width',Math.min(266,width)+'px','important');
          }
          if(placePopup){
            const safeWidth=Math.max(175,Math.floor(viewportForPopup.right-viewportForPopup.left-2*margin));
            popup.style.setProperty('max-width',safeWidth+'px','important');
            popup.style.setProperty('width',Math.min(onPhone?340:(onDesktop?620:485),safeWidth)+'px','important');
          }
          content.style.maxHeight=placePopup
            ?`${Math.max(190,Math.floor(viewportForPopup.bottom-viewportForPopup.top-2*margin-30))}px`
            :liveTrainPopup?`${Math.max(150,Math.floor(viewportForPopup.bottom-viewportForPopup.top-2*margin-16))}px`:'min(72dvh,calc(100dvh - 52px))';
          content.style.overflowY='auto';
          content.style.overscrollBehavior='contain';
        }
        popup.style.translate='0px 0px';
        const rect=popup.getBoundingClientRect?.();
        if(!rect)continue;
        // Reuse the existing tested offset function with the reserved
        // action/nav viewport, not with the covered whole-map rectangle.
        const viewport=viewportForPopup;
        const offset=popupViewportOffset(rect,viewport,margin);
        popup.style.translate=`${offset.x}px ${offset.y}px`;
      }
    });
  };
  const observer=new MutationObserver(schedule);
  observer.observe(container,{childList:true,subtree:true});
  map.on?.('move',schedule);
  map.on?.('resize',schedule);
  map.on?.('moveend',schedule);
  map.on?.('dongjak:live-vehicle-popup-move',schedule);
  globalThis.addEventListener?.('resize',schedule,{passive:true});
  globalThis.addEventListener?.('orientationchange',schedule,{passive:true});
  schedule();
  return ()=>{
    disposed=true;
    observer.disconnect();
    map.off?.('move',schedule);
    map.off?.('resize',schedule);
    map.off?.('moveend',schedule);
    map.off?.('dongjak:live-vehicle-popup-move',schedule);
    globalThis.removeEventListener?.('resize',schedule);
    globalThis.removeEventListener?.('orientationchange',schedule);
  };
}
