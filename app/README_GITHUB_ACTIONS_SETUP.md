# 동작구 안전지도 | GitHub Actions 자동 품질 검사

## 기준과 제한
- GitHub 저장소: `lui020913/dongjak-safety-map` (Private).
- 현재는 **자동화 코드만 등록**되어 있습니다. 지도 앱의 실제 소스는 아직 올리지 않았습니다.
- 검사 기준 소스는 사용자가 최종 확인한 **Playwright 통합본**입니다. 이전 v8.8.0 안정화 파일을 대신 업로드하지 마세요.
- `package.json`, `package-lock.json`, `playwright.config.mjs`가 모두 있어야 앱 검사가 시작됩니다.
- 이 조건을 만족하지 않으면 `verify-project` 단계만 통과하고 Node·Playwright 단계는 **건너뜁니다**. 이를 앱 테스트 통과로 해석하지 마세요.

## 자동 검사 구조
| 종류 | 파일 | 의미 |
|---|---|---|
| 필수 동작 검사 | `tests/e2e/ci-critical-paths.spec.js` | 온보딩 종료, 5개 하단탭, 지도 도구, 더보기, v8.7.7 설정, 모바일 창 확장 등: 실패 시 E2E 실패 |
| 화면 증거 수집 | `tests/e2e/ci-visual-audit.spec.js` | 9개 화면 크기에서 스크린샷과 DOM 좌표, UI 경고 기록. 경고 자체는 테스트 실패로 단정하지 않음 |
| CI 요약 | `scripts/ci-summarize-playwright.mjs` | 테스트 결과와 화면별 경고 건수를 `ci-summary.md` 및 `ci-summary.json`으로 작성 |
| 실행 워크플로 | `.github/workflows/dongjak-visual-audit.yml` | Node 회귀 검사, Vite 빌드, Playwright, 아티팩트 수집 |

## 화면 크기
- PC: `1920×1080`, `1440×900`, `1366×768`, `1024×768`
- 모바일 Chromium 에뮬레이션: `430×932`, `390×844`, `375×812`, `360×780`, `320×700`
- 이는 Chromium의 뷰포트·터치 에뮬레이션입니다. 실제 iPhone Safari의 PWA/WebGL/GPS 동작을 완전히 재현하지 않습니다.

## 탐지하는 문제
- 화면을 초과하는 패널, 문서 전체 가로 넘침
- 버튼이 화면 밖에 있거나 너무 작음
- 한 줄 텍스트의 오버플로
- 형제 버튼끼리 영역이 겹침
- 탭 클릭 실패, 온보딩 종료 실패, 중요 설정 접근 실패
- JavaScript 런타임 예외 및 HTTP 4xx·5xx 응답 (URL 쿼리·요청 본문은 저장하지 않음)

레이아웃 탐지는 **오탐 가능성이 있는 경고**입니다. 지도 위 의도된 버튼, 애니메이션 중인 창, 화면 밖에 대기하는 메뉴 등은 실제 스크린샷 검토가 필요합니다. 캡처 테스트에서 기록한 `interactionWarning`도 별도 필수 기능 검사가 성공했다는 뜻은 아닙니다.

## 최종 소스 업로드 후 확인 순서
1. 최신 Playwright 통합본의 소스 파일을 **민감정보 검사 후** 비공개 저장소에 게시합니다. `.env*`, `.dev.vars*`, 키/인증서, 개인 데이터는 제외합니다.
2. `Actions > Dongjak Safety Map - Build and Visual Audit`에서 해당 커밋의 실행을 확인합니다.
3. `verify-project`가 준비 완료인지 확인합니다.
4. `node-and-build`, `playwright` 각각의 성공/실패를 확인합니다.
5. 실행 화면 하단 **Artifacts**에서 `dongjak-playwright-audit-...` ZIP을 내려받습니다.
6. `test-results/ci-summary.md`, `playwright-report/index.html`, `*-audit.json`, 스크린샷을 검토합니다.

## 보안 및 배포 정책
- 저장소를 Private로 유지합니다.
- `.gitignore`는 새로 추적하는 파일을 제외하는 용도입니다. 이미 커밋한 비밀값과 코드에 하드코딩된 값은 보호하지 못하므로 업로드 전 별도 확인이 필요합니다.
- CI는 실제 Cloudflare 배포를 수행하지 않습니다.
- 화면 캡처는 익명/테스트 계정 상태에서 수행하는 것이 안전합니다. 로그인된 개인 화면은 아티팩트에 포함될 수 있습니다.
- 현재 CI 검증은 준비 단계입니다. **실제 앱과 결합한 실행 결과는 아직 없습니다.**
