import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NIGHT_VISUAL_PALETTE, distanceLitLineFeatures} from '../src/night-visibility-map.js';
const read=p=>readFileSync(new URL(`../${p}`, import.meta.url),'utf8');

test('three road colors are consistent across map palette, UI legend, and line widgets',()=>{
  const p=NIGHT_VISUAL_PALETTE;
  const html=read('index.html');
  const css=read('src/night-visibility-panel.css');
  const js=read('src/night-visibility-map.js');
  const palette=[p.clear,p.alleyUnlit,p.pathUnlit];
  assert.equal(new Set([...palette,p.uncertain]).size,4);
  for(const label of ['조명 도달 추정','골목·차도 조명 미도달 추정','보행로 조명 미도달 추정']){
    assert.ok(html.includes(label),label);
    assert.ok(js.includes(label),label);
  }
  for(const color of palette)assert.ok(css.toLowerCase().includes(color.toLowerCase()),color);
  assert.match(js,/\['match',\['get','kind'\],'path',nv\.pathUnlit,nv\.alleyUnlit\]/);
  assert.doesNotMatch(js,/line-dasharray/);
  assert.match(js,/dj-night-lit-line/);
  assert.match(html,/조명 미도달 추정/);
  assert.doesNotMatch(html,/골목·차도 암부|보행로 암부/);
});

test('distance mode draws only observed radius-reaching road segments, not gaps or unknown areas',()=>{
  const samples=[
    {x:0,y:0,lon:126.95,lat:37.5,inScope:true,d:5},
    {x:5,y:0,lon:126.95005,lat:37.5,inScope:true,d:8},
    {x:10,y:0,lon:126.95010,lat:37.5,inScope:true,d:8},
    {x:15,y:0,lon:126.95015,lat:37.5,inScope:true,d:25},
    {x:20,y:0,lon:126.95020,lat:37.5,inScope:true,d:25},
    {x:25,y:0,lon:126.95025,lat:37.5,inScope:false,d:6},
  ];
  const data=distanceLitLineFeatures([{id:1,tags:{highway:'residential',name:'골목'},samples}],20);
  assert.equal(data.features.length,1);
  assert.equal(data.features[0].properties.kind,'alley');
  assert.equal(data.features[0].properties.length,10);
  assert.equal(data.features[0].geometry.coordinates.length,3);
  assert.equal(distanceLitLineFeatures([{id:1,tags:{highway:'residential'},samples}],4).features.length,0);
  const pathData=distanceLitLineFeatures([{id:2,tags:{highway:'footway'},samples}],20);
  assert.equal(pathData.features[0].properties.kind,'path');
});
