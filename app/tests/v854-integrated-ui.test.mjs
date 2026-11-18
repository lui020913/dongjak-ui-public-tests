import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const css=read('src/v854-integrated-ui.css');
const search=read('src/map-quick-search.js');
const chrome=read('src/mobile-chrome-v790.js');
const language=read('src/v854-language.js');
const weather=read('src/v854-weather-desktop.js');
const tip=read('src/v854-tip-marquee.js');
const html=read('index.html');
const place=read('src/place-details.js');

test('PC search returns to the bounded legacy width and utilities have a reserved column',()=>{
  assert.match(css,/grid-template-columns:56px minmax\(0,1fr\) auto/);
  assert.match(css,/#map-quick-search\{[\s\S]*?width:min\(560px,100%\)!important;max-width:560px/);
  assert.match(css,/@media \(min-width:700px\) and \(max-width:1079px\)/);
  assert.match(css,/#map-quick-search\{[\s\S]*?position:relative!important;inset:auto!important/);
});

test('PC map action buttons move below the header and the Safety Map tab is first',()=>{
  assert.match(css,/\.map-actions\{[\s\S]*?top:calc\(var\(--dj-header-h,68px\) \+ 12px/);
  assert.match(css,/#bottom-nav>\.nav-tab\[data-tab="map"\]\{order:-1!important/);
  assert.match(css,/font-size:13px!important;font-weight:750!important;line-height:1\.15!important/);
  assert.match(css,/18px!important;height:18px!important/);
});

test('Search results split into independent transit and general-facility columns',()=>{
  assert.match(search,/dj854-search-columns/);
  assert.match(search,/대중교통 시설/);
  assert.match(search,/일반 시설/);
  assert.match(css,/\.dj854-search-column-list\{[\s\S]*?overflow-y:auto!important/);
  assert.match(css,/scrollbar-width:none!important/);
});

test('Search removes viewport-only filtering and hides quick categories while typing',()=>{
  assert.match(search,/const viewResults=items=>items/);
  assert.doesNotMatch(search,/areaCheck|현재 지도 범위에서만 찾기/);
  assert.match(search,/filters\.hidden=term\.length>0/);
  assert.match(css,/\.dj815-search-filters\[hidden\]\{display:none!important/);
});

test('More panel has a sticky title and a working close control',()=>{
  assert.match(chrome,/class="dj854-more-head"/);
  assert.match(chrome,/id="dj-mobile-utilities-close"/);
  assert.match(chrome,/addEventListener\('click',event=>\{[\s\S]*?hideMore\(\)/);
  assert.match(css,/\.dj854-more-head\{[\s\S]*?position:sticky!important/);
  assert.match(css,/#dj-v794-toolbar #dj-v794-map\{display:none!important/);
  assert.match(css,/#dj-mobile-utilities-close\{[\s\S]*?width:36px!important/);
});

test('Weather compact trigger exposes icon and temperature and opens a desktop detail sheet',()=>{
  assert.match(html,/data-dj-weather-icon="◌" data-dj-temperature="—"/);
  assert.match(css,/content:attr\(data-dj-weather-icon\) " " attr\(data-dj-temperature\)/);
  assert.match(weather,/function onLabelClick\(event\)/);
  assert.match(weather,/id='dj854-weather-sheet'/);
  assert.match(weather,/data-weather-location/);
});

test('Language selector is in My Info and persists the Korean/English choice',()=>{
  assert.match(language,/dj854-language-select/);
  assert.match(language,/localStorage\.setItem\(STORAGE_KEY,language\)/);
  assert.match(language,/dongjak:language-change/);
  assert.match(html,/v854-language\.js/);
});

test('Mobile TIP occupies the right lane and scrolls only its text when needed',()=>{
  assert.match(css,/#dj840-map-tip:not\(\[hidden\]\)\{[\s\S]*?right:12px!important/);
  assert.match(css,/dj854-tip-marquee/);
  assert.match(tip,/scrollWidth-available/);
  assert.match(tip,/dj854-tip-overflow/);
});

test('Search result merge reserves slots for transit stops before the two-column split',async()=>{
  const {mergeMapSearchResults}=await import('../src/map-quick-search.js');
  const general=Array.from({length:12},(_,i)=>({name:`시설${i}`,lng:126.9+i*.0001,lat:37.5,category:'병원'}));
  const transit=[{name:'노량진역',lng:126.94,lat:37.51,category:'지하철·철도역'},{name:'노량진역 버스정류장',lng:126.941,lat:37.511,category:'버스정류장'}];
  const merged=mergeMapSearchResults(general,transit);
  assert.ok(merged.some(item=>item.category==='버스정류장'));
  assert.ok(merged.some(item=>item.category==='지하철·철도역'));
  assert.equal(merged.length,12);
});


test('Facility and transit favorites stay icon-only while retaining accessible labels',()=>{
  assert.match(place,/className='dj854-place-favorite'/);
  assert.match(place,/setAttribute\('aria-pressed',String\(Boolean\(saved\)\)\)/);
  assert.match(css,/button\.dj854-place-favorite::before[\s\S]*?content:'☆'/);
  assert.match(css,/button\.dj854-place-favorite\[aria-pressed=\"true\"\]::before[\s\S]*?content:'★'/);
});
