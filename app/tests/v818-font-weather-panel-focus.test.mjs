import {historicalSnapshotTest} from './support/historical-snapshot-audit.mjs';
import {stripApprovedV825TransportUI} from './support/approved-v825-transport-ui.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {desktopPanelPosition,readableTypeValue,TYPE_SIZE_FACTORS} from '../src/v818-ux-settings.js';
import {stripApprovedV818CameraFocus} from './support/approved-v818-transport-focus.mjs';
import {APPROVED_V809_BUS_ICON_SHA256} from './support/approved-walk-integration.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('v818: PC road legend is anchored to navigation rail before click changes hidden state',()=>{
  const pos=desktopPanelPosition({right:224.4,top:75.8},1280);
  assert.deepEqual(pos,{left:238,top:76,maxWidth:1024});
  const js=read('src/v818-ux-settings.js');
  assert.match(js,/doc\.addEventListener\('click',beforeToggle,true\)/);
  assert.match(js,/Math\.round\(navRect\.right\)\+14/);
  assert.match(js,/--dj800-panel-left/);
  assert.match(read('src/v818-ux-settings.css'),/animation:none!important/);
});

test('v818: weather fade keeps the widget visible until animation completion',()=>{
  const js=read('src/v7120-settings.js');
  assert.match(js,/const setWeather=\(\{show,animated=false\}/);
  assert.match(js,/\{duration:240,easing:'ease-in-out',fill:'both'\}/);
  assert.match(js,/Promise\.all\(running\)\.then/);
  assert.match(js,/if\(token!==weatherVersion\)return/);
  assert.match(js,/setWeather\(\{show:prefs\.weather!==false,animated:animateWeather\}\)/);
  assert.match(js,/apply\(\{animateWeather:true\}\)/);
});

test('v818: per-device readability preserves each text component size hierarchy',()=>{
  assert.deepEqual(Object.keys(TYPE_SIZE_FACTORS),['small','normal','large','xlarge']);
  assert.deepEqual(readableTypeValue('normal','normal',15,500),{px:15,weight:500});
  const large=readableTypeValue('large','bold',15,500);
  assert.ok(large.px>15&&large.px<17);
  assert.equal(large.weight,700);
  const small=readableTypeValue('small','normal',15,500);
  assert.ok(small.px<15);
  const js=read('src/v818-ux-settings.js');
  assert.match(js,/dataset\.djTypeScale/);
  assert.match(js,/dataset\.djTypeWeight/);
  assert.match(js,/closest\?\.\('\.maplibregl-control-container/);
});

historicalSnapshotTest('v818: metro and bus card center sits above viewport center, transfer selection does not pan',()=>{
  const current=read('src/transport-map.js');
  assert.match(current,/if\(!refresh && Number\.isFinite\(place\.lng\)/);
  assert.match(current,/place\.kind==='subway' && isNearBoundary/);
  assert.match(current,/offset:\[0,offsetY\]/);
  assert.match(current,/const focusZoom=place\.kind==='bus'\?16\.5:15\.3/);
  const old=stripApprovedV818CameraFocus(stripApprovedV825TransportUI(current));
  assert.equal(createHash('sha256').update(old).digest('hex'),APPROVED_V809_BUS_ICON_SHA256,
    'no transport API/source/rendering change outside approved focus code');
});

test('v818: facility pin is closer to its map label, mobile topbar has equal gap',()=>{
  const place=read('src/place-details.js');
  assert.match(place,/mobilePin\?-15:-4/);
  const css=read('src/v818-ux-settings.css');
  assert.match(css,/column-gap:10px!important/);
  assert.match(css,/#dj-settings-mobile/);
  assert.match(css,/#map-quick-search/);
  assert.match(css,/#theme-toggle/);
});

test('v818: typography can use system/local font without bundling protected font assets',()=>{
  const css=read('src/v818-ux-settings.css');
  assert.match(css,/Apple SD Gothic Neo/);
  assert.doesNotMatch(css,/@font-face/);
  assert.match(read('index.html'),/v818-ux-settings\.js/);
  assert.match(read('index.html'),/v818-ux-settings\.css/);
});
