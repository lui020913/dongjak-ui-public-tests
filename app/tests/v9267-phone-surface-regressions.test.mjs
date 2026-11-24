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
test('full-screen tabs switch immediately without a white WebGL snapshot or opaque curtain',()=>{
 const local=new URL('../src/mobile-next.css',import.meta.url);
 const material=readFileSync(existsSync(local)?local:new URL('../../frontend/production/mobile-next.css',import.meta.url),'utf8');
 assert.match(tab,/if\(!replay\(button\)\)return/);
 assert.match(tab,/clearEntrance\(\)/);
 assert.match(tab,/panel\.classList\.add\('dj-tab-content-enter'\)/);
 assert.doesNotMatch(tab,/doc\.startViewTransition|skipTransition|queued=button/);
 assert.doesNotMatch(material,/#dj-tab-surface-curtain|::view-transition-(old|new)\(root\)/);
 assert.match(material,/\.page-panel\.dj-tab-content-enter:not\(\[hidden\]\)/);
 assert.match(material,/@keyframes djTabContentReveal/);
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
test('iPhone manual theme switch stores camera before a single native-color refresh',()=>{
  assert.match(theme,/export function installManualThemeReload\(\)\{return \(\)=>\{\};\}/);
  assert.match(theme,/requestIosThemeRefresh/);
  assert.match(theme,/sessionStorage\.setItem\(MANUAL_THEME_RELOAD_KEY/);
  assert.match(theme,/win\.location\.reload\(\)/);
  assert.match(pwa,/nightActive=app\.dataset\.sangdoNight==='on'/);
  assert.match(pwa,/data-sangdo-night/);
});

test('night confirmation has one stationary fade owner, not nested CSS keyframes',()=>{
 const owner=read('src/v806-unified-ui.js');
 assert.match(owner,/const fade=[^;]*dj833-night-dialog/);
 assert.match(night,/querySelector\('\.dj833-night-dialog'\)\.dataset\.djDialogFade='true'/);
 assert.doesNotMatch(css,/animation:dj9267-night-/);
 assert.doesNotMatch(html,/src="\/src\/v852-mobile-ux\.js"/);
});
test('tab switching uses only incoming reveal or outgoing map return, never both',()=>{
 assert.match(tab,/const retain=Boolean\(toMap/);
 assert.match(tab,/if\(!reduced\(\)&&!toMap\)/);
 assert.match(tab,/pointer-events','none','important'/);
});
