import {PUBLIC_APP_VERSION} from './public-release-display.js';
// Historical editions are retained for internal provenance; user-facing UI is unnumbered.
export const HISTORICAL_EDITIONS=Object.freeze([
 [1,'1.0','지도 기본 구조'],[3,'1.1','실시간 대중교통 연동'],[5,'1.2','검색·도로폭·공간정보'],
 [8,'2.0','보행안전시설 및 반응형 지도'],[9,'2.1','지도 조작·교통·생활시설'],[15,'2.2','행정동 선택 및 GPS'],[18,'2.3','랜드마크와 교통 데이터 확장'],[20,'2.4','환승역·도착정보 통합'],[22,'2.5','일반·경사 회피 보행경로'],
 [23,'3.0','좌표 기반 교통 심볼'],[32,'3.1','모바일 지도 헤더'],[34,'3.2','교통약자·주변정보·주민제보'],[38,'3.3','지역소식 및 생활시설'],[40,'3.4','시설 상세정보와 AI 설명'],
 [42,'4.0','지도 레이아웃 통합'],[46,'5.0','야간 시야 분석'],[47,'5.1','야간 모드 및 분석 조작'],
 [49,'6.0','건물 차폐 기반 야간 분석'],[63,'6.1','지도 안내·장소 정보'],[69,'6.2','홈 화면 웹앱 및 모바일 메뉴'],[76,'6.3','시설 AI 설명 서비스'],[84,'6.4','공식 교통·도로 데이터'],
 [86,'7.0','제한속도·안전정보 도구'],[88,'7.1','시간표와 출발·도착 연계'],[92,'7.2','GPS·음성 보행 안내'],[93,'7.3','플로팅 내비게이션과 교통 UI'],[99,'7.4','PC 도구 레일·모바일 안정화'],[109,'7.5','공식 시간표와 지도 도구'],[117,'7.6','독립 UI 재구성'],[119,'7.7','모바일 UI 분리'],[125,'7.8','플랫폼별 빌드와 PWA'],[130,'7.9','공통 설정·교통 UX'],
 [133,'8.0','통합 UI 디자인 시스템'],[140,'8.1','계정·즐겨찾기·카카오 로그인'],[149,'8.2','보행경로 비교·주변 안전·실시간 교통'],[158,'8.3','개인화·리뷰·길찾기 흐름'],[168,'8.4','공식 시설 데이터 및 통합 검색'],[172,'8.5','플랫폼 레이아웃·언어 설정'],[176,'8.6','온보딩과 대중교통 공유'],[181,'8.7','시설 상세 및 공통 창 동작'],[190,'8.8','시설 검색·설정 및 모바일 안정화'],[201,'8.9','실측 현황의 보차혼용도로 데이터']
]);
// Operational history has 66 entries as of v8.26.1. Use stable original labels,
// not date sorting (some archived dates differ) or mutable array offsets.
const operationalVersions=('8.0.4 8.0.5 8.0.6 8.1.0 8.1.1 8.1.2 8.1.3 8.2.0 8.3.0 8.3.1 8.3.2 8.3.3 8.4.0 8.5.0 8.6.0 8.6.1 8.6.2 8.6.3 8.6.4 8.6.5 8.6.6 8.7.0 8.8.0 8.8.1 8.8.2 8.8.3 8.9.0 8.10.0 8.10.1 8.11.0 8.11.1 8.12.0 8.13.0 8.13.1 8.14.0 8.15.0 8.15.1 8.15.2 8.16.0 8.17.0 8.17.1 8.18.0 8.18.1 8.19.0 8.20.0 8.20.1 8.20.2 8.20.3 8.20.4 8.21.0 8.21.1 8.21.2 8.21.3 8.22.0 8.22.1 8.22.2 8.23.0 8.23.1 8.23.2 8.23.3 8.24.0 8.24.1 8.25.0 8.25.1 8.26.0 8.26.1').split(' ');
const operationalPosition=new Map(operationalVersions.map((v,i)=>[v,137+i]));
// Explicit reviewed exceptions. Unchanged classes retain the already-audited
// source scale. No operational historical version is rewritten.
const overrides=Object.freeze({
 7:'minor',32:'patch',37:'minor',47:'minor',48:'minor',60:'minor',61:'patch',
 63:'minor',66:'minor',67:'minor',80:'minor',83:'patch',84:'minor',85:'minor',
 86:'minor',106:'minor',125:'major',129:'minor',
 137:'minor',157:'minor',160:'minor',164:'patch',171:'patch',186:'patch',199:'patch'
});
export function releaseEdition(release){
 const version=String(release?.version||'').replace(/^v/,'');
 const position=Number.isInteger(release?.sourcePosition)&&release.sourcePosition>=1&&release.sourcePosition<=136?release.sourcePosition:operationalPosition.get(version);
 if(position){
  const group=HISTORICAL_EDITIONS.findLast(g=>g[0]<=position);
  return {label:group[1],title:group[2],historical:true,position,scale:overrides[position]||release.scale||'patch'};
 }
 return {label:version,title:'정식·개발 버전',historical:false,position:null,scale:release.scale||'patch'};
}
export function groupReleaseEditions(releases){
 const map=new Map();
 for(const record of releases){
  const edition=releaseEdition(record);
  const key=(edition.historical?'history:':'release:')+edition.label;
  if(!map.has(key))map.set(key,{...edition,records:[]});
  map.get(key).records.push({record,classification:edition.scale});
 }
 return [...map.values()];
}
export function deploymentVersionLabel(version,marker){
 const plain=String(version||'').replace(/^v/,'');
 const edition=releaseEdition({version:plain}).label;
 if(marker?.application_version!==plain)return edition+' · 개발 빌드';
 if(marker.release_status==='DEPLOYED_PRODUCTION')return edition;
 if(marker.release_status==='CANDIDATE_PREVIEW_NOT_PRODUCTION'){
  if(marker.release_channel==='rc')return edition+' RC'+(Number.isInteger(marker.rc_number)&&marker.rc_number>1?' '+marker.rc_number:'');
  if(Number.isInteger(marker.beta_number)&&marker.beta_number>0)return edition+' Developer Beta '+marker.beta_number;
  return edition+' Developer Beta';
 }
 return edition+' · 개발 빌드';
}
export async function syncPublicVersion({version,doc=document,win=window,currentHeader=null}){
 const clean=String(version||'').replace(/^v/,'');
 const labels={
  'version-history-trigger':'업데이트',
  'dj-guide-latest-version':'분류별 내역',
  'dj-about-version-number':PUBLIC_APP_VERSION
 };
 for(const [id,label] of Object.entries(labels)){
  const node=doc.getElementById(id);
  if(node){node.textContent=label;node.dataset.buildVersion=clean;}
 }
 if(currentHeader)currentHeader.textContent='최근 업데이트';
 if(doc.title.includes('동작하는 안전지도'))doc.title='동작하는 안전지도 · 보행안전 지도';
 // Exact deployment/build identifiers remain available in release-source.json,
 // but are never converted into prominent user-visible version labels.
 return {publicVersion:PUBLIC_APP_VERSION,internalVersion:clean};
}
