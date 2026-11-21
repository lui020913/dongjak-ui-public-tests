import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const generated=new URL('../src/mobile-next.css',import.meta.url);
const original=new URL('../../frontend/production/mobile-next.css',import.meta.url);
const css=readFileSync(existsSync(generated)?generated:original,'utf8');
const follows=existsSync(new URL('../src/mobile-17-followup.js',import.meta.url))
 ?read('src/mobile-17-followup.js')
 :readFileSync(new URL('../../frontend/production/mobile-17-followup.js',import.meta.url),'utf8');

test('composer hides list-only sections using stable state and keeps body independently scrollable',()=>{
 assert.match(follows,/attributeFilter:\['class','aria-pressed','data-tab','hidden'\]/);
 assert.match(follows,/editing!==composing/);
 assert.match(follows,/node\.style\.setProperty\('display','none','important'\)/);
 assert.match(follows,/community\.classList\.toggle\('dj9256-composing',editing\)/);
 const fullscreen=read('src/mobile-primary-fullscreen.css');
 assert.match(fullscreen,/\.dj9256-composing #community-form > \.djNext-form-scroll/);
 assert.match(fullscreen,/padding-bottom:calc\(110px \+ env\(safe-area-inset-bottom/);
});
test('weather info has independent header, place and data rows; 0 degrees is never negative zero',()=>{
 const weather=read('src/v854-weather-desktop.js');
 assert.match(weather,/Number\(number\)===0\?'0':number/);
 assert.match(weather,/replace\(\/-0\(\?=°\|℃\|도\)\//);
 assert.match(css,/#dj854-weather-sheet \.dj854-weather-place\{display:block!important;position:relative!important/);
 assert.match(css,/#dj854-weather-sheet \.dj854-weather-actions\{display:flex!important/);
});
test('content-first map information uses measured height without trapping details behind the dock',()=>{
 const sizing=read('src/mobile-compact-transport-sheet.js'),facility=read('src/v864-facility-detail-redesign.css');
 assert.match(sizing,/--dj9251-facility-content-height/);
 assert.match(facility,/height:var\(--dj9251-facility-content-height,auto\)!important/);
 assert.match(sizing,/Math\.floor\(v\*\.60\)/);
});
test('train marker size is capped at close zoom while opposing directions remain offset',()=>{
 const lanes=read('src/features/liveTransit/train-lanes.js');
 assert.match(lanes,/15\.5,1\.16,18,1\.40/);
 assert.match(lanes,/TRAIN_LANE_GAP=12/);
});
test('news revalidation remains explicitly distinct from stale cached content',()=>{
 const news=read('src/dongjak-news.js');
 assert.match(news,/이전 기사 표시 · 최신 소식 확인 중/);
 assert.match(news,/item\.summary\|\|item\.description\|\|item\.excerpt/);
});
