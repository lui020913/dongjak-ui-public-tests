import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {featuredPlaceStyle} from '../src/featured-place-labels.js';
import {weeklyWeatherUrl} from '../src/v854-weather-desktop.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('one map/walking settings screen replaces duplicate layer toggles and fills phone',()=>{
  const settings=read('src/v877-mobile-settings.js');
  const css=read('src/mobile-ui/current.css');
  assert.match(settings,/도보 설정/);
  assert.doesNotMatch(settings,/지도 디자인 설정|data-dj877-layer=/);
  assert.match(css,/#app #dj-map-settings \{position:fixed!important;inset:0!important/);
  assert.match(css,/#app #dj-map-settings \.dj-map-settings-card \{display:flex!important;flex-direction:column!important;width:100%!important;height:100%!important/);
});

test('all map names share white-on-dark-halo in light, without overriding semantic icons',()=>{
  const light=featuredPlaceStyle('light');
  assert.equal(light.text,'#ffffff');
  assert.equal(light.halo,'#172c28');
  const theme=read('src/ui-environment.js');
  assert.match(theme,/mapLabelLightPaint=Object\.freeze\(\{color:'#ffffff',halo:'rgba\(18,42,36,0\.97\)'/);
  assert.match(theme,/semanticSymbolPattern/);
  assert.match(theme,/mapLabelLightPaint\.color/);
});

test('popup dim/blur is removed, but existing top-toolbar blur is preserved',()=>{
  const theme=read('src/theme-contract.css');
  const night=read('src/v833-toolbar-personalization.css');
  const header=read('src/v831-swipe-feature-toolbar.css');
  assert.match(theme,/Unified undimmed-window and weather-card policy/);
  assert.match(theme,/box-shadow:0 8px 22px rgba/);
  assert.doesNotMatch(night,/background:rgba\(10,37,29,\.38\);backdrop-filter:blur\(2px\)/);
  assert.match(header,/backdrop-filter:blur\(5px\)/);
});

test('weather forecast is inset and cannot be dragged to an expanded view',()=>{
  const weather=read('src/v854-weather-desktop.js');
  const theme=read('src/theme-contract.css');
  assert.match(weather,/dataset\.djFixedSize='true'/);
  assert.doesNotMatch(weather,/<span class="dj-weather-edge-drag"/);
  assert.match(theme,/\.dj9274-weather-week ul/);
  assert.match(theme,/padding:4px 12px 12px!important/);
});

test('light theme resets formerly dark-only UI variables',()=>{
  const css=read('src/theme-contract.css');
  const light=css.split('html body #app#app#app#app#app#app#app[data-theme="light"]')[1].split('html body #app#app#app#app#app#app#app[data-theme="dark"]')[0];
  for(const token of ['--djNext-surface:#ffffff','--djNext-raised:#e9f2ed','--dj800-accent:#35676c','--mf-surface:#ffffff']) {
    assert.ok(light.includes(token),token);
  }
});

test('safety sheet uses measured navigation clearance and language row lives inside settings',()=>{
  const css=read('src/mobile-ui/current.css');
  const language=read('src/v854-language.js');
  const langCss=read('src/v854-integrated-ui.css');
  assert.match(css,/#overview-sheet,#dj832-data-sheet/);
  assert.match(css,/bottom:var\(--dj910-dock-bottom/);
  assert.match(language,/dj854-language-icon/);
  assert.match(language,/querySelector\('\.dj834-my-home \.dj834-settings-group'\)/);
  assert.match(langCss,/grid-template-columns:33px minmax\(0,1fr\) minmax\(0,118px\)/);
});

test('current location weather updates both current conditions and all seven forecast days without stale caching',()=>{
 const env=read('src/ui-environment.js');
 const weather=read('src/v854-weather-desktop.js');
 const url=new URL(weeklyWeatherUrl(37.501,127.023));
 assert.equal(url.searchParams.get('latitude'),'37.501');
 assert.equal(url.searchParams.get('longitude'),'127.023');
 assert.equal(url.searchParams.get('forecast_days'),'7');
 assert.ok(env.includes("new CustomEvent('dongjak:weather-place-change'"));
 assert.ok(weather.includes("addEventListener?.('dongjak:weather-place-change',onWeatherPlaceChange)"));
 assert.ok(weather.includes("removeEventListener?.('dongjak:weather-place-change',onWeatherPlaceChange)"));
 assert.ok(weather.includes("weekController?.abort();weekCache=null;weekCacheKey='';weekUpdated=0"));
 assert.ok(weather.includes("weeklyWeatherUrl(requestedPlace.latitude,requestedPlace.longitude)"));
 assert.ok(weather.includes("requestedKey!==keyForPlace(weekPlace)"));
 assert.ok(weather.includes("weekCacheKey===requestedKey"));
 assert.ok(weather.includes("requestedPlace.name+' 기준 · Open-Meteo'"));
});

test('iOS native status bridge never dims behind open sheets or night consent',()=>{
 const status=read('src/mobile-pwa-status-tone-v793.js');
 const css=read('src/mobile-pwa-status-tone-v793.css');
 assert.ok(status.includes("root.dataset.djPwaDimmed='false'"));
 assert.ok(!status.includes("const dimmed=!!doc.getElementById"));
 assert.ok(!status.includes("nightPrompt?(theme"));
 assert.ok(!status.includes("#aab8af"));
 assert.ok(css.includes('data-dj-pwa-dimmed="true"'));
 assert.ok(read('src/v831-swipe-feature-toolbar.css').includes('backdrop-filter:blur(5px)'));
});
