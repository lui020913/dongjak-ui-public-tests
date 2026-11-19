import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const main=read('src/main.js');
const css=read('src/v869-safety-home-tip.css');
const html=read('index.html');

test('v8.6.9: bottom Safety Map tab always returns home without opening an overview',()=>{
  const handler=main.slice(main.indexOf('// The Safety Map bottom tab acts as HOME'),main.indexOf('// Docked safety/map actions persist'));
  assert.match(handler,/if\(b\.dataset\.tab==='map'\)\{[\s\S]*?navigate\('map',\{suppressOverview:true\}\)/);
  assert.doesNotMatch(handler,/overview\.hidden\s*=\s*!overviewExplicitOpen|overviewExplicitOpen\s*=\s*overview\.hidden/);
  assert.match(main,/if\(tab!==['"]map['"]\|\|suppressOverview\)\{[\s\S]*?districtPicker\.hidden=true/);
  assert.match(main,/if\(suppressOverview\)overview\.hidden=true/);
});
test('v8.6.9: execute real bottom-tab handler for return and repeat home presses',()=>{
  const first=main.indexOf('for(const b of navButtons)b.addEventListener(\'click\',()=>{',main.indexOf('// The Safety Map bottom tab acts as HOME'));
  const last=main.indexOf('// Docked safety/map actions persist',first);
  assert.ok(first>0 && last>first);
  const source=main.slice(first,last);
  const calls=[];
  const navButtons=['map','route','participate','news','mine'].map(tab=>({dataset:{tab},addEventListener(name,fn){this.onClick=fn;}}));
  const scope={navButtons,overviewExplicitOpen:true,navigate(tab,opts){calls.push({tab,opts:opts||{}});}};
  runInNewContext(source,scope);
  for(const originating of ['route','participate','news','mine','map']){
    scope.overviewExplicitOpen=true;
    navButtons[0].onClick();
    assert.equal(calls.at(-1).tab,'map',originating);
    assert.equal(calls.at(-1).opts.suppressOverview,true,originating);
    assert.equal(scope.overviewExplicitOpen,false,originating);
  }
  navButtons[2].onClick();
  assert.equal(calls.at(-1).tab,'participate');
  assert.equal(calls.at(-1).opts.suppressOverview,undefined);
});
test('v8.6.9: district selector is still available through explicit map options',()=>{
  assert.match(main,/getElementById\('open-admin-dongs-from-options'\)[\s\S]*?getElementById\('open-admin-dongs'\)\?\.click/);
  assert.match(read('src/admin-dong-layer.js'),/openButton\.addEventListener\('click'/);
});
test('v8.6.9: right-aligned TIP keeps independent clipped text lane with both margins and centered text',()=>{
  assert.match(css,/@media \(max-width:699px\)/);
  assert.match(css,/#dj840-map-tip:not\(\[hidden\]\)/);
  assert.match(css,/padding:0 14px 0 12px!important/);
  assert.match(css,/> \.dj840-tip-copy-viewport[\s\S]*?display:flex!important;[\s\S]*?align-items:center!important;[\s\S]*?padding:0 12px 0 7px!important;[\s\S]*?overflow:hidden!important/);
  assert.match(css,/> \.dj840-tip-copy-viewport > \.dj840-tip-copy[\s\S]*?top:1px!important/);
  assert.match(css,/\.dj854-tip-marquee > \.dj840-tip-copy-viewport > \.dj840-tip-copy/);
  assert.match(read('src/v854-tip-marquee.js'),/scrollWidth-available/);
  assert.match(html,/\/src\/v869-safety-home-tip\.css/);
});
