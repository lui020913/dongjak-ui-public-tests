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
