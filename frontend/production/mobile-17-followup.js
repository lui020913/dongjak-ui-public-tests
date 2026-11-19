import {getDongjakAdminFeatures,labelPointForFeature} from './admin-dong-layer.js';
import {setMobileSheetExpanded} from './v889-mobile-sheet-motion.js';

const KEY='dj17-kakao-ui-v1';
export function installMobileFollowup({app,map,maplibregl,doc=document,win=window}){
 if(!win.matchMedia('(max-width:699px)').matches)return;
 let raf=0,port=null,pilot=false,regions=null,statusTimer=0;
 const $=id=>doc.getElementById(id);
 const schedule=()=>{if(!raf)raf=win.requestAnimationFrame(()=>{raf=0;sync()})};
 function edges(){
  if(!port)return;
  const l=port.scrollLeft>2,r=port.scrollWidth-port.clientWidth-port.scrollLeft>2;
  const mask=l||r?'linear-gradient(to right,'+(l?'transparent 0px, black 16px':'black 0px')+','+(r?'black calc(100% - 16px), transparent 100%':'black 100%')+')':'none';
  port.style.setProperty('--dj17-edge-mask',mask);
 }
 const resize=new ResizeObserver(edges);
 function moveMore(){
  const home=doc.querySelector('#mine-panel .dj834-my-home');
  const body=doc.querySelector('#dj-mobile-utilities .dj-mobile-utilities-body');
  if(!home)return;
  let root=home.querySelector('.dj17-more-root');
  if(!root){root=doc.createElement('details');root.className='dj17-more-root';const s=doc.createElement('summary');s.textContent='지도 기능 · 개인 설정';root.append(s);home.append(root)}
  if(body&&body.parentElement!==root){root.append(body)}
  const target=root.querySelector('.dj-mobile-utilities-body');
  if(!target)return;
  const extra=$('dj832-more-features');if(extra&&!target.contains(extra))target.append(extra);
  for(const old of target.querySelectorAll('.dj17-feature-details'))if(!old.querySelector('.dj833-feature-group'))old.remove();
  for(const group of target.querySelectorAll('.dj833-feature-group')){
   if(group.parentElement?.classList.contains('dj17-feature-details'))continue;
   const section=doc.createElement('details');section.className='dj17-feature-details';
   const s=doc.createElement('summary');s.textContent=group.querySelector('.dj832-more-group-label')?.textContent||'추가 기능';
   group.before(section);section.append(s,group);
  }

 }
 function expandSafety(){
  const panel=$('map-safety-controls'),head=panel?.querySelector('.map-safety-head');if(!head||head.querySelector('.dj17-expand'))return;
  const grip=doc.createElement('button');grip.type='button';grip.className='dj17-expand';grip.setAttribute('aria-label','보행안전 창 확장 또는 축소');grip.setAttribute('aria-expanded','false');
  head.prepend(grip);let start=null,swiped=false;
  const apply=next=>{setMobileSheetExpanded(panel,next,doc,win);grip.setAttribute('aria-expanded',String(next))};
  grip.addEventListener('pointerdown',e=>{start=e.clientY;swiped=false;grip.setPointerCapture?.(e.pointerId)});
  grip.addEventListener('pointerup',e=>{if(start===null)return;const dy=e.clientY-start;start=null;if(Math.abs(dy)>30){swiped=true;apply(dy<0)}});
  grip.addEventListener('click',()=>{if(swiped){swiped=false;return}apply(!panel.classList.contains('dj871-sheet-expanded'))});
  const notice=doc.createElement('div');notice.className='dj17-pilot-notice';notice.textContent='상도1동 보행안전 시범구역 · 다른 행정동은 추후 공개될 예정입니다.';head.after(notice);
 }
 function message(name){let n=$('dj17-pilot-status');if(!n){n=doc.createElement('div');n.id='dj17-pilot-status';n.className='dj17-pilot-status';n.setAttribute('role','status');app.append(n)}n.textContent=name+'은 추후 공개될 예정입니다.';n.hidden=false;win.clearTimeout(statusTimer);statusTimer=win.setTimeout(()=>n.hidden=true,2600)}
 const source='dj17-pilot-dongs',fill='dj17-pilot-fill',line='dj17-pilot-line',lockSource='dj17-pilot-lock-points',lockLayer='dj17-pilot-locks',lockImage='dj17-pilot-lock-image';
 function toggleLayers(visible){
  for(const id of [fill,line,lockLayer])if(map.getLayer(id)){const value=visible?'visible':'none';if(map.getLayoutProperty(id,'visibility')!==value)map.setLayoutProperty(id,'visibility',value)}
  app.dataset.djPilotActive=String(visible&&!!map.getLayer(lockLayer));
  app.dataset.djPilotLockCount=visible&&map.getLayer(lockLayer)?String(regions?.filter(f=>f.properties.dong_name!=='상도1동'&&labelPointForFeature(f)).length||0):'0';
 }
 function addLockImage(){
  if(map.hasImage(lockImage))return;
  const canvas=doc.createElement('canvas');canvas.width=48;canvas.height=48;const ctx=canvas.getContext('2d');if(!ctx)return;
  ctx.lineWidth=6;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.strokeStyle='rgba(255,255,255,.94)';ctx.beginPath();ctx.roundRect(11,21,26,20,4);ctx.stroke();ctx.beginPath();ctx.moveTo(16,21);ctx.lineTo(16,15);ctx.arc(24,15,8,Math.PI,0);ctx.lineTo(32,21);ctx.stroke();
  ctx.lineWidth=3;ctx.strokeStyle='#344a42';ctx.beginPath();ctx.roundRect(11,21,26,20,4);ctx.stroke();ctx.beginPath();ctx.moveTo(16,21);ctx.lineTo(16,15);ctx.arc(24,15,8,Math.PI,0);ctx.lineTo(32,21);ctx.stroke();ctx.beginPath();ctx.moveTo(24,29);ctx.lineTo(24,33);ctx.stroke();
  map.addImage(lockImage,ctx.getImageData(0,0,48,48),{pixelRatio:2});
 }
 function paint(){
  if(!pilot){toggleLayers(false);return}
  if(!regions)return;
  if(map.getLayer(fill)&&map.getLayer(line)&&map.getLayer(lockLayer)){toggleLayers(true);return}
  if(!map.isStyleLoaded())return;
  const data={type:'FeatureCollection',features:regions};const points={type:'FeatureCollection',features:regions.flatMap(f=>{const name=f.properties.dong_name,p=labelPointForFeature(f);return name!=='상도1동'&&p?[{type:'Feature',properties:{dong_name:name},geometry:{type:'Point',coordinates:p}}]:[]})};
  if(!map.getSource(source))map.addSource(source,{type:'geojson',data});
  if(!map.getSource(lockSource))map.addSource(lockSource,{type:'geojson',data:points});
  if(!map.getLayer(fill))map.addLayer({id:fill,type:'fill',source,filter:['!=',['get','dong_name'],'상도1동'],paint:{'fill-color':'#151c1a','fill-opacity':.23}});
  if(!map.getLayer(line))map.addLayer({id:line,type:'line',source,paint:{'line-color':'#768d83','line-width':1.3,'line-opacity':.85}});
  addLockImage();
  if(!map.getLayer(lockLayer))map.addLayer({id:lockLayer,type:'symbol',source:lockSource,layout:{'icon-image':lockImage,'icon-size':1,'icon-allow-overlap':true,'icon-ignore-placement':true,'icon-anchor':'center','icon-pitch-alignment':'viewport','icon-rotation-alignment':'viewport'}});
  toggleLayers(true);
 }
 async function showPilot(){pilot=true;try{regions??=await getDongjakAdminFeatures();if(pilot)paint()}catch(error){console.warn('[pilot boundary]',error)}}
 function hidePilot(){pilot=false;toggleLayers(false);const status=$('dj17-pilot-status');if(status)status.hidden=true}
 map.on('click',lockLayer,e=>{if(pilot){const name=e.features?.[0]?.properties?.dong_name;if(name)message(name)}});
 map.on('style.load',()=>{if(pilot)paint();else toggleLayers(false)});
 map.on('idle',()=>{if(pilot&&regions&&(!map.getLayer(lockLayer)||app.dataset.djPilotActive!=='true'))paint()});
 function sync(){
  const current=$('dj831-scrollport');if(current!==port){if(port){port.removeEventListener('scroll',edges);resize.unobserve(port)}port=current;if(port){port.addEventListener('scroll',edges,{passive:true});resize.observe(port)}}
  edges();moveMore();expandSafety();
  // Native controls stay in their original form and preserve selected map layers.
  // Split fixed headers from scrolling content only when first presented,
  // after legacy workbench initialization has bound its existing controls.
  const safety=$('map-safety-controls'),head=safety?.querySelector('.map-safety-head');
  if(app.classList.contains('map-safety-open')&&head&&!safety.querySelector('.djNext-safety-scroll')){
   const scroll=doc.createElement('div');scroll.className='djNext-safety-scroll';
   for(const child of [...safety.children])if(child!==head)scroll.append(child);
   safety.append(scroll);
  }
  const form=$('community-form'),formHead=form?.querySelector('.community-form-top');
  if(form&&!form.hidden&&formHead&&!form.querySelector('.djNext-form-scroll')){
   const scroll=doc.createElement('div');scroll.className='djNext-form-scroll';
   for(const child of [...form.childNodes])if(child!==formHead)scroll.append(child);
   form.append(scroll);
  }
  const utilities=doc.querySelector('#mine-panel .dj17-more-root .dj-mobile-utilities-body');
  const quick=utilities?.querySelector('.dj840-more-quick-actions'),tour=utilities?.querySelector('.dj860-more-launch');
  if(quick&&tour&&tour.parentElement!==quick)quick.append(tour);
  const status=utilities?.querySelector('.dj834-shortcut-status');if(status&&status.textContent!=='지도 표시와 상단 바로가기는 레이어 버튼에서 설정할 수 있습니다.')status.textContent='지도 표시와 상단 바로가기는 레이어 버튼에서 설정할 수 있습니다.';
  if(app.classList.contains('map-safety-open')&&!pilot)void showPilot();
  if(!app.classList.contains('map-safety-open')&&pilot)hidePilot();
  if(!app.classList.contains('map-safety-open')){const panel=$('map-safety-controls');if(panel?.classList.contains('dj871-sheet-expanded')){panel.classList.remove('dj871-sheet-expanded');panel.querySelector('.dj17-expand')?.setAttribute('aria-expanded','false')}}
 }
 const observer=new MutationObserver(schedule);observer.observe(app,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});schedule();
 doc.addEventListener('click',e=>{if(e.target.closest?.('#bottom-nav [data-tab="map"]')){hidePilot();delete app.dataset.djUserTipDismissed}},true);
 function snapshot(){
  try{const c=map.getCenter();const detail=doc.querySelector('#mine-panel .dj834-my-detail');const value={time:Date.now(),tab:app.dataset.tab||'mine',profile:!!detail&&!detail.hidden,center:[c.lng,c.lat],zoom:map.getZoom(),pitch:map.getPitch(),bearing:map.getBearing(),phase:'pending'};win.sessionStorage.setItem(KEY,JSON.stringify(value))}catch{}
 }
 win.addEventListener('dj:mobile-kakao-start',snapshot);
 win.addEventListener('dj:mobile-kakao-completed',()=>{try{const s=JSON.parse(win.sessionStorage.getItem(KEY)||'null');if(!s||s.phase!=='pending')return;s.phase='reload';win.sessionStorage.setItem(KEY,JSON.stringify(s));win.location.reload()}catch{}});
 win.addEventListener('dj:mobile-kakao-cancelled',()=>{try{win.sessionStorage.removeItem(KEY)}catch{}});
 function restore(){try{const s=JSON.parse(win.sessionStorage.getItem(KEY)||'null');if(!s||Date.now()-s.time>600000)return;win.sessionStorage.removeItem(KEY);map.jumpTo({center:s.center,zoom:s.zoom,pitch:s.pitch,bearing:s.bearing});const tab=doc.querySelector('#bottom-nav [data-tab="'+s.tab+'"]');tab?.click();if(s.profile&&s.tab==='mine')win.setTimeout(()=>doc.querySelector('#mine-panel [data-dj834-action="profile"]')?.click(),250)}catch{}}
 map.once('load',()=>{const state=()=>app.dataset.authState||app.dataset.djAuthState||'';let s;try{s=JSON.parse(win.sessionStorage.getItem(KEY)||'null')}catch{}if(s?.phase==='reload'){win.setTimeout(restore,300);return}if(!s)return;const authObserver=new MutationObserver(()=>{if(/signed-in|authenticated/.test(state())){authObserver.disconnect();restore()}});authObserver.observe(app,{attributes:true});if(/signed-in|authenticated/.test(state())){authObserver.disconnect();restore()}win.setTimeout(()=>authObserver.disconnect(),60000)});
}
