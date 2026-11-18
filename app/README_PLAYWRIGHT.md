# Dongjak Safety Map — Playwright E2E

기준 앱 버전: **v8.8.0**

이 테스트 구성은 기존 Node.js 테스트(`npm test`)를 유지하면서 실제 Chromium 브라우저 기반 E2E 테스트를 추가합니다.

## 최초 1회 설치

프로젝트 루트에서 PowerShell을 열고 실행합니다.

```powershell
npm install
npx playwright install chromium
```

## 실행 명령

```powershell
# PC + 모바일 Chromium 전체 E2E
npm run test:e2e

# PC만
npm run test:e2e:desktop

# 모바일 Chromium 에뮬레이션만
npm run test:e2e:mobile

# 브라우저 화면을 보면서 실행
npm run test:e2e:headed

# HTML 보고서 열기 (테스트 실행 후)
npm run test:e2e:report
```

Playwright 설정이 Vite 서버를 자동 실행합니다. `dev:map` 스크립트의 포트 5195를 사용합니다.

## 기존 Node.js 테스트와 구분

- `npm test`: 기존 `tests/*.test.mjs` Node.js 테스트
- `npm run test:e2e`: `tests/e2e/*.spec.js` Playwright 브라우저 테스트

두 테스트 체계는 서로 독립적이며 기존 `npm test` 명령은 변경하지 않았습니다.

## 포함된 E2E 테스트

- `smoke.spec.js`: 지도와 하단 내비게이션 기본 로딩
- `map-screen.spec.js`: 지도 Canvas 및 주요 도구 표시
- `map-controls.spec.js`: 지도 옵션·보행안전 메뉴 전환 및 닫기
- `map-controls-lifecycle.spec.js`: 메뉴 열기·X닫기 10회 반복
- `bottom-tabs.spec.js`: 하단탭 페이지 전환
- `floating-window.spec.js`: 업데이트 내역 플로팅 창 열기·닫기
- `transit-window.spec.js`: 저장 교통장소 이벤트를 통한 지하철 창·호선 전환·닫기
- `facility-window.spec.js`: 테스트용 로컬 저장 지점 상세창 열기·닫기
- `ui-inventory.spec.js`: UI 요소·콘솔·네트워크 상태 수집

## 초기 안내창 테스트 제외

PC 초기 안내창의 닫기 버튼 문제는 별도 수정 대상으로 남겨 두었습니다. 다른 기능의 회귀 테스트가 이 미해결 동작 때문에 실패하지 않도록 `onboarding-network-diagnostic.spec.js`는 기본 실행에서 skip 처리했습니다.

테스트 중 `#dj860-onboarding` 요소는 해당 Playwright 페이지에서만 제거합니다. 실제 앱 소스나 사용자의 저장 데이터는 수정하지 않습니다.

## 보고서와 실패 자료

- HTML 보고서: `playwright-report/`
- 실패 스크린샷·영상·Trace: `test-results/`

보고서를 ZIP으로 공유하려면 테스트 후 다음 명령을 실행합니다.

```powershell
Compress-Archive -Path .\playwright-report\*,.\test-results\* -DestinationPath .\playwright-artifacts.zip -Force
```

## 참고

모바일 프로젝트는 Chromium의 모바일 뷰포트·터치 에뮬레이션입니다. 실제 iPhone Safari 실기기 검증을 대체하지 않습니다. 외부 API의 HTTP 오류는 별도 기록하며, 지도 기본 표시 테스트와 구분합니다.

## v8.8.0 통합 참고

- **기준 소스:** v8.8.0 STABILITY PHASE4. 구버전 전체 코드, `node_modules`, `.env.local`, `.env.production.local`, 빌드 결과물, 이전 리포트는 가져오지 않았습니다.
- **이식/갱신:** `tests/e2e/transit-window.spec.js`의 호선 접근성 이름 호환, `tests/e2e/facility-window.spec.js`의 '내 정보 → 즐겨찾기·내 기록 → 등록 지점' 실제 동선과 닫기 클릭 검사.
- **동반 수정:** `src/v834-my-info.js`에서 비활성 내 정보 하위 화면의 DOM을 분리하지 않도록 수정했습니다. `src/v834-my-info.css`에서 `[hidden]` 하위 화면은 표시되지 않게 보장했습니다. 글자 설정·프로필 사진 기능은 유지합니다.
- **검증 상태:** 실제 Playwright PC·모바일 E2E 최종 통과 여부는 설치 후 사용 환경에서 실행해 확인합니다. 파일 존재 및 문법 검사는 별개입니다.
- **일반 앱 빌드와 별도:** Playwright는 개발용 의존성입니다. 최종 Cloudflare 배포물에 테스트 실행기가 포함되지 않습니다.

### 권장 검증 순서

```powershell
npm ci
npx playwright install chromium
npm run build
npx playwright test --config=playwright.config.mjs tests/e2e/facility-window.spec.js --project=desktop
npx playwright test --config=playwright.config.mjs tests/e2e/facility-window.spec.js --project=mobile
npx playwright test --config=playwright.config.mjs tests/e2e/transit-window.spec.js
# 전체 검증
npm run test:e2e
```

`/api/transport/*` 요청에서 `ECONNREFUSED 127.0.0.1:5178`이 발생한다면 테스트할 UI 외의 로컬 프록시 서버가 미실행인 상태입니다. 뉴스·접근성 API 자체는 별도 통합 테스트가 필요합니다.
