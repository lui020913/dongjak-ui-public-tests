import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const css=readFileSync(new URL('../production/mobile-first-overhaul.css',import.meta.url),'utf8');
const pin=JSON.parse(readFileSync(new URL('../../release/mobile-first-overhaul-source.json',import.meta.url),'utf8'));

assert.ok(css.length>8000 && css.length<40000,'Overhaul stylesheet size is outside the reviewed range');
assert.ok(!/@import\b|url\s*\(|expression\s*\(|javascript:|(?:^|[;{]\s*)behavior\s*:/i.test(css),'External imports or executable CSS are forbidden');
assert.ok(!/\u0000|<\/?script/i.test(css),'Unexpected control or executable markup');
const stripped=css.replace(/\/\*[\s\S]*?\*\//g,'');
let depth=0;
for(const char of stripped){if(char==='{')depth++;if(char==='}')depth--;assert.ok(depth>=0,'CSS braces close before opening');}
assert.equal(depth,0,'CSS braces must balance');
for(const token of [
  '--mf-surface:', '--mf-brand:', '--mf-radius-sheet:', '--mf-touch:',
  '#app#app#app#app#app[data-theme="dark"]', 'html[data-theme="dark"] #app', '@media (max-width: 699px)',
  '@media (min-width: 700px) and (max-width: 1079px)',
  '@media (min-width: 1080px)', 'env(safe-area-inset-bottom',
  'prefers-reduced-motion', '#dj-v794-toolbar', '#bottom-nav',
  '#route-panel', '#participation-panel', '#news-panel', '#mine-panel'
]) assert.ok(css.includes(token), 'Missing mobile-first requirement: '+token);
assert.match(pin.source_sha,/^[a-f0-9]{40}$/);
assert.equal(pin.application_version,'8.26.1');
assert.equal(pin.release_status,'CANDIDATE_PREVIEW_NOT_PRODUCTION');
console.log('PASS: mobile-first CSS is bounded, self-contained and covers the required responsive surfaces.');
