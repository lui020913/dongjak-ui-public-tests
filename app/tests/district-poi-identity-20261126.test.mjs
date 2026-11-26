import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isApartmentLabelFeature,apartmentNameFilter} from '../src/apartment-labels.js';
import {hasTransportPoiHit,isTransitPoiFeature} from '../src/poi-click-identity.js';
import {importantPlaceFromFeatures} from '../src/important-place-click.js';
import {mergeMapSearchResults} from '../src/map-quick-search.js';
import {officialFeatures} from '../src/seoul-official-facilities.js';
const boundary={type:'Polygon',coordinates:[[[126.9,37.45],[127,37.45],[127,37.55],[126.9,37.55],[126.9,37.45]]]};
const feat=(name,cls,subclass)=>({properties:{name,class:cls,subclass}});
test('apartment brands do not turn transit, bicycle rentals or convenience stores into housing',()=>{
 for(const [name,c,s] of [['밤골.상도역롯데캐슬파크엘','bus','bus_stop'],['대림사거리(동작상떼빌아파트)','bicycle_rental','bicycle_rental'],['세븐일레븐 상도파크자이점','shop','convenience'],['삼성래미안.동작청소년센터','bus','bus_stop']])assert.equal(isApartmentLabelFeature(feat(name,c,s),'poi'),false);
 assert.equal(isApartmentLabelFeature(feat('상도롯데캐슬','residential','apartments'),'poi'),true);
 assert.equal(isApartmentLabelFeature(feat('상도롯데캐슬','building',''),'building'),true);
 assert.equal(isApartmentLabelFeature(feat('래미안 상가','retail',''),'building'),false);
 assert.notDeepEqual(apartmentNameFilter(boundary,'poi'),apartmentNameFilter(boundary,'building'));
});
test('rendered transit points take priority, route lines and named institution stops do not open a facility',()=>{
 const bus={layer:{id:'dj-transport-bus-pictogram'},properties:{name:'중앙대학교',kind:'bus'}};
 assert.equal(hasTransportPoiHit({queryRenderedFeatures:()=>[bus]},{point:{x:1,y:2}}),true);
 assert.equal(hasTransportPoiHit({queryRenderedFeatures:()=>[{layer:{id:'transport-route-line'}}]},{point:{x:1,y:2}}),false);
 assert.equal(isTransitPoiFeature(bus),true);
 assert.equal(importantPlaceFromFeatures([bus]),null);
});
test('search merges a matching non-ARS copy but preserves distinct boarding points',()=>{
 const a={name:'밤골.상도역롯데캐슬파크엘',kind:'bus',arsId:'20699',lng:126.9455944,lat:37.502152};
 const b={...a,arsId:'20918',lng:126.9455074,lat:37.5019655};
 const copy={...a,arsId:'',lng:a.lng+.00002,source:'basemap-poi'};
 const rows=mergeMapSearchResults([copy],[a,b]);
 assert.deepEqual(rows.map(p=>p.arsId).sort(),['20699','20918']);
});
test('same normalized facility nearby from different sources appears once without merging other categories',()=>{
 const a={id:'seoul1',name:'세븐일레븐 상도점',category:'편의점',lng:126.95,lat:37.5};
 const b={...a,id:'osm1',name:'코리아세븐 상도점',lng:126.95004};
 const other={...a,id:'other',category:'카페'};
 const data=officialFeatures([a,b,other],boundary);
 assert.equal(data.features.length,2);
});
test('complete official registry excludes native marker copies while fallback remains available',()=>{
 const src=readFileSync(new URL('../src/transport-map.js',import.meta.url),'utf8');
 assert.match(src,/officialStaticStopIds\.has\(String\(p\.arsId/);
 assert.match(src,/officialStaticStopCount>=400\?\['==',1,0\]:busTileFallbackFilter/);
});
