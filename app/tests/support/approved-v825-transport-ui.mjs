/** v8.25 is allowed to change only the selection pin and camera placement.
 * Reverse the exact approved edits, then compare with archived protected hashes.
 * A surprise transport API / marker / data change still fails legacy SHA tests. */
export function stripApprovedV825TransportUI(source){
  // v8.5.3 authorized PC-only bus pictogram scale and label-offset adjustment.
  // Strip this presentation hook before comparing the protected transport engine hash.
  const desktopBusPresentation=/  \/\/ PC에서는 버스 표식과 명칭 사이 간격을 넓히고 아이콘을 키웁니다\.\n  \/\/ 모바일은 기존 크기와 간격을 그대로 유지합니다\.\n  const syncDesktopBusPresentation=\(\)=>\{[\s\S]*?  globalThis\.addEventListener\?\.\('resize',syncDesktopBusPresentation,\{passive:true\}\);\n/;
  if(!desktopBusPresentation.test(source))throw new Error('v8.5.3 PC bus presentation block missing');
  let restored=source.replace(desktopBusPresentation,'');
  restored=stripApprovedV826TransitFavorites(restored);
  const approved0="import {createSelectedTransportPin,mobileTransportFocusOffset} from './transport-selection-marker.js';\n";
  const original0='';
  if(!restored.includes(approved0))throw new Error('v825 transport approved block 0 missing');
  restored=restored.replace(approved0,original0);
  const approved1='  let selectionMarker=null;\n';
  const original1='';
  if(!restored.includes(approved1))throw new Error('v825 transport approved block 1 missing');
  restored=restored.replace(approved1,original1);
  const approved2='    selectionMarker?.remove?.();selectionMarker=null;\n';
  const original2='';
  if(!restored.includes(approved2))throw new Error('v825 transport approved block 2 missing');
  restored=restored.replace(approved2,original2);
  const approved3='    // One selected coordinate pin. Reuse on line changes and remove on close.\n    selectionMarker=createSelectedTransportPin({map,maplibregl,place,previous:selectionMarker});\n';
  const original3='';
  if(!restored.includes(approved3))throw new Error('v825 transport approved block 3 missing');
  restored=restored.replace(approved3,original3);
  const approved4='      const mapBounds=map.getContainer?.()?.getBoundingClientRect?.();\n      const viewportHeight=mapBounds?.height||map.getContainer?.()?.clientHeight||globalThis.innerHeight||800;\n';
  const original4='      const viewportHeight=map.getContainer?.()?.clientHeight||globalThis.innerHeight||800;\n';
  if(!restored.includes(approved4))throw new Error('v825 transport approved block 4 missing');
  restored=restored.replace(approved4,original4);
  const approved5='      const upward=Math.round(Math.min(112,Math.max(46,viewportHeight*.10)));\n      const offsetY=phoneFocus\n        ?mobileTransportFocusOffset({viewportHeight,panelTop:panel.getBoundingClientRect?.()?.top,\n          containerTop:mapBounds?.top||0})\n        :-upward;\n';
  const original5='      const upward=phoneFocus\n        ?Math.round(Math.min(150,Math.max(72,viewportHeight*.16)))\n        :Math.round(Math.min(112,Math.max(46,viewportHeight*.10)));\n';
  if(!restored.includes(approved5))throw new Error('v825 transport approved block 5 missing');
  restored=restored.replace(approved5,original5);
  const approved6='      try{map.easeTo?.({center:[place.lng,place.lat],offset:[0,offsetY],\n';
  const original6='      try{map.easeTo?.({center:[place.lng,place.lat],offset:[0,-upward],\n';
  if(!restored.includes(approved6))throw new Error('v825 transport approved block 6 missing');
  restored=restored.replace(approved6,original6);
  return restored;
}

/** Precisely subtract the four additions permitted by v8.26 transit favorites.
 * Exact string comparisons retain the old v8.25 renderer SHA-256 guard.
 * Any modification to the arrival renderer, MapLibre selection pin or camera
 * outside these four owned blocks still fails all historical hash tests. */
const V826_OWNED_INSERTIONS=[
  "import {toggleSavedPlace,setSavedPlaceFolder,savedPlaces,getPlaceFolders,placeKey,recordRecentPlace,placeShareUrl,shareMapUrl} from './v815-place-store.js';\n",
  "  // Account-ready bookmarks for bus stops and metro stations. Keep v8.25\n  // selection pin, directional arrival data, line switch and camera motion.\n  const actionsRow=panel?.querySelector?.('.transport-selection-actions');\n  const transportBookmark=actionsRow?document.createElement('button'):null;\n  const transportShare=actionsRow?document.createElement('button'):null;\n  const transportFolder=actionsRow?document.createElement('select'):null;\n  if(transportBookmark&&transportShare&&transportFolder){\n    transportBookmark.type='button';transportBookmark.id='transport-save-place';\n    transportBookmark.textContent='☆ 즐겨찾기';transportBookmark.setAttribute('aria-label','교통 장소 즐겨찾기');\n    transportShare.type='button';transportShare.id='transport-share-place';\n    transportShare.className='dj-news-transport-share';\n    transportShare.setAttribute('aria-label','교통 장소 공유');transportShare.title='교통 장소 공유';\n    transportShare.innerHTML='<svg data-dj-transport-icon=\"share\" viewBox=\"0 0 24 24\" aria-hidden=\"true\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"18\" cy=\"5\" r=\"3\"/><circle cx=\"6\" cy=\"12\" r=\"3\"/><circle cx=\"18\" cy=\"19\" r=\"3\"/><path d=\"m8.7 10.7 6.6-4.4m-6.6 7.4 6.6 4.4\"/></svg>';\n    transportShare.addEventListener('click',()=>{\n      if(!selected)return;\n      const place=favoritePlace(selected);\n      const url=placeShareUrl(place);\n      if(url)void shareMapUrl(url,`${selected.name||'대중교통 시설'} · 동작지도`);\n    });\n    transportFolder.id='transport-save-folder';\n    transportFolder.setAttribute('aria-label','교통 장소 저장 그룹');\n    const favoritesRow=document.createElement('div');\n    favoritesRow.className='dj824-transport-favorites';\n    favoritesRow.append(transportBookmark,transportShare,transportFolder);\n    actionsRow.after(favoritesRow);\n  }\n",
  "  const favoritePlace=raw=>raw?{\n    name:String(raw.name||'').trim(),lng:Number(raw.lng),lat:Number(raw.lat),\n    kind:raw.kind==='bus'?'bus':'subway',\n    category:raw.kind==='bus'?'버스정류장':'지하철역',\n    arsId:raw.arsId||'',direction:raw.direction||'',median:raw.median===true,\n    selectedLine:raw.selectedLine||'',lines:raw.lines||[]\n  }:null;\n  function updateTransportFavorite(){\n    if(!selected||!transportBookmark||!transportFolder)return;\n    const record=favoritePlace(selected);\n    const id=placeKey(record);\n    const saved=id?savedPlaces().find(p=>placeKey(p)===id):null;\n    transportBookmark.disabled=!id;\n    transportBookmark.textContent=saved?'★ 저장됨':'☆ 즐겨찾기';\n    transportFolder.replaceChildren();\n    for(const folder of getPlaceFolders()){\n      const option=document.createElement('option');option.value=folder;option.textContent=folder;\n      transportFolder.append(option);\n    }\n    transportFolder.value=saved?.folder||'즐겨찾기';\n    transportFolder.disabled=!saved;\n  }\n  transportBookmark?.addEventListener('click',()=>{\n    if(!selected)return;\n    const result=toggleSavedPlace(favoritePlace(selected));\n    if(result.ok)updateTransportFavorite();\n  });\n  transportFolder?.addEventListener('change',()=>{\n    if(!selected)return;\n    setSavedPlaceFolder(favoritePlace(selected),transportFolder.value);\n  });\n  if(typeof window!=='undefined')window.addEventListener('dongjak:saved-places-change',updateTransportFavorite);\n  if(typeof window!=='undefined')window.addEventListener('dongjak:open-saved-transport',event=>{\n    const p=event.detail?.place;\n    if(!p||!['bus','subway'].includes(p.kind)||!placeKey(p))return;\n    // Opening a bookmarked transport place must use the v8.25 live sheet.\n    void open({...p,kind:p.kind,lines:Array.isArray(p.lines)?p.lines:[]});\n  });\n",
  "    updateTransportFavorite();\n    if(placeKey(favoritePlace(place)))recordRecentPlace(favoritePlace(place));\n"
];
export function stripApprovedV826TransitFavorites(source){
  let restored=source;
  for(const block of V826_OWNED_INSERTIONS){
    if(!restored.includes(block))throw new Error('v826 approved transit favorites block missing or changed');
    restored=restored.replace(block,'');
  }
  return restored;
}
