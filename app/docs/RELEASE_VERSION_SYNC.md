# 앱 버전·업데이트 내역 동기화

## 단일 릴리스 절차

- 기능이나 UI 흐름을 새로 추가하면 `npm run version:minor -- "변경사항 1" "변경사항 2"`를 실행합니다.
- 작은 오류, UI 정렬, 스타일 안정화는 `npm run version:patch -- "변경사항"`를 실행합니다.
- 핵심 구조가 바뀌는 큰 변경에 한해 `npm run version:major -- "변경사항"`를 실행합니다.
- 이 명령은 package.json·package-lock.json·src/app-release-log.json·src/app-version.js·public/version.json·src/build-info.json·index.html·src/v7120-settings.js를 함께 갱신합니다.
- 사용자가 보는 업데이트 내역을 수정했다면 반드시 새 버전 항목을 발행합니다. 기록만 고치고 버전을 그대로 두면 `check-release-note-bump.mjs`와 GitHub Actions 검증이 실패합니다.
- 배포 전 `npm run check:release && npm test && npm run build`를 수행하고, 배포된 `release-source.json`의 Git SHA 및 실제 `version.json`을 검증합니다.
- 빌드/프리뷰만 수행하고 변경사항을 공개하지 않을 때에는 매 빌드마다 버전을 올리지 않습니다. 사용자에게 노출되는 업데이트 릴리스마다 버전을 증가시킵니다.

## 2026-11-17

- 운영 중인 UI 기능 기준으로 v8.9.0(모바일 AI 도크·초록 온보딩)과 v8.9.1(통합 HUD·태블릿 반응형) 기록을 보강했습니다.
- 버전 표기의 기준은 Git 소스의 최신 릴리스 항목이며, Cloudflare Production에 배포된 SHA가 다르면 운영 사이트의 표시가 달라질 수 있습니다.
