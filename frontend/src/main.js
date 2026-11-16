import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles.css';

// PUBLIC UI WORKBENCH: no credentials, authentication, transport endpoints,
// inferred risk scores, or private-source imports are allowed in this package.
const root = document.getElementById('app');
const icons = {
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>',
  route:'<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h6a4 4 0 0 0 0-8h-4a4 4 0 0 1 0-8h6"/>',
  users:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 11a3 3 0 1 0 0-6M18 16a5 5 0 0 1 3 5"/>',
  news:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  layers:'<path d="m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5"/>',
  moon:'<path d="M20.5 14.4A8.5 8.5 0 0 1 9.6 3.5 8.5 8.5 0 1 0 20.5 14.4z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  settings:'<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="2" fill="currentColor" stroke="none"/>',
  locate:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  minus:'<path d="M5 12h14"/>',
  close:'<path d="M5 5l14 14M19 5 5 19"/>',
  chevron:'<path d="m6 9 6 6 6-6"/>',
  shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7h.01"/>'
};
const icon = (name) => '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'+(icons[name]||icons.info)+'</svg>';
const navigation = [
  {id:'map',label:'안전지도',icon:'map'},
  {id:'route',label:'길찾기',icon:'route'},
  {id:'community',label:'커뮤니티',icon:'users'},
  {id:'news',label:'동작소식',icon:'news'},
  {id:'account',label:'내 기록',icon:'user'}
];
const navButton = (item,kind) => '<button type="button" class="'+kind+'-item" data-panel="'+item.id+'" aria-label="'+item.label+'" aria-pressed="'+(item.id==='map'?'true':'false')+'">'+icon(item.icon)+'<span>'+item.label+'</span></button>';
root.innerHTML = [
  '<div class="app-shell theme-light" id="app-shell">',
    '<div id="map" aria-label="동작구 배경지도"></div>',
    '<div class="map-glow" aria-hidden="true"></div>',
    '<header class="topbar">',
      '<div class="brand"><span class="brand-mark">'+icon('shield')+'</span><div class="brand-copy"><strong>동작하는 안전지도</strong><span>공개 프런트엔드 · UI 작업실</span></div></div>',
      '<form id="search-form" class="search-field" role="search"><label for="place-query" class="sr-only">장소 검색</label>'+icon('search')+'<input id="place-query" autocomplete="off" placeholder="동작구 내 장소 검색" /><button type="submit" aria-label="검색 실행">'+icon('search')+'</button></form>',
      '<div class="top-actions"><span class="preview-label">UI PREVIEW</span><button type="button" class="circle-btn" data-action="theme" aria-label="테마 전환">'+icon('moon')+'</button></div>',
    '</header>',
    '<nav class="side-rail" aria-label="주 메뉴">'+navigation.map(item=>navButton(item,'rail')).join('')+'</nav>',
    '<div class="status-pill">'+icon('info')+'<span>UI 시연용 · 안전정보 미연결</span></div>',
    '<aside class="workspace" id="workspace" aria-label="선택한 메뉴" hidden><div class="workspace-head"><div><small>동작하는 안전지도</small><h2 id="workspace-title"></h2></div><button class="circle-btn panel-close" data-action="close" aria-label="패널 닫기">'+icon('close')+'</button></div><div id="workspace-content" class="workspace-content"></div></aside>',
    '<div class="tool-stack" aria-label="지도 도구">',
      '<button type="button" class="tool-btn" data-action="tools" aria-label="지도 설정">'+icon('layers')+'</button>',
      '<button type="button" class="tool-btn" data-action="night" aria-label="야간 시야">'+icon('moon')+'</button>',
      '<span class="tool-separator"></span>',
      '<button type="button" class="tool-btn" data-action="zoom-in" aria-label="확대">'+icon('plus')+'</button>',
      '<button type="button" class="tool-btn" data-action="zoom-out" aria-label="축소">'+icon('minus')+'</button>',
      '<button type="button" class="tool-btn" data-action="locate" aria-label="현재 위치">'+icon('locate')+'</button>',
    '</div>',
    '<section class="bottom-sheet" id="sheet" data-stage="closed" aria-label="메뉴 상세" aria-expanded="false">',
      '<button type="button" class="sheet-grip-button" id="sheet-grip" aria-label="상세창 단계 변경" data-action="sheet-step"><span class="sheet-grip"></span></button>',
      '<div class="sheet-head"><div><small>동작하는 안전지도</small><h2 id="sheet-title"></h2></div><button type="button" class="circle-btn panel-close" data-action="close" aria-label="상세창 닫기">'+icon('close')+'</button></div>',
      '<div class="sheet-content" id="sheet-content"></div>',
    '</section>',
    '<nav class="bottom-nav" aria-label="하단 메뉴">'+navigation.map(item=>navButton(item,'bottom')).join('')+'</nav>',
    '<div class="browser-tip" id="browser-tip" hidden><span>홈 화면에 추가하면 웹앱처럼 이용할 수 있습니다.</span><button type="button" data-action="dismiss-tip" aria-label="안내 닫기">'+icon('close')+'</button></div>',
    '<div class="toast" id="toast" role="status" aria-live="polite"></div>',
  '</div>'
].join('');

