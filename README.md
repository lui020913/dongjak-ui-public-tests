# 동작하는 안전지도 — 공개 원격 UI 테스트

이 저장소는 공개 Cloudflare Pages 웹사이트의 **익명 브라우저 UI 검사만** 수행합니다.

원본 `lui020913/dongjak-safety-map`은 비공개로 유지됩니다. 여기에는 원본 앱 소스, 원본 Git 기록, 로그인 정보, API 키, Cloudflare 배포 토큰을 넣지 않습니다.

## 테스트 범위

- PC 1920×1080, 1440×900, 1280×800
- 모바일 430×932, 390×844, 375×812
- 지도 표시, 하단 탭 전환, PC 지도 도구, 모바일 더보기, 글씨 크기·굵기 변경
- 화면 캡처 및 레이아웃 넘침 기록
- 수동 실행 / 코드 변경 시 자동 실행 / 매일 03:30 KST 정기 검사

## 실행 방법

GitHub **Actions → Public remote UI audit → Run workflow** 에서 URL을 지정해 실행합니다.

기본 테스트 URL: `https://dongjak-walk-safety-preview.pages.dev/`.
대체 URL 예: `https://v880-audit-preview.dongjak-walk-safety-preview.pages.dev/`.

실제 공개 URL이 유효한지 확인해야 합니다. 기본 주소가 접속되지 않으면 검사는 실패하며, 이는 검증되지 않은 앱의 성공을 의미하지 않습니다.

**보안 주의:** Actions 로그와 아티팩트는 공개됩니다. 로그인하지 않은 상태로 검사하며 비밀값이나 개인 데이터가 포함된 URL을 입력하지 마세요.

이 테스트는 공개 배포 결과의 UI 확인용입니다. 원본 앱의 빌드, 비공개 API, 실제 iPhone Safari, 운영 배포 검증을 대체하지 않습니다. 자동으로 Cloudflare 운영 환경을 변경하거나 원본 저장소에 수정 코드를 반영하지 않습니다.
