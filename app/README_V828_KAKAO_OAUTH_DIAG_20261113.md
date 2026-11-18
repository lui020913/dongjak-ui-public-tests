# v8.2.8 — 카카오 로그인 실제 인증 요청 진단

기준 원본: `DongjakApp_FULL_v8.2.7_LIVE_TRANSIT_GPS_SAFETY_NAV_INTEGRATED_20261113(1).zip`.

## 확인된 구조

- `src/v824-favorites-cloud.js`: 로그인 및 계정 연결은 Supabase의 `signInWithOAuth({provider:'kakao'})`, `linkIdentity({provider:'kakao'})`를 사용합니다.
- 이 클라이언트 코드는 별도의 `scopes` 또는 카카오 REST API 키를 하드코딩하지 않습니다.
- 현재 Supabase Auth의 카카오 공급자는 `account_email`, `profile_image`, `profile_nickname`을 기본 scope로 요청합니다. 카카오 `KOE205`는 실제 인가 요청에 포함된 scope가 해당 카카오 앱의 동의항목/기능 설정과 일치하지 않을 때 발생합니다. `openid`가 요청되는 경우 OIDC 활성화도 확인해야 합니다.
- 카카오 제공자의 REST API Client ID와 Client Secret은 Supabase 관리자 대시보드에서만 바꿀 수 있고, ZIP만 수정해서 교체할 수 없습니다.

## 최신본에서 진단하는 법

1. 기존 Supabase 공개값이 `.env.production.local` 또는 `.env.local`에 입력된 프로젝트 폴더로 이동합니다. **Secret Key나 Client Secret은 입력하지 마세요.**
2. VS Code 터미널에서 다음 명령을 실행합니다.
   ```powershell
   npm run check:kakao
   ```
3. `client_id`는 기본적으로 앞/뒤 네 자리만 표시됩니다. 실제 REST API 키와 비교해야 하면 개인 PC에서만 다음을 사용합니다.
   ```powershell
   node scripts/check-kakao-oauth.mjs --show-client-id
   ```
   **전체 키가 표시된 화면은 인터넷에 공유하지 마세요.**
4. 카카오디벨로퍼스의 **동의항목을 설정한 앱 → 앱 → 플랫폼 키 → REST API 키**와 `client_id`가 일치하는지 확인합니다.
5. 출력의 `scope` 값이 카카오 로그인 동의항목에 설정된 값과 일치하는지 확인합니다. `openid`가 있으면 카카오 OpenID Connect 설정을 확인합니다.
6. 출력의 Redirect URI를 **카카오디벨로퍼스 → 앱 → 플랫폼 키 → REST API 키 → Redirect URI**에 등록된 주소와 비교합니다.
7. Supabase Authentication → Providers → Kakao에서 Client ID, 활성화된 Client Secret 및 로그인 제공자 설정을 확인합니다.

### 실행 결과 해석

| 증상 | 확인 항목 |
|---|---|
| `client_id` 불일치 | Supabase Kakao Client ID가 다른 카카오 앱의 REST API 키로 설정됐을 수 있습니다 |
| `scope`에 `openid` 포함 | 카카오 OIDC 활성화 여부 확인. 사용하지 않는다면 요청하지 않도록 공급자 설정 검토 |
| `account_email`, `profile_image`, `profile_nickname` 중 일부 동의항목 미설정 | 해당 카카오 앱 동의항목 활성화 확인 |
| Redirect URI 불일치 | Supabase 프로젝트 Callback URL을 카카오 REST API 키의 Redirect URI로 등록 |
| `.env.production.local` 미설정 | 공개 Supabase URL/Publishable Key만 입력. 기존 브라우저 임시 설정은 이 명령에서 읽지 못함 |
| 설정 모두 일치하지만 실패 | 카카오 오류 화면의 **정확한 코드와 `설정하지 않은 동의 항목`**을 확인. KOE205 외 오류는 별도 원인 |

### 온라인 사용자에 대한 주의

`npm run check:kakao`는 **현재 PC의 환경변수에 설정된 프로젝트**만 진단합니다. 이미 배포된 웹사이트의 Supabase 설정이 다르거나, 브라우저에 일시적으로 다른 Project URL을 저장한 경우 실제 로그인 요청은 다른 프로젝트로 나갈 수 있습니다. 이를 확인하기 위해 앱의 **내 기록 → 즐겨찾기 계정 → 로그인(또는 연결된 계정) → 카카오 로그인 오류·연결 설정 확인**을 펼치면 브라우저에 적용된 Supabase 프로젝트 호스트와 콜백 주소를 보여줍니다.

이 진단 화면에는 공개 프로젝트 도메인만 표시됩니다. Supabase의 publishable key나 OAuth Client Secret은 표시하지 않습니다.

카카오의 앱 설정이 변경된 뒤에는 카카오 로그인 시도를 새로 시작해야 합니다. 기존 브라우저 화면에서 오류가 발생한 인가 요청 URL을 새로고침하는 것만으로는 갱신되지 않을 수 있습니다.

## 검증 범위

- URL 파싱/동의항목 추출/외부 URL 차단 테스트는 로컬에서 검증.
- 실제 Supabase/Kakao OAuth 호출은 계정·환경변수가 제공되지 않아 검증할 수 없습니다.
- 기존 지도·교통·길찾기·즐겨찾기 구조 및 SQL/RLS는 수정하지 않았습니다.
