# 동작구 안전지도 — 모바일 페이드 애니메이션 동작 복구 (2026-11-13)

기준 원본: `DongjakApp_FULL_v8.0.3_FADE_FIXED_DARK_ICON_TRANSPARENT_970PASS_20261113.zip`

## 실제 수정

- `src/v806-unified-ui.js`의 모바일 애니메이션 구현을 변경했습니다.
- 기존의 CSS 키프레임 방식은 220ms지만 easing 초반에 거의 보이게 되어 효과가 매우 짧고, 오래된 `opacity:1!important` 규칙과 충돌할 수 있었습니다.
- 이제 한 곳에서 `requestAnimationFrame`으로 **opacity만** 프레임별 제어합니다. 열기 320ms, 닫기 220ms.
- 위아래로 움직이거나 크기를 변경하지 않습니다. 같은 활성 탭 재선택 시 다시 재생하지 않습니다.
- 기존 창을 닫을 때에는 페이드가 끝난 뒤 원래 닫기 동작을 실행하고, 종료 시 인라인 스타일을 복원합니다.
- 시설 MapLibre 팝업도 모바일에서는 위아래 이동 대신 페이드로 나타납니다.
- 사용자가 iPhone이나 앱의 '움직임 줄이기'를 활성화하면 그 접근성 설정을 존중합니다.

## 검증

- `npm test`: 973개 전부 통과
- 수정 JavaScript `node --check`: 통과
- Chromium 모바일 크기(390x844, 430x844)에서 길찾기 / 교통정보 / 지도 설정 / 보행안전 창 각각 2회 열기·닫기: 통과
- 강제 `opacity:1!important` 상태에서도 중간 프레임 투명도가 0 < alpha < 1인지 확인: 통과
- 다크모드 페이드 및 OS reduced-motion 동작 확인: 통과
- 실제 iPhone Safari: 미검증
- 최종 Vite 빌드: 이 컨테이너에서 vite가 없어 실행 불가(명령 오류). 사용자의 로컬 프로젝트에서 npm ci 후 확인 필요.

## 사용 방법

### 전체 ZIP
새 폴더에 풀고 VS Code로 열어 작업합니다.

### 소용량 패치 ZIP
반드시 위 기준 970PASS 원본에만 적용합니다. `APPLY_PATCH.cmd` 또는 `APPLY_PATCH.ps1` 실행으로 기존 파일 해시 검사 및 백업 후 덮어씁니다.

### 로컬 검증 / Cloudflare Pages 배포
```
npm ci
npm test
npm run build
npm run dev
npm run deploy:pages
```
Cloudflare 배포는 별도 로그인과 API 환경변수가 필요합니다. PWA 구버전이 캐시되어 보인다면 배포 후 새로고침 또는 홈 화면 웹앱 재실행으로 새 번들을 확인합니다.
