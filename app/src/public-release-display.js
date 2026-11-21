/** User-facing pre-release identity; operational SemVer and Git provenance remain private metadata. */
export const PUBLIC_APP_VERSION='1.0';
export const PUBLIC_LOADING_VERSION='버전 '+PUBLIC_APP_VERSION;
export const CHANGE_TYPE_GROUPS=Object.freeze([
  {id:'major',title:'주요 개편',description:'기능 구조와 핵심 이용 흐름의 큰 변화'},
  {id:'feature',title:'기능 추가·개선',description:'새로 추가되거나 확장된 기능'},
  {id:'design',title:'디자인·사용성',description:'화면 구성, 글씨, 아이콘, 애니메이션과 조작'},
  {id:'fix',title:'오류 수정·안정화',description:'오류 해결, 속도, 데이터·서비스 안정성'}
]);
export function classifyReleaseNote(note,scale='patch'){
  const text=String(note||'');
  if(scale==='major')return 'major';
  if(/디자인|글래스|아이콘|애니메이션|페이드|레이아웃|색상|폰트|글꼴|크기|헤더|바텀시트|하단탭|간격|정렬|UI|UX|화면|버튼/i.test(text))return 'design';
  if(scale==='minor')return 'feature';
  return 'fix';
}
