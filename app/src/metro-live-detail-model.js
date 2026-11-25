// Line schematic: verified station sequence, not GPS. Keep branched lines explicitly partial.
export const LIVE_LINES=['1호선','2호선','4호선','7호선','9호선'];
const routes={
 '2호선':'시청 을지로입구 을지로3가 을지로4가 동대문역사문화공원 신당 상왕십리 왕십리 한양대 뚝섬 성수 건대입구 구의 강변 잠실나루 잠실 잠실새내 종합운동장 삼성 선릉 역삼 강남 교대 서초 방배 사당 낙성대 서울대입구 봉천 신림 신대방 구로디지털단지 대림 신도림 문래 영등포구청 당산 합정 홍대입구 신촌 이대 아현 충정로'.split(' '),
 '4호선':'오이도 정왕 신길온천 안산 초지 고잔 중앙 한대앞 상록수 반월 대야미 수리산 산본 금정 범계 평촌 인덕원 정부과천청사 과천 대공원 경마공원 선바위 남태령 사당 이수 동작 이촌 신용산 삼각지 숙대입구 서울역 회현 명동 충무로 동대문역사문화공원 동대문 혜화 한성대입구 성신여대입구 길음 미아사거리 미아 수유 쌍문 창동 노원 상계 불암산 별내별가람 오남 진접'.split(' '),
 '7호선':'석남 산곡 부평구청 굴포천 삼산체육관 상동 부천시청 신중동 춘의 부천종합운동장 까치울 온수 천왕 광명사거리 철산 가산디지털단지 남구로 대림 신풍 보라매 신대방삼거리 장승배기 상도 숭실대입구 남성 이수 내방 고속터미널 반포 논현 학동 강남구청 청담 뚝섬유원지 건대입구 어린이대공원 군자 중곡 용마산 사가정 면목 상봉 중화 먹골 태릉입구 공릉 하계 중계 노원 마들 수락산 도봉산 장암'.split(' '),
 '9호선':'중앙보훈병원 둔촌오륜 올림픽공원 한성백제 송파나루 석촌 석촌고분 삼전 종합운동장 봉은사 삼성중앙 선정릉 언주 신논현 사평 고속터미널 신반포 구반포 동작 흑석 노들 노량진 샛강 여의도 국회의사당 당산 선유도 신목동 염창 등촌 증미 가양 양천향교 마곡나루 신방화 공항시장 김포공항 개화'.split(' '),
 '신림선':'관악산 서울대벤처타운 서원 신림 당곡 보라매병원 보라매공원 보라매 서울지방병무청 대방 샛강'.split(' ')
};
const names={'1호선':['소요산','인천·신창'],'4호선':['진접','오이도'],'7호선':['장암','석남'],'9호선':['개화','중앙보훈병원'],'신림선':['샛강','관악산']};
export function directionCode(value){const v=String(value??'').trim();return /^(0|상행|내선)$/.test(v)?'0':/^(1|하행|외선)$/.test(v)?'1':'';}
export function directionTitle(line,direction){
 if(line==='2호선')return directionCode(direction)==='0'?'내선 순환':'외선 순환';
 const d=directionCode(direction);if(d==='')return direction;
 const n=names[line]?.[Number(d)];return n?n+' 방면':d==='0'?'상행':'하행';
}
export function stationKey(value){const s=String(value??'').trim().replace(/\s*\([^)]*\)\s*/g,'').replace(/역$/,'').trim();return ({총신대입구:'이수',당고개:'불암산',뚝섬유원지:'자양'})[s]||s;}
export function stationSequence(line,direction,selected,local=[]){
 const full=routes[line],valid=full?.some(x=>stationKey(x)===stationKey(selected));
 let list=valid?[...full]:[...local];if(line==='9호선'&&!valid||line==='4호선'&&!valid||line==='신림선'&&!valid)list.reverse();
 if(directionCode(direction)==='1')list.reverse();
 if(!list.some(x=>stationKey(x)===stationKey(selected))&&selected)list=[selected];
 return {stations:list,partial:!valid||line==='2호선'};
}
export function observedTrains(rows,line,direction,now=Date.now()){
 const out=new Map();for(const row of rows||[]){
  const age=now-Date.parse(row.observedAt);
  if(row.line!==line||directionCode(row.direction)!==directionCode(direction)||!row.trainNo||!row.station||!Number.isFinite(age)||age< -10000||age>180000)continue;
  const id=String(row.trainNo),prev=out.get(id);if(!prev||Date.parse(prev.observedAt)<Date.parse(row.observedAt))out.set(id,row);
 }return [...out.values()];
}
export function compactArrival(message,planned=false){
 const raw=String(message||'정보 없음').trim(),m=raw.match(/^(?:약\s*)?(\d+)\s*분(?:\s*\d+\s*초)?(?:\s*후)?(?:\s*도착)?(?:\s*\([^)]*\))?$/);
 return m&&!planned?m[1]+'분':raw;
}
