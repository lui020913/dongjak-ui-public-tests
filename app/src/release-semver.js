/**
 * Retrospective three-part versioning for the Dongjak map (2026-11-12).
 * SOURCE histories retain their original labels, order and notes. This adapter
 * renumbers EACH recorded release in chronological order, including both
 * entries once labeled v7.0.25. It never merges, skips or invents old releases.
 *
 * MAJOR: new core mapping subsystem, substantial architectural or analysis shift.
 * MINOR: new user workflow, functional module or broad interaction redesign.
 * PATCH: local bug fix, style/detail, data or reliability refinement.
 *
 * Historical labels are editorial reclassifications, NOT evidence of deployment.
 */
export const VERSION_POLICY = Object.freeze({
  major: '기본 구조·핵심 분석체계의 대규모 변경',
  minor: '사용자 기능·서비스 또는 UI 흐름의 중간 규모 변경',
  patch: '오류 수정·표시 보정·안정화 등 소규모 변경'
});

const MAJOR = new Set([
  'v3.0',     // safety facilities, dark theme, responsive map
  'v5.3',     // metro map markers refactored into geographic map layers
  'v5.10.0',  // central map layout core and overlay coordination
  'v5.11.0',  // night lighting analysis subsystem
  'v5.12.0',  // building-occlusion precomputed analysis subsystem
  'v7.0'      // speed signs + protected safety analysis map workflow


]);
const MINOR = new Set([
  'v1.2','v2.0','v2.1','v3.1','v3.2','v3.3',
  'v4.0','v4.3','v4.4','v5.0','v5.2','v5.4',
  'v5.9.3','v5.9.5','v5.9.9','v5.9.11',
  'v6.0.7','v6.0.15','v6.0.16','v6.1.0',
  'v7.0.1','v7.0.2','v7.0.4','v7.0.6','v7.0.7',
  'v7.0.13','v7.0.23',
]);

