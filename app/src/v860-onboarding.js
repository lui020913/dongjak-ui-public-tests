/** v8.6.0 — first-run product tour. This is a presentation-only layer:
 * existing map, safety, route, transit and account controllers remain owners
 * of their functionality. Artwork slots are deliberately photo-free and can
 * be replaced later without changing the navigation or persistence logic.
 */
import './v860-onboarding.css';

export const ONBOARDING_STORAGE_KEY='dongjak_onboarding_seen_v860';
/** Approved 2:1 AI illustrations for the five existing onboarding pages.
 * If an asset fails to load, the original vector artwork remains as fallback. */
export const ONBOARDING_IMAGE_SLOTS=Object.freeze([
  Object.freeze({key:'welcome',slot:'map-overview',file:'public/onboarding/01-map-overview.png',src:'/onboarding/01-map-overview.png'}),
  Object.freeze({key:'safety',slot:'safety-layers',file:'public/onboarding/02-safety-layers.png',src:'/onboarding/02-safety-layers.png'}),
  Object.freeze({key:'route',slot:'walking-route',file:'public/onboarding/03-walking-route.png',src:'/onboarding/03-walking-route.png'}),
  Object.freeze({key:'discover',slot:'local-discovery',file:'public/onboarding/04-local-discovery.png',src:'/onboarding/04-local-discovery.png'}),
  Object.freeze({key:'account',slot:'account-favorites',file:'public/onboarding/05-account-favorites.png',src:'/onboarding/05-account-favorites.png'})
]);
const IMAGE_SLOT_BY_KEY=Object.freeze(Object.fromEntries(ONBOARDING_IMAGE_SLOTS.map(item=>[item.key,item])));
export const ONBOARDING_SLIDES=Object.freeze([
  {
    key:'welcome',slot:'map-overview',
    title:'동작구의 길을 더 안전하게',
    description:'보행안전 정보부터 도보 길찾기, 대중교통과 생활 편의까지 한 곳에서 살펴보세요.',
    points:['동작구 주변 정보를 지도에서 확인할 수 있습니다.','필요한 기능만 골라서 사용하면 됩니다.'],
    note:'안내를 마친 뒤 바로 지도를 이용할 수 있습니다.'
  },
  {
    key:'safety',slot:'safety-layers',
    title:'필요한 안전정보만 지도에',
    description:'보호구역, CCTV, 횡단시설, 보행로 경사도 등 제공되는 안전정보를 선택해 지도에 표시하세요.',
    points:['지도 옵션과 보행안전 메뉴에서 표시 항목을 조절합니다.','자료별 범위와 갱신 시점은 서로 다를 수 있습니다.'],
    note:'표시된 자료는 보행환경을 살펴보기 위한 참고정보입니다.'
  },
  {
    key:'route',slot:'walking-route',
    title:'도보 경로를 비교하고 안내받기',
    description:'출발지와 목적지를 지정하고, 필요하면 경유지를 추가해 여러 도보 경로를 비교할 수 있습니다.',
    points:['GPS 위치 추적과 음성 안내를 선택할 수 있습니다.','위치 권한과 기기·네트워크 상태에 따라 이용 범위가 달라집니다.'],
    note:'실제 보행 가능 여부와 현장 상황을 함께 확인하세요.'
  },
  {
    key:'discover',slot:'local-discovery',
    title:'교통과 생활정보도 함께',
    description:'버스·지하철 도착정보와 시간표, 주변 생활시설, 동작구 소식을 검색할 수 있습니다.',
    points:['교통정보는 제공 기관과 노선에 따라 지원 범위가 다릅니다.','도착 예정·추정 정보는 실제 운행 상황과 차이가 날 수 있습니다.'],
    note:'검색창에서 역·정류장·장소를 함께 찾아보세요.'
  },
  {
    key:'account',slot:'account-favorites',
    title:'로그인하면 즐겨찾기를 이어서',
    description:'로그인 전에는 즐겨찾기가 이 기기에 저장됩니다. 로그인하면 지원되는 즐겨찾기를 계정과 동기화할 수 있습니다.',
    points:['카카오 또는 이메일 로그인을 지원합니다.','로그인하지 않아도 지도와 주요 기능을 이용할 수 있습니다.'],
    note:'계정과 로그인은 하단의 내 정보에서 관리할 수 있습니다.'
  }
]);

