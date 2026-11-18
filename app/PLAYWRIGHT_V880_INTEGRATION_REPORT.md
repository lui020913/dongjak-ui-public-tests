# v8.8.0 Playwright 통합 검증 기록 (2026-11-15)

## 기준 자료
- 앱 기준: `DongjakApp_FULL_v8.8.0_STABILITY_PHASE4_INTEGRATED_20261115(1).zip`
- 참조: `TalkFile_DongjakApp_CLEAN_LATEST.zip.zip` (구버전 8.7.4)
- 구버전의 앱 소스, node_modules, 환경변수, 빌드 결과물, Playwright 실행 결과 파일은 가져오지 않았음

## 적용 변경사항
1. `tests/e2e/facility-window.spec.js`: 구버전에서 검증된 내 정보→즐겨찾기·내 기록 진입 순서 반영; 실제 등록 지점 데이터 로딩 및 상세창 진입 확인; 상세창 X버튼의 실제 마우스 입력 후 닫힘·클래스 해제 검사
2. `tests/e2e/transit-window.spec.js`: `4호선으로 전환` 및 `4호선 호선으로 전환` 두 접근성 라벨 호환
3. `src/v834-my-info.js`: 비활성 계정·글자 설정·내 기록 하위 컨테이너를 DOM에서 분리하지 않도록 하여 `renderMy()`에서 등록 지점 접근 가능하도록 보정. 최신 프로필 사진·글자 크기/굵기 UI 유지
4. `src/v834-my-info.css`: 비활성 하위 컨테이너의 `[hidden]` 표시 보장
5. `README_PLAYWRIGHT.md`: 앱 기준 버전 및 테스트 순서 정정

**변경되지 않은 파일:** 최신 앱의 `index.html`, `src/main.js`, 지도 렌더러/지도 데이터, 배포 설정, package.json, package-lock.json 등.

## 검증 결과
- `node --check` (변경 JS 및 전체 `tests/e2e/*.js`): 통과
- 기존 전체 Node.js 회귀 테스트 `node --test tests/*.test.mjs`: **1465개 / 1451 통과 / 0 실패 / 14 건너뜀**
- 격리된 Chromium DOM 동작 검증: 1440×900, 390×844에서 내 기록 DOM 연결·목록 표시·글자 설정 비표시 상태 확인, **2개 환경 통과**
- 프로젝트 전체의 `npm run build` 및 실제 Playwright E2E는 현재 실행 환경의 npm 패키지 설치 불가로 **미실행**. PC에서 실행해 최종 확인 필요

## Windows에서 최초 실행
```powershell
# 전체 ZIP을 새 폴더로 해제한 후 해당 폴더에서 실행
npm ci
npx playwright install chromium
npm run build

# 먼저 지난 실패 항목부터 재검사
npx playwright test --config=playwright.config.mjs tests/e2e/facility-window.spec.js --project=desktop
npx playwright test --config=playwright.config.mjs tests/e2e/facility-window.spec.js --project=mobile

# 지하철 및 다른 UI 동작
npx playwright test --config=playwright.config.mjs tests/e2e/transit-window.spec.js
npm run test:e2e
npm run test:e2e:report
```

### 주의
- PC 초기 안내창 문제는 별도 보류. 이 테스트들의 `openMapPage` helper는 **테스트 브라우저 내에서만** 온보딩을 제거하며 앱 원본에는 영향을 주지 않습니다.
- 프록시 로그 `ECONNREFUSED 127.0.0.1:5178`은 별도 로컬 백엔드 미실행 문제로, 시설 테스트 기능과 별도로 진단해야 합니다.
- 브라우저 크기 390×844 테스트는 모바일 Chromium 에뮬레이션이며 실제 iPhone Safari 실기기 검증을 대체하지 않습니다.
- ZIP에 `.env.local`이나 개인 인증정보는 포함하지 않았습니다. 로컬 설정이 필요하면 사용자 PC의 안전한 사본을 사용하십시오.
