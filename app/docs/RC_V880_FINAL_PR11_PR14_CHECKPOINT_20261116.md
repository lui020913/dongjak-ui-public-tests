# 동작하는 안전지도 v8.8.0 — PR #11~#14 단일 통합 후보

**상태: Release Candidate / GitHub 단독 테스트 확인 중 / Production 미배포**

## 소스 기준과 변경 원칙
- PR11·PR12·PR13·PR14 기존 완료 작업을 보존. 해당 변경을 새로 덮어씌워 합치지 않음.
- 통합 앱/테스트 고정 Git source SHA: `789aebbb6bdcac49eb1c7d43fe11ec5dbf8466db`.
- PR14의 이미 검증된 WebKit 모바일 글자 설정/지하철 알약바 수정 소스: `fec97205516885cb933747ea2790811929c36d97`.
- RC 소스 고정 SHA는 PR14 검증 소스에서 앱 코드는 바꾸지 않고, 독립 검증 통과한 보행안전 메뉴 E2E 타임아웃 90→240초만 복원한 커밋.
- 최신 PR14 브랜치의 다른 CI/Preview 워크플로 변경은 이 소스 고정 후보의 앱 로직과 무관. PR14 브랜치가 계속 바뀌더라도 이 RC의 앱/테스트 SHA는 변하지 않음.

## 단일 소용량 델타 패치 — 완료
- PR10 정확한 기준 소스: `998c39249275bba45fe49c014c1f3f16284e4e05`.
- [전체 27파일 델타 제작 SHA-256 검증 #43808259921](https://github.com/lui020913/dongjak-safety-map/actions/runs/43808259921): SUCCESS.
- [델타 ZIP GitHub 원본 아티팩트](https://github.com/lui020913/dongjak-safety-map/actions/runs/43808259921/artifacts/14199162654): 앱 15 + 감사 스크립트 2 + 테스트 10, 총 27파일.
- ZIP 내부는 원본·새 파일 SHA256 명세, `APPLY_PATCH.cmd`, `APPLY_PATCH.ps1`, `README_PATCH.txt`, 27개 실제 변경 파일만 포함.
- Windows 스크립트는 설치 전 **모든 파일의 원본/새 SHA256을 우선 검사**하고 백업한 후 적용하며 쓰기 실패 시 롤백. PR10과 다른 소스에서는 적용 거부.
- 기존 PR #11~#13 중간 패치가 이미 설치된 로컬 폴더에는 덮어쓰지 말 것. 전체 통합 델타는 정확한 PR10 원본 전용.

## 정적/Functions 배포 준비 — 완료
- [고정 통합 RC 스테이징 빌드 #43807000618](https://github.com/lui020913/dongjak-safety-map/actions/runs/43807000618): SUCCESS.
- [고정 Staging ZIP GitHub 원본 아티팩트](https://github.com/lui020913/dongjak-safety-map/actions/runs/43807000618/artifacts/14199081579): `dist/` 정적 파일 120개, `functions/` 13개, 총 133파일 SHA256 manifest 검증 성공.
- `dist/release-source.json`에는 정확한 고정 SHA 및 이전 Production 배포 ID를 기록. 이 파일은 패키지에만 포함되고 Production에는 아직 배포되지 않음.
- Production 배포 ID `f1500b02-58f9-469f-bd2c-61a18566fa3a`가 해당 빌드의 읽기 전용 사전 검사에서 기존 성공 배포로 확인됨.

## 기존 E2E 결과 (사용자 지시대로 성공 항목 재실행하지 않음)
- PC1920 Skip, PC·모바일 하단탭/시각 테스트, WebKit 지하철 알약바·글자 반영, 프리뷰 API는 각 개별 검증에서 통과. 기록은 기존 PR13/14 참조.
- [WebKit 390 최신 검증 #43806263275](https://github.com/lui020913/dongjak-safety-map/actions/runs/43806263275): WebKit 5개 PASS, Chromium 5개 PASS + 글씨 반복 변경 후 재진입 1개 TIMEOUT. 해당 run 전체 **FAILURE**를 GREEN이라고 표기하지 않음.
- [Chromium 반복 글씨 설정 단일 실패 항목만 별도 검증 #43808208725](https://github.com/lui020913/dongjak-safety-map/actions/runs/43808208725): 정확히 해당 테스트 한 건만 실행, 결과는 GitHub 실제 job conclusion 참조.
- [이전 WebKit 실패한 CSS 2건만 재검증 #43806069091](https://github.com/lui020913/dongjak-safety-map/actions/runs/43806069091): SUCCESS. 최신 PR14 브랜치에서 같은 기능이 WebKit 전체 실행에서 통과한 사실도 별도 확인.
- 최신 전체 4샤드 단일 GREEN은 여전히 없는 상태. 성공한 테스트를 반복 실행하지 말라는 지시와 운영 승격 게이트를 구분.

## Production 승격은 아직 미허가
- 실제 Production은 수동 `ad_hoc` 배포라 이전 Git source commit_hash가 없음. 정확한 앱 소스 및 Functions 환경 동일성을 증명하지 못함.
- 배포 예정 Staging 파일은 변경 후 전체 앱과 Functions를 교체하므로, 단순 CSS 패치처럼 무위험이라고 판단하면 안 됨.
- 기존 Production 성공 배포 `f1500b02-58f9-469f-bd2c-61a18566fa3a`를 잠재적 롤백 지점으로 보존하지만, 실제 API 롤백 권한·복구 실행은 시험하지 않음.
- 현재 Production과 이전 가까운 GitHub 커밋은 정적 JS/CSS SHA-256이 다름. 현재 운영 CSS에서 `.community-filter`의 inline-flex 정렬, 모바일 확장 시트 safe-area+72px이 있었으나 최신 PR14 레이아웃과의 충돌 가능성 때문에 무단 복사하지 않음.
- 운영 배포 작업은 별도 검증·권한 확인·명시적 승인 후 실행. 본 RC 관련 CI에는 `wrangler pages deploy`, rollback POST, GitHub `main` 병합이 없음.

**배포 상태: 미배포. 기계적 ZIP 패키징 성공은 모바일 반복 글씨 입력의 실제 완전 해결이나 Production 운영 적격성을 뜻하지 않음.**
