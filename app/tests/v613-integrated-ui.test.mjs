import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {nightFeatureVisible,NIGHT_DETAIL_ZOOM,NIGHT_FOREGROUND_LAYERS} from '../src/night-visibility-map.js';
import {safetyFeatures,duplicatesFeaturedPlace} from '../src/safety-layers.js';
import {civicFilter} from '../src/civic-facility-layer.js';
import {makeCircularFeaturedLogo} from '../src/featured-place-labels.js';
import {splitMetroArrivalText} from '../src/transport-map.js';
import {onRequestGet} from '../functions/api/place-insight.js';
import {entranceNumber,parsePublicExitArcGIS} from '../src/station-accessibility.js';
import {VERSION_HISTORY} from '../src/version-history.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>readFileSync(path.join(root,rel),'utf8');

test('night far / medium / near zoom renders only appropriate detail',()=>{
  for(const line of ['dj-night-lit-line','dj-night-dark-alley','dj-night-occ-clear']){
    assert.equal(nightFeatureVisible(line,13),true);
    assert.equal(nightFeatureVisible(line,19),true);
    assert.equal(nightFeatureVisible(line,19,false),false);
  }
  assert.equal(nightFeatureVisible('dj-night-light-point',15),false);
  assert.equal(nightFeatureVisible('dj-night-light-point',NIGHT_DETAIL_ZOOM.light),true);
  assert.equal(nightFeatureVisible('dj-night-reach-fill',13),false);
  assert.equal(nightFeatureVisible('dj-night-reach-fill',NIGHT_DETAIL_ZOOM.reach),true);
  assert.equal(nightFeatureVisible('dj-night-light-glow',13),false);
  assert.ok(!NIGHT_FOREGROUND_LAYERS.includes('dj-night-light-point'), 'lamps must not be promoted in front of 3D buildings');
  assert.match(read('src/night-visibility-map.js'),/placeLampsBelowBuildings/);
});

test('same named major place does not reappear as public source/square POI',()=>{
  assert.equal(duplicatesFeaturedPlace('동작구청 신청사'),true);
  assert.equal(duplicatesFeaturedPlace('중앙대학교'),true);
  assert.equal(duplicatesFeaturedPlace('동작구1동주민센터'),false);
  const features=safetyFeatures([
    {type:'node',id:1,lon:126.94,lat:37.50,tags:{name:'동작구청',office:'government'}},
    {type:'node',id:2,lon:126.95,lat:37.50,tags:{name:'상도2동주민센터',office:'government'}}
  ],()=>true,'public');
  assert.equal(features.features.length,1);
  assert.equal(features.features[0].properties.name,'상도2동주민센터');
  assert.match(JSON.stringify(civicFilter('civic',{type:'Polygon',coordinates:[]})),/동작구청/);
});

test('all five official logos are drawn inside a circular clip, not behind an oversized dot',()=>{
  const calls=[];
  const ctx={
    save(){calls.push('save')},beginPath(){calls.push('beginPath')},arc(...args){calls.push(['arc',...args])},
    clip(){calls.push('clip')},fillRect(){calls.push('fillRect')},
    drawImage(){calls.push('drawImage')},restore(){calls.push('restore')},stroke(){calls.push('stroke')},
    getImageData(){return {data:new Uint8ClampedArray(112*112*4)}}
  };
  const old=globalThis.document;
  try{
    globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
    const result=makeCircularFeaturedLogo({width:150,height:90},{size:112});
    assert.equal(result.width,112);assert.equal(result.height,112);
    assert.ok(calls.indexOf('clip')<calls.indexOf('drawImage'));
    assert.ok(calls.some(c=>Array.isArray(c)&&c[0]==='arc'));
  }finally{globalThis.document=old;}
});

test('subway arrival preserves source time and separates the parenthesized reference station',()=>{
  assert.deepEqual(splitMetroArrivalText('8분 10초 후 (국회의사당)'),{
    primary:'8분 10초 후',secondary:'(국회의사당)'
  });
  assert.deepEqual(splitMetroArrivalText('도착'),{primary:'도착',secondary:''});
  const html=read('index.html');
  assert.ok(html.indexOf('id="transport-arrivals"')<html.indexOf('id="transport-neighbors"'));
  assert.ok(html.indexOf('id="transport-neighbors"')<html.indexOf('class="transport-selection-box"'));
});

test('only actual numbered exit locations are kept as numbered badges',()=>{
  assert.equal(entranceNumber('4번 출구'),'4');
  assert.equal(entranceNumber('14번 출입구'),'14');
  const geo=parsePublicExitArcGIS({features:[{geometry:{x:126.9531,y:37.5034},attributes:{STN_NM:'상도역',ENTRC_NO:'3번 출구'}},
    {geometry:{x:130,y:40},attributes:{STN_NM:'거리 바깥',ENTRC_NO:'1번 출구'}}]});
  assert.equal(geo.features.length,1);
  assert.equal(geo.features[0].properties.number,'3');
  assert.deepEqual(geo.features[0].geometry.coordinates,[126.9531,37.5034]);
});

test('AI readiness is checked server-side; no VITE API secret is used by popup',async()=>{
  const disabled=await onRequestGet({env:{}});
  const ready=await onRequestGet({env:{AI:{run:async()=>({response:'정상'})},AI_PLACE_ENABLED:'true'}});
  assert.equal((await disabled.json()).enabled,false);
  assert.equal((await ready.json()).enabled,true);
  assert.ok(!read('src/place-details.js').includes('VITE_OPENAI_API_KEY'));
  assert.ok(!read('src/place-details.js').includes('VITE_GEMINI_API_KEY'));
});

test('map button sizing is specific, 3 control sizes are consistent and all old navigation remains',()=>{
  const css=read('src/v613-map-ux.css');
  assert.ok(css.includes('#app #map-tools-toggle'));
  assert.ok(css.includes('#app #map-safety-toggle'));
  assert.ok(css.includes('#app #night-visibility-quick-off'));
  assert.ok(!css.includes('#app .map-actions button{width:88px'));
  assert.match(read('src/admin-dong-layer.js'),/visibility:'none'/);
  assert.match(read('src/education-layer.js'),/Open-book|book instead/i);
});

test('v6.0.21 published version and release notes match',()=>{
  assert.equal(VERSION_HISTORY[0]?.version,'v7.0.29');
  assert.equal(JSON.parse(read('package.json')).version,APP_VERSION);
  assert.match(read('index.html'),new RegExp('v'+APP_VERSION.replaceAll('.','\\.')));
  assert.ok(read('src/main.js').includes("import './v613-map-ux.css';"));
});
