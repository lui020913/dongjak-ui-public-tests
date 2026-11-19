# v8.5.0 통합본 검증 기록

- 기준 전체 ZIP: `DongjakApp_FULL_v8.4.4_MOBILE_SCALE_ROUTE_TIPS_SAFETY_MERGED_20261114(1).zip`
- 통합 버전: v8.5.0
- 서울시 시설 API 변경 파일: 19개 (기존 852개 항목을 유지하고 변경·추가 파일을 덮어씀)
- 기존 v8.4.4 패치 기준 SHA-256: 전체 19개 항목 모두 일치 확인 후 통합

## 검사 결과

- `node --test tests/*.test.mjs`: **1,287개 통과 / 0개 실패**
- `npm run check:release`: **통과 (v8.5.0 / 136 releases)**
- 변경된 JavaScript 모듈 `node --check`: **통과**
- `npm ci`: 실행 시간 제한으로 완료되지 않음
- `npm run build`: Vite 의존성 미설치로 실행하지 못함
- 서울시 실제 API 호출 및 Cloudflare D1/Worker 배포: 계정 인증 및 Secret 설정이 필요하므로 미실행

따라서 테스트 및 릴리스 메타데이터 검사는 통과했으나, 전체 Vite 프로덕션 빌드와 실 API 연동은 사용자의 환경에서 최종 확인해야 합니다.
