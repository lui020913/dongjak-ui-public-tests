# 모바일 플로팅 창 애니메이션 수정 (2026-11-13)

## 기준본
`DongjakApp_FULL_v8.0.3_IOS_LIGHT_DARK_ICONS_SEPARATED_955PASS_20261113.zip`

## 수정 내용
- 기존 `src/v806-unified-ui.js` 단일 플로팅 창 관리자를 유지합니다.
- 이전 CSS의 `animation:none!important` 때문에 새 창에 애니메이션이 나타나지 않는 문제를 해소하기 위해, 모바일 창에만 열림/닫힘 CSS 키프레임을 직접 적용합니다.
- `src/v810-mobile-sheet-motion.css`에 420ms 등장, 260ms 닫기 키프레임을 분리했습니다.
- 창을 다시 열 때 같은 애니메이션이 반복 재생되도록 초기화하고, 닫기 전 기존 클릭 핸들러를 실행하는 구조를 유지합니다.
- iOS 및 앱의 ‘움직임 줄이기’ 환경에서는 애니메이션을 줄입니다.
- 지도·교통 API, iPhone 홈 화면용 아이콘, 라이트·다크 아이콘의 독립 경로는 변경하지 않았습니다.

## 검증
- `npm test`: 959개 통과 / 959개 실행
- Chromium 390×844: 길찾기, 교통정보, 설정, 업데이트, 지도 옵션, 보행안전, 도로폭 창을 각각 두 번씩 열고 닫는 동작 검사 통과
- Chromium 1280×800: 같은 창 7개를 각각 두 번씩 열고 닫는 동작 검사 통과
- 실제 iPhone Safari 및 최종 Vite 빌드는 이 환경에서 검증하지 못했습니다.

## 주의
배포 후 모바일에서 애니메이션이 보이지 않는다면 설정 메뉴의 ‘움직임 줄이기’ 및 iPhone의 ‘동작 줄이기’ 접근성 설정을 확인해 주십시오. 실행 환경에서 해당 설정을 존중하도록 작성되어 있습니다.

## 적용·빌드·배포
전체본을 새 폴더에 압축 해제하거나 이 패치를 기준본에만 적용합니다.

```powershell
npm ci
npm test
npm run build
npm run dev
npm run deploy:pages
```
Cloudflare Pages 프로젝트는 기존 `dongjak-walk-safety-preview`를 사용합니다.
