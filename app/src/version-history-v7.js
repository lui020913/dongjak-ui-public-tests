import {releaseEdition,syncPublicVersion} from './release-editions.js';
import {buildGenerationCatalog} from './history-generation-catalog.js';
import {CHANGE_TYPE_GROUPS,publicReleaseNote,cleanHistoryNote,historyHighlights} from './public-release-display.js';
/**
 * v7.0.7: visual presentation is release-first, newest to oldest.
 * The old classification model stays exported for data-integrity checks.
 * All original release notes and data sources are retained.
 */
export const HISTORY_CATEGORIES = Object.freeze([
  {id:'safety',title:'보행안전·공간분석',description:'보호구역, 제한속도, 야간 안전과 보행환경 검토',sections:[
    {id:'zones',title:'보호구역·제한속도·단속'},
    {id:'night',title:'야간 시야·조명·건물 차폐'},
    {id:'walking',title:'보행환경·경사·도로폭'},
    {id:'report',title:'현장조사·제보·안전지도 도구'}
  ]},
  {id:'map',title:'지도·지형·공간정보',description:'지형과 3D 건물, 지도 표현, 경계와 길찾기',sections:[
    {id:'terrain',title:'3D 건물·지형·원근 표현'},
    {id:'labels',title:'장소명·지명·지도 라벨'},
    {id:'roads',title:'도로·행정경계·지도 레이어'},
    {id:'routes',title:'검색·경로탐색·위치정보'}
  ]},
  {id:'transport',title:'버스·지하철·교통정보',description:'대중교통 노선, 도착예정, 정류장과 역사 접근성',sections:[
    {id:'rail',title:'지하철 노선·역명·환승'},
    {id:'realtime',title:'실시간 도착·시간표·운행정보'},
    {id:'bus',title:'버스정류장·정류소 정보'},
    {id:'access',title:'역 출입구·교통약자 접근성'}
  ]},
  {id:'local',title:'지역 생활·시설정보',description:'공공시설·교육시설, 뉴스, AI 장소 안내',sections:[
    {id:'facilities',title:'공공·교육·생활시설'},
    {id:'news',title:'동작구 소식·지역 뉴스'},
    {id:'ai',title:'시설 AI 설명·정보 출처'}
  ]},
  {id:'ui',title:'사용자 화면·접근성',description:'모바일/PC 구성, 다크모드, 패널·조작 편의',sections:[
    {id:'mobile',title:'모바일·반응형·전체화면'},
    {id:'panels',title:'검색창·메뉴·정보 패널'},
    {id:'theme',title:'라이트·다크·가독성'}
  ]},
  {id:'ops',title:'데이터·연동·안정화',description:'공공 API, 성능, 오류 대응 및 배포·버전 관리',sections:[
    {id:'api',title:'API·데이터 수집·연동'},
    {id:'performance',title:'오류 복구·성능·안정성'},
    {id:'releases',title:'배포·설정·버전 관리'},
    {id:'general',title:'기능 통합·기타 개선'}
  ]}
]);

/**
 * Source register moved out of operational menus into this version-history page.
 * Each entry records the source actually referenced by the project and its scope.
 */
