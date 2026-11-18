# 동작구 안전지도: 보안·가용성·백업 운영 가이드

현재 GitHub 저장소: `lui020913/dongjak-safety-map` (Private)

**중요:** 이 문서는 자동화 파일에 대한 설명입니다. 아직 최종 Playwright 통합 소스가 저장소에 들어 있지 않으므로 앱의 실운영 검증이나 백업 완료를 의미하지 않습니다.

## 1. Security and Dependency Audit
- 워크플로: `.github/workflows/dongjak-security-audit.yml`
- 실행: main push, main PR, 매주 월요일 UTC 03:23, 수동 실행
- `scripts/ci-security-guard.mjs`는 **Git이 추적하는 파일**에서 민감한 설정 파일과 강한 토큰 패턴을 탐지합니다. 매칭된 비밀값 자체는 로그에 출력하지 않습니다.
- `package-lock.json`이 존재하면 `npm audit --omit=dev --audit-level=high`로 운영 의존성의 high 이상 취약점 여부를 검사합니다.
- 아직 앱이 없다면 의존성 검사는 **건너뛴 것**입니다. 보안에 문제가 없다는 판정이 아닙니다.
- 한계: 정규식 검사는 미지의 비밀키·과거 Git 기록·빌드 결과의 노출을 전부 찾지 못합니다. 필요하면 이후 GitHub secret scanning 등으로 보완해야 합니다.

## 2. Preview Uptime Monitor
- 워크플로: `.github/workflows/dongjak-uptime-monitor.yml`
- 기본 검사 주소: `https://dongjak-walk-safety-preview.pages.dev/`
- 실행: 매 시간 UTC 17분과 47분(약 30분 간격), 수동 실행
- GitHub 저장소 **Settings > Secrets and variables > Actions > Variables**에 `DONGJAK_MONITOR_URL`을 추가하면 대상 HTTPS 주소를 변경할 수 있습니다.
- 최대 3회 HTTP 요청, 상태코드·응답지연·HTML 앱 마커 확인, JSON 증거 14일 보관
- HTTP 응답은 실제 지도 WebGL 렌더링 및 서울시 버스·지하철 API 정상 작동을 보장하지 않습니다.
- 현재 URL의 온라인 응답은 확인하지 못했습니다. 실 배포 URL을 확인하기 전에는 실패가 표시될 수 있습니다.
- 장애 시 GitHub Actions 실행이 실패 상태로 기록됩니다. **별도 푸시·이메일·메신저 알림은 아직 연결하지 않았습니다.**
- GitHub Actions 예약 실행은 지연·누락될 수 있어 전문적인 24시간 SLA 모니터는 아닙니다. 정기 실행은 GitHub Actions 사용량에 반영될 수 있습니다.

## 3. Source Backup and Restore Preparation
- 워크플로: `.github/workflows/dongjak-source-backup.yml`
- 매주 일요일 UTC 03:43에 현재 main을 `backup/weekly/YYYY-Www` 태그로 보존합니다.
- `Actions > Dongjak - Source Backup and Restore Preparation > Run workflow`에서 `operation=backup`, `version=8.8.0` 같이 입력해 버전 백업 태그 `backup/v8.8.0`을 생성할 수 있습니다.
- 버전 입력은 `package.json`의 버전과 일치해야 하며 기존 태그가 다른 커밋을 가리키면 덮어쓰기를 거부합니다.
- 태그 외에도 전체 Git 기록 `.bundle`을 Private Actions artifact로 30일간 보관합니다. 환경변수·Git 비추적 파일·클라우드 데이터베이스 및 Cloudflare 배포 자체는 백업하지 않습니다.
- `operation=restore-branch`, `version=8.8.0`을 실행하면 `backup/v8.8.0` 상태를 제안하는 별도 `restore/...` 브랜치를 만듭니다. **main 변경, PR 병합, Cloudflare 배포는 자동으로 하지 않습니다.**
- 복구 후보 브랜치는 반드시 diff 검토·빌드·Playwright 검사를 거친 뒤 수동 반영해야 합니다.
- GitHub 저장소 Settings의 Actions 정책이 GITHUB_TOKEN의 쓰기를 제한하면 태그·복구 브랜치 생성이 실패할 수 있습니다.

## 사용 전 점검
1. 다른 채팅에서 확정한 최신 Playwright 통합본 ZIP을 확보합니다.
2. `.env*` 및 계정 비밀키·개인정보·하드코딩된 비밀값을 제거한 뒤 앱 소스를 Private 저장소에 올립니다.
3. 기존 Playwright 및 보안 CI의 실제 통과를 확인합니다.
4. Cloudflare 프리뷰 주소가 현재 배포 주소인지 검증합니다.
5. 최초 버전 백업 태그를 만들고 복구 후보가 생성되는지 테스트합니다.

자동화 파일만으로 실 앱 보안·가용성·복구 성공을 확정할 수 없습니다.
