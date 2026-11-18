# 동작하는 안전지도 v8.2.0 — 계정센터, Google 로그인, 모바일 X 버튼

**기준 소스:** `DongjakApp_FULL_v8.1.3_SUPABASE_SETUP_ROUTE_CLOSE_20261113.zip`.

## 포함된 기능

- **내 기록 → 즐겨찾기 계정 → 로그인·회원가입**: 비밀번호 로그인(`signInWithPassword`), 이메일 신규 회원가입(`signUp`), 기존 이메일 링크 로그인(`signInWithOtp`), 비밀번호 재설정 요청(`resetPasswordForEmail`)
- **로그인 후 → 내 계정:** 현재 로그인 이메일과 표시 이름, `내 정보`(표시 이름 변경), `보안 설정`(비밀번호 추가·변경 / 이메일 변경 확인 요청), `연결된 계정`(Google 연결 상태·연동) 및 로그아웃
- **Google로 계속하기:** Supabase OAuth(`signInWithOAuth`)로 Google 인증 요청. Google Provider를 켜지 않으면 **버튼은 보여도 OAuth 로그인은 실패**합니다.
- **기존 사용자 Google 연동:** 로그인 중 `Google 계정 연결`은 `auth.linkIdentity`를 사용합니다. Supabase의 **수동 Identity Linking 설정**이 필요한 경우에는 먼저 활성화하십시오.
- **기존 이메일 링크 사용자:** **다시 회원가입하지 않고** 현재 계정으로 로그인 → `내 계정 → 보안 설정`에서 비밀번호를 설정합니다. 같은 사용자 ID를 유지해야 기존 즐겨찾기가 유지됩니다.
- **모바일 닫기 버튼:** 길찾기·커뮤니티·동작 소식·내 기록의 헤더 오른쪽 위 X 배치를 통일. 기존 닫기 이벤트는 변경하지 않습니다.
- **즐겨찾기:** 기존 `public.user_favorite_state` 테이블·RLS·저장 형식 그대로 사용합니다. **SQL을 다시 실행할 필요가 없습니다.**

## Google OAuth 연결 — 관리자 설정 필수

1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트를 선택/생성하고 **Google Auth Platform**에서 앱 이름, 지원 이메일, 동의 화면, 테스트/게시 대상을 설정합니다.
2. **OAuth 클라이언트 → Web application**을 생성합니다.
   - Authorized JavaScript origin: `https://dongjak-walk-safety-preview.pages.dev`
   - 개발용인 경우 `http://localhost:5173` 같은 실제 개발 주소도 등록합니다.
   - Authorized redirect URI: `https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback` (**Cloudflare 주소가 아닙니다.** Supabase Authentication → Providers → Google 화면에서 표시되는 콜백 URL과 일치해야 합니다.)
3. Google이 발급한 **Client ID / Client Secret**을 **Supabase Dashboard → Authentication → Sign In / Providers → Google**에만 입력하고 Google 제공자를 활성화합니다. **Client Secret을 Vite .env 또는 웹 코드에 넣지 마세요.**
4. Supabase **Authentication → URL Configuration**에서 Site URL 및 Redirect URLs에 `https://dongjak-walk-safety-preview.pages.dev/**`와 실제 개발 주소가 있는지 확인합니다.
5. 기존 이메일 계정에 Google 계정을 연결하려면 Supabase의 **Identity Linking / Manual Linking** 사용 설정을 확인합니다. 이미 이메일 링크로 로그인한 계정의 즐겨찾기를 보호하려면 **로그아웃하기 전에 계정센터에서 연동**하세요. 다른 이메일의 Google 계정으로 새로 로그인하면 별도 사용자 ID와 별도 즐겨찾기가 될 수 있습니다.

상세한 최신 설정은 Supabase 공식 문서 `https://supabase.com/docs/guides/auth/social-sign-in/auth-google`와 `https://supabase.com/docs/guides/auth/auth-identity-linking`에서 확인하세요.

## 이메일·비밀번호 로그인 및 SMTP

- Supabase **Authentication → Providers → Email**의 이메일 로그인을 사용합니다. 일반적으로 이메일 확인을 요구하며 비밀번호 정책은 Supabase 설정에 따릅니다. 이번 화면은 8글자 이상 입력을 요구합니다.
- 기존 이메일 링크 사용자: `내 계정 → 보안 설정 → 비밀번호 설정·변경`부터 진행합니다.
- 비밀번호를 잊은 경우 로그인 화면에서 이메일을 입력해 **비밀번호 재설정 메일 받기**를 선택합니다. 링크 인증 후 앱의 보안 설정에서 새 비밀번호를 등록합니다.
- 신규 사용자 인증 메일과 비밀번호 재설정 메일의 실제 발송에는 이메일 제공자 설정이 필요합니다. 운영 공개 전에는 **Custom SMTP**를 설정하고 실제 메일 발송과 재전송 제한을 확인하세요.
- 계정 삭제 자동화는 이번 버전에 포함하지 않았습니다. 브라우저에 `service_role`을 제공하면 안 되므로 서버 측의 안전한 계정 삭제 엔드포인트 및 연관 데이터 삭제 정책을 별도로 설계해야 합니다.

## 배포 및 검증

1. 기존 프로젝트를 보호하고 **전체 ZIP을 별도 폴더에 압축 해제**하거나, 기준 v8.1.3에만 델타 패치를 적용합니다.
2. 기존 `.env.local` 또는 `.env.production.local`에 이미 등록한 `VITE_SUPABASE_URL`과 `VITE_SUPABASE_PUBLISHABLE_KEY`는 **그대로 유지**하십시오. 전체 ZIP은 개인 환경변수를 포함하지 않습니다.
3. `npm ci` → `npm test` → `npm run build` → `npm run deploy:pages`. (`deploy:pages`는 빌드를 다시 실행합니다.)
4. 사이트의 **내 기록 → 즐겨찾기 계정 → 로그인·회원가입 / 내 계정**에서 흐름을 확인합니다.

**검증 범위:** 관련 Node 테스트와 Chromium의 모의 Supabase 인증 응답으로 계정센터 구조·탭 전환·모바일 X 정렬을 검사했습니다. **실제 Google OAuth·Supabase 서버 이메일 발송·실제 iPhone 홈화면·Cloudflare 실배포 성공을 주장하지 않습니다.**
