import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import vm from 'node:vm';
import {getInitialTheme} from '../src/ui-environment.js';
const read=rel=>readFileSync(new URL('../'+rel,import.meta.url),'utf8');
const html=read('index.html');
const inline=html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];

function runFirstPaint({saved=null,hour=13}={}){
  const meta={content:'#f3f7f5'};
  const doc={documentElement:{dataset:{}},getElementById(id){return id==='dj-browser-theme-color'?meta:null;}};
  const mockIntl={DateTimeFormat:class{format(){return String(hour).padStart(2,'0');}}};
  vm.runInNewContext(inline,{document:doc,localStorage:{getItem:()=>saved},Intl:mockIntl,Date,Number}, {timeout:1000});
  return {theme:doc.documentElement.dataset.theme,meta:meta.content};
}
test('first paint defaults to light regardless of hour, without relying on Vite or CSS fetch',()=>{
  assert.deepEqual(runFirstPaint({hour:13}),{theme:'light',meta:'#f3f7f5'});
  assert.deepEqual(runFirstPaint({hour:19}),{theme:'light',meta:'#f3f7f5'});
  assert.deepEqual(runFirstPaint({hour:6}),{theme:'light',meta:'#f3f7f5'});
  assert.deepEqual(runFirstPaint({hour:7}),{theme:'light',meta:'#f3f7f5'});
});
test('saved manual dark mode persists across ordinary app relaunches',()=>{
  assert.deepEqual(runFirstPaint({saved:'dark',hour:13}),{theme:'dark',meta:'#22282e'});
  assert.deepEqual(runFirstPaint({saved:'light',hour:23}),{theme:'light',meta:'#f3f7f5'});
  assert.match(read('src/ui-environment.js'),/document\.documentElement\.dataset\.theme=themeState\.value/);
});
test('logo is real transparent RGBA with no white card at loader',()=>{
  const path='public/logos/dongjak-gu.png';
  const bytes=readFileSync(new URL('../'+path,import.meta.url));
  assert.equal(bytes.toString('hex',0,8),'89504e470d0a1a0a');
  assert.equal(bytes[25],6,'PNG color type must be RGBA');
  assert.ok(statSync(new URL('../'+path,import.meta.url)).size>3000);
  assert.match(html,/class="map-startup-logo"[^>]*><img class="dj-app-artwork" src="\/icons\/dongjak-light-512\.png"/);
  assert.match(html,/\.map-startup-logo\{[^}]*background:transparent!important/);
});
test('minimal progress bar and both theme backdrops exist before application CSS',()=>{
  assert.match(html,/class="map-startup-progress"/);
  assert.match(html,/html\[data-theme="dark"\] \.map-startup-overlay/);
  assert.match(read('src/style.css'),/#app \.map-startup-logo\{[\s\S]*?background:transparent!important/);
  assert.match(html,/prefers-reduced-motion:reduce/);
  assert.match(html,/기본 지도 먼저 보기/);
});
