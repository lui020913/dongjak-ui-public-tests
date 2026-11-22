import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  hasVectorBaseSource,baseMapRecoveryDecision,
  BASE_STYLE_INITIAL_WAIT_MS,VECTOR_STYLE_GRACE_MS
} from '../src/map-basemap-recovery.mjs';

const read=file=>readFileSync(new URL('../src/'+file,import.meta.url),'utf8');

test('slow 5G load must not replace original OpenFreeMap vector source with OSM raster',()=>{
  const bright={sources:{
    openmaptiles:{type:'vector',url:'https://tiles.openfreemap.org/planet'},
    terrain:{type:'raster-dem',tiles:['https://example.invalid/dem/{z}/{x}/{y}.png']}
  }};
  assert.equal(hasVectorBaseSource(bright),true);
  assert.equal(hasVectorBaseSource({sources:{raster:{type:'raster'}}}),false);
  assert.equal(hasVectorBaseSource(null),false);
  assert.equal(baseMapRecoveryDecision({style:bright,elapsedMs:12000}),'wait');
  assert.equal(baseMapRecoveryDecision({style:bright,elapsedMs:BASE_STYLE_INITIAL_WAIT_MS}),'wait-vector');
  assert.equal(baseMapRecoveryDecision({style:bright,elapsedMs:VECTOR_STYLE_GRACE_MS-1}),'wait-vector');
  assert.equal(baseMapRecoveryDecision({style:bright,elapsedMs:VECTOR_STYLE_GRACE_MS}),'fallback');
  assert.equal(baseMapRecoveryDecision({style:null,elapsedMs:BASE_STYLE_INITIAL_WAIT_MS}),'fallback');
  assert.equal(baseMapRecoveryDecision({style:bright,elapsedMs:VECTOR_STYLE_GRACE_MS,mapReady:true}),'keep');
  assert.equal(baseMapRecoveryDecision({style:bright,elapsedMs:VECTOR_STYLE_GRACE_MS,alreadyRecovered:true}),'keep');
  const app=read('main.js');
  assert.ok(app.includes('setTimeout(checkBaseMapRecovery,BASE_STYLE_INITIAL_WAIT_MS)'));
  assert.ok(app.includes('elapsedMs:Date.now()-mapRecoveryStartedAt'));
  assert.ok(!app.includes('},12000);\nconst quickSearch='));
  assert.ok(app.includes("app.dataset.djBasemapSource='vector-loading'"));
});

test('language selection is one native-accessible compact row, not separate card',()=>{
  const js=read('v854-language.js');
  const css=read('mobile-primary-fullscreen.css');
  assert.ok(js.includes("section.className='dj854-language-section dj834-language-row'"));
  assert.ok(js.includes("value.className='dj854-language-value'"));
  assert.ok(js.includes("section.append(icon,label,value,chevron,select)"));
  assert.ok(js.includes("group.insertBefore(section,history||null)"));
  assert.ok(!js.includes('body.prepend(section)'));
  assert.ok(css.includes('.dj834-settings-group > .dj854-language-row:not([hidden])'));
  assert.ok(css.includes('height:62px!important'));
  assert.ok(css.includes('.dj834-language-row > select'));
  assert.ok(css.includes('position:static!important'));
  assert.ok(css.includes('opacity:1!important'));
  assert.ok(css.includes('width:110px!important'));
  assert.ok(css.includes('pointer-events:auto!important'));
  assert.ok(!css.includes('inset:0!important;\n      display:block!important;\n      width:100%!important;'),'full-row invisible picker must never block adjacent settings');
});
