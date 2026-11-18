# 동작구 안전지도 — 자동 검사·알림·배포·복구 운영 절차

현재 저장소: `lui020913/dongjak-safety-map` (**Private**).

## 지금 준비된 기능
- `.github/workflows/dongjak-visual-audit.yml`: 앱 소스가 있으면 회귀·브라우저 검사
- `.github/workflows/dongjak-security-audit.yml`: 비밀값 패턴·의존성 검사
- `.github/workflows/dongjak-uptime-monitor.yml`: 30분 간격 HTTPS 응답 확인
- `.github/workflows/dongjak-source-backup.yml`: 소스가 있으면 Git 태그/복구 후보; 소스 없어도 복구 알고리즘 모의 검사
- `.github/workflows/dongjak-ci-alerts.yml`: 등록된 작업 실패를 **한 개의 GitHub Issue**에 기록, 성공하면 복구 기록 후 닫음
- `.github/workflows/dongjak-cloudflare-preview.yml`: 수동 검증, 명시적 승인 후 **프리뷰만** 배포
- `.github/workflows/dongjak-cloudflare-rollback-inspection.yml`: Cloudflare 성공한 **운영** 배포 목록을 **읽기 전용** 조회

## 반드시 알아야 하는 현재 제한
최신 Playwright 통합본 소스가 아직 없습니다. `package.json`, `package-lock.json`, `index.html`, `src/`, `playwright.config.mjs`가 GitHub에 모두 존재해야 전체 검사가 시작됩니다.

또한 Cloudflare 자격증명이 GitHub에 등록됐다는 증거가 없으므로 Cloudflare 실제 API 조회, 배포, 운영 롤백이 완료됐다고 보아서는 안 됩니다.

## Cloudflare에 연결할 때 1회 필요한 값
GitHub 저장소의 **Settings > Secrets and variables > Actions**에서 설정합니다.

**Repository secrets** (값을 채팅이나 코드에 붙여 넣지 마세요)
- `CLOUDFLARE_API_TOKEN`: Cloudflare에서 발급받은 Pages 접근 권한이 있는 최소 범위 토큰
- `CLOUDFLARE_ACCOUNT_ID`: 해당 Pages 프로젝트의 계정 ID

**Repository variables**
- `CLOUDFLARE_PAGES_PROJECT`: Cloudflare Dashboard에 표시된 **실제** Pages 프로젝트 이름
- `CLOUDFLARE_PRODUCTION_BRANCH`: Cloudflare에 설정된 **실제 운영 브랜치 이름**
- `DONGJAK_MONITOR_URL`: 현재 실제로 동작하는 HTTPS 프리뷰/운영 URL (선택; 기본값은 기존 프리뷰 주소)

추가 보안: GitHub의 **Settings > Environments**에서 `cloudflare-preview`에 승인자를 설정할 수 있다면 사용하세요. 플랜/저장소 유형에 따라 이 기능은 제한될 수 있으며, 현재 승인자가 설정됐다고 가정하지 않습니다.

## 배포 단계
1. 다른 채팅에서 실제 Playwright 검증까지 끝난 **최신 통합 ZIP**을 확보
2. 민감정보·빌드 설정 검사 후 GitHub Private 저장소에 소스 업로드
3. `Dongjak Safety Map - Build and Visual Audit` 실행 성공 확인
4. `Dongjak - Guarded Cloudflare Preview Deployment`에서 먼저 `validate-only` 실행
5. Cloudflare 프로젝트 정보 및 GitHub secrets·variables 확인
6. 실제 **프리뷰만** 배포할 때 `mode=deploy-preview`, `confirmation=DEPLOY_PREVIEW`를 명시
7. Cloudflare API에서 운영 브랜치를 조회하고 프리뷰 브랜치 `automation-preview`와 같거나 설정과 불일치하면 배포 중단
8. 생성된 프리뷰 화면·실제 iPhone 동작을 확인한 다음 **별도 승인 후에만** 운영 배포 고려

**경고:** Cloudflare Pages에 기존 Git integration이 연결돼 있으면 해당 서비스 자체가 소스 push 후 자동 배포를 진행할 수 있습니다. 이 GitHub 워크플로는 그런 외부 배포를 차단하지 않습니다. 운영과 연결된 Pages 프로젝트의 브랜치·자동 빌드 설정을 별도로 점검하세요.

## 장애 알림
- 실패 시 `[Dongjak incident] preview-uptime` 같은 GitHub Issue 생성/갱신
- 기존 Issue가 열려 있으면 중복 생성하지 않음
- 성공 시 복구 기록 후 Issue 닫기
- GitHub 사용자 설정에서 Issues 알림 이메일/웹 알림이 켜져 있어야 실제 이메일이 올 수 있음
- **외부 메신저/문자/직접 이메일 전송은 아직 연결되지 않음**
- Actions 실행 자체가 시작되지 않는 장애는 이 알림이 감지하지 못할 수 있음

## 복구
- GitHub: `backup/vX.Y.Z` 백업 태그가 있을 때만 안전한 복구 후보 브랜치 생성; 강제 main 변경 없음
- Cloudflare: `Cloudflare Rollback Inspection`은 읽기 전용입니다. 성공한 운영 배포 후보만 수집합니다.
- 실제 Cloudflare Pages 운영 롤백은 Cloudflare Dashboard > Pages 프로젝트 > Deployments > 대상 과거 **운영** 배포 > Rollback을 이용하세요. 프리뷰 배포는 운영 롤백 대상이 아닙니다.
- GitHub 소스 백업과 Cloudflare Pages 배포 백업은 별개입니다. Supabase/로그인 데이터베이스와 비공개 환경변수도 별도 백업이 필요합니다.

## 현재 상태 표시 원칙
- **설정 등록:** GitHub 파일이 존재
- **모의 검증:** 로직을 안전한 가짜 데이터/임시 Git 저장소로 확인
- **실행 완료:** 실제 GitHub Actions 실행 결과가 확인됨
- **서비스 검증:** 실제 앱 브라우저, Cloudflare Pages, iPhone PWA까지 현행 버전에서 확인됨

이 네 가지를 혼동하지 않습니다.
