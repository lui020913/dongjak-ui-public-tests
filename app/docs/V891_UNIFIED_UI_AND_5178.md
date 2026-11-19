# v8.9.1 통합 UI 후보 — 2026-11-17

## 기준 및 통합 범위

- 기준 고정 커밋: `7eb4783e85f8a30bfadecd29aa57a3a5ae3b62cc` (`fix/v891-mobile-hud-ai-logo-20261117`)
- 기준 브랜치의 v8.8.1 D1/모바일 브라우저, v8.8.9 단계형 바텀시트, v8.9.0 모바일 도크·온보딩 5장, v8.9.1 HUD·AI·로고 작업을 보존합니다.
- `fix/v881-portrait-zoom-responsive-20261116`에서 태블릿/세로형 CSS 3개와 태블릿 도구 레일 JS 1개, 전용 브라우저 테스트를 선택적으로 이식했습니다.
- `src/main.js`에는 4개 import만 추가했습니다. 다른 브랜치의 오래된 `src/main.js`를 덮어쓰지 않았습니다.
- 이전 QA 브랜치 `fix/v891-hud-logo-ai-qa-isolated-20261117`의 `map-scale-docking.js`는 최신 v8.9.1에서 observer 루프 방지 등 추가 변경이 있으므로 의도적으로 덮어쓰지 않았습니다.

## 로컬 5178 포트 분리

- `npm run dev:ui`: Vite 지도 UI만 5195에서 실행합니다. 5178 서버 시작이나 해당 포트로의 프록시 호출을 하지 않습니다. `/api/transport`는 API가 연결되지 않았다는 503 JSON 응답을 제공합니다.
- `npm run dev`: 기존대로 지도 5195 + 서울시 교통 API 5178을 함께 실행합니다. 실시간 버스·지하철 검증에 이용합니다.
- 배포용 Cloudflare Functions와 서버 인증정보는 그대로 유지합니다. 이 변경은 Production 배포나 5178 프로세스 강제 종료를 수행하지 않습니다.

## 검증

- 별도 `v891-unified-ui-qa.yml`을 통해 설치, build, Playwright 태블릿/모바일 HUD 테스트를 실행합니다.
- 해당 Actions는 `DONGJAK_UI_ONLY=1`로 로컬 교통 포트를 쓰지 않고, 운영 환경에 배포하지 않습니다.
- 통합 결과는 Draft PR이며 자동 병합하지 않습니다. 실패한 검사 결과가 있으면 보완 후에만 합칠 수 있습니다.

## 남은 사항

- 기존 비공개 UI 브랜치들은 동시에 수정 중이므로 이 통합은 특정 시점의 스냅샷입니다. 나중에 추가된 커밋은 재검토가 필요합니다.
- 공개용 `dongjak-ui-public-tests/frontend`는 아직 별도 시제품입니다. 현재 통합본을 검증 없이 그 저장소에 복제하거나 공개하지 마세요.

## 이후 추가된 v8.8.9 제스처 수정

- 기존 v8.9.1 분기 이후에도 진행된 `ui/mobile-v889-polish-20261116`의 최신 시트 컨트롤러·모션·CSS 및 회귀 테스트를 재통합했습니다.
- 모션 종료 함수, 드래그 이후 합성 클릭 억제, 전체화면 시트 z-index 및 헤더 숨김 보정이 포함됩니다.
- 다른 8.x 스크립트 전체를 이전 브랜치 상태로 되돌리지 않았습니다.

## 2026-11-17 잔여 브랜치 2차 선별 통합
- `design/v8.8.0-desktop-only-1280-1440-1920-20261116`에서 데스크톱 PC 버튼·날씨·사이드바 글씨/아이콘 중심 정렬 CSS를 반영합니다. 해당 CSS 브랜치의 GitHub UI 검증은 성공 기록이 있습니다.
- `fix/v881-portrait-zoom-responsive-20261116`의 후속 태블릿 헤더 CSS를 반영하여 숨긴 교통 시트가 다시 그려지거나 옵션/안전 패널 위로 지도 버튼이 겹치는 상황을 제어합니다.
- 같은 브랜치의 iPad 옵션 패널 회귀 검사를 이관합니다. 원본 브랜치에서 해당 검사의 `hitClose` 검증이 실패하여, 실패가 해결되기 전까지 PR은 Draft로 유지합니다.
- `design/onboarding-ai-horizontal-20261117`의 그림과 온보딩 JS/CSS는 기존 통합본과 파일 SHA가 같으므로 중복 병합하지 않았습니다.
- `ui/mobile-v889-polish-20261116`의 시트 컨트롤러, 모션 JS, 모바일 CSS도 이미 통합본과 SHA가 같아 건너뛰었습니다.
- `fix/mobile-v890-bottom-ai-night-20261117`는 옛 AI 버튼 생성기를 포함하며 최신 `v890-mobile-ai-orb.js`와 동시에 로드하면 동일 ID로 중복 마운트할 수 있어 가져오지 않았습니다. 야간 블러 제거와 도크 간격 보정은 현재 `v890-mobile-dock-ai-night.css`에서 담당합니다.
- `fix/v891-hud-logo-ai-qa-isolated-20261117`의 `map-scale-docking.js`는 최신 observer 피드백 루프 방지 코드가 누락되어 덮어쓰지 않았습니다.
- `design/onboarding-real-screen-captures-20261116`의 실화면 이미지는 현재 선택한 녹색 AI 그림 5장과 다른 콘텐츠이므로 교체하지 않았습니다.
- 변경사항은 이 비공개 통합 브랜치에만 적용하고 Production 배포나 다른 PR 자동 병합은 하지 않습니다.
