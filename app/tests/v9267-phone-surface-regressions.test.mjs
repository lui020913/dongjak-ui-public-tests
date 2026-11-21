import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=read('src/v9267-phone-surface-regressions.css');
const html=read('index.html');
const tab=read('src/bottom-tab-navigation.js');
const theme=read('src/manual-pwa-theme-reload.js');
const pwa=read('src/mobile-pwa-status-tone-v793.js');
const night=read('src/v831-swipe-feature-toolbar.js');

test('the latest phone fix is loaded last and keeps the search dropdown full phone-width',()=>{
  assert.match(html,/v9257-mobile-regressions\.css[\s\S]*v9267-phone-surface-regressions\.css/);
  assert.match(css,/#map-quick-search-dropdown:not\(\[hidden\]\)/);
  assert.match(css,/width:calc\(100vw - 24px\)!important/);
  assert.match(css,/--dj884-search-room/);
});
test('recording mode cannot push the independent AI action down',()=>{
  assert.match(css,/\.topbar \.header-tools/);
  assert.match(css,/position:fixed!important/);
  assert.match(css,/#dj890-ai-orb/);
});
test('fullscreen tab transitions use real page snapshots and never show an opaque white curtain',()=>{
 const local=new URL('../src/mobile-next.css',import.meta.url);
 const material=readFileSync(existsSync(local)?local:new URL('../../frontend/production/mobile-next.css',import.meta.url),'utf8');
 assert.match(tab,/doc\.startViewTransition\(\(\)=>\{replay\(button\);\}\)/);
 assert.match(tab,/if\(reduced\(\)\|\|typeof doc\.startViewTransition!=='function'\)/);
 assert.doesNotMatch(tab,/ensureCurtain|curtain\.hidden=false/);
 assert.doesNotMatch(material,/#dj-tab-surface-curtain/);
 assert.match(material,/::view-transition-old\(root\)/);
 assert.match(material,/::view-transition-new\(root\)/);
 for(const key of ['route','participate','news','mine'])assert(css.includes('data-tab="'+key+'"'));
});

test('fullscreen footer and My Info icons use the shared theme card surface',()=>{
  assert.match(css,/#mine-panel \.dj834-setting-icon/);
  assert.match(css,/#mine-panel \.dj834-profile-card/);
  assert.match(css,/--dj-primary-page-bg/);
  assert.match(css,/#bottom-nav/); // this patch only documents that dock state is preserved elsewhere
});
test('night consent is centered, stale exit motion is cancelled and pill remains active',()=>{
  assert.match(css,/#dj833-night-modal:not\(\[hidden\]\)/);
  assert.match(css,/place-items:center!important/);
  assert.match(css,/#dj-v794-night\[aria-pressed="true"\]/);
  assert.match(night,/function openNightConfirm\(\)/);
  assert.match(night,/DongjakWindowMotion\?\.cancel\?\.\(card\)/);
});
test('iPhone theme reload retains camera even if the basemap never became idle',()=>{
  assert.match(theme,/map\.getCenter\(\)/);
  assert.match(theme,/win\.sessionStorage\.setItem/);
  assert.doesNotMatch(theme,/baseline===null\|\|baseline!==layerSnapshot/);
  assert.match(pwa,/nightActive=app\.dataset\.sangdoNight==='on'/);
  assert.match(pwa,/data-sangdo-night/);
});
