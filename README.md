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

## 예약 점검 분리 (2026-11-16)

- `public-uptime.yml`: 매시간 17분·47분에 **공개 사이트 HTTP·HTML 접속 상태**를 검사합니다. URL에 로그인 정보나 쿼리스트링은 사용할 수 없습니다.
- `public-remote-playwright.yml`: 매일 03:30 KST에 **익명 PC·모바일 UI 검사**를 수행합니다.
- 둘 다 **표준 Ubuntu GitHub-hosted runner**를 사용하므로 공개 저장소에 대한 GitHub Actions 러너 컴퓨팅 사용량은 무료입니다.
- 비공개 저장소의 소스 빌드·PR 검증·Cloudflare 배포는 그대로 별개입니다. CI 중복 해소를 위해 타 브랜치 배포 권한을 자동으로 변경하지 않습니다.
- 공개 저장소에서 업로드되는 Playwright 보고서·화면 캡처는 누구나 열람할 수 있으므로 테스트 계정 로그인을 수행하지 않습니다.
- 대체 프리뷰를 점검하려면 공개 저장소 Settings → Secrets and variables → Actions → **Variables**에 `DONGJAK_TARGET_URL`을 등록하세요. `https://...pages.dev/` 형식의 익명 공개 URL만 사용합니다.
