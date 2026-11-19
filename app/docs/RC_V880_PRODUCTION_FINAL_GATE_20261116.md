# 동작하는 안전지도 v8.8.0 — 운영 배포 최종 안전 관문

> **상태: PR11~14 고정 통합본 Preview 성공 / Production 미배포.** 모든 클라우드 조회 결과는 2026-11-16 확인 기준. 운영 데이터를 수정하지 않음.

## 고정 릴리스 산출물
- 앱·테스트 고정 SHA: `789aebbb6bdcac49eb1c7d43fe11ec5dbf8466db`.
- [PR10→PR14 변경 27개만 담은 SHA256 검증 패치 #43808259921](https://github.com/lui020913/dongjak-safety-map/actions/runs/43808259921): 성공. 기준 소스 `998c39249275bba45fe49c014c1f3f16284e4e05` 정확히 일치해야 함.
- [133개 정적/Pages Functions 포함 Staging 패키지 #43807000618](https://github.com/lui020913/dongjak-safety-map/actions/runs/43807000618): 성공, 내부 manifest 파일별 SHA256 확인.
- [독립 Chromium 반복 글씨 옵션 실패 재검증 #43808208725](https://github.com/lui020913/dongjak-safety-map/actions/runs/43808208725): 1/1 성공. 기타 기존 통과 테스트 재실행 생략.
- [**고정 소스 RC 격리 Preview 배포 #43810314801**](https://github.com/lui020913/dongjak-safety-map/actions/runs/43810314801): 성공.
- 격리 Preview: https://v888-final-rc-20261116.dongjak-walk-safety-preview.pages.dev
- Preview HTML, 지하철/버스 Pages Functions, `release-source.json` 소스 SHA 검증 성공. Preview 배포 직전·직후 Production ID 불변.

## 현재 운영 사실
- Cloudflare Pages 프로젝트: `dongjak-walk-safety-preview`, Production branch `main`.
- 현재 정상 Production ID: `f1500b02-58f9-469f-bd2c-61a18566fa3a` (수동 `ad_hoc`, 원본 GitHub SHA 기록 없음).
- 직전 성공한 Production ID: `8f5cae3f-34be-4d15-a850-e4c18232b3af`.
- **새 운영 배포가 실패하면 현재 정상 ID `f1500b02-...`를 롤백 대상으로 지정**. 다만 롤백 POST는 한번도 실행하지 않았으며 Pages Write 권한을 이용한 롤백 성공을 확인한 것은 아님.
- 이전 여러 GitHub 커밋의 재현 빌드와 현재 Production JS/CSS 해시는 모두 불일치. 이전 운영 소스 계보는 미확인 상태임.

## 운영 계정 및 서비스 바인딩 진단
- [Cloudflare API 토큰/변수/바인딩 GET-only 감사 #43809958086](https://github.com/lui020913/dongjak-safety-map/actions/runs/43809958086): 성공.
- 토큰 Verify API `200`·`active`. 토큰 상세 및 권한 그룹 조회는 `403`, 권한 목록 자체를 증명하지 못함.
- 동일한 `cloudflare-preview` 자격증명으로 신규 Preview Pages 배포가 실제 성공함. Cloudflare의 Pages 배포 생성 API는 Pages Write 권한이 요구됨. **이 토큰이 적어도 Preview 배포에 필요한 Pages 쓰기 기능을 행사한 간접 증거**지만, Production 롤백 API 권한·복원 가능성 테스트를 대체하지 않음.
- 버스 `SEOUL_BUS_SERVICE_KEY`, 지하철 `SEOUL_SUBWAY_API_KEY`, 서울 열린데이터 `SEOUL_OPEN_API_KEY`: 모두 Production/Preview에 `secret_text` 타입으로 등록. 실제 값 출력·저장 없음.
- Workers AI 바인딩 이름 `AI`: Production 리소스 바인딩에 등록. [실제 Production Functions HTTP 검사 #43809768318](https://github.com/lui020913/dongjak-safety-map/actions/runs/43809768318): GET `/api/place-insight` HTTP 200, `bindingPresent=true`, `enabled=true` (AI 모델 POST 호출·비용 발생 테스트는 하지 않음).
- **`SEOUL_FACILITIES_DB` D1 바인딩: Production `d1_databases`에서 누락됨.** 실제 GET `/api/seoul-facilities?limit=1`: **HTTP 503, `configured=false`**. 기존 Production부터 발생하고 있었던 문제임.
- 계정 D1 DB 목록 GET `/accounts/{account_id}/d1/database`: **401**. D1 Read/Write 권한을 현재 토큰으로 확인할 수 없어 기존 DB 유무·정확한 스키마·레코드 존재를 알 수 없음. 새 빈 DB 임의 생성·연결 금지.
- `LIVE_TRANSIT_METRO_LINES`: 선택 설정이며 코드 기본 노선 목록 있음. `WORKERS_AI_PLACE_MODEL`: 선택 설정이며 코드 기본 모델 있음. 이 두 값의 부재만으로 고장으로 판단하지 않음.

## 배포 차단 사항과 해결 순서
1. **서울시 시설 DB 복원**: 권한 있는 Cloudflare 계정에서 실제 D1 데이터베이스 존재·스키마·레코드 확인. 정확한 DB를 Cloudflare Pages Production의 `SEOUL_FACILITIES_DB` D1 binding에 연결하고, 재배포/바인딩 활성화 후 `/api/seoul-facilities?limit=1`이 `ok=true, configured=true`로 정상 동작하는지 확인. 올바른 DB가 없다면 별도 데이터 마이그레이션 계획을 세울 것.
2. **최소 권한 검토**: Production 롤백에 필요한 `Pages Write` 권한과 계정 범위를 Cloudflare 대시보드에서 확인. D1 목록 조사에는 `D1 Read` 권한 필요. Production 토큰은 보호된 GitHub Environment에 저장하며 응답 본문 및 비밀값은 노출하지 말 것.
3. **Wrangler 설정 동기화**: RC의 `wrangler.toml`은 AI 바인딩 등 일부 설정만 선언. 반면 실제 Production에는 API 비밀값 3종과 기타 설정이 있음. Cloudflare는 Wrangler 설정 파일 채택 전 프로젝트 설정과 일치하도록 `wrangler pages download config`로 점검할 것을 권고함. 단순 `wrangler pages deploy`로 배포 설정을 의도치 않게 바꾸지 않도록 Production 설정과 원본 CLI 배포 방식의 동등성 확인이 필요.
4. **GitHub Production 승인**: `cloudflare-production` Environment에 필수 승인자/branch protection 설정이 존재하는지 확인해야 함. 현재 연결된 GitHub API 자격증명으로 해당 정책 조회가 거부되어 아직 검증 불가.
5. **승격·복구 실행**: 고정 RC source SHA, 이미 검증된 133파일 번들, GitHub 릴리스 승인·현재 Production ID 재확인 후에만 Production 배포. `--commit-hash`는 반드시 실제 SOURCE_SHA 지정. 배포 후 HTTP, 지도·버스·지하철 Functions, AI, 시설 DB 및 release-source를 점검하고 이상 시 현재 성공 배포 ID로 롤백.
6. **테스트 기록 정직성**: 개별 재검증은 모두 통과했지만 원래 전체 4샤드 단일 완전 녹색 기록은 없음. 사용자의 지시대로 이미 통과한 테스트를 다시 돌리지 않았음. 이를 완전 회귀 검증 완료로 바꾸어 표시하지 말 것.

## 변경 시 금지
- 원본을 모르는 현재 Production이 위험해 보인다는 이유만으로 기존 배포 삭제 금지.
- 기존 `SEOUL_FACILITIES_DB`를 확인하지 않고 빈 D1 생성 후 연결 금지.
- ZIP 배포 후보를 Production에 직접 업로드하거나 별칭을 `main`으로 바꾸는 작업은 안전 관문 통과 전 금지.
- 기존 `main`에 대량의 PR 브랜치를 한 번에 덮어쓰지 말 것.

## 공식 근거
- Cloudflare Pages 설정: https://developers.cloudflare.com/pages/functions/wrangler-configuration/
- Cloudflare D1 List API (`D1 Read` 필요): https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/list/
- Pages 배포 생성 (`Pages Write`): https://developers.cloudflare.com/api/resources/pages/subresources/projects/subresources/deployments/methods/create/
- Cloudflare 이전 성공 Production 롤백 (`Pages Write`): https://developers.cloudflare.com/api/resources/pages/subresources/projects/subresources/deployments/methods/rollback/

**운영 판단:** UI/UX 통합 후보 및 격리 Preview 성공은 확보했지만, 서울 시설 DB 503·D1 조사 권한·운영 설정 정합성·롤백 시나리오의 실증이 미완이라 현재 Production은 그대로 유지.