export const DATA_SOURCE_GROUPS = Object.freeze([
  {id:'basemap',title:'기본 지도·공간정보',items:[
    {name:'OpenFreeMap',detail:'기본 벡터 지도 스타일과 건물·장소 표현',url:'https://openfreemap.org/',note:'지도 스타일과 제공 범위는 원본 서비스 갱신에 따라 달라질 수 있습니다.'},
    {name:'OpenStreetMap',detail:'도로·정류장·시설 POI 등 공개 지도 데이터',url:'https://www.openstreetmap.org/copyright',note:'기여자 데이터이며 일부 도로·시설은 누락되거나 갱신이 지연될 수 있습니다.'},
    {name:'사용자 제공 동작구 로고 이미지',detail:'동작구청 대표 지도 마커 및 시작 화면 로고',url:null,note:'전체 로고와 글자 형태가 보이도록 마커 내부 여백을 두고 표시합니다.'},
    {name:'Overpass API',detail:'OSM 시설·보행로·출입구·랜드마크 조회',url:'https://overpass-api.de/',note:'서버 혼잡이나 응답 제한 시 일부 레이어가 조회되지 않을 수 있습니다.'},
    {name:'통계청 SGIS / admdongkor',detail:'행정동 경계 자료 · 2026-10-01 기준',url:'https://sgis.kostat.go.kr/',note:'법정동 경계와 다르며, 앱은 동작구 행정동만 필터링해 사용합니다.'},
    {name:'AWS Terrain Tiles',detail:'Terrarium DEM 지형 고도 타일',url:'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/',note:'격자형 고도자료이며 실제 현장 측량고도나 모든 지형 요소를 보증하지 않습니다.'}
  ]},
  {id:'transport',title:'대중교통',items:[
    {name:'서울시 지하철 실시간 도착 API',detail:'호선별·역별 실시간 도착정보',url:'http://swopenapi.seoul.go.kr/api/subway/',note:'API 키·서비스 상태·제공 시각에 따라 조회 범위가 달라집니다.'},
    {name:'서울시 버스정보시스템 API',detail:'버스정류소 및 버스 도착정보',url:'http://ws.bus.go.kr/api/rest/stationinfo/',note:'정류소 ARS 번호와 API 인증 상태에 따라 제공 정보가 달라집니다.'},
    {name:'서울시 열린데이터광장',detail:'공공 교통 데이터셋 검색·제공 포털',url:'https://data.seoul.go.kr/',note:'개별 데이터셋의 갱신 주기와 제공 범위는 각 상세 페이지를 따릅니다.'},
    {name:'서울시 버스정류소 위치정보',detail:'공식 버스정류소 좌표 정적 데이터',url:'https://data.seoul.go.kr/dataList/OA-15067/S/1/datasetView.do',note:'정류소 명칭·좌표는 원본 데이터 갱신일의 영향을 받습니다.'},
    {name:'한국철도공사(코레일)',detail:'수도권 전동열차 1호선 계획 운행시간표',url:'https://www.korail.com/com/userBoard.do?mode=list&schBcid=ticketTable',note:'계획 시간표이며 실시간 열차 위치·지연을 반영하지 않습니다.'},
    {name:'신림선 도시철도',detail:'신림선 역별 계획 운행시간표',url:'https://www.sillimlrt.com/kr/html/sub01/010101.html',note:'운영기관의 임시 운행변경 및 최신 공지가 우선합니다.'},
    {name:'행정안전부 지하철 출입구 자료(ArcGIS)',detail:'역 출입구 좌표 및 역사 접근성 조회',url:'https://portal.esrikr.com/arcgis/rest/services/Hosted/MOIS_KR_Subway/FeatureServer/0/query',note:'출입구 점 좌표이며 승강설비 유형을 임의로 판정하지 않습니다.'}
  ]},
  {id:'safety',title:'보행안전·공공자료',items:[
    {name:'사용자 제공 표준노드링크 GeoPackage',detail:'상도1동 도로별 최고제한속도 10·30·40·50km/h 속성',url:null,note:'제공 파일 기준 2025-05-12 갱신 자료이며 현장 표지·최신 지정고시 대조가 필요합니다.'},
    {name:'전국무인교통단속카메라 표준데이터',detail:'단속카메라 위치 좌표가 포함된 공식 데이터',url:'https://www.data.go.kr/data/15028200/standard.do',note:'좌표 파일을 가져온 경우에만 지도에 표시하며 실제 운영 여부는 별도 확인이 필요합니다.'},
    {name:'TAAS 교통사고 분석시스템',detail:'사고다발지역 등 교통사고 통계 참고',url:'https://taas.koroad.or.kr/gis/mcm/mcl/initMap.do?menuId=0',note:'개별 보행자 사고 위치 원자료는 확보되지 않았습니다.'},
    {name:'서울시 횡단보도 정보',detail:'횡단시설 데이터 참고',url:'https://data.seoul.go.kr/dataList/OA-22906/S/1/datasetView.do',note:'개별 검토 도로의 공식 시설 여부는 미검증입니다.'},
    {name:'서울시 250m 생활인구',detail:'생활인구 분포 참고',url:'https://data.seoul.go.kr/dataList/OA-22784/S/1/datasetView.do',note:'특정 도로의 실제 보행량과 동일하지 않습니다.'},
    {name:'정보공개포털',detail:'보호구역 지정 고시·통학로 자료 확인 경로',url:'https://www.open.go.kr/',note:'최신 고시 및 개별 구간의 법적 지정 여부는 별도 대조가 필요합니다.'}
  ]},
  {id:'search',title:'검색·경로·날씨',items:[
    {name:'Photon / Komoot',detail:'장소명·주소 검색',url:'https://photon.komoot.io/api',note:'검색 결과의 위치 정확도는 지도와 현장에서 확인해야 합니다.'},
    {name:'Valhalla · OpenStreetMap 기반',detail:'일반 보행·경사 회피 우선 경로 계산',url:'https://valhalla1.openstreetmap.de/route',note:'경로는 안전도 평가나 실제 보행 가능 여부를 보증하지 않습니다.'},
    {name:'Open-Meteo',detail:'날씨 위젯 예보·기상정보',url:'https://api.open-meteo.com/v1/forecast',note:'예보 갱신 주기와 예측 오차가 존재합니다.'}
  ]},
  {id:'local',title:'지역 소식·시설정보',items:[
    {name:'동작구청 공식 공지사항',detail:'구청 소식 탭의 공식 게시판',url:'https://www.dongjak.go.kr/portal/bbs/B0000022/list.do?menuNo=200638',note:'게시물 원문과 게시 시각은 구청 사이트에서 확인합니다.'},
    {name:'Google 뉴스 검색',detail:'동작구 관련 언론 보도 검색 보조 링크',url:'https://news.google.com/search?q=%EB%8F%99%EC%9E%91%EA%B5%AC&hl=ko&gl=KR&ceid=KR%3Ako',note:'언론 기사 모음이며 개별 보도의 사실관계는 원문을 확인해야 합니다.'},
    {name:'기관·시설 공식 홈페이지',detail:'학교·도서관·우체국 등 주소·연락처 보완',url:null,note:'각 시설 상세정보에 해당 기관의 공식 홈페이지 링크를 제공합니다.'}
  ]}
]);

