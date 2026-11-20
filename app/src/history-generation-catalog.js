/** User-facing historical release catalog; does not alter a build or deployment version.
 * Boundaries refer to audited source positions or actual operational versions.
 * Chronology is the supplied catalog order (not estimated dates).
 */
export const HISTORY_GENERATIONS=Object.freeze([
 {major:1,firstPosition:1,title:'지도 기본 구조와 실시간 교통'},
 {major:2,firstPosition:8,title:'보행안전 시설·동작구 공간정보'},
 {major:3,firstPosition:23,title:'지역 생활시설·교통 심볼 확장'},
 {major:4,firstPosition:42,title:'지도 레이아웃 통합'},
 {major:5,firstPosition:46,title:'야간 시야 분석과 지도 표현'},
 {major:6,firstPosition:49,title:'지도 이용 안내·웹앱·공식 데이터'},
 {major:7,firstPosition:86,title:'GPS·도보경로·모바일 인터페이스'},
 {major:8,firstPosition:133,title:'공통 디자인·개인화·교통 안정화'},
 {major:9,firstVersion:'9.0.0',title:'모바일 중심 운영·실시간 교통·AI·커뮤니티'}
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
  // Catalog stages are editorial groupings, not real application versions.
  // Every 9.x operational release MUST retain the exact shipped SemVer.
  // Only archival pre-9.x records retain their documented retrospective labels.
  const actualVersion=String(record?.version||'').replace(/^v/,'');
  const operational=/^9\.\d+\.\d+$/.test(actualVersion);
  // The update HISTORY has two components: v1.0 … v9.2.
  // The underlying SemVer (e.g. 9.2.51) is kept unchanged on record.version.
  const editorialLabel=review?.historical&&/^\d+\.\d+$/.test(String(review.label||''))
    ?String(review.label)
    :operational?actualVersion.split('.').slice(0,2).join('.'):`${major}.${minor}`;
  const displayVersion='v'+editorialLabel;
  const displayMajor=Number(editorialLabel.split('.')[0]);
  const category=groups.get(displayMajor)||{label:`${displayMajor}.x`,
    title:HISTORY_GENERATIONS[displayMajor-1]?.title||'업데이트 기록',historical:true,records:[]};
  category.records.push({record,classification:operational?sourceScale:classification,
    sourceScale,displayVersion,operational,actualVersion});
  groups.set(displayMajor,category);
  // Drop the provisional category created above when the review-defined
  // historical phase belongs to a different, audited feature generation.
  if(displayMajor!==major&&!groups.get(major)?.records.length)groups.delete(major);
 }
 return [...groups.values()].reverse().map(group=>({...group,records:group.records.reverse()}));
}
