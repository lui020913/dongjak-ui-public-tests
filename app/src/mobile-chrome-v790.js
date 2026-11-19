import {fadePanelIn,fadePanelOut} from './v852-panel-transition.js';
/** v7.9.1 mobile-only UI entry. No map/API imports. Desktop is left alone.
 * The original map/safety buttons stay in their original DOM locations and
 * retain their existing event listeners. Extra actions proxy existing buttons.
 */
export function installMobileChrome(doc = document, win = window) {
  const media = win.matchMedia('(max-width:1079px), (min-width:1080px) and (max-width:1366px) and (pointer:coarse)');
  const app = doc.getElementById('app');
  if (!app) return () => {};
  const originalPlaceholder = doc.getElementById('map-quick-search-query')?.getAttribute('placeholder') || '장소 검색';
  let more = null;
  let panel = null;
  let backplate = null;
  let observer = null;
  let handler = null;
  let onEsc = null;
  let onOutside = null;
  let row = null;
  let weatherTrigger = null;
  const movedNodes = [];
  let moreCloseTimer=0;
  let moreCloseToken=0;

  function hideMore({immediate=false}={}) {
    if (!more || !panel) return;
    const target=panel;
    if(!immediate&&moreCloseTimer&&target.classList.contains('dj870-more-leaving'))return;
    const token=++moreCloseToken;
    if(moreCloseTimer){win.clearTimeout(moreCloseTimer);moreCloseTimer=0;}
    more.setAttribute('aria-expanded','false');
    doc.getElementById('dj-v794-more')?.setAttribute('aria-expanded','false');
    app.classList.remove('dj-mobile-more-open');
    target.setAttribute('aria-hidden','true');
    target.classList.remove('dj-sheet-dragging','dj833-sheet-dismissing','dj870-more-entering');
    target.style.removeProperty('--dj-sheet-drag-y');
    target.style.removeProperty('--dj-sheet-drag-opacity');
    if(target.hidden)return;
    if(immediate||win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches){
      target.hidden=true;target.classList.remove('dj870-more-leaving','dj852-panel-fade-in','dj852-panel-fade-out');
      target.style.removeProperty('opacity');target.style.removeProperty('transition');return;
    }
    // Allow the original state to close exactly once; animate this panel only.
    target.classList.remove('dj852-panel-fade-in','dj852-panel-fade-out');
    target.classList.add('dj870-more-leaving');
    moreCloseTimer=win.setTimeout(()=>{
      if(token!==moreCloseToken||target!==panel)return;
      target.hidden=true;
      target.classList.remove('dj870-more-leaving');
      moreCloseTimer=0;
    },260);
  }
  function extractTemperature(text='') {
    const raw = String(text || '').replace(/\s+/g,' ').trim();
    const match = raw.match(/-?\d+(?:\.\d+)?\s*(?:°|℃|도|C)?/);
    if(!match) return '';
    const digits = match[0].match(/-?\d+(?:\.\d+)?/);
    return digits ? `${digits[0]}°` : '';
  }
  function renderInfo() {
    if (!panel) return;
    const weather = doc.getElementById('weather-label');
    const weatherTitle = doc.getElementById('weather-title');
    const info = panel.querySelector('#dj-mobile-weather-copy');
    const weatherCopy = [weatherTitle?.textContent, weather?.textContent].filter(Boolean).join(' · ') || '날씨 정보를 확인할 수 없습니다';
    if(info&&info.textContent!==weatherCopy) info.textContent = weatherCopy;
    if(weatherTrigger){
      const temp = extractTemperature(weather?.textContent);
      if(weatherTrigger.textContent!==(temp||'--°'))weatherTrigger.textContent = temp || '--°';
      weatherTrigger.dataset.hasTemp = temp ? 'true' : 'false';
      weatherTrigger.setAttribute('aria-label', weatherCopy);
      weatherTrigger.title = weatherCopy;
    }
  }
  function attach() {
    if (more || !media.matches) return;
    backplate = doc.createElement('div');
    backplate.id = 'dj-mobile-safe-top';
    backplate.setAttribute('aria-hidden','true');
    app.insertBefore(backplate,app.firstChild);

    more = doc.createElement('button');
    more.id = 'dj-mobile-more-trigger';
    more.type = 'button';
    more.textContent = '';
    more.setAttribute('aria-expanded','false');
    more.setAttribute('aria-controls','dj-mobile-utilities');
    more.setAttribute('aria-label','모바일 더보기 열기');
    weatherTrigger = doc.createElement('button');
    weatherTrigger.id = 'dj-mobile-weather-trigger';
    weatherTrigger.type = 'button';
    weatherTrigger.textContent = '날씨';
    weatherTrigger.dataset.hasTemp = 'false';
    weatherTrigger.setAttribute('aria-label','현재 날씨');
    panel = doc.createElement('section');
    panel.id = 'dj-mobile-utilities';
    panel.hidden = true;
    panel.setAttribute('aria-label','모바일 추가 도구');
    panel.innerHTML = `
      <header class="dj854-more-head">
        <span class="dj-sheet-chrome-grip" aria-hidden="true"></span>
        <span class="dj856-more-edge-drag" aria-hidden="true"></span>
        <div class="dj-sheet-chrome-title"><h2 class="dj-mobile-utility-heading">더보기</h2></div>
        <button type="button" id="dj-mobile-utilities-close" class="dj-sheet-chrome-close" aria-label="더보기 닫기">
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M5.5 5.5 18.5 18.5M18.5 5.5 5.5 18.5"/></svg>
        </button>
      </header>
      <div class="dj-mobile-utilities-body" aria-label="추가 지도 기능">
        <div class="dj840-more-quick-actions">
          <button type="button" id="dj-mobile-history">전체 업데이트 내역</button>
          <button type="button" id="dj-mobile-settings">지도 설정</button>
        </div>
      </div>`;
    row = doc.createElement('div');
    row.id = 'dj-mobile-tool-row';
    row.setAttribute('aria-label','모바일 지도 도구');
    const managed = [
      doc.getElementById('map-tools-toggle'),
      doc.getElementById('map-safety-toggle'),
      doc.getElementById('night-visibility-quick-off')
    ].filter(Boolean);
    for(const node of managed){
      movedNodes.push({node,parent:node.parentNode,nextSibling:node.nextSibling});
      row.appendChild(node);
    }
    row.append(weatherTrigger,more);
    app.append(row,panel);
    const query = doc.getElementById('map-quick-search-query');
    if(query){
      query.placeholder = '역·정류장·장소 검색';
      query.setAttribute('enterkeyhint','search');
      query.setAttribute('autocapitalize','off');
      query.setAttribute('spellcheck','false');
    }

    more.addEventListener('click',()=>{
      const opening=panel.hidden||panel.classList.contains('dj852-panel-fade-out')||panel.classList.contains('dj870-more-leaving');
      if(opening){
        ++moreCloseToken;
        if(moreCloseTimer){win.clearTimeout(moreCloseTimer);moreCloseTimer=0;}
        panel.classList.remove('dj870-more-leaving','dj852-panel-fade-out');
        panel.removeAttribute('aria-hidden');
        app.classList.add('dj-mobile-more-open');
        if(app.dataset.dj806Motion==='on'&&media.matches){panel.classList.remove('dj852-panel-fade-in','dj852-panel-fade-out');panel.hidden=false;}
        else fadePanelIn(panel,win);
      }else hideMore();
      more.setAttribute('aria-expanded',String(opening));
      doc.getElementById('dj-v794-more')?.setAttribute('aria-expanded',String(opening));
      if(opening)renderInfo();
    });
    panel.querySelector('#dj-mobile-utilities-close')?.addEventListener('click',event=>{
      event.preventDefault();event.stopPropagation();hideMore();
    });
    panel.addEventListener('dongjak:close-more',event=>hideMore({immediate:event.detail?.immediate===true}));
    panel.querySelector('#dj-mobile-history')?.addEventListener('click',event=>{
      event.preventDefault();event.stopPropagation();
      hideMore({immediate:true});
      win.requestAnimationFrame?.(()=>doc.getElementById('version-history-trigger')?.click());
    });
    panel.querySelector('#dj-mobile-settings')?.addEventListener('click',event=>{
      event.preventDefault();event.stopPropagation();
      hideMore({immediate:true});
      win.requestAnimationFrame?.(()=>doc.dispatchEvent(new CustomEvent('dj:open-map-settings')));
    });
    weatherTrigger.addEventListener('click',()=>{
      doc.getElementById('weather-label')?.click();
      renderInfo();
    });
    onEsc=(e)=>{if(e.key==='Escape')hideMore();};
    onOutside=(e)=>{
      if(panel && !panel.hidden && !panel.contains(e.target) && !more.contains(e.target) && !doc.getElementById('dj-v794-more')?.contains?.(e.target) && !weatherTrigger?.contains?.(e.target))hideMore();
    };
    doc.addEventListener('keydown',onEsc);
    doc.addEventListener('pointerdown',onOutside,true);
    handler=()=>hideMore();
    doc.getElementById('map-tools-toggle')?.addEventListener('click',handler);
    doc.getElementById('map-safety-toggle')?.addEventListener('click',handler);
    doc.getElementById('map-quick-search-query')?.addEventListener('focus',handler);
    app.querySelectorAll('#bottom-nav .nav-tab').forEach(el=>el.addEventListener('click',handler));
    observer=new MutationObserver(renderInfo);
    const watch=[app,doc.getElementById('weather-label'),doc.getElementById('weather-title'),doc.getElementById('night-visibility-toggle')];
    watch.filter(Boolean).forEach(el=>observer.observe(el,el===app?{attributes:true,attributeFilter:['data-sangdo-night','data-tab']}:{attributes:true,childList:true,characterData:true,subtree:true}));
    renderInfo();
  }
  function detach() {
    observer?.disconnect();observer=null;
    ++moreCloseToken;if(moreCloseTimer){win.clearTimeout(moreCloseTimer);moreCloseTimer=0;}
    if(onEsc)doc.removeEventListener('keydown',onEsc);
    if(onOutside)doc.removeEventListener('pointerdown',onOutside,true);
    if(handler){
      doc.getElementById('map-tools-toggle')?.removeEventListener('click',handler);
      doc.getElementById('map-safety-toggle')?.removeEventListener('click',handler);
      doc.getElementById('map-quick-search-query')?.removeEventListener('focus',handler);
      app.querySelectorAll('#bottom-nav .nav-tab').forEach(el=>el.removeEventListener('click',handler));
    }
    doc.getElementById('map-quick-search-query')?.setAttribute('placeholder',originalPlaceholder);
    for(const {node,parent,nextSibling} of movedNodes.splice(0)){
      if(!node || !parent) continue;
      if(nextSibling && nextSibling.parentNode===parent) parent.insertBefore(node,nextSibling);
      else parent.appendChild(node);
    }
    app.classList.remove('dj-mobile-more-open');
    row?.remove();weatherTrigger?.remove();more?.remove();panel?.remove();backplate?.remove();
    more=null;panel=null;backplate=null;row=null;weatherTrigger=null;handler=null;onEsc=null;onOutside=null;
  }
  function sync(){if(media.matches)attach();else detach();}
  if(media.addEventListener)media.addEventListener('change',sync);
  else media.addListener(sync);
  sync();
  return ()=>{if(media.removeEventListener)media.removeEventListener('change',sync);else media.removeListener(sync);detach();};
}
if(typeof document !== 'undefined' && typeof window !== 'undefined'){
  if(document.readyState === 'loading')document.addEventListener('DOMContentLoaded',()=>installMobileChrome(document,window),{once:true});
  else installMobileChrome(document,window);
}
