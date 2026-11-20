import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {blendHexColor,parseCssColor} from '../src/ios-pwa-overlay-chrome.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('detent movement and clipping use the same timing and natural compact geometry',()=>{
 const s=read('src/v889-mobile-sheet-motion.js');
 assert.match(s,/translate \$\{DURATION\}ms \$\{EASING\}, clip-path \$\{DURATION\}ms \$\{EASING\}/);
 assert.match(s,/compactRect=panel.getBoundingClientRect\(\);\s*panel.classList.add\(EXPANDED\)/);
 assert.match(s,/expandedRect.bottom\+startDelta.y-dockBottom/);
});

test('status surface blends the real overlay scrim instead of staying at the light theme color',()=>{
 const js=read('src/ios-pwa-overlay-chrome.js');
 const css=read('src/ios-pwa-overlay-chrome.css');
 const html=read('index.html');
 assert.match(js,/findActiveScrim/);
 assert.match(js,/blendHexColor\(baseColor,scrimColor\)/);
 assert.match(js,/themeMeta\.setAttribute\('content',statusColor\)/);
 assert.match(css,/--dj-ios-pwa-status-color/);
 assert.match(css,/#dj-mobile-safe-top/);
 assert.match(css,/data-dj-ios-overlay-open="true"/);
 assert.match(html,/ios-pwa-overlay-chrome\.css/);
 assert.match(html,/ios-pwa-overlay-chrome\.js/);
 assert.doesNotMatch(html,/mobile-pwa-status-tone-v793/);
});

test('40 percent black scrim produces the matching dimmed status surface',()=>{
 const scrim=parseCssColor('rgba(0, 0, 0, 0.4)');
 assert.deepEqual(scrim,{r:0,g:0,b:0,a:0.4});
 assert.equal(blendHexColor('#eef3ef',scrim),'#8f928f');
});

test('8-digit hex scrims retain their alpha channel',()=>{
 assert.deepEqual(parseCssColor('#091918b7'),{
  r:9,g:25,b:24,a:183/255
 });
});

test('legacy v7.9.3 status-tone files are removed',()=>{
 assert.equal(existsSync(new URL('../src/mobile-pwa-status-tone-v793.css',import.meta.url)),false);
 assert.equal(existsSync(new URL('../src/mobile-pwa-status-tone-v793.js',import.meta.url)),false);
 assert.doesNotMatch(read('src/ios-pwa-overlay-chrome.css'),/backdrop-filter:\s*blur/i);
});
