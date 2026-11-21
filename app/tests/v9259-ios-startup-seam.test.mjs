import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const tone=readFileSync(new URL('../src/mobile-pwa-status-tone-v793.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/mobile-pwa-status-tone-v793.css',import.meta.url),'utf8');
test('iPhone cold-start HTML and runtime status controller use the same light edge tone',()=>{
  const startup=html.slice(html.indexOf('var iosHome='),html.indexOf('</script>'));
  assert.match(startup,/if\(iosHome\)\{document\.documentElement\.style\.backgroundColor=displayTheme==='dark'\?'#192d32':'#edf3ef'/);
  assert.match(startup,/\? \(displayTheme==='dark'\?'#192d32':'#edf3ef'\)/);
  assert.match(tone,/theme==='dark'\?'#192d32':'#edf3ef'/);
  assert.match(css,/--dj-pwa-land-tone:#edf3ef/);
});
test('critical splash CSS paints the iPhone top edge before external CSS loads',()=>{
  const head=html.slice(0,html.indexOf('</style>'));
  assert.match(head,/html\.dj-ios-home-pwa:not\(\[data-theme="dark"\]\) \.map-startup-overlay\{/);
  assert.match(head,/--start-bg:#edf3ef/);
  assert.match(head,/linear-gradient\(180deg,var\(--start-bg\) 0%,var\(--start-bg\) 16%,#f9fbfa 44%,var\(--start-bg\) 100%\)/);
  assert.match(head,/html\.dj-ios-home-pwa\[data-theme="dark"\] \.map-startup-overlay\{/);
  assert.match(head,/--start-bg:#192d32/);
  assert.ok(head.indexOf('html.dj-ios-home-pwa:not([data-theme="dark"]) .map-startup-overlay')<head.indexOf('.map-startup-overlay[hidden]'));
});
