import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MAP_TEXT_SCALE,scaleMapLabelSize} from '../src/map-label-text-scale.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('MapLibre labels respect user font size without invalid zoom expression nesting',()=>{
 assert.deepEqual(Object.keys(MAP_TEXT_SCALE),['small','normal','large']);
 assert.equal(scaleMapLabelSize(16,'normal'),16);
 assert.equal(scaleMapLabelSize(16,'small'),14.08);
 assert.equal(scaleMapLabelSize(16,'large'),18.56);
 const original=['interpolate',['linear'],['zoom'],10,12,17,18];
 assert.deepEqual(scaleMapLabelSize(original,'large'),
  ['interpolate',['linear'],['zoom'],10,13.92,17,20.88]);
 assert.deepEqual(scaleMapLabelSize(original,'normal'),original);
 const steps=['step',['zoom'],10,13,13,17,17];
 assert.deepEqual(scaleMapLabelSize(steps,'large'),['step',['zoom'],11.6,13,15.08,17,19.72]);
 assert.deepEqual(scaleMapLabelSize(['match',['get','class'],'a',12,14],'large'),
  ['match',['get','class'],'a',12,14],'unknown style expressions must not be corrupted');
});
test('retired map preferences do not change place labels when My Info font size changes',()=>{
 const theme=read('src/ui-environment.js'),settings=read('src/v7120-settings.js');
 assert.doesNotMatch(settings,/dongjak:map-text-scale-change/);
 const owner=read('src/safety-workbench-v7103.js');
 assert.match(owner,/djSettingsText/);
 assert.match(owner,/dongjak:map-text-scale-change/);
 assert.match(theme,/map\.setLayoutProperty\(id,'text-size',textSize\)/);
 assert.match(theme,/semanticSymbolPattern\.test\(layer\.id\)/);
 assert.match(theme,/window\.addEventListener\?\.\('dongjak:map-text-scale-change'/);
});
