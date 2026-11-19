# 동작지도 v8.0.1 — TOPIS 도로 돌발정보 · S-DoT 환경정보 통합

기준: 사용자가 첨부한 `DongjakApp_FULL_v8.0.1_MOBILE_MOTION_HEADER_20261112(1).zip`.
이 버전의 통합 플로팅 창·길찾기·교통정보·테마·야간시야를 유지한 채 보행안전 메뉴에 새로운 선택형 자료 2개를 추가합니다.

## 무엇을 추가했는가
- **실시간·도시환경** 그룹: 기존 보행안전 메뉴의 첫 번째 카테고리 안에 배치
- **서울 TOPIS 도로 돌발정보:** 사건 위치를 주황 주의 아이콘으로 표시, 2분마다 재조회 시도, 조회시각/사건정보 표시. `GET /api/road-incidents` (XML `AccInfo`를 Worker 서버에서 GeoJSON으로 변환)
- **서울 S-DoT 환경 센서:** 최신 동작구 관측이 있으면 지난 4시간 이내 센서의 기온·습도 요약, 관측시각, 자료 지연 표시. 30분마다 갱신 시도. `GET /api/sdot-environment` (JSON `sDoTEnv`)
- **첨부된 2026.10.26~11.01 CSV 과거 관측:** 동작구 원본 5,428행, 날짜 범위·시간 등 검증 후 5,393개 기록/33개 센서의 일자별 요약을 제공. 앱에 46MB 원본 CSV는 포함하지 않음. **실시간 API 오류 시 과거 자료임을 별도 표시**, 실시간으로 오인하지 않도록 구성
- **위치 표시 제약:** S-DoT CSV에는 공식 설치 위치 좌표가 없으므로 **센서 지도 마커 0개**. 서울시 공식 설치 위치 XLSX를 변환해 넣어야 좌표 확인된 센서의 마커가 나타납니다.
- **선택형 불러오기:** 두 신규 레이어 모두 초기 꺼짐. 선택할 때만 API 요청; UI의 배지·범례·오류/최신 상태는 기존 v8 인터페이스에 맞게 사용.
- **보행로 차단 금지:** 차량 돌발상황은 실제 보도 통제의 증거가 아니므로 보행 네트워크 경로 추천/차단에 반영하지 않습니다.

## 공공데이터 원출처
- TOPIS: 서울시 실시간 돌발정보 `AccInfo`, https://data.seoul.go.kr/dataList/OA-13315/A/1/datasetView.do
- S-DoT: 스마트서울 도시데이터 센서 환경정보 `sDoTEnv`, https://data.seoul.go.kr/dataList/OA-22833/A/1/datasetView.do
- 이용허락: 각 서울시 자료의 공공누리 제1유형(출처표시). 본 앱은 관측자료 출처 및 조회시점을 표시합니다.

## 인증키와 실제 실행 방법
1. Cloudflare Pages의 환경변수 **`SEOUL_OPEN_API_KEY`** 에 유효한 서울 열린데이터광장 키를 설정합니다. 기존 키가 있다면 재사용하세요. ZIP에 키를 넣지 마세요.
2. 전체본이라면 새 폴더에 압축 해제합니다. 델타 패치라면 **위 v8.0.1 원본 전체본에만** `APPLY_PATCH.cmd` 실행 후 프로젝트 폴더 지정.
3. PowerShell/VS Code에서 아래 순서대로 테스트합니다.

```powershell
npm ci
npm test
npm run build
npx wrangler pages dev dist --port 8788
```

확인 주소 (Cloudflare Pages Functions 실행 시):
- `http://localhost:8788/api/road-incidents`
- `http://localhost:8788/api/sdot-environment`

`npm run dev`(Vite 서버)에서는 Pages Functions가 실행되지 않아 `/api/*` 호출이 404일 수 있습니다. API 테스트는 `wrangler pages dev` 또는 실제 Cloudflare Pages 배포에서 하세요.

응답: 200 정상 형식, 503 인증키 누락, 502 원본 데이터 서버 오류. **200 응답이더라도 사건 0건이거나 최근 S-DoT 관측이 없을 수 있습니다.** 현재 자료임을 보증하는 것은 아닙니다.

## 설치 위치 XLSX가 확보되면
서울시 위 S-DoT 데이터셋에서 `서울시 도시데이터 센서(S-DoT) 환경정보 설치 위치정보.xlsx` 다운로드 후:

```powershell
py -m pip install openpyxl
py scripts/import-sdot-locations.py "서울시 도시데이터 센서(S-DoT) 환경정보 설치 위치정보.xlsx"
```

이 도구는 일련번호와 위경도 열을 검사하며 좌표가 불분명하면 임의로 보정하지 않습니다. 결과 경로 `public/data/safety/sdot/dongjak_sdot_locations.geojson`. **동작구 경계 바깥 점은 앱에서 필터**되며 지도에 표시하기 전 원본 현장검증을 권장합니다.

## 안전·정확성 제한
- TOPIS는 **차량 도로 정보**로 모든 보행로 통제·보행 사고를 포괄하지 않습니다.
- S-DoT는 지점 센서 관측이며 기상청 공식 기온, 실시간 체감온도, 구 전체 평균이 아닙니다. S-DoT 미세먼지 값은 제공하지 않습니다.
- 원본 센서는 통신 지연·보정(`DATA_NO=2`)이 가능합니다. 수집시각 및 최신성 구분을 함께 제시합니다.
- S-DoT 데이터의 특정 날 전체 페이지 조회는 다수 외부 API 호출을 필요로 합니다. Cloudflare 무료 요금제·공공 API 호출 제한 및 서버 응답 시간을 점검하고 필요하면 크론+KV 방식으로 전환하세요.
- **서울시 인증키를 실제로 넣어 라이브 API 수신까지 검증하지는 않았습니다.**

## 검증
- Node 자동 테스트 (v8.0.1 기준) 통과. 최종 집계는 제공된 README 참고
- JS 구문 검사 통과, 원본 `src/main.js` 보존
- Vite 빌드 **미완료**: 현재 실행 환경에서 `vite: not found` (npm 의존성 미설치)
- 테스트는 모의 데이터/정적 코드를 검증한 것이며 실제 브라우저 전체 지도 및 실시간 서버 동작을 보증하지 않습니다.

## 델타 패치
- `APPLY_PATCH.cmd`/`.ps1`: 원본 버전·SHA-256 검사 및 변경 파일 자동 백업
- `RESTORE_PATCH.cmd`/`.ps1`: 저장된 원본 복구
- 백업 위치: `.patch_backups/v801_topis_sdot_20261112`
- 패치 적용이 중복되거나 v8.0.1 원본과 파일이 다르면 중단합니다.

## v8.0.1 기존 기능 보존 확인
- 원본 v8.0.1의 모바일 창 진입 애니메이션, 헤더·검색창 높이, 지도설정·업데이트 창의 딤/블러 정책을 유지합니다.
- 원본 `src/v800-ui-architecture.js`, `src/v800-ui-architecture.css`, `src/main.js`, `package.json`은 수정하지 않았습니다.
- TOPIS/S-DoT 기능은 기존 보행안전 메뉴의 사고·보행환경 데이터 섹션에 ‘실시간·도시환경’ 카드로 추가했습니다.
- v8.0.1의 버전 표기·Changelog와 모바일 테스트는 원본 그대로 보존했습니다.
