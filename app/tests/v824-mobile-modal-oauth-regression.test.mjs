import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stabilizePageHeaders,PANEL_HEADINGS} from '../src/v823-route-panel.js';
import {installAccountKeyboardGuard} from '../src/v824-auth-keyboard.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('four mobile page headers share one declarative close/title layout without inline overrides',()=>{
  const css=read('src/v829-mobile-layout-system.css');
  const html=read('index.html');
  const styles=[];
  const doc={getElementById(id){
    const close={style:{setProperty(){styles.push(id);}}};
    const heading={style:{setProperty(){styles.push(id);}},querySelector:selector=>selector.includes('button')?close:{textContent:id}};
    return {querySelector:()=>heading};
  }};
  assert.equal(stabilizePageHeaders(doc),4);
  assert.equal(styles.length,0);
  assert.match(css,/display:flex!important;flex-flow:row nowrap!important/);
  assert.match(css,/flex:0 0 44px!important;order:3!important;margin-left:auto!important/);
  for(const id of PANEL_HEADINGS)assert.match(html,new RegExp('id="'+id+'"'));
});

test('route uses shared 50dvh mobile height with native scrolling',()=>{
  const css=read('src/v824-mobile-sheet-and-keyboard.css');
  assert.doesNotMatch(css,/height:min\(61dvh,520px\)!important/);
  assert.doesNotMatch(css,/max-height:min\(61dvh,520px\)!important/);
  assert.match(read('src/v833-home-sheet-layout.css'),/max-height:min\(50dvh/);
  assert.match(css,/overflow-y:auto!important/);
  assert.match(css,/-webkit-overflow-scrolling:touch!important/);
  assert.match(read('src/v815-map-product.js'),/calcBtn\?\.before\(waySection\)/);
});

test('v8.2.4 mobile account inputs avoid iOS Safari auto-zoom and accidental keyboard opening',()=>{
  const css=read('src/v824-mobile-sheet-and-keyboard.css');
  assert.match(css,/#dj824-account :is\(input,textarea,select\)/);
  assert.match(css,/font-size:16px!important/);
  const cloud=read('src/v824-favorites-cloud.js');
  assert.match(cloud,/min-width:700px/);
  assert.doesNotMatch(cloud,/if\(willOpen&&config\.configured&&!user\)input\.focus\(\)/);
});

test('v8.2.4 only account panel scrolls on account input focus, and listeners clean up',()=>{
  const fns={};const calls=[];const cls=new Set();
  const field={matches:()=>true,getBoundingClientRect:()=>({bottom:600})};
  const panel={hidden:false,contains:()=>true,
    addEventListener:(k,f)=>fns[k]=f,removeEventListener:k=>calls.push('remove:'+k),
    scrollBy:o=>calls.push(o)};
  const doc={activeElement:field,documentElement:{classList:{toggle:(k,v)=>v?cls.add(k):cls.delete(k),remove:k=>cls.delete(k)}},getElementById:()=>panel};
  const w={innerHeight:700,matchMedia:()=>({matches:true}),visualViewport:{height:430,offsetTop:0,
    addEventListener:(k,fn)=>fns['vv:'+k]=fn,removeEventListener:k=>calls.push('vvremove:'+k)},
    requestAnimationFrame:fn=>fn()};
  const cleanup=installAccountKeyboardGuard(doc,w);
  fns.focusin({target:field});
  assert.ok(cls.has('dj824-auth-focused'));
  assert.ok(calls.some(o=>o?.top>0));
  cleanup();assert.equal(cls.size,0);
  assert.ok(calls.includes('remove:focusin'));
});

test('v8.2.4 latest version and Kakao KOE205 consent prerequisites documented',()=>{
  const pkg=JSON.parse(read('package.json'));
  const log=JSON.parse(read('src/app-release-log.json'));
  assert.equal(log.releases[0].version,pkg.version);assert.ok(log.releases.some(release=>release.previousVersion==='8.2.4' && release.originalItems.length>0),'v8.2.4 history must be retained');
  assert.match(read('README_V824_MOBILE_LAYOUT_KAKAO_20261113.md'),/KOE205/);
  assert.match(read('README_V824_MOBILE_LAYOUT_KAKAO_20261113.md'),/account_email/);
  assert.match(read('index.html'),/v824-mobile-sheet-and-keyboard\.css/);
});
