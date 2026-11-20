import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mobileKeyboardInset} from '../src/v891-mobile-hud-ai-logo.js';
import {compactHudInsets} from '../src/map-scale-docking.js';
const code=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('iOS keyboard inset correctly follows visual viewport without negative shifts',()=>{
  assert.equal(mobileKeyboardInset({innerHeight:844,visualHeight:844,offsetTop:0}),0);
  assert.equal(mobileKeyboardInset({innerHeight:844,visualHeight:490,offsetTop:0}),354);
  assert.equal(mobileKeyboardInset({innerHeight:844,visualHeight:450,offsetTop:30}),364);
  assert.equal(mobileKeyboardInset({innerHeight:844,visualHeight:900,offsetTop:0}),0);
});
test('map scale and TIP occupy separate rows, preserving true map distance',()=>{
  const source=code('src/map-scale-docking.js');
  assert.match(source,/navRect\.top-mapRect\.top-hudHeight-6/);
  assert.match(source,/compactHudInsets\(window\.innerWidth,navRect\)/);
  assert.match(source,/const tip=app\.querySelector\('#dj840-map-tip'\)/);
  assert.match(source,/scaleRect\.width/);
  assert.doesNotMatch(source,/applyImportant\(scale,'width'/);
});
test('native AI search remains one dialog, mobile opens without early keyboard',()=>{
  const ai=code('src/v880-supabase-safety-ai.js');
  const orb=code('src/v890-mobile-ai-orb.js');
  assert.match(ai,/if\(window\.matchMedia\?\.\('\(max-width:699px\)'\)\?\.matches\)\{\s*names\.firstChild\.setAttribute\('tabindex','-1'\);names\.firstChild\.focus\(\{preventScroll:true\}\);\s*\}else\{\s*input\.focus\(\{preventScroll:true\}\)/);
  assert.match(orb,/native\.click\(\)/);
  assert.match(orb,/if\(!modal\?\.open&&modal\?\.showModal\)/);
  const css=code('src/v891-mobile-hud-ai-logo.css'),js=code('src/v891-mobile-hud-ai-logo.js');
  assert.match(css,/inset:var\(--dj891-ai-visible-top,0px\) 0 auto 0!important/);
  assert.match(css,/max-height:var\(--dj891-ai-visible-height,100dvh\)!important/);
  assert.match(js,/modal\.style\.setProperty\('--dj891-ai-visible-top'/);
  assert.match(js,/modal\.style\.setProperty\('--dj891-ai-visible-height'/);
  assert.match(js,/visualViewport,'resize'/);
  assert.match(js,/visualViewport,'scroll'/);
});
test('header image has alpha-specific asset and responsive circular shell',()=>{
  const css=code('src/v891-mobile-hud-ai-logo.css');
  const js=code('src/v891-mobile-hud-ai-logo.js');
  const html=code('index.html');
  assert.match(js,/dongjak-nav-transparent\.png/);
  assert.match(css,/border-radius:50%!important/);
  assert.match(css,/width:34px!important/);
  assert.match(css,/\.topbar \{[\s\S]*?gap:10px!important/);
  assert.match(html,/v891-mobile-hud-ai-logo\.css/);
  assert.match(html,/v891-mobile-hud-ai-logo\.js/);
});

test('compact HUD matches actual centered navigation edges on phones and tablets',()=>{
  assert.deepEqual(compactHudInsets(390,{left:12,right:378}),{left:12,right:12,width:366});
  assert.deepEqual(compactHudInsets(768,{left:24,right:744}),{left:24,right:24,width:720});
  assert.deepEqual(compactHudInsets(1024,{left:152,right:872}),{left:152,right:152,width:720});
  assert.deepEqual(compactHudInsets(375,null),{left:12,right:12,width:351});
  assert.match(code('src/public-ui-mobile-surface-coordinator.js'),/win\.innerWidth-tipRect\.right/);
});

test('compact docking restores the scale corner before measuring, without forcing desktop layout',()=>{
 const js=code('src/map-scale-docking.js');
 const start=js.indexOf("if(!desktop){");
 const hide=js.indexOf('if(shouldHideMobileScale(',start);
 const restore=js.indexOf("applyImportant(scale,'display','block')",hide);
 const measure=js.indexOf('const scaleRect=',restore);
 const desktop=js.indexOf('previousDesktop=true;',measure);
 assert.ok(start>=0&&hide>start&&restore>hide&&measure>restore&&desktop>measure);
 assert.match(js.slice(hide,restore),/applyImportant\(scale,'visibility','hidden'\)[\s\S]*?return;/);
 assert.match(js.slice(desktop),/scale\.style\.removeProperty\('display'\)/);
 assert.match(js,/\['top','bottom','left','right','visibility','display'\]\)scale\?\.style\.removeProperty\(prop\)/);
});
