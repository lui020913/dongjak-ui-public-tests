/** Hand-verified public institution listings, not reverse-geocoded guesses.
 * Update each entry after checking the official website; do not use this list
 * for arbitrary businesses or similarly named facilities elsewhere.
 */
const places = [
  {"names":["노량진지구대"],"address":"서울특별시 동작구 등용로14길 40","phone":"02-811-9813","website":"https://www.smpa.go.kr/user/nd14772.do","source":"서울 동작경찰서 지구대·파출소 안내 (2026-11-26 확인)"},
  {"names":["흑석지구대"],"address":"서울특별시 동작구 흑석로13길 13","phone":"02-811-9823","website":"https://www.smpa.go.kr/user/nd14772.do","source":"서울 동작경찰서 지구대·파출소 안내 (2026-11-26 확인)"},
  {"names":["상도지구대"],"address":"서울특별시 동작구 등용로 24","phone":"02-811-9833","website":"https://www.smpa.go.kr/user/nd14772.do","source":"서울 동작경찰서 지구대·파출소 안내 (2026-11-26 확인)"},
  {"names":["남성지구대"],"address":"서울특별시 동작구 동작대로43길 22","phone":"02-811-9843","website":"https://www.smpa.go.kr/user/nd14772.do","source":"서울 동작경찰서 지구대·파출소 안내 (2026-11-26 확인)"},
  {"names":["사당지구대"],"address":"서울특별시 동작구 동작대로9길 40","phone":"02-811-9853","website":"https://www.smpa.go.kr/user/nd14772.do","source":"서울 동작경찰서 지구대·파출소 안내 (2026-11-26 확인)"},
  {"names":["신대방지구대"],"address":"서울특별시 동작구 신대방1다길 24","phone":"02-811-9863","website":"https://www.smpa.go.kr/user/nd14772.do","source":"서울 동작경찰서 지구대·파출소 안내 (2026-11-26 확인)"},
  {names:['노들섬','노들섬 복합문화공간'],address:'서울특별시 용산구 양녕로 445',website:'https://nodeul.org/',phone:'02-749-4500',source:'서울시 문화포털·노들섬 공식 홈페이지'},
  {names:['구립김영삼도서관','김영삼도서관','김영삼대통령기념도서관'],address:'서울특별시 동작구 매봉로 1',source:'국립중앙의료원 자동심장충격기 설치정보에 등록된 시설 주소 · 운영정보는 별도 확인'},
  {names:['동작구청'],address:'서울특별시 동작구 장승배기로 70',website:'https://www.dongjak.go.kr/',source:'동작구청 공식 홈페이지'},
  {names:['국립서울현충원','서울현충원'],address:'서울특별시 동작구 현충로 210',website:'https://www.mpva.go.kr/snmb/index.do',phone:'1522-1555',source:'국립서울현충원 공식 홈페이지'},
  {names:['동작도서관','서울특별시교육청동작도서관'],address:'서울특별시 동작구 장승배기로 94',website:'https://djlib.sen.go.kr/',phone:'02-823-6417',source:'서울특별시교육청 동작도서관 공식 홈페이지'},
  {names:['중앙대학교','중앙대학교 서울캠퍼스'],address:'서울특별시 동작구 흑석로 84',website:'https://www.cau.ac.kr/',source:'중앙대학교 공식 홈페이지'},
  {names:['숭실대학교'],address:'서울특별시 동작구 상도로 369',website:'https://ssu.ac.kr/',source:'숭실대학교 공식 홈페이지'},
  {names:['총신대학교'],address:'서울특별시 동작구 사당로 143',website:'https://www.chongshin.ac.kr/',source:'총신대학교 공식 홈페이지'},
  {names:['서울상도동우체국','상도동우체국'],address:'서울특별시 동작구 상도로 236',website:'https://www.koreapost.go.kr/156/subIndex/3917.do',phone:'02-814-5634',source:'우정사업본부 관할우체국 목록'},
  {names:['서울동작우체국','동작우체국'],address:'서울특별시 동작구 여의대방로22길 77',website:'https://www.koreapost.go.kr/156/subIndex/3916.do',phone:'02-822-0385',source:'우정사업본부 공식 홈페이지'},
  {names:['서울노량진우체국','노량진우체국'],address:'서울특별시 동작구 노량진로 224',website:'https://www.koreapost.go.kr/156/subIndex/3917.do',phone:'02-812-9052',source:'우정사업본부 관할우체국 목록'},
  {names:['서울사당동우체국','사당동우체국'],address:'서울특별시 동작구 동작대로 75',website:'https://www.koreapost.go.kr/156/subIndex/3917.do',phone:'02-583-2005',source:'우정사업본부 관할우체국 목록'},
  {names:['서울흑석동우체국','흑석동우체국'],address:'서울특별시 동작구 서달로15길 13',website:'https://www.koreapost.go.kr/156/subIndex/3917.do',phone:'02-812-9053',source:'우정사업본부 관할우체국 목록'}
];
const normalize=name=>String(name||'').replace(/[\s·()]/g,'').trim();
export function verifiedPlaceRecord(name){
  const id=normalize(name);
  return places.find(place=>place.names.some(variant=>normalize(variant)===id))||null;
}

// Only identity aliases already verified by the directory, never a similar-name match.
export const verifiedNameAliases=Object.freeze(places.flatMap(p=>p.names.map(name=>[name,p.names[0]])));
export function verifiedDisplayName(name){return verifiedPlaceRecord(name)?.names[0]||null;}