// More specific phrases come first. One original note belongs to one primary topic.
const CLASSIFICATION_RULES = [
  ['safety','zones',/제한속도|속도표지|단속카메라|무인단속|표준노드링크|보호구역|보행안전 검토|보행환경 검토|사각지대|사고다발|통학/],
  ['ops','releases',/현재 배포 버전|전체 업데이트 내역|원문 변경사항|버전 번호를 보존/],
  ['safety','night',/야간|조명|가로등|보안등|광도달|미도달|암부|차폐|직접광|조도|분석선|조명 반경|반경 슬라이더/],
  ['transport','access',/역 출구|역출구|출입구|엘리베이터|에스컬레이터|승강시설|역사 접근성/],
  ['transport','realtime',/도착정보|도착예정|도착시각|운행시간표|시간표|실시간 지하철|열차|첫차|막차|운행 상태|상·하행 카드|교통정보의 실시간/],
  ['transport','bus',/버스|정류장|정류소|ARS|승강장|버스도착|버스정류소/],
  ['transport','rail',/지하철|철도|노선|환승|호선|신림선|경의중앙선|경의·중앙선|지하철역|역명|기차/],
  ['local','ai',/AI|인공지능|Llama|Gemma|Workers AI|설명 API|자동 생성.*설명/],
  ['local','news',/뉴스|소식|뉴스레터|기사|미리보기 사진|썸네일/],
  ['safety','report',/현장조사|현장 검토|안전정보|보행불편|제보|커뮤니티|주민 참여|조사 지점|조사정보/],
  ['safety','walking',/보행로|보행자|걷기|보행약자|보행안전|보행경로|경사|도로폭|연석|횡단보도|보행정보/],
  ['map','terrain',/3D|2D 건물|입체 건물|지형|DEM|원근|건물 면|건물 평면|건물 지붕|건물 윤곽|건물 외곽|대각선 시점|건물 높이|건물 파일|건물 데이터|건물 보완|시점을 기울|카메라 각도|기울인 지도|원거리 대기|평탄화/],
  ['map','labels',/라벨|명칭|시설명|지명|교량|로고|아이콘 중복|중복 마커|표기|한글 건물|대학 마커|랜드마크|주요 시설명/],
  ['map','routes',/길찾기|경로탐색|경로 추천|출발지|도착지|GPS|위치 확인|장소 검색|위치 추적|내 주변/],
  ['local','facilities',/시설정보|시설 선택|공공시설|교육시설|초·중·고|학교|대학교|동작구청|현충원|약국|편의점|병원|공원|연락처|웹사이트|주소|생활시설/],
  ['ui','mobile',/모바일|iPhone|Safari|Android|가로모드|가로 화면|반응형|홈 화면|전체화면|작은 화면|안전영역|터치/],
  ['ui','panels',/패널|바텀시트|시트|메뉴|검색창|스크롤바|버튼|헤더|상단 조작|지도 조작 안내|지도 안내|화면 겹침|레이아웃|빈 영역/],
  ['ui','theme',/다크모드|라이트모드|다크 테마|테마|대비|명도|가독성|밝기|흰색 테두리|폰트|색상/],
  ['map','roads',/지도|도로|경계|선형|좌표|외곽선|벡터|건물|면적|레이어|고배율|줌|축척|지도 스타일/],
  ['ops','api',/API|HTTP|401|500|공식 데이터|인증|응답|서비스|키|연동|공개자료|쿼리|조회/],
  ['ops','performance',/오류|성능|렌더링|프레임|캐시|재시도|복구|안정|중단|실패|데이터 누락/],
  ['ops','releases',/배포|버전|Cloudflare|Pages|Worker|도구|스크립트|설정|라이선스|업데이트 내역|업데이트 창/]
];

