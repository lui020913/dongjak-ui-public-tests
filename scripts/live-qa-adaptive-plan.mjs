import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

// One review focus per existing, independently captured mobile journey.
// The journeys themselves remain mandatory fixed regression tests.
const rawDesign = [
  [
    ['map-weather','날씨 정보 가독성','지역명, 현재 날씨, 주간 예보의 정보 위계와 여백을 점검','날씨 예보','weather'],
    ['map-layer','레이어 조작','레이어 카드, 스크롤, 헤더 고정과 닫기 버튼의 일관성을 점검','레이어 보행 취약도','layer'],
    ['map-nearby','주변 안전정보','위치 권한 거부 메시지와 안전정보 시트의 접근성을 점검','주변 위치 안전','near'],
    ['map-shortcuts','지도 바로가기','지도 컨트롤과 바로가기 버튼의 크기, 대비, 간격을 점검','상단 버튼 지도','shortcut'],
    ['map-motion','지도 창 전환','화면 등장, 사라짐, 배경 겹침과 지도 흔들림의 시각적 증거를 점검','애니메이션 지도 창','motion'],
  ],
  [
    ['transport-subway','지하철 환승 정보','호선 선택, 도착 정보, 정렬 및 제목 위계를 점검','지하철 노선','subway'],
    ['transport-bus','버스 도착 정보','차량 도착 행의 가독성, 강조와 시간 배열을 점검','버스 실시간','bus'],
    ['transport-place','시설 상세정보','시설명, 분류, 주소와 닫기 아이콘의 시각적 구조를 점검','시설 상세','place'],
    ['transport-sheet','교통 바텀시트','시트 초기 높이, 헤더와 콘텐츠 밀도를 점검','교통 창 시트','sheet'],
    ['transport-transition','시설 전환 안정성','교통·시설 창 교체 중 잔상, 중첩과 레이아웃 튐을 점검','흔들림 창 중첩','transition'],
  ],
  [
    ['route-start-end','출발·도착 구분','출발지와 도착지의 시각적 구분, 검색 및 상태 전달을 점검','길찾기 출발 도착','route'],
    ['route-comparison','경로 비교 정보','경로별 핵심 수치, 선택 상태와 추천 이유를 점검','경로 추천 비교','comparison'],
    ['route-map','경로 지도 카드','선택 경로의 전체 형태, 카드 클리핑 및 안내 위계를 점검','지도 경로','map'],
    ['route-footer','길찾기 하단 고정영역','계산 버튼과 스크롤 영역의 분리 및 하단 여백을 점검','하단 길찾기','footer'],
    ['route-interaction','경로 옵션 전환','경로 옵션 전환 시 내용과 선택 강조의 동기화를 점검','전환 경로','option'],
  ],
  [
    ['search-result','장소 검색 추천','검색 추천 목록의 폭, 줄바꿈, 레이어 높이를 점검','검색 추천','search'],
    ['search-close','검색창 닫기','검색 종료 상태와 인접 아이콘의 위치 변화를 점검','닫기 검색','close'],
    ['ai-modal','AI 검색 전체화면','AI 검색창의 헤더, 전체화면 높이와 안전영역을 점검','AI 전체화면','ai'],
    ['ai-profile','AI 연령 선택','연령 선택 전후의 설명, 입력 상태와 명확성을 점검','AI 연령','profile'],
    ['voice-state','음성 검색 상태','듣는 중 메시지, 버튼 위치와 겹침 여부를 점검','녹음 음성','voice'],
  ],
  [
    ['community-report','위험 제보 입력','제보 작성 폼의 헤더, 입력창, 스크롤 겹침을 점검','제보 신고','report'],
    ['community-list','커뮤니티 목록','커뮤니티 콘텐츠 밀도, 소제목, 버튼의 인지성을 점검','커뮤니티','community'],
    ['community-news','동작 소식','소식 카드의 정렬, 여백, 읽기 흐름을 점검','소식','news'],
    ['community-tabs','하단 탭 전환','커뮤니티·소식·지도 전환 중 하얀 화면과 잔상을 점검','하단탭 전환','tab'],
    ['community-compose','작성창 열고 닫기','폼 종료 후 원래 화면 복귀와 가려진 버튼을 점검','작성 닫기','compose'],
  ],
  [
    ['settings-onboarding','온보딩 화면','첫 화면의 헤더, 안내 이미지, 건너뛰기 영역을 점검','온보딩','onboarding'],
    ['settings-mine','내 정보 설정','접이식 그룹, 업데이트 항목 및 기능 아이콘의 일관성을 점검','내정보 설정','mine'],
    ['settings-theme','테마 전환','다크·라이트의 본문 대비, 상태바 색상과 전환 일관성을 점검','테마 다크 라이트','theme'],
    ['settings-history','업데이트 내역','업데이트 내역의 스크롤, 제목과 닫기 동작을 점검','업데이트 내역','history'],
    ['settings-overlay','설정 창 계층','설정 창과 하단 탭 사이 공간 및 화면 오버레이를 점검','전체화면 창','overlay'],
  ],
];
export const DESIGN = Object.freeze(rawDesign.map((lane,i)=>Object.freeze(lane.map(([id,label,focus,signals,tag])=>Object.freeze({
  id,label,focus,signals:signals.split(' '),tag,lane:i+1,risk:/motion|transition|footer|tabs|overlay|theme|close/.test(id)
})))));

