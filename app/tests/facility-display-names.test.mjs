import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeFacilityName,normalizeFacilityRecord,normalizeFacilityCategory,facilityCategorySearchTerms,facilityOsmCategory,sameFacility,facilityNameMatches,facilitySearchTerms,facilityDisplayType,isFormerPoliceFacility,verifiedFacilityLabelExpression} from '../src/facility-display-names.js';
test('verified store operator aliases preserve actual branch suffix and raw record',()=>{
 const p={id:'r:1',name:'(주)코리아세븐 상도점',category:'편의점',lng:126.95,lat:37.49};
 assert.deepEqual(normalizeFacilityRecord(p),{...p,name:'세븐일레븐 상도점',registeredName:p.name});
 assert.equal(normalizeFacilityName('주식회사 한국세븐','편의점'),'세븐일레븐');
 assert.equal(normalizeFacilityName('지에스리테일 GS25 상도점','편의점'),'GS25 상도점');
 assert.equal(normalizeFacilityName('비지에프리테일 상도점','편의점'),'CU 상도점');
 assert.equal(normalizeFacilityName('7-Eleven 상도점','편의점'),'세븐일레븐 상도점');
});
test('cafe, bakery and restaurant names are normalized without guessing multi-brand operators',()=>{
 assert.equal(normalizeFacilityName('주식회사 에스씨케이컴퍼니 상도점','카페'),'스타벅스 상도점');
 assert.equal(normalizeFacilityName('씨제이푸드빌 뚜레쥬르 상도점','제과점'),'뚜레쥬르 상도점');
 assert.equal(normalizeFacilityName('파리크라상 파리바게뜨 상도점','휴게음식점'),'파리바게뜨 상도점');
 assert.equal(normalizeFacilityName('씨제이푸드빌 상도점','음식점'),'씨제이푸드빌 상도점');
 assert.equal(normalizeFacilityName('지에스리테일 상도점','마트'),'지에스리테일 상도점');
 assert.equal(normalizeFacilityName('CUCUMBER CAFE','카페'),'CUCUMBER CAFE');
 assert.equal(normalizeFacilityName('코리아세븐 약국','약국'),'코리아세븐 약국');
});
test('brand and legal-name search aliases work without removing branch suffix',()=>{
 const p={name:'코리아세븐 상도점',category:'편의점'};
 for(const q of ['세븐일레븐','세븐','7-Eleven','코리아세븐','한국세븐','세븐일레븐 상도점'])assert.equal(facilityNameMatches(p,q),true,q);
 assert.equal(facilityNameMatches(p,'세븐일레븐 노량진점'),false);
 assert.ok(facilitySearchTerms('세븐일레븐 상도점').includes('코리아세븐 상도점'));
 assert.deepEqual(facilitySearchTerms('일반 상호'),['일반 상호']);
});

test('public and safety facility categories are canonical without renaming real institutions',()=>{
 for(const [raw,expected] of [['치안센터','경찰서'],['지구대','경찰서'],['파출소','경찰서'],['police','경찰서'],['119안전센터','소방서'],['fire_station','소방서'],['행정복지센터','주민센터'],['일반음식점','음식점'],['공중화장실','화장실']])assert.equal(normalizeFacilityCategory(raw),expected);
 const p={name:'상도5치안센터',category:'일반시설',lng:126.95,lat:37.49};
 assert.deepEqual(normalizeFacilityRecord(p),{...p,name:'상도5치안센터 (운영 종료)',category:'운영 종료 시설',registeredName:p.name});
 assert.equal(facilityNameMatches(p,'경찰서'),false);
 assert.equal(facilityNameMatches(p,'상도5치안센터'),true);
 assert.equal(normalizeFacilityCategory('음식점','경찰서식당'),'음식점');
 assert.equal(normalizeFacilityCategory('일반시설','치안센터 앞 카페'),'일반시설');
 assert.equal(normalizeFacilityCategory('치과'),'치과');
 assert.equal(normalizeFacilityCategory('동물약국'),'동물약국');
});

test('category aliases reach search, vector subtype and conservative duplicate matching',()=>{
 const police={name:'상도지구대',category:'일반시설',lng:126.95,lat:37.49};
 for(const q of ['경찰서','치안센터','파출소','지구대'])assert.equal(facilityNameMatches(police,q),true,q);
 assert.ok(facilityCategorySearchTerms('경찰서').includes('치안센터'));
 assert.equal(facilityOsmCategory({class:'amenity',subclass:'police',name:police.name}),'경찰서');
 assert.equal(facilityOsmCategory({class:'public',subclass:'fire_station',name:'상도119안전센터'}),'소방서');
 assert.equal(sameFacility({name:'코리아세븐 상도점',category:'편의점',lng:126.95,lat:37.49},{name:'세븐일레븐 상도점',category:'편의점',lng:126.95004,lat:37.49}),true);
 assert.equal(sameFacility(police,{...police,name:'흑석지구대'}),false);
 assert.equal(sameFacility(police,{...police,lng:126.951}),false);
});

test('OSM search includes fixed facility tags and original public institution names',async()=>{
 const {nameQuery}=await import('../functions/api/osm-name-search.js');
 const {normalizeNamedOsm}=await import('../src/v875-osm-name-search.js');
 const query=nameQuery('경찰서');
 assert.ok(query.includes('치안센터'));assert.ok(query.includes('police'));
 assert.equal(nameQuery('경찰서";'),null);
 const rows=normalizeNamedOsm({elements:[{id:1,type:'node',lon:126.95,lat:37.49,tags:{amenity:'police',name:'상도지구대'}},{id:2,type:'node',lon:126.95,lat:37.49,tags:{amenity:'police',name:'상도5치안센터'}}]},'경찰서');
 assert.equal(rows.length,1);assert.equal(rows[0].category,'경찰서');assert.equal(rows[0].name,'상도지구대');
});

