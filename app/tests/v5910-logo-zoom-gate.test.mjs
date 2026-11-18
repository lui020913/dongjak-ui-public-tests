import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, statSync} from 'node:fs';
import {METRO_MARKER_MIN_ZOOM, visibleMetroLayerRole} from '../src/metro-marker-geodata.js';
import {metroMarkerVisibleAtZoom} from '../src/transport-map.js';
const root=new URL('../',import.meta.url);
const read=f=>readFileSync(new URL(f,root),'utf8');

test('loading uses transparent district symbol, office retains supplied original asset',()=>{
  const image='public/logos/dongjak-symbol-20261108.png';
  const bytes=readFileSync(new URL(image,root));
  assert.ok(statSync(new URL(image,root)).size>1000);
  assert.equal(bytes.toString('hex',0,8),'89504e470d0a1a0a');
  assert.equal(bytes.readUInt32BE(16),688);
  assert.equal(bytes.readUInt32BE(20),446);
  assert.match(read('index.html'),/class="map-startup-logo"[^>]*><img class="dj-app-artwork" src="\/icons\/dongjak-light-512\.png"/);
  assert.match(read('src/landmark-layer.js'),/no-image-tile/);
  // Header brand intentionally keeps its existing safety-map icon.
  assert.match(read('index.html'),/class="brand"[^>]*>[\s\S]*?<img class="dj-app-artwork" src="\/icons\/dongjak-light-192\.png"/);
});

test('furthest zoom hides all custom train lines and stations, restores them on zooming in',()=>{
  assert.equal(METRO_MARKER_MIN_ZOOM,12.2);
  for(const zoom of [10,10.5,11.4,12.19]){
    assert.equal(visibleMetroLayerRole(zoom),'hidden',`${zoom} should hide station icons`);
    assert.equal(metroMarkerVisibleAtZoom('summary',true,zoom),false);
  }
  assert.equal(visibleMetroLayerRole(12.2),'summary');
  assert.equal(metroMarkerVisibleAtZoom('summary',true,12.2),true);
  const s=read('src/transport-map.js');
  for(const id of ['transport-schematic-subway-casing','transport-schematic-subway']){
    assert.match(s,new RegExp(`id:'${id}'[\\s\\S]*?minzoom:METRO_MARKER_MIN_ZOOM`));
  }
  for(const id of ['transport-real-rail-overview-casing','transport-real-rail-overview']){
    assert.match(s,new RegExp(`id:'${id}'[\\s\\S]*?minzoom:Math\\.max\\(METRO_MARKER_MIN_ZOOM,RAIL_OVERVIEW_MIN_ZOOM\\)`));
  }
  assert.match(s,/const minzoom=isSummary\?\(mobile\?12\.6:METRO_MARKER_MIN_ZOOM\):METRO_PLATFORM_SPLIT_ZOOM/);
});
