import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';
import {parseAedXml,normalizeAedRow,aedRowsToGeoJSON,DEFAULT_AED_ENDPOINT} from '../server/aed-openapi.mjs';
import {EXTRA_LAYER_DEFS,filteredDistrictPoints,insideBoundary} from '../src/dongjak-verified-data-layers.js';
import {SAFETY_GLYPH_PATHS,SAFETY_ICON_COLORS} from '../src/dongjak-safety-symbols.js';
import {onRequestGet} from '../functions/api/aed.js';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const read=path=>readFileSync(join(root,path),'utf-8');
const boundary={type:'Polygon',coordinates:[[[126.90,37.47],[126.99,37.47],[126.99,37.55],[126.90,37.55],[126.90,37.47]]]};
test('audio GeoJSON uses real source coordinates, 1017 buffered candidates are clipped to district',()=>{
 const json=JSON.parse(read('public/data/safety/accessibility/dongjak_audio_signals_candidates.geojson'));
 assert.equal(json.type,'FeatureCollection');assert.equal(json.features.length,1017);
 const clipped=filteredDistrictPoints(json,boundary);
 assert.ok(clipped.features.length>0&&clipped.features.length<1017);
 assert.ok(clipped.features.every(f=>insideBoundary(f.geometry.coordinates,boundary)));
 assert.ok(clipped.features.every(f=>f.properties.operational_status==='unverified'));
});
test('AED parser reads XML and preserves location, never guesses operating availability',()=>{
 const xml='<response><header><resultCode>00</resultCode><resultMsg>NORMAL SERVICE.</resultMsg></header><body><items><item><org>동작구 보건소 &amp; 별관</org><buildAddress>서울특별시 동작구 장승배기로 10</buildAddress><buildPlace>1층 로비</buildPlace><wgs84Lon>126.94122</wgs84Lon><wgs84Lat>37.50555</wgs84Lat><serialNumber>A123</serialNumber><orgTel>02-820-1111</orgTel></item><item><org>좌표 없는 AED</org></item></items><totalCount>2</totalCount></body></response>';
 const parsed=parseAedXml(xml);assert.equal(parsed.rows.length,2);assert.equal(parsed.total,2);
 assert.equal(parsed.rows[0].org,'동작구 보건소 & 별관');
 const collection=aedRowsToGeoJSON(parsed.rows,{retrievedAt:'2026-11-12T00:00:00Z'});
 assert.equal(collection.features.length,1);assert.equal(collection.meta.excluded_missing_or_outside,1);
 assert.equal(collection.features[0].properties.location_detail,'1층 로비');
 assert.equal(collection.features[0].properties.hours,'');
 assert.equal(collection.features[0].properties.operational_status,'unverified');
});
test('AED parser rejects upstream errors, HTML and invalid/swap coordinates',()=>{
 assert.throws(()=>parseAedXml('<response><resultCode>30</resultCode><resultMsg>INVALID_KEY</resultMsg></response>'),/INVALID_KEY/);
 assert.throws(()=>parseAedXml('<html>Invalid</html>'),/XML이 아닌/);
 assert.equal(normalizeAedRow({org:'missing'}),null);
 assert.equal(normalizeAedRow({org:'outside',wgs84Lon:'127.9',wgs84Lat:'37.5'}),null);
 const swapped=normalizeAedRow({org:'동작',wgs84Lon:'37.52',wgs84Lat:'126.95'});
 assert.deepEqual(swapped.geometry.coordinates,[126.95,37.52]);
});
test('AED Pages API never returns the secret; handles missing key and fake upstream safely',async()=>{
 const url='https://dongjak-walk-safety-preview.pages.dev/api/aed';
 const missing=await onRequestGet({request:new Request(url),env:{}});
 assert.equal(missing.status,503);assert.equal((await missing.json()).status,'not_configured');
 const fetchOriginal=globalThis.fetch;
 try{
  globalThis.fetch=async (url,options)=>{
   const u=new URL(url);
   assert.equal(u.origin,'https://apis.data.go.kr');assert.equal(u.pathname,new URL(DEFAULT_AED_ENDPOINT).pathname);
   assert.equal(u.searchParams.get('serviceKey'),'TEST_NON_REAL_SECRET');assert.equal(u.searchParams.get('Q1'),'동작구');
   return new Response('<response><header><resultCode>00</resultCode></header><body><items><item><org>동작구 테스트</org><buildAddress>서울특별시 동작구 테스트로</buildAddress><wgs84Lon>126.95</wgs84Lon><wgs84Lat>37.5</wgs84Lat></item></items><totalCount>1</totalCount></body></response>');
  };
  const response=await onRequestGet({request:new Request(url),env:{AED_API_KEY:'TEST_NON_REAL_SECRET'}});
  assert.equal(response.status,200);const content=await response.text();
  assert.equal(JSON.parse(content).features.length,1);assert.ok(!content.includes('TEST_NON_REAL_SECRET'));
 }finally{globalThis.fetch=fetchOriginal;}
});
test('new accessibility controls use existing v8 safety drawer and map route-selection event',()=>{
 const html=read('index.html'),layers=read('src/dongjak-verified-data-layers.js'),styles=read('src/v802-accessibility-aed.css');
 for(const key of ['audio-signals','official-aed']){
  assert.ok(html.includes(`data-dj-import="${key}"`));assert.ok(SAFETY_GLYPH_PATHS[key]?.length);assert.ok(SAFETY_ICON_COLORS[key]);assert.ok(EXTRA_LAYER_DEFS[key]);
 }
 assert.ok(html.indexOf('data-dj-import="audio-signals"')>html.indexOf('id="dj-safety-facilities"'));
 assert.match(layers,/dongjak:route-select/);assert.match(layers,/dongjak:boundary-updated/);
 assert.match(styles,/dj-access-facility-controls/);
 assert.match(read('src/main.js'),/installDongjakOfficialDataLayers/);
 assert.ok(existsSync(join(root,'functions/api/aed.js')));
});
test('AED paginates even if API caps rows below requested page size',async()=>{
 const original=globalThis.fetch;
 const make=number=>`<item><org>기관${number}</org><wgs84Lon>126.95</wgs84Lon><wgs84Lat>37.50</wgs84Lat><serialNumber>${number}</serialNumber></item>`;
 try{
  let pages=0;
  globalThis.fetch=async url=>{
   const page=Number(new URL(url).searchParams.get('pageNo'));pages++;
   return new Response(`<response><resultCode>00</resultCode><items>${page<=3?make(page):''}</items><totalCount>3</totalCount></response>`);
  };
  const response=await onRequestGet({request:new Request('https://example.com/api/aed'),env:{AED_API_KEY:'TEST'}});
  assert.equal(response.status,200);const data=await response.json();
  assert.equal(data.features.length,3);assert.equal(data.meta.source_complete,true);assert.equal(pages,3);
 }finally{globalThis.fetch=original;}
});
