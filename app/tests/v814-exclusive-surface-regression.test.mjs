import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chooseExclusiveSurface} from '../src/v806-unified-ui.js';
const root=new URL('../',import.meta.url);
const source=readFileSync(new URL('src/v806-unified-ui.js',root),'utf8');
const legacy=readFileSync(new URL('src/v800-ui-architecture.js',root),'utf8');

test('latest explicitly clicked panel wins, regardless of DOM registration order',()=>{
  assert.equal(chooseExclusiveSurface(['map-safety-controls','map-advanced-controls'],
    ['map-advanced-controls','map-safety-controls'],'map-safety-controls',''),
    'map-safety-controls');
  assert.equal(chooseExclusiveSurface(['road-width-legend','transport-sheet'],
    ['road-width-legend','transport-sheet'],'','road-width-legend'),
    'transport-sheet');
});
test('repeated selection retains existing active surface instead of reopening another',()=>{
  assert.equal(chooseExclusiveSurface(['route-panel','transport-sheet'],[], '', 'route-panel'),'route-panel');
  assert.equal(chooseExclusiveSurface(['dj-map-settings'],[], 'dj-map-settings','dj-map-settings'),'dj-map-settings');
  assert.equal(chooseExclusiveSurface([],[], '', 'transport-sheet'),'');
});
test('one arbiter observes all floating windows and class-based drawers',()=>{
  for(const id of ['road-width-legend','map-advanced-controls','map-safety-controls',
    'dj-map-settings','version-history-modal','transport-sheet','ped-tools-panel',
    'dj-mobile-utilities','route-panel','news-panel','night-visibility-float'])
    assert.ok(source.includes(`'${id}'`),`missing exclusive surface ${id}`);
  assert.match(source,/app\.dataset\.dj806Exclusive='on'/);
  assert.match(legacy,/app\.dataset\.dj806Exclusive!=='on'/);
  assert.match(source,/if\(open\.length>1\)dismissOthers\(winner,\{popups:false\}\)/);
  assert.match(source,/win\.queueMicrotask/);
});
test('map facility popups compete with application sheets and close using MapLibre handlers',()=>{
  assert.match(source,/const newlyAdded=visiblePopups\.filter/);
  assert.match(source,/dismissOthers\('',\{popups:false\}\)/);
  assert.match(source,/function dismissPopupNode/);
  assert.match(source,/if\(close\?\.isConnected\)\{[^}]*popup\.dataset\.dj912ImmediateDismiss='true';dispatchLocalClick\(close,win\);\}/);
  assert.match(source,/panelHide\(id,\{immediate:phone\(\)\}\)/);
  assert.match(source,/const enteredPopups=new WeakSet\(\)/);
});
