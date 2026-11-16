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
