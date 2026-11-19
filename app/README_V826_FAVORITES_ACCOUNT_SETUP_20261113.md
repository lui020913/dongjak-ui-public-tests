# 동작하는 안전지도 v8.26.0 — 최신 v8.25.0 기반 즐겨찾기·그룹·Supabase 로그인

## 변경 범위

- **최신 v8.25.0의 시설 상세 UI / 교통 카드 / 위치 선택 마커 / 카메라 초점 / 지도 레이어 코드를 보존**한 채 즐겨찾기만 추가했습니다.
- 지하철역과 버스정류장을 교통정보창의 `☆ 즐겨찾기`로 저장할 수 있습니다. 교통정보창에서 저장 그룹도 바꿀 수 있습니다.
- `내 기록 > 저장한 장소 · 대중교통`에서 그룹을 생성·이름 변경·삭제하고, 저장 장소를 원하는 그룹으로 옮기고 삭제할 수 있습니다.
- 비로그인 사용자는 기존 localStorage 즐겨찾기 키 `dj-map-v815-bookmarks`를 그대로 사용합니다. 구 버전 데이터가 삭제되지 않습니다.
- 메일 로그인과 Supabase DB 연동은 **프로젝트 URL 및 publishable key를 실제로 설정한 뒤** 활성화됩니다.
- 서버에 전송하는 내용은 **사용자가 저장한 장소·교통정류장 목록과 그룹**뿐입니다. GPS, 검색 기록, 실시간 대중교통 API 키는 업로드하지 않습니다.
- 구 서버, 지도 API, 날씨 및 TTS 코드는 변경하지 않았습니다. 앱 표시 버전은 `v8.26.0`입니다.

## Supabase 1~4단계를 마치셨다면: 이어서 할 일

### 5. SQL Editor에서 사용자별 즐겨찾기 테이블 만들기

Supabase 대시보드 → **SQL Editor → New query**를 열어 `supabase/favorites.sql` 전체를 붙여넣고 **Run** 하세요.
`public.user_favorite_state` 테이블과 `auth.uid() = user_id` 기반 RLS 정책 3개가 설치됩니다.

작업 후 **Table Editor**에서 `user_favorite_state`가 존재하는지, RLS가 켜졌는지 확인하세요.

### 6. 로컬 프로젝트 환경변수 지정

프로젝트 루트(`package.json`과 같은 위치)에 `.env.production.local`을 만드세요. 폴더 `public`이 아닙니다.

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_PUBLIC_KEY
```

실제 Supabase Dashboard의 **Project URL**과 **Publishable Key**로 교체하세요.
이 공개 키를 Vite에 넣는 것은 정상적인 동작이며 RLS가 사용자의 데이터 접근을 통제합니다. **절대로 `service_role`, `sb_secret_*`, 데이터베이스 비밀번호나 기타 관리자 비밀을 넣으면 안 됩니다.**
파일 `.env.production.local`은 `.gitignore`에 포함되어 있으므로 공개 ZIP에 포함되어 있지 않습니다.

예전 프로젝트에 이미 `.env.production.local`이 있다면 덮어쓰지 말고 두 줄만 추가하십시오.

### 7. 개발서버 확인과 Cloudflare Pages 배포

```powershell
npm ci
npm test
npm run build
npm run deploy:pages
```

- `npm run deploy:pages`는 **기존 Cloudflare 프로젝트** `dongjak-walk-safety-preview`에 새 `dist` 파일을 배포합니다.
- `npm run build`는 `.env.production.local`에 넣은 **빌드 시점 값**을 사용합니다. Cloudflare 대시보드에 변수만 추가하고 별도 로컬 빌드를 실행했다면 그 값이 자동으로 주입되는 것은 아닙니다.
- Vite 개발서버에서는 `.env.local`(개발용) 또는 개발 모드에 맞는 설정을 사용하세요. 서버를 재실행해야 환경변수가 반영됩니다.
- 이미 Authentication → URL Configuration에서 Site URL과 Redirect URLs에 `https://dongjak-walk-safety-preview.pages.dev/**` 및 실제 접속 도메인을 등록하셨는지 점검하세요.
- Supabase의 기본 이메일 발송 서비스에는 발송 한도 및 운영 제한이 있으므로 외부 사용자에게 공개할 때는 SMTP 설정을 점검해야 합니다.

### 8. 실제 온라인 계정 확인

1. 배포 사이트를 엽니다. `내 기록 → 즐겨찾기 계정 · 기기 간 동기화`에서 이메일 주소를 입력합니다.
2. 받은 메일의 로그인 링크를 통해 **실제 배포 도메인**으로 돌아옵니다.
3. `서버 연결됨` 또는 `서버에 저장 완료` 표시를 확인한 뒤 버스정류장·지하철역을 각각 저장합니다.
4. 시크릿 창 또는 다른 기기에서 같은 이메일로 로그인해 즐겨찾기·그룹이 복구되는지 확인합니다.
5. 서로 다른 **두 계정**으로 로그인해 상대방의 저장 목록이 보이지 않는지 점검합니다.

`내 기록`에 이메일 입력창이 보이지 않는다면 `.env.production.local`의 두 값이 **빌드 시점**에 반영되지 않았거나, URL·키 형식이 유효하지 않은 경우입니다.
로그인 메일이 오지 않는다면 Supabase Authentication 이메일 공급자·발송 한도·SMTP를 확인하세요.

## 제한 및 안전성

- SQL 실행과 유효한 URL/Publishable Key 적용 전에는 **서버 저장이 되지 않습니다**. 기존 기능은 로컬 저장으로 계속 사용합니다.
- 서로 다른 기기에서 같은 항목을 동시에 바꾸면 나중에 업로드한 스냅샷이 우선할 수 있습니다. 고빈도 동시 수정 충돌 조정은 아직 없습니다.
- 여러 도메인 또는 Android 앱까지 인증을 확장할 때는 별도의 Redirect URL 허용 목록과 콜백 검증이 필요합니다.
- 공개 운영 전에는 개인정보 처리방침, 계정 탈퇴 및 데이터 삭제 절차, 서버 오류·메일 발송 정책을 마련해야 합니다.

## 검증

```powershell
node --test tests/v826-favorites-cloud.test.mjs
npm test
```

단위 테스트/브라우저 모의 환경에서는 저장·그룹·교통정보 탭 이동을 확인했습니다. **실제 Supabase 로그인/메일 발송/DB 저장은 프로젝트의 실계정 연동이 필요하므로 검증 대상이 아닙니다.**
