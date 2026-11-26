import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const shadow=readFileSync(new URL('../src/route-screen-v3.css',import.meta.url),'utf8');
test('focus priority declared before legacy linked styles',()=>{
  assert.ok(html.indexOf('@layer dj-interaction-focus;')>0);
  assert.ok(html.indexOf('@layer dj-interaction-focus;')<html.indexOf('rel="stylesheet"'));
  assert.match(html,/:focus\s*\{\s*outline: none !important;\s*box-shadow: none !important;/);
  assert.match(html,/html:not\(\[data-dj-focus-input="pointer"\]\).*:focus-visible/);
  assert.match(html,/--dj-neutral-focus: #596368/);
  assert.match(html,/addEventListener\('pointerdown', pointer/);
  assert.match(html,/addEventListener\('touchstart', pointer/);
  assert.match(html,/addEventListener\('keydown', keyboard/);
});
test('TIP close has no independent surface or ring',()=>{
  const rule=html.match(/#dj-user-tip-close\s*\{([^}]+)\}/)?.[1];
  assert.ok(rule);
  for(const declaration of ['background: transparent !important','border: 0 !important','box-shadow: none !important','filter: none !important'])assert.ok(rule.includes(declaration));
});
test('shadow route controls inherit pointer and keyboard focus policy without host-context',()=>{
  assert.match(html,/:root\[data-dj-focus-input="pointer"\]\s*\{ --dj-route-focus-outline: none;/);
  assert.match(shadow,/outline:var\(--dj-route-focus-outline,2px solid #596368\)/);
  assert.doesNotMatch(shadow,/:host-context/);
});
