import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MAIN_TABS,synchronizeMainTabs} from '../src/v827-navigation-state.js';
import {APP_RELEASES,APP_VERSION} from '../src/app-version.js';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const releaseLog=JSON.parse(read('src/app-release-log.json')).releases;
function mockTab(name){const attrs=new Map();const classes=new Set();return {
  dataset:{tab:name},classList:{contains:x=>classes.has(x),toggle:(x,value)=>value?classes.add(x):classes.delete(x)},
  getAttribute:k=>attrs.get(k)||null,setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k)
};}
test('v8.1.1: exactly one tab selected and safety map does not remain active on community',()=>{
 const buttons=MAIN_TABS.map(mockTab);const app={dataset:{tab:'map'}};
 assert.equal(synchronizeMainTabs(app,buttons),'map');
 app.dataset.tab='participate';synchronizeMainTabs(app,buttons);
 assert.equal(buttons.filter(x=>x.classList.contains('active')).length,1);
 assert.equal(buttons[0].getAttribute('aria-current'),null);
 assert.equal(buttons[0].getAttribute('aria-pressed'),'false');
 assert.equal(buttons[2].getAttribute('aria-current'),'page');
 assert.equal(buttons[2].getAttribute('aria-pressed'),'true');
});
test('v8.1.1: all main tabs have uniform 24px vector canvas and 2.2 stroke',()=>{
 const html=read('index.html');
 for(const tab of MAIN_TABS){const button=html.match(new RegExp(String.raw`<button[^>]*data-tab="${tab}"[\s\S]*?<\/button>`));
 assert.ok(button,tab);assert.match(button[0],/class="dj827-nav-glyph"/);assert.match(button[0],/stroke-width="2.2"/);}
 const css=read('src/v827-nav-close.css');assert.match(css,/width:22px!important;height:22px!important/);
});
test('v8.1.1: close button is anchored upper-right and cannot show duplicate CSS cross',()=>{
 const css=read('src/v827-nav-close.css');
 assert.match(css,/top:16px!important;right:16px!important;left:auto!important/);
 assert.match(css,/\.dj817-close-button::after/);assert.match(css,/content:none!important;display:none!important/);
 assert.match(css,/\.dj817-x-svg/);
});
test('v8.1.1: historic rapid version jumps are reclassified in increasing sequential releases with source audit',()=>{
 assert.equal(APP_VERSION,JSON.parse(read('package.json')).version);
 const historical=['8.2.9','8.2.8','8.2.7','8.2.6','8.2.5','8.2.4','8.2.3','8.2.2','8.2.1','8.2.0','8.1.3','8.1.2','8.1.1','8.1.0','8.0.6','8.0.5','8.0.4'];
 const versions=releaseLog.map(x=>x.version);
 assert.equal(versions[0],APP_VERSION);
 assert.deepEqual(releaseLog.slice(-historical.length).map(x=>x.previousVersion),historical);
 for(let i=1;i<versions.length;i++){
  const compare=(x,y)=>{const a=x.split('.').map(Number),b=y.split('.').map(Number);for(let k=0;k<3;k++)if(a[k]!==b[k])return a[k]-b[k];return 0;};
  assert.ok(compare(versions[i-1],versions[i])>0,`Releases must strictly descend: ${versions[i-1]} then ${versions[i]}`);
 }
 assert.deepEqual(['8.1.0','8.0.6','8.0.5'].map(v=>releaseLog.find(x=>x.previousVersion===v)?.sourceVersion),['v8.26.0','v8.25.0','v8.24.0']);
 assert.equal(APP_RELEASES[0].version,`v${APP_VERSION}`);
 assert.equal(new Set(releaseLog.map(x=>x.version)).size,releaseLog.length);
 const notes=releaseLog.flatMap(x=>x.items);
 assert.equal(new Set(notes).size,notes.length);
 assert.match(read('src/version-history.js'),/recentHistory:\[\.\.\.APP_RELEASES\.slice\(1\),\.\.\.RENUMBERED_VERSION_HISTORY\]/);
});
test('v8.1.1: build metadata and public entrypoints agree with package version',()=>{
 const ver=JSON.parse(read('package.json')).version;
 assert.equal(ver,APP_VERSION);assert.equal(JSON.parse(read('package-lock.json')).version,ver);
 assert.equal(JSON.parse(read('public/version.json')).version,ver);
 assert.equal(JSON.parse(read('src/build-info.json')).version,ver);
 assert.doesNotMatch(read('index.html'),/id="version-history-trigger"[^>]*>업데이트<\/button>/);
 assert.match(read('src/v7120-settings.js'),/id="dj-about-version-number">1\.0<\/strong>/);
});
