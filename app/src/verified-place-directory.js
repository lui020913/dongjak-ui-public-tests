/** Hand-verified public institution listings, not reverse-geocoded guesses.
 * Update each entry after checking the official website; do not use this list
 * for arbitrary businesses or similarly named facilities elsewhere.
 */
const places = [
  {"names":["노량진1동 주민센터","노량진1동주민센터","노량진1동 동주민센터","노량진1동 행정복지센터","노량진1동행정복지센터","노량진제1동 주민센터","노량진제1동주민센터"],"category":"주민센터","address":"서울특별시 동작구 노량진로 190","phone":"02-820-2984","website":"https://www.dongjak.go.kr/portal/main/contents.do?menuNo=200664","source":"동작구청 동주민센터 청사안내"},
  {"names":["노량진2동 주민센터","노량진2동주민센터","노량진2동 동주민센터","노량진2동 행정복지센터","노량진2동행정복지센터","노량진제2동 주민센터","노량진제2동주민센터"],"category":"주민센터","address":"서울특별시 동작구 장승배기로19길 48","phone":"02-812-0903","website":"https://www.dongjak.go.kr/portal/main/contents.do?menuNo=200664","source":"동작구청 동주민센터 청사안내"},
  {"names":["상도1동 주민센터","상도1동주민센터","상도1동 동주민센터","상도1동 행정복지센터","상도1동행정복지센터","상도제1동 주민센터","상도제1동주민센터"],"category":"주민센터","address":"서울특별시 동작구 상도로53길 9","phone":"02-815-3084","website":"https://www.dongjak.go.kr/portal/main/contents.do?menuNo=200664","source":"동작구청 동주민센터 청사안내"},
  {"names":["상도2동 주민센터","상도2동주민센터","상도2동 동주민센터","상도2동 행정복지센터","상도2동행정복지센터","상도제2동 주민센터","상도제2동주민센터"],"category":"주민센터","address":"서울특별시 동작구 상도로 211","phone":"02-814-3755","website":"https://www.dongjak.go.kr/portal/main/contents.do?menuNo=200664","source":"동작구청 동주민센터 청사안내"},
  {"names":["상도3동 주민센터","상도3동주민센터","상도3동 동주민센터","상도3동 행정복지센터","상도3동행정복지센터","상도제3동 주민센터","상도제3동주민센터"],"category":"주민센터","address":"서울특별시 동작구 성대로2길 11","phone":"02-822-1005","website":"https://www.dongjak.go.kr/portal/main/contents.do?menuNo=200664","source":"동작구청 동주민센터 청사안내"},
  {"names":["상도4동 주민센터","상도4동주민센터","상도4동 동주민센터","상도4동 행정복지센터","상도4동행정복지센터","상도제4동 주민센터","상도제4동주민센터"],"category":"주민센터","address":"서울특별시 동작구 양녕로27길 44","phone":"02-823-0859","website":"https://www.dongjak.go.kr/portal/main/contents.do?menuNo=200664","source":"동작구청 동주민센터 청사안내"},
  {"names":["흑석동 주민센터","흑석동주민센터","흑석동 동주민센터","흑석동 행정복지센터","흑석동행정복지센터"],"category":"주민센터","address":"서울특별시 동작구 흑석한강로 11","phone":"02-815-1046","website":"https://www.dongjak.go.kr/portal/main/contents.do?menuNo=200664","source":"동작구청 동주민센터 청사안내"},
  {"names":["사당1동 주민센터","사당1동주민센터","사당1동 동주민센터","사당1동 행정복지센터","사당1동행정복지센터","사당제1동 주민센터","사당제1동주민센터"],"category":"주민센터","address":"서울특별시 동작구 동작대로17길 28","phone":"02-582-8582","website":"https://www.dongjak.go.kr/portal/main/contents.do?menuNo=200664","source":"동작구청 동주민센터 청사안내"},
  {"names":["사당2동 주민센터","사당2동주민센터","사당2동 동주민센터","사당2동 행정복지센터","사당2동행정복지센터","사당제2동 주민센터","사당제2동주민센터"],"category":"주민센터","address":"서울특별시 동작구 동작대로29길 52","phone":"02-820-2992","website":"https://www.dongjak.go.kr/portal/main/contents.do?menuNo=200664","source":"동작구청 동주민센터 청사안내"},
  {"names":["사당3동 주민센터","사당3동주민센터","사당3동 동주민센터","사당3동 행정복지센터","사당3동행정복지센터","사당제3동 주민센터","사당제3동주민센터"],"category":"주민센터","address":"서울특별시 동작구 사당로17길 86","phone":"02-820-2993","website":"https://www.dongjak.go.kr/portal/main/contents.do?menuNo=200664","source":"동작구청 동주민센터 청사안내"},
  {"names":["사당4동 주민센터","사당4동주민센터","사당4동 동주민센터","사당4동 행정복지센터","사당4동행정복지센터","사당제4동 주민센터","사당제4동주민센터"],"category":"주민센터","address":"서울특별시 동작구 사당로20나길 3","phone":"02-585-0050","website":"https://www.dongjak.go.kr/portal/main/contents.do?menuNo=200664","source":"동작구청 동주민센터 청사안내"},
  {"names":["사당5동 주민센터","사당5동주민센터","사당5동 동주민센터","사당5동 행정복지센터","사당5동행정복지센터","사당제5동 주민센터","사당제5동주민센터"],"category":"주민센터","address":"서울특별시 동작구 사당로2가길 219","phone":"02-820-2995","website":"https://www.dongjak.go.kr/portal/main/contents.do?menuNo=200664","source":"동작구청 동주민센터 청사안내"},
  {"names":["대방동 주민센터","대방동주민센터","대방동 동주민센터","대방동 행정복지센터","대방동행정복지센터"],"category":"주민센터","address":"서울특별시 동작구 여의대방로44길 20","phone":"02-815-0226","website":"https://www.dongjak.go.kr/portal/main/contents.do?menuNo=200664","source":"동작구청 동주민센터 청사안내"},
  {"names":["신대방1동 주민센터","신대방1동주민센터","신대방1동 동주민센터","신대방1동 행정복지센터","신대방1동행정복지센터","신대방제1동 주민센터","신대방제1동주민센터"],"category":"주민센터","address":"서울특별시 동작구 신대방길 72","phone":"02-832-6521","website":"https://www.dongjak.go.kr/portal/main/contents.do?menuNo=200664","source":"동작구청 동주민센터 청사안내"},
  {"names":["신대방2동 주민센터","신대방2동주민센터","신대방2동 동주민센터","신대방2동 행정복지센터","신대방2동행정복지센터","신대방제2동 주민센터","신대방제2동주민센터"],"category":"주민센터","address":"서울특별시 동작구 여의대방로24길 76","phone":"02-821-1008","website":"https://www.dongjak.go.kr/portal/main/contents.do?menuNo=200664","source":"동작구청 동주민센터 청사안내"},
  {"names":["동작청소년경찰학교","상도2치안센터","상도 2치안센터","상도2 치안센터","상도 2 치안센터"],"category":"교육시설","address":"서울특별시 동작구 장승배기로 73","website":"https://theyouthacademy.police.go.kr/PageLink.do?link=common%2Fetc%2Fmap&sid=sudk","source":"경찰청 청소년경찰학교 위치안내·동작경찰서 연혁","repurposed":true},
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