const ARTWORK={
  welcome:`<svg class="dj860-art-svg" viewBox="0 0 560 420" role="img" aria-label="동작구 지도 화면을 표현한 일러스트">
    <defs><linearGradient id="dj860-map-bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e9f5ee"/><stop offset="1" stop-color="#d6e9e0"/></linearGradient></defs>
    <rect x="34" y="28" width="492" height="364" rx="30" fill="url(#dj860-map-bg)"/>
    <path d="M-10 290C105 220 170 340 265 270S425 185 570 235" fill="none" stroke="#b6d8d1" stroke-width="43"/>
    <path d="M-10 290C105 220 170 340 265 270S425 185 570 235" fill="none" stroke="#f8fffb" stroke-width="3" stroke-dasharray="8 10"/>
    <g fill="none" stroke="#fff" stroke-width="17" stroke-linecap="round"><path d="M100 54 145 365M250 20 215 400M420 18 350 392M38 145 510 90M40 355 500 300"/></g>
    <g fill="none" stroke="#c4d8cc" stroke-width="2"><path d="M100 54 145 365M250 20 215 400M420 18 350 392M38 145 510 90M40 355 500 300"/></g>
    <g fill="#fff" stroke="#c5dacf" stroke-width="2"><rect x="76" y="93" width="83" height="45" rx="10"/><rect x="287" y="62" width="94" height="51" rx="10"/><rect x="386" y="260" width="91" height="47" rx="10"/><rect x="118" y="246" width="71" height="45" rx="10"/></g>
    <path d="M285 200c0-27 22-49 49-49s49 22 49 49c0 34-49 87-49 87s-49-53-49-87Z" fill="#11866c"/>
    <circle cx="334" cy="199" r="17" fill="#fff"/><circle cx="334" cy="199" r="7" fill="#11866c"/>
    <rect x="64" y="42" width="176" height="42" rx="21" fill="#fff" stroke="#d7e8df"/><circle cx="86" cy="63" r="7" fill="#16876d"/><path d="M102 63h112" stroke="#78968a" stroke-width="7" stroke-linecap="round"/>
  </svg>`,
  safety:`<svg class="dj860-art-svg" viewBox="0 0 560 420" role="img" aria-label="보행안전 정보 레이어를 표현한 일러스트">
    <rect x="40" y="26" width="480" height="368" rx="30" fill="#e6f2eb"/>
    <path d="M72 312 185 204l82 47 112-130 113 76" fill="none" stroke="#fff" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M72 312 185 204l82 47 112-130 113 76" fill="none" stroke="#b6d2c4" stroke-width="2.5" stroke-dasharray="7 9"/>
    <g transform="translate(90 80)"><path d="M42 4 78 18v37c0 34-23 55-36 62C29 110 6 89 6 55V18L42 4Z" fill="#13866c"/><path d="m25 57 12 12 24-27" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></g>
    <g transform="translate(330 44)"><rect width="115" height="76" rx="17" fill="#fff" stroke="#cfe2d7" stroke-width="2"/><path d="M28 48V29h20v19m-10-19v-8m-18 28h36" fill="none" stroke="#17876d" stroke-width="5" stroke-linecap="round"/><circle cx="78" cy="37" r="12" fill="#e0f1e8"/><path d="m73 37 4 4 7-9" fill="none" stroke="#16866c" stroke-width="3" stroke-linecap="round"/></g>
    <g transform="translate(255 260)"><rect width="205" height="84" rx="18" fill="#fff" stroke="#d0e2d8" stroke-width="2"/><circle cx="34" cy="42" r="15" fill="#e2f2e9"/><path d="M34 31v22m-11-11h22" stroke="#16866c" stroke-width="4" stroke-linecap="round"/><path d="M65 33h112M65 52h82" stroke="#b6cfc2" stroke-width="8" stroke-linecap="round"/></g>
    <g fill="#fff" stroke="#c3d9cd" stroke-width="2"><circle cx="190" cy="205" r="22"/><circle cx="402" cy="207" r="22"/><circle cx="145" cy="320" r="22"/></g>
    <g fill="#13866c"><circle cx="190" cy="205" r="8"/><circle cx="402" cy="207" r="8"/><circle cx="145" cy="320" r="8"/></g>
  </svg>`,
  route:`<svg class="dj860-art-svg" viewBox="0 0 560 420" role="img" aria-label="도보 경로 안내를 표현한 일러스트">
    <rect x="36" y="24" width="488" height="372" rx="30" fill="#e7f2ec"/>
    <g fill="none" stroke="#fff" stroke-width="18" stroke-linecap="round"><path d="M90 60 180 355M265 25 300 385M440 35 385 385M48 150 510 190M50 325 500 280"/></g>
    <g fill="none" stroke="#c7dacf" stroke-width="2"><path d="M90 60 180 355M265 25 300 385M440 35 385 385M48 150 510 190M50 325 500 280"/></g>
    <path d="M115 310C155 275 160 220 220 224S298 277 330 220 385 110 438 106" fill="none" stroke="#14876d" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1 1"/>
    <path d="M115 310C155 275 160 220 220 224S298 277 330 220 385 110 438 106" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-dasharray="3 13"/>
    <circle cx="115" cy="310" r="22" fill="#fff" stroke="#16866c" stroke-width="8"/><path d="M415 106c0-13 10-23 23-23s23 10 23 23c0 17-23 40-23 40s-23-23-23-40Z" fill="#13866c"/><circle cx="438" cy="106" r="7" fill="#fff"/>
    <rect x="192" y="48" width="176" height="62" rx="17" fill="#fff" stroke="#d1e4da" stroke-width="2"/><path d="M214 72h38m-38 15h25" stroke="#9cb9aa" stroke-width="7" stroke-linecap="round"/><rect x="277" y="64" width="69" height="29" rx="14" fill="#e1f3e9"/><path d="M294 78h35" stroke="#16866c" stroke-width="5" stroke-linecap="round"/>
    <rect x="70" y="55" width="88" height="44" rx="13" fill="#fff"/><circle cx="91" cy="77" r="7" fill="#16866c"/><path d="M107 77h33" stroke="#abc5b7" stroke-width="6" stroke-linecap="round"/>
  </svg>`,
  discover:`<svg class="dj860-art-svg" viewBox="0 0 560 420" role="img" aria-label="대중교통과 생활정보를 표현한 일러스트">
    <rect x="38" y="24" width="484" height="372" rx="30" fill="#e7f2ec"/>
    <g transform="translate(68 70)"><rect width="198" height="248" rx="25" fill="#fff" stroke="#cfe1d7" stroke-width="2"/><rect x="17" y="18" width="164" height="78" rx="15" fill="#eaf5ef"/><rect x="31" y="33" width="132" height="46" rx="10" fill="#c9e2d5"/><path d="M35 116h128M35 139h93" stroke="#c4d7cb" stroke-width="9" stroke-linecap="round"/><path d="M35 178h128" stroke="#d6e4db" stroke-width="2"/><circle cx="54" cy="207" r="13" fill="#dff1e7"/><path d="M81 200h81m-81 15h53" stroke="#b5cdbf" stroke-width="7" stroke-linecap="round"/></g>
    <g transform="translate(302 66)"><rect width="190" height="124" rx="22" fill="#fff" stroke="#cfe1d7" stroke-width="2"/><rect x="17" y="18" width="156" height="88" rx="14" fill="#dff0e7"/><rect x="40" y="30" width="110" height="49" rx="9" fill="#fff"/><path d="M52 55h86M52 68h54" stroke="#a8c7b7" stroke-width="7" stroke-linecap="round"/><circle cx="94" cy="93" r="5" fill="#16866c"/></g>
    <g transform="translate(292 222)"><rect width="205" height="110" rx="22" fill="#fff" stroke="#cfe1d7" stroke-width="2"/><path d="M25 42h155M25 67h111" stroke="#c4d8cc" stroke-width="9" stroke-linecap="round"/><circle cx="42" cy="86" r="8" fill="#16866c"/><circle cx="70" cy="86" r="8" fill="#8bb9a3"/><circle cx="98" cy="86" r="8" fill="#d1e7da"/></g>
    <g transform="translate(345 205)"><path d="M26 0v24m-12-12h24" stroke="#16866c" stroke-width="6" stroke-linecap="round"/></g>
  </svg>`,
  account:`<svg class="dj860-art-svg" viewBox="0 0 560 420" role="img" aria-label="계정과 즐겨찾기 동기화를 표현한 일러스트">
    <rect x="36" y="24" width="488" height="372" rx="30" fill="#e7f2ec"/>
    <rect x="114" y="54" width="332" height="306" rx="27" fill="#fff" stroke="#cfe1d7" stroke-width="2"/>
    <circle cx="280" cy="140" r="49" fill="#e0f1e8"/><circle cx="280" cy="127" r="18" fill="#16866c"/><path d="M244 180c5-25 18-37 36-37s31 12 36 37" fill="#16866c"/>
    <path d="m370 76 12 25 27 4-20 19 5 27-24-13-24 13 5-27-20-19 27-4 12-25Z" fill="#e4b75c"/>
    <rect x="154" y="226" width="252" height="51" rx="15" fill="#eaf5ef"/><circle cx="180" cy="251" r="10" fill="#16866c"/><path d="M204 244h170M204 259h112" stroke="#a9c8b8" stroke-width="8" stroke-linecap="round"/>
    <rect x="154" y="292" width="252" height="42" rx="13" fill="#16866c"/><path d="M220 313h120" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
    <path d="M78 160c-22 0-34 14-34 32s12 32 34 32m404-65c22 0 34 14 34 32s-12 32-34 32" fill="none" stroke="#a9cbb9" stroke-width="8" stroke-linecap="round"/>
    <path d="m63 214 15 10 15-10M467 181l15-10 15 10" fill="none" stroke="#16866c" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`
};