export const REBUILT_RELEASES = Object.freeze([
  { sourceVersion:'v7.0.29-R1', scale:'patch', items:[
    '정상 기준 v7.0.29의 지도 생성·로딩·교통 데이터 코드를 변경하지 않고 R1 UI를 별도 구현',
    'PC 검색 버튼·메뉴 내부 스크롤, 모바일 줄바꿈·메뉴 높이 및 테마 전환 효과 정리',
    '브라우저 화면 진단을 별도 스크립트로 제공'
  ]},
  { sourceVersion:'v7.0.29-R2', scale:'minor', items:[
    'R1 기반으로 기존 v7.0.30 화면 개선 요청을 신규 UI 모듈로 재설계',
    'PC 검색·교통 패널 정렬, 7호선 및 환승 노선색 강조, 모바일 5개 탭 반응형 조정',
    '모바일 지도 옵션 옆 업데이트 바로가기 신설, 전체 내역 창 재사용 및 테마 효과 개선',
    '기존 지도 초기화 및 교통정보 데이터 로딩 소스는 R1과 동일하게 유지'
  ]},
  { sourceVersion:'버전 체계 재정비', scale:'patch', items:[
    '최초 v1.0부터 모든 보존 릴리스를 대규모·기능·소규모 변경의 3단계 버전 번호로 소급 재분류',
    '중복 구버전 표기(v7.0.25)도 별도 릴리스로 보존하고 총변경사항 누락 없이 새 번호 부여',
    '웹 화면·모바일 업데이트 내역·패키지·배포 버전·검증 도구의 새 버전 표기 통일',
    '이전 버전 대조표와 원문 보관 기록을 제공하고 앞으로의 버전 증가 규칙을 문서화'
  ]},
  { sourceVersion:'모바일 UI 독립 재설계', scale:'minor', items:[
    'PC 화면과 지도 엔진을 변경하지 않고 모바일 699px 이하 전용 상단 검색·도구 UI 분리',
    'iOS 상단 안전 영역에 불투명 배경을 깔아 지도 이미지가 시스템 흐림 영역에 비치는 현상 완화',
    '지도 옵션·보행안전·더보기 3개 버튼으로 상단 도구 정리하고 야간 시야·업데이트·날씨를 추가 메뉴에 통합',
    '검색어 입력 16px 유지, 모바일 작은 화면 검색 영역 확장, 탭 표시 대비 개선'
  ]},
  { sourceVersion:'모바일 상단 고정바 후속 조정', scale:'patch', items:[
    '모바일 상단 검색창 뒤의 넓은 흰 배경을 투명화하고 iOS 안전영역 불투명 배경 높이를 최소화해 검색창 뒤 흰 띠를 완화',
    '모바일 상단 도구를 지도 옵션·보행안전·야간 시야·원형 더보기 1줄 구조로 재배치하고 겹쳐 보이던 업데이트 버튼 노출을 제거',
    '야간 시야 빠른 버튼을 독립 플로팅이 아니라 상단 1줄 도구의 세 번째 버튼으로 통합',
    '길찾기·커뮤니티·동작 소식·내 기록 등 모바일 주요 탭에서도 상단 도구 4개를 유지하고 지도 탭이 아닐 때는 더 어두운 톤으로 표시',
    '모바일 탭 전환 시 검색창이 상단 흰색 안전영역 레이어 뒤로 겹쳐 보이던 위치 충돌을 조정'
  ]},
  { sourceVersion:'모바일 상단 iOS·테마·메뉴 보정', scale:'patch', items:[
    '모바일에서 중복 업데이트 버튼을 실제 DOM에서 정리하고 전체 변경 이력은 더보기 메뉴를 통해 유지',
    'iOS 홈 화면 앱 상태 표시줄을 지도와 겹치도록 설정하고 검색창 뒤 앱 자체 흰 배경과 블러 효과를 제거',
    '길찾기·커뮤니티·동작 소식·내 기록 탭에서도 검색창의 세로 위치를 동일하게 고정',
    '지도 이외 탭에서도 라이트 모드는 밝은 버튼, 다크 모드는 어두운 버튼을 사용하도록 잘못된 강제 어두운 스타일 수정',
    '지도 옵션·보행안전 메뉴를 열면 모바일 검색창 및 안전 영역에도 지도와 같은 투명도 36%의 어두운 배경 적용'
  ]},
  { sourceVersion:'iOS 홈 화면 상단 색상 연속성 보정', scale:'patch', items:[
    'iOS 홈 화면 PWA의 오래된 검정 반투명 상태표시줄 선언을 제거하고 앱 지도 톤과 일치하는 네이티브 상태표시줄 색상 설정',
    '지도 상단을 배경색에서 실제 지도 쪽으로 완만하게 이어지는 모바일 전용 비블러 그러데이션으로 조정',
    '검색창 본체는 라이트 모드 불투명 흰색, 다크 모드 불투명 짙은색을 유지하고 검색 텍스트·로고에 흐림 필터가 적용되지 않도록 분리',
    '홈 화면 iPhone에서만 작동하고 PC·Safari 일반 탭의 레이아웃과 지도 초기화 코드를 변경하지 않도록 분리'
  ]},
  { sourceVersion:'모바일 상단 도구 위치·겹침 수정', scale:'patch', items:[
    '구형 모바일 버튼의 고정 위치 규칙과 중첩되지 않도록 독립된 가로 도구 행으로 지도옵션·보행안전·야간시야·날씨·더보기를 정렬',
    '원본 버튼은 기존 지도·야간 시야 이벤트를 그대로 유지하고 모바일 전용 대리 버튼에서 호출',
    '버튼을 누르면 해당 아이콘과 명칭을 함께 표시하며 화면 너비 320px에서도 다섯 버튼이 겹치지 않도록 반응형 너비 적용'
  ]},
  { sourceVersion:'모바일 검색·테마 전환 사용성 보정', scale:'patch', items:[
    '검색창 로고와 입력 글씨 사이의 좁은 여백을 확대하고 구분선을 테마에 맞게 조정',
    '모바일 검색창 입력·추천장소 표시 중에는 도구 버튼 행을 임시 숨겨 장소 목록과 버튼의 겹침을 제거',
    '야간 시야를 기존 달 모양 대신 별이 포함된 새로운 윤곽 아이콘으로 변경',
    '수동 테마 전환 시 지도 스타일의 렌더링 완료(idle)를 확인하고 최소 안정화 시간을 거쳐 모바일 화면 흐림을 해제, 렌더링 지연에는 안전 해제 제한시간 적용',
    '모바일 전용 스타일로 PC 검색창·테마·지도 기능을 유지'
  ]},
  { sourceVersion:'플랫폼별 소스와 배포 체계 분리', scale:'minor', items:[
    'iOS 홈 화면 PWA, PC Chromium, Android Capacitor의 실행 환경을 분리하고 공통 MapLibre 지도·교통 코드는 단일 소스로 유지',
    '플랫폼별 빌드 명령어와 산출물 폴더를 분리하여 PC 전용 빌드에서 모바일 UI를 제외하고 Android 패키지에서 iOS PWA 전용 처리를 제외',
    '사용하지 않는 과거 패치 스크립트·중복 원본·시험용 HTML을 실행 프로젝트에서 정리하고 조사 원본은 별도 자료 보관본으로 분리',
    '기존 지도 초기화와 데이터 로딩을 보존하고 플랫폼 진입점·회귀 테스트·클린 설치 안내를 추가'
  ]},
  { sourceVersion:'모바일 탭 플로팅 UI·테마 일관성 보정', scale:'patch', items:[
    '길찾기·커뮤니티·동작 소식·내 기록의 제목과 닫기 버튼을 고정하고 스크롤 영역을 본문으로 분리',
    '모바일 플로팅 제목에 하단 탭 아이콘을 표시하고 길찾기 제목 뒤 흰 배경·뉴스 다크 테마 흰 사각형을 제거',
    '안전지도 탭에서 기존 행정동 선택창으로 바로 진입하도록 연결하고 안전정보 시범자료 안내 문구 삭제',
    '내 기록 숫자 및 통계 카드·빈 목록·소식 콘텐츠에 라이트·다크 전용 배경과 글자 대비 적용',
    'iOS 홈 화면 PWA 상태표시줄 배경색을 실제 앱 테마와 동기화하며 신규 설치 시 라이트 테마 초기값 유지'
  ]},
  { sourceVersion:'모바일 단일 플로팅·높이·테마 전환 개선', scale:'patch', items:[
    '안전지도에서 행정동 선택창을 열 때 이전 안전정보 창을 함께 열던 문제를 제거해 플로팅 중복 방지',
    '길찾기·커뮤니티·소식·내 기록의 고정 제목·닫기 버튼은 유지하면서 창 높이를 행정동 선택창 수준으로 축소',
    'iOS PWA 라이트·다크 상단 배경과 색상 체계 힌트를 앱 테마에 연결하되 iOS 시스템 영역은 OS 제약 가능성을 별도 안내',
    '모바일 수동 테마 전환 중 흐림 강도를 높이고 화면 중앙에 테마 전환 중 안내를 표시',
    '지도·교통 API 및 데스크톱 Chromium 화면은 변경하지 않음'
  ]},
  { sourceVersion:'iOS PWA 테마·행정동 선택창·플로팅 충돌 개선', scale:'patch', items:[
    'iOS 홈 화면 PWA에서 테마를 직접 전환할 때 입력·안내 작업이 없으면 저장된 테마를 이용한 초기 색상 재적용을 위해 1회 새로고침 시도',
    '행정동 선택창도 기존 네 탭과 동일한 고정 제목·닫기 버튼 및 스크롤 본문 구조로 변경',
    '행정동 선택창의 높이·테두리·하단 탭 간격·라이트/다크 색상을 모바일 플로팅 창과 통일',
    '더보기 팝오버를 열 때 다른 플로팅 창을 일시적으로 숨기고 닫으면 기존 창으로 되돌려 중복 표시 방지',
    'PC 지도 엔진·교통 API·Android 테마 전환 방식은 그대로 보존'
  ]},
  { sourceVersion:'모바일 PWA 전환·조작 도구·앱 아이콘 개선', scale:'patch', items:[
    'iOS 홈 화면 PWA에서 테마 변경 시 전환 화면을 새로고침 전후에 유지하고 야간 시야 복원 시에도 동일한 전환 화면을 표시',
    '행정동 선택 및 기타 하단 탭 창의 정렬 규칙을 유지하고 모바일 지도 조작에 도움말·홈·나침반·GPS 버튼 추가',
    '모바일 더보기에서 중복 야간 시야 및 날씨 재조회·내 위치 날씨 보기 버튼 삭제',
    '지도 옵션에서 업데이트 내역 바로가기 제거, 업데이트 기록 화면의 버전 수·변경사항 수 통계 삭제',
    '사용자 제공 라이트·다크 앱 아이콘을 홈 화면·PWA 매니페스트·최초 로딩 및 브랜드 아이콘에 반영'
  ]},
  { sourceVersion:'모바일·PC 지도 조작 및 교통 패널 UX 재설계', scale:'minor', items:[
    '모바일 브랜드 아이콘을 별도 원형 장식 없이 표시하고 터치하면 서비스명 확장·검색 입력 폭 축소 애니메이션 제공',
    '테마 및 야간 시야 전환에 지도 블러·중앙 로딩 스피너·진행 안내를 적용하고 iOS PWA 새로고침 전후 색상 초기화 시점 조정',
    '모바일 우측 지도 조작 아이콘을 PC 원본 SVG와 동일하게 표시하고 모바일 정보 패널의 본문 공간을 효율적으로 사용',
    'PC 지도 옵션을 기준으로 버튼 스타일·글꼴 크기를 통일하고 지도 조작 안내 버튼을 모든 하단 탭에서 유지',
    'PC 환승역의 노선 배지를 누르면 해당 노선으로 전환하고 이전역·다음역 정보는 현재 선택된 노선만 표시',
    'PC 교통 패널을 왼쪽 탐색 탭에 맞춰 고정하고 업데이트 이력·도로폭 범례의 진입 및 콘텐츠 전환 애니메이션 개선'
  ]},
  { sourceVersion:'지도 설정 공통화 및 전환·야간 시야 UX 개편', scale:'minor', items:[
    '모바일 앱 아이콘을 검색창에서 분리한 독립 버튼으로 변경하고 터치 시 공통 지도 설정창 열기',
    'PC에도 지도 설정 버튼을 제공하고 테마·글자 크기·애니메이션·날씨·지도 조작 버튼 설정을 로컬 저장',
    '테마·야간 시야 전환 화면을 라이트·다크 별 유리 카드와 동적 진행 표시로 재설계',
    '야간 시야 패널 헤더·반경 조절·범례·분석 결과를 통일된 카드 디자인으로 정리',
    '야간 시야 상세 필터와 통계는 접고 펼치는 섹션으로 구성하되 기존 분석 기능과 데이터는 유지',
    'PC·iOS PWA·Android 공용 지도 코어 및 기존 보행안전·교통정보 이벤트 처리 보존'
  ]},
  { sourceVersion:'플랫폼별 지도 앱 정보·교통 팝업·설정 사용성 통합', scale:'minor', items:[
    '모바일·PC 앱 로고를 검색창 밖 독립 버튼으로 분리하고 버전 정보를 애니메이션 앱 정보창에 표시',
    '모바일 더보기 메뉴를 업데이트 내역·지도 설정으로 간소화하고 다크 모드에서도 공통 설정 기능 연결',
    'iOS Safari에서 홈 화면 추가 안내를 제공하고, PWA 전환 새로고침 대기 시간을 단축',
    '버스·지하철 상세 정보 노출 시 모바일 지도 조작 버튼 겹침 방지 및 교통 탭 디자인 통일',
    'PC/모바일 별도 폰트 크기·굵기·메뉴·플로팅 창 디자인 시스템 일관화'
  ]},
  { sourceVersion:'통합 UI 표준 시스템·모달 표시 규칙 대개편', scale:'major', items:[
    'PC·iOS PWA·Android의 레이아웃 규칙을 공통 UI 토큰 및 플랫폼별 고정 위치·여백 기준으로 통합',
    '탭·행정동·교통·지도 옵션·보행안전·설정 플로팅 창에 단일 표시 우선순위를 적용해 중복 창 방지',
    '버튼 기본형·활성형을 분리하고 모든 주요 플로팅 창 진입 애니메이션 및 라이트·다크 별도 색상 구성',
    '모바일 검색창 옆 독립 브랜드 버튼을 테마 버튼 크기로 통일하고 야간 시야 옆 글자 가독성 전용 도구 추가',
    '모바일 교통정보 창을 하단 탭 기준으로 배치하고 환승 노선 배지·이전역·다음역·상하행 카드의 명암과 겹침 개선',
    '모바일 도보 길찾기 창을 고정식 컴팩트 레이아웃으로 조정하고 PC 모든 탭·교통 패널의 시작 높이를 왼쪽 레일에 정렬',
    '기존 보행안전·지도·교통 처리 소스 및 원본 버전별 상세 기록을 보존한 채 새 UI 대개편을 v8.0.0으로 분류'
  ]},
  { sourceVersion:'모바일 창 애니메이션·상단 로고·PC 검색창 UI 수정', scale:'patch', items:[
    '모바일 플로팅 창을 열 때 실제 표시 이벤트에 연동된 진입 애니메이션 적용',
    '모바일 독립 앱 로고를 소폭 확대하고 라이트·다크에서 동일한 업데이트 내역 창 열기',
    'PC 검색창 높이를 56px로 복구하며 테마·날씨·버전·설정 버튼 높이 동기화',
    '지도 설정 및 업데이트 내역 창에서 지도 배경 블러·암전 효과 제거'
  ]},
  { sourceVersion:'PC 글꼴·검색·패널 밀도와 모바일 정보창·전환 보완', scale:'patch', items:[
    'PC 검색창의 기존 56px 높이를 유지하면서 검색 입력 글씨·로고·검색 버튼·상단 도구의 크기와 간격을 조정',
    'PC 왼쪽 내비게이션 아이콘·라벨 수평 정렬과 야간 시야 메뉴·물음표 버튼의 글자 크기·굵기 통일',
    'PC 커뮤니티·내 기록·소식·길찾기 창의 불필요한 강제 세로 확장을 제거하고 내용에 맞는 높이·내부 스크롤 적용',
    '라이트·다크 테마별 빈 목록 카드와 본문·제목의 대비 및 가독성을 개선',
    '모바일 글자 크기 도구의 큰 가·작은 가 간격을 넓히고 새 플로팅 창 열기 애니메이션을 화면 표시 이벤트에 연동',
    'PC·모바일 라이트·다크 로고를 누르면 업데이트 내역 대신 앱 이름·현재 버전만 나타나는 정보창을 열도록 변경',
    'PC 지도 설정 버튼의 크기·클릭 가능 영역을 복구하고 기존 환경설정 저장·변경 기능을 유지',
    'TOPIS·S-DOT 통합 안전 데이터, 교통·보행안전 지도 핵심 엔진을 유지'
  ]},
  { sourceVersion:'v8.0.3 플랫폼 공통 UI 정렬·테마 안정화', scale:'patch', items:[
    'PC 앱 로고·상단 알약형 조작 버튼, 왼쪽 탭 정렬과 동일한 아이콘·글씨 크기 적용',
    '지도 옵션·보행안전 닫기 버튼을 중앙 정렬하고 다크 모드의 메뉴 배경 대비 조정',
    '모바일 플로팅 창 표시 순간 애니메이션을 보강하고 테마 재시작 때 기본 시작 로고 표시 차단',
    '앱을 새로 시작할 때 라이트 모드 고정, 진행 중인 iOS PWA 전환 복구는 예외 유지',
    '앱 정보에 동작구 아이디어 리그 안전팀 시범 운영 안내 추가, 도움말에 iOS 홈 화면 설치 방법 표시',
    'PC·모바일 설정 글씨 크기 동기화, 글씨 옵션을 보행안전 메뉴에서 숨기고 공통 설정 기능 유지',
    '날씨 정보 버튼 간격·검색 버튼 정렬·이동형 도로폭 메뉴 애니메이션 개선'
  ]}
]);

