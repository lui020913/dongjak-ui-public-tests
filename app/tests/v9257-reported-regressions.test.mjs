import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fixedRailCollection} from '../src/fixed-rail-lines.js';
import {METRO_OVERVIEW_LAYERS} from '../src/metro-overview-visibility.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('one railway corridor: duplicate overview never returns during zoom or style update',()=>{
  assert.equal(METRO_OVERVIEW_LAYERS.includes('transport-real-rail-overview'),false);
  assert.equal(METRO_OVERVIEW_LAYERS.includes('transport-real-rail-overview-casing'),false);
  const metro=read('src/features/liveTransit/integrate.js');
  assert.match(metro,/hideDuplicateRail/);
  assert.match(metro,/style\.load/);
  assert.match(metro,/transport-real-rail-overview/);
});

test('realtime trains have consistent accessible neighborhood zoom',()=>{
  const metro=read('src/features/liveTransit/integrate.js');
  assert.match(metro,/LIVE_METRO_MIN_ZOOM=14\.15/);
  assert.match(metro,/metroMinZoom:LIVE_METRO_MIN_ZOOM/);
  assert.doesNotMatch(metro,/map\.getZoom\?\.\(\)<16\.4/);
  assert.match(metro,/METRO_QUOTA_NOTICE/);
});

test('line 7 schematic extension fades rather than drawing an indefinitely solid line',()=>{
  const features=fixedRailCollection().features.filter(f=>f.properties.line==='7호선');
  assert.ok(features.length>4);
  assert.ok(features.some(f=>f.properties.opacity>0.9));
  assert.ok(features.some(f=>f.properties.opacity>0.1&&f.properties.opacity<0.8));
});

test('AI opens only from intentional entry and no delayed fallback',()=>{
  const ai=read('src/v880-supabase-safety-ai.js');
  const orb=read('src/v890-mobile-ai-orb.js');
  assert.match(ai,/validEntry\(event,quickEntry\)/);
  assert.match(ai,/aiPointerDown\.get\(entry\)/);
  assert.match(ai,/closedExternal/);
  assert.doesNotMatch(orb,/requestAnimationFrame\?\.\(\(\)=>\{\s*if\(!modal\?\.open/);
});

test('onboarding crossfade retains rendered artwork mat; phone search uses live keyboard height',()=>{
  const onboarding=read('src/v860-onboarding.js');
  const css=read('src/v9257-mobile-regressions.css');
  const html=read('index.html');
  assert.match(onboarding,/const panes=\[visual,copy\]/);
  assert.match(css,/dj860-swapping \.dj860-visual-pane/);
  assert.match(css,/--dj884-search-room/);
  assert.match(css,/community-category-tabs/);
  assert.match(css,/djNext-layer-scroll/);
  assert.match(html,/v9257-mobile-regressions\.css/);
});

test('native iOS PWA status bar color transitions with sheet dimmer and map seam',()=>{
  const js=read('src/mobile-pwa-status-tone-v793.js');
  const css=read('src/mobile-pwa-status-tone-v793.css');
  assert.match(js,/dimmed\?\(theme==='dark'/);
  assert.match(css,/var\(--dj-pwa-status-color,var\(--dj-pwa-native-edge\)\)/);
});

test('layer shortcut counter describes the 3 configurable toolbar slots',()=>{
  const script=read('../frontend/production/mobile-next.js');
  assert.match(script,/상단 바로가기 '\+selected\.length\+'\/3/);
  assert.doesNotMatch(script,/count\.textContent='등록 '/);
});
