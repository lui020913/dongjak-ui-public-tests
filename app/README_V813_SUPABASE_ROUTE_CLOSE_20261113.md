# 동작하는 안전지도 v8.1.3 — Supabase 연결 도우미 및 길찾기 X 버튼 고정

기준: `DongjakApp_FULL_v8.1.2_LOGIN_BUTTON_VISIBLE_20261113.zip`.

## 변경
- **도보 길찾기 X 버튼**을 `#route-panel`의 제목 컨테이너 내부로 옮겼습니다. 제목 컨테이너를 독립 기준으로 설정하고, 모바일·PC 공통 우측 상단에 44×44px 닫기 버튼을 위치시킵니다. 열림/닫힘 이벤트·지도 엔진·경로 탐색 API는 그대로 유지합니다.
- **내 기록 → 즐겨찾기 계정 → 로그인**을 누르면, 환경변수가 없을 때 서버 접속 정보를 입력하는 폼을 제공합니다. Supabase의 **Project URL과 Publishable Key**(브라우저 공개값)만 입력할 수 있습니다. 이 값은 **현재 기기의 localStorage에만 저장**되며 입력 시 새로고침 후 이메일 로그인을 시도할 수 있습니다.
- 서비스 전체 방문자에게 로그인 기능을 제공하려면 관리자 PC의 프로젝트 폴더에서 `SETUP_SUPABASE.cmd`를 실행합니다. 이 스크립트는 공개 URL·Key만 `.env.production.local`/`.env.local`에 설정하며, 기존 다른 변수들은 보존합니다. 값을 ZIP에 포함하지 않습니다. 변경 뒤 새 빌드와 배포가 필요합니다.
- `.env.production.local`을 만든다고 Supabase DB가 생성되지는 않습니다. **Supabase SQL Editor**에서 `supabase/favorites.sql`을 한 번 실행하여 `user_favorite_state` 테이블과 사용자별 RLS를 구성하세요.

## 서버 연결 4단계
1. Supabase Dashboard → Connect 또는 Project Settings → API에서 Project URL, Publishable Key를 확인합니다. Secret Key나 `service_role`을 절대 사용하지 않습니다.
2. Windows에서 프로젝트 최상위 `SETUP_SUPABASE.cmd`를 실행하고 두 공개값을 입력합니다. PowerShell 파일이 같은 폴더에 있어야 합니다.
3. Supabase SQL Editor에서 `supabase/favorites.sql` 내용을 실행합니다. 이미 적용했다면 SQL 재실행이 필요하지 않습니다. Supabase Authentication → URL Configuration의 Site URL/Redirect URL에 배포 주소가 포함돼 있어야 합니다.
4. VS Code에서 `npm ci`, `npm test`, `npm run build`, `npm run deploy:pages` 순서로 실행합니다. `deploy:pages`도 내부에서 빌드를 실행합니다. 배포 후 새로고침하고 **내 기록 → 즐겨찾기 계정 → 로그인**에서 이메일 링크를 요청하세요.

### 온라인 사이트에서 단말기만 먼저 시험하는 방법
환경변수 없는 사이트에서 계정 로그인 버튼을 누르면 나타나는 설정 폼에 Project URL과 Publishable Key를 입력할 수도 있습니다. 이것은 **그 브라우저에만 저장**되므로 다른 방문자에게는 전파되지 않습니다. 실제 운영 전에는 반드시 위 Windows 관리자 설정을 통해 새 빌드를 배포하세요. 로그인 요청은 메일 발송 제공자 제한, URL 허용 목록 및 Supabase 서버 설정에 따라 실패할 수 있습니다.

### 주의 사항
- 프로젝트 ZIP은 Supabase 주소나 키 값을 임의로 생성하지 않습니다. **실제 두 값을 넣지 않으면 온라인 계정 로그인은 여전히 사용할 수 없습니다.**
- Supabase **Publishable Key는 공개 클라이언트 키**이며 RLS 정책이 접근 권한을 제한합니다. 그 외 Secret Key, DB Password, SMTP 비밀번호 등은 절대 웹 프런트엔드에 포함하지 마세요.
- 로컬 즐겨찾기는 별도 설정 없이 사용할 수 있습니다.
- 나머지 지도·교통·지도 UI의 핵심 로직은 유지합니다.
