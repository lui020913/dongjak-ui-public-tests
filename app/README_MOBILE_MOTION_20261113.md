# Dongjak Walk Safety — 모바일 플로팅 애니메이션 충돌 해결 패치

- 기준 프로젝트: `DongjakApp_FULL_v8.0.3_UI_REFINEMENT_940PASS_20261113.zip`
- 프로젝트 앱 표시 버전: v8.0.3 유지 (UI 수정 릴리스, 지도 데이터/서버 API 미변경)
- 수정 파일: `src/v806-unified-ui.js`, `src/v803-ui-consistency.js`, `src/v807-ui-refine.js`
- 테스트 파일: 기존 `tests/v806-layout-and-scope.test.mjs` 수정, 신규 `tests/v808-mobile-motion-regression.test.mjs` 추가

## 해결 내용

1. 기존 `v803` 모바일 clip-path 애니메이션이 `v806`의 Web Animations 동작과 동시에 실행되지 않도록 가드함.
2. 한 개의 관리자가 창 표시 변경을 감지해 모바일에서 **410ms** 올라오는 등장 애니메이션을 실행함. 직접 닫기 버튼을 누르면 **220ms** 내려가며 닫힘.
3. 사라진 창의 애니메이션은 취소하고, 반복해서 열면 다시 재생됨. 기존 화면의 fixed/transform 위치를 건드리지 않도록 독립 `translate` 속성 사용.
4. `translate` 미지원 구형 Safari는 `clip-path` 전환으로 대체하고, OS/앱의 '움직임 줄이기' 설정은 그대로 존중함.
5. 지하철 환승 호선 전환은 콘텐츠만 바꾸므로 진행 중인 창 등장 애니메이션을 취소하지 않음.
6. 설정, 업데이트, 앱 정보, 교통정보, 도로폭, 보행안전, 지도 옵션 창의 직접 닫기 동작을 검증함.

## 검증

- Node 자동 테스트: **945/945 통과**.
- Playwright + 시스템 Chromium 모바일 390x844, PC 1280x800에서 대표 7개 창 유형의 등장·닫기·반복 열기 확인.
- OS reduced-motion 시 Web Animations가 실행되지 않음을 확인.
- 실제 iPhone Safari 실기기 렌더링/정식 Vite 빌드는 이 환경에서 검증하지 못함. 이 패치는 소스 프로젝트 패키지이며 `dist` 번들은 포함하지 않음.

## 적용

**전체 ZIP**: 압축을 새 폴더에 풀고 VS Code로 여십시오. 기존 버전 패치는 따로 적용하지 마십시오.

**델타 패치**: 기준 940PASS 프로젝트에만 적용하십시오. 패치 압축을 푼 뒤 `APPLY_PATCH.cmd`를 실행하거나, PowerShell에서 `APPLY_PATCH.ps1`을 실행하십시오. 기준 파일의 SHA-256을 확인하고 수정 전 파일을 `_dj_patch_backups`에 백업합니다.

```powershell
npm ci
npm test
npm run build
npm run dev
```

Cloudflare Pages(기존 고정 프로젝트 대상):

```powershell
npm run deploy:pages
```

### 실제 iPhone 확인 항목

Safari 또는 홈 화면 PWA에서 지하철역, 버스정류장, 지도 옵션, 보행안전, 도로폭, 설정, 업데이트 창을 두 번씩 열었다 닫으십시오. 창이 아래에서 올라오고 닫을 때 내려가야 합니다. '움직임 줄이기' 설정을 켠 경우에는 즉시 열리고 닫히는 것이 정상입니다. 이전 버전이 계속 보이면 Cloudflare 배포 후 PWA 캐시를 새로 고치십시오.