test('official identity aliases, precise types and closed-site status stay consistent',()=>{
 assert.equal(normalizeFacilityName('상도동우체국','우체국'),'서울상도동우체국');
 assert.equal(normalizeFacilityName('서울현충원','공공기관'),'국립서울현충원');
 assert.equal(normalizeFacilityName('중앙대학교 서울캠퍼스','대학교'),'중앙대학교');
 assert.equal(normalizeFacilityName('  상도   약국  ','약국'),'상도 약국');
 assert.equal(normalizeFacilityName('동물병원','병원'),'동물병원');
 assert.equal(facilityDisplayType('경찰서','상도지구대'),'지구대');
 assert.equal(facilityDisplayType('경찰서','대방파출소'),'파출소');
 assert.equal(facilityDisplayType('소방서','상도119안전센터'),'119안전센터');
 assert.equal(normalizeFacilityCategory('childcare'),'어린이집');
 assert.equal(normalizeFacilityCategory('kindergarten'),'유치원');
 assert.equal(isFormerPoliceFacility('상도 5 치안센터'),true);
 assert.equal(isFormerPoliceFacility('상도5치안센터 앞 카페'),false);
 assert.equal(facilityNameMatches({name:'서울상도동우체국',category:'우체국'},'상도동우체국'),true);
 assert.ok(verifiedFacilityLabelExpression(['get','name']).includes('서울상도동우체국'));
});

test('all Dongjak resident-office aliases retain administrative identity and exact official address',async()=>{
 const {verifiedPlaceRecord}=await import('../src/verified-place-directory.js');
 const dongs=['노량진1동','노량진2동','상도1동','상도2동','상도3동','상도4동','흑석동','사당1동','사당2동','사당3동','사당4동','사당5동','대방동','신대방1동','신대방2동'];
 for(const dong of dongs){
  const record=verifiedPlaceRecord(dong+' 주민센터');
  assert.ok(record?.address.startsWith('서울특별시 동작구 '));
  assert.match(record.phone,/^02-\d{3}-\d{4}$/);
  assert.equal(normalizeFacilityName(dong+'행정복지센터','공공기관'),dong+' 주민센터');
  assert.equal(normalizeFacilityCategory('공공기관',dong+'행정복지센터'),'주민센터');
  assert.equal(facilityNameMatches({name:dong+' 주민센터',category:'주민센터'},dong+'행정복지센터'),true);
 }
 assert.equal(normalizeFacilityName('상도1동 주민센터 앞 약국','약국'),'상도1동 주민센터 앞 약국');
});
test('officially repurposed youth school is not an active police result',async()=>{
 const {normalizeNamedOsm}=await import('../src/v875-osm-name-search.js');
 const {facilityPresentation}=await import('../src/v912-poi-presentation.js');
 const p={name:'상도2치안센터',category:'경찰서',lng:126.95,lat:37.49};
 const row=normalizeFacilityRecord(p);
 assert.equal(row.name,'동작청소년경찰학교');assert.equal(row.category,'교육시설');assert.equal(row.registeredName,p.name);
 assert.equal(facilityNameMatches(row,'경찰서'),false);
 assert.equal(facilityNameMatches(row,'상도2치안센터'),true);
 assert.equal(facilityPresentation(row.category).icon,'school');
 const data={elements:[{id:2,type:'node',lon:p.lng,lat:p.lat,tags:{amenity:'police',name:p.name}}]};
 assert.deepEqual(normalizeNamedOsm(data,'경찰서'),[]);
 assert.equal(normalizeNamedOsm(data,'상도2치안센터')[0].name,'동작청소년경찰학교');
});


test('one availability gate blocks stale raw and cached police identities, not verified schools or nearby shops',async()=>{
 const {isUnavailableFacility}=await import('../src/facility-display-names.js');
 for(const row of ['상도3치안센터','상도3 경찰 관련 시설 (운영 미확인)','상도5치안센터',{name:'저장한 장소',registeredName:'상도3치안센터'},{name:'이름 없음',category:'운영 미확인 시설'}])assert.equal(isUnavailableFacility(row),true);
 for(const row of ['상도지구대','상도2치안센터','동작청소년경찰학교','상도3치안센터 앞 카페'])assert.equal(isUnavailableFacility(row),false);
 const {openPlaceDetails}=await import('../src/place-details.js');
 // No document or map calls should be needed to reject either stale record.
 for(const name of ['상도3치안센터','상도3 경찰 관련 시설 (운영 미확인)','상도5치안센터'])assert.equal(openPlaceDetails({map:{},maplibregl:{Popup:class{}},place:{name,lng:126.95,lat:37.5}}),null);
 const {normalizePlaceSearchResults}=await import('../src/route-search.js');
 const {normalizeNamedOsm}=await import('../src/v875-osm-name-search.js');
 const names=['상도3치안센터','상도5치안센터','상도지구대'];
 assert.deepEqual(normalizePlaceSearchResults({features:names.map(name=>({geometry:{type:'Point',coordinates:[126.95,37.5]},properties:{name,osm_key:'amenity',osm_value:'police'}}))}).map(p=>p.name),['상도지구대']);
 assert.deepEqual(normalizeNamedOsm({elements:[{type:'node',id:1,lon:126.95,lat:37.5,tags:{name:'상도5치안센터',amenity:'police'}}]},'상도5치안센터'),[]);
});