export function classifyHistoryItem(item){
  const content=String(item??'');
  for(const [major,minor,pattern] of CLASSIFICATION_RULES){
    if(pattern.test(content))return {major,minor};
  }
  return {major:'ops',minor:'general'};
}

export function makeHistoryCatalog(recentHistory,legacyHistory){
  const releases=[...recentHistory,...legacyHistory];
  const groups=HISTORY_CATEGORIES.map(cat=>({
    id:cat.id,title:cat.title,description:cat.description,sections:cat.sections.map(s=>({
      id:s.id,title:s.title,items:[]
    }))
  }));
  const lookup=new Map(groups.flatMap(group=>group.sections.map(section=>[`${group.id}:${section.id}`,section])));
  let total=0;
  for(const release of releases){
    for(const originalText of release.items||[]){
      const place=classifyHistoryItem(originalText);
      const section=lookup.get(`${place.major}:${place.minor}`)||lookup.get('ops:general');
      section.items.push({version:release.version,text:originalText,scale:release.scale});
      total++;
    }
  }
  for(const group of groups){
    group.sections=group.sections.filter(s=>s.items.length>0);
    group.count=group.sections.reduce((n,s)=>n+s.items.length,0);
  }
  return {version:recentHistory[0]?.version||'',releaseCount:releases.length,itemCount:total,
    groups:groups.filter(group=>group.count>0)};
}

