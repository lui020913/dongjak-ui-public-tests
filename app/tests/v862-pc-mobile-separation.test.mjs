import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildingExtrusionAppearance,nativeBuildingExtrusion} from '../src/map-appearance.js';
import {applyBaseLandPalette,installMapThemeZoomGuard,getLatestMapInstance} from '../src/v862-map-theme-zoom-guard-core.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('v8.6.3 loads the theme guard before map initialization and PC separation after mobile rules',()=>{
  const html=read('index.html');
  assert.ok(html.indexOf('/src/v862-map-theme-zoom-guard.js')<html.indexOf('/src/main.js'));
  assert.ok(html.indexOf('/src/v862-pc-mobile-separation.js')>html.indexOf('/src/v861-mobile-sheet-repair.js'));
  assert.match(read('src/v862-pc-mobile-separation.js'),/v862-pc-mobile-separation\.css/);
  assert.doesNotMatch(read('src/v862-pc-mobile-separation.js'),/import ['\"]\.\/v862-transit-share/);
  assert.ok(html.includes('/src/v862-night-analysis-session.js'));
  assert.match(read('src/v862-map-theme-zoom-guard-core.js'),/type==='zoomend'\|\|type==='style\.load'\|\|type==='pitchend'/);
});

test('desktop baseline is restored from v8.5.6 while tablet and phone use distinct width bands',()=>{
  const css=read('src/v862-pc-mobile-separation.css');
  const rail=read('src/v713-desktop-rail.js');
  const v856=read('src/v856-ui-completion.js');
  assert.match(css,/@media \(min-width:1080px\)/);
  assert.match(css,/grid-template-columns:56px minmax\(0,1fr\) auto/);
  assert.match(css,/@media \(min-width:700px\) and \(max-width:1079px\)/);
  assert.match(css,/@media \(max-width:699px\)/);
  assert.match(rail,/desktopActive=\(\)=>window\.innerWidth>=minWidth/);
  assert.doesNotMatch(rail,/finePointer/);
  assert.match(v856,/\(min-width:1080px\)/);
});

