import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {detectPlatform} from '../platforms/shared/detect-platform.js';
import {platformHtml} from '../platforms/shared/platform-html.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('platform detection does not misclassify PC Chromium, iOS PWA, Android',()=>{
  assert.equal(detectPlatform({navigator:{userAgent:'Mozilla Windows Chrome'}}),'pc-chromium');
  assert.equal(detectPlatform({navigator:{userAgent:'Mozilla iPhone Mobile'}}),'ios-pwa');
  assert.equal(detectPlatform({navigator:{userAgent:'Mozilla Android'}}),'android');
  assert.equal(detectPlatform({},'android'),'android');
});
test('PC built HTML does not load mobile-only CSS or scripts',()=>{
  const html=platformHtml(read('index.html'),'pc-chromium');
  assert.doesNotMatch(html,/href="\/src\/mobile-chrome-v790.css"/);
  assert.doesNotMatch(html,/src="\/src\/mobile-toolbar-v794.js"/);
  assert.doesNotMatch(html,/mobile-pwa-status-tone-v793/);
  assert.match(html,/src="\/src\/main.js"/);
  assert.match(html,/src="\/platforms\/entry.js"/);
});
test('Android built HTML removes iOS-specific status extension but retains mobile toolbar',()=>{
  const html=platformHtml(read('index.html'),'android');
  assert.doesNotMatch(html,/src="\/src\/mobile-pwa-status-tone-v793.js"/);
  assert.doesNotMatch(html,/href="\/src\/mobile-pwa-status-tone-v793.css"/);
  assert.match(html,/src="\/src\/mobile-toolbar-v794.js"/);
});
test('iOS PWA and universal include PWA status code',()=>{
  for(const target of ['ios-pwa','universal']){
    const html=platformHtml(read('index.html'),target);
    assert.match(html,/src="\/src\/mobile-pwa-status-tone-v793.js"/);
  }
});
test('platform output directories and Capacitor webDir are independent',()=>{
  const cap=JSON.parse(read('capacitor.config.json'));
  const pkg=JSON.parse(read('package.json'));
  assert.equal(cap.webDir,'build/android');
  for(const name of ['build:pc','build:ios','build:android','android:sync'])assert.ok(pkg.scripts[name]);
  assert.match(read('vite.config.js'),/build\/pc-chromium/);
  assert.match(read('vite.config.js'),/build\/ios-pwa/);
  assert.match(read('vite.config.js'),/build\/android/);
});
