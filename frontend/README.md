# 동작하는 안전지도 — 공개 프런트엔드 작업실 (v0.1)

> **독립된 UI 프로토타입입니다. 기존 앱 v8.8.x의 소스 이관·기능 복원·운영 배포가 완료된 것이 아닙니다.**

## 목적

공개 GitHub Actions의 표준 러너에서 동작하는, API 키가 필요 없는 프런트엔드를 별도로 구성합니다. 기존 비공개 저장소의 작업·Actions·Cloudflare Preview/Production 설정은 수정하지 않습니다.

현재 구성:
- PC 1280/1440/1920, 태블릿 768/1024, 모바일 375/390/430 반응형 작업 화면
- 기존 프로젝트의 녹색 계열 디자인을 참고한 독립 UI 및 지도 도구
- PC 및 태블릿 측면 패널 / 모바일 3단계(bottom/half/full) 바텀시트
- 검색 시연(노량진역·상도역·숭실대입구역), 테마, 야간 시야, 확대/축소, 현재 위치
- MapLibre GL JS + OpenStreetMap 공개 지도 타일. OpenStreetMap 타일 사용 정책 및 출처 표기가 적용됩니다.
- UI 액션·반응형 Playwright 검증, 비밀정보 불필요
- GitHub Actions의 public-frontend-viewport-screenshots 아티팩트에서 8개 화면 크기와 열린 모바일·태블릿 패널 이미지 확인

미구현: 원본 앱에 있는 안전시설/경사도/교통/길찾기/AI 검색/로그인/커뮤니티/Cloudflare Functions. 실제 데이터인 것처럼 샘플 위험도를 그리지 않습니다. 아직 실제 서비스용 프런트엔드로 교체해서는 안 됩니다.

## 실행

Node.js 22 이상 사용:

    cd frontend
    npm install
    npm run dev

브라우저에서 http://127.0.0.1:4173/ 열기.

    npm run check
    npm run build
    npx playwright install chromium
    npm run test:e2e

dist/는 독립 UI 시제품의 정적 결과물입니다. 기존 Pages Production에 연결하지 않습니다.

## 공개/비공개 분리 규칙

- 공개: 화면·스타일·사용자 인터랙션·공개용 검증 코드·비민감 정적 리소스.
- 비공개: functions/, server/, 인증 토큰, Cloudflare 자격증명, Supabase 서비스 역할 키, 원본 .env 파일, 테스트 계정, 실사용자 데이터.
- 공개 UI의 실제 백엔드 연동은 검토된 동일 출처 API 계약을 통해서만 수행해야 합니다. VITE_ 변수나 브라우저 번들에 비밀 키를 넣지 마세요.
- 원본 저장소의 기존 Git 이력을 그대로 공개하지 않습니다. 공개에 적합한 파일만 새 커밋으로 이관합니다.
- 원본 프런트엔드에서 CSS만 복사한다고 실제 서비스가 되는 것이 아닙니다. index.html/src/platforms의 import 관계와 public 자산을 감사한 뒤 기능 단위로 이관해야 합니다.

## 다음 통합 단계

1. 현재 진행 중인 비공개 Actions와 PR은 그대로 완료시킵니다.
2. 안정된 비공개 UI 기준 커밋을 확정합니다.
3. UI 및 브라우저 코드, 공개 가능한 자산의 import 그래프와 비밀정보를 검사합니다.
4. 프런트엔드 기능을 하나씩 이 공개용 패키지로 이관하고 Playwright 화면 회귀 테스트를 비교합니다.
5. 별도의 보안·기능 승인 후에만 기존 Cloudflare 운영 앱과 연결합니다.

이 작업 브랜치는 공개 저장소에 만들어졌지만 main이나 Production으로 자동 병합되지 않습니다.


## 실시간 UI 작업실 미리보기 (GitHub Pages)

개발 브랜치 `public/frontend-foundation-20261117`에 프런트엔드 코드가 push되면
`.github/workflows/public-frontend-preview.yml`이 자동 실행됩니다.

1. JavaScript 및 공개 소스 안전 검사 → Vite 빌드 → Chromium Playwright 테스트
2. 모든 검사가 통과한 경우에만 별도의 GitHub Pages 정적 UI 작업실을 배포
3. 프리뷰 고정 주소 (GitHub Pages 활성화/첫 배포 성공 후): `https://lui020913.github.io/dongjak-ui-public-tests/`
4. 확인 링크: `https://github.com/lui020913/dongjak-ui-public-tests/actions/workflows/public-frontend-preview.yml`

**최초 1회 사용자 설정 필요:** 공개 저장소의 **Settings → Pages → Build and deployment → Source: GitHub Actions**를 선택합니다. 아직 설정하지 않았다면 배포 작업이 실패할 수 있으며, 위 URL의 접속 여부만으로 배포 성공을 단정하지 마세요. 저장소 관리자에게 이 설정 변경 권한이 필요합니다.

프리뷰는 공개된 익명 정적 UI 시제품이고 원본 앱의 실제 데이터·로그인·길찾기·운영 서비스가 아닙니다.
원본 비공개 저장소의 Cloudflare Preview·Production을 변경하지 않으며 API 키/토큰을 사용하지 않습니다.
테스트가 실패하면 마지막 성공한 화면이 그대로 보일 수 있으니 새 버전 여부는 배포 Action의 커밋 SHA를 확인하세요.
