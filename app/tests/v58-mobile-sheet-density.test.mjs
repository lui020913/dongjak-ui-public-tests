import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {metroMarkerGeojson} from '../src/metro-marker-geodata.js';
const read=x=>readFileSync(new URL(`../${x}`,import.meta.url),'utf8');

test('touch drag snaps a content-sized panel only on gesture end',()=>{
  const code=read('src/main.js');
  const css=read('src/layout-core.css');
  assert.match(code,/overviewDrag\.delta = pointerY - overviewDrag\.startY/);
  assert.match(code,/delta < -36 \? 'expanded' : delta > 36 \? 'collapsed'/);
  assert.doesNotMatch(code,/setProperty\('--mobile-drag-height'/);
  assert.match(css,/max-height:min\(65dvh,480px\)!important/);
  assert.match(css,/height:76px!important/);
  assert.match(css,/\.overview-sheet\[data-sheet-state='collapsed'\]/);
  assert.match(css,/transform:none!important/);
});
test('mobile district view reserves only transfer hubs and hides station labels until zoom threshold',()=>{
  const code=read('src/transport-map.js');
  assert.match(code,/dj-metro-summary-mobile-hubs-icon/);
  assert.match(code,/maxzoom:12\.6/);
  assert.match(code,/filter:\['all',markerFilter\('summary'\),\['==',\['get','interchange'\],true\]\]/);
  assert.match(code,/isSummary\?13\.7:15\.72/);
  assert.match(code,/'text-allow-overlap':false/);
});
test('transfer markers preserve two distinct circles spaced by their diameter',()=>{
  const data=metroMarkerGeojson([{kind:'subway',name:'노량진',lng:126.94,lat:37.51,lines:['1호선','9호선']}],{
    normalizeName:x=>x,normalizeLine:x=>x,placements:()=>[
      {line:'1호선',lng:126.94,lat:37.51},{line:'9호선',lng:126.9402,lat:37.51}
    ],colors:{'1호선':'#0052A4','9호선':'#B89B2F'},radiusPredicate:()=>true,isDistrict:()=>true
  });
  const far=data.features.filter(x=>x.properties.role==='summary');
  assert.equal(far.length,2);
  assert.ok(far.every(x=>x.properties.interchange));
  assert.deepEqual(far.map(x=>x.properties.iconOffset[0]),[-34,34]);
  assert.equal(far.filter(x=>x.properties.labelOn).length,1);
});
