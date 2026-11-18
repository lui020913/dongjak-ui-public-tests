# v8.0.2 음향신호기·AED 통합 안내

기준: 사용자 첨부 `DongjakApp_FULL_v8.0.2_TOPIS_SDOT_PC_MOBILE_POLISH_20261112(1).zip`.

## 적용

보행안전 → 안전시설·생활편의 → **교통약자·응급시설**의 두 항목을 켭니다.
기존 안전시설·횡단보도·CCTV·S-DoT·TOPIS·야간시야 기능은 보존합니다.

### 음향신호기

- 제공 자료: 서울시 `A073_P 음향신호기 현황` 공간정보 (원본 2026-05-28).
- 원본 EPSG:5186 → WGS84 EPSG:4326으로 변환한 위치 자료를 사용합니다.
- ZIP 이전 분석의 **동작구 주변 후보 1,017개** 중 현재 동작구 행정경계 내 시설만 지도에 표시합니다. 외부 후보는 숨깁니다.
- 데이터 파일: `public/data/safety/accessibility/dongjak_audio_signals_candidates.geojson`.
- **주의:** 1,017개는 동작구 실제 설치 개수가 아닙니다. 동작구 행정경계와 일치하는 시설 개수는 앱에서 동적으로 계산합니다. 원본에 위치가 없는 기록은 지도에 나타나지 않습니다.
- 설치·관리번호/설치일이 표시되지만 실시간 동작 여부, 이용 가능 여부는 표시하지 않습니다.
- 경계가 변경되면 다시 필터링합니다.

### 자동심장충격기 AED

- 제공처: 국립중앙의료원, 공공데이터포털 API 데이터셋 15000652.
- 확인된 공식 기본 호출 URL: `https://apis.data.go.kr/B552657/AEDInfoInqireService/getEgytAedManageInfoInqire`.
- Cloudflare Pages → Settings → Variables and Secrets에서 **`AED_API_KEY`**를 Secret으로 등록하고 **실제 사용하는 Preview/Production 환경에 맞춰 배포**합니다.
- 서버 경로: `GET /api/aed`; 외부 요청은 Pages Function 내부에서만 수행합니다. `AED_API_KEY`를 브라우저·번들·네트워크 JSON에 노출하지 않습니다.
- 원본 서버가 반환한 위도·경도만 표시하며, 누락/이상좌표는 버립니다. 동작구 행정경계로 한 번 더 필터링합니다.
- 이름·주소·건물 내부 설치위치·기관 연락처·응답에 포함된 이용시간을 표시합니다. 자료가 없는 항목은 ‘정보 없음’으로 표시하며 24시간 이용/현재 정상 작동을 추정하지 않습니다.
- API 응답이 실사용 서비스에서 좌표 없이 반환된다면 지도에 가짜 아이콘을 생성하지 않습니다. 이 경우 `AED_API_ENDPOINT`(공식 국립중앙의료원 HTTPS URL만 허용)에 실제 좌표 제공 오퍼레이션을 지정할 수 있습니다. 공식 가이드에서 확인한 URL만 사용해야 합니다.
- 사용자가 선택한 시설의 좌표를 길찾기 목적지로 전달합니다. 별도 보행 위험 판정이나 자동 우회를 실행하지 않습니다.

## 구동 및 검증

```powershell
npm ci
npm test
npm run build
npx wrangler pages dev dist --port 8788
```

배포 후 `https://<고정-Pages-도메인>/api/aed`에서 JSON `FeatureCollection`을 확인합니다. `status: not_configured`면 해당 배포 환경에 AED_API_KEY가 없는 것입니다. `status: unavailable`면 API 승인·인증·URL·요청 한도·원본 응답 형식을 확인합니다.

사용자 인증키가 첨부되지 않아 **실제 국립중앙의료원 응답·현재 설치 개수는 검증하지 못했습니다.** HTTP 모킹 응답으로 파서와 Cloudflare 응답을 테스트했습니다.

공식 페이지: https://www.data.go.kr/data/15000652/openapi.do

> 실제 긴급상황이라면 119에 신고하고 주변 관계자에게 도움을 요청해야 합니다. 지도 표시는 보조정보이며 응급 조치를 대신하지 않습니다.
