import {readFileSync,writeFileSync} from 'node:fs';
const live='https://dongjak-walk-safety-preview.pages.dev';
const get=async path=>{const r=await fetch(live+path+'?batch='+process.env.GITHUB_RUN_ID,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Live preflight '+r.status);return r.json();};
const [source,version,history]=await Promise.all(['/release-source.json','/version.json','/ui-autorelease-history.json'].map(get));
if(source.release_status!=='DEPLOYED_PRODUCTION'||source.public_ui_source_commit!=='7e1bcccf5a2ed32ab777f3da619ba4343d123411'||version.version!=='8.9.9')throw Error('Production changed since owner request: inspect before releasing');
const read=p=>JSON.parse(readFileSync(p,'utf8')),write=(p,x)=>writeFileSync(p,JSON.stringify(x,null,2)+'\n');
const pkg=read('package.json'),lock=read('package-lock.json'),log=read('src/app-release-log.json');
if(pkg.version!=='8.9.1')throw Error('Wrong original application source');
const release={version:'8.9.10',date:new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'}),scale:'patch',items:[
 '검색창 내부의 투명 로고 확대, 날씨·더보기 도구 모양 통일 및 안전지도 탭 아이콘 복원.',
 '도보 길찾기 실행 버튼 고정, 추천 경로·장소 확인·시설·교통 창의 하단탭 겹침 개선.',
 '지하철·버스·시설의 공통 소형 헤더, 선택 역 위치 핀 및 지도 중심 보정, 버스 방면·노선 유형 색상 수정.',
 '태블릿을 모바일 공통 창 구조로 재구성하고 PC 정보 영역은 별도 유지.',
 '180ms 테마 전환, 진회색 다크 화면, 창 축소·닫기 모션 및 영어 UI 번역 보완.',
 '지도 설정 범례 중복 제거, 뉴스 필터·새로고침과 시설 연락처·AI 안내 공간 정리.'
]};
const already=new Set(log.releases.map(r=>r.version));
const previous=history.releases.filter(r=>!already.has(r.version)).map(({version,date,items})=>({version,date,scale:'patch',items}));
log.releases=[release,...previous.reverse(),...log.releases];
pkg.version=lock.version=lock.packages[''].version=release.version;
write('package.json',pkg);write('package-lock.json',lock);write('src/app-release-log.json',log);
write('public/ui-autorelease-history.json',history);
write('public/batch-v910-approval.json',{scope:'Remaining 15 UI requests plus subway/facility/bus additions',authorization:'Owner explicitly requested automatic continuation between batches and final Production deployment in the current ChatGPT task.',previous_version:version.version,previous_source:source,source_commit:process.env.GITHUB_SHA});
write('public/release-source.json',{source_commit:process.env.GITHUB_SHA,base_source_commit:process.env.GITHUB_SHA,original_application_source:'efba2be31e7d852a8b09ce98c48385c948659999',previous_source:source,public_ui_source_commit:source.public_ui_source_commit,public_ui_overlay_sha256:source.public_ui_overlay_sha256,application_version:release.version,cloud_auth_embedded:true,profile:'owner-requested-complete-ui-batch',build_run:process.env.GITHUB_RUN_ID,release_status:'CANDIDATE_PREVIEW_NOT_PRODUCTION'});
writeFileSync('/tmp/v910-previous-source.json',JSON.stringify(source));
console.log('Prepared release '+release.version+' from exact deployed v8.9.9');
