import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('subway moving train symbol and front beam require street-level zoom',()=>{
  const adapter=read('src/features/liveTransit/integrate.js');
  const source=read('src/features/liveTransit/index.js');
  assert.match(adapter,/minZoom:13\.2,metroMinZoom:16\.4,intervalMs:60000/);
  assert.match(source,/minzoom:metroMinZoom/);
  assert.match(source,/TRAIN_BEAM_LAYER,type:'symbol',source:LIVE_SOURCE,minzoom:metroMinZoom/);
  assert.match(source,/LIVE_METRO_LAYER,type:'symbol',source:LIVE_SOURCE,minzoom:metroMinZoom/);
  assert.match(source,/LIVE_BUS_LAYER,type:'circle',source:LIVE_SOURCE,minzoom:minimumZoom/);
});

test('train layer geometry stays available while symbols are suppressed below threshold',()=>{
  const source=read('src/features/liveTransit/index.js');
  assert.match(source,/Keep source data current even below the symbol minzoom/);
  assert.match(source,/const belowVisibleZoom=/);
  assert.match(source,/trainBeamImageId/);
});
