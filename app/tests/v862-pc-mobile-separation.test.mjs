import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildingExtrusionAppearance,nativeBuildingExtrusion} from '../src/map-appearance.js';
import {applyBaseLandPalette,installMapThemeZoomGuard,getLatestMapInstance} from '../src/v862-map-theme-zoom-guard-core.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('map theme guard and night analysis retain their startup ordering',()=>{
  const html=read('index.html');
  assert.ok(html.indexOf('/src/v862-map-theme-zoom-guard.js')<html.indexOf('/src/main.js'));
  assert.ok(html.includes('/src/v862-night-analysis-session.js'));
});

test('PC and tablet do not mount separate layout trees; every viewport uses the shared app shell',()=>{
  const html=read('index.html');
  const main=read('src/main.js');
  const css=read('src/mobile-first-layout.css');
  assert.equal(html.includes('v862-pc-mobile-separation.js'),false);
  assert.equal(html.includes('v876-desktop-final.js'),false);
  assert.equal(main.includes('installDesktopSafetyRail('),false);
  assert.equal(main.includes('v881-tablet-'),false);
  assert.equal(main.includes('v912-desktop-poi.css'),false);
  assert.equal(main.includes('v913-pc-design-system.css'),false);
  assert.ok(main.includes("import './mobile-first-layout.css'"));
  assert.ok(css.includes('#bottom-nav:not([hidden])'));
  assert.ok(css.includes('position: fixed !important'));
  assert.ok(css.includes('grid-template-columns: repeat(5,minmax(0,1fr))'));
  assert.ok(css.includes('#dj-desktop-safety-rail'));
  assert.ok(css.includes('#dj-tablet-utility-group'));
});

test('dark map theme restores ground and 3D building colors after zoom',()=>{
  const guard=read('src/v862-map-theme-zoom-guard-core.js');
  const main=read('src/main.js');
  const appearance=read('src/map-appearance.js');
  assert.ok(guard.includes("role!=='ground'&&role!=='vegetation'"));
  assert.ok(guard.includes("theme==='dark'?'#2b3138':'#e1e4dc'"));
  assert.ok(main.includes('buildingExtrusionAppearance(theme,pitch'));
  assert.ok(main.includes('fill-extrusion-color'));
  assert.ok(main.includes('fill-extrusion-opacity'));
  assert.equal(buildingExtrusionAppearance('dark',10).opacity,0.94);
  assert.equal(buildingExtrusionAppearance('dark',30).opacity,0.89);
  assert.equal(buildingExtrusionAppearance('dark',30).color,'#525d66');
  assert.equal(nativeBuildingExtrusion({type:'fill-extrusion',id:'base-building','source-layer':'building'}),true);
  assert.equal(nativeBuildingExtrusion({type:'fill-extrusion',id:'dongjak-buildings-3d-01','source-layer':'building'}),false);
  assert.ok(appearance.includes('nearOpacity:0.94,farOpacity:0.89'));
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
    assert.equal(map.paints['background/background-color'],'#22272d');
    assert.equal(map.paints['landuse_residential/fill-color'],'#2b3138');
    assert.equal(map.paints['park/fill-color'],'#303c34');
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
  assert.ok(session.includes("app.dataset.tab!=='map'||app.classList.contains('map-safety-open')"));
  assert.ok(session.includes("button?.getAttribute('aria-pressed')==='true')button.click()"));
  assert.ok(session.includes("attributeFilter:['data-tab','class']"));
  assert.ok(session.includes("safetyToggle?.addEventListener('click',stop,true)"));
  assert.equal(runtime.includes('safetyWorkbenchToggle?.addEventListener'),false);
});
