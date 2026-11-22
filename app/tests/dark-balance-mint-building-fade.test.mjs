import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BUILDING_VISUAL_PALETTE,BUILDING_ZOOM_FADE_START,BUILDING_ZOOM_FADE_END,
  buildingZoomOpacityExpression,buildingExtrusionAppearance,buildingFootprintPaint,
  installBaseBuildingPalette} from '../src/map-appearance.js';
import {districtExteriorThemePaint} from '../src/ui-environment.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Balanced Dark is slightly deeper, while mint retains distinct selected/CTA roles',()=>{
  const css=read('src/theme-contract.css');
  const root=css.split(':root[data-theme="light"]')[1].split(':root[data-theme="dark"]')[0];
  const dark=css.split(':root[data-theme="dark"]')[1].split('/* Theme contract')[0];
  assert.match(root,/--dj-theme-bg:#edf3ef/);
  for(const token of ['--dj-theme-bg:#22282e','--dj-theme-surface:#2c343d','--dj-theme-raised:#35404a','--dj-theme-accent:#79dec5'])
    assert.ok(dark.includes(token),token);
  assert.match(css,/--dj-brand-mint-selected:#285b50/);
  assert.match(css,/--dj-brand-mint:#79dec5/);
  assert.match(read('public/manifest-dark.webmanifest'),/"theme_color": "#22282e"/);
  assert.match(read('src/mobile-pwa-status-tone-v793.css'),/--dj-pwa-native-edge:#22282e/);
});

test('Building geometry fades smoothly over two zoom levels, with near-opaque dark mass',()=>{
  assert.equal(BUILDING_ZOOM_FADE_START,13);
  assert.equal(BUILDING_ZOOM_FADE_END,15);
  assert.deepEqual(buildingZoomOpacityExpression(.58),['interpolate',['linear'],['zoom'],13,0,15,.58]);
  assert.equal(BUILDING_VISUAL_PALETTE.light.nearOpacity,.38);
  assert.equal(BUILDING_VISUAL_PALETTE.dark.nearOpacity,.94);
  assert.equal(BUILDING_VISUAL_PALETTE.dark.farOpacity,.89);
  assert.equal(buildingExtrusionAppearance('dark',10).opacity,.94);
  assert.equal(buildingExtrusionAppearance('dark',30).opacity,.89);
  assert.equal(buildingFootprintPaint('dark',0)['fill-opacity'],.74);
  const main=read('src/main.js');
  assert.match(main,/fill-extrusion-opacity':buildingZoomOpacityExpression\(buildingStyle.opacity\)/);
  assert.match(main,/fill-extrusion-opacity',buildingZoomOpacityExpression\(opacity\)/);
  assert.match(main,/minzoom:BUILDING_ZOOM_MIN/);
  assert.match(main,/BUILDING_ZOOM_MIN = BUILDING_ZOOM_FADE_START/);
  assert.match(main,/BUILDING_ZOOM_FADE_END,\['get','h'\]/);
  assert.doesNotMatch(main,/fill-extrusion-opacity':buildingStyle.opacity/);
});

test('Native 3D buildings fade on zoom without overriding light styling or unrelated overlays',()=>{
  const previous=globalThis.document;
  const changed=[];
  const style={layers:[
    {id:'native-building',type:'fill','source-layer':'building'},
    {id:'native-building-3d',type:'fill-extrusion','source-layer':'building'},
    {id:'dj-night-reach-fill',type:'fill'},
    {id:'walking-route-line',type:'line'}]};
  const map={
    getStyle:()=>style,getPitch:()=>0,
    getLayer:id=>style.layers.find(x=>x.id===id),
    getPaintProperty:(id,k)=>id==='native-building-3d'?(k==='fill-extrusion-color'?'#c4c8ca':.92):undefined,
    setPaintProperty:(id,k,v)=>changed.push([id,k,v]),
    on(){}
  };
  const app={dataset:{theme:'dark'}};
  try{
    globalThis.document={getElementById:()=>null};
    installBaseBuildingPalette({map,app});
    assert.ok(changed.some(([id,k,v])=>id==='native-building-3d'&&k==='fill-extrusion-opacity'&&JSON.stringify(v)===JSON.stringify(buildingZoomOpacityExpression(.89))));
    assert.ok(changed.some(([id,k,v])=>id==='native-building'&&k==='fill-opacity'&&JSON.stringify(v)===JSON.stringify(buildingZoomOpacityExpression(.74))));
    assert.ok(changed.every(([id])=>id!=='dj-night-reach-fill'&&id!=='walking-route-line'));
  }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});

test('Dark map land palette is muted with a mild district mask, without recoloring PRI or metro lines',()=>{
  const src=read('src/ui-environment.js');
  const zoom=read('src/v862-map-theme-zoom-guard-core.js');
  assert.deepEqual(districtExteriorThemePaint('dark'),{'fill-color':'#22272d','fill-opacity':.34});
  assert.match(src,/set\('background-color','#22272d'\)/);
  assert.match(src,/water\?'#273741':green\?'#303c34'/);
  assert.match(zoom,/role!=='ground'&&role!=='vegetation'/);
  assert.match(zoom,/\(theme==='dark'\?'#2b3138':'#e1e4dc'\)/);
  assert.match(read('src/theme-contract.css'),/never paint route-line, warning, PRI or transport/);
});
