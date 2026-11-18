import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildingFootprintPaint,buildingFootprintOutlinePaint} from '../src/map-appearance.js';
import {selectDongjakAdminFeatures} from '../src/admin-dong-layer.js';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('same official admin dataset is shared; lighting hull is never an accepted night boundary',()=>{
  const night=read('src/night-visibility-map.js');
  const admin=read('src/admin-dong-layer.js');
  assert.match(admin,/export async function getSangdo1Boundary/);
  assert.match(admin,/getDongjakAdminFeatures/);
  assert.match(night,/getSangdoBoundary\(map\)/);
  assert.doesNotMatch(night,/scope=boundary\|\|/);
  assert.doesNotMatch(night,/inflate\(hull\(positions\)/);
  assert.match(night,/p\.inScope=inGeometry\(p\.lon,p\.lat,boundary\)/);
  assert.match(night,/dj-night-outside-shield/);
  const filtered=selectDongjakAdminFeatures({features:[
    {properties:{sggcd:'11590',emdnm:'상도1동',emdcd:'115901'},geometry:{type:'Polygon',coordinates:[]}},
    {properties:{sggcd:'11110',emdnm:'가회동'},geometry:{type:'Polygon',coordinates:[]}}
  ]});
  assert.deepEqual(filtered.map(x=>x.properties.dong_name),['상도1동']);
});

test('GIS base and supplement footprints are drawn independently of the 3D pitch threshold',()=>{
  const main=read('src/main.js');
  assert.match(main,/function visibleBuilding2D/);
  assert.match(main,/footprintFillId=`dongjak-buildings-footprint-/);
  assert.match(main,/footprintLineId=`dongjak-buildings-outline-/);
  assert.match(main,/minzoom:BUILDING_ZOOM_MIN/);
  assert.match(main,/filter:\['==',\['get','_render3d'\],true\]/);
  assert.match(main,/loadBuildingTileFeatures\(sheet\)/);
  assert.match(main,/theme-toggle'\)\?\.addEventListener\('click'/);
});

test('light/dark footprint colors differ and roof edges recede on oblique view',()=>{
  const a=buildingFootprintPaint('light',0),b=buildingFootprintPaint('dark',0);
  assert.notEqual(a['fill-color'],b['fill-color']);
  assert.ok(a['fill-opacity']>.7 && b['fill-opacity']>.7);
  for(const theme of ['light','dark']){
    const top=buildingFootprintOutlinePaint(theme,0),tilted=buildingFootprintOutlinePaint(theme,55);
    assert.equal(top['line-opacity'],0);
    assert.ok(tilted['line-opacity']<=.12);
  }
});

test('PC overview defaults expanded; clear action is independent; night card matches safety theme',()=>{
  const main=read('src/main.js'),html=read('index.html'),panel=read('src/night-visibility-panel.css'),style=read('src/style.css');
  assert.match(main,/overviewSheetState = 'expanded'/);
  assert.match(main,/overviewWasManuallyToggled=true/);
  assert.match(html,/id="overview-admin-clear"/);
  assert.match(main,/overviewAdminClear\?\.addEventListener/);
  assert.match(panel,/#app\[data-theme="dark"\] #night-visibility-float \.night-visibility-float-head/);
  assert.match(style,/data-sangdo-night="on"/);
  assert.match(style,/data-sheet-state="collapsed"\] \.overview-boundary-actions/);
});
