import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const source=file=>readFileSync(new URL(file,root),'utf8');
const oldCss=source('src/v8215-news-metro-compact-header.css');
const css=source('src/v8215-news-transit-sticky-redesign.css');
const js=source('src/v8215-news-metro-compact-header.js');
const html=source('index.html');
test('the NEWS transport controller and last-in-order stylesheet load',()=>{
  assert.match(html,/v8215-news-metro-compact-header\.js/);
  assert.ok(html.indexOf('v8215-news-transit-sticky-redesign.css')>html.indexOf('v8215-news-metro-compact-header.css'));
});
test('line 9 matches map route color without numeral shadow',()=>{
  assert.match(source('src/transport-map.js'),/'9호선':'#b89b2f'/);
  assert.match(oldCss,/background:#b89b2f!important/);
  assert.match(css,/text-shadow:none!important/);
  assert.match(css,/dj-news-metro-single-line/);
});
test('metro and bus use original start/end, bookmark and tabs handlers',()=>{
  assert.match(js,/actionRow\.append\(start,end\)/);
  assert.match(js,/actionRow\.append\(bookmark\)/);
  assert.match(js,/heading\.insertBefore\(tabs,updatedActions\|\|null\)/);
  assert.match(js,/aria-label',full/);
  assert.doesNotMatch(js,/addEventListener\('click'/);
});
test('subway and bus share a fixed identity header and tabs row',()=>{
  assert.match(css,/position:sticky!important/);
  assert.match(css,/top:calc\(var\(--dj-news-sticky-top\) \+ var\(--dj-news-head-h\)\)!important/);
  assert.match(css,/top:calc\(var\(--dj-news-sticky-top\) \+ var\(--dj-news-head-h\) \+ var\(--dj-news-neighbors-h\)\)!important/);
  assert.match(css,/dj-news-transit-fixed\[data-kind="bus"\]/);
  assert.match(css,/\.dj-news-arrivals-caption/);
});
test('both direction cards have a compact horizontal ETA, including <=375px',()=>{
  assert.match(css,/grid-template-columns:minmax\(0,1fr\) auto!important/);
  assert.match(css,/flex-direction:row!important/);
  assert.match(css,/min-height:54px!important/);
  assert.match(css,/\.metro-arrival-time-block/);
});
test('neighbor arrows are larger SVGs without rewriting route handlers',()=>{
  assert.match(js,/createElementNS\('http:\/\/www\.w3\.org\/2000\/svg','svg'\)/);
  assert.match(js,/element\.replaceChildren/);
  assert.match(css,/font-size:calc\(14px \+ var\(--dj803-text-delta,0px\)\)!important/);
});
