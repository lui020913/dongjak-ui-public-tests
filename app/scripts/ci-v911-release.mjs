import {readFileSync,writeFileSync} from 'node:fs';
const live='https://dongjak-walk-safety-preview.pages.dev';
const get=async path=>{const r=await fetch(live+path+'?batch='+process.env.GITHUB_RUN_ID,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Live preflight '+r.status);return r.json();};
const [source,version,history]=await Promise.all(['/release-source.json','/version.json','/ui-autorelease-history.json'].map(get));
if(source.release_status!=='DEPLOYED_PRODUCTION'||source.public_ui_source_commit!=='7e1bcccf5a2ed32ab777f3da619ba4343d123411'||version.version!=='8.9.14'||source.application_version!=='8.9.14'||source.source_commit!=='6fb80f221846f21d9fdc0d84832775f738b6b0cb')throw Error('Production changed since owner request: inspect before releasing');
const read=p=>JSON.parse(readFileSync(p,'utf8')),write=(p,x)=>writeFileSync(p,JSON.stringify(x,null,2)+'\n');
const pkg=read('package.json'),lock=read('package-lock.json'),log=read('src/app-release-log.json');
if(pkg.version!=='8.9.1')throw Error('Wrong original application source');
const previousBatch={version:'8.9.10',date:new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'}),scale:'patch',items:[
 '검색창 내부의 투명 로고 확대, 날씨·더보기 도구 모양 통일 및 안전지도 탭 아이콘 복원.',
 '도보 길찾기 실행 버튼 고정, 추천 경로·장소 확인·시설·교통 창의 하단탭 겹침 개선.',
 '지하철·버스·시설의 공통 소형 헤더, 선택 역 위치 핀 및 지도 중심 보정, 버스 방면·노선 유형 색상 수정.',
 '태블릿을 모바일 공통 창 구조로 재구성하고 PC 정보 영역은 별도 유지.',
 '180ms 테마 전환, 진회색 다크 화면, 창 축소·닫기 모션 및 영어 UI 번역 보완.',
 '지도 설정 범례 중복 제거, 뉴스 필터·새로고침과 시설 연락처·AI 안내 공간 정리.'
]};
previousBatch.date='2026-11-18';
const previousRelease={version:'8.9.11',date:'2026-11-18',scale:'patch',items:['창 열기 페이드 및 바텀시트 이동 애니메이션 복원.','내 정보·더보기의 제자리 페이드 및 중간 프레임 회귀 검증 추가.','모바일 하단 HUD 간격과 더보기 버튼 정리, 지하철·버스·시설 손잡이 중앙 정렬.','교통 창 내용 맞춤 높이, 환승 호선 전환 수정, 버스 두 열과 도착정보 우측 배치.']};
const previousPcRelease={version:'8.9.12',date:new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'}),scale:'patch',items:['모바일 상단 기능 버튼을 소형 동일 규격으로 정리하고 스와이프 방향 안내 추가.','하단탭·TIP·실제 축척바를 한 기준으로 하향 배치하고 안전 영역 여백 조정.','창 전환 시 이전 창과 HUD의 중복 모션을 방지하고 독립 창 열기·닫기 동작 정리.','더보기 메뉴와 대중교통·시설 상세의 버튼, 그룹, 여백 및 정보 정렬 개선.','행정동 버튼명, 날씨 아이콘, 버스 ARS 번호 및 운행 종료 표시 보완.','PC 검색·설정·사이드바 정렬과 공통 상세창 개선.','안전·공공시설 우선 표시 및 상업시설 카테고리, 시설 픽토그램 적용.']};
const previousCurrentRelease={version:'8.9.13',date:'2026-11-18',scale:'patch',items:['PC 공통 라이트·다크 색상, 헤더, 버튼, 여백 및 폰트 규격 정비.','PC 프로필·길찾기·보행안전·설정·뉴스·업데이트·조작 안내 레이아웃 개선.','교통 상세창의 다크 배경 충돌과 버스 카드 가림 방지.','온보딩 그림 정렬과 시설 분류·교통 필터 개선.','야간 시야의 일반 시설 마커·라벨 격리 및 종료 시 표시 상태 복원.']};
const release={version:'8.9.14',date:new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'}),scale:'patch',items:['모바일·터치 태블릿의 안전시설·공공시설·생활편의·음식점·카페·교통 카테고리를 기존 상단 기능 버튼에 통합해 중복 영역 제거.','상단 기능 버튼 좌우 스와이프 경계에 라이트·다크 테마 대응 블러 오버레이를 적용해 가장자리 잘림 완화.','기존 시설 필터·교통 토글·접근성 상태와 PC 전용 카테고리 행 동작 보존.','상단 버튼 통합과 좌우 스와이프 회귀 테스트 추가.','모바일 최초 진입 시 주요 지도 기능부터 표시하고 이후 사용자의 스크롤 위치 유지.','모바일 더보기 제목, 팝업 닫기 버튼·본문 스크롤, 길찾기 입력부 및 고정 버튼 정돈.','온보딩 본문 공백, 축척바·좁은 지하철 도착정보 및 뉴스 카드 가독성 보완.']};
const already=new Set(log.releases.map(r=>r.version));
const previous=history.releases.filter(r=>!already.has(r.version)).map(({version,date,items})=>({version,date,scale:'patch',items}));
log.releases=[...new Map([...log.releases,...previous,...[previousBatch,previousRelease,previousPcRelease,previousCurrentRelease,release]].map(r=>[r.version,r])).values()].sort((a,b)=>b.version.localeCompare(a.version,undefined,{numeric:true}));
pkg.version=lock.version=lock.packages[''].version=release.version;
write('package.json',pkg);write('package-lock.json',lock);write('src/app-release-log.json',log);
write('public/ui-autorelease-history.json',history);
write('public/batch-v911-candidate.json',{scope:'Mobile/tablet top-toolbar integration and phone presentation fixes; Preview only',previous_version:version.version,source_commit:process.env.GITHUB_SHA});
write('public/release-source.json',{source_commit:process.env.GITHUB_SHA,base_source_commit:process.env.GITHUB_SHA,original_application_source:'efba2be31e7d852a8b09ce98c48385c948659999',previous_source:source,public_ui_source_commit:source.public_ui_source_commit,public_ui_overlay_sha256:source.public_ui_overlay_sha256,application_version:release.version,cloud_auth_embedded:true,profile:'mobile-poi-toolbar-integration',build_run:process.env.GITHUB_RUN_ID,release_status:'CANDIDATE_PREVIEW_NOT_PRODUCTION'});
writeFileSync('/tmp/v910-previous-source.json',JSON.stringify(source));
console.log('Prepared release '+release.version+' from exact deployed v8.9.13');
