/** Independent state helpers: no browser or stylesheet side effects. */
export const MAP_TIP_MESSAGES=Object.freeze([
  '역이나 정류장을 누르면 대중교통 정보를 확인할 수 있습니다.',
  '검색창에서 병원·약국·공원·일반 시설을 검색해 보세요.',
  '상단 레이어에서 지도 기능을 관리하세요.',
  '현재 위치 버튼으로 지도 중심을 내 위치에 맞출 수 있습니다.',
  '도보 길찾기에서 경유지를 최대 5곳까지 추가할 수 있습니다.',
  '레이어에서 행정동을 선택하세요.'
]);
export const PRIMARY_PANELS=['route-panel','participation-panel','news-panel','mine-panel','admin-dong-picker'];
export const TRANSIENT_PANELS=['overview-sheet','transport-sheet','detail-sheet','entry-sheet','night-visibility-float','map-safety-controls','map-advanced-controls','dj-mobile-utilities','dj832-data-sheet','dj833-weather-sheet','dj833-night-modal','dj832-info-sheet','dj832-feature-sheet','dj-map-settings','dj-app-about','version-history-modal','route-map-card','nav-live-card','route-pick-hint','dj-community-location-card','map-gesture-guide','ped-tools-panel','djNext-layer-panel','djNext-permissions','dj854-weather-sheet'];
const visible=(el)=>{
  if(!el||el.hidden||el.closest?.('[hidden]')||el.getAttribute?.('aria-hidden')==='true')return false;
  if(el.dataset?.djTabOutgoing==='true')return false;
  if(el.dataset?.dj810Animating==='closing'&&el.dataset?.djWindowMotionKind==='fade')return false;
  const style=el.ownerDocument?.defaultView?.getComputedStyle?.(el);
  return !style||(style.display!=='none'&&style.visibility!=='hidden'&&(!el.getClientRects||el.getClientRects().length>0));
};
export function hasOpenMapWindow(doc=document,app=doc.getElementById('app')){
  if(!app)return false;
  if(app.classList.contains('map-safety-open')||app.classList.contains('map-controls-open')||app.dataset.searchOpen==='true'||app.dataset.dj910SheetOpen==='true')return true;
  for(const id of [...PRIMARY_PANELS,...TRANSIENT_PANELS]){
    const n=doc.getElementById(id);
    // Controls are class-toggled rather than hidden in old desktop styles.
    if(id==='map-safety-controls'||id==='map-advanced-controls')continue;
    if(visible(n))return true;
  }
  return false;
}
export function normalizeBottomTabs(doc=document,app=doc.getElementById('app')){
  if(!app)return 'map';
  const page=PRIMARY_PANELS.slice(0,4).filter(id=>id!=='admin-dong-picker')
    .some(id=>visible(doc.getElementById(id)));
  const active=app.dataset.tab;
  if(!page&&active!=='map'&&!hasOpenMapWindow(doc,app))app.dataset.tab='map';
  // A calculated path is still shown over the map, but its active context is 'route'.
  // Do not change data-tab: the map renderer relies on it for preview/navigation.
  const showingPath=(app.dataset.tab==='map')&&
    Boolean((!doc.getElementById('route-map-card')?.hidden&&doc.getElementById('route-map-card'))||
      (!doc.getElementById('nav-live-card')?.hidden&&doc.getElementById('nav-live-card')));
  const tab=showingPath?'route':(app.dataset.tab||'map');
  for(const button of doc.querySelectorAll('#bottom-nav>.nav-tab')){
    const selected=button.dataset.tab===tab;
    button.classList.toggle('active',selected);
    const value=String(selected);
    if(button.getAttribute?.('aria-selected')!==value)button.setAttribute('aria-selected',value);
    if(button.getAttribute?.('aria-pressed')!==value)button.setAttribute('aria-pressed',value);
    if(selected){if(button.getAttribute?.('aria-current')!=='page')button.setAttribute('aria-current','page');}
    else if(!button.hasAttribute||button.hasAttribute('aria-current'))button.removeAttribute('aria-current');
  }
  return tab;
}
