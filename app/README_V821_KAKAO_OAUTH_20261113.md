# v8.2.1 카카오 로그인 전환 (2026-11-13)

기준: DongjakApp_FULL_v8.2.0_ACCOUNTS_GOOGLE_MOBILE_CLOSE_20261113.zip

## 적용 사항
- 비로그인: 카카오로 계속하기 (Supabase `signInWithOAuth({provider: "kakao"})`)
- 기존 이메일 계정 로그인 후: 내 계정 > 연결된 계정 > 현재 계정에 카카오 연결 (`linkIdentity`)
- 카카오가 연결된 계정에는 연결 버튼 숨김, 인증 상태 변경 시 연결된 방식 갱신
- 이전 즐겨찾기 및 SQL/RLS 구조 유지, 비밀번호·이메일 로그인 유지
- Google 로그인 버튼은 새 UI에서 제거(과거 업데이트 기록 보존)

## Supabase 대시보드 설정 확인
1. Authentication > Sign In / Providers > Kakao 활성화 확인
2. Kakao Developers의 Redirect URI에 Supabase Callback URL(`https://<project-ref>.supabase.co/auth/v1/callback`) 등록
3. Authentication > URL Configuration에 `https://dongjak-walk-safety-preview.pages.dev/**` 및 로컬 개발 주소 추가
4. 기존 이메일 계정 연결에는 Authentication 설정에서 Manual Linking 활성화가 필요할 수 있음
5. 동일한 이메일 주소라도 별도 OAuth 가입 시 계정이 반드시 병합된다고 가정하지 마세요. 원래 계정으로 먼저 로그인 후 연결 권장

> Kakao REST API Key/Client Secret은 Supabase 관리자 설정에만 저장하고 앱 소스/배포 ZIP에 넣지 마세요. 앱에 필요한 값은 기존 VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY뿐입니다.

## 로컬 점검 및 배포
```powershell
npm ci
npm test
npm run check:release
npm run build
npm run deploy:pages
```
Google OAuth 대신 카카오 인증을 실행하는 코드가 포함된 상태입니다. **실제 카카오 계정의 OAuth 로그인 및 기존 계정 연결은 실계정으로 검증되지 않았습니다.**
