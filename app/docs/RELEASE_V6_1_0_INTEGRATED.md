# 동작하는 안전지도 v6.1.0 · 통합 안정화 릴리스

## 기능별 변경 체계 (과거 기록은 보존)

| 분류 | 변경사항 |
|---|---|
| ① 기초 지도·지형 | 한강 섬 지역 저해상도 DEM을 특정 카메라 위치에서 평탄화 (지형 자체를 수정하지 않음) |
| ② 보행 안전·보호구역 | 상도1동 1~3차 예비조사 데이터 계승, 법적 사각지대/실제 사고 위험도 확정 주장 금지 |
| ③ 야간 안전 | 사용자 기기별 검은 톱니 렌더링 위험을 줄이기 위해 커스텀 3D 분석선 중단·MapLibre 기본 선형 사용 |
| ④ 버스·지하철 | 서울시 공식 API 호출 경로 계승, 원천 상태/오류 코드 진단 유지; 서버 인증키 권한 필요 |
| ⑤ 지역 소식·시설 | 여러 소식 제공처를 병렬 조회하여 표시 시간 단축; 선택한 시설 대표 좌표로 이동 |
| ⑥ UI·접근성 | 모바일 헤더 흐림 제거, 드로어 중첩 방지, 지도 탭 시 일회성 도구 해제 |

## API가 계속 실패하는 경우

- `SEOUL_BUS_SERVICE_KEY`가 환경변수에 존재하는 것과, 서울시 정류소 API에 **승인되어 실제로 인증되는 것**은 다릅니다.
- 실제 `BUS_API_AUTH`는 이 패치만으로 해결됐다고 주장할 수 없습니다. `node scripts/check-transport-live.mjs https://dongjak-walk-safety-preview.pages.dev`로 원인 코드를 확인하세요.
- 서울시 공식 정류소 API는 `getStationByPos` / `getStationByUid`를 사용합니다. 권한·쿼터·HTTP 전용 upstream에 관한 제약은 API 제공처가 결정합니다.
- 공식 정류소 조회 실패 시 지도에는 OpenMapTiles / OpenStreetMap 기초 정류장만 남길 수 있으며, 공식 정보로 오인하지 말아야 합니다.
- 지하철 실시간 응답이 0건이면 '열차가 운행 중이다'로 추정하지 않습니다.
- 뉴스 제공처가 모두 차단되면 실제 게시물이 아닌 임의 기사로 채우지 않으며 공식 사이트로 연결합니다.

## 검증 경계

- Node 테스트 + Vite 소스 빌드 진행. 실제 기기/Cloudflare 프로덕션 API 키 인증 및 WebGL 화면의 픽셀 결과는 별도 현장/운영 검증이 필요합니다.
- 야간/한강 DEM 변경은 렌더링을 보수적으로 제한하는 대응입니다. 고해상도 보정 DEM을 확보해 섬 고도를 복원한 것이 아닙니다.

## 배포

```powershell
npm ci
npm test
npm run build
npm run deploy:pages
node scripts/check-transport-live.mjs https://dongjak-walk-safety-preview.pages.dev
```

Cloudflare Workers & Pages 프로젝트의 Variables and Secrets에서 버스·지하철·기타 서울시 키의 승인 및 스코프를 확인하세요. 실제 키를 채팅에 공유하지 마십시오.
