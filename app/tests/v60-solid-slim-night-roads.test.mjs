import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildNightRoadVertices} from '../src/night-map-roads-gl.js';
import {VERSION_HISTORY} from '../src/version-history.js';
const read=rel=>readFileSync(new URL('../'+rel,import.meta.url),'utf8');

test('v6.0 preserves earlier history and uses valid internal semver',()=>{
  assert.equal(JSON.parse(read('package.json')).version,APP_VERSION);
  assert.equal(JSON.parse(read('package-lock.json')).packages[''].version,APP_VERSION);
  assert.equal(JSON.parse(read('public/version.json')).version,APP_VERSION);
  assert.ok(VERSION_HISTORY.some(entry=>entry.version==='v6.0'));
  assert.ok(VERSION_HISTORY.some(entry=>entry.version==='v1.0.0'));
  assert.match(read('index.html'),new RegExp('>v'+APP_VERSION.replaceAll('.','\\.')+'<\/button>'));
});

test('MapLibre flat view uses narrower and solid road category lines',()=>{
  const src=read('src/night-visibility-map.js');
  assert.doesNotMatch(src,/line-dasharray/);
  assert.match(src,/12\.7,2\.9,16,5\.6/);
  assert.match(src,/12\.7,2\.6,16,5\.5/);
  assert.match(read('src/night-visibility.css'),/night-line\.path\{[^}]*border-top-style:solid/);
});

test('WebGL pitch rendering has no dashed fragments, narrower core, preserved category colours',()=>{
  const src=read('src/night-map-roads-gl.js');
  assert.doesNotMatch(src,/if\(v_dash>0\.5\)/);
  assert.match(src,/const core=\(2\.9\+factor\*3\.0\)\*pxRatio/);
  const f=(kind,category)=>({type:'Feature',properties:{kind,category},geometry:{type:'LineString',coordinates:[[126.95,37.5],[126.9501,37.5]]}});
  const result=buildNightRoadVertices({occlusion:true,occ:[f('alley','outside'),f('path','blocked'),f('alley','clear'),f('path','uncertain')]},{clear:'#79DEC1',alleyUnlit:'#F0A383',pathUnlit:'#BCA5E8',uncertain:'#B2BCC7'});
  assert.equal(result.vertices.length,4*6*13);
  for(let n=0;n<4*6;n++)assert.equal(result.vertices[n*13+11],0,'dash mode must be disabled for all features');
});

test('user-facing legend does not imply dashed lines or classify roads as dangerous',()=>{
  const html=read('index.html');
  assert.doesNotMatch(html,/night-occlusion-legend|분석선은 모두 실선입니다/);
  assert.match(html,/night-result-legend/);
  assert.doesNotMatch(html,/점선: 영향 반경 밖/);
});