function getBump(entry){
  if(entry.sourceVersion === 'v1.0') return 'initial';
  if(entry.scale && entry.sourceVersion?.startsWith('v7.0.29-R'))return entry.scale;
  if(entry.sourceVersion === '버전 체계 재정비')return 'patch';
  if(entry.sourceVersion === '모바일 UI 독립 재설계')return 'minor';
  if(entry.sourceVersion === '플랫폼별 소스와 배포 체계 분리')return 'minor';
  if(entry.sourceVersion === '모바일·PC 지도 조작 및 교통 패널 UX 재설계')return 'minor';
  if(entry.sourceVersion === '지도 설정 공통화 및 전환·야간 시야 UX 개편')return 'minor';
  if(entry.sourceVersion === '플랫폼별 지도 앱 정보·교통 팝업·설정 사용성 통합')return 'minor';
  if(entry.sourceVersion === '통합 UI 표준 시스템·모달 표시 규칙 대개편')return 'major';
  if(MAJOR.has(entry.sourceVersion))return 'major';
  if(MINOR.has(entry.sourceVersion))return 'minor';
  return 'patch';
}
const legacyVersionPattern=/v\d+(?:\.\d+){1,2}(?![\d.])/g;

/** Returns newest-first records with original labels and unaltered source notes.
 * Releases are numbered by chronological index, NOT source-label string, so
 * duplicate source labels have distinct identities and monotonic target IDs.
 */
