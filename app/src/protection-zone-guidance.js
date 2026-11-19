/**
 * Phase 1–3, 2026-11-10: human-readable preliminary interpretation.
 * These notes DO NOT certify a dangerous road, an individual crash, or a legal omission.
 * Only raw, reviewed GIS measurements are displayed as numbers.
 */
export const REVIEWED_ROADS=['R0248','R0288'];
const escapeHtml=(value)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const asMeters=(value)=>value!==null&&value!==undefined&&String(value).trim()!==''&&Number.isFinite(Number(value))
  ? `${Number(value).toFixed(1)}m`:'미확인';
export const REVIEW_SOURCES=[
  {label:'TAAS 교통사고 분석',url:'https://taas.koroad.or.kr/gis/mcm/mcl/initMap.do?menuId=0',limitation:'개별 보행자 사고 위치 원자료 미확보'},
  {label:'서울시 횡단보도 정보',url:'https://data.seoul.go.kr/dataList/OA-22906/S/1/datasetView.do',limitation:'해당 도로의 공식 시설 여부 미검증'},
  {label:'서울시 250m 생활인구',url:'https://data.seoul.go.kr/dataList/OA-22784/S/1/datasetView.do',limitation:'도로 통행 보행량과 구분'},
  {label:'정보공개포털',url:'https://www.open.go.kr/',limitation:'최신 보호구역 고시·통학로 자료 확인 필요'}
];

export function getRoadGuidance(properties={}){
  const id=String(properties.road_id??'');
  const zoneDistance=asMeters(properties.protection_dist_m);
  const width=asMeters(properties.width_est_m);
  const focus=REVIEWED_ROADS.includes(id);
  const intro=id==='R0248'
    ? `서울상현초등학교 보호구역의 공개 공간정보에서 약 ${zoneDistance} 떨어진 구간입니다. 추정 도로폭은 ${width}이며, 과거 사고다발지역 통계 구역과 일부 중첩됩니다.`
    :id==='R0288'
      ? `청송경로당·샛별유치원 인근의 보호구역 공개 지정 범위 밖 구간입니다. 가장 가까운 관련 보호구역 경계까지 약 ${zoneDistance}, 추정 도로폭은 ${width}입니다.`
      :`기존 보호구역 공개 지정 범위 밖에 있는 예비 현장검토 구간입니다. 추정 도로폭은 ${width}이며 보호구역 경계까지 약 ${zoneDistance}입니다.`;
  const advice=id==='R0248'
    ? ['보도가 없거나 좁다면 차량과 거리를 확보해 이동하세요.','교차로와 주정차 차량 주변에서는 접근 차량을 확인하세요.','실제 통학로인지 확인되지 않았으므로 통학 안전성을 단정하지 않습니다.']
    :id==='R0288'
      ? ['보행공간이 좁거나 분리되지 않았다면 차량 통행에 주의하세요.','주차 차량이나 출입구가 시야를 가리는지 살피세요.','어린이·고령자 이용 동선 여부는 아직 확인되지 않았습니다.']
      :['차량과 보행자가 함께 이용하는 구간에서는 주변 차량을 살피세요.','보도·횡단시설과 실제 조도가 확인되지 않아 주의사항은 일반적인 안내입니다.'];
  const countNote=Number(properties.overlap_2023_24_m)>0
    ? `2023~2024년 표기 사고다발지역 통계 구역과 ${asMeters(properties.overlap_2023_24_m)} 중첩되지만, 이 도로의 실제 사고 발생이나 건수를 뜻하지 않습니다.`
    :'개별 보행자 사고 이력은 확인되지 않았습니다. 통계 구역과 겹치지 않는다고 무사고를 의미하지 않습니다.';
  return {
    id,focus,level:'예비 공간분석 · 위험도 미확정',title:'보행환경 확인 권장 구간',intro,
    advice, accidentInterpretation:countNote,
    data:[
      ['실제 보도·보차분리','미확인'],
      ['개별 보행자 사고','미확인'],
      ['횡단보도·보행신호','미확인'],
      ['시설 이용·통학 동선','미확인'],
      ['최신 지정 고시·주 출입문','미확인'],
      ['시간대별 도로 보행량','미확인'],
      ['법정 제한속도','미확인'],
      ['도로 종단경사','미확인']
    ],
    routePenaltyAllowed:false
  };
}

export function renderRoadGuidance(properties={}){
  const g=getRoadGuidance(properties);
  return `<div class="pza-public-intro"><strong>${escapeHtml(g.title)}</strong><p>${escapeHtml(g.intro)}</p></div>
    <section class="pza-caution" aria-label="보행 시 참고사항">
      <strong>이 구간을 지나갈 때</strong>
      <ul>${g.advice.map(v=>`<li>${escapeHtml(v)}</li>`).join('')}</ul>
    </section>
    <p class="pza-uncertainty">자료 해석: ${escapeHtml(g.accidentInterpretation)}</p>
    <p class="pza-verification-tag">${escapeHtml(g.level)} · 위험 등급·우회 권고를 자동 적용하지 않습니다.</p>`;
}

export function renderEvidenceStatus(properties={}){
  const g=getRoadGuidance(properties);
  return `<p>1~3차 조사 자료에서는 보호구역과의 공간관계 및 추정 도로폭을 확인했습니다. 아래 항목은 도로별 공식 원본이 없어 판정하지 않았습니다.</p>
    <dl class="pza-status-list">${g.data.map(([k,v])=>`<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`).join('')}</dl>
    <p class="pza-evidence-note">거리 분석·생활인구 분포·시설 대표점은 실제 보도 유무, 특정 도로의 보행량, 법정 주 출입문을 직접 증명하지 않습니다.</p>`;
}