const functionRows = [
  ['weather','날씨 열기','weather','날씨',''],
  ['weather-close','날씨 닫기','weather-close','날씨 닫기','risk'],
  ['layers','레이어 열기','layers','레이어',''],
  ['layers-scroll','레이어 스크롤','layers-scroll','레이어','risk'],
  ['layers-close','레이어 닫기','layers-close','레이어 닫기','risk'],
  ['near','주변 안전정보 열기','near','주변 안전 위치',''],
  ['near-close','안전정보 닫기','near-close','주변 닫기','risk'],
  ['route','길찾기 진입','route','경로 길찾기',''],
  ['route-scroll','길찾기 스크롤','route-scroll','경로 길찾기','risk'],
  ['participate','커뮤니티 진입','participate','커뮤니티 제보',''],
  ['community-scroll','커뮤니티 스크롤','community-scroll','커뮤니티',''],
  ['community-compose','제보 작성 열기','community-compose','제보 작성',''],
  ['community-close','제보 작성 닫기','community-close','제보 닫기','risk'],
  ['news','동작 소식 진입','news','소식',''],
  ['news-scroll','소식 목록 스크롤','news-scroll','소식',''],
  ['mine','내 정보 진입','mine','내정보 설정',''],
  ['mine-scroll','내 정보 스크롤','mine-scroll','내정보 설정',''],
  ['history','업데이트 내역 열기','history','업데이트 내역',''],
  ['history-close','업데이트 내역 닫기','history-close','업데이트 내역 닫기','risk'],
  ['ai','AI 검색 열기','ai','AI 검색',''],
  ['ai-close','AI 검색 닫기','ai-close','AI 닫기','risk'],
  ['search','지도 검색 입력','search','검색',''],
  ['search-clear','검색 입력 지우기','search-clear','검색','risk'],
  ['search-close','검색 추천 닫기','search-close','검색 추천 닫기','risk'],
  ['map','지도 화면 복귀','map','하단탭 지도','risk'],
];
export const FUNCTIONAL=Object.freeze(functionRows.map(([id,label,action,signals,risk])=>Object.freeze({
  id,label,actions:[action],signals:signals.split(' '),risk:!!risk
})));

