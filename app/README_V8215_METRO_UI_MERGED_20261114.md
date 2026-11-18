# 동작구 보행안전 지도 v8.2.15 지하철 헤더 통합본 전용 패치

**정확한 기준 파일:** `DongjakApp_FULL_v8.2.15_NEWS_SHEET_REBUILT_METRO_HEADER_UNIFIED_20261114(1).zip` (v8.2.15, 신규 지하철 헤더 통합 분기).

이 패치는 앞서 요청하신 모바일 플로팅 창/툴바/안전지도 홈 수정 11개 파일만 반영합니다. 지하철 헤더 통합 분기에서 추가한 `src/v8215-news-metro-compact-header.js`, `src/v8215-news-metro-compact-header.css`, `tests/v8215-news-metro-compact.test.mjs`는 **변경하거나 삭제하지 않았습니다.** 지하철 헤더용 CSS·JS 링크도 `index.html`에 유지했습니다.

## 변경사항
- 다섯 패널: 헤더 고정, 본문만 스크롤, 좌우 17px 여백, 모바일 최대 높이 50dvh
- 중앙 회색 바는 장식, 맨 위 25px 가장자리에서 아래로 드래그해 닫기 (손가락 이동 추종)
- 검색 아래 도구 막대를 다섯 하단 탭에서 유지, 행정동 선택 아이콘을 상단 도구로 이동
- 안전지도 한 번: 열린 창만 닫기 / 빠른 두 번: 지도 카메라·레이어 기본값 복원 (사용자 데이터 유지)
- 검색창 알약 모양, 안전지도 아이콘 확대 및 원형, 테마/도움말/나침반/홈/GPS 원형 버튼
- 도로폭: 우측 도구에서 제외하고 더보기에서 상단 표시 여부를 고르는 기능
- 지하철 노선별 헤더와 시간표를 포함한 기존 분기 파일은 손대지 않음

## 적용 방법 (Windows)
1. ZIP을 별도 폴더에 풀고 `APPLY_PATCH.cmd`를 실행합니다.
2. 기준 ZIP을 풀어둔 프로젝트 루트(그 안에 `package.json`과 `index.html`이 있는 폴더)를 입력합니다.
3. 스크립트가 **패치 파일과 원본 SHA-256 해시를 모두 검사**한 뒤 안전하게 백업하고 수정합니다.
4. 되돌리려면 같은 패치 폴더에서 `RESTORE_PATCH.cmd`를 실행합니다.
5. 패치가 이미 적용됐으면 아무 파일도 변경하지 않습니다. 다른 파일이 수정돼 있으면 전체 작업을 중단합니다.

**전체본을 받았다면 패치를 따로 적용하실 필요가 없습니다.**

## 검증
- `npm test`: 1,221개 통과 (지하철 신규 테스트 포함)
- `npm run check:release`: 통과, v8.2.15 / 136 releases
- 바이너리 파일 비교: 지하철 신규 3개 파일은 원본과 동일
- 프로젝트 ZIP 및 델타 패치 무결성 검사: 패키징 후 확인
- 전체 Vite 빌드: 실행 환경에 npm 의존성 캐시가 없어 미완료 (`npm ci --offline`에서 ENOTCACHED)
- 실제 iPhone PWA/Cloudflare 실배포: 미검증

사용자 PC의 `.env.local`, `.env.production.local` 등 개인 설정은 원본 ZIP에도 없는 파일이므로 기존 값을 별도로 유지하십시오. 인증 키/비밀키는 ZIP에 넣지 않았습니다.

## 실행 명령
```powershell
npm ci
npm test
npm run build
npm run deploy:pages
```
