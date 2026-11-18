# 동작구 보행안전 지도 v7.10.1 모바일 플로팅 UI 개선 패치

기준 버전: **v7.10.0 정리 통합본 전용**

기능:
- 모바일 길찾기·커뮤니티·동작 소식·내 기록 탭의 제목+X 고정, 본문 독립 스크롤
- 제목에 하단 탭 아이콘 추가, 길찾기 제목 흰 배경 제거
- 안전지도 탭 선택 시 기존 행정동 선택창을 직접 열고 시범자료 문구 제거
- 다크 모드의 뉴스 탭/내 기록 카드·숫자 대비 개선
- 홈 화면 iOS PWA 문서 테마·상태표시줄 배경 동기화, 최초 설치 기본 라이트 모드 유지
- PC 지도·MapLibre 엔진 및 교통 API 코드는 수정하지 않음

설치: 압축을 푼 폴더에서 `APPLY_PATCH.cmd` 실행 후 기존 v7.10.0 프로젝트 루트를 입력합니다.
원본 SHA-256이 일치하지 않으면 적용 전에 중지됩니다. 수정 전 파일은 `patch-backups/`에 백업됩니다.

PowerShell: `powershell -ExecutionPolicy Bypass -File .\APPLY_PATCH.ps1 -ProjectRoot "C:\DongjakApp\..."`
되돌리기: `RESTORE_PATCH.ps1 -ProjectRoot "..." -BackupFolder "...\patch-backups\..."`

로컬 검증: `npm ci`, `npm test`, `npm run build`, `npm run dev`.
웹앱을 iPhone 홈 화면에서 사용 중이라면 Cloudflare 배포 후 PWA를 종료·재실행해 보세요.
시스템이 소유한 상태표시줄 색상은 iOS 버전에 따라 재설치가 필요할 수 있습니다.

검증: Node 자동 테스트 795개 통과, Chromium 최소 패널 레이아웃 320/390/430/699 px 점검 통과.
실제 Vite 빌드는 이 환경의 vite 의존성 미설치로 완료하지 못했습니다. 실제 iPhone PWA/Android 기기 렌더링은 미검증입니다.
