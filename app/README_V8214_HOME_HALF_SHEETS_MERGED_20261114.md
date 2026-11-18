# DongjakApp v8.2.14 · 가운데 안전지도 홈 / 50% 높이 패널 / 카카오 진단 통합

기준 프로젝트: `DongjakApp_FULL_v8.2.14_UI_KAKAO_PRIORITY_SAFE_MERGED_20261114(1).zip`

## 변경 내역

- 하단 탭 순서: 길찾기 / 커뮤니티 / **안전지도(홈)** / 동작 소식 / 내 기록.
- 가운데 안전지도 탭 누르면 지도 화면으로 이동하며 기본 레이어와 추가 표시 설정, 선택된 행정동·필터를 기본 상태로 복원합니다. 사용자 계정, 즐겨찾기, 게시글, 업로드한 파일, 테마 등은 삭제하지 않습니다.
- 행정동 선택은 지도 옵션의 `행정동 선택 · 경계 보기`에서 여는 방식으로 정리했습니다.
- 길찾기·커뮤니티·동작 소식·내 기록·행정동 패널의 제목 아이콘/제목을 왼쪽, X를 오른쪽으로 배치합니다.
- 모바일 하단 탭 플로팅 시트 최대 높이 50dvh, 내부 스크롤, 중앙 회색 드래그 손잡이 및 아래로 당겨 닫기 모션을 적용했습니다.
- 카카오 로그인 요청의 중복 실행을 차단하고, Supabase 인증 실패 시 설정 진단 및 로그 안내를 보강했습니다.
- **v8.2.14 전용 기능 유지**: 개인화 바로가기, 날씨 정보 시트, 야간 시야 동의, 동작구 외부 경로 선택 차단 등.

## 카카오 로그인에 대한 한계

앱의 중복 OAuth 요청은 예방하지만, `Unable to exchange external code`는 Supabase Auth 서버가 카카오 인증 코드를 교환하지 못했다는 의미이며 앱 패치만으로 해결된다고 보장할 수 없습니다. 다음을 관리자 화면에서 대조하십시오.

1. Kakao Developers의 동일한 앱에서 **REST API 키**와 Client Secret 사용 여부 및 실제 활성값 확인.
2. Supabase Authentication → Sign In / Providers → Kakao에 정확히 같은 REST API 키/활성 Client Secret 입력.
3. 카카오 Redirect URI: `https://phijvaiakrsxrqkuutds.supabase.co/auth/v1/callback` (실제 프로젝트 주소가 일치할 때).
4. Supabase Authentication → URL Configuration에 실제 지도 서비스 및 `https://dongjak-walk-safety-preview.pages.dev/oauth-popup.html` 등록.
5. 새로운 로그인 시도 직후 Supabase Auth 로그에서 코드 교환 실패 원인을 확인. OAuth 일회성 코드는 재사용하지 마십시오.

실제 Secret/API 관리자키는 이 ZIP에 포함되지 않으며, 공개용 Supabase Publishable Key는 각자 `.env.local` 또는 `.env.production.local`에 설정해야 합니다.

## 테스트

- `npm test` — 1195/1195 통과 (기존 v8.2.14 회귀 테스트 + 통합 검증).
- `npm run check:release` — 통과 (v8.2.14 / 릴리스 136개).
- 전체 Vite 빌드 — 이 환경에 Vite 실행 파일이 없어 **미검증**.
- iPhone Safari/PWA 실기기 — **미검증**.

## 사용법

전체 ZIP을 임의 폴더에 압축 해제하고 기존 프로젝트의 비공개 `.env` 파일을 복사한 다음:

```powershell
npm ci
npm test
npm run check:release
npm run build
npm run deploy:pages
```

배포는 본인 계정의 Cloudflare Pages 설정이 완료돼 있을 때에만 실행하십시오. 패치 ZIP은 기준 v8.2.14의 동일 파일 해시를 검사하고 변경 전 파일을 백업합니다.
