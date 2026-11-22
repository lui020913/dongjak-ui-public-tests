import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditSurfaceBounds,chooseDesignFrames} from '../scripts/live-qa-design.mjs';
const f=(t,x=-171,opacity=1,motion='')=>({t,viewport:[390,844],nodes:[{selector:'#route-map-card',x,w:366,opacity,motion}]});
test('detects repeated stable route card clipping from measured viewport geometry',()=>{const a=auditSurfaceBounds([f(0),f(500),f(1200),f(1800)]);assert.equal(a.length,1);assert.equal(a[0].px,171);assert.equal(a[0].count,4);assert.equal(a[0].viewportWidth,390);});
test('does not mistake transient, moving, transparent, or in-bounds panels for persistent clipping',()=>{for(const frames of [[f(0),f(16),f(32)],[f(0,-100),f(200,-70),f(400,-20)],[f(0,-171,.5),f(400,-171,.5),f(800,-171,.5)],[f(0,-171,1,'opening'),f(400,-171,1,'opening'),f(800,-171,1,'opening')],[f(0,12),f(500,12),f(900,12)]])assert.equal(auditSurfaceBounds(frames).length,0);});
test('review samples are selected on passing scenes without layout flags',()=>{const times=Array.from({length:30},(_,i)=>({t:i*100}));const indices=chooseDesignFrames(times,[{index:1,t:0,status:'running'},{index:1,t:1000,status:'passed'},{index:2,t:1000,status:'running'},{index:2,t:2900,status:'passed'}],[]);assert(indices.includes(5));assert(indices.includes(19));assert(indices.length<=12);});

test('released screenshot evidence waits for an actually painted and unobstructed surface',()=>{
 const source=readFileSync(new URL('./live-qa-journeys.spec.mjs',import.meta.url),'utf8');
 assert.ok(source.includes("'날씨 창':'#dj854-weather-sheet'"));
 assert.ok(source.includes("'레이어 설정':'#djNext-layer-panel .djNext-modal-body'"));
 assert.ok(source.includes('document.elementFromPoint(x,y)'));
 assert.ok(source.includes("Number(style.opacity)<.985||p.dataset.dj810Animating"));
 assert.ok(source.includes('await page.waitForTimeout(220)'));
 assert.ok(source.includes("animations:'disabled'"));
 assert.ok(source.includes('if(!surface)throw Error'));
 assert.ok(source.includes('surface})'));
});
