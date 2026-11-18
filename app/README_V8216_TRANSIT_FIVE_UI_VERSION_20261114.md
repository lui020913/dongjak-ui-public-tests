# 동작하는 안전지도 v8.2.16 — 지하철 헤더 통합·5가지 UI 오류 수정·업데이트 이력 갱신

**기준 원본:** `DongjakApp_FULL_v8.2.15_METRO_UI_MERGED_TRANSIT_FIXED_HEADER_20261114.zip`

## 병합 범위
- 원본의 `src/v8215-news-metro-compact-header.js`, `src/v8215-news-transit-sticky-redesign.css`, 지하철/버스 정보창과 기존 데이터 소스는 그대로 유지합니다.
- 이전 5개 UI 수정 패치에서 테마 아이콘 중앙 정렬, 내 정보 저장 장소 박스의 본문 스크롤 귀속, 야간시야 사전 로딩 차단, 확장형 바로가기 버튼의 우측 여백 축소, 안전지도 원형 아이콘을 이식했습니다.
- `index.html`은 안전지도 홈 아이콘 SVG만 병합하고 원본의 교통 정보창 신규 스타일 링크를 보존했습니다.

## 버전·업데이트 내역 동기화
- `package.json`, `package-lock.json`, `src/app-release-log.json`에 v8.2.16을 반영하고, `scripts/stamp-version.mjs`로 다음 파일을 일괄 동기화합니다.
- `src/app-version.js`, `src/build-info.json`, `public/version.json`, `src/v7120-settings.js`, `index.html`의 앱 타이틀·버전·최근 업데이트.
- 업데이트 이력 화면은 `src/app-release-log.json` 전체를 표시합니다. v8.2.15 이하의 기록은 삭제하지 않았습니다.
- 버전 번호는 소스가 변경될 때마다 자동 증가하는 값이 아닙니다. 다음 릴리스에는 **반드시** `npm run version:patch -- "변경사항 설명"` 또는 `npm run version:next -- "기능 추가 설명"`를 실행해야 합니다. 그렇지 않으면 새 코드가 있어도 숫자는 유지됩니다.

## 빌드·배포
```powershell
npm ci
npm test
npm run check:release
npm run build
npm run deploy:pages
```
`npm run deploy:pages` 안에 빌드가 포함되어 있습니다. 환경변수(`.env.local`, `.env.production.local`)는 개인 작업 환경에서 유지하십시오.

## 검증 범위
- 테스트와 파일 내용·ZIP 무결성 검사는 실제 수행한 결과로 별도 기록합니다.
- 실제 Cloudflare 배포와 iPhone Safari/PWA 인증은 이 작업에서 수행하지 않았습니다.
