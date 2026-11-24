/**
 * Conservative Seoul TOPIS bulk fallback. An exact station AND line code must
 * match: a 9호선 arrival at 노량진 never substitutes for a 1호선 train.
 * 신림선(1094) appears in some feeds but is not promised by the published
 * endpoint list; only actual, fresh matching rows can be displayed.
 */
const CANDIDATES_BY_ID=Object.freeze({
  '1007':['상도','숭실대입구'],
  '1002':['신림','신대방','사당'],
  '1001':['영등포','신길','대방','노량진','용산','남영','서울'],
  '1094':['샛강','대방','서울지방병무청','보라매','보라매공원','보라매병원','당곡','신림','서원','서울대벤처타운','관악산']
});
const LINE_IDS=Object.freeze({
  '1호선':'1001','2호선':'1002','3호선':'1003','4호선':'1004','5호선':'1005',
  '6호선':'1006','7호선':'1007','8호선':'1008','9호선':'1009',
  '신림선':'1094','우이신설선':'1092','경의중앙선':'1063','공항철도':'1065',
  '수인분당선':'1075','신분당선':'1077'
});
export function seoulSubwayIdForLine(value){
  const v=String(value??'').trim().replace(/\s+/g,'');
  if(LINE_IDS[v])return LINE_IDS[v];
  if(/^[1-9]$/.test(v))return `100${v}`;
  return '';
}
export function canonicalSubwayStationName(value){
  return String(value??'').trim().replace(/\([^)]*\)/g,'').replace(/\s+/g,'')
    .replace(/역$/,'').trim();
}
export function permitsSubwayBulkRecovery(station,lineId='1007'){
  const set=CANDIDATES_BY_ID[String(lineId)]||[];
  return set.includes(canonicalSubwayStationName(station));
}
export function filterBulkArrivalsForStation(body,station,{lineId='1007'}={}){
  const requested=canonicalSubwayStationName(station);
  if(!permitsSubwayBulkRecovery(requested,lineId))return [];
  const rows=Array.isArray(body?.realtimeArrivalList)?body.realtimeArrivalList:[];
  return rows.filter(row=>
    canonicalSubwayStationName(row?.statnNm)===requested &&
    String(row?.subwayId??'')===String(lineId));
}
