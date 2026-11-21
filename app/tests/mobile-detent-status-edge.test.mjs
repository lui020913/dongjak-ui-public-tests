import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('detent movement and clipping use the same timing and natural compact geometry',()=>{
 const s=read('src/v889-mobile-sheet-motion.js');
 assert.match(s,/translate \$\{DURATION\}ms \$\{EASING\}, clip-path \$\{DURATION\}ms \$\{EASING\}/);
 assert.match(s,/compactRect=panel.getBoundingClientRect\(\);\s*panel.classList.add\(EXPANDED\)/);
 assert.match(s,/expandedRect.bottom\+startDelta.y-dockBottom/);
});
test('native iOS map edge is flat and theme-matched without blurring the search surface',()=>{
 const s=read('src/mobile-pwa-status-tone-v793.css');
 assert.match(s,/--dj-pwa-native-edge:#eef3ef/);assert.match(s,/--dj-pwa-native-edge:#192d32/);
 assert.match(s,/background:var\(--dj-pwa-native-edge\)!important/);
 assert.doesNotMatch(s,/linear-gradient\(to bottom/);
 assert.match(s,/background:#ffffff!important/);
});

test('flat status edge is noninteractive and native modal backdrops have no gradient',()=>{
 const s=read('src/mobile-pwa-status-tone-v793.css'),js=read('src/mobile-pwa-status-tone-v793.js');
 assert.ok(s.includes('body #app > #dj-ios-pwa-status-bridge'));
 assert.match(s,/--dj-pwa-bridge-gradient:none/);
 assert.ok(s.includes('display:none!important;position:fixed!important;inset:0 0 auto!important'));
 assert.ok(s.includes('pointer-events:none!important'));
 assert.ok(s.includes('z-index:2901!important'));
 assert.ok(s.includes('#dj-ai-search-modal[open]::backdrop'));
 assert.ok(s.includes('background-image:none!important'));
 assert.ok(js.includes('app.appendChild(bridge)'));
 assert.ok(js.includes('observer.observe(doc.body'));
 assert.ok(!js.includes('doc.body.appendChild(bridge)'));
});


test('iOS native status sampler is a real body-level opaque strip at least six pixels high',()=>{const css=read('src/mobile-pwa-status-tone-v793.css'),js=read('src/mobile-pwa-status-tone-v793.js'),html=read('index.html');assert.ok(css.includes('body > #dj-ios-pwa-status-sample'));assert.ok(css.includes('height:8px!important'));assert.ok(css.includes('z-index:2147483001!important'));assert.ok(js.includes("doc.body.style.setProperty('background-color',color,'important')"));assert.ok(js.includes('doc.body.appendChild(sample)'));assert.ok(html.includes('<div id="dj-ios-pwa-status-sample" aria-hidden="true"></div>'));});
