# 동작하는 안전지도 — PC 보행안전 도구 개편 (v8.0.3 UI 후속 수정)

기준 전체본: `DongjakApp_FULL_v8.0.3_PC_MOBILE_UX_FONT_WEATHER_1000PASS_20261113.zip`

## 구현

- PC(1080px 이상): 보행안전 도구를 **대분류 5개(왼쪽)** + **소분류(오른쪽)** 구조로 표시
- 사고·지도자료: 실시간·환경 / 사고·횡단 / CCTV / 지형·교통약자
- 안전시설: 음향신호기·AED / 생활 안전시설
- 보호구역·교통: 보호구역 검토 / 속도·단속시설
- 새 화면을 띄우거나 기존 레이어 토글을 복제하지 않음. 기존 `data-dj-import`, `aria-pressed`, `id` 및 실제 동작 연결은 유지
- PC 보행안전 패널 자체의 세로 스크롤 제거. 일반적인 1280×800, 1440×900 및 1920×1080 크기에서 소분류 선택 화면이 잘리지 않는지 정적 Chromium으로 검사함
- 모바일/태블릿(1080px 미만): 기존 세로형 화면 유지
- 조사 결과, 추가 해설 영역을 사용자가 직접 펼치거나 비정상적으로 작은 화면에서 확대율을 높이면 영역 표시 제약이 발생할 수 있으므로, 이 경우 브라우저 높이와 글꼴 설정을 함께 확인해야 함

## 테스트
- `npm test`: 1004 / 1004 통과
- `node --check src/v819-safety-one-screen.js`: 통과
- Chromium PC 정적 레이아웃: 1280×800, 1440×900, 1920×1080; 5개 대분류 및 각 소분류 확인
- **최종 `npm run build`: 미완료** (`vite: not found`). `npm ci` 후 PC에서 재확인 필요
- 외부 MapLibre/WebGL·API 연동 및 실제 iPhone Safari: 이 환경에서 전체 통합 검증하지 못함

## 웹폰트 등록 방법 (`@font-face`)

웹 배포 권한이 있는 WOFF2 글꼴을 다음 위치에 두세요.

```text
public/
  fonts/
    Dongjak-Regular.woff2
    Dongjak-Medium.woff2
    Dongjak-Bold.woff2
```

`src/local-font.css` 등의 CSS에 아래 선언을 추가합니다. **이 파일 경로와 폰트명은 예시**입니다.

```css
@font-face {
  font-family: "DongjakWebFont";
  src: url("/fonts/Dongjak-Regular.woff2") format("woff2");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: "DongjakWebFont";
  src: url("/fonts/Dongjak-Medium.woff2") format("woff2");
  font-style: normal;
  font-weight: 500;
  font-display: swap;
}
@font-face {
  font-family: "DongjakWebFont";
  src: url("/fonts/Dongjak-Bold.woff2") format("woff2");
  font-style: normal;
  font-weight: 700;
  font-display: swap;
}
#app {
  font-family: "DongjakWebFont", "Apple SD Gothic Neo", sans-serif;
}
```

그다음 `index.html`의 다른 `src` 스타일시트 링크와 함께 다음 링크를 추가하세요.

```html
<link rel="stylesheet" href="/src/local-font.css" />
```

**중요:** Apple 산돌고딕 네오 원본 글꼴은 사용권을 확인하지 않은 상태에서 웹폰트 형태로 공개 배포하면 안 됩니다. 현재 패키지에는 사용자가 업로드한 글꼴 파일을 포함하지 않습니다. 사용권이 확실하지 않으면 시스템 기본 `Apple SD Gothic Neo`를 우선 사용하고, Windows에서는 별도의 사용 허가를 받은 웹폰트를 선택하세요.

## 실행

```powershell
npm ci
npm test
npm run build
npm run dev
```

Cloudflare Pages 배포: 빌드 성공 확인 후 `npm run deploy:pages`.
