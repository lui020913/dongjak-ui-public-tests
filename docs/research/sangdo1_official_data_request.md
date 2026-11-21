# 상도1동 제도적 보호 공백 연구 — 공식 원자료 확인 요청 체크리스트

작성: 2026-11-21 · 연구용 / 미발송 · 개인 통학 경로 및 학생 개인정보 수집 금지

## 목적
시설 대표점 반경 300m·500m와 실제 지정 보호구역의 공간적 불일치를 조사하되, **법적 보호구역 미지정 = 위반/위험 확정**으로 오해하지 않기 위해 최신 지정 고시 및 주 출입문 좌표를 확인한다.

## 확인처 1: 동작구 교통행정 담당 부서 및 서울시 보호구역 지정 담당
자료 요청 (가능한 공개 범위만):
- 2026-11 현재 상도1동 및 경계에서 500m 이내 어린이·노인·장애인 보호구역의 **시설 ID, 지정 일자, 지정/변경/해제 고시번호, 현재 상태**
- 지정 도로의 **시점·종점 및 GIS 경계 폴리곤/선형** (SHP, GeoJSON, GPKG 또는 고시 도면)
- 지정의 판단 근거가 된 시설 주 출입문 위치와 통학(통원) 동선 현장 확인 기록의 공개 가능한 범위
- 대표점과 실제 주 출입문 좌표의 차이 및 변경 이력
- 이미 지정된 대체 보행보호제도(보행자우선도로 등) 및 시종점

## 확인처 2: 동작관악교육지원청 및 각 학교
- **서울강남초·서울상현초·서울은로초**에 적용되는 현행 학교별 통학구역(2026) 자료
- 정문·후문 중 등하교에 실제 이용하는 문과 출입 가능 시간 (가능한 경우 GIS 점 위치)
- 학교에서 공식 관리하는 보행 통학로/안전통학로 지정 및 변경 자료. 개별 학생 주소/이동기록 불필요.
- 기존 공개 통학구역 표는 2025.3 기준: https://dgedu.sen.go.kr/CMS/introduction/introduction06/introduction0604/introduction060402/index.html

## 확인처 3: 공공데이터포털 공식 보호구역 데이터
- 기존 UTIC 보호구역 정보는 2026-01-05부터 서비스 중단: https://www.utic.go.kr/center/newNoticeRead.do?id=10783&pg=1
- 신규 경찰청 전국 보호구역 geometry API: https://www.data.go.kr/data/15142010/openapi.do
- 요청 필수 `serviceKey`, `sggCd=11590` (동작구). 인접 보호구역은 동작구 밖에도 있을 수 있으므로 경계 500m 여유 범위로 재선정.
- 어린이 표준 데이터: https://www.data.go.kr/data/15012891/standard.do
- 노인/장애인 표준 데이터: https://www.data.go.kr/data/15034532/standard.do
- **이 연구 PR에는 키를 포함하지 않고 API 키도 수집하지 않는다.** 자료 수집이 가능해지면 비공개 설정 또는 별도 오프라인 분석으로 생성한 공개 범위 데이터만 반영한다.

## 공통 검증 필드 (시설)
`facility_id, name, type, geolocation_source, representative_point_lonlat, verified_gate_lonlat, gate_valid_from, zone_polygon, notice_id, notice_date, road_start, road_end, route_data_source, catchment_version, inspection_date, verification_status`

- **현재 모두 미확인인 항목**: verified_gate_lonlat, notice_road_start, notice_road_end, 실통학 동선.
- 확인 불가인 경우 `null`로 보존하고 임의 좌표 보간/대체하여 법적 위반 여부를 판정하지 않음.

## 자료 입수 후 GIS 재분석 순서
1. 학교·노인시설 최신 목록을 상도1동 경계에서 최소 500m 외부까지 수집해 중복 시설 ID 정리.
2. 최신 지정 폴리곤을 동일 투영좌표로 정합 후 입수일·고시일 저장.
3. 시설 대표점과 검증된 주 출입문을 구분해 300m/500m 참고 버퍼 생성.
4. 25m 세그먼트의 5m 부분별로 실제 지정 포함·반경 거리값을 계산. 경계와 교차하는 표본은 GIS 선형 절단으로 보정.
5. 통학구역(공식 담당학구)과 실제 통학·통원 동선은 다른 자료이므로 별도 레이어/검증 수준 유지.
6. 보호 공백 안전점수 `0=공백 큼, 100=모형 내 공백 작음`은 공식 지정/출입문 확인 후 확정하며, 100점도 일반적 안전 보증이 아님.
7. 검증되지 않은 구간에는 `score=null`, `confidence=unverified`. 종합 PRI 및 경로 회피 비용에 영향 금지.

## 검증 결과 반영 위치
- 검증대장: `app/public/data/protection-zone/verification_register.json`
- 학교 경계 후보: `school_300_500m_unprotected_preview.geojson`
- 전체 지표: `policy_coverage_25m_preview.json` 및 CSV
- 신규 인접 학교 후보: `adjacent_school_catchment_verification.geojson`

**이 문서는 관계 기관에 실제 발송한 공문이 아닙니다.** 발송 및 공식 원본 접수는 별도 진행해야 합니다.
