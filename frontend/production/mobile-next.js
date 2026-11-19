// Phone toolbar: independent of legacy scroller rebuilds; native controllers own all GIS state.
import {bindHeaderDragInput} from './mobile-header-input.js';
const KEY='dongjak-phone-shortcuts-v2';
const icons={building:'<path d="M3 21V9l9-6 9 6v12H3zm9-18v18M6 12l3-2m-3 6 3-2m6-4 3 2m-3 2 3 2"/>',near:'<circle cx="12" cy="12" r="6"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>',report:'<path d="M4 20l4-1 12-12-4-4L4 15zM13 6l4 4"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',cloud:'<path d="M6 18a4 4 0 1 1 .5-8A6 6 0 0 1 18 11a3.5 3.5 0 0 1 0 7Z"/>',plus:'<path d="M12 5v14M5 12h14"/>',layers:'<path d="m12 3 9 5-9 5-9-5ZM3 12l9 5 9-5M3 16l9 5 9-5"/>',shield:'<path d="M12 2l8 4v6c0 5-4 8-8 10-4-2-8-5-8-10V6zM8 12l3 3 5-6"/>',moon:'<path d="M20 15A8 8 0 0 1 9 4a9 9 0 1 0 11 11Z"/>',mountain:'<path d="m2 20 8-14 5 8 3-4 4 10Z"/>',bus:'<rect x="5" y="3" width="14" height="17" rx="3"/><path d="M5 11h14M8 20v2m8-2v2M8 16h1m6 0h1"/>',mic:'<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/>',map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15"/>',alert:'<path d="M12 3 2 21h20L12 3Z M12 9v5m0 3v1"/>'};
export const PHONE_CHOICES=Object.freeze([
 ['pilot','보행안전','shield','#map-safety-toggle'],
 ['night','야간시야','moon','#night-visibility-toggle'],
 ['slope','경사도','mountain','[data-dj-import="slope"]'],
 ['bocha','보차혼용','layers','#sangdo-bocha-toggle'],
 ['accident','사고다발','alert','[data-dj-import="accidents"]'],
 ['livebus','실시간버스','bus','[data-live-vehicle="bus"]'],
 ['livemetro','실시간지하철','bus','[data-live-vehicle="metro"]'],
 ['dong','행정동','map','#open-admin-dongs-from-options'],
 ['cctv','CCTV','shield','[data-dj-import="cctv-security"]'],
 ['zone','보호구역','shield','#protection-zone-toggle'],
 ['access','교통약자','near','#ped-access-toggle'],
 ['buildings','3D 건물','building','[data-base-layer="buildings"]'],
 ['sdot','도시환경','near','[data-dj-import="sdot-environment"]'],
 ['incidents','돌발정보','alert','[data-dj-import="road-incidents"]'],
 ['cctvparking','주정차 CCTV','shield','[data-dj-import="cctv-parking"]'],
 ['cctvother','기타 CCTV','shield','[data-dj-import="cctv-other"]'],
 ['crossing','횡단지점','map','[data-dj-import="survey-crosswalk"]'],
 ['signals','음향신호기','near','[data-dj-import="audio-signals"]'],
 ['elevator','승강기','near','[data-dj-import="metro-elevator"]'],
 ['speed','제한속도','alert','#sangdo-speed-toggle'],
 ['camera','단속카메라','alert','#sangdo-camera-toggle']
]);
export function normalizePhoneShortcuts(value){return [...new Set(Array.isArray(value)?value.filter(id=>PHONE_CHOICES.some(c=>c[0]===id)):[])].slice(0,3)}
const read=(w,k,f)=>{try{return JSON.parse(w.localStorage.getItem(k)||'null')??f}catch{return f}};
const save=(w,k,v)=>{try{w.localStorage.setItem(k,JSON.stringify(v))}catch{}};
export const phoneIcon=key=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(icons[key]||icons.layers)+'</svg>';

// The layer overlay stays fixed; only its inner card follows the finger.
// Compact -> expanded -> compact -> dismiss. Header buttons and the list keep native input.
export function layerDragFrame(startHeight,dy,compact,expanded){
 const height=Math.min(expanded,Math.max(compact,startHeight-dy));
 return {height,offset:Math.max(0,dy-(startHeight-compact))};
}
export function installLayerHeaderDrag({panel,body,header,win,onDismiss}){
 let gesture=null,expanded=false,settleTimer=0,compactHeight=0,blockedUntil=0,closing=false;
 const reduced=()=>win.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const put=(name,value)=>body.style.setProperty(name,value,'important');
 const clear=()=>{for(const name of ['height','translate','transition','max-height'])body.style.removeProperty(name)};
 const reset=()=>{gesture=null;expanded=false;closing=false;compactHeight=0;win.clearTimeout(settleTimer);clear();delete body.dataset.djLayerExpanded;delete body.dataset.djLayerDragInput;};
 reset.freeze=()=>{gesture=null;win.clearTimeout(settleTimer);const rect=body.getBoundingClientRect();put('height',rect.height+'px');put('transition','none');};
 const finish=(next,close=false)=>{
  const rect=body.getBoundingClientRect();expanded=next;closing=close;body.dataset.djLayerExpanded=String(next);
  const max=Math.max(compactHeight,win.innerHeight-28);
  const height=next?max:compactHeight;
  const policy=win.DongjakWindowMotion?.policy||{open:420,close:320,easing:'cubic-bezier(.42,0,.58,1)'};
  const duration=close?policy.close:policy.open;
  put('max-height',max+'px');put('height',rect.height+'px');
  const offset=parseFloat((win.getComputedStyle(body).translate||'0 0').split(' ')[1])||0;
  put('translate','0 '+offset+'px');put('transition','none');void body.offsetHeight;
  const complete=()=>{if(close){onDismiss();reset();}else{clear();if(next){put('max-height',max+'px');put('height',height+'px');}}};
  if(reduced()){complete();return;}
  put('transition','height '+duration+'ms '+policy.easing+', translate '+duration+'ms '+policy.easing);
  put('height',height+'px');put('translate','0 '+(close?win.innerHeight+24:0)+'px');
  settleTimer=win.setTimeout(complete,duration+40);
 };
 const down=e=>{
  if(closing||panel.hidden||panel.classList.contains('djNext-leaving')||e.isPrimary===false||(e.pointerType==='mouse'&&e.button!==0)||e.target.closest?.('button,a,input,select,textarea,label,[role="button"]'))return;
  win.clearTimeout(settleTimer);win.DongjakWindowMotion?.cancel(body);
  const rect=body.getBoundingClientRect();if(!compactHeight)compactHeight=rect.height;
  put('max-height',Math.max(compactHeight,win.innerHeight-28)+'px');put('height',rect.height+'px');put('transition','none');
  gesture={id:e.pointerId,y:e.clientY,x:e.clientX,height:rect.height,expanded,dragging:false};
  body.dataset.djLayerDragInput=e.pointerType||'pointer';
  if(typeof e.pointerId==='number')try{header.setPointerCapture?.(e.pointerId)}catch{}
  return true;
 };
 const move=e=>{
  const g=gesture;if(!g||e.pointerId!==g.id)return;
  const dy=e.clientY-g.y,dx=e.clientX-g.x;
  if(!g.dragging){if(Math.abs(dy)<7)return;if(Math.abs(dx)>Math.abs(dy)){gesture=null;finish(g.expanded);return;}g.dragging=true;}
  const frame=layerDragFrame(g.height,dy,compactHeight,Math.max(compactHeight,win.innerHeight-28));
  put('height',frame.height+'px');put('translate','0 '+frame.offset+'px');
  if(e.cancelable)e.preventDefault();
 };
 const end=(e,cancel=false)=>{
  const g=gesture;if(!g||e.pointerId!==g.id)return;gesture=null;
  if(g.dragging)blockedUntil=win.performance.now()+350;
  const dy=e.clientY-g.y;
  if(cancel||!g.dragging||Math.abs(dy)<45){finish(g.expanded);return;}
  if(dy<0){finish(true);return;}
  if(g.expanded){finish(false);return;}
  finish(false,dy>=90);
 };
 bindHeaderDragInput(header,win,{down,move,up:e=>end(e),cancel:e=>end(e,true)});
 header.addEventListener('click',e=>{if(win.performance.now()<blockedUntil&&!e.target.closest?.('button,a,input,select,textarea,[role="button"]')){e.preventDefault();e.stopImmediatePropagation();}},true);
 return reset;
}

export function installPhoneToolbar({app,doc=document,win=window}){
 if(!win.matchMedia('(max-width:699px)').matches||app.dataset.djNextInstalled)return;
 app.dataset.djNextInstalled='1';
 const $=id=>doc.getElementById(id),q=s=>doc.querySelector(s);
 let selected=normalizePhoneShortcuts(read(win,KEY,[])),rail=null,host=null,scheduled=false,focusReturn=null,slot=null,weather=null;
 const railActions=new WeakMap();
 const button=(label,icon,fn)=>{const node=doc.createElement('button');node.type='button';node.className='djNext-tool';node.innerHTML=phoneIcon(icon);const caption=doc.createElement('span');caption.textContent=label;node.append(caption);node.setAttribute('aria-label',label);railActions.set(node,fn);node.addEventListener('click',fn);return node};
 const panel=doc.createElement('section');panel.id='djNext-layer-panel';panel.className='djNext-modal';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','레이어 및 바로가기');
 const body=doc.createElement('div');body.className='djNext-modal-body';const h=doc.createElement('header');const title=doc.createElement('strong');title.textContent='레이어 및 바로가기';const close=doc.createElement('button');close.type='button';close.className='djNext-close';close.textContent='×';close.setAttribute('aria-label','레이어 설정 닫기');title.insertAdjacentHTML('afterbegin',phoneIcon('layers'));h.append(title,close);body.append(h);
 const scroll=doc.createElement('div');scroll.className='djNext-layer-scroll';body.append(scroll);
 const hint=doc.createElement('p');hint.textContent='아이콘: 지도 기능 · 아래 + 버튼: 바로가기 등록 (최대 3개)';scroll.append(hint);
 const count=doc.createElement('p');count.className='djNext-count';count.setAttribute('aria-live','polite');scroll.append(count);
 const list=doc.createElement('div');list.className='djNext-list';scroll.append(list);panel.append(body);app.append(panel);
 let closeTimer=0;
 const resetLayerDrag=installLayerHeaderDrag({panel,body,header:h,win,onDismiss:()=>{slot=null;panel.classList.add('djNext-leaving');finishClose();}});
 function dismiss(immediate=false){slot=null;if(immediate||win.matchMedia('(prefers-reduced-motion:reduce)').matches){resetLayerDrag();win.clearTimeout(closeTimer);win.DongjakWindowMotion?.cancel(body);panel.hidden=true;panel.classList.remove('djNext-leaving');return}
  if(panel.hidden||panel.classList.contains('djNext-leaving'))return;
  win.clearTimeout(closeTimer);
  resetLayerDrag.freeze();
  panel.classList.add('djNext-leaving');if(win.DongjakWindowMotion){win.DongjakWindowMotion.close(body,finishClose);return}closeTimer=win.setTimeout(finishClose,380)
 }
 function finishClose(){if(!panel.classList.contains('djNext-leaving'))return;win.clearTimeout(closeTimer);panel.hidden=true;panel.classList.remove('djNext-leaving');if(focusReturn?.isConnected)focusReturn.focus({preventScroll:true})}
 body.addEventListener('animationend',e=>{if(e.target===body&&e.animationName==='djNextSheetOut')finishClose()});
 panel.addEventListener('dj-next:layer-dismiss',()=>dismiss(true));
 close.addEventListener('click',()=>dismiss());panel.addEventListener('click',e=>{if(e.target===panel)dismiss()});
 doc.addEventListener('keydown',e=>{if(panel.hidden)return;if(e.key==='Escape'){dismiss();return}if(e.key==='Tab'){const els=[...panel.querySelectorAll('button:not(:disabled)')];if(!els.length)return;if(e.shiftKey&&doc.activeElement===els[0]){e.preventDefault();els.at(-1).focus()}else if(!e.shiftKey&&doc.activeElement===els.at(-1)){e.preventDefault();els[0].focus()}}});
 const notify=msg=>{let n=$('djNext-toast');if(!n){n=doc.createElement('div');n.id='djNext-toast';n.setAttribute('role','status');app.append(n)}n.textContent=msg;n.hidden=false;win.clearTimeout(n._timer);n._timer=win.setTimeout(()=>n.hidden=true,3500)};
 function invoke(selector){const b=q(selector);if(!b||b.disabled){notify('현재 사용할 수 없는 기능입니다. 지도 로딩 후 다시 시도해 주세요.');return}b.click()}
 function open(event,idx=null){resetLayerDrag();win.clearTimeout(closeTimer);panel.classList.remove('djNext-leaving');focusReturn=event.target?.closest?.('button')||event.currentTarget;slot=idx;renderList();scroll.scrollTop=0;win.DongjakWindowLifecycle?.requestOpen(panel.id);panel.hidden=false;win.DongjakWindowMotion?.open(body);app.dataset.djNextLayerAction='open';close.focus({preventScroll:true})}
 function update(value){selected=normalizePhoneShortcuts(value);save(win,KEY,selected);renderRail();renderList()}
 function renderList(){const prev=scroll.scrollTop;count.textContent='등록 '+selected.length+'/3';list.replaceChildren();
 const groups=[['지도 기능',['pilot','night','dong','buildings','livebus','livemetro','access']],['보행안전 정보',['slope','bocha','accident','zone','sdot','incidents','crossing','signals','elevator','speed','camera','cctv','cctvparking','cctvother']]];
 for(const [title,ids] of groups){const heading=doc.createElement('h3');heading.textContent=title;heading.className='djNext-group-title';list.append(heading);const grid=doc.createElement('div');grid.className='djNext-layer-grid';list.append(grid);
 for(const [id,label,icon,selector] of ids.map(id=>PHONE_CHOICES.find(c=>c[0]===id)).filter(Boolean)){
  const line=doc.createElement('div');line.className='djNext-layer-row';line.dataset.layerKey=id;
 const source=q(selector);const action=button(label,icon,()=>{dismiss(true);invoke(selector)});action.className='djNext-layer-action';const glyph=action.querySelector('svg');const layerPaths={zone:'<path d="M3 20h18M5 16V8l7-5 7 5v8M9 16v-5h6v5"/>',bocha:'<path d="M5 3v18M19 3v18M12 3v4m0 3v4m0 3v4"/>',livemetro:'<rect x="6" y="3" width="12" height="15" rx="3"/><path d="M6 10h12M9 18l-3 4m9-4 3 4M9 14h1m4 0h1"/>',access:'<circle cx="12" cy="4" r="2"/><path d="M5 8h14M12 6v8m0 0-4 7m4-7 4 7"/>',sdot:'<path d="M3 18h18M5 18V9h5v9m4 0V5h5v13M8 12h0m9-3h0"/>',signals:'<path d="M4 10v4h4l5 4V6l-5 4H4zm12-1a4 4 0 0 1 0 6m2-8a7 7 0 0 1 0 10"/>',elevator:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M12 3v18M7 10l2-2 2 2m2 4 2 2 2-2"/>',crossing:'<path d="M4 4v16m16-16v16M8 5h8m-8 5h8m-8 5h8m-8 5h8"/>'};if(layerPaths[id])glyph.innerHTML=layerPaths[id];const tile=doc.createElement('span');tile.className='djNext-layer-tile';tile.append(glyph);action.prepend(tile);action.setAttribute('aria-label',label+' 지도 기능');
  const state=doc.createElement('small');state.className='djNext-layer-state';const pressed=source?.getAttribute('aria-pressed');state.textContent=pressed==='true'?'표시 중':pressed==='false'?'꺼짐':'기능 열기';if(!source||source.disabled)state.textContent='준비 중';action.append(state);if(pressed!==null&&pressed!==undefined)action.setAttribute('aria-pressed',pressed);
  const add=doc.createElement('button');add.type='button';add.className='djNext-pin';const current=selected.includes(id);add.textContent=current?'−':'+';add.setAttribute('aria-label',label+' 바로가기 '+(current?'제거':'추가'));add.setAttribute('aria-pressed',String(current));add.disabled=!current&&selected.length>=3;
  add.addEventListener('click',()=>{if(current){update(selected.filter(x=>x!==id));return}if(selected.length>=3)return;const next=selected.slice();next.splice(Math.min(slot??next.length,next.length),0,id);update(next);slot=null});
  line.append(action,add);grid.append(line);
 }}scroll.scrollTop=prev;}
 function refresh(){if(!rail)return;for(const n of rail.querySelectorAll('[data-source]')){const b=q(n.dataset.source);const state=b?.getAttribute('aria-pressed')??b?.getAttribute('aria-expanded');if(state!==null&&state!==undefined&&n.getAttribute('aria-pressed')!==state)n.setAttribute('aria-pressed',state)}
  const native=$('dj-v794-weather'),caption=native?.querySelector('.dj910-weather-temp'),type=native?.querySelector('.dj910-weather-icon')?.dataset.dj912WeatherIcon;
  if(weather){const span=weather.querySelector('span');const value=caption?.textContent||'날씨';if(span.textContent!==value)span.textContent=value;const symbol=type==='sun'?'sun':type&&type!=='unknown'?'cloud':'sun';if(weather.dataset.symbol!==symbol){weather.querySelector('svg').outerHTML=phoneIcon(symbol);weather.dataset.symbol=symbol}}
 }
 function renderRail(){if(!rail)return;rail.replaceChildren();
  const near=button('주변정보','near',()=>invoke('#ped-nearby-open'));near.id='djNext-near';near.setAttribute('aria-label','주변 안전정보');
  weather=button('날씨','sun',()=>invoke('#weather-label'));weather.id='djNext-weather';
  const report=button('위험제보','report',()=>invoke('#ped-report-open'));report.id='djNext-report';
  rail.append(near,weather,report);
  for(let i=0;i<Math.min(3,selected.length+1);i++){const choice=PHONE_CHOICES.find(c=>c[0]===selected[i]);const b=choice?button(choice[1],choice[2],()=>invoke(choice[3])):button('추가','plus',e=>open(e,i));b.dataset.slot=String(i);if(choice){b.dataset.shortcut=choice[0];b.dataset.source=choice[3];const compact={livebus:'버스위치',livemetro:'열차위치',cctvparking:'주정차',cctvother:'기타CCTV',camera:'단속카메라',signals:'음향신호',incidents:'돌발정보'};if(compact[choice[0]])b.querySelector('span').textContent=compact[choice[0]]}else{b.classList.add('djNext-empty');b.setAttribute('aria-label','바로가기 '+(i+1)+' 추가')}rail.append(b)}
  const layers=button('레이어','layers',e=>open(e));layers.id='djNext-layers';rail.append(layers);refresh();
 }
 function sync(){scheduled=false;const next=$('dj-v794-toolbar');const legacy=$('dj831-scrollport');if(legacy&&legacy.style.getPropertyValue('display')!=='none')legacy.style.setProperty('display','none','important');
 if(next&&next.dataset.djNextReady!=='1')next.dataset.djNextReady='1';
 if(!host){host=doc.createElement('nav');host.id='djNext-toolbar';host.setAttribute('aria-label','모바일 지도 주요 기능');rail=doc.createElement('div');rail.id='djNext-rail';rail.setAttribute('role','group');rail.setAttribute('aria-label','주요 지도 기능');host.append(rail);app.append(host);renderRail()}else refresh()
 }
 const schedule=()=>{if(scheduled)return;scheduled=true;win.requestAnimationFrame(sync)};
 new MutationObserver(schedule).observe(app,{subtree:true,childList:true,attributes:true,attributeFilter:['data-active','aria-pressed','aria-expanded','data-dj912-weather-icon']});
 // The independent phone rail owns its click before legacy document-level
 // overlay/gesture delegates. Do not intercept native or map-surface events.
 win.addEventListener('click',e=>{
  const b=e.target.closest?.('#djNext-rail > button.djNext-tool');
  if(b&&rail?.contains(b)&&app.dataset.tab==='map'&&app.dataset.searchOpen!=='true'&&!b.disabled){
   const run=railActions.get(b);if(!run)return;
   e.preventDefault();e.stopImmediatePropagation();
   app.dataset.djNextLastAction=b.id||b.dataset.shortcut||'slot-'+b.dataset.slot;
   run(e);return;
  }
  if(!panel.hidden&&e.target.closest?.('#bottom-nav'))dismiss(true);
 },true);
 sync();
}
export function installPhonePermissions({app,doc=document,win=window}){
 if(!win.matchMedia('(max-width:699px)').matches)return;
 const $=id=>doc.getElementById(id),key='dongjak-permission-intro-v1';
 const panel=doc.createElement('section');panel.id='djNext-permissions';panel.className='djNext-modal';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','위치 및 마이크 권한');
 const body=doc.createElement('div');body.className='djNext-modal-body';
 body.innerHTML='<header><strong>필요한 권한을 선택해 주세요</strong><button type="button" class="djNext-permission-skip djNext-close" aria-label="권한 안내 건너뛰기">×</button></header><p>위치: 주변정보·길찾기<br>마이크: 음성 검색<br>두 권한은 선택사항입니다.</p><div class="djNext-permission-row"><button type="button" data-permission="location" aria-label="위치 권한 허용"><span>위치 권한 허용</span><small role="status" data-status="location">선택 안 함</small></button></div><div class="djNext-permission-row"><button type="button" data-permission="microphone" aria-label="마이크 권한 허용"><span>마이크 권한 허용</span><small role="status" data-status="microphone">선택 안 함</small></button></div><button type="button" class="djNext-continue">계속하기</button>';panel.append(body);app.append(panel);
 for(const b of body.querySelectorAll('[data-permission]'))b.insertAdjacentHTML('afterbegin',phoneIcon(b.dataset.permission==='location'?'near':'mic'));
 let after=null;
 win.addEventListener('dj-next:permission-intro',e=>{if(read(win,key,false)){e.detail?.continue?.();return}after=e.detail?.continue||null;win.DongjakWindowLifecycle?.requestOpen(panel.id);panel.hidden=false;win.DongjakWindowMotion?.open(body);body.querySelector('button').focus()});
 const state=(kind,result)=>{const n=body.querySelector('[data-status="'+kind+'"]');n.textContent=result;n.dataset.granted=String(result==='허용됨')};
 for(const b of body.querySelectorAll('[data-permission]'))b.addEventListener('click',async()=>{const kind=b.dataset.permission;b.disabled=true;state(kind,'요청 중…');try{if(kind==='location'){if(!win.navigator.geolocation)throw Error('unsupported');await new Promise((res,rej)=>win.navigator.geolocation.getCurrentPosition(res,rej,{timeout:12000,maximumAge:0}));}else{if(!win.navigator.mediaDevices?.getUserMedia)throw Error('unsupported');const stream=await win.navigator.mediaDevices.getUserMedia({audio:true});stream.getTracks().forEach(t=>t.stop())}state(kind,'허용됨')}catch(error){state(kind,error?.name==='NotAllowedError'||error?.code===1?'거부됨':error?.message==='unsupported'?'지원 안 됨':'확인 실패')}finally{b.disabled=false}});
 const continueIntro=()=>{if(panel.hidden||panel.dataset.closing==='true')return;panel.dataset.closing='true';const finish=()=>{panel.hidden=true;delete panel.dataset.closing;save(win,key,true);const fn=after;after=null;fn?.()};if(win.DongjakWindowMotion)win.DongjakWindowMotion.close(body,finish);else finish()};
 body.querySelector('.djNext-continue').addEventListener('click',continueIntro);body.querySelector('.djNext-permission-skip').addEventListener('click',continueIntro);
 const form=doc.querySelector('.map-quick-search-form'),input=$('map-quick-search-query');if(!form||!input)return;
 const mic=doc.createElement('button');mic.id='djNext-mic';mic.type='button';mic.setAttribute('aria-label','음성 장소 검색');mic.setAttribute('aria-pressed','false');mic.innerHTML=phoneIcon('mic');form.insertBefore(mic,form.querySelector('[type=submit]'));
 const feedback=doc.createElement('div');feedback.id='djNext-voice-status';feedback.hidden=true;feedback.setAttribute('role','status');app.append(feedback);
 let active=null,timer=0;
 const message=t=>{feedback.hidden=false;feedback.textContent=t;win.clearTimeout(timer);timer=win.setTimeout(()=>feedback.hidden=true,5000)};
 const reset=()=>{active=null;mic.setAttribute('aria-pressed','false');if(feedback.textContent.startsWith('듣는 중'))feedback.hidden=true};
 mic.addEventListener('click',async()=>{if(active){active.stop?.();return}const API=win.SpeechRecognition||win.webkitSpeechRecognition;if(!API){message('이 브라우저에서는 음성 검색을 지원하지 않습니다. 검색창에 입력해 주세요.');input.focus();return}
  if(win.navigator.mediaDevices?.getUserMedia){try{const stream=await win.navigator.mediaDevices.getUserMedia({audio:true});stream.getTracks().forEach(t=>t.stop())}catch{message('마이크 권한이 필요합니다. 웹앱 또는 기기 설정에서 허용한 뒤 다시 눌러 주세요.');return}}
  const r=new API();active=r;r.lang='ko-KR';r.interimResults=false;r.continuous=false;mic.setAttribute('aria-pressed','true');message('듣는 중… 말씀해 주세요.');
  r.onresult=e=>{if(active!==r)return;const value=e.results?.[0]?.[0]?.transcript?.trim();if(!value)return;input.value=value.slice(0,80);input.dispatchEvent(new Event('input',{bubbles:true}));form.requestSubmit?.();feedback.hidden=true};
  r.onerror=e=>{if(active!==r)return;const messages={'not-allowed':'마이크 사용 권한을 확인해 주세요.','service-not-allowed':'이 환경에서 음성 검색을 사용할 수 없습니다.','no-speech':'음성을 듣지 못했습니다. 마이크를 눌러 다시 시도해 주세요.','audio-capture':'사용할 수 있는 마이크가 없습니다.','network':'네트워크 연결을 확인해 주세요.','language-not-supported':'한국어 음성 검색을 지원하지 않는 환경입니다.'};if(e.error==='aborted')feedback.hidden=true;else message(messages[e.error]||'음성 검색에 실패했습니다. 다시 시도해 주세요.');reset()};r.onend=()=>{if(active===r)reset()};
  try{r.start()}catch{reset();message('음성 검색을 시작할 수 없습니다. 직접 입력해 주세요.')}
 });
}
export function installPhoneRouteComparison({app,doc=document,win=window}){
 if(!win.matchMedia('(max-width:699px)').matches)return;
 const host=doc.getElementById('route-map-card'),route=doc.getElementById('route-variants');if(!host||!route)return;
 const transitOption=doc.getElementById('djNext-transit-option');transitOption?.addEventListener('click',()=>win.dispatchEvent(new Event('dj-next:open-transit')));
 const cards=doc.createElement('div');cards.id='djNext-route-compare';cards.className='djNext-route-compare';host.append(cards);
 let data=null;
 const variants=[['standard','일반 최단','#3978c8'],['transit','대중교통','#7963b3'],['gentle','경사 회피','#a4742e'],['balanced','종합 최적','#087e68']];
 const format=r=>r&&Number.isFinite(r.seconds)&&Number.isFinite(r.kilometers)?'약 '+Math.max(1,Math.ceil(r.seconds/60))+'분 · '+r.kilometers.toFixed(2)+'km':'계산 불가';
 function render(){cards.replaceChildren();if(transitOption)transitOption.disabled=!data?.transit;if(!data)return;for(const [id,label,color] of variants){const b=doc.createElement('button');b.type='button';b.dataset.comparison=id;b.style.setProperty('--route-accent',color);const h=doc.createElement('strong');h.textContent=label;const small=doc.createElement('span');const r=data[id];small.textContent=id==='transit'?(r?'지하철 연계 약 '+Math.ceil(r.indicativeMinutes)+'분 (참고)':'연결 후보 없음'):format(r);if(id==='balanced'&&r)small.textContent+=' · 잠정';b.append(h,small);b.disabled=!r;b.setAttribute('aria-pressed',String(id===data.selected));b.addEventListener('click',()=>{if(id==='transit'){win.dispatchEvent(new Event('dj-next:open-transit'));return}const target=route.querySelector('[data-route-variant="'+id+'"]');if(target&&!target.disabled)target.click()});cards.append(b)}}
 win.addEventListener('dj-next:route-comparison',e=>{data=e.detail;render()});
 win.addEventListener('dj-next:route-selected',e=>{if(!data)return;data={...data,selected:e.detail};for(const b of cards.children)b.setAttribute('aria-pressed',String(b.dataset.comparison===data.selected))});
 win.addEventListener('dj-next:route-clear',()=>{data=null;render()});
}