function el(tag,className,text){
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text!==undefined)node.textContent=text;
  return node;
}

export function initReleaseCatalog({trigger,modal,close,list,recentHistory,legacyHistory,currentRelease=null}){
  if(!trigger||!modal||!close||!list)return null;
  const releases=[...(currentRelease?[currentRelease]:[]),...recentHistory,...legacyHistory];
  const itemCount=releases.reduce((count,release)=>count+(release.items?.length||0),0);
  list.replaceChildren();
  const summary=el('section','v707-history-summary');
  // Unnecessary SemVer explanation removed from the visible release history.
  const controls=el('div','v707-history-switch');
  const updatesButton=el('button','v707-history-switch-button','업데이트 내역');
  const sourcesButton=el('button','v707-history-switch-button','데이터 출처');
  for(const btn of [updatesButton,sourcesButton])btn.type='button';
  controls.append(updatesButton,sourcesButton);controls.classList.add('dj-mobile-history-switch');summary.append(controls);
  const columns=el('div','v707-history-columns');columns.dataset.activeView='updates';
  const timeline=el('section','v707-history-timeline');timeline.id='history-version-timeline';
  timeline.setAttribute('aria-label','변경 종류별 전체 업데이트 내역');
  // The source ledger remains complete, but only curated user-facing
  // changes enter the public DOM. No per-patch development archive.
  const audited=buildGenerationCatalog(releases,releaseEdition).flatMap(group=>group.records);
  const sourceNotes=audited.flatMap(({record})=>record.sourceItems||record.items||[]);
  const currentTexts=[...new Set((currentRelease?.items||[]).map(note=>cleanHistoryNote(note,currentRelease?.version)).filter(Boolean))];
  if(currentRelease&&currentTexts.length){
    const article=el('article','v707-release dj-history-latest');
    article.dataset.version=String(currentRelease.version||'').replace(/^v/,'');
    article.dataset.currentBuild='true';
    const head=el('header','v707-release-head');
    head.append(el('h4','','최근 변경사항'));article.append(head);
    const ul=el('ul','v707-release-items');
    for(const description of currentTexts)ul.append(el('li','',publicReleaseNote(description,currentRelease.version)));
    article.append(ul);timeline.append(article);
  }
  timeline.append(el('h3','dj-history-section-title','주요 업데이트'));
  for(const type of CHANGE_TYPE_GROUPS){
    const highlights=historyHighlights(type.id,sourceNotes);
    if(!highlights.length)continue;
    const archive=el('details','dj-edition-history');
    archive.dataset.changeType=type.id;
    archive.open=false;
    const heading=el('summary','dj-edition-summary');
    heading.append(el('strong','',type.title),el('span','',type.description),el('small','','보기'));
    const bullets=el('ul','dj-history-highlights');
    for(const note of highlights)bullets.append(el('li','',note));
    archive.append(heading,bullets);timeline.append(archive);
  }
  if(currentRelease)void syncPublicVersion({version:currentRelease.version});
  const sources=el('aside','v707-history-sources');sources.id='history-data-sources';
  sources.setAttribute('aria-label','데이터 출처 및 활용 범위');
  sources.append(el('h3','v7-history-sources-title','데이터 출처 및 활용 범위'));
  sources.append(el('p','v7-history-sources-copy','링크는 데이터 원본 또는 제공기관 확인용입니다. 갱신 시각과 제공 범위 및 정확도는 기관별로 다를 수 있습니다.'));
  for(const group of DATA_SOURCE_GROUPS){
    const block=el('section','v7-history-source-group');
    block.append(el('h4','',group.title));
    const ul=el('ul','v7-history-source-list');
    for(const source of group.items){
      const item=el('li','v7-history-source-item');
      const head=el('div','v7-history-source-head');
      head.append(el('strong','',source.name),el('span','',source.detail));
      if(source.url){
        const a=el('a','v7-history-source-link','원본 확인');
        a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';head.append(a);
      }else head.append(el('span','v7-history-source-local','프로젝트 제공 자료'));
      item.append(head,el('p','v7-history-source-note',source.note));ul.append(item);
    }
    block.append(ul);sources.append(block);
  }
  sources.append(el('p','v7-history-end','계획 시간표 및 안전 추정정보는 실제 운행·위험 여부를 보증하지 않습니다.'));
  columns.append(timeline,sources);list.append(summary,columns);
  const choose=view=>{
    columns.dataset.activeView=view;
    updatesButton.setAttribute('aria-pressed',String(view==='updates'));
    sourcesButton.setAttribute('aria-pressed',String(view==='sources'));
    if(view==='updates')timeline.scrollTop=0;else sources.scrollTop=0;
  };
  updatesButton.addEventListener('click',()=>choose('updates'));
  sourcesButton.addEventListener('click',()=>choose('sources'));
  choose('updates');
  let priorFocus=null;
  const card=modal.querySelector('.version-history-dialog');
  if(card)card.dataset.djDialogFade='true';
  const syncDock=()=>{
    if(!window.matchMedia?.('(max-width:699px)').matches)return;
    const nav=document.getElementById('bottom-nav'),rect=nav?.getBoundingClientRect();
    if(rect&&rect.height>0&&!nav.hidden){
      modal.style.setProperty('--dj-history-dock-bottom',Math.max(8,window.innerHeight-rect.top+8)+'px');
    }
  };
  // Measure the final dock before the first paint; do not scroll a translated
  // focus target into view (iOS otherwise shifts the fixed dialog mid-flight).
  const hide=()=>{
    if(modal.hidden)return;
    const finish=()=>{modal.hidden=true;(priorFocus?.isConnected?priorFocus:trigger).focus({preventScroll:true});};
    if(window.DongjakWindowMotion)window.DongjakWindowMotion.close(card,finish);else finish();
  };
  const show=({version=''}={})=>{
    const opening=modal.hidden;
    if(opening){
      priorFocus=document.activeElement;
      syncDock();
      window.DongjakWindowLifecycle?.requestOpen(modal.id);
      modal.hidden=false;
    }
    if(opening)for(const item of timeline.querySelectorAll('details'))item.open=false;
    list.scrollTop=0;choose('updates');
    if(opening)window.DongjakWindowMotion?.open(card);
    close.focus({preventScroll:true});
    const normalized=String(version||'').trim().replace(/^v/,'');
    if(normalized){
      const focusRelease=()=>{
        // Old release links open the consolidated public history rather than
        // resurrecting deleted per-build development cards.
        const target=[...timeline.querySelectorAll('.v707-release')].find(item=>item.dataset.version===normalized);
        if(!target)return;
        timeline.scrollTo?.({top:Math.max(0,target.offsetTop-timeline.offsetTop-8),behavior:'smooth'});
        target.classList.remove('dj856-release-focus');void target.offsetWidth;target.classList.add('dj856-release-focus');
        window.setTimeout(()=>target.classList.remove('dj856-release-focus'),1500);
      };
      (window.requestAnimationFrame||((fn)=>window.setTimeout(fn,0)))(focusRelease);
    }
  };
  const onOpenSpecific=event=>show({version:event.detail?.version||''});
  window.addEventListener('resize',()=>{if(!modal.hidden)syncDock();},{passive:true});
  document.addEventListener('dongjak:open-release-history',onOpenSpecific);
  trigger.addEventListener('click',()=>show());
  document.getElementById('version-history-mobile-trigger')?.addEventListener('click',()=>show());
  close.addEventListener('click',hide);
  modal.addEventListener('click',event=>{if(event.target===modal)hide();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!modal.hidden){event.preventDefault();hide();}});
  return {releaseCount:releases.length,itemCount};
}
