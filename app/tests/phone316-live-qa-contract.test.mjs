import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const src=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');
const browserSpec=readFileSync(new URL('../../tests/v911-anonymous-ui.spec.mjs',import.meta.url),'utf8');

test('mobile tab animates only content under an opaque stationary page and dock',()=>{
 const css=src('phone-six-issues.css');
 const js=src('bottom-tab-navigation.js');
 assert.match(css,/\.dj-tab-content-enter:not\(\[hidden\]\)\s*>\s*:is\([^}]*\)\s*\{\s*animation:dj-six-page-content-in/);
 assert.match(css,/@keyframes dj-six-page-content-in\s*\{[^}]*opacity/i);
 assert.ok(js.includes("panel.classList.add('dj-tab-content-enter')"));
 assert.ok(css.includes('> #bottom-nav:not([hidden])'));
 assert.ok(browserSpec.includes('dj-six-page-content-in'),'real-device journey must inspect the current animation');
});

test('theme deep link enters My Info child selector before the optional confirmation',()=>{
 const my=src('v834-my-info.js');
 assert.match(my,/if\(\['profile','records','type','theme','map','language'\]\.includes\(action\)\)/);
 assert.ok(my.includes('themeSettings.addEventListener'));
 assert.ok(my.includes('data-dj834-theme="dark"'));
 assert.ok(browserSpec.includes('[data-dj834-theme="dark"]'));
 assert.ok(browserSpec.includes('if(await themeConfirm.isVisible())'));
});
