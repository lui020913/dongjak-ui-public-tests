import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeFacilityName,normalizeFacilityRecord,normalizeFacilityCategory,facilityCategorySearchTerms,facilityOsmCategory,sameFacility,facilityNameMatches,facilitySearchTerms} from '../src/facility-display-names.js';
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
 assert.deepEqual(normalizeFacilityRecord(p),{...p,category:'경찰서'});
 assert.equal(facilityNameMatches(p,'경찰서'),true);
 assert.equal(normalizeFacilityCategory('음식점','경찰서식당'),'음식점');
 assert.equal(normalizeFacilityCategory('일반시설','치안센터 앞 카페'),'일반시설');
 assert.equal(normalizeFacilityCategory('치과'),'치과');
 assert.equal(normalizeFacilityCategory('동물약국'),'동물약국');
});

test('category aliases reach search, vector subtype and conservative duplicate matching',()=>{
 const police={name:'상도5치안센터',category:'일반시설',lng:126.95,lat:37.49};
 for(const q of ['경찰서','치안센터','파출소','지구대'])assert.equal(facilityNameMatches(police,q),true,q);
 assert.ok(facilityCategorySearchTerms('경찰서').includes('치안센터'));
 assert.equal(facilityOsmCategory({class:'amenity',subclass:'police',name:police.name}),'경찰서');
 assert.equal(facilityOsmCategory({class:'public',subclass:'fire_station',name:'상도119안전센터'}),'소방서');
 assert.equal(sameFacility({name:'코리아세븐 상도점',category:'편의점',lng:126.95,lat:37.49},{name:'세븐일레븐 상도점',category:'편의점',lng:126.95004,lat:37.49}),true);
 assert.equal(sameFacility(police,{...police,name:'상도지구대'}),false);
 assert.equal(sameFacility(police,{...police,lng:126.951}),false);
});

test('OSM search includes fixed facility tags and original public institution names',async()=>{
 const {nameQuery}=await import('../functions/api/osm-name-search.js');
 const {normalizeNamedOsm}=await import('../src/v875-osm-name-search.js');
 const query=nameQuery('경찰서');
 assert.ok(query.includes('치안센터'));assert.ok(query.includes('police'));
 assert.equal(nameQuery('경찰서";'),null);
 const rows=normalizeNamedOsm({elements:[{id:1,type:'node',lon:126.95,lat:37.49,tags:{amenity:'police',name:'상도5치안센터'}}]},'경찰서');
 assert.equal(rows.length,1);assert.equal(rows[0].category,'경찰서');assert.equal(rows[0].name,'상도5치안센터');
});
