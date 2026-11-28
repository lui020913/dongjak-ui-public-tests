import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('standalone night scene is not mounted and public palette is light-only',()=>{
 const main=read('src/main.js'),html=read('index.html'),theme=read('src/ui-environment.js');
 assert.doesNotMatch(main,/installNightVisibility|promoteNightAnalysisLayers|night-visibility-(?:panel\.)?css/);
 assert.doesNotMatch(html,/id="(?:night-visibility-toggle|night-visibility-quick-off|night-visibility-float|dj-safety-night|theme-toggle)"/);
 assert.match(theme,/const theme='light'/);
 assert.doesNotMatch(theme,/setTemporaryTheme|createThemeState/);
 assert.doesNotMatch(read('src/mobile-toolbar-v794.js'),/id:'dj-v794-night'/);
 assert.doesNotMatch(read('src/v831-swipe-feature-toolbar.js'),/buildNightConfirm|requestSafetyNight/);
 assert.doesNotMatch(read('src/v840-coordinated-ui.js'),/dialog.id='dj840-theme-confirm'/);
});
test('lighting PRI factor remains registered with its original data',()=>{
 const manifest=JSON.parse(read('public/data/pri/manifest.json'));
 assert.ok(manifest.bundle==='/data/pri/lighting_segments.json');
 assert.ok(JSON.parse(read('public/data/pri/lighting_segments.json')));
});

test('public artwork, iOS status bar and land palette do not react to old dark settings',()=>{
 const artwork=read('src/app-artwork-v7104.js'),status=read('src/mobile-pwa-status-tone-v793.js'),guard=read('src/v862-map-theme-zoom-guard-core.js');
 assert.match(artwork,/dongjak-light-/);
 assert.match(artwork,/manifest-light\.webmanifest/);
 assert.doesNotMatch(artwork,/dataset\.theme==='dark'/);
 assert.match(status,/const theme='light'/);
 assert.match(status,/const color=baselineColor\(\)/);
 assert.doesNotMatch(status,/sangdoNight|nightActive/);
 assert.doesNotMatch(guard,/theme==='dark'/);
 assert.doesNotMatch(read('index.html'),/dongjak-dark-|v862-night-analysis-session\.js/);
 assert.doesNotMatch(read('src/mobile-pwa-status-tone-v793.css'),/data-theme=|#22282e|#191b1f/);
 assert.doesNotMatch(read('src/onboarding-status-surface.js'),/appTheme|rootTheme|#22282e/);
 assert.doesNotMatch(read('src/v860-onboarding.css'),/data-theme="dark"/);
 assert.doesNotMatch(read('src/v7120-settings.js'),/dongjak-dark-|isDark|syncTheme/);
 assert.doesNotMatch(read('src/theme-contract.css'),/data-theme="dark"|color-scheme:dark/);
});
