import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BUILDING_VISUAL_PALETTE,BUILDING_ZOOM_FADE_START,BUILDING_ZOOM_FADE_END,
  buildingZoomOpacityExpression,buildingExtrusionAppearance,buildingFootprintPaint,nativeBuildingFootprintPaint,
  installBaseBuildingPalette} from '../src/map-appearance.js';
import {districtExteriorThemePaint} from '../src/ui-environment.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Light palette retains distinct selected/CTA roles and a matching status edge',()=>{
  const css=read('src/theme-contract.css');
  const root=css.split(':root[data-theme="light"]')[1].split('}')[0];
  for(const token of ['--dj-theme-bg:#edf3ef','--dj-theme-surface:#ffffff','--dj-theme-raised:#e9f2ed'])
    assert.ok(root.includes(token),token);
  assert.match(css,/--dj-theme-selected:#e1ecec/);
  assert.match(css,/--dj-theme-accent:#0d8875/);
  assert.doesNotMatch(css,/data-theme="dark"|color-scheme:dark/);
  assert.match(read('public/manifest-light.webmanifest'),/"theme_color": "#edf3ef"/);
  const status=read('src/mobile-pwa-status-tone-v793.css');
  assert.match(status,/--dj-pwa-native-edge:#edf3ef/);
  assert.doesNotMatch(status,/--dj-pwa-native-edge:#22282e|data-theme=/);
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
  // A complete loaded sheet, not theme paint opacity, owns visibility in both modes.
  assert.ok(main.includes("const desired=info.owned&&fillVisible?modeVisibility.plan:'none';"));
  assert.ok(main.includes("const desired=info.owned?modeVisibility.extrusion:'none';"));
  assert.ok(main.includes("layout:{visibility:'none'},paint:footprintStyle"));
  assert.ok(main.includes("layout:{visibility:'none'},\n      paint:{'fill-extrusion-color':buildingStyle.color".replace('\\n','\n')));
  assert.ok(read('src/ui-environment.js').includes("map.setPaintProperty(layer.id,'fill-extrusion-opacity',buildingZoomOpacityExpression(appearance.opacity));"));
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
    assert.ok(changed.some(([id,k,v])=>id==='native-building'&&k==='fill-opacity'&&JSON.stringify(v)===JSON.stringify(nativeBuildingFootprintPaint('dark')['fill-opacity'])));
    assert.ok(changed.every(([id])=>id!=='dj-night-reach-fill'&&id!=='walking-route-line'));
  }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});

test('Light map land palette and district mask preserve PRI and metro semantics',()=>{
  const src=read('src/ui-environment.js');
  const zoom=read('src/v862-map-theme-zoom-guard-core.js');
  assert.deepEqual(districtExteriorThemePaint('light'),{'fill-color':'#d8e0e3','fill-opacity':.65});
  assert.match(src,/set\('background-color',entry.landRole==='ground'\?'#e7e7e5'/);
  assert.doesNotMatch(src,/water\?'#273741':green\?'#303c34'/);
  assert.match(zoom,/role!=='ground'&&role!=='vegetation'/);
  assert.match(zoom,/role==='ground'\?'#e7e7e5':'#a5ca92'/);
  assert.match(read('src/theme-contract.css'),/never paint route-line, warning, PRI or transport/);
});