function randomSource(seed){
 let x=parseInt(createHash('sha256').update(String(seed)).digest('hex').slice(0,8),16)||1;
 return ()=>{
  x=(x+0x6d2b79f5)>>>0;
  let t=Math.imul(x^(x>>>15),x|1);
  t^=t+Math.imul(t^(t>>>7),t|61);
  return ((t^(t>>>14))>>>0)/4294967296;
 };
}
function draw(values,random,score){
 const weights=values.map(v=>Math.max(0.01,score(v))),total=weights.reduce((a,b)=>a+b,0);
 let n=random()*total;
 for(let i=0;i<values.length;i++)if((n-=weights[i])<=0)return values[i];
 return values.at(-1);
}
const match=(topic,purpose)=>topic.signals.some(s=>purpose.includes(s));
function choose(pool,history,type,mode,purpose,random,selected=[]){
 const rounds=Array.isArray(history?.rounds)?history.rounds:[];
 const seen=new Set(rounds.slice(-2).flatMap(r=>Array.isArray(r?.[type])?r[type]:[]));
 const excluded=new Set(selected);
 const available=pool.filter(t=>!excluded.has(t.id));
 const fresh=available.filter(t=>!seen.has(t.id));
 const candidates=fresh.length?fresh:available; // gracefully relax when catalog is exhausted
 if(!candidates.length)throw Error('Not enough QA candidates');
 const pick=draw(candidates,random,t=>{
  const last=rounds.findLastIndex(r=>Array.isArray(r?.[type])&&r[type].includes(t.id));
  const age=last<0?rounds.length+4:rounds.length-1-last;
  let weight=1+Math.min(12,age)*0.5; // long-unchecked gets priority
  if(mode==='recent'&&match(t,purpose))weight*=14;
  if(mode==='regression'&&t.risk)weight*=9;
  return weight;
 });
 return {...pick,mode};
}
export function makePlan({seed,history={rounds:[]},purpose=''}={}){
 if(typeof seed!=='string'||!seed)throw Error('A per-run seed is required');
 const random=randomSource(seed),context=String(purpose).toLowerCase();
 const laneIds=[1,2,3,4,5,6];
 const recentLane=draw(laneIds,random,n=>1+DESIGN[n-1].filter(x=>match(x,context)).length*10);
 const remaining=laneIds.filter(n=>n!==recentLane);
 const regressionLane=draw(remaining,random,n=>1+DESIGN[n-1].filter(x=>x.risk).length*3);
 const design=laneIds.map(lane=>choose(DESIGN[lane-1],history,'design',lane===recentLane?'recent':lane===regressionLane?'regression':'random',context,random));
 const functional=[], modes=['random','random','random','random','recent','regression'];
 for(let i=modes.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[modes[i],modes[j]]=[modes[j],modes[i]];}
 for(const mode of modes)functional.push(choose(FUNCTIONAL,history,'functional',mode,context,random,functional.map(x=>x.id)));
 return {schema:1,seed,design, functional, selection:{random:4,recent:1,regression:1},generatedAt:new Date().toISOString()};
}
export function appendHistory(history,plan,runId){
 const rounds=Array.isArray(history?.rounds)?history.rounds:[];
 return {schema:1,rounds:[...rounds.filter(x=>x?.runId!==runId),{runId,design:plan.design.map(x=>x.id),functional:plan.functional.map(x=>x.id)}].slice(-16)};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=resolve(process.env.ADAPTIVE_QA_STATE_DIR||'qa-state');
 mkdirSync(root,{recursive:true});
 const file=join(root,'history.json');
 let history={rounds:[]};try{if(existsSync(file))history=JSON.parse(readFileSync(file,'utf8'));}catch{throw Error('QA history cache is corrupt');}
 const request=JSON.parse(readFileSync('release/mobile-first-overhaul-request.json','utf8'));
 const runId=String(process.env.GITHUB_RUN_ID||'local');
 const seed=runId+':'+String(process.env.GITHUB_SHA||'local');
 const plan=makePlan({seed,history,purpose:String(request.purpose||'')});
 writeFileSync('qa-adaptive-plan.json',JSON.stringify(plan,null,2)+'\n');
 writeFileSync(file,JSON.stringify(appendHistory(history,plan,runId),null,2)+'\n');
 console.log('Adaptive Gemini QA plan:',JSON.stringify({design:plan.design.map(x=>({lane:x.lane,id:x.id,mode:x.mode})),functional:plan.functional.map(x=>({id:x.id,mode:x.mode}))}));
}
