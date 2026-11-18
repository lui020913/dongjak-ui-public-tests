# 동작하는 안전지도 v8.2.13 — UI·카카오·우선순위 메뉴 안전 통합

- 기준: 사용자가 올린 `DongjakApp_FULL_v8.2.13_PRIORITY_SHORTCUTS_INFO_SHEET_INTEGRATED_20261114(1).zip`
- 제품 버전은 8.2.13으로 유지합니다. 다른 개발 중인 버전이나 파일을 덮어쓰지 않습니다.
- v8.2.13의 중요 바로가기, 버튼 클릭 시 라벨 확장, 데이터 설명 시트, 더보기 메뉴를 보존합니다.

## 적용된 개선
1. 모바일 길찾기·커뮤니티·동작 소식·내 기록의 X·아이콘·제목 같은 줄 중앙 정렬과 헤더 여백 조정
2. 행정동 선택 X 정렬, 행정동 패널 표시 중 세로 지도 조작 버튼 숨김
3. 모바일 주요 플로팅 패널의 상단을 아래로 당겨 닫기; 본문 스크롤과 입력창은 제외
4. 카카오 OAuth의 Supabase 인증 URL·복귀 URL 검사와 코드 교환 오류의 정확한 안내
5. v8.2.13 우선순위 바로가기 메뉴가 CSS 캐시 불일치로 다중 행 확장되지 않도록 구조적 가로 스크롤 제약 및 CSS 모듈 포함
6. 원본 하단 내비게이션 위치, 지도 엔진, 교통·시설 서비스, v8.2.13 새 기능 보존

## 카카오 인증 오류의 한계
`Unable to exchange external code`는 Supabase 측에서 카카오 인증코드를 토큰으로 교환하지 못해 반환한 오류입니다.
앱 수정만으로 카카오 REST API 키와 활성 Client Secret이 일치하는지 확인하거나 서버 설정을 고칠 수 없습니다. 실제 로그인 성공을 보장하지 않습니다.
카카오 개발자 콘솔과 Supabase Authentication → Providers → Kakao에서 동일 앱 키·Client Secret 설정을 확인하고,
카카오 Redirect URI가 `https://<project>.supabase.co/auth/v1/callback`인지 확인하십시오.
Supabase Authentication → URL Configuration → Redirect URLs에 `https://dongjak-walk-safety-preview.pages.dev/oauth-popup.html`을 허용하십시오.
`npm run check:kakao`와 Supabase Authentication 로그에서 오류 원인을 검사하십시오.
Secret Key/service_role 키는 앱 소스나 이 ZIP에 넣지 마십시오.

## 적용과 복구
- 이 패치 ZIP은 기준 v8.2.13 프로젝트에만 적용됩니다. 압축 해제 → `APPLY_PATCH.cmd` → 기존 프로젝트 폴더 입력
- 변경 대상 파일의 원래 SHA-256을 검증하므로, 다른 작업이 같은 파일을 수정했다면 적용 전에 중단합니다.
- 변경 파일을 `patch_backups/dj_v8213_ui_kakao_*`로 백업하고, `RESTORE_PATCH.cmd`로 복원할 수 있습니다.
- 적용 가능 여부만 확인: `node APPLY_PATCH.mjs --target "C:\DongjakApp\프로젝트폴더" --dry-run`
- 기준 원본과 다른 최신 개발 버전은 반드시 차이 병합 후 적용하십시오.

## 로컬 검증 결과
- `npm test`: **1181 / 1181 통과**
- `npm run check:release`: 통과
- Chromium 모바일(390px): 우선순위 아이콘 가로 한 줄, 더보기 고정, 정보 라벨 확장/정보 시트 정상. CSS 비적용 상태에서도 한 줄 유지
- Chromium 모바일: 행정동 패널에서 세로 지도 버튼 숨김, 스와이프로 닫기, X·아이콘·제목 세로 중앙 정렬 확인
- Vite: 의존성 패키지를 오프라인에서 모두 설치할 수 없어 `npm run build`는 미검증
- iPhone PWA 및 실제 Kakao/Supabase 서버 로그인: 미검증

## 배포
전체 통합본을 사용하는 경우 기존 컴퓨터의 `.env.local` / `.env.production.local` 파일을 유지하십시오. ZIP에 비밀 설정은 넣지 않았습니다.
`npm ci`, `npm test`, `npm run build`, `npm run deploy:pages` 순서로 실행하십시오.
