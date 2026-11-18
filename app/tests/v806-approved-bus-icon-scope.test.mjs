import {historicalSnapshotTest} from './support/historical-snapshot-audit.mjs';
import {stripApprovedV825TransportUI} from './support/approved-v825-transport-ui.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {
  APPROVED_V711_METRO_SHA256,
  APPROVED_V806_BUS_ICON_SHA256,
  APPROVED_V809_BUS_ICON_SHA256
} from './support/approved-walk-integration.mjs';
import {installBasemapBusStopFallback} from '../src/transport-map.js';
import {stripApprovedV818CameraFocus} from './support/approved-v818-transport-focus.mjs';

const currentSource=readFileSync(new URL('../src/transport-map.js',import.meta.url),'utf8');
const hash=s=>createHash('sha256').update(s).digest('hex');
const oldToken="16.4,0.23,18.2,0.29,20,0.35";
const newToken="16.4,0.262,18.2,0.331,20,0.393";
const newScale=['interpolate',['linear'],['zoom'],16.4,0.262,18.2,0.331,20,0.393];

historicalSnapshotTest('v809 bus marker increase changes exactly two icon-size arrays',()=>{
  const source=stripApprovedV818CameraFocus(stripApprovedV825TransportUI(currentSource));
  assert.equal((source.match(/16\.4,0\.262,18\.2,0\.331,20,0\.393/g)||[]).length,2,
    'exactly the fallback and official bus pictogram sizes must change');
  assert.equal(hash(source),APPROVED_V809_BUS_ICON_SHA256,'approved current source must match');
  assert.equal(hash(source.replaceAll(newToken,"16.4,0.25,18.2,0.315,20,0.375")),APPROVED_V806_BUS_ICON_SHA256,
    'reverting this release must restore the approved prior source');
  assert.equal(hash(source.replaceAll(newToken,oldToken)),APPROVED_V711_METRO_SHA256,
    'reversing ONLY the two authorized icon-size edits must reproduce the historic protected transport source');
});

test('fallback map layer really renders modestly larger icons without altering geographic source',()=>{
  let captured=null;
  const map={
    getLayer:()=>null,
    hasImage:name=>name==='dj-bus-blue-marker',
    getStyle:()=>({layers:[{id:'poi_transit',type:'symbol',source:'original-poi-tiles','source-layer':'poi'}]}),
    addLayer:(layer,before)=>{captured={layer,before};}
  };
  assert.equal(installBasemapBusStopFallback(map),true);
  assert.ok(captured);
  assert.equal(captured.layer.source,'original-poi-tiles');
  assert.equal(captured.layer['source-layer'],'poi');
  assert.equal(captured.layer.minzoom,16.4);
  assert.equal(captured.layer.maxzoom,undefined);
  assert.deepEqual(captured.layer.layout['icon-size'],newScale);
  assert.equal(captured.layer.layout['icon-allow-overlap'],true);
  assert.equal(captured.layer.layout['icon-ignore-placement'],true);
  assert.ok(64*newScale.at(-1)<=28,'icon width at zoom 20 must remain no larger than 28px');
});
