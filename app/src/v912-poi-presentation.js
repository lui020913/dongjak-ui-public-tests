import {normalizeFacilityCategory} from './facility-display-names.js';
/* Facility display is separate from source data, search and safety-analysis layers. */
export const POI_GROUPS=Object.freeze([['safety','안전시설','Safety'],['public','공공시설','Public'],['convenience','생활편의','Convenience'],['food','음식점','Food'],['cafe','카페','Café']]);
export const DEFAULT_POI_GROUPS=Object.freeze(['safety','public']);
const TYPES={'약국':['safety','pharmacy'],'동물약국':['convenience','pharmacy'],'병원':['safety','hospital'],'의원':['safety','hospital'],'응급실':['safety','emergency'],'AED':['safety','emergency'],'경찰서':['safety','police'],'소방서':['safety','fire'],'공공기관':['public','civic'],'주민센터':['public','civic'],'학교':['public','school'],'교육시설':['public','school'],'대학교':['public','school'],'유치원':['public','school'],'어린이집':['public','school'],'도서관':['public','library'],'복지시설':['public','civic'],'체육시설':['public','sports'],'공원':['public','park'],'편의점':['convenience','store'],'마트':['convenience','store'],'은행':['convenience','bank'],'화장실':['convenience','toilet'],'관광명소':['convenience','park'],'음식점':['food','food'],'휴게음식점':['food','food'],'제과점':['food','food'],'카페':['cafe','cafe']};
const GLYPHS={
 bus:['#28699e','M5 4h14v14H5Z M5 11h14 M8 18v3M16 18v3 M8 15h1M15 15h1'],
 subway:['#5f5496','M6 4h12v14H6Z M6 10h12 M8 18l-2 3M16 18l2 3 M9 14h1M14 14h1'],
 pharmacy:['#18856c','M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6Z'],
 hospital:['#b94c4c','M5 21V4h14v17M3 21h18M9 8h6M12 5v6M9 15h6v6'],
 emergency:['#b43f4c','M3 12h4l3-6 4 12 3-6h4'],
 police:['#456998','M12 3l8 3v6c0 5-4 8-8 10-4-2-8-5-8-10V6Z M8 12l3 3 5-6'],
 fire:['#c45b37','M12 3c2 5 6 7 6 12a6 6 0 0 1-12 0c0-4 3-7 6-12Z M12 12c2 3 3 4 3 6'],
 civic:['#527b70','M3 9l9-5 9 5M4 10h16M6 11v8M12 11v8M18 11v8M3 21h18'],
 school:['#527b70','M4 5c4-2 6 0 8 2 2-2 4-4 8-2v14c-4-2-6 0-8 2-2-2-4-4-8-2Z M12 7v14'],
 library:['#527b70','M5 4h14v16H5Z M9 4v16M12 9h4M12 13h4'],
 sports:['#527b70','M3 9v6M6 7v10M6 12h12M18 7v10M21 9v6'],
 park:['#527b70','M12 3l-6 9h3l-5 6h16l-5-6h3Z M12 18v3'],
 store:['#758451','M4 10l2-6h12l2 6M4 10h16M6 10v11h12V10M10 21v-6h4v6'],
 bank:['#758451','M3 9l9-5 9 5M5 11h14M7 11v8M17 11v8M3 21h18'],
 toilet:['#527b70','M8 8v13M16 8v13M4 13h8M12 13h8M8 3v2M16 3v2'],
 food:['#ad734c','M5 3v7M8 3v7M11 3v7M5 10q3 4 6 0M8 12v9M18 3v18M15 9q0-5 3-6'],
 cafe:['#926d4f','M4 8h13v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z M17 9h2a3 3 0 0 1 0 6h-2M3 22h17M8 3v2M12 3v2'],
 other:['#758451','M12 4v14M8 8h8M8 14h8']
};
export function facilityPresentation(category){const [group,icon]=TYPES[normalizeFacilityCategory(category)]||['convenience','other'];return {group,icon,priority:group==='safety'?0:group==='public'?10:20};}
export function facilitySearchGlyph(category,kind){
 const aliases={'대학교':'학교','유치원':'학교','의료시설':'병원','치과':'병원','정원':'공원','주민시설':'주민센터','제과점':'음식점','시장':'마트','상점':'편의점','ATM':'은행'};
 const type=kind==='bus'||kind==='subway'?kind:facilityPresentation(aliases[category]||category).icon;
 const [color,path]=GLYPHS[type]||GLYPHS.other;return {type,color,path};
}
export const iconName=kind=>'dj912-poi-'+kind;
export function registerFacilityIcons(map){
 if(typeof document==='undefined')return;
 for(const [kind,[color,path]] of Object.entries(GLYPHS)){
  if(map.hasImage?.(iconName(kind)))continue;
  const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d');if(!ctx)continue;
  const box=(x,y,w,r)=>{ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,w,r);else ctx.rect(x,y,w,w);ctx.fill();};
  ctx.fillStyle='#fff';box(3,3,58,15);ctx.fillStyle=color;box(6,6,52,12);
  ctx.save();ctx.translate(8,8);ctx.scale(2,2);ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='white';ctx.lineWidth=1.85;ctx.stroke(new Path2D(path));ctx.restore();
  map.addImage(iconName(kind),{width:64,height:64,data:ctx.getImageData(0,0,64,64).data},{pixelRatio:2});
 }
}
export const visibleFacilityFilter=groups=>['in',['get','group'],['literal',Array.from(groups)]];
const POI_BUTTON_PATHS=Object.freeze({
 default:'M4 5h7v7H4z M13 5h7v7h-7z M4 14h7v6H4z M13 14h7v6h-7z',
 safety:'M12 2 20 6v6c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6z M9 12l2 2 4-4',
 public:'M3 9l9-5 9 5 M5 10h14 M7 10v9 M12 10v9 M17 10v9 M3 21h18',
 convenience:'M4 10h16v10H4z M3 10l2-6h14l2 6 M9 20v-6h6v6',
 food:'M5 3v7 M8 3v7 M11 3v7 M5 10q3 4 6 0 M8 12v9 M18 3v18 M15 9q0-5 3-6',
 cafe:'M4 8h13v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z M17 9h2a3 3 0 0 1 0 6h-2 M3 22h17 M8 3v2 M12 3v2',
 transit:'M6 18V5a6 6 0 0 1 12 0v13 M4 18h16 M7 21l2-3 M17 21l-2-3 M8 8h8'
});
const MOBILE_TOOLBAR_MEDIA='(min-width: 0px)';
function setPoiButtonLabel(button,label){
 if(button.dataset.dj912Toolbar==='true'){
  button.dataset.dj832Label=label;button.setAttribute('aria-label',label);button.title=label;
 }else{
  button.textContent=label;button.setAttribute('aria-label',label);button.title=label;
 }
}
function decoratePoiToolbarButton(button,label){
 const id=button.dataset.poiGroup||'default';
 button.classList.add('dj-v794-tool','dj832-native','dj912-poi-toolbar-button');
 button.dataset.dj912Toolbar='true';button.dataset.dj832Label=label;
 button.setAttribute('aria-label',label);button.setAttribute('aria-expanded','false');button.title=label;
 const path=POI_BUTTON_PATHS[id]||POI_BUTTON_PATHS.default;
 if(!button.querySelector('.dj912-poi-icon')){
  button.innerHTML='<span class="dj-v794-icon dj912-poi-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+path+'"/></svg></span>';
 }
}
function restorePoiCategoryButton(button,label){
 button.classList.remove('dj-v794-tool','dj832-native','dj832-expanded','dj912-poi-toolbar-button');
 delete button.dataset.dj912Toolbar;delete button.dataset.dj832Label;
 button.removeAttribute('aria-expanded');button.style.removeProperty('--dj833-expanded-width');
 button.textContent=label;button.setAttribute('aria-label',label);button.title=label;
}
function installMobilePoiToolbarIntegration(app,shell,scroll,buttons,right,labelFor){
 const win=app.ownerDocument?.defaultView||globalThis.window;
 if(!win?.matchMedia||!win.MutationObserver)return ()=>{};
 const media=win.matchMedia(MOBILE_TOOLBAR_MEDIA);
 let frame=0,disposed=false;
 function syncMode(){
  if(disposed)return;
  const rail=app.querySelector('#dj-v794-toolbar > #dj831-scrollport');
  const integrated=Boolean(media.matches&&rail);
  if(integrated){
   shell.dataset.dj912Integrated='true';right.hidden=true;
   for(const button of buttons){
    const label=labelFor(button);
    decoratePoiToolbarButton(button,label);
    if(button.parentElement!==rail)rail.appendChild(button);
   }
   rail.dispatchEvent(new win.Event('scroll'));
  }else{
   shell.removeAttribute('data-dj912-integrated');
   for(const button of buttons){
    const label=labelFor(button);
    restorePoiCategoryButton(button,label);
    if(button.parentElement!==scroll)scroll.appendChild(button);
   }
   right.hidden=scroll.scrollWidth-scroll.clientWidth<3;
  }
 }
 function schedule(){
  if(frame||disposed)return;
  if(typeof win.requestAnimationFrame==='function')frame=win.requestAnimationFrame(()=>{frame=0;syncMode();});
  else Promise.resolve().then(syncMode);
 }
 const relevant=node=>node?.nodeType===1&&(
  node.id==='dj-v794-toolbar'||node.id==='dj831-scrollport'||node.id==='dj912-poi-categories'||
  Boolean(node.querySelector?.('#dj831-scrollport'))
 );
 const observer=new win.MutationObserver(records=>{
  if(records.some(record=>[...record.addedNodes,...record.removedNodes].some(relevant)))schedule();
 });
 observer.observe(app,{childList:true,subtree:true});
 media.addEventListener?.('change',schedule);
 syncMode();
 return ()=>{
  disposed=true;observer.disconnect();media.removeEventListener?.('change',schedule);
  if(frame&&typeof win.cancelAnimationFrame==='function')win.cancelAnimationFrame(frame);
  shell.removeAttribute('data-dj912-integrated');
  for(const button of buttons){
   restorePoiCategoryButton(button,labelFor(button));
   if(button.parentElement!==scroll)scroll.appendChild(button);
  }
 };
}
export function installFacilityCategories(app,onChange){
 const groups=new Set(DEFAULT_POI_GROUPS);if(!app||typeof document==='undefined')return groups;
 if(app.querySelector('#dj912-poi-categories'))return new Set((app.dataset.dj912PoiGroups??DEFAULT_POI_GROUPS.join(',')).split(',').filter(Boolean));
 const shell=document.createElement('div');shell.id='dj912-poi-categories';shell.setAttribute('role','group');shell.setAttribute('aria-label','지도 시설 표시');
 const scroll=document.createElement('div');scroll.className='dj912-poi-scroll';scroll.setAttribute('aria-label','시설 및 생활편의 카테고리');shell.append(scroll);
 const reset=document.createElement('button');reset.type='button';reset.dataset.poiGroup='default';scroll.append(reset);
 const categoryButtons=POI_GROUPS.map(([id,ko,en])=>{
  const button=document.createElement('button');button.type='button';button.dataset.poiGroup=id;button.dataset.ko=ko;button.dataset.en=en;scroll.append(button);return button;
 });
 const traffic=document.createElement('button');traffic.type='button';traffic.dataset.poiGroup='transit';scroll.insertBefore(traffic,scroll.querySelector('[data-poi-group="convenience"]'));
 const buttons=[reset,...categoryButtons.slice(0,2),traffic,...categoryButtons.slice(2)];
 const buttonSet=new Set(buttons);
 const transitButtons=()=>Array.from(app.querySelectorAll('[data-base-layer="metro"],[data-base-layer="bus"]'));
 const labelFor=button=>{
  const en=app.dataset.djLanguage==='en',id=button.dataset.poiGroup;
  if(id==='default')return en?'Reset layers':'기본 표시';
  if(id==='transit')return en?'Transit':'교통';
  const group=POI_GROUPS.find(item=>item[0]===id);
  return group?(en?group[2]:group[1]):'';
 };
 const syncTransit=()=>{
  const current=transitButtons();
  traffic.setAttribute('aria-pressed',String(current.length>0&&current.every(n=>n.getAttribute('aria-pressed')==='true')));
  setPoiButtonLabel(traffic,labelFor(traffic));
 };
 const right=document.createElement('button');right.type='button';right.className='dj912-poi-more';right.textContent='›';right.setAttribute('aria-label','시설 카테고리 더 보기');shell.append(right);
 const transitNote=document.createElement('span');transitNote.className='sr-only';transitNote.textContent='버스와 지하철은 기존 교통 지도 도구에서 제어합니다.';shell.append(transitNote);
 function sync(){
  setPoiButtonLabel(reset,labelFor(reset));reset.setAttribute('aria-pressed','false');
  for(const button of categoryButtons){
   const id=button.dataset.poiGroup;
   setPoiButtonLabel(button,labelFor(button));button.setAttribute('aria-pressed',String(groups.has(id)));
  }
  syncTransit();app.dataset.dj912PoiGroups=Array.from(groups).join(',');
  right.hidden=shell.dataset.dj912Integrated==='true'||scroll.scrollWidth-scroll.clientWidth<3;
 }
 app.addEventListener('click',event=>{
  const button=event.target?.closest?.('button[data-poi-group]');
  if(!button||!buttonSet.has(button))return;
  const id=button.dataset.poiGroup;
  if(id==='transit'){
   const current=transitButtons(),show=current.some(n=>n.getAttribute('aria-pressed')!=='true');
   for(const node of current)if((node.getAttribute('aria-pressed')==='true')!==show)node.click();
   syncTransit();return;
  }
  if(id==='default'){
   groups.clear();DEFAULT_POI_GROUPS.forEach(group=>groups.add(group));
   for(const node of transitButtons())if(node.getAttribute('aria-pressed')==='true')node.click();
  }else if(groups.has(id))groups.delete(id);else groups.add(id);
  sync();onChange?.(groups);app.dispatchEvent(new CustomEvent('dongjak:poi-groups',{detail:{groups:[...groups]}}));
 });
 right.addEventListener('click',()=>scroll.scrollBy({left:scroll.scrollLeft+scroll.clientWidth>=scroll.scrollWidth-4?-scroll.scrollWidth:Math.max(100,scroll.clientWidth*.7),behavior:'smooth'}));
 app.append(shell);
 for(const node of transitButtons())new MutationObserver(syncTransit).observe(node,{attributes:true,attributeFilter:['aria-pressed']});
 if(typeof ResizeObserver==='function')new ResizeObserver(sync).observe(scroll);
 new MutationObserver(sync).observe(app,{attributes:true,attributeFilter:['data-dj-language']});
 installMobilePoiToolbarIntegration(app,shell,scroll,buttons,right,labelFor);
 sync();return groups;
}
