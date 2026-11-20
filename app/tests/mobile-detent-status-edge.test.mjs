import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('detent movement and clipping use the same timing and natural compact geometry',()=>{
 const s=read('src/v889-mobile-sheet-motion.js');
 assert.match(s,/translate \$\{DURATION\}ms \$\{EASING\}, clip-path \$\{DURATION\}ms \$\{EASING\}/);
 assert.match(s,/compactRect=panel.getBoundingClientRect\(\);\s*panel.classList.add\(EXPANDED\)/);
 assert.match(s,/expandedRect.bottom\+startDelta.y-dockBottom/);
});
test('normal and dimmed map edge use the same native-edge palette without blurring the search surface',()=>{
 const s=read('src/mobile-pwa-status-tone-v793.css');
 assert.match(s,/--dj-pwa-native-edge:#eef3ef/);assert.match(s,/--dj-pwa-native-edge:#192d32/);
 assert.match(s,/var\(--dj-pwa-native-edge\) 7%/);
 assert.match(s,/background:#ffffff!important/);
});

test('dimmed status bridge matches the native edge and stays above the isolated app without blocking taps',()=>{const s=read('src/mobile-pwa-status-tone-v793.css'),js=read('src/mobile-pwa-status-tone-v793.js');assert.ok(s.includes('body > #dj-ios-pwa-status-bridge'));assert.ok(s.includes('var(--dj-pwa-status-color,var(--dj-pwa-native-edge)) 0px'));assert.ok(s.includes('transparent 100%'));assert.ok(s.includes('pointer-events:none!important'));assert.ok(s.includes('z-index:2147483000!important'));assert.ok(s.includes('#dj-ai-search-modal[open]::backdrop'));assert.ok(js.includes('doc.body.appendChild(bridge)'));assert.ok(js.includes('observer.observe(doc.body'));});


test('iOS native status sampler is a real body-level opaque strip at least six pixels high',()=>{const css=read('src/mobile-pwa-status-tone-v793.css'),js=read('src/mobile-pwa-status-tone-v793.js'),html=read('index.html');assert.ok(css.includes('body > #dj-ios-pwa-status-sample'));assert.ok(css.includes('height:8px!important'));assert.ok(css.includes('z-index:2147483001!important'));assert.ok(js.includes("doc.body.style.setProperty('background-color',color,'important')"));assert.ok(js.includes('doc.body.appendChild(sample)'));assert.ok(html.includes('<div id="dj-ios-pwa-status-sample" aria-hidden="true"></div>'));});
