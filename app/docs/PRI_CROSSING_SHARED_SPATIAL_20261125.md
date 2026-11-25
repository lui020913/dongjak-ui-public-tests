# 상도1동 횡단보도 접근성·보차혼용도로 2안 (2026-11-25)

사용자 승인: 집산·국지도로 50m, 간선도로 100m 연구용 접근 반경, 공통 25m 도로망의 접근권 밖 연장 비율. 확인된 지표만 동일가중 평균(최소 2개). 보차혼용 100/분리 0, 미확인 NULL.

- 원본 41개 조사점 중 7·24번 좌표/설치 여부 불일치로 제외. 나머지 39개도 팀 조사 후보로서 공식 시설 검증 아님.
- OSM highway를 도로 위계의 대리지표로 사용: primary/primary_link/secondary 100m, tertiary/residential 50m. service 및 보행전용 등은 제외. 이는 법적 도로 등급·가시거리·안전판정이 아님. 경계 바깥 미수집 자료가 결과에 영향을 줄 수 있는 구간은 미평가.
- 보차혼용·이면도로 PDF 표시선 237개와 동일 방향/5m 이내 전 표본 정합. 표시선은 보차혼용과 이면도로를 구분하지 않으며 실제 보도 분리 상태가 미확인. 공간 정합 후보는 별도 주황색 현황 레이어/PRI 후보 보기로 제공. 후보 100은 2안 가정일 뿐이며 실제 PRI 및 경로 평가에는 포함하지 않음. 검증된 분류만 100/0으로 반영.
- 기존 데이터, 점수 방향, 나머지 4개 지표 및 경로 계산은 그대로 유지. 미평가 제외.
- 공간분석 결과: {"crossing":{"eligible":465,"edgeUnknown":16,"uncertainPoint":17,"low":201,"caution":14,"high":217},"shared":{"matched":224,"ambiguous":0,"unmatched":982,"eligible":1206,"confirmedMixed":0,"confirmedSeparated":0}}; 공식 참고경계 선형 1606개; 전체 조사망 1686개.
- 재생성: node scripts/generate-pri-crossing-shared-20261125.mjs (app 디렉터리).
