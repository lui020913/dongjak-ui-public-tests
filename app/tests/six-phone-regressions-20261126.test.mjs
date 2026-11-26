import test from 'node:test';
import assert from 'node:assert/strict';
import {nearestRoadName} from '../functions/api/reverse-address.js';
import {isUnverifiedPoliceFacility,normalizeFacilityName,normalizeFacilityCategory} from '../src/facility-display-names.js';
test('road-only reverse result is usable but distant or POI-only result is not',()=>{
 const feature=(properties,coordinates)=>({properties,geometry:{coordinates}});
 assert.equal(nearestRoadName([feature({type:'street',name:'상도로'},[126.94,37.50])],37.5,126.94),'상도로');
 assert.equal(nearestRoadName([feature({type:'house',name:'상도로'},[126.94,37.50])],37.5,126.94),null);
 assert.equal(nearestRoadName([feature({street:'상도로'},[126.96,37.50])],37.5,126.94),null);
});
test('unverified police centers are not presented as operating police',()=>{
 assert.equal(isUnverifiedPoliceFacility('상도3치안센터'),true);
 assert.equal(normalizeFacilityCategory('경찰서','상도3치안센터'),'운영 미확인 시설');
 assert.equal(normalizeFacilityName('상도3치안센터'),'상도3 경찰 관련 시설 (운영 미확인)');
 assert.equal(isUnverifiedPoliceFacility('상도지구대'),false);
 assert.equal(isUnverifiedPoliceFacility('상도2치안센터'),false);
});
