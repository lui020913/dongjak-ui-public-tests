# v8.2.10 카카오 로그인 시 지도 재로딩 방지 이식

## 기준
- 사용자 첨부 원본: `DongjakApp_FULL_v8.2.10_REQUESTED_MOBILE_FACILITY_METRO_UI_20261114(1).zip`
- 표시 버전: **v8.2.10 유지** (다른 UI·지도 기능과 버전 메타데이터 불변)
- 기존 지하철역명·호선 배지 중앙정렬, 네이버지도 시설검색 표기, 시설정보 플로팅 UI, 모바일 아이콘/닫기 버튼 개선 등 **수정하지 않음**.

## 원인 / 변경
- 원본은 카카오 `signInWithOAuth()`가 기존 탭을 Kakao 인증으로 리디렉션합니다. 복귀하면 지도 문서와 MapLibre가 다시 생성됩니다.
- 카카오 버튼 터치 즉시 **팝업 인증 창**을 먼저 열고, `skipBrowserRedirect: true`로 기존 페이지의 이동을 피합니다.
- Supabase 로그인 완료 뒤 `/oauth-popup.html`이 동일 출처에서 기존 지도 창으로 결과를 전달합니다.
- 기존 화면의 Supabase 클라이언트에 세션만 적용하므로 정상적으로 연결되는 경우 현재 지도 인스턴스, 위치, 줌, 메뉴가 유지됩니다.
- 팝업 차단 시 기본 리디렉션 방식으로 이동하고, 팝업 인증에 실패한 경우 '일반 카카오 로그인' 대체 버튼을 표시합니다.
- 이메일 로그인·회원가입·계정 연결·즐겨찾기 동기화는 v8.2.10 기존 로직을 유지합니다.
- 기존 v8.2.9의 카카오톡 알림 등 이 ZIP에 원래 없던 별도 기능은 추가하지 않았습니다.

## Supabase 관리자 설정 (필수)
Supabase Dashboard → Authentication → URL Configuration → Redirect URLs 에 아래 주소를 추가하십시오.

`https://dongjak-walk-safety-preview.pages.dev/oauth-popup.html`

로컬 로그인도 테스트하면 로컬 주소를 추가하십시오. 예: `http://localhost:5195/oauth-popup.html` (실제 접속 주소에 맞춰 변경)

**Kakao Developers의 Redirect URI는 기존 Supabase callback을 그대로 사용하십시오.**
`https://<프로젝트-id>.supabase.co/auth/v1/callback`

`VITE_SUPABASE_URL` 및 `VITE_SUPABASE_PUBLISHABLE_KEY`는 기존 빌드 설정을 유지하십시오. Secret/service_role 키는 사용하지 않습니다.

## Windows 자동 패치
1. 이 패치 ZIP 압축을 해제합니다.
2. `APPLY_PATCH.cmd`를 실행하고 **기존 v8.2.10 프로젝트 최상위 폴더**를 입력합니다.
3. 폴더의 `package.json` 버전과 계정 소스 원본 SHA-256을 확인합니다. 일치하지 않으면 덮어쓰지 않습니다.
4. 원본 파일을 `patch_backups/v8210_kakao_날짜_시간`에 백업한 뒤 변경 파일만 적용합니다.
5. 되돌리려면 `RESTORE_PATCH.cmd`로 해당 백업 폴더를 선택할 수 있습니다.

## 빌드 / 테스트 / 배포
```powershell
npm ci
npm test
npm run check:release
npm run build
npm run deploy:pages
```

## 검증 결과
- 원본 v8.2.10 자동 테스트 1,153건 + 추가 OAuth 검사 4건 = **1,157/1,157 통과**
- `npm run check:release` 통과 (v8.2.10 / 136 releases)
- `node --check` 인증 모듈 통과
- **전체 Vite 빌드 미완료:** 이 실행 환경에 Vite 실행 파일이 없어 `vite: not found` 발생
- **Cloudflare 배포 및 iPhone Safari/PWA 실제 카카오 로그인 미검증**

## 한계
- iOS 설치형 PWA에서는 팝업과 원래 앱 간 연결이 OS/브라우저에 의해 차단될 수 있습니다. 이때는 일반 리디렉션 로그인 방식이 필요하며 지도 새로고침이 발생할 수 있습니다.
- 인증 결과 전달 페이지에는 세션 값이 잠시 도착하지만 즉시 URL에서 제거하며, 외부 출처나 다른 창의 `postMessage`는 원래 지도 창에서 거부합니다.
- 실제 재로딩 문제는 배포 후 동일 출처 팝업 통신과 기기별 정책을 확인해야 최종 해결 여부를 판단할 수 있습니다.
