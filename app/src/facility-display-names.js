/** Shared display aliases for verified retail brands. Never overwrite source records.
 * Restrict operator-only aliases to matching business types; do not infer a branch from its address.
 */
const categoryAliases=Object.freeze({
 bus:'버스정류장',bus_stop:'버스정류장',bus_station:'버스터미널',subway:'지하철·철도역',railway:'지하철·철도역',station:'지하철·철도역',train_station:'지하철·철도역',tram_stop:'철도 정류장',
 restaurant:'음식점',fast_food:'음식점',cafe:'카페',coffee:'카페',convenience:'편의점',supermarket:'마트',pharmacy:'약국',hospital:'병원',clinic:'의원',dentist:'치과',school:'학교',university:'대학교',college:'대학교',kindergarten:'유치원',park:'공원',garden:'정원',library:'도서관',bank:'은행',atm:'ATM',toilets:'화장실',toilet:'화장실',police:'경찰서',fire_station:'소방서',townhall:'공공기관',place_of_worship:'종교시설',church:'교회',parking:'주차장',fuel:'주유소',hotel:'숙박시설',shop:'상점',bakery:'제과점',marketplace:'시장',museum:'박물관',sports_centre:'체육시설',playground:'놀이터',community_centre:'주민시설',post_office:'우체국',shelter:'쉼터',food:'음식점',healthcare:'의료시설'
});
const TYPE_ALIASES=Object.freeze({
 '치안센터':'경찰서','경찰지구대':'경찰서','지구대':'경찰서','파출소':'경찰서','경찰파출소':'경찰서','경찰시설':'경찰서',
 '119안전센터':'소방서','119구조대':'소방서','119지역대':'소방서','소방파출소':'소방서','소방시설':'소방서',
 '행정복지센터':'주민센터','동주민센터':'주민센터','동사무소':'주민센터',
 '일반음식점':'음식점','커피전문점':'카페','슈퍼마켓':'마트','자동심장충격기':'AED','자동제세동기':'AED',
 '공중화장실':'화장실','공공화장실':'화장실'
});
const genericType=new Set(['','장소','시설','일반시설','일반 시설','일반 장소','공공기관','주민시설','안전시설','point','other','unknown']);
export function normalizeFacilityCategory(value,name=''){
 const raw=String(value??'').trim();
 const type=TYPE_ALIASES[raw]||categoryAliases[raw.toLowerCase()]||raw;
 if(genericType.has(type)){
   const label=String(name??'').trim().replace(/\s+/g,'');
   if(/(?:경찰서|경찰지구대|지구대|파출소|치안센터)$/.test(label))return '경찰서';
   if(/(?:소방서|119안전센터|119구조대|119지역대|소방파출소)$/.test(label))return '소방서';
   if(/(?:행정복지센터|주민센터|동사무소)$/.test(label))return '주민센터';
 }
 return type;
}
const COMMERCIAL=new Set(['편의점','카페','음식점','휴게음식점','제과점','마트','패스트푸드','일반시설','일반 시설','일반 장소']);
const rules=[
 {brand:'세븐일레븐',aliases:['세븐일레븐','7-Eleven','7 Eleven','7ELEVEN','세븐 일레븐'],operators:['코리아세븐','한국세븐','Korea Seven'],operatorTypes:['편의점']},
 {brand:'CU',aliases:['CU','씨유'],operators:['비지에프리테일','BGF리테일','BGF Retail'],operatorTypes:['편의점']},
 {brand:'GS25',aliases:['GS25','GS 25','지에스25','지에스이십오'],operators:['지에스리테일','GS리테일','GS Retail'],operatorTypes:['편의점']},
 {brand:'이마트24',aliases:['이마트24','이마트 24','emart24','emart 24'],operators:[],operatorTypes:[]},
 {brand:'스타벅스',aliases:['스타벅스커피코리아','스타벅스커피','스타벅스','Starbucks Coffee Korea','Starbucks Coffee','Starbucks'],operators:['에스씨케이컴퍼니','SCK컴퍼니','SCK Company'],operatorTypes:['카페','휴게음식점']},
 {brand:'커피빈',aliases:['커피빈코리아','커피빈','The Coffee Bean & Tea Leaf','Coffee Bean'],operators:[],operatorTypes:[]},
 {brand:'투썸플레이스',aliases:['투썸플레이스','투썸 플레이스','A Twosome Place','Twosome Place'],operators:[],operatorTypes:[]},
 {brand:'이디야커피',aliases:['이디야커피','이디야 커피','이디야','EDIYA Coffee','EDIYA'],operators:[],operatorTypes:[]},
 {brand:'메가MGC커피',aliases:['메가MGC커피','메가엠지씨커피','메가커피','MEGA MGC COFFEE','MEGA COFFEE'],operators:[],operatorTypes:[]},
 {brand:'컴포즈커피',aliases:['컴포즈커피','컴포즈 커피','Compose Coffee'],operators:[],operatorTypes:[]},
 {brand:'빽다방',aliases:['빽다방','Paik’s Coffee',"Paik's Coffee",'PAIKS COFFEE'],operators:[],operatorTypes:[]},
 {brand:'파리바게뜨',aliases:['파리바게뜨','파리바게트','Paris Baguette'],operators:[],operatorTypes:[]},
 {brand:'뚜레쥬르',aliases:['뚜레쥬르','뚜레주르','Tous Les Jours'],operators:[],operatorTypes:[]},
 {brand:'맥도날드',aliases:['맥도날드','McDonald’s',"McDonald's",'McDonalds'],operators:['한국맥도날드'],operatorTypes:['음식점','휴게음식점','패스트푸드']},
 {brand:'버거킹',aliases:['버거킹','Burger King'],operators:[],operatorTypes:[]},
 {brand:'롯데리아',aliases:['롯데리아','Lotteria'],operators:[],operatorTypes:[]},
 {brand:'맘스터치',aliases:['맘스터치',"Mom's Touch",'Mom’s Touch'],operators:[],operatorTypes:[]},
 {brand:'배스킨라빈스',aliases:['배스킨라빈스','베스킨라빈스','Baskin Robbins','Baskin-Robbins'],operators:[],operatorTypes:[]},
 {brand:'던킨',aliases:['던킨도너츠','던킨','Dunkin Donuts',"Dunkin'"],operators:[],operatorTypes:[]},
 {brand:'서브웨이',aliases:['서브웨이','써브웨이','Subway'],operators:[],operatorTypes:[]},
 {brand:'이마트',aliases:['이마트','emart','e-mart'],operators:[],operatorTypes:[]},
 {brand:'홈플러스',aliases:['홈플러스','Homeplus'],operators:[],operatorTypes:[]},
 {brand:'롯데마트',aliases:['롯데마트','Lotte Mart'],operators:[],operatorTypes:[]}
];
const fold=s=>String(s??'').normalize('NFKC').toLowerCase().replace(/[\s\-‐‑–’']/g,'');
const trim=s=>String(s??'').normalize('NFKC').trim();
const stripLegal=s=>s.replace(/(?:\(\s*주\s*\)|주식회사|유한회사|\(\s*유\s*\))/g,' ').replace(/\s+/g,' ').trim();
const escapeRe=s=>s.replace(/[.*+?^$(){}|[\]\\]/g,'\\$&');
function prefixMatch(name,alias){
 const re=new RegExp('^'+escapeRe(alias).replace(/\s+/g,'\\s*'),'i');
 const match=name.match(re);if(!match)return null;
 const tail=name.slice(match[0].length);
 // Don't turn a similar word, e.g. "CUCUMBER", into a chain.
 if(/[a-z0-9]/i.test(tail[0]||''))return null;
 if(tail&&!/^[\s(·-]/.test(tail)&&!/(?:점|지점|매장)$/.test(tail))return null;
 return tail.replace(/^[\s·-]+/,'').trim();
}
const explicitOperators=['지에스리테일','GS리테일','GS Retail','비지에프리테일','BGF리테일','코리아세븐','한국세븐','파리크라상','씨제이푸드빌','CJ푸드빌','더본코리아','롯데지알에스','비알코리아'];
export function normalizeFacilityName(value,category=''){
 const raw=String(value??'').trim();
 category=normalizeFacilityCategory(category,raw);
 if(!raw||!COMMERCIAL.has(category))return raw;
 let name=stripLegal(trim(raw));
 // A multi-brand operator is removed only when the remaining text explicitly identifies a brand.
 for(const op of explicitOperators){
   const tail=prefixMatch(name,op);
   if(tail&&rules.some(r=>r.aliases.some(a=>prefixMatch(tail,a)!==null))){name=tail;break;}
 }
 for(const rule of rules){
   const aliases=[...rule.aliases,...(rule.operatorTypes.includes(category)?rule.operators:[])].sort((a,b)=>b.length-a.length);
   for(const alias of aliases){
     const tail=prefixMatch(name,alias);
     if(tail===null)continue;
     // Avoid duplicating the brand when the legal name and storefront name both occur.
     const repeated=rule.aliases.map(a=>prefixMatch(tail,a)).find(t=>t!==null);
     const suffix=repeated??tail;
     return suffix?rule.brand+' '+suffix:rule.brand;
   }
 }
 return raw;
}
export function normalizeFacilityRecord(place){
 const raw=String(place?.registeredName??place?.name??'').trim();
 const category=normalizeFacilityCategory(place?.category??place?.type??'',raw);
 const name=normalizeFacilityName(place?.name,category);
 return {...place,name,...(category?{category}:{}),...(place?.type&&category?{type:category}:{}),...(raw&&raw!==name?{registeredName:raw}:{})};
}
/** Query expansion is bounded, parameter-bound in SQL, and keeps a branch suffix if provided. */
export function facilitySearchTerms(value){
 const raw=String(value??'').trim();if(!raw)return [];
 const q=stripLegal(trim(raw));
 for(const rule of rules){
   const aliases=[rule.brand,...rule.aliases,...rule.operators,...(rule.brand==='세븐일레븐'?['세븐']:rule.brand==='투썸플레이스'?['투썸']:[])];
   for(const alias of aliases){
     let tail=prefixMatch(q,alias);
     if(tail===null&&fold(q)===fold(alias))tail='';
     if(tail===null)continue;
     return [...new Set([raw,...aliases.map(a=>tail?a+' '+tail:a)])].slice(0,20);
   }
 }
 return [raw];
}
export function facilityNameMatches(place,query){
 const q=fold(query);if(!q)return false;
 const normalized=normalizeFacilityRecord(place);
 const fields=[normalized.name,normalized.registeredName,normalized.category];
 if(fields.some(v=>fold(v).includes(q)))return true;
 // Alternate brand spellings should match only a record with that verified normalized brand.
 return facilitySearchTerms(query).some(t=>fold(normalized.name).includes(fold(t))||fold(normalized.registeredName).includes(fold(t)));
}
