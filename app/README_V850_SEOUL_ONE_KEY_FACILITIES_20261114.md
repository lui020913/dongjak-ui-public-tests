# 동작구 보행안전 지도 v8.5.0 – 서울시 공식 시설 데이터 통합본

기준 프로젝트: `DongjakApp_FULL_v8.4.4_MOBILE_SCALE_ROUTE_TIPS_SAFETY_MERGED_20261114(1).zip`
통합본 버전: **v8.5.0**

이 ZIP은 패치 파일이 아니라 v8.4.4 전체 프로젝트에 v8.5.0 변경사항을 적용한 완전한 통합 소스입니다. 별도의 `APPLY_PATCH.cmd` 실행은 필요하지 않습니다. ZIP 전체를 새 폴더에 압축 해제한 뒤 해당 폴더를 VS Code에서 여십시오.

## 구현 내용
- 동작구 약국, 동물약국, 일반음식점, 휴게음식점 인허가 데이터 연동
- 공식 데이터 명세: [약국](https://data.seoul.go.kr/dataList/OA-16329/A/1/datasetView.do) · [동물약국](https://data.seoul.go.kr/dataList/OA-16535/A/1/datasetView.do) · [일반음식점](https://data.seoul.go.kr/dataList/OA-18671/A/1/datasetView.do) · [휴게음식점](https://data.seoul.go.kr/dataList/OA-18696/A/1/datasetView.do)
- 서울 열린데이터광장 일반 인증키 **1개**로 4개의 서비스명을 호출
- 폐업·휴업 등 영업 비정상 시설 제외, EPSG:5174 좌표를 WGS84로 변환
- 동작구 경계 내부 시설만 지도 표시, 기존 시설 상세정보·지도 검색과 연결
- Cloudflare D1 저장소, 별도 정기 갱신 Worker, 기존 Pages 함수 `/api/seoul-facilities`
- 기존 OSM·안전시설·대중교통·보행 경로·모바일 축척바·TIP·길찾기 UI 유지
- API 설정 전에도 기존 지도 기능을 유지하도록 설계
- `src/main.js`와 기존 교통·지도 엔진은 수정하지 않고, 기존 공공시설 레이어 초기화 지점에 독립 공식시설 레이어 연결

## 1. 통합본 실행
1. ZIP 전체를 새 폴더에 압축 해제합니다.
2. 압축 해제한 프로젝트 폴더를 VS Code에서 엽니다.
3. 기존 프로젝트와 혼동하지 않도록 새 폴더에서 작업합니다.

## 2. 로컬 검사
```powershell
npm ci
npm test
npm run check:release
npm run build
```
`npm ci`를 먼저 실행해야 Vite 빌드를 할 수 있습니다. 테스트와 빌드가 통과하기 전에는 배포하지 마세요.

## 3. Cloudflare 설정 (처음 한 번)
프로젝트 루트에서:
```powershell
npx wrangler login
npx wrangler d1 create dongjak-seoul-facilities
```
명령 결과의 `database_id`를 복사한 뒤, 아래 예시 UUID를 실제 발급값으로 바꿔 실행합니다:
```powershell
node scripts/configure-seoul-facilities.mjs 12345678-1234-1234-1234-123456789abc
npx wrangler d1 execute dongjak-seoul-facilities --remote --file migrations/0001_seoul_facility_cache.sql
npx wrangler deploy --config wrangler.seoul-facilities.jsonc
```
설정 스크립트는 Pages용 `wrangler.jsonc`와 별도 Worker 설정에 같은 D1 binding을 추가합니다. 기존 Pages 프로젝트명·브랜치·배포 주소는 변경하지 않습니다.

## 4. 서울시 일반 인증키 등록
서울시 키를 소스코드, `.env`, 채팅, 공개 명령 인자에 넣지 마세요.
```powershell
npx wrangler secret put SEOUL_OPEN_API_KEY --config wrangler.seoul-facilities.jsonc
```
대화형 입력창에 기존 일반 인증키 중 정상 상태인 것 하나를 입력합니다. 약국·동물약국·음식점별로 별도 인증키를 발급할 필요가 없습니다.

수동 갱신 API 보호용 토큰도 별도로 설정합니다.
```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
npx wrangler secret put SEOUL_SYNC_TOKEN --config wrangler.seoul-facilities.jsonc
```
첫 명령이 출력한 64자리 토큰을 안전한 곳에 보관하고 두 번째 명령에 입력합니다. 서울시 일반 인증키와는 다른 관리자용 토큰입니다.

> **통신 보안 제약:** 서울 열린데이터광장 공식 Open API 기본 요청주소는 `http://openapi.seoul.go.kr:8088`입니다. 따라서 Worker에서 서울시 서버로 요청하는 구간은 HTTPS로 암호화되지 않습니다. 브라우저에 키를 노출하지 않도록 Worker Secret을 사용하지만, 업스트림 HTTP 전송 제약은 남습니다. 이를 수용할 수 없다면 Worker를 배포하지 마세요.

## 5. 기존 Pages에 연결·배포
D1 binding을 기존 Pages 프로젝트에 연결한 뒤:
```powershell
npm run deploy:pages
```
Cloudflare 대시보드에서 `dongjak-walk-safety-preview` Pages 프로젝트의 Settings → Bindings에 `SEOUL_FACILITIES_DB`라는 D1 binding이 Production 환경에 연결되어 있는지 확인합니다. 설정을 추가하거나 변경했다면 재배포가 필요합니다.

## 6. 최초 수집과 점검
Worker 배포 결과의 `workers.dev` 주소를 확인하고:
```powershell
$worker = 'https://dongjak-seoul-facilities-sync.<계정>.workers.dev'
$token = Read-Host 'SEOUL_SYNC_TOKEN'
$headers = @{ 'x-dongjak-sync-token' = $token }
foreach ($source in @('pharmacy','animal_pharmacy','restaurant','cafe')) {
  Invoke-RestMethod -Uri "$worker/admin/sync?source=$source" -Method Post -Headers $headers
}
```
각 시설 종류별 최초 수집은 수동 실행해야 하며, 이후 Worker Cron은 매일 UTC 18:00(한국시간 다음 날 03:00)에 갱신합니다.

점검:
- `https://dongjak-walk-safety-preview.pages.dev/api/seoul-facilities?limit=1`
- Worker `/health`에서 `keyConfigured:true`, `dbConfigured:true`
- Pages 응답에서 `ok:true`, `configured:true`, `sync` 상태 확인
- 지도에서 동작구 내부 공식시설 점을 확인

최초 수집 전 `places:[]`는 정상일 수 있습니다. 서울시 데이터는 원본 갱신일 기준으로 지연이 있을 수 있으며 실시간 영업 여부를 보장하지 않습니다.

## 검증 범위 및 한계
- 이 패치는 v8.4.4를 기준으로 재구성했으며, v8.4.4의 모바일 축척바·경로 비교·TIP·안전지도 변경을 보존합니다.
- **로컬 테스트:** `npm test` 1,287개 전체 통과, 신규 서울시 시설 API 테스트 8개 통과, `npm run check:release` 통과, 변경 JavaScript 8개 `node --check` 통과, D1 SQL 마이그레이션 구문 검사 통과.
- **Vite 빌드:** 이 실행 환경에서 `npm ci`가 시간 제한으로 완료되지 않아 `npm run build`는 검증하지 못했습니다. 사장님 PC에서 `npm ci` 완료 후 반드시 빌드해야 합니다.
- 실제 서울시 인증키 호출, Cloudflare 계정 생성·배포, 원격 D1 데이터 수집은 사용자의 계정과 인증이 필요하므로 이 패치 생성 환경에서는 실행하지 않았습니다.
- Cloudflare Worker의 실행시간·CPU·D1·요청량 제한에 따라 대량 시설 전체 수집이 실패할 수 있습니다. Worker 상태와 `seoul_facility_sync` 테이블을 확인해야 합니다.
- 서울시 데이터 페이지는 원본 자료가 3일 전 기준으로 제공된다고 안내합니다. Worker가 매일 동기화해도 원본 자료가 실시간이 되는 것은 아닙니다.
- 인허가 상태는 원본 행정데이터 기준이며 실제 현장 영업 여부와 차이가 있을 수 있습니다.
- 이번 단계는 약국·동물약국·일반음식점·휴게음식점 4종을 우선 연동합니다. 도서관·공중화장실·병원·공원 등은 각각의 공식 데이터 스키마와 서비스명을 검증한 후 추가해야 합니다.
- OSM과 서울시 공식 데이터 사이의 완전한 공간 중복 제거는 포함하지 않습니다. 공식 데이터 레이어 내부 중복만 제거합니다.

## 복구
패치 도구가 덮어쓰기 전 파일을 프로젝트의 `.dj-patch-backups` 폴더에 보관합니다. 적용 도중 오류가 발생하면 그 실행에서 변경된 파일을 자동 복구합니다. 적용 후 되돌릴 때는 해당 백업 폴더의 파일을 원래 위치에 복사하세요.
