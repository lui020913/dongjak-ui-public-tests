import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {boundaryGeometry,clipPriDisplay,priVisualConnectors,priDisplayColor,UNKNOWN_COLOR} from '../src/pri-display-geometry.mjs';
const fc=features=>({type:'FeatureCollection',features});
const bound=fc([{geometry:{type:'Polygon',coordinates:[[[126.949,37.499],[126.952,37.499],[126.952,37.502],[126.949,37.502],[126.949,37.499]]]}}]);
const p=x=>[126.95+x/88200,37.5];
const f=(id,a,b,score)=>({type:'Feature',geometry:{type:'LineString',coordinates:[p(a),p(b)]},properties:{segmentId:id,evaluated:score!==null,score,displayScore:score??0}});
test('short consecutive gaps use same color or grade transition without changing source scores',()=>{
 const raw=fc([f('w_0',0,20,10),f('w_1',23,45,20),f('w_2',48,68,80),f('w_3',71,90,null),f('other_0',93,110,80),f('w_4',100,120,80)]);
 const before=JSON.stringify(raw),out=priVisualConnectors(raw,bound,'lighting');
 assert.equal(out.features.length,15);assert.equal(out.features[0].properties.color,'#4C948B');
 assert.ok(new Set(out.features.slice(1,13).map(x=>x.properties.color)).size>8);
 assert.equal(out.features.at(-1).properties.color,UNKNOWN_COLOR);
 assert.equal(JSON.stringify(raw),before);assert.ok(out.features.every(x=>!('score' in x.properties)));
 assert.equal(priVisualConnectors(raw,null,'lighting').features.length,0);
});
test('native speed links are clipped and a gap across a boundary hole is not connected',()=>{
 const box=(a,b,y1=-10,y2=10)=>[ [p(a)[0],37.5+y1/111195],[p(b)[0],37.5+y1/111195],[p(b)[0],37.5+y2/111195],[p(a)[0],37.5+y2/111195],[p(a)[0],37.5+y1/111195] ];
 const geo=fc([{geometry:{type:'Polygon',coordinates:[box(-5,100),box(21,22,-1,1)]}}]);
 const a=f('w_0',0,20,10),b=f('w_1',23,40,80);
 assert.equal(priVisualConnectors(fc([a,b]),geo,'lighting').features.length,0);
 const speed=f('speed-link:1',-20,120,40);speed.properties.speedSource='observed-link';
 const clipped=clipPriDisplay(fc([speed]),geo).features[0];
 assert.equal(clipped.geometry.type,'MultiLineString');assert.equal(clipped.geometry.coordinates.length,2);assert.equal(clipped.properties.score,40);
 const common=clipPriDisplay(fc([f('w_5',-20,120,70),f('outside_0',110,120,20)]),geo);
 assert.equal(common.features.length,1);assert.equal(common.features[0].geometry.type,'MultiLineString');assert.equal(common.features[0].properties.score,70);
});
test('public app keeps one thematic layer, light-only theme and clipped PRI data',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const pri=read('src/pri-map.js'),main=read('src/main.js'),html=read('index.html'),toolbar=read('src/v831-swipe-feature-toolbar.js'),theme=read('src/ui-environment.js');
 assert.match(pri,/thematic\.claimPri\(\)/);assert.match(pri,/clipPriDisplay\(display,priBoundary\)/);
 assert.match(pri,/map\.setLayoutProperty\(LINE,'visibility',mode\?'visible':'none'\)/);
 assert.match(pri,/3lx 기준/);assert.match(main,/retired:true/);assert.match(html,/id="dj-safety-night" hidden inert/);
 assert.doesNotMatch(toolbar,/\['safe-night-analysis',/);assert.match(theme,/if\(next==='dark'\)next=null/);
});
