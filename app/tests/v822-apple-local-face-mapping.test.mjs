import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const read = file => readFileSync(new URL(file, root), 'utf8');

test('v823: old Apple local-face mapping is replaced by one online Pretendard family', () => {
  const css = read('src/local-font.css');
  const html = read('index.html');
  assert.match(css, /--dj-ui-font: "Pretendard Variable"/);
  assert.match(css, /html body #app#app :is\(#app, \*\):not\(svg\)/);
  assert.match(css, /html body \.map-startup-overlay/);
  assert.match(css, /html body \.maplibregl-popup/);
  assert.match(css, /font-family: "Pretendard Variable", Pretendard, system-ui, sans-serif !important/);
  assert.doesNotMatch(css, /@font-face|local\(|AppleSDGothicNeo|\.ttf|\.woff/i);
  assert.equal(existsSync(new URL('public/fonts/AppleSDGothicNeoR.ttf', root)), false);
  assert.match(html, /<link rel="stylesheet" href="\/src\/local-font\.css" \/>/);
});
