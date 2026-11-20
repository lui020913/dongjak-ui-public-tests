/** User-facing historical release catalog; does not alter a build or deployment version.
 * Boundaries refer to audited source positions or actual operational versions.
 * Chronology is the supplied catalog order (not estimated dates).
 */
export const HISTORY_GENERATIONS=Object.freeze([
 {major:1,firstPosition:1,title:'지도 기반 구축·실시간 교통·보행 경로'},
 {major:2,firstPosition:23,title:'좌표 기반 교통·시설·지역 서비스'},
 {major:3,firstPosition:42,title:'통합 지도·야간 시야·건물 차폐 분석'},
 {major:4,firstPosition:63,title:'홈 화면 웹앱·공식 데이터·GPS 안내'},
 {major:5,firstPosition:93,title:'내비게이션·플랫폼 UI·공통 디자인 체계'},
 {major:6,firstPosition:140,title:'계정·즐겨찾기·개인화·경로 비교'},
 {major:7,firstPosition:168,title:'시설 데이터·온보딩·검색·모바일 안정화'},
 {major:8,firstVersion:'9.0.0',title:'모바일 중심 운영·공통 창·APK'},
 {major:9,firstVersion:'9.2.28',title:'실시간 버스·열차·AI 검색·커뮤니티·PRI'}
]);
const tuple=value=>{const m=String(value||'').match(/^v?(\d+)\.(\d+)\.(\d+)$/);return m?m.slice(1).map(Number):null};
const atLeast=(value,threshold)=>{const a=tuple(value),b=tuple(threshold);if(!a||!b)return false;for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]>b[i]}return true};
export function historyGeneration(record,review){
 const position=review?.position;
 if(Number.isInteger(position))return HISTORY_GENERATIONS.filter(g=>g.firstPosition!==undefined&&g.firstPosition<=position).at(-1)||HISTORY_GENERATIONS[0];
 const version=record?.version;
 return HISTORY_GENERATIONS.filter(g=>g.firstVersion&&atLeast(version,g.firstVersion)).at(-1)||HISTORY_GENERATIONS[6];
}
/** Returns grouped, newest-first records. Maintains identities, notes, source
 * order and original release numbers while assigning a catalog-only SemVer. */
export function buildGenerationCatalog(releases,reviewRelease){
 if(!Array.isArray(releases)||typeof reviewRelease!=='function')throw new TypeError('release catalog and review function required');
 const groups=new Map();let active=0,minor=0,patch=0;
 for(const record of [...releases].reverse()){
  const review=reviewRelease(record),phase=historyGeneration(record,review);
  const major=Math.max(active,phase.major); // never renumber backwards on an old label
  const sourceScale=review?.scale||record.scale||'patch';
  let classification;
  if(major!==active){active=major;minor=0;patch=0;classification='major';}
  else if(sourceScale==='minor'||sourceScale==='major'){minor++;patch=0;classification='minor';}
  else{patch++;classification='patch';}
  const group=groups.get(major)||{label:`${major}.x`,title:HISTORY_GENERATIONS[major-1].title,historical:true,records:[]};
  group.records.push({record,classification,sourceScale,displayVersion:`v${major}.${minor}.${patch}`});groups.set(major,group);
 }
 return [...groups.values()].reverse().map(group=>({...group,records:group.records.reverse()}));
}