export function buildRetrospectiveHistory(recent, legacy){
  if(!Array.isArray(recent)||!Array.isArray(legacy))throw new TypeError('history arrays required');
  const original=[...recent,...legacy].slice().reverse();
  const withNew=original.map((entry,i)=>({
    sourceVersion:entry.version, sourcePosition:i+1,
    sourceScale:entry.scale, sourceItems:[...(entry.items||[])],
    items:[...(entry.items||[])]
  }));
  withNew.push(...REBUILT_RELEASES.map((entry,i)=>({
    ...entry, sourcePosition:original.length+i+1, sourceScale:null,
    sourceItems:[...entry.items], items:[...entry.items]
  })));
  let major=1,minor=0,patch=0;
  for(const [i,entry] of withNew.entries()){
    const bump=getBump(entry);
    if(i===0){
      if(entry.sourceVersion!=='v1.0')throw new Error('Oldest record must be v1.0');
    }else if(bump==='major'){major++;minor=0;patch=0;}
    else if(bump==='minor'){minor++;patch=0;}
    else if(bump==='patch'){patch++;}
    else throw new Error('Unknown change class: '+bump);
    entry.scale = i===0?'major':bump;
    entry.version=`v${major}.${minor}.${patch}`;
  }
  const originalRefMap=new Map();
  for(const entry of withNew.slice(0,original.length)){
    const refs=originalRefMap.get(entry.sourceVersion)||[];
    refs.push(entry.version);originalRefMap.set(entry.sourceVersion,refs);
  }
  // Notes are shown with new version references when an original label is
  // unambiguous; ambiguous v7.0.25 refs are explicitly left as legacy labels.
  for(const entry of withNew){
    entry.items=entry.sourceItems.map(note=>note.replace(legacyVersionPattern,(old)=>{
      const newRefs=originalRefMap.get(old);
      return newRefs?.length===1 ? newRefs[0] : old;
    }));
  }
  const rendered=withNew.reverse();
  const unique=new Set(rendered.map(x=>x.version));
  if(unique.size!==rendered.length)throw new Error('Duplicate new version numbers');
  return rendered;
}
