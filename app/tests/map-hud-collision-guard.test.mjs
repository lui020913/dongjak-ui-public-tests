import test from 'node:test';
import assert from 'node:assert/strict';
import {overlapsRect,hudPriority} from '../src/map-hud-collision-guard.js';
const r=(left,top,right,bottom)=>({left,top,right,bottom});
test('detect partial and full intersections, ignore touching and subpixel artifacts',()=>{
 assert.equal(overlapsRect(r(0,0,20,20),r(12,12,30,30)),true);
 assert.equal(overlapsRect(r(0,0,20,20),r(4,4,8,8)),true);
 assert.equal(overlapsRect(r(0,0,20,20),r(20,0,40,20)),false);
 assert.equal(overlapsRect(r(0,0,20,20),r(19.5,0,40,20)),false);
 assert.equal(overlapsRect(r(0,0,20,20),null),false);
});
test('map actions take priority over layer dismiss chips, scale and tip',()=>{
 const mock=match=>({matches:s=>s.includes(match)});
 assert.equal(hudPriority(mock('.map-actions > button')),0);
 assert.equal(hudPriority(mock('#djNext-active-layers .djNext-active-layer-off')),1);
 assert.equal(hudPriority(mock('#map .maplibregl-ctrl-scale')),2);
 assert.equal(hudPriority(mock('#never')),3);
});
