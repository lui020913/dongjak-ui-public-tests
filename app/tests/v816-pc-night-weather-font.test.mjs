import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('v816: Apple SD Gothic Neo is preferred via system/local font without bundling TTF',()=>{
  const css=read('src/v816-panel-weather-font.css');
  assert.match(css,/font-family:'Apple SD Gothic Neo'/);
  assert.match(css,/AppleSDGothicNeo/);
  assert.match(read('index.html'),/v816-panel-weather-font\.css/);
  assert.doesNotMatch(css,/@font-face|\.ttf\b|\.woff2?\b/);
  assert.equal(existsSync(new URL('../public/fonts/AppleSDGothicNeoR.ttf',import.meta.url)),false);
});
test('v816: real weather controls are set hidden/shown, not only old app class',()=>{
  const src=read('src/v7120-settings.js');
  assert.match(src,/\['weather-widget','dj-mobile-weather-trigger','dj-v794-weather'\]/);
  assert.match(src,/style\.setProperty\('display','none','important'\)/);
  assert.match(src,/style\.removeProperty\('display'\)/);
  assert.match(read('src/v816-panel-weather-font.css'),/\.dj-hide-weather/);
});
test('v816: desktop drawer entrance is opacity-only and panel position is fixed',()=>{
  const src=read('src/v806-unified-ui.js');
  assert.match(src,/if\(!phone\(\)\)return opening\?\[\{opacity:0\},\{opacity:1\}\]/);
  const css=read('src/v816-panel-weather-font.css');
  assert.match(css,/#admin-dong-picker:not\(\[hidden\]\)/);
  assert.match(css,/#road-width-legend:not\(\[hidden\]\)/);
  assert.match(css,/transform:none!important/);
});
test('v816: night vision does not trigger a blocking splash from dark theme',()=>{
  const src=read('src/v711-experience.js');
  assert.match(src,/target\.id!=='theme-toggle'/);
  assert.match(src,/if\(target\.id!=='theme-toggle'\)return/);
  assert.match(src,/start\('theme'\)/);
});
test('v816: facility center is biased above midpoint and mobile pin above label',()=>{
  const src=read('src/place-details.js');
  assert.match(src,/Math\.min\(116,Math\.max\(40,h\*\.10\)\)/);
  assert.match(src,/mobilePin\?-15:-4/);
});
test('v816: dark community boxes and metro neighbors have legible theme contrast/size',()=>{
  const css=read('src/v816-panel-weather-font.css');
  assert.match(css,/community-report-secondary \.report-feature/);
  assert.match(css,/\.community-report-secondary \.local-only/);
  assert.match(css,/\.metro-rail-previous/);
});
