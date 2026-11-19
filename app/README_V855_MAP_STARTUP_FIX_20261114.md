# 동작하는 안전지도 v8.5.5 — 지도 로딩 복구

## 문제와 수정
v8.5.4의 새 언어 전환 감시기(`src/v854-language.js`)에서 DOM 변경 감지 후 언어 라벨의 `textContent`를 무조건 재설정했습니다. `textContent` 재설정은 다시 `MutationObserver`를 호출하여 브라우저의 마이크로태스크가 연속 실행되고 지도 초기화가 막힐 수 있습니다.

- 언어 변경이 실제로 발생할 때만 언어 컨트롤을 수정하며, MutationObserver 내부에서 불필요한 텍스트 갱신을 하지 않도록 변경
- 지도 TIP의 크기 측정이 본인이 변경한 CSS 스타일을 다시 감지하는 반복 측정을 차단
- v8.5.4에 있던 PC 검색창, 모바일 UI, 검색 결과 2열, 영어 설정, 날씨/팁, 즐겨찾기 기능 유지
- 실제 사용자 기기에서 나타난 오류가 이 원인 하나였는지는 브라우저 콘솔 확인 전에는 단정할 수 없습니다.

## 기준 및 설치
- 전체 통합본: `DongjakApp_FULL_v8.5.5_MAP_STARTUP_FIXED_20261114.zip` — 새 폴더에 압축 해제하여 사용
- 작은 패치: `DongjakApp_v8.5.4_to_v8.5.5_MAP_STARTUP_HOTFIX_PATCH_20261114.zip` — 정확히 v8.5.4 소스에 적용
- 이전 v8.5.3이나 다른 소스에는 패치를 적용하지 말고 전체 통합본을 사용하세요.
- 패치 ZIP 압축 해제 후 `APPLY_PATCH.cmd` 실행 → 기존 v8.5.4 프로젝트 경로 입력 → 버전·핵심파일 SHA-256 확인 → 자동 백업 → 변경 파일 덮어쓰기
- 기존 `.env`, Cloudflare Secrets, 프로젝트 로컬 인증 정보는 건드리지 않습니다.

## 실행·검증 (Windows PowerShell)
```powershell
cd C:\DongjakApp\동작구앱폴더
npm.cmd ci
npm.cmd test
npm.cmd run check:release
npm.cmd run build
npm.cmd run dev
```
브라우저에서는 `npm run dev`가 표시하는 `http://localhost:...` 주소로 열어 주세요. `index.html`을 파일로 직접 더블클릭하면 `/src/...` 및 API 요청이 정상 동작하지 않습니다.

로컬에서 지도 표시를 확인한 뒤 기존 고정 도메인으로 배포:
```powershell
npx.cmd wrangler pages deploy dist --project-name dongjak-walk-safety-preview --branch main
```

## 검증 범위
- Node 전체 테스트 1,325개 통과 (실패 0)
- 추가 회귀 테스트: 언어 전환 감시기의 이벤트 무한 반복 방지 / TIP 스타일 자체 감시 차단
- JS 구문 검사, 릴리스 버전 정합성 통과
- 제작 환경에 Vite가 설치되어 있지 않아 `vite build` 실패(`vite: not found`)
- Chromium은 빈 페이지조차 렌더링되지 않아 실제 지도 기동 및 브라우저 화면 검증 미완료
- 따라서 지도 정상 작동은 사용자의 Windows 환경에서 최종 확인이 필요합니다.

## 지도가 여전히 열리지 않을 때
1. DevTools(F12) → Console에서 빨간색 오류 문구를 확인
2. `Ctrl+Shift+R`로 캐시 무시 새로고침, PWA라면 서비스워커 갱신 확인
3. 지도 초기화 전 `#map-startup-overlay`가 계속 남는지와 Network의 실패 요청 확인
4. 콘솔 오류 전체와 현재 실행 명령을 보내주시면 해당 실패 지점을 기준으로 수정합니다.
