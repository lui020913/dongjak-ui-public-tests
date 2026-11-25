/** User-facing pre-release identity; operational SemVer and Git provenance remain private metadata. */
export const PUBLIC_APP_VERSION='1.0';
export const PUBLIC_LOADING_VERSION='버전 '+PUBLIC_APP_VERSION;
export const CHANGE_TYPE_GROUPS=Object.freeze([
  {id:'major',title:'주요 개편',description:'기능 구조와 핵심 이용 흐름의 큰 변화'},
  {id:'feature',title:'기능 추가·개선',description:'새로 추가되거나 확장된 기능'},
  {id:'design',title:'디자인·사용성',description:'화면 구성, 글씨, 아이콘, 애니메이션과 조작'},
  {id:'fix',title:'오류 수정·안정화',description:'오류 해결, 속도, 데이터·서비스 안정성'}
]);
/** Keep internal build identifiers in data attributes, never in user-facing notes. */
export function publicReleaseNote(note,internalVersion=''){
  let value=String(note??'');
  const version=String(internalVersion||'').replace(/^v/i,'');
  if(!/^\d+\.\d+\.\d+$/.test(version))return value;
  for(const tag of ['('+version+')','(v'+version+')','（'+version+'）','（v'+version+'）','['+version+']','[v'+version+']'])value=value.replaceAll(tag,'');
  for(const prefix of [version+' ', 'v'+version+' ',version+': ','v'+version+': '])if(value.startsWith(prefix)){value=value.slice(prefix.length);break;}
  return value.replace(/\s{2,}/g,' ').trim();
}
export function classifyReleaseNote(note,scale='patch'){
  const text=String(note||'');
  if(scale==='major')return 'major';
  if(/디자인|글래스|아이콘|애니메이션|페이드|레이아웃|색상|폰트|글꼴|크기|헤더|바텀시트|하단탭|간격|정렬|UI|UX|화면|버튼/i.test(text))return 'design';
  if(scale==='minor')return 'feature';
  return 'fix';
}


/** The original release ledger stays immutable. Only the public presentation
 * discards repetitive generated placeholders and developer-only notes. */
export function cleanHistoryNote(note,version=''){
  const text=publicReleaseNote(note,version).replace(/\s+/g,' ').trim();
  if(!text||/^모바일 안정성 및 상호작용 개선(?:\s*\([^)]*\))?[.!]?$/.test(text))return '';
  if(/Production\s*미배포|검증용\s*Preview|개발\s*빌드|회귀\s*(?:테스트|검사|검증)|소스\s*CI|GitHub Release|커밋 SHA|해시 기반|검증 인프라|배포\s*(?:게이트|파이프라인)|패치 파일의 src|릴리스 태그/.test(text)){
    // A mixed note may describe a real feature before a separate internal clause.
    // Preserve that clause, but never display the engineering appendix.
    const parts=text.split(/[;；]/).filter(part=>! /Production\s*미배포|Preview|개발\s*빌드|회귀\s*(?:테스트|검사|검증)|소스\s*CI|GitHub Release|커밋 SHA|해시 기반|검증 인프라|배포\s*(?:게이트|파이프라인)|패치 파일의 src|릴리스 태그/.test(part));
    return parts.join(' · ').trim();
  }
  if(/^(?:PR\s*#?\d+|CI\b|빌드\b|배포\b|원본.*이력.*보존|기존.*(?:기능|데이터|API).*(?:유지|변경 없음))/.test(text))return '';
  return text;
}
export const PUBLIC_HISTORY_HIGHLIGHTS=Object.freeze({
  major:[
    {match:/동작구 경계.*(?:건물|길찾기)|기본.*지도.*구축/,text:'동작구 지도와 보행 경로를 한 화면에서 이용할 수 있도록 구성했습니다.'},
    {match:/야간 시야|건물 차폐/,text:'상도1동 야간 보행환경과 조명 취약 구간을 지도에서 살펴볼 수 있습니다.'},
    {match:/독립 전체화면 전환/,text:'길찾기, 커뮤니티, 동작 소식과 내 정보를 각각 독립된 화면으로 구성했습니다.'}
  ],
  feature:[
    {match:/경사 회피|경사.*비교/,text:'보행 경로와 경사 회피 경로를 비교할 수 있습니다.'},
    {match:/공식 운행 경로|경유 정류소|실시간 열차/,text:'버스 운행 경로·경유 정류소와 실시간 열차 정보를 확인할 수 있습니다.'},
    {match:/공개 커뮤니티|AI 게시글.*신고/,text:'동네 게시판에서 게시글을 작성하고 신고·알림 기능을 이용할 수 있습니다.'},
    {match:/즐겨찾기/,text:'자주 이용하는 장소를 즐겨찾기에 저장하고 관리할 수 있습니다.'},
    {match:/음성 검색|AI 대화/,text:'AI 장소 검색과 음성 검색을 제공합니다.'},
    {match:/PRI 6개 지표/,text:'잠재 보행위험도(PRI)와 상도1동 조명 취약도를 지도에서 확인할 수 있습니다.'}
  ],
  design:[
    {match:/하단.*(?:탭|도크|바)|하단탭/,text:'하단 메뉴와 화면 전환을 일관되게 정리했습니다.'},
    {match:/다크모드|다크 테마|라이트.*다크/,text:'밝은 테마와 어두운 테마에서 지도와 정보의 가독성을 개선했습니다.'},
    {match:/정보창.*(?:높이|레이아웃)|바텀시트|패널.*드래그/,text:'정보창의 크기와 배치, 펼치기·접기 동작을 개선했습니다.'},
    {match:/글자 크기|글꼴 크기|글자.*굵기/,text:'글자 크기와 굵기, 버튼 및 아이콘의 가독성을 개선했습니다.'}
  ],
  fix:[
    {match:/실시간.*(?:연결|안정)|호출 제한|도착정보.*오류/,text:'대중교통 정보 조회와 오류 안내를 개선했습니다.'},
    {match:/지도.*(?:복구|재렌더|안정)|iOS PWA 복귀/,text:'지도 로딩과 화면 복귀 시 발생하는 오류를 개선했습니다.'},
    {match:/알림창|알림 아래|알림 화면/,text:'커뮤니티 알림에 일반 게시물이 함께 표시되는 문제를 수정했습니다.'},
    {match:/닫을 때.*(?:크기|확대)|상세창.*크기.*고정/,text:'교통정보 상세창이 닫힐 때 크기와 위치가 갑자기 변하는 문제를 개선했습니다.'}
  ]
});
export function historyHighlights(type,notes){
  return (PUBLIC_HISTORY_HIGHLIGHTS[type]||[]).filter(entry=>notes.some(note=>entry.match.test(note))).map(entry=>entry.text);
}
