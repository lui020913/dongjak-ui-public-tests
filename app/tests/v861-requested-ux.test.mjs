import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('logout asks for confirmation, saves pending favorites first and preserves account cloud records',()=>{
  const auth=read('src/v824-favorites-cloud.js');
  assert.match(auth,/window\.confirm\([\s\S]*?로그아웃하시겠습니까/);
  assert.match(auth,/기존에 저장한 즐겨찾기와 그룹은 계정에 그대로 보관됩니다/);
  assert.match(auth,/if\(!syncReady\)[\s\S]*?다시 로그아웃해 주세요/);
  assert.match(auth,/if\(needsSave\|\|readValue\(DIRTY_KEY\)==='1'\)[\s\S]*?const synced=await flush\(\)/);
  assert.match(auth,/if\(!synced\|\|readValue\(DIRTY_KEY\)==='1'\)[\s\S]*?로그아웃을 취소했습니다/);
  assert.match(auth,/await client\.auth\.signOut\(\)/);
  assert.match(auth,/replaceFavoritesSnapshot\(\{groups:\[\],places:\[\]\},\{origin:'cloud'\}\)/);
  assert.match(auth,/동일 계정으로 다시 로그인하면 복원됩니다/);
});

test('bottom tabs and transit facility keep animations with independent route labels',()=>{
  const motion=read('src/v806-unified-ui.js');
  const transportHeader=read('src/v8215-news-metro-compact-header.js');
  assert.match(motion,/const frame=windowMotionFrame\(progress,opening,distance,rect\.height,docked\)/);
  assert.match(motion,/if\(docked\)target\.style\.setProperty\('clip-path'/);
  assert.match(motion,/target\.style\.setProperty\('translate',`0 \$\{frame\.offset\}px`,'important'\)/);
  assert.match(motion,/if\(!playMobileMotion\(target,false,finish\)\)finish\(\)/);
  assert.match(motion,/\.dj-place-header-close/);
  assert.match(motion,/\.dj-place-route-button/);
  assert.match(transportHeader,/dj-news-transport-label.*출발/);
  assert.match(transportHeader,/dj-news-transport-label.*도착/);
  assert.match(motion,/function dismissPopupNode/);
});

test('transit header includes four centered horizontal action controls and share behavior',()=>{
  const transit=read('src/v8215-news-metro-compact-header.js');
  const map=read('src/transport-map.js');
  const css=read('src/v861-requested-ux.css');
  assert.match(map,/id='transport-share-place'/);
  assert.match(map,/placeShareUrl\(place\)/);
  assert.match(map,/shareMapUrl\(url,/);
  assert.match(transit,/actionRow\.append\(start,end\)/);
  assert.match(transit,/actionRow\.append\(bookmark\)/);
  assert.match(transit,/actionRow\.append\(share\)/);
  assert.match(transit,/TRANSPORT_ACTION_ICONS/);
  assert.match(css,/\.dj-news-transport-actions>button\s*\{[\s\S]*?place-items:center!important/);
  assert.match(css,/\.dj-news-transport-bookmark::before\s*\{[\s\S]*?place-items:center!important/);
  assert.match(css,/\.dj-news-transport-share/);
});

test('search recommendation panel is wider without changing its visual-viewport positioning logic',()=>{
  const css=read('src/v861-requested-ux.css');
  const js=read('src/v861-requested-ux.js');
  const mobileJs=read('src/v857-requested-ux.js');
  assert.match(css,/left:6px!important;right:6px!important;width:auto!important/);
  assert.match(css,/position:fixed!important;[\s\S]*?left:50%!important;right:auto!important/);
  assert.match(css,/width:min\(960px,calc\(100vw - 24px\)\)!important/);
  assert.match(css,/translate:-50% 0!important/);
  assert.match(js,/getBoundingClientRect\(\)/);
  assert.match(js,/--dj861-search-top/);
  assert.match(js,/visualViewport/);
  assert.match(mobileJs,/visualViewport/);
  assert.match(read('index.html'),/v861-requested-ux\.js/);
});