test('desktop and tablet search suggestions are anchored to the search lane and width-bounded',()=>{
  const css=read('src/v862-pc-mobile-separation.css');
  assert.match(css,/map-quick-search-dropdown:not\(\[hidden\]\)\{[\s\S]*?left:0!important[\s\S]*?width:min\(680px,calc\(100vw - 120px\)\)/);
  assert.match(css,/@media \(min-width:700px\) and \(max-width:1079px\)[\s\S]*?width:min\(640px,calc\(100vw - 88px\)\)/);
  assert.doesNotMatch(css,/left:-80px!important/);
});

test('desktop transit header order is start, destination, centered favorite, share, close',()=>{
  const transit=read('src/v8215-news-metro-compact-header.js');
  const share=read('src/transport-map.js');
  const header=read('src/v8215-news-metro-compact-header.js');
  const css=read('src/v862-pc-mobile-separation.css');
  assert.match(transit,/actionRow\.append\(start,end\)/);
  assert.match(transit,/actionRow\.append\(bookmark\)/);
  assert.match(share,/transportShare\.id='transport-share-place'/);
  assert.match(header,/actionRow\.append\(share\)/);
  assert.match(share,/const url=placeShareUrl\(place\)/);
  assert.match(css,/\.dj-news-transport-bookmark,[\s\S]*?\.dj-news-transport-share\{[\s\S]*?place-items:center/);
  assert.match(css,/transport-panel-head #transport-close\{[\s\S]*?right:6px!important/);
});

test('bus body is a dedicated adaptive route-card grid and metro neighbors have more header spacing',()=>{
  const css=read('src/v862-pc-mobile-separation.css');
  assert.match(css,/data-kind="bus"] #transport-arrivals\{[\s\S]*?repeat\(auto-fit,minmax\(230px,1fr\)\)/);
  assert.match(css,/data-kind="bus"] #transport-arrivals \.transport-arrival-row\{[\s\S]*?min-height:78px/);
  assert.match(css,/data-kind="bus"] #transport-neighbors\{display:none/);
  assert.match(css,/#transport-neighbors:not\(:empty\)\{[\s\S]*?margin:22px 0 17px/);
});

test('dark map theme reapplies ground and 3D building colors after zoom',()=>{
  const guard=read('src/v862-map-theme-zoom-guard-core.js');
  const main=read('src/main.js');
  const appearance=read('src/map-appearance.js');
  assert.match(guard,/role!=='ground'&&role!=='vegetation'/);
  assert.match(guard,/theme==='dark'\?'#253137':'#e1e4dc'/);
  assert.match(main,/map\.on\('zoomend',\(\)=>\{syncTiltWithBuildings\(\);scheduleBuildingLoad\(\);\}\)/);
  assert.match(main,/buildingExtrusionAppearance\(theme,pitch/);
  assert.match(main,/fill-extrusion-color/);
  assert.match(main,/fill-extrusion-opacity/);
  assert.equal(buildingExtrusionAppearance('dark',10).opacity,0.88);
  assert.equal(buildingExtrusionAppearance('dark',30).opacity,0.82);
  assert.equal(buildingExtrusionAppearance('dark',30).color,'#30464d');
  assert.equal(nativeBuildingExtrusion({type:'fill-extrusion',id:'base-building','source-layer':'building'}),true);
  assert.equal(nativeBuildingExtrusion({type:'fill-extrusion',id:'dongjak-buildings-3d-01','source-layer':'building'}),false);
  assert.match(appearance,/nearOpacity:0\.88,farOpacity:0\.82/);
});

test('MapLibre zoom guard restores only base-map ground and vegetation and preserves the map instance',()=>{
  const previousRaf=globalThis.requestAnimationFrame;
  const previousCaf=globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame=callback=>{callback();return 1;};
  globalThis.cancelAnimationFrame=()=>{};
  class FakeMap{
    constructor(){
      this.events=[];this.paints={};
      this.layers=[
        {id:'background',type:'background'},
        {id:'landuse_residential',type:'fill'},
        {id:'park',type:'fill'},
        {id:'road-primary',type:'fill'},
        {id:'water',type:'fill'},
        {id:'building',type:'fill','source-layer':'building'},
        {id:'dj-night-reach-fill',type:'fill'}
      ];
    }
    fire(event){this.events.push(event);return this;}
    isStyleLoaded(){return true;}
    getStyle(){return {layers:this.layers};}
    getLayer(id){return this.layers.find(layer=>layer.id===id)||null;}
    getPaintProperty(id,key){return this.paints[`${id}/${key}`];}
    setPaintProperty(id,key,value){this.paints[`${id}/${key}`]=value;}
  }
  const app={dataset:{theme:'dark'}};
  const cleanup=installMapThemeZoomGuard({MapClass:FakeMap,app});
  const map=new FakeMap();
  try{
    assert.equal(map.fire('zoomend'),map);
    assert.equal(getLatestMapInstance(),map);
    assert.equal(map.paints['background/background-color'],'#142128');
    assert.equal(map.paints['landuse_residential/fill-color'],'#253137');
    assert.equal(map.paints['park/fill-color'],'#34583e');
    assert.equal(map.paints['road-primary/fill-color'],undefined);
    assert.equal(map.paints['water/fill-color'],undefined);
    assert.equal(map.paints['building/fill-color'],undefined);
    assert.equal(map.paints['dj-night-reach-fill/fill-color'],undefined);
    assert.equal(applyBaseLandPalette(map,app),0);
  }finally{
    cleanup();
    if(previousRaf===undefined)delete globalThis.requestAnimationFrame;else globalThis.requestAnimationFrame=previousRaf;
    if(previousCaf===undefined)delete globalThis.cancelAnimationFrame;else globalThis.cancelAnimationFrame=previousCaf;
  }
});

test('night analysis closes when leaving the map and when opening the pedestrian safety workbench',()=>{
  const session=read('src/v862-night-analysis-session.js');
  const runtime=read('src/night-visibility-map.js');
  assert.match(session,/app\.dataset\.tab!=='map'\|\|app\.classList\.contains\('map-safety-open'\)/);
  assert.match(session,/button\?\.getAttribute\('aria-pressed'\)==='true'\)button\.click\(\)/);
  assert.match(session,/attributeFilter:\['data-tab','class'\]/);
  assert.match(session,/safetyToggle\?\.addEventListener\('click',stop,true\)/);
  assert.doesNotMatch(runtime,/safetyWorkbenchToggle\?\.addEventListener/);
});
