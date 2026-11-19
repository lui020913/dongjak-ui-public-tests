# v8.2.14 · UI_KAKAO_PRIORITY_SAFE 분기 병합 기록

## 기준 원본
`DongjakApp_FULL_v8.2.13_UI_KAKAO_PRIORITY_SAFE_INTEGRATED_20261114(1).zip`

v8.2.14 모바일 도구바·날씨·야간 시야·동작구 경계 보호 패치를 이 **카카오/안정화 분기**에 3-way merge했습니다. 표준 v8.2.13에 대한 단순 덮어쓰기와 다릅니다.

## 충돌 병합
- `index.html`: 분기의 `dj-v8212-sheet-controller.js` 로딩 순서를 유지하면서 v8.2.14 CSS 및 버전 표기를 적용
- `src/v831-swipe-feature-toolbar.js`: 분기의 CSS import 및 `enforcePriorityToolbarSingleRow()`를 유지하면서 사용자별 바로가기, 확장 버튼, 날씨·야간 패널 동작을 병합. 첫 생성/사용자 설정 변경 때 모두 한 줄 레이아웃 보호 로직을 호출하고 화면 폭 전환 시 임시 인라인 스타일을 해제
- `tests/v8213-compatible-ui-toolbar-guard.test.mjs`: 더 이상 사용하지 않는 고정 `PRIMARY_KEYS` 전제를 새 개인화 목록 `DEFAULT_PRIMARY`, `loadPrimary`, `rebuildFeatureLocations` 확인으로 갱신

## 변동 없는 분기 파일
`src/v824-favorites-cloud.js`, `src/v831-kakao-popup.js`, `src/dj-v8212-sheet-controller.js`, `src/v829-mobile-layout-system.css`, `src/v824-mobile-sheet-and-keyboard.css` 및 분기 자체 테스트는 그대로 보존했습니다.

## 검증과 한계
- `npm test` 1,189/1,189건 통과 (합쳐진 변경 전용 테스트 포함)
- `npm run check:release` 통과 (v8.2.14)
- JavaScript 문법검사 통과
- `npm run build`: 현재 환경에 Vite 실행 파일이 없어 미완료 (`vite: not found`)
- 실제 iPhone/Cloudflare 배포, 카카오 OAuth 실제 서버 인증은 확인하지 않았습니다.

본 병합에서 인증 설정 키·실제 사용자 계정·Cloudflare 환경변수를 새로 만들거나 수정하지 않았습니다.
