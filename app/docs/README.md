# 동작구 안전지도 2026-11-06 UI / 고배율 정보량 패치

**상태: 원본 프로젝트 미첨부 상태에서 제공되는 통합용 코드. 실제 프로젝트에 적용·빌드·동작 검증된 결과물이 아닙니다.**

## 파일
- `dongjak-map-patch.js`: 지도 확대 수준에 따른 버스정류장/건물명, 1·9호선 노량진 참조 표시
- `dongjak-always-visible.css`: 상단 검색/UI 상시 표시, 축척 재배치, 모바일 대응
- `example-integration.jsx`: 기존 MapLibre 지도 컴포넌트에 연결하는 샘플
- `station-coordinate-reference.md`: 노량진역 좌표의 출처와 검증 주의사항

## 설치
1. ZIP을 풀어 Vite 프로젝트의 `src/map-patch/`에 복사합니다.
2. 실제 지도 초기화 이후 `installDongjakMapPatch({map, maplibregl, busStops, buildings})`를 호출합니다. `busStops`에는 **좌표를 포함한 기존 공식 정류소 데이터**를 넣습니다. `buildings`는 건물명 속성이 있는 GeoJSON 또는 생략합니다.
3. 기존 컴포넌트에서 `header`, `search`, `sideNavigation`, `rightControls`, `bottomCard` DOM 레퍼런스를 `installDongjakPersistentUI()`에 넘깁니다. 실제 React 컴포넌트에서 확대 여부에 따라 헤더를 렌더하지 않는 분기가 있다면 **조건부 렌더를 제거**해야 합니다.
4. `dongjak-always-visible.css`를 import합니다.
5. 기존 노량진역 마커/텍스트 레이어 ID를 찾아 `replaceStationLayerIds`에 넘기고, 원본 name 속성 필드를 `stationNameProperty`로 지정합니다. 프로젝트의 지하철 노선 레이어는 절대 건드리지 않습니다. **주의: 기존 마커가 DOM Marker라면 MapLibre 레이어 filter가 아닌 기존 Marker 데이터를 수정해야 합니다.**
6. 버스 레이어가 기존에도 있다면 기존 아이콘/라벨의 중복 표시 여부를 점검하고, 고배율에서는 이 모듈과 기존 레이어 중 하나만 나오도록 zoom/filter를 조정합니다.
7. `npm run build` 실행 후 PC(1632px), 태블릿(768px), 모바일(390px)에서 배포 전 검증하세요.

## 구현 논리
- 버스정류장: zoom 13.5 이상 점 표기 / 16.1 이상 실제 정류장명 및 번호 표기 / 클릭 시 상세
- 건물: zoom 17 이상 **이름이 존재하는 건물만** 표시 / 클릭 시 주소 속성이 있으면 표시
- 노량진역: 서로 다른 1/9호선 역 좌표에 개별 마커 / 하나의 환승역 라벨
- UI: 헤더·검색·좌측/우측 조작 버튼은 map zoom/move 이벤트와 관계없이 화면에 유지
- 축척: 데스크톱 왼쪽 아래, 모바일은 하단 카드 위로 이동

## 반드시 확인해야 하는 부분
- 기존 프로젝트의 실제 JSX 구조와 렌더/숨김 조건, MapLibre 버전
- 사용 중인 버스 정류소 GeoJSON 데이터 위치/속성명, ARS ID 존재 여부
- 3D 건물 소스의 source-layer 및 건물명 속성 유무 (이름이 없으면 이름을 표시할 수 없음)
- 실제 역 정위치: 제공 좌표는 **1호선 외부 공개 데이터 표, 9호선 역사 도로명주소 위치** 기준이며 승강장/선로 세부 위치까지 검증한 값이 아님

## 근거 데이터
- 서울시 버스 정류소 정보: https://data.seoul.go.kr/dataList/OA-1094/L/1/datasetView.do
- 서울시 정류장 정보: https://t-data.seoul.go.kr/dataprovide/trafficdataviewopenapi.do?data_id=1064

현재 ZIP은 프로젝트의 통합본/최종 배포 파일이 아닙니다. 기존 전체 소스 ZIP을 첨부해 주시면 이 모듈 내용을 실제 코드 구조에 맞춰 병합·검증할 수 있습니다.
