# 동작하는 안전지도 v8.1.2 — 로그인 버튼 표시 수정

기준: `DongjakApp_FULL_v8.1.1_NAV_ICONS_HISTORY_20261113.zip` (정확한 기준본에만 델타 패치 적용).

## 수정 원인
- 기존 `installFavoritesCloud()`는 Supabase 빌드 환경변수가 없으면 이메일 로그인 폼을 감췄습니다. 방문자는 로그인 진입 버튼 자체를 볼 수 없었습니다.
- 즐겨찾기 계정 영역이 저장 장소·그룹 목록 아래에 있어 긴 목록을 스크롤해야 했습니다.

## 변경 내용
- **내 기록** 첫 영역에 항상 보이는 **로그인** 버튼을 배치했습니다. PC·모바일 모두 표시됩니다.
- 버튼으로 이메일 로그인 폼을 열고 닫을 수 있으며 `aria-expanded`를 갱신합니다.
- 서버 환경설정이 없으면 로그인 동작을 가장하지 않고, 필요한 URL·Publishable Key 및 재빌드 안내를 보여줍니다.
- 로그인한 상태에서는 같은 버튼이 **계정 관리**로 바뀌고, 내부에 로그아웃 동작이 표시됩니다.
- 기존 즐겨찾기·그룹·버스·지하철 데이터 구조와 Supabase SQL/RLS는 변경하지 않았습니다.
- 패치 버전 **v8.1.2**로 앱 표시·업데이트 이력·패키지 버전을 동기화했습니다.

## 서버 로그인 활성화
1. Supabase 프로젝트에서 SQL Editor를 열어 `supabase/favorites.sql`을 실행합니다. (이미 완료했다면 재실행하지 않아도 됩니다.)
2. **지도 프로젝트** 최상위에 `.env.production.local` 파일을 만들고 다음 값만 설정합니다:
   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_PUBLIC_KEY
   ```
3. `npm ci`, `npm run build`, `npm run deploy:pages` (이 프로젝트 deploy 스크립트는 build를 다시 실행합니다)를 실행합니다.
4. Cloudflare 사이트에서 `내 기록` → `로그인` → 이메일 입력 → 인증 링크 수신을 확인합니다.

**중요:** Supabase 대시보드의 Site URL/Redirect URLs 설정만으로는 웹사이트가 Supabase에 연결되지 않습니다. 위 `VITE_` 공개값이 **Vite 빌드 시점**에 필요합니다. 새 `.env.production.local`을 추가했다면 새 빌드·배포가 필수입니다. 개발서버 `npm run dev`를 사용하는 경우에는 `.env.local`에도 같은 **공개값만** 넣어야 합니다. `sb_secret_`, `service_role`, 데이터베이스 비밀번호는 절대 `VITE_`에 넣지 마세요. 

`.env.production.local`은 배포 ZIP이나 원격 Git 저장소에 올리지 마세요. 패치는 기존 환경변수 파일을 변경하거나 삭제하지 않습니다.

## 검증과 한계
- `npm test`: 1076/1076 통과.
- `npm run check:release`: 모든 버전 동기화 검사 통과.
- Chromium DOM 테스트: PC 1440px / 모바일 390px에서 **설정 미완료·설정 완료** 두 상태 모두 버튼 표시, 펼치기, 폼, 이메일 로그인 핸들러 연결 확인.
- 실제 Supabase 이메일 발송, 로그인 후 DB 동기화, 온라인 Cloudflare 배포 화면은 계정 설정 없이 검증할 수 없습니다.
