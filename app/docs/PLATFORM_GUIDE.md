# 환경별 소스 관리 지침 (v7.10.0)

플랫폼은 **세 개의 완전히 독립된 지도 복제본이 아닙니다.** 공통 지도·교통 정보는 한 번만 수정해야 합니다.

- `platforms/ios-pwa`: iOS Safari 홈 화면 독립 실행 PWA; iOS 상단 영역·시스템 상태표시줄 색상 대응.
- `platforms/pc-chromium`: Chromium 계열 PC(데스크톱 700px 이상) 중심의 별도 웹 출력.
- `platforms/android`: Android Chrome/Capacitor 앱; Android 앱 빌드에 iOS 전용 PWA 설정 포함 금지.

기존 v7.9.5 모바일 UI 기능들은 `src/mobile-*`에 일부 남아 있습니다.
기존 자동 테스트와 이벤트 핸들러를 유지하기 위한 것으로, **향후 플랫폼 전용 신규 UI는 `platforms/` 아래에 추가**하십시오.
`src/main.js`, `src/transport-map.js`, `src/map-startup-loader.js`는 공통으로 유지합니다.

`npm run build`는 기존 Cloudflare 공용 사이트용이며, 브라우저에서 런타임을 식별합니다.
`build:pc`, `build:ios`, `build:android`는 전용 빌드로 진입할 때 불필요한 플랫폼 HTML 링크를 제외합니다.

주의: 실제 iOS Safari/PWA 및 Android WebView는 이 환경에서 재현하지 못했습니다.
사용자 기기에서 모바일 검색·테마·상단 툴바·교통정보를 별도 점검해야 합니다.
