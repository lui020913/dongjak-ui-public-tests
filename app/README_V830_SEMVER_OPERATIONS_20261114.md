# 동작구 보행안전 지도 v8.3.0 — 운영 릴리스 분류 통합

**기준:** DongjakApp_FULL_v8.2.16_TRANSIT_UI_VERSION_INTEGRATED_20261114.zip
**적용:** 운영 버전 관리 기능 (Minor), 기존 지도·교통·UI 구현 보존

## 반영 사항

- v8.2.16 → **v8.3.0 (Minor)**: 새 운영 버전 분류 기능 릴리스
- `npm run version:major -- "변경사항"`: X+1.0.0
- `npm run version:minor -- "변경사항"`: X.Y+1.0
- `npm run version:patch -- "변경사항"`: X.Y.Z+1
- 기존 `npm run version:next`는 마이너 명령 별칭 유지
- 업데이트 내역 화면에서 `Major · 메이저`, `Minor · 마이너`, `Patch · 패치` 구분
- 버전 번호·변경 이력·앱 안내·빌드 정보 자동 동기화, 수동 변경 시 잘못된 Patch 이력 생성 차단
- 이전 v8.2.16 이하 운영 이력과 별도의 소급 재분류 기록 보존
- 과거 GPS 검사의 `8.2.x` 하드코딩 해제, 향후 Major/Minor 변경 허용

## 실제 실행 및 검증

- `npm test`: 1,234/1,234 통과
- `npm run check:release`: 통과
- `node scripts/export-semver-history.mjs`: 보관 이력 136건 재생성 성공
- Major/Minor/Patch/Next 명령 독립 가상 프로젝트 실행 확인
- `npm run build`: **미완료** (`vite: not found`; 해당 실행 환경에 Vite 없음)
- iPhone 실제 PWA/Cloudflare 배포: **미검증**

## 다음 버전 작업 시

새 기능이면 `npm run version:minor -- "신규 기능"`;
오류 수정이면 `npm run version:patch -- "수정 내용"`;
호환성 파괴면 `npm run version:major -- "호환성 변경"`을 실행합니다.
하나의 릴리스에 여러 종류가 섞이면 가장 높은 변경 수준으로 발급합니다.
**자동 의미분석으로 등급을 추정하지 않습니다.** 담당자가 명령어로 등급을 선택해야 합니다.

상세 기준: `docs/VERSIONING_OPERATIONS.md`
