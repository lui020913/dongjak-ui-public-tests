import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const tone=readFileSync(new URL('../src/mobile-pwa-status-tone-v793.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/mobile-pwa-status-tone-v793.css',import.meta.url),'utf8');
const legacyCss=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
test('iPhone cold-start HTML and runtime status controller use the same light edge tone',()=>{
  const start=html.indexOf('var iosHome=');
  // The protected mobile-only builder prepends its own <script> bootstrap.
  // Search for the closing tag AFTER the theme script, not the first tag in HTML.
  assert.ok(start>=0);
  const startup=html.slice(start,html.indexOf('</script>',start));
  assert.match(startup,/if\(iosHome\)\{document\.documentElement\.style\.backgroundColor=displayTheme==='dark'\?'#22282e':'#edf3ef'/);
  assert.match(startup,/\? \(displayTheme==='dark'\?'#22282e':'#edf3ef'\)/);
  assert.match(tone,/theme==='dark'\?'#22282e':'#edf3ef'/);
  assert.match(css,/--dj-pwa-land-tone:#edf3ef/);
});
test('critical splash CSS paints the iPhone top edge before external CSS loads',()=>{
  const head=html.slice(0,html.indexOf('</style>'));
  assert.match(head,/html\.dj-ios-home-pwa:not\(\[data-theme="dark"\]\) body #app \.map-startup-overlay\{/);
  assert.match(head,/--start-bg:#edf3ef/);
  assert.match(head,/background:var\(--start-bg\)!important/);
  assert.doesNotMatch(head,/linear-gradient\(180deg,var\(--start-bg/);
  assert.match(head,/html\.dj-ios-home-pwa\[data-theme="dark"\] body #app \.map-startup-overlay\{/);
  assert.match(head,/--start-bg:#22282e/);
  assert.ok(head.indexOf('html.dj-ios-home-pwa:not([data-theme="dark"]) body #app .map-startup-overlay')<head.indexOf('.map-startup-overlay[hidden]'));
});

test('standalone iPhone loader wins the legacy !important background after CSS hydration',()=>{
  const head=html.slice(0,html.indexOf('</style>'));
  assert.match(legacyCss,/#app \.map-startup-overlay\{/);
  assert.ok(legacyCss.includes('background:#f3f7f5!important;'));
  assert.equal(legacyCss.includes('background:radial-gradient(ellipse at 50% 39%'),false);
  const light=head.match(/html\.dj-ios-home-pwa:not\(\[data-theme="dark"\]\) body #app \.map-startup-overlay\{[^}]*\}/)?.[0];
  const dark=head.match(/html\.dj-ios-home-pwa\[data-theme="dark"\] body #app \.map-startup-overlay\{[^}]*\}/)?.[0];
  assert.ok(light&&dark,'iPhone loader overrides must target the hydrated DOM inside #app');
  for(const rule of [light,dark]){
    assert.match(rule,/background:var\(--start-bg\)!important;/);
    assert.doesNotMatch(rule,/linear-gradient/);
    assert.match(rule,/--start-bg:#(?:edf3ef|17191d);/);
  }
});
