import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RENUMBERED_VERSION_HISTORY} from '../src/version-history.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('v8.0.0 retains map core and gives all four mobile tabs fixed headings',()=>{
  assert.match(read('platforms/shared/mobile-panel-layout.js'),/\['route-panel','participation-panel','news-panel','mine-panel'\]/);
  const js=read('platforms/shared/mobile-panel-layout.js');
  const css=read('platforms/shared/mobile-panel-layout.css');
  assert.match(js,/originals\.set/);
  assert.match(js,/heading\.replaceChildren/);
  assert.match(js,/panel\.replaceChildren/);
  assert.match(js,/cloneNode\(true\)/);
  assert.match(js,/dj-mobile-page-header/);
  assert.match(js,/dj-mobile-page-content/);
  assert.match(css,/@media \(max-width:699px\)/);
  assert.match(css,/overflow-y:auto!important/);
  assert.match(css,/flex:0 0 auto!important/);
  assert.match(css,/#mine-panel\.dj-mobile-panel-split \.stat-grid>div strong/);
  assert.match(css,/#news-panel\.dj-mobile-panel-split \.dongjak-news-toolbar/);
  const entry=read('platforms/entry.js');
  assert.match(entry,/target==='ios-pwa'\|\|target==='android'/);
  assert.match(entry,/import\('\.\/shared\/mobile-panel-layout\.js'\)/);
  assert.equal(RENUMBERED_VERSION_HISTORY[0].version,'v8.0.3');
  assert.equal(RENUMBERED_VERSION_HISTORY[0].scale,'patch');
});

test('admin picker is opened by original action and overview test-text is removed',()=>{
  const js=read('platforms/shared/mobile-panel-layout.js');
  const html=read('index.html');
  assert.match(js,/if\(picker\.hidden\)open\.click\(\)/);
  assert.ok(html.includes('id="admin-dong-picker"'));
  assert.ok(html.includes('id="open-admin-dongs"'));
  assert.ok(!html.includes('현재 자료는 시범 데이터이며 이 기기에만 저장됩니다.'));
  const pwa=read('src/mobile-pwa-status-tone-v793.js');
  assert.match(pwa,/root\.dataset\.theme=theme/);
  assert.match(pwa,/themeMeta\.setAttribute\('content'/);
});
