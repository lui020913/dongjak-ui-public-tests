import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildNightRoadVertices,relativeNightProjectionMatrix,NIGHT_GL_LAYER_ID} from '../src/night-map-roads-gl.js';
import {VERSION_HISTORY,DEVELOPMENT_PHASES} from '../src/version-history.js';
import {LEGACY_VERSION_HISTORY} from '../src/version-history-legacy.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const palette={clear:'#79DEC1',alleyUnlit:'#F0A383',pathUnlit:'#BCA5E8',uncertain:'#B2BCC7'};
const mcoord=([lng,lat])=>[(lng+180)/360,(1-Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))/Math.PI)/2];

test('global Mercator floats are replaced by precision-stable local coordinates',()=>{
  const coordinates=[[126.950001,37.500001],[126.950004,37.500004],[126.950007,37.500007]];
  const f={type:'Feature',properties:{kind:'alley',category:'clear'},geometry:{type:'LineString',coordinates}};
  const {vertices,origin}=buildNightRoadVertices({occlusion:true,occ:[f]},palette);
  assert.equal(vertices.length,2*6*13);
  assert.ok(origin[0]>.5 && origin[1]>.3);
  assert.ok(Math.abs(vertices[0])<1e-10 && Math.abs(vertices[1])<1e-10);
  assert.ok(Math.abs(vertices[3])<1e-5 && Math.abs(vertices[4])<1e-5);
  const target=mcoord(coordinates[1]);
  assert.ok(Math.abs((vertices[3]+origin[0])-target[0])<1e-12);
  assert.ok(Math.abs((vertices[4]+origin[1])-target[1])<1e-12);
});

test('relative origin transform matches direct project at high map scales',()=>{
  const origin=mcoord([126.95,37.5]);
  const m=new Float64Array([250000,0,0,0,0,-250000,0,0,0,0,1,0,
    -origin[0]*250000+0.1,origin[1]*250000+0.2,0,1]);
  const local=new Float32Array([2.5e-7,1.2e-7,0,1]);
  const adjusted=relativeNightProjectionMatrix(m,origin);
  const clipX=adjusted[0]*local[0]+adjusted[12];
  const clipY=adjusted[5]*local[1]+adjusted[13];
  const expectedX=m[0]*(origin[0]+local[0])+m[12];
  const expectedY=m[5]*(origin[1]+local[1])+m[13];
  assert.ok(Math.abs(clipX-expectedX)<1e-6,`x: ${clipX} != ${expectedX}`);
  assert.ok(Math.abs(clipY-expectedY)<1e-6,`y: ${clipY} != ${expectedY}`);
});

test('WebGL road stroke uses rounded joins and pixel antialiasing, not butt-ended segments',()=>{
  const src=read('src/night-map-roads-gl.js');
  assert.match(src,/distanceToLine=length/);
  assert.match(src,/smoothstep\(max\(0\.0,u_half_width-1\.25\)/);
  assert.match(src,/float endSign=a_corner/);
  assert.match(src,/relativeNightProjectionMatrix\(matrix,localOrigin\)/);
  assert.match(src,/renderingMode:'3d'/);
  assert.ok(src.includes(NIGHT_GL_LAYER_ID));
  assert.doesNotMatch(src,/document\.createElement\(['"]canvas['"]\)/);
});

test('new v6.0 release retains its v1.0.0 predecessor and sixty historic records',()=>{
  const p=JSON.parse(read('package.json'));
  const lock=JSON.parse(read('package-lock.json'));
  assert.equal(p.version,APP_VERSION);
  assert.equal(lock.version,APP_VERSION);
  assert.equal(VERSION_HISTORY[0].version,'v7.0.29');
  assert.ok(VERSION_HISTORY.some(entry=>entry.version==='v1.0.0'));
  assert.equal(LEGACY_VERSION_HISTORY.length,60);
  assert.equal(LEGACY_VERSION_HISTORY.at(-1).version,'v1.0');
  assert.equal(LEGACY_VERSION_HISTORY[0].version,'v5.12.11');
  assert.equal(DEVELOPMENT_PHASES.length,7);
   assert.doesNotMatch(read('index.html'),/>업데이트<\/button>/);
  assert.ok(read('docs/RELEASE_HISTORY_LEGACY_FULL.md').includes('v5.12.10'));
});
