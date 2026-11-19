import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const toolbar=read('src/v831-swipe-feature-toolbar.js');
const route=read('src/main.js');
const css=read('src/v833-toolbar-personalization.css');
const markers=read('src/dongjak-verified-data-layers.js');
test('important shortcuts persist separately from 43 feature definitions',()=>{
  assert.match(toolbar,/SHORTCUTS_KEY='dongjak_mobile_shortcut_preferences_v8214'/);
  assert.match(toolbar,/DEFAULT_PRIMARY=\[/);
  assert.match(toolbar,/primary=loadPrimary\(win\)/);
  assert.match(toolbar,/rebuildFeatureLocations\(\)/);
  assert.match(toolbar,/const input=doc.createElement\('input'\)/);
  assert.match(toolbar,/input.type='checkbox'/);
  assert.doesNotMatch(toolbar,/pin.textContent='밖으로'/);
  assert.match(toolbar,/savePrimary\(\)/);
});
test('live vehicles and optional font are initially in More',()=>{
  const defaults=toolbar.match(/const DEFAULT_PRIMARY=\[([\s\S]*?)\];/)?.[1]||'';
  assert.doesNotMatch(defaults,/live-bus|live-metro/);
  assert.match(toolbar,/typography\.classList\.add\('dj833-more-type'\)/);
  assert.match(toolbar,/extra\.appendChild\(typography\)/);
});
test('expanded button width follows measured label size instead of common minimum',()=>{
  assert.match(toolbar,/ctx\.measureText\(label\)\.width/);
  assert.match(css,/width:var\(--dj833-expanded-width,134px\)!important/);
  assert.match(css,/border:0!important;border-radius:0!important;box-shadow:none!important/);
});
test('base layers toggle immediately without explanation sheet and active icon can turn off',()=>{
  assert.match(toolbar,/const quickToggle=feature\[0\]\.startsWith\('base-'\)/);
  assert.match(toolbar,/if\(!quickToggle&&feature\[0\]!=='map-dong'\)openSheet\(feature,button,valid\)/);
  assert.match(toolbar,/alreadyOn&&button&&!button\.classList\.contains\('dj832-expanded'\)/);
});
test('weather sheet and night-mode consent have explicit close and decline controls',()=>{
  assert.match(toolbar,/function buildWeather\(\)/);
  assert.match(toolbar,/dj833-weather-close/);
  assert.match(toolbar,/function requestNight\(e\)/);
  assert.match(toolbar,/e\.stopImmediatePropagation\(\)/);
  assert.match(toolbar,/data-choice="no"/);
  assert.match(toolbar,/data-choice="yes"/);
  assert.match(toolbar,/nightConfirm\.hidden=false/);
});
test('cluster count is positioned via a matching translate vector with the badge',()=>{
  assert.match(markers,/'circle-translate':\[13,-13\]/);
  assert.match(markers,/'text-translate':\[13,-13\]/);
  assert.match(markers,/'text-offset':\[0,0\]/);
});
test('Dongjak endpoint guard rejects boundary unknown or outside, accepts inside',()=>{
  const match=route.match(/function requireDongjakRouteLocation\(position\)\s*\{[\s\S]*?\n\}/);
  assert.ok(match,'central route guard exists');
  for(const inside of [true,false,null]){
    const messages=[];
    const context=createContext({isDongjak:()=>inside,toast:(msg)=>messages.push(msg)});
    runInContext(match[0],context);
    const accepted=runInContext('requireDongjakRouteLocation({lng:126.94,lat:37.49})',context);
    assert.equal(accepted,inside===true);
    assert.equal(messages.length,inside===true?0:1);
  }
});
test('all external route input and compute paths call Dongjak guard',()=>{
  assert.match(route,/function setRouteLocation\(which,position\) \{\s*if\(!requireDongjakRouteLocation\(position\)\)return false/);
  assert.match(route,/function showTransitRouteConfirmation\(place\) \{\s*if\(!requireDongjakRouteLocation\(place\)\)return/);
  assert.match(route,/function chooseSearchResult\(place\)\{[\s\S]*?if\(!requireDongjakRouteLocation\(place\)\)return/);
  assert.match(route,/routeWaypoints\.push\(/);
  assert.match(route,/!next\.every\(requireDongjakRouteLocation\)/);
  assert.match(route,/\[routeStart,\.\.\.routeWaypoints,routeEnd\]\.every\(requireDongjakRouteLocation\)/);
});