const shell = document.getElementById('app-shell');
const sheet = document.getElementById('sheet');
const workspace = document.getElementById('workspace');
const mobileView = () => window.matchMedia('(max-width: 699px)').matches;
const panelNames = {route:'길찾기',community:'커뮤니티',news:'동작소식',account:'내 기록',tools:'지도 설정'};
const locations = [
  {label:'노량진역',center:[126.9425,37.5133]},
  {label:'상도역',center:[126.9478,37.5028]},
  {label:'숭실대입구역',center:[126.9535,37.4961]}
];
const panels = {
  route: '<p class="panel-intro">보행 경로 비교 화면을 구성하는 공간입니다. 실제 경로 탐색은 아직 연결되지 않았습니다.</p><label class="field-label">출발지<input placeholder="출발지를 입력하세요" disabled/></label><label class="field-label">도착지<input placeholder="도착지를 입력하세요" disabled/></label><button type="button" class="primary-btn" data-action="not-connected">경로 탐색 준비 중</button><p class="helper">경로 정보나 안전등급을 임의로 생성하지 않습니다.</p>',
  community: '<p class="panel-intro">보행 경험을 공유하는 커뮤니티 UI 영역입니다.</p><div class="empty-state">'+icon('users')+'<strong>게시글을 표시하지 않습니다</strong><span>로그인·게시물 API 연결 전의 공개 UI 시연용 화면입니다.</span></div>',
  news: '<p class="panel-intro">동작구 소식과 공지사항을 확인하는 화면입니다.</p><div class="empty-state">'+icon('news')+'<strong>새 소식 연결 대기</strong><span>검증되지 않은 소식을 임의로 표시하지 않습니다.</span></div>',
  account: '<p class="panel-intro">나의 이동 기록과 즐겨찾기 레이아웃을 점검합니다.</p><div class="empty-state">'+icon('user')+'<strong>로그인 비활성화</strong><span>인증정보와 개인 기록은 공개 UI 작업실에서 처리하지 않습니다.</span></div>',
  tools: '<p class="panel-intro">지도 앱의 시각적 요소를 점검할 수 있습니다.</p><div class="setting-row"><span>색상 테마</span><button type="button" class="subtle-btn" data-action="theme">라이트 / 다크</button></div><div class="setting-row"><span>야간 시야</span><button type="button" class="subtle-btn" data-action="night">전환</button></div><div class="setting-row"><span>글자 크기</span><div class="font-actions"><button type="button" data-action="font-down" aria-label="글자 작게">가−</button><button type="button" data-action="font-up" aria-label="글자 크게">가＋</button></div></div><p class="helper">실제 안전시설·경사도·교통정보는 연결하지 않았습니다.</p>'
};
let selectedPanel = 'map';
let sheetStage = 'closed';
let fontScale = 1;
let toastTimer;
let pointerStart = null;
let map;
let mapReady = false;
const updateActiveNav = () => document.querySelectorAll('[data-panel]').forEach(btn => btn.setAttribute('aria-pressed',String(btn.dataset.panel===selectedPanel)));
function showToast(message) {
  const el=document.getElementById('toast');
  el.textContent=message;
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove('is-visible'),3500);
}
function setSheet(stage){
  sheetStage=stage;
  sheet.dataset.stage=stage;
  sheet.setAttribute('aria-expanded',String(stage!=='closed'));
  document.getElementById('sheet-grip').setAttribute('aria-label',stage==='half'?'상세창 전체 펼치기':stage==='full'?'상세창 절반으로 줄이기':'상세창 펼치기');
}
function closePanel(){
  workspace.hidden=true;
  setSheet('closed');
  selectedPanel='map';
  updateActiveNav();
}
function openPanel(id){
  if(id==='map') { closePanel(); return; }
  if(!panels[id]) return;
  selectedPanel=id;
  updateActiveNav();
  const title=panelNames[id]||'지도 설정';
  document.getElementById('workspace-title').textContent=title;
  document.getElementById('workspace-content').innerHTML=panels[id];
  document.getElementById('sheet-title').textContent=title;
  document.getElementById('sheet-content').innerHTML=panels[id];
  if(mobileView()){
    workspace.hidden=true;
    setSheet('half');
  }else{
    setSheet('closed');
    workspace.hidden=false;
  }
}
function toggleTheme(){
  const dark=shell.classList.toggle('theme-dark');
  shell.classList.toggle('theme-light',!dark);
  const btn=document.querySelector('.top-actions [data-action="theme"]');
  btn.innerHTML=icon(dark?'sun':'moon');
  document.querySelector('meta[name="theme-color"]').content=dark?'#172b24':'#edf4ef';
}
function toggleNight(){
  const night=shell.classList.toggle('night-vision');
  document.querySelectorAll('[data-action="night"]').forEach(b=>b.setAttribute('aria-pressed',String(night)));
  showToast(night?'야간 시야 미리보기를 적용했습니다.':'기본 지도 밝기로 돌아왔습니다.');
}
function changeFont(delta){
  fontScale=Math.max(.9,Math.min(1.2,Math.round((fontScale+delta)*100)/100));
  shell.style.setProperty('--font-multiplier',fontScale);
  showToast('글자 배율 '+Math.round(fontScale*100)+'%');
}
function searchPlace(){
  const input=document.getElementById('place-query');
  const value=input.value.trim();
  if(!value){input.focus();return;}
  const found=locations.find(p=>p.label.includes(value)||value.includes(p.label));
  if(!found){showToast('UI 미리보기에서는 노량진역·상도역·숭실대입구역만 검색할 수 있습니다.');return;}
  if(mapReady) map.flyTo({center:found.center,zoom:15,essential:true});
  closePanel();
  showToast(found.label+' 주변 지도로 이동했습니다.');
  input.blur();
}
function onAction(name, target){
  if(name==='close'){closePanel();return;}
  if(name==='theme'){toggleTheme();return;}
  if(name==='night'){toggleNight();return;}
  if(name==='tools'){openPanel('tools');return;}
  if(name==='sheet-step'){setSheet(sheetStage==='half'?'full':sheetStage==='full'?'half':'half');return;}
  if(name==='font-up'){changeFont(.05);return;}
  if(name==='font-down'){changeFont(-.05);return;}
  if(name==='zoom-in'&&mapReady){map.zoomIn();return;}
  if(name==='zoom-out'&&mapReady){map.zoomOut();return;}
  if(name==='locate'){
    if(!navigator.geolocation){showToast('이 브라우저에서는 위치 기능을 사용할 수 없습니다.');return;}
    navigator.geolocation.getCurrentPosition(
      pos=>{if(mapReady)map.flyTo({center:[pos.coords.longitude,pos.coords.latitude],zoom:15});showToast('지도 중심을 현재 위치로 이동했습니다.');},
      ()=>showToast('위치 권한이 없거나 현재 위치를 확인할 수 없습니다.'),
      {enableHighAccuracy:false,timeout:7000,maximumAge:60000}
    );
    return;
  }
  if(name==='dismiss-tip'){document.getElementById('browser-tip').hidden=true;return;}
  if(name==='not-connected'){showToast('공개 UI 시연용 화면입니다. 실제 기능은 아직 연결되지 않았습니다.');return;}
  if(target) target.blur();
}
document.addEventListener('click',event=>{
  const button=event.target.closest('button');
  if(!button)return;
  if(button.dataset.panel){openPanel(button.dataset.panel);return;}
  if(button.dataset.action)onAction(button.dataset.action,button);
});
document.getElementById('search-form').addEventListener('submit',event=>{event.preventDefault();searchPlace();});
sheet.addEventListener('pointerdown',event=>{
  if(!event.target.closest('.sheet-grip-button,.sheet-head'))return;
  pointerStart={y:event.clientY,id:event.pointerId};
});
sheet.addEventListener('pointerup',event=>{
  if(!pointerStart||pointerStart.id!==event.pointerId)return;
  const displacement=event.clientY-pointerStart.y;
  pointerStart=null;
  if(Math.abs(displacement)<42)return;
  if(displacement<0)setSheet(sheetStage==='closed'?'half':'full');
  else setSheet(sheetStage==='full'?'half':'closed');
});
window.addEventListener('resize',()=>{
  if(selectedPanel!=='map')openPanel(selectedPanel);
  if(mapReady)map.resize();
});
const mobileBrowser=mobileView()&&!window.matchMedia('(display-mode: standalone)').matches;
if(mobileBrowser)document.getElementById('browser-tip').hidden=false;
try {
  map=new maplibregl.Map({
    container:'map',
    center:[126.951,37.505],
    zoom:12.9,
    minZoom:10,
    maxZoom:18,
    attributionControl:false,
    style:{
      version:8,
      sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap contributors'}},
      layers:[{id:'osm',type:'raster',source:'osm'}]
    }
  });
  map.addControl(new maplibregl.AttributionControl({compact:true}),'bottom-left');
  map.on('load',()=>{mapReady=true;});
  map.on('error',()=>{ /* UI controls remain usable if public tiles are unavailable */ });
} catch {
  document.getElementById('map').setAttribute('aria-label','배경지도를 불러오지 못했습니다.');
  showToast('배경지도 로드에 실패했습니다. UI 기능은 계속 확인할 수 있습니다.');
}
