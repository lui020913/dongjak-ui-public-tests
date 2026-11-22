/** v8.7.7: reuse the actual underlying map/route controls and avoid a second map state. */
import './v877-mobile-settings.css';
import './v880-unified-sheet.css';
import './v889-mobile-visual-polish.css';
import {createMobileSheetCoordinator} from './v880-sheet-state.js';
const PHONE='(max-width:1079px)';
const PANELS=['route-panel','participation-panel','news-panel','mine-panel','transport-sheet'];
const isPhone=win=>win.matchMedia?.(PHONE)?.matches===true;
function el(doc,id){return doc.getElementById(id);}
function clickExisting(doc,selector){const node=doc.querySelector(selector);if(node){node.click();return true;}return false;}
export function installV877SettingsAndSheets(doc=document,win=window){
  const app=el(doc,'app');if(!app||app.dataset.dj877Ready==='1')return ()=>{};
  app.dataset.dj877Ready='1';const cleanup=[];
  const on=(node,type,fn,opts)=>{node?.addEventListener(type,fn,opts);cleanup.push(()=>node?.removeEventListener(type,fn,opts));};
  // The old menu is still mounted for legacy link targets but these entries now
  // belong to My Info. Do not delete them: onboarding and legacy event handlers
  // keep their original references.
  const relocateMore=()=>{
    const more=el(doc,'dj-mobile-utilities');if(!more)return;
    const button=more.querySelector('[data-dj860-open]');
    const actions=more.querySelector('.dj840-more-quick-actions');
    if(button&&actions?.contains(button))actions.insertAdjacentElement('afterend',button);
  };
  relocateMore();
  const moreObserver=new MutationObserver(relocateMore);
  if(app)moreObserver.observe(app,{childList:true});cleanup.push(()=>moreObserver.disconnect());
  // Concrete controls in the existing map preferences dialog.
  const preferences=el(doc,'dj-map-settings');const body=preferences?.querySelector('.dj-map-settings-content');
  if(body&&!body.querySelector('.dj877-preferences')){
    const container=doc.createElement('section');container.className='dj877-preferences';
    container.innerHTML=`
    <details class="dj877-pref-group"><summary>도보 설정 <span>음성 · 진행방향</span></summary>
      <div class="dj877-pref-row"><div><strong>음성 길안내</strong><small>실제 GPS 길안내에서 사용합니다.</small></div><button type="button" data-dj877-action="voice" role="switch" aria-checked="false">꺼짐</button></div>
      <div class="dj877-pref-row"><div><strong>진행방향 보기</strong><small>안내 중 지도 방향을 따라갑니다.</small></div><button type="button" data-dj877-action="orientation" role="switch" aria-checked="true">켜짐</button></div>
      <div class="dj877-pref-row"><label for="dj877-voice-choice"><strong>안내 목소리</strong><small>기기에서 제공되는 한국어 음성을 사용합니다.</small></label><select id="dj877-voice-choice"><option value="auto">기기 기본</option><option value="female">여성</option><option value="male">남성</option><option value="all">전체 한국어 음성</option></select></div>
      <p class="dj877-note">음성 지원 여부와 사용 가능한 목소리는 기기에 따라 다릅니다. 실제 경로 계산·안내는 길찾기에서 시작합니다.</p>
    </details>
`;
    body.prepend(container);
    const sync=()=>{
      for(const button of container.querySelectorAll('[data-dj877-layer]')){
        const source=doc.querySelector(`[data-base-layer="${button.dataset.dj877Layer}"]`);
        const enabled=source?.getAttribute('aria-pressed')==='true';
        button.setAttribute('aria-checked',String(enabled));button.textContent=enabled?'켜짐':'꺼짐';
      }
      for(const [kind,id] of [['voice','nav-voice'],['orientation','nav-orientation']]){
        const source=el(doc,id),button=container.querySelector(`[data-dj877-action="${kind}"]`);
        if(!button||!source)continue;
        const enabled=source.getAttribute('aria-pressed')==='true';
        button.setAttribute('aria-checked',String(enabled));button.textContent=enabled?'켜짐':'꺼짐';
      }
      const native=el(doc,'dj816-voice-mode'),choice=el(doc,'dj877-voice-choice');
      if(native&&choice)choice.value=native.value;
    };
    on(container,'click',event=>{
      const button=event.target.closest('button');if(!button)return;
      const layer=button.dataset.dj877Layer;
      if(layer){clickExisting(doc,`[data-base-layer="${layer}"]`);sync();return;}
      const action=button.dataset.dj877Action;
      if(action==='voice')clickExisting(doc,'#nav-voice');
      if(action==='orientation')clickExisting(doc,'#nav-orientation');
      if(action==='safety'){
        // Close preferences before entering the original safety tool.
        clickExisting(doc,'#dj-settings-close');
        doc.querySelector('#bottom-nav .nav-tab[data-tab="map"]')?.click();
        const native=el(doc,'map-safety-toggle');native?.click();
      }
      sync();
    });
    on(container.querySelector('#dj877-voice-choice'),'change',event=>{
      const native=el(doc,'dj816-voice-mode');if(!native)return;
      native.value=event.target.value;native.dispatchEvent(new Event('change',{bubbles:true}));
    });
    on(doc,'dongjak-base-layer-change',sync);
    on(preferences,'click',sync);
    on(preferences,'keydown',event=>{if(event.key==='Tab')sync();});
    sync();
    cleanup.push(()=>container.remove());
  }
  const panels=PANELS.map(id=>el(doc,id)).filter(Boolean);
  const nav=el(doc,'bottom-nav');
  const coordinator=createMobileSheetCoordinator({app,doc,win,panels,nav});
  // v885: the user has explicitly removed the fullscreen buttons.
  // Staged expansion via edge-grip remains available under the existing
  // mobile sheet gesture coordinator; no click target is inserted here.
  for(const panel of panels)panel.querySelector('.dj877-expand-button')?.remove();
  const observer=new MutationObserver(()=>coordinator.schedule());
  panels.forEach(panel=>observer.observe(panel,{attributes:true,attributeFilter:['class','hidden']}));
  cleanup.push(()=>observer.disconnect());
  on(win,'resize',coordinator.schedule,{passive:true});
  on(win,'orientationchange',coordinator.schedule,{passive:true});
  if(win.visualViewport)on(win.visualViewport,'resize',coordinator.schedule,{passive:true});
  on(doc,'visibilitychange',coordinator.schedule);
  on(win,'pageshow',coordinator.schedule);
  if(nav&&typeof ResizeObserver!=='undefined'){
    const resizeObserver=new ResizeObserver(coordinator.schedule);
    resizeObserver.observe(nav);cleanup.push(()=>resizeObserver.disconnect());
  }
  on(doc,'click',event=>{if(event.target.closest?.('#bottom-nav .nav-tab'))coordinator.schedule();},true);
  coordinator.sync();
  return ()=>{cleanup.forEach(f=>f());coordinator.dispose();delete app.dataset.dj877Ready;};
}
if(typeof document!=='undefined'){
  const boot=()=>installV877SettingsAndSheets(document,window);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
}
