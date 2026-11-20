// The model selects action IDs, never selectors, coordinates, code, URLs or arbitrary input.
export const ACTIONS=Object.freeze([
 ['weather','#djNext-weather','click','#dj854-weather-sheet','open','날씨'],
 ['weather-close','#dj854-weather-sheet button[aria-label="날씨창 닫기"]','click','#dj854-weather-sheet','close','날씨 닫기'],
 ['layers','#djNext-layers','click','#djNext-layer-panel','open','레이어'],
 ['layers-scroll','#djNext-layer-panel .djNext-layer-scroll','scroll',null,null,'레이어 목록 스크롤'],
 ['layers-close','#djNext-layer-panel button[aria-label="레이어 설정 닫기"]','click','#djNext-layer-panel','close','레이어 닫기'],
 ['near','#djNext-near','click','#ped-tools-panel','open','주변 안전정보'],
 ['near-close','#ped-tools-close','click','#ped-tools-panel','close','주변 안전정보 닫기'],
 ['route','#bottom-nav .nav-tab[data-tab="route"]','click','#route-panel','open','길찾기'],
 ['participate','#bottom-nav .nav-tab[data-tab="participate"]','click','#participation-panel','open','커뮤니티'],
 ['news','#bottom-nav .nav-tab[data-tab="news"]','click','#news-panel','open','소식'],
 ['mine','#bottom-nav .nav-tab[data-tab="mine"]','click','#mine-panel','open','내 정보'],
 ['map','#bottom-nav .nav-tab[data-tab="map"]','click','#app','map','지도 탭'],
 ['route-scroll','#route-panel > .dj836-sheet-body','scroll',null,null,'길찾기 스크롤'],
 ['community-scroll','#participation-panel > .dj836-sheet-body','scroll',null,null,'커뮤니티 스크롤'],
 ['news-scroll','#news-panel > .dj836-sheet-body','scroll',null,null,'소식 스크롤'],
 ['mine-scroll','#mine-panel > .dj836-sheet-body','scroll',null,null,'내 정보 스크롤'],
 ['community-compose','#community-compose-toggle','click','#community-form','open','글쓰기 창 미리보기 (제출 금지)'],
 ['community-close','#community-compose-close','click','#community-form','close','글쓰기 창 닫기'],
 ['ai','#dj890-ai-orb','click','#dj-ai-search-modal','open','AI 검색 (전송 금지)'],
 ['ai-close','#dj-ai-search-modal button[aria-label="AI 검색 닫기"]','click','#dj-ai-search-modal','close','AI 검색 닫기'],
 ['search','#map-quick-search-query','search',null,null,'노량진 고정 검색어'],
 ['search-clear','#dj-search-clear','click',null,null,'검색어 지우기'],
 ['search-close','#map-quick-search-close','click','#map-quick-search-dropdown','close','검색 닫기'],
 ['history','#mine-panel [data-dj834-action="history"]','click','#version-history-modal','open','업데이트 내역'],
 ['history-close','#version-history-close','click','#version-history-modal','close','업데이트 닫기']
].map(([id,selector,kind,surface,expectation,label])=>Object.freeze({id,selector,kind,surface,expectation,label})));
export function selectAction(value,available,history){
 if(!value||Object.keys(value).length!==1||typeof value.action!=='string')throw Error('Invalid action response');
 if(value.action==='finish'){if(history.length<3&&available.length)throw Error('Premature finish');return null;}
 const action=ACTIONS.find(a=>a.id===value.action);
 if(!action||!available.includes(action.id)||history.filter(x=>x===action.id).length>=2)throw Error('Action outside safe visible catalog');
 return action;
}
export function classifyReview(value,evidence){
 if(!value||!Array.isArray(value.findings)||value.findings.length>12)throw Error('Invalid exploration review');
 return value.findings.map(f=>{
  if(!['critical','major','minor','suggestion'].includes(f.severity)||typeof f.summary!=='string'||!f.summary.trim()||f.summary.length>700||!Array.isArray(f.evidence)||!f.evidence.length||f.evidence.some(e=>!evidence.includes(e)))throw Error('Unverifiable exploration review');
  return {severity:f.severity,summary:f.summary,evidence:[...new Set(f.evidence)]};
 });
}
export function allowedRequest(method,url,target,topNavigation=false){
 if(!['GET','HEAD','OPTIONS'].includes(method))return false;
 try{const u=new URL(url);if(!['https:','http:'].includes(u.protocol))return false;return !topNavigation||u.origin===target.origin;}catch{return false;}
}
