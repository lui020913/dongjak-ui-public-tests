/**
 * Verified operator timetable entry points.  These are NOT realtime ETA feeds.
 * We deliberately do not invent scheduled departure rows when a supported
 * public API returns no timetable for Korail-operated Line 1 or Sillim LRT.
 * See README_1호선_신림선_시간표_안내_20261110.md for verification dates.
 */
export const OFFICIAL_OPERATOR_TIMETABLES = Object.freeze({
  '1호선': Object.freeze({
    line:'1호선', provider:'한국철도공사 (코레일)',
    url:'https://www.korail.com/com/userBoard.do?mode=list&schBcid=ticketTable',
    label:'코레일 1호선 공식 시각표',
    guidance:'전동열차 시각표 게시판에서 1호선 평일·휴일 자료의 최신 적용일을 확인한 다음 노량진·대방역과 상·하행을 선택하세요.',
    notice:'코레일 홈페이지의 계획 운행시간표입니다. 실시간 도착정보가 아니며, 임시 운행변경 공지도 함께 확인하세요.'
  }),
  '신림선': Object.freeze({
    line:'신림선', provider:'신림선 도시철도',
    url:'https://www.sillimlrt.com/kr/html/sub01/010101.html',
    label:'신림선 공식 역별 시간표',
    guidance:'운영기관 노선안내에서 해당 역(대방·보라매 등)의 ‘시간표’를 누르고 평일·토요일·공휴일 및 방향을 확인하세요.',
    notice:'운영기관이 게시한 계획 시간표입니다. 실시간 ETA와 다르며 변경 사항은 운영기관 안내가 우선합니다.'
  })
});

export function operatorTimetableResources(place={}){
  if(place?.kind!=='subway')return [];
  const selected=String(place.selectedLine||'').trim();
  const lines=selected?[selected]:Array.isArray(place.lines)?place.lines:[];
  return [...new Set(lines)].map(line=>OFFICIAL_OPERATOR_TIMETABLES[line]).filter(Boolean);
}
