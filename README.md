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

기본 테스트 URL: `https://v881-integrated-1116.dongjak-walk-safety-preview.pages.dev/`.
이전 버전 비교용 URL은 필요할 때 별도로 지정합니다. 현재 기본 대상은 v8.8.1 통합 Preview입니다.

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

## 비공개 → 공개 테스트 연동 (2026-11-16)

- 비공개 릴리스 Preview 배포 성공 후 **별도의 비공개 Actions 브리지**가 이 공개 저장소의 `workflow_dispatch`를 호출하도록 준비했습니다. 이 공개 저장소는 개인 토큰을 보관하지 않습니다.
- `expected_source_sha`가 지정된 호출에서 `/release-source.json`의 불변 커밋과 `release_status=CANDIDATE_PREVIEW_NOT_PRODUCTION`을 검증합니다. 다른 버전을 검사해 성공으로 오판하는 경우를 막습니다.
- 디스패치를 실제 활성화하려면 **비공개** 저장소에 한정된 GitHub fine-grained PAT secret `DONGJAK_PUBLIC_TESTS_TOKEN`과 Actions variable `ENABLE_PUBLIC_BRIDGE=true`가 필요합니다. 토큰은 공개 저장소 하나에 대한 Actions 쓰기 권한만 부여하세요.
- 공개 실행은 비용을 절약하기 위해 기본적으로 실패 항목만 검사합니다. 모든 기능을 검증하려면 Actions의 `scope=full`을 직접 선택하세요.
- 비공개 저장소에서 실행 성공 여부를 판정할 때 공개 워크플로의 **특정 소스 커밋 및 완료 상태**를 일치시켜야 합니다. 오래된 통과 기록은 현재 릴리스 승인 근거로 사용할 수 없습니다.

### 검증 범위와 검증된 저장소 연동 (2026-11-16)

- `targeted`: PC **길찾기 → 커뮤니티 → 동작소식 → 내 정보 → 안전지도** 전체 복귀 경로 1건을 실제 마우스 입력으로 검사합니다. `tests/desktop-full-tab-home.spec.mjs`
- `release`: 새 Preview 버전에 대해서만 PC 핵심 2건, 모바일 핵심 4건을 검사합니다. 변경되지 않은 화면 크기 캡처 6건은 반복하지 않습니다.
- `full`: 필요할 때만 수동으로 전체 검사를 실행합니다.
- 공개 저장소에는 민감정보와 비공개 원본 코드가 없습니다. 실제 비공개 빌드·Cloudflare 배포는 별도 러너에서 실행되므로 무료는 아닙니다.
- 검증 기준: 공개 UI 성공 https://github.com/lui020913/dongjak-ui-public-tests/actions/runs/43874812280 및 비공개 결과 반환 성공 https://github.com/lui020913/dongjak-safety-map/actions/runs/43873494989
- 공개 표준 Ubuntu 러너 사용 시간은 무료이며, 비공개 러너가 공개 테스트 결과를 기다리는 시간은 비공개 Actions 사용량을 소비합니다.
- Production 자동 배포는 활성화하지 않았으며, Preview와 Production 승인 단계는 별개입니다.

## 자동 품질 보고서 (2026-11-16)

- 실행 결과의 **Summary**에서 PC/모바일별 통과·실패·불안정 테스트와 실제 브라우저 뷰포트 크기를 확인할 수 있습니다.
- **Artifacts → dongjak-public-ui-...**에서 `quality-report/summary.md`, `quality-report/summary.json`을 내려받을 수 있습니다. 보존 기간은 7일입니다.
- `release` 범위는 기본 PC 1440×900 2건, 모바일 390×844 4건입니다. 그 외 화면 크기 검사는 `full` 또는 별도 반응형 테스트를 실행해야 하며, 수행하지 않은 뷰포트를 통과로 표시하지 않습니다.
- 결과 파일이 없거나 `release`에서 PC 2건·모바일 4건보다 적으면 `NO_VALID_RESULTS`로 집계합니다. 실패·불안정 항목은 성공으로 간주하지 않습니다.
- 보고서 집계기 자체는 Node 단위 테스트 3건으로 검증하며, 공개 저장소의 관련 코드가 변경되면 핵심 릴리스 UI 검사를 실행합니다.
- 보고서에는 대상 호스트명만 포함하고 URL의 쿼리스트링과 오류 메시지에 포함된 URL은 제외합니다. 공개 스크린샷에는 로그인하거나 민감정보를 입력하지 마세요.
- 본 보고서는 **정보 확인용**입니다. 운영 배포·비공개 저장소 브랜치 보호는 별도의 승인 단계입니다.