const escapeHtml=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function readSeen(win){try{return win.localStorage.getItem(ONBOARDING_STORAGE_KEY)==='1';}catch{return false;}}
function writeSeen(win){try{win.localStorage.setItem(ONBOARDING_STORAGE_KEY,'1');}catch{}}

export function installV860Onboarding({app=document.getElementById('app'),doc=app?.ownerDocument||document,win=window}={}){
  if(!app||app.dataset.dj860OnboardingInstalled==='1')return ()=>{};
  app.dataset.dj860OnboardingInstalled='1';
  if(!app.dataset.djAuthState)app.dataset.djAuthState='checking';
  const cleanups=[];
  // Start loading the approved tour assets before the first-run dialog opens.
  // Returning visitors only request these files if they explicitly reopen the tour.
  const preloadedImages=new Map();
  const preloadOnboardingImages=()=>{
    if(typeof win.Image!=='function')return;
    for(const slot of ONBOARDING_IMAGE_SLOTS){
      if(!slot.src||preloadedImages.has(slot.src))continue;
      const cached=new win.Image();
      cached.decoding='async';
      cached.src=slot.src;
      preloadedImages.set(slot.src,cached);
    }
  };
  if(!readSeen(win))preloadOnboardingImages();
  let index=0,opened=false,returnFocus=null,seenInMemory=false,pointer=null,closeTimer=0,swapTimer=0,swapEpoch=0;
  // Preserve the outgoing fully painted frame until the replacement is ready.
  let slideGhosts=[];
  function clearSlideGhosts(){
    for(const ghost of slideGhosts)ghost.remove();
    slideGhosts=[];
  }
  function holdOutgoingSlide(){
    const sources=[visualPane,overlay.querySelector('.dj860-content')];
    for(const source of sources){
      const rect=source?.getBoundingClientRect?.();
      if(!rect||rect.width<=0||rect.height<=0)continue;
      const ghost=source.cloneNode(true);
      ghost.classList.remove('dj860-entering');
      ghost.classList.add('dj860-slide-ghost');
      ghost.setAttribute('aria-hidden','true');
      ghost.querySelectorAll('[id]').forEach(child=>child.removeAttribute('id'));
      for(const [property,value] of Object.entries({
        position:'fixed',top:`${rect.top}px`,left:`${rect.left}px`,
        width:`${rect.width}px`,height:`${rect.height}px`,
        margin:'0',transform:'none',translate:'none',pointerEvents:'none'
      }))ghost.style.setProperty(property.replace(/[A-Z]/g,ch=>'-'+ch.toLowerCase()),value,'important');
      overlay.append(ghost);
      slideGhosts.push(ghost);
    }
    return [...slideGhosts];
  }
  const markGuideAutoShown=()=>{try{win.sessionStorage.setItem('dj-map-guide-initial-shown-v7121','1');}catch{}};
  const make=(tag,className,text)=>{const node=doc.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
  const overlay=make('section','dj860-onboarding');
  overlay.id='dj860-onboarding';overlay.hidden=true;
  overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-labelledby','dj860-title');overlay.setAttribute('aria-describedby','dj860-description');
  overlay.setAttribute('aria-label','앱 시작 안내');overlay.tabIndex=-1;
  overlay.innerHTML=`<div class="dj860-card">
    <header class="dj860-head"><button type="button" class="dj860-skip" data-dj860-action="skip">건너뛰기</button></header>
    <section class="dj860-visual-pane" aria-label="기능 미리보기"><div class="dj860-visual" data-image-slot="map-overview"></div></section>
    <section class="dj860-content"><div class="dj860-copy" data-dj860-copy></div></section>
    <footer class="dj860-footer"><div class="dj860-progress-wrap"><div class="dj860-progress-copy"><span class="dj860-progress-label">앱 둘러보기</span><span class="dj860-count" id="dj860-count">01 / 05</span></div><div class="dj860-progress-track" role="progressbar" aria-label="안내 진행률" aria-valuemin="1" aria-valuemax="5" aria-valuenow="1"><span class="dj860-progress-value"></span></div><div class="dj860-dots" role="group" aria-label="안내 페이지 선택"></div></div><div class="dj860-actions"><button type="button" class="dj860-prev" data-dj860-action="prev" hidden>이전</button><button type="button" class="dj860-next" data-dj860-action="next">다음</button></div></footer>
  </div>`;
  app.append(overlay);
  const visual=overlay.querySelector('.dj860-visual');
  const visualPane=overlay.querySelector('.dj860-visual-pane');
  const copy=overlay.querySelector('[data-dj860-copy]');
  const count=overlay.querySelector('#dj860-count');
  const progress=overlay.querySelector('.dj860-progress-track');
  const progressValue=overlay.querySelector('.dj860-progress-value');
  const dots=overlay.querySelector('.dj860-dots');
  const previous=overlay.querySelector('[data-dj860-action="prev"]');
  const next=overlay.querySelector('[data-dj860-action="next"]');
  const skip=overlay.querySelector('[data-dj860-action="skip"]');

  ONBOARDING_SLIDES.forEach((slide,i)=>{
    const dot=make('button','dj860-dot');dot.type='button';dot.dataset.dj860Action='dot';dot.dataset.index=String(i);
    dot.setAttribute('aria-label',`${i+1}페이지 보기`);dot.setAttribute('aria-pressed','false');dots.append(dot);
  });

  // The navigation indicator is updated when a transition is accepted,
  // independently of frame/timer delivery. On low-power phones the image
  // crossfade may paint later, but pressing Next must immediately acknowledge
  // the page request rather than appearing stuck at "01 / 05".
  function syncStepIndicator(step){
    count.textContent=`${String(step+1).padStart(2,'0')} / ${String(ONBOARDING_SLIDES.length).padStart(2,'0')}`;
    progress.setAttribute('aria-valuenow',String(step+1));
    progressValue.style.width=`${((step+1)/ONBOARDING_SLIDES.length)*100}%`;
    previous.hidden=step===0;
    next.textContent=step===ONBOARDING_SLIDES.length-1?'시작하기':'다음';
    dots.querySelectorAll('.dj860-dot').forEach((dot,i)=>{
      const active=i===step;dot.classList.toggle('is-active',active);dot.setAttribute('aria-pressed',String(active));
    });
    overlay.setAttribute('aria-label',`${step+1} / ${ONBOARDING_SLIDES.length} 앱 시작 안내`);
  }
  function render(nextIndex,direction='next',animate=true){
    index=Math.max(0,Math.min(ONBOARDING_SLIDES.length-1,nextIndex));
    const slide=ONBOARDING_SLIDES[index];
    visual.dataset.imageSlot=slide.slot;
    const imageSlot=IMAGE_SLOT_BY_KEY[slide.key];
    visual.dataset.imageFile=imageSlot?.file||'';
    const hasImage=Boolean(imageSlot?.src);
    visualPane.classList.toggle('dj860-ai-banner-pane',hasImage);
    visual.classList.toggle('dj860-has-ai-banner',hasImage);
    // Never paint the old SVG first: keep the frame and image dimensions stable
    // while the preloaded asset finishes decoding. SVG is an error fallback only.
    visual.classList.toggle('dj860-has-photo',hasImage);
    // Earlier mobile styles still round .dj860-visual via !important.
    // The AI banner must remain truly rectangular at every viewport.
    if(hasImage){
      visual.style.setProperty('border-radius','0px','important');
      visual.style.setProperty('overflow','hidden','important');
    }else{
      visual.style.removeProperty('border-radius');
      visual.style.removeProperty('overflow');
    }
    visual.innerHTML='';
    if(hasImage){
      const image=make('img','dj860-screen-image');
      image.style.setProperty('border-radius','0px','important');
      image.alt=slide.title;
      image.decoding='async';
      image.loading='eager';
      image.addEventListener('error',()=>{
        if(image.isConnected&&visual.dataset.imageSlot===slide.slot){
          visual.classList.remove('dj860-has-photo','dj860-has-ai-banner');
          visualPane.classList.remove('dj860-ai-banner-pane');
          visual.style.removeProperty('border-radius');
          visual.style.removeProperty('overflow');
          visual.innerHTML=ARTWORK[slide.key]||'';
        }
      },{once:true});
      image.src=imageSlot.src;
      visual.append(image);
    }else{
      visual.innerHTML=ARTWORK[slide.key]||'';
    }
    visualPane.dataset.direction=direction;
    visualPane.classList.remove('dj860-entering');if(animate){void visualPane.offsetWidth;visualPane.classList.add('dj860-entering');}
    copy.dataset.direction=direction;
    copy.innerHTML=`<h1 id="dj860-title" tabindex="-1">${escapeHtml(slide.title)}</h1>
      <p class="dj860-description" id="dj860-description">${escapeHtml(slide.description)}</p>
      <ul class="dj860-points">${slide.points.map(point=>`<li><span aria-hidden="true">✓</span><span>${escapeHtml(point)}</span></li>`).join('')}</ul>
      <p class="dj860-note">${escapeHtml(slide.note)}</p>
      ${slide.key==='account'?'<button type="button" class="dj860-account-link" data-dj860-action="account">내 정보에서 로그인 관리 <span aria-hidden="true">↗</span></button>':''}`;
    copy.classList.remove('dj860-entering');if(animate){void copy.offsetWidth;copy.classList.add('dj860-entering');}
    syncStepIndicator(index);
  }
  function close({complete=true,focus=true,afterClose=null}={}){
    if(!opened)return;
    swapEpoch++;if(swapTimer){win.clearTimeout(swapTimer);swapTimer=0;}clearSlideGhosts();
    overlay.classList.remove('dj860-swapping');
    for(const node of [visualPane,copy]){node.style.removeProperty('opacity');node.style.removeProperty('transition');}
    opened=false;
    // This modal owns its close transition. Inform the shared lifecycle once
    // without closing unrelated map/guide surfaces in the global cooldown.
    win.DongjakWindowLifecycle?.dismiss?.('dj860-onboarding',{global:false});
    if(complete){writeSeen(win);seenInMemory=true;}
    overlay.classList.add('is-closing');
    overlay.setAttribute('aria-hidden','true');
    app.removeAttribute('data-dj860-onboarding-open');
    if(closeTimer)win.clearTimeout(closeTimer);
    closeTimer=win.setTimeout(()=>{
      closeTimer=0;
      if(!opened){
        overlay.hidden=true;overlay.classList.remove('is-closing');
        if(typeof afterClose==='function')afterClose();
      }
    },220);
    if(focus){
      const target=returnFocus?.isConnected&&!returnFocus.closest?.('[hidden]')?returnFocus:doc.getElementById('map-gesture-guide-open');
      target?.focus?.({preventScroll:true});
    }
  }
  function open({auto=false,force=false}={}){
    if(opened)return;
    swapEpoch++;if(swapTimer){win.clearTimeout(swapTimer);swapTimer=0;}clearSlideGhosts();
    overlay.classList.remove('dj860-swapping');
    for(const node of [visualPane,copy]){node.style.removeProperty('opacity');node.style.removeProperty('transition');}
    if(auto&&(seenInMemory||readSeen(win))&&!force)return;
    preloadOnboardingImages();
    if(closeTimer){win.clearTimeout(closeTimer);closeTimer=0;}
    // Opening from first-run/guest state or the explicit "tour again" control
    // is an authorized action; register it before changing the hidden flag.
    // Otherwise the shared observer can incorrectly classify it as a stale
    // automatic reopen while some other surface is finishing its close.
    win.DongjakWindowLifecycle?.requestOpen?.('dj860-onboarding');
    overlay.hidden=false;overlay.classList.remove('is-closing');overlay.removeAttribute('aria-hidden');
    returnFocus=doc.activeElement;
    const more=doc.getElementById('dj-mobile-utilities');
    if(more&&!more.hidden){more.hidden=true;doc.getElementById('dj-mobile-more-trigger')?.setAttribute('aria-expanded','false');doc.getElementById('dj-v794-more')?.setAttribute('aria-expanded','false');app.classList.remove('dj-mobile-more-open');}
    const guide=doc.getElementById('map-gesture-guide');if(guide)guide.hidden=true;
    opened=true;render(0,'next');app.dataset.dj860OnboardingOpen='true';
    markGuideAutoShown();
    if(!auto)overlay.dataset.dj860Manual='true';else delete overlay.dataset.dj860Manual;
    win.requestAnimationFrame?.(()=>overlay.querySelector('#dj860-title')?.focus?.({preventScroll:true}));
  }
  function transitionSlide(target,direction='next'){
    if(!opened||target<0||target>=ONBOARDING_SLIDES.length||target===index)return;
    swapEpoch++;const epoch=swapEpoch;
    if(swapTimer){win.clearTimeout(swapTimer);swapTimer=0;}
    // Immediately accept fast successive taps while retaining the old image.
    index=target;syncStepIndicator(target);
    const commit=()=>{
      if(epoch!==swapEpoch||!opened)return;
      clearSlideGhosts();
      const reduced=win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      const ghosts=reduced?[]:holdOutgoingSlide();
      overlay.classList.remove('dj860-swapping');
      for(const node of [visualPane,copy]){
        node.style.removeProperty('opacity');node.style.removeProperty('transition');
      }
      // Old full-color surfaces sit above new fully opaque content. Never
      // pass through opacity:0 or a blank illustration decoding frame.
      render(target,direction,false);
      for(const ghost of ghosts){
        const remove=()=>{
          if(!ghost.isConnected)return;
          ghost.remove();slideGhosts=slideGhosts.filter(node=>node!==ghost);
        };
        // Web Animations delegates this opacity-only fade to the compositor.
        // Its explicitly-timed effect is less susceptible than a stylesheet
        // keyframe to contention from MapLibre, image decode and WebKit style
        // recalculation on the first iPhone frame. Retain CSS as a fallback.
        if(typeof ghost.animate==='function'){
          ghost.style.setProperty('animation','none','important');
          ghost.dataset.dj9266FadeEngine='waapi';
          const effect=ghost.animate(
            [{opacity:1,offset:0},{opacity:0,offset:1}],
            {duration:280,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'}
          );
          effect.finished.then(remove,()=>{});
        }else{
          ghost.dataset.dj9266FadeEngine='css';
          ghost.addEventListener('animationend',remove,{once:true});
        }
        win.setTimeout(remove,420);
      }
    };
    const imageSlot=IMAGE_SLOT_BY_KEY[ONBOARDING_SLIDES[target].key];
    const preload=imageSlot?.src?preloadedImages.get(imageSlot.src):null;
    if(preload?.decode&&!(preload.complete&&preload.naturalWidth>0)){
      Promise.race([
        preload.decode().catch(()=>{}),
        new Promise(resolve=>win.setTimeout(resolve,620))
      ]).then(commit);
    }else commit();
  }

  function move(delta){
    if(!opened)return;
    const target=index+delta;if(target<0||target>=ONBOARDING_SLIDES.length)return;
    transitionSlide(target,delta>0?'next':'prev');
  }
  function showMapGuide(){
    markGuideAutoShown();
    // Desktop users enter the map directly. The ? button can reopen this guide.
    // Do not launch a second dimmed dialog before the onboarding overlay clears.
    if(win.matchMedia?.('(min-width:700px)')?.matches)return;
    if(app.dataset.tab!=='map')doc.querySelector('#bottom-nav .nav-tab[data-tab="map"]')?.click();
    win.requestAnimationFrame?.(()=>{
      const guide=doc.getElementById('map-gesture-guide');
      if(!guide)return;
      // Use a dedicated event instead of synthesizing a click on the help icon.
      // This prevents the opening click from being replayed by generic sheet
      // animation/close coordinators and keeps the hand-off strictly one-shot.
      const EventCtor=win.CustomEvent||CustomEvent;
      win.dispatchEvent(new EventCtor('dongjak:open-map-guide'));
      if(guide.hidden){guide.hidden=false;guide.classList.add('dj-guide-centered');}
    });
  }
  function onClick(event){
    const action=event.target?.closest?.('[data-dj860-action]');if(!action||!overlay.contains(action))return;
    const type=action.dataset.dj860Action;
    if(type==='skip'){close();return;}
    if(type==='prev'){move(-1);return;}
    if(type==='next'){
      if(index===ONBOARDING_SLIDES.length-1)close({afterClose:showMapGuide});else move(1);
      return;
    }
    if(type==='dot'){const target=Number(action.dataset.index);if(Number.isInteger(target))transitionSlide(target,target>=index?'next':'prev');return;}
    if(type==='account'){
      close();
      win.requestAnimationFrame?.(()=>doc.querySelector('#bottom-nav .nav-tab[data-tab="mine"]')?.click());
    }
  }
  function onKeyDown(event){
    if(!opened)return;
    if(event.key==='Escape'){event.preventDefault();close();return;}
    if(event.key==='ArrowRight'){event.preventDefault();move(1);return;}
    if(event.key==='ArrowLeft'){event.preventDefault();move(-1);return;}
    if(event.key==='Tab'){
      const items=[...overlay.querySelectorAll('button:not([disabled]):not([hidden])')];
      if(!items.length)return;
      const first=items[0],last=items.at(-1);
      if(event.shiftKey&&doc.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first.focus();}
    }
  }
  let swipeClickUntil=0;
  function onPointerDown(event){
    if(!opened||event.button!==undefined&&event.button!==0)return;
    // Swipe tracking is enabled across the whole card. Text fields remain
    // native controls, but skip/next/dots and the artwork are also valid swipe
    // start areas; a completed swipe suppresses only its synthetic click.
    if(event.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return;
    pointer={id:event.pointerId,x:event.clientX,y:event.clientY};
    // Do not capture the pointer on the modal parent. Pointer capture retargets
    // the generated `click` away from the actual Next/Skip/Dot button to the
    // overlay, leaving the user stuck on page 1 on desktop Chromium.
    // Track the swipe without pointer capture; ordinary controls retain clicks.
  }
  function onPointerUp(event){
    if(!pointer||event.pointerId!==pointer.id)return;
    const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;pointer=null;
    if(Math.abs(dx)>=54&&Math.abs(dy)<=Math.max(72,Math.abs(dx)*.75)){
      move(dx<0?1:-1);
      swipeClickUntil=Date.now()+420;
      if(event.cancelable)event.preventDefault();
    }
  }
  function onSwipeClickCapture(event){
    // Keyboard and assistive-technology activation is never a swipe-generated click.
    if(event.detail===0)return;
    if(!swipeClickUntil||Date.now()>swipeClickUntil)return;
    swipeClickUntil=0;
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  function onPointerCancel(){pointer=null;}
  // Swipe suppression runs first, then handle the actual click on the
  // owning dialog in the capture phase. A document-level bubbling listener
  // was vulnerable to unrelated sheet controllers stopping propagation.
  overlay.addEventListener('click',onSwipeClickCapture,true);
  overlay.addEventListener('click',onClick,true);
  doc.addEventListener('keydown',onKeyDown);
  overlay.addEventListener('pointerdown',onPointerDown);
  overlay.addEventListener('pointerup',onPointerUp);
  overlay.addEventListener('pointercancel',onPointerCancel);
  cleanups.push(()=>doc.removeEventListener('keydown',onKeyDown),
    ()=>overlay.removeEventListener('click',onClick,true),
    ()=>overlay.removeEventListener('click',onSwipeClickCapture,true),
    ()=>overlay.removeEventListener('pointerdown',onPointerDown),()=>overlay.removeEventListener('pointerup',onPointerUp),
    ()=>overlay.removeEventListener('pointercancel',onPointerCancel));

  const bindOpenButton=button=>{
    const handler=event=>{event.preventDefault();event.stopPropagation();open();};
    button.addEventListener('click',handler);
    cleanups.push(()=>button.removeEventListener('click',handler));
  };
  const guide=doc.getElementById('map-gesture-guide');
  if(guide&&!guide.querySelector('[data-dj860-open]')){
    const button=make('button','dj860-guide-launch','앱 처음부터 둘러보기');button.type='button';button.dataset.dj860Open='true';bindOpenButton(button);
    const release=guide.querySelector('.dj-guide-release');
    if(release)release.insertAdjacentElement('afterend',button);else guide.append(button);
  }
  function ensureMoreEntry(){
    const panel=doc.getElementById('dj-mobile-utilities');
    if(!panel||panel.querySelector('[data-dj860-open]'))return Boolean(panel);
    const button=make('button','dj860-more-launch','앱 처음부터 둘러보기');button.type='button';button.dataset.dj860Open='true';bindOpenButton(button);
    button.setAttribute('aria-label','앱 사용 안내 다시 보기');
    const anchor=panel.querySelector('#dj-mobile-settings');
    if(anchor)anchor.insertAdjacentElement('afterend',button);else panel.append(button);
    return true;
  }
  ensureMoreEntry();
  const entryObserver=new MutationObserver(()=>{if(ensureMoreEntry())entryObserver.disconnect();});
  if(!doc.getElementById('dj-mobile-utilities'))entryObserver.observe(app,{childList:true});
  cleanups.push(()=>entryObserver.disconnect());

  const startup=doc.getElementById('map-startup-overlay');
  let startupObserver=null,pendingGuestOnboarding=false;
  const maybeAutoOpen=()=>{
    // Once the visitor closes the tour on this page, later auth-state events
    // must not reopen it. A fresh page may still show the guest tour.
    if(seenInMemory){app.dataset.dj860AutoResolved='true';return;}
    if(startup&&!startup.hidden)return;
    const authState=app.dataset.djAuthState||'checking';
    if(authState==='checking')return;
    app.dataset.dj860AutoResolved='true';
    if(authState==='signed-out'||pendingGuestOnboarding){
      pendingGuestOnboarding=false;open({auto:true,force:true});return;
    }
    // Signed-in first-time visitors still receive the ordinary first-run tour.
    if(seenInMemory||readSeen(win))return;
    if(!startup||startup.hidden)open({auto:true});
  };
  const onAuthState=event=>{
    if(seenInMemory)return;
    if(event.detail?.authenticated===true){pendingGuestOnboarding=false;maybeAutoOpen();return;}
    if(event.detail?.authenticated!==false)return;
    markGuideAutoShown();
    if(startup&&!startup.hidden){pendingGuestOnboarding=true;return;}
    pendingGuestOnboarding=false;
    maybeAutoOpen();
  };
  win.addEventListener('dongjak:auth-state',onAuthState);
  cleanups.push(()=>win.removeEventListener('dongjak:auth-state',onAuthState));
  // Auth readiness may be set before its event or even before this installer.
  const authObserver=new MutationObserver(maybeAutoOpen);
  authObserver.observe(app,{attributes:true,attributeFilter:['data-dj-auth-state']});
  cleanups.push(()=>authObserver.disconnect());
  if(startup&&!startup.hidden){
    startupObserver=new MutationObserver(()=>{
      if(startup.hidden){startupObserver.disconnect();startupObserver=null;maybeAutoOpen();}
    });
    startupObserver.observe(startup,{attributes:true,attributeFilter:['hidden']});
  }else maybeAutoOpen();
  cleanups.push(()=>startupObserver?.disconnect());
  cleanups.push(()=>{if(closeTimer)win.clearTimeout(closeTimer);if(swapTimer)win.clearTimeout(swapTimer);overlay.remove();delete app.dataset.dj860OnboardingInstalled;delete app.dataset.dj860OnboardingOpen;});
  return ()=>cleanups.forEach(fn=>fn());
}

if(typeof document!=='undefined'&&typeof window!=='undefined'){
  const start=()=>installV860Onboarding();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
}
// Release CI note: the public source-pinned UI gate is invoked by the integrated Preview workflow.
