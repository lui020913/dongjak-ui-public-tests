import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {placeData,verifiedPhone,verifiedWeb,matchingOsmContact} from '../src/place-details.js';
import {HANGANG_BRIDGE_REFERENCES} from '../src/hangang-bridge-labels.js';
import {NEARBY_PLACE_LABELS} from '../src/nearby-place-labels.js';
import {apartmentNameFilter,APARTMENT_WORDS} from '../src/apartment-labels.js';
import {onRequestPost} from '../functions/api/place-insight.js';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');

test('장소 상세정보에는 확인된 연락처/웹주소만 표시하고 임의 전화번호를 만들지 않는다',()=>{
 assert.equal(verifiedPhone('02-820-1114'),'02-820-1114');
 assert.equal(verifiedPhone('telephone missing'),'');
 assert.equal(verifiedWeb('javascript:alert(1)'),'');
 assert.equal(placeData({name:'학교',lat:37.5,lng:126.95}).phone,'');
});
test('OSM 같은 이름·가까운 위치만 연락처 자료로 인정한다',()=>{
 const place=placeData({name:'상도5치안센터',lng:126.952,lat:37.498});
 const records=[
 {tags:{name:'다른 기관',phone:'02-888-7777'},lat:37.498,lon:126.952},
 {tags:{name:'상도5치안센터',phone:'02-123-0000'},lat:37.54,lon:127.1},
 {tags:{name:'상도5치안센터',phone:'02-822-0101',website:'https://example.com'},lat:37.49801,lon:126.95201}
 ];
 assert.equal(matchingOsmContact(records,place).phone,'02-822-0101');
 assert.equal(matchingOsmContact(records.slice(0,2),place).phone,undefined);
});
test('교량 5곳과 노들섬은 충돌 우선순위 마커를 등록하며 누락시키지 않는다',()=>{
 assert.deepEqual(HANGANG_BRIDGE_REFERENCES.map(p=>p.name),['원효대교','한강철교','한강대교','동작대교','반포대교']);
 assert.ok(NEARBY_PLACE_LABELS.some(p=>p.name==='노들섬'));
 assert.match(read('src/main.js'),/installHangangBridgeLabels\(map,\{maplibregl\}\)/);
 assert.match(read('src/priority-place-marker.js'),/new maplibregl\.Marker/);
});
test('시설/대학/랜드마크는 좌표 고정 마커와 동일한 상세보기 컴포넌트를 사용한다',()=>{
 for(const f of ['src/education-layer.js','src/landmark-layer.js']){
  assert.match(read(f),/anchor:'center'/);
  assert.match(read(f),/openPlaceDetails/);
 }
 assert.match(read('src/civic-facility-layer.js'),/openPlaceDetails/);
 assert.match(read('src/map-patch/dj-v5911-place-polish.css'),/position:absolute!important/);
});
test('아파트는 이름이 등록된 기존 벡터 건물만 확대 레이어에 추가한다',()=>{
 assert.ok(APARTMENT_WORDS.includes('아파트'));
 const filter=apartmentNameFilter({type:'Polygon',coordinates:[[[126.9,37.5],[127,37.5],[127,37.6],[126.9,37.5]]]});
 assert.equal(filter[0],'all');
 assert.match(read('src/apartment-labels.js'),/minzoom:kind==='building'\?15\.5/);
});
test('AI API는 Cloudflare Workers AI 바인딩 없이 사용 불가',async()=>{
 const request=new Request('https://example.pages.dev/api/place-insight',{method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({name:'상도역',lat:37.5,lng:126.95})});
 const res=await onRequestPost({request,env:{}});
 assert.equal(res.status,503);
 assert.match((await res.json()).message,/Cloudflare Workers AI 바인딩/);
});
test('우선순위 장소 마커는 실제 좌표에 붙고 확대 시에만 나타난다',async()=>{
 const {installPriorityMarkers}=await import('../src/priority-place-marker.js');
 const previous=globalThis.document;
 const instances=[];
 class FakeMarker{
   constructor(args){this.element=args.element;instances.push(this);}
   setLngLat(lngLat){this.lngLat=lngLat;return this;}
   addTo(){return this;}
   remove(){this.removed=true;}
 }
 let zoom=12;const listeners=new Map();
 const map={getZoom:()=>zoom,on:(name,fn)=>listeners.set(name,fn),off:(name)=>listeners.delete(name)};
 globalThis.document={createElement:()=>({style:{},setAttribute(){},addEventListener(){}})};
 try{
   const cleanup=installPriorityMarkers({map,maplibregl:{Marker:FakeMarker},items:[{name:'노들섬',lat:37.517557,lng:126.958661}],minZoom:11.85});
   assert.deepEqual(instances[0].lngLat,[126.958661,37.517557]);
   assert.equal(instances[0].element.style.display,'block');
   zoom=11;listeners.get('zoom')();
   assert.equal(instances[0].element.style.display,'none');
   cleanup();assert.equal(instances[0].removed,true);
 }finally{globalThis.document=previous;}
});
