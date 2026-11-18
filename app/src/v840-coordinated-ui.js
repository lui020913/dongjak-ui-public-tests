/** v8.4.0 - one coherent mobile shell state: home, panels, search, hints and theme consent. */
import './v840-coordinated-ui.css';
import {MAP_TIP_MESSAGES,PRIMARY_PANELS,TRANSIENT_PANELS,hasOpenMapWindow,normalizeBottomTabs} from './v840-ui-core.js';
export {MAP_TIP_MESSAGES,hasOpenMapWindow,normalizeBottomTabs} from './v840-ui-core.js';
export function installCoordinatedShell(doc=document,win=window){
 const app=doc.getElementById('app'),nav=doc.getElementById('bottom-nav');
 if(!app||!nav||app.dataset.dj840Installed)return ()=>{};
 app.dataset.dj840Installed='1';
 const label=doc.createElement('button');label.type='button';label.id='dj840-map-tip';
 label.setAttribute('role','button');label.setAttribute('aria-label','지도 이용 TIP 열기 · 눌러서 지도 조작 안내 보기');
 label.setAttribute('aria-live','off');label.tabIndex=0;
 const tipMark=doc.createElement('strong');tipMark.textContent='TIP';
 const tipViewport=doc.createElement('span');tipViewport.className='dj840-tip-copy-viewport';
 const tipText=doc.createElement('span');tipText.className='dj840-tip-copy';tipText.textContent=MAP_TIP_MESSAGES[0];
 tipViewport.append(tipText);label.append(tipMark,tipViewport);app.append(label);
 const openGuideFromTip=()=>doc.getElementById('map-gesture-guide-open')?.click();
 label.addEventListener('click',openGuideFromTip);
 label.addEventListener('keydown',event=>{
   if(event.key==='Enter'||event.key===' '){event.preventDefault();openGuideFromTip();}
 });
 // Show the same hints in the ? panel. The list can be collapsed to save space.
 const guide=doc.getElementById('map-gesture-guide');
 const tipGuide=doc.createElement('section');tipGuide.id='dj841-guide-tips';
 const guideToggle=doc.createElement('button');guideToggle.type='button';guideToggle.className='dj852-tip-toggle';
 guideToggle.setAttribute('aria-expanded','false');guideToggle.setAttribute('aria-controls','dj841-guide-tip-list');
 guideToggle.innerHTML='<span>지도 이용 TIP</span><span class="dj852-tip-chevron" aria-hidden="true">⌄</span>';
 const guideList=doc.createElement('ul');guideList.id='dj841-guide-tip-list';guideList.hidden=true;tipGuide.classList.add('is-collapsed');
 for(const item of MAP_TIP_MESSAGES){const li=doc.createElement('li');li.textContent=item;guideList.append(li);}
 guideToggle.addEventListener('click',()=>{
   const expanded=guideToggle.getAttribute('aria-expanded')!=='true';
   guideToggle.setAttribute('aria-expanded',String(expanded));
   guideList.hidden=!expanded;tipGuide.classList.toggle('is-collapsed',!expanded);
 });
 tipGuide.append(guideToggle,guideList);
 if(guide){const anchor=guide.querySelector('.dj-guide-release');if(anchor)anchor.before(tipGuide);else guide.append(tipGuide);}
 let tip=0,queued=false,tipTransitionToken=0,hideTimer=0,disposed=false;
 label.hidden=true;
 const isIdleMap=()=>app.dataset.tab==='map'&&!hasOpenMapWindow(doc,app)
   &&!doc.querySelector('#map-startup-overlay:not([hidden])');
 const showTip=()=>{
   if(hideTimer){win.clearTimeout(hideTimer);hideTimer=0;}
   if(app.dataset.djUserTipDismissed==='true')return;
   if(label.hidden){
     label.hidden=false;label.classList.remove('is-visible');
     (win.requestAnimationFrame||((fn)=>win.setTimeout(fn,0)))(()=>{if(isIdleMap())label.classList.add('is-visible');});
   }else label.classList.add('is-visible');
 };
 const hideTip=()=>{
   if(label.hidden||hideTimer)return;
   label.classList.remove('is-visible');
   hideTimer=win.setTimeout(()=>{hideTimer=0;if(!label.classList.contains('is-visible'))label.hidden=true;},240);
 };
 const advanceTip=()=>{
   const next=(tip+1)%MAP_TIP_MESSAGES.length;
   const visible=!label.hidden&&label.classList.contains('is-visible')&&isIdleMap();
   const token=++tipTransitionToken;
   const updateText=()=>{
     if(token!==tipTransitionToken)return;
     tip=next;tipText.textContent=MAP_TIP_MESSAGES[tip];
     tipText.classList.remove('dj852-tip-copy-fade');
   };
   if(!visible){updateText();return;}
   // Keep the TIP pill itself visible; fade only its changing sentence.
   tipText.classList.add('dj852-tip-copy-fade');
   win.setTimeout(updateText,170);
 };
 const sync=()=>{
   if(disposed||queued)return;queued=true;
   (win.requestAnimationFrame||((fn)=>win.setTimeout(fn,0)))(()=>{
     queued=false;if(disposed)return;
     normalizeBottomTabs(doc,app);
     if(isIdleMap()&&app.dataset.djUserTipDismissed!=='true')showTip();
     else hideTip();
   });
 };
 const observers=[];
 const observe=(node,opts)=>{if(!node)return;const o=new MutationObserver(sync);o.observe(node,opts);observers.push(o);};
 observe(app,{attributes:true,attributeFilter:['data-tab','data-search-open','data-dj910-sheet-open','data-dj-user-tip-dismissed','class']});
 const surfaceIds=new Set([...PRIMARY_PANELS,...TRANSIENT_PANELS,'map-startup-overlay']);
 const panelObserver=new MutationObserver(records=>{
   if(records.some(r=>r.type==='attributes'?surfaceIds.has(r.target.id):[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&(surfaceIds.has(n.id)||n.matches?.('.dj-place-detail-popup')||[...surfaceIds].some(id=>n.querySelector?.('#'+id))))))sync();
 });
 panelObserver.observe(app,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','aria-hidden','class']});
 observers.push(panelObserver);
 app.addEventListener('transitionend',sync,true);
 app.addEventListener('animationend',sync,true);
 const interval=win.setInterval(()=>{
   // Keep the hint continuously available on an unobstructed map. Only its
   // text cross-fades every ten seconds; it never disappears between cycles.
   advanceTip();
   sync();
 },10000);
 const selectedMap=()=>{
   const picker=doc.getElementById('admin-dong-picker');if(picker)picker.hidden=true;
   const overview=doc.getElementById('overview-sheet');if(overview)overview.hidden=true;
   sync();
 };
 nav.querySelector('[data-tab="map"]')?.addEventListener('click',selectedMap);
 const afterClose=(event)=>{
   // Keep original controller as the sole owner of the layer state; collapse visual expansion only.
   const target=event.target.closest?.('#map-safety-close,#map-options-mobile-close,#map-options-desktop-close,#map-safety-backdrop,[data-close-page],#news-close-to-map,#admin-dong-close,.dj-sheet-chrome-close,#dj832-data-sheet .dj832-sheet-close');
   if(!target)return;
   win.queueMicrotask?.(()=>{
     for(const b of doc.querySelectorAll('#dj-v794-toolbar .dj832-expanded')){
       b.classList.remove('dj832-expanded');b.setAttribute('aria-expanded','false');
     }
     doc.dispatchEvent(new CustomEvent('dj836:close-overlay-tools'));
     sync();
   });
 };
 doc.addEventListener('click',afterClose);
 const search=doc.getElementById('map-quick-search');
 search?.addEventListener('focusin',sync);search?.addEventListener('focusout',()=>win.setTimeout(sync,0));
 // Confirm before triggering the actual theme button; no premature loading overlay.
 const dialog=doc.createElement('section');dialog.id='dj840-theme-confirm';dialog.hidden=true;
 dialog.innerHTML='<div class="dj840-theme-card" role="dialog" aria-modal="true" aria-labelledby="dj840-theme-title"><h2 id="dj840-theme-title">화면 테마를 전환할까요?</h2><p>지도와 화면의 밝기를 변경합니다.</p><div><button type="button" data-decision="cancel">취소</button><button type="button" data-decision="confirm">전환</button></div></div>';
 app.append(dialog);
 const theme=doc.getElementById('theme-toggle');
 const onTheme=(event)=>{
   if(!event.target.closest?.('#theme-toggle')||!theme)return;
   if(theme.dataset.dj840ThemeConfirmed==='1')return;
   event.preventDefault();event.stopImmediatePropagation();
   dialog.hidden=false;
 };
 doc.addEventListener('click',onTheme,true);
 const decide=(event)=>{
   const choice=event.target.closest?.('[data-decision]')?.dataset.decision;
   if(!choice)return;
   dialog.hidden=true;
   if(choice==='confirm'&&theme){
     theme.dataset.dj840ThemeConfirmed='1';
     try{theme.click();}finally{delete theme.dataset.dj840ThemeConfirmed;}
   }
 };
 dialog.addEventListener('click',decide);
 const escape=(event)=>{if(event.key==='Escape')dialog.hidden=true;};
 doc.addEventListener('keydown',escape);
 sync();
 return ()=>{disposed=true;if(hideTimer)win.clearTimeout(hideTimer);app.removeEventListener('transitionend',sync,true);app.removeEventListener('animationend',sync,true);observers.forEach(o=>o.disconnect());win.clearInterval(interval);doc.removeEventListener('click',afterClose);doc.removeEventListener('click',onTheme,true);doc.removeEventListener('keydown',escape);label.removeEventListener('click',openGuideFromTip);dialog.remove();label.remove();tipGuide.remove();delete app.dataset.dj840Installed;};
}
if(typeof document!=='undefined'){
 const boot=()=>installCoordinatedShell();
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
}
