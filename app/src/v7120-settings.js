import {PUBLIC_APP_VERSION} from './public-release-display.js';
/** v7.12.0 – shared UI preferences and independent mobile app emblem.
 * Only presentation preferences are persisted: no map source or transport changes.
 */
const KEY='dongjak_map_preferences_v7120';
export function installMapPreferences(doc=document,win=window){
  const app=doc.getElementById('app');
  const header=doc.querySelector('#app .topbar');
  const form=header?.querySelector('#map-quick-search .map-quick-search-form');
  if(!app||!form)return ()=>{};
  const root=doc.documentElement;
  const defaults={text:'normal',motion:'full',weather:true,tools:true};
  let prefs={...defaults};
  try{prefs={...prefs,...JSON.parse(win.localStorage.getItem(KEY)||'{}')};}catch{}
  const safeSave=()=>{try{win.localStorage.setItem(KEY,JSON.stringify(prefs));}catch{}};
  const isDark=()=>app.dataset.theme==='dark';
  const mobile=doc.createElement('button');
  mobile.type='button';mobile.id='dj-settings-mobile';mobile.className='dj-settings-entry';
  mobile.setAttribute('aria-haspopup','dialog');mobile.setAttribute('aria-controls','dj-app-about');
  mobile.setAttribute('aria-label','동작하는 안전지도 앱 정보와 버전');
  mobile.innerHTML='<img alt="" src="/icons/dongjak-light-192.png" aria-hidden="true">';
  header.insertBefore(mobile,header.querySelector('#map-quick-search'));
  const pc=doc.createElement('button');
  pc.type='button';pc.id='dj-settings-pc';pc.className='dj-settings-entry';
  pc.setAttribute('aria-haspopup','dialog');pc.setAttribute('aria-controls','dj-map-settings');
  pc.textContent='설정';
  header.querySelector('.header-tools')?.append(pc);
  // Both platforms use the same app emblem outside the search form.
  const pcLogo=doc.createElement('button');
  pcLogo.type='button';pcLogo.id='dj-about-pc';pcLogo.className='dj-about-entry';
  pcLogo.setAttribute('aria-label','동작하는 안전지도 앱 정보와 버전');
  pcLogo.setAttribute('aria-haspopup','dialog');pcLogo.setAttribute('aria-controls','dj-app-about');
  pcLogo.innerHTML='<img src="/icons/dongjak-light-192.png" alt="" aria-hidden="true">';
  header.insertBefore(pcLogo,header.querySelector('#map-quick-search'));
  const about=doc.createElement('div');about.id='dj-app-about';about.hidden=true;
  about.innerHTML=`<section class="dj-about-card" data-dj-dialog-fade="true" role="dialog" aria-modal="true" aria-labelledby="dj-about-title">
    <button type="button" class="dj-about-close" aria-label="앱 정보 닫기">×</button>
    <img class="dj-about-icon" src="/icons/dongjak-light-192.png" alt="동작하는 안전지도 앱 아이콘">
    <span class="dj-about-kicker">DONGJAK WALK SAFETY</span>
    <h2 id="dj-about-title">동작하는 안전지도</h2>
    <p class="dj-about-description">동작구의 보행 환경과 교통정보를 한눈에 확인하세요.</p>
    <div class="dj-about-version"><span>현재 앱 버전</span><strong id="dj-about-version-number">1.0</strong></div>
    <p class="dj803-about-credit">동작구 아이디어 리그 안전팀 시범 운영 프로그램</p>
    <button type="button" class="dj-about-done">닫기</button>
  </section>`;
  app.append(about);
  let aboutFocus=null;
  const closeAbout=()=>{if(about.hidden)return;const finish=()=>{about.hidden=true;aboutFocus?.focus?.();};if(document.defaultView?.DongjakWindowMotion)document.defaultView.DongjakWindowMotion.close(about.querySelector('.dj-about-card'),finish);else finish();};
  const openAbout=(event)=>{
    event?.preventDefault?.();
    if(!overlay.hidden)close();
    aboutFocus=doc.activeElement;
    const dark=isDark();
    about.querySelector('.dj-about-icon').src=dark?'/icons/dongjak-dark-192.png':'/icons/dongjak-light-192.png';
    about.querySelector('#dj-about-version-number').textContent=PUBLIC_APP_VERSION;
    about.hidden=false;about.querySelector('.dj-about-close')?.focus();
  };
  about.querySelector('.dj-about-close').addEventListener('click',closeAbout);
  about.querySelector('.dj-about-done').addEventListener('click',closeAbout);
  about.addEventListener('click',event=>{if(event.target===about)closeAbout();});
  mobile.addEventListener('click',openAbout);
  pcLogo.addEventListener('click',openAbout);
  const overlay=doc.createElement('div');overlay.id='dj-map-settings';overlay.className='dj-map-settings';
  overlay.hidden=true;
  overlay.innerHTML=`
    <section class="dj-map-settings-card" role="dialog" aria-modal="true" aria-labelledby="dj-map-settings-title">
      <header class="dj-map-settings-head"><div><span class="dj-map-settings-kicker">MAP PREFERENCES</span><h2 id="dj-map-settings-title">지도 설정</h2><p>이 기기에만 저장되는 화면 설정입니다.</p></div><button type="button" id="dj-settings-close" aria-label="설정 닫기">×</button></header>
      <div class="dj-map-settings-content">
        <section class="dj-map-settings-group"><h3>화면 모드</h3><p>라이트·다크 테마를 변경합니다.</p><button type="button" id="dj-settings-theme" class="dj-settings-primary">테마 변경</button></section>
        <section class="dj-map-settings-group"><h3>글자 가독성</h3><p>지도 메뉴와 안내 글씨 크기를 변경합니다.</p><div id="dj-settings-text" class="dj-settings-segment" role="group" aria-label="글자 크기"><button type="button" data-size="small">작게</button><button type="button" data-size="normal">기본</button><button type="button" data-size="large">크게</button></div></section>
        <section class="dj-map-settings-group dj-settings-switch-group"><div><h3>움직임 줄이기</h3><p>플로팅 창 등의 전환 애니메이션을 줄입니다.</p></div><label class="dj-settings-switch"><input type="checkbox" id="dj-settings-motion"><span aria-hidden="true"></span></label></section>
        <section class="dj-map-settings-group dj-settings-switch-group"><div><h3>날씨 표시</h3><p>지도 위 온도 버튼을 표시합니다.</p></div><label class="dj-settings-switch"><input type="checkbox" id="dj-settings-weather"><span aria-hidden="true"></span></label></section>
        <section class="dj-map-settings-group dj-settings-switch-group"><div><h3>지도 조작 버튼</h3><p>도움말·나침반·홈·내 위치 버튼을 표시합니다.</p></div><label class="dj-settings-switch"><input type="checkbox" id="dj-settings-tools"><span aria-hidden="true"></span></label></section>
      </div>
      <footer class="dj-map-settings-footer"><button type="button" id="dj-settings-reset">기본값 복원</button><button type="button" id="dj-settings-done" class="dj-settings-primary">완료</button></footer>
    </section>`;
  app.append(overlay);
  const q=sel=>overlay.querySelector(sel);
  let previousFocus=null;
  const syncTheme=()=>{const dark=isDark();const icon=dark?'/icons/dongjak-dark-192.png':'/icons/dongjak-light-192.png';mobile.querySelector('img').src=icon;pcLogo.querySelector('img').src=icon;q('#dj-settings-theme').textContent=dark?'라이트 모드로 변경':'다크 모드로 변경';};
  // Weather nodes belong to different responsive breakpoints.  A display:none
  // rule cannot itself fade, so wait for the opacity animation to finish before
  // applying the stored hidden state.  Rapid toggles cancel stale completions.
  let weatherState=null,weatherVersion=0,weatherAnimations=[];
  const weatherNodes=()=>['weather-widget','dj-mobile-weather-trigger','dj-v794-weather']
    .map(id=>doc.getElementById(id)).filter(Boolean);
  const commitWeather=show=>{
    app.classList.toggle('dj-hide-weather',!show);
    for(const node of weatherNodes()){
      if(!show)node.style.setProperty('display','none','important');
      else node.style.removeProperty('display');
      node.setAttribute('aria-hidden',String(!show));
    }
  };
  const setWeather=({show,animated=false}={})=>{
    if(weatherState===show)return;
    const token=++weatherVersion;
    weatherState=show;
    for(const animation of weatherAnimations)animation.cancel?.();
    weatherAnimations=[];
    const mediaReduced=win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if(!animated || prefs.motion==='reduced' || mediaReduced){commitWeather(show);return;}
    // Keep elements rendered until fade-out completes; reveal before fade-in.
    app.classList.remove('dj-hide-weather');
    for(const node of weatherNodes())node.style.removeProperty('display');
    const visibleNodes=weatherNodes().filter(node=>
      win.getComputedStyle?.(node)?.display!=='none');
    const running=visibleNodes.map(node=>{
      if(typeof node.animate!=='function')return null;
      const animation=node.animate(show
        ?[{opacity:0},{opacity:1}]:[{opacity:1},{opacity:0}],
        {duration:240,easing:'ease-in-out',fill:'both'});
      weatherAnimations.push(animation);
      return animation.finished?.catch(()=>{});
    }).filter(Boolean);
    if(!running.length){commitWeather(show);return;}
    Promise.all(running).then(()=>{
      if(token!==weatherVersion)return;
      commitWeather(show);
      for(const animation of weatherAnimations)animation.cancel?.();
      weatherAnimations=[];
    });
  };
  const apply=({animateWeather=false}={})=>{
    if(!['small','normal','large'].includes(prefs.text))prefs.text='normal';
    app.dataset.djSettingsText=prefs.text;
    // Migration: ignore any old rise/none preference; fade is now the only style.
    delete prefs.motionStyle;
    app.dataset.djMotionStyle='soft';
    const scaleSelect=doc.getElementById('dj-type-scale');
    if(scaleSelect){const wanted=prefs.text==='large'?'large':prefs.text==='small'?'small':'normal';if(scaleSelect.value!==wanted){scaleSelect.value=wanted;scaleSelect.dispatchEvent(new Event('change',{bubbles:true}));}}
    app.classList.toggle('dj-reduced-animation',prefs.motion==='reduced');
    // v816 compatibility: direct display hiding still happens in commitWeather;
    // it is deferred only for a user-initiated fade-out.
    setWeather({show:prefs.weather!==false,animated:animateWeather});
    app.classList.toggle('dj-hide-map-tools',prefs.tools===false);
    q('#dj-settings-motion').checked=prefs.motion==='reduced';
    q('#dj-settings-weather').checked=prefs.weather!==false;
    q('#dj-settings-tools').checked=prefs.tools!==false;
    q('#dj-settings-text').querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.size===prefs.text)));
    syncTheme();safeSave();
  };
  const close=()=>{if(overlay.hidden)return;const finish=()=>{overlay.hidden=true;app.classList.remove('dj-settings-open');previousFocus?.focus?.();};if(document.defaultView?.DongjakWindowMotion)document.defaultView.DongjakWindowMotion.close(overlay.querySelector('.dj-map-settings-card'),finish);else finish();};
  const open=(event)=>{
    if(event)event.preventDefault();
    previousFocus=doc.activeElement;
    overlay.hidden=false;app.classList.add('dj-settings-open');syncTheme();q('#dj-settings-close').focus();
  };
  const openHandler=event=>open(event);
  pc.addEventListener('click',openHandler);
  const externalOpen=event=>open(event);
  doc.addEventListener('dj:open-map-settings',externalOpen);
  q('#dj-settings-close').addEventListener('click',close);
  q('#dj-settings-done').addEventListener('click',close);
  overlay.addEventListener('click',event=>{if(event.target===overlay)close();});
  const esc=event=>{if(event.key==='Escape'&&!about.hidden){event.preventDefault();closeAbout();return;}if(overlay.hidden)return;if(event.key==='Escape'){event.stopPropagation();close();}if(event.key==='Tab'){
    const interactive=[...overlay.querySelectorAll('button:not([disabled]),input:not([disabled])')];
    const first=interactive[0],last=interactive.at(-1);
    if(event.shiftKey&&doc.activeElement===first){event.preventDefault();last?.focus();}
    if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first?.focus();}
  }};
  doc.addEventListener('keydown',esc,true);
  q('#dj-settings-theme').addEventListener('click',()=>{close();doc.getElementById('theme-toggle')?.click();});
  q('#dj-settings-text').addEventListener('click',event=>{const b=event.target.closest('button[data-size]');if(!b)return;prefs.text=b.dataset.size;apply();});
  q('#dj-settings-motion').addEventListener('change',event=>{prefs.motion=event.target.checked?'reduced':'full';apply();});
  q('#dj-settings-weather').addEventListener('change',event=>{prefs.weather=event.target.checked;apply({animateWeather:true});});
  q('#dj-settings-tools').addEventListener('change',event=>{prefs.tools=event.target.checked;apply();});
  q('#dj-settings-reset').addEventListener('click',()=>{prefs={...defaults};apply();});
  const observer=new MutationObserver(syncTheme);
  observer.observe(app,{attributes:true,attributeFilter:['data-theme']});
  apply();
  return ()=>{doc.removeEventListener('keydown',esc,true);doc.removeEventListener('dj:open-map-settings',externalOpen);mobile.remove();pc.remove();pcLogo.remove();overlay.remove();about.remove();observer.disconnect();};
}
if(typeof document!=='undefined'){
  const boot=()=>installMapPreferences();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
}
