import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {installNightVisibility,NIGHT_VISUAL_PALETTE} from '../src/night-visibility-map.js';
class FakeEl{
  constructor(id=''){this.id=id;this.hidden=false;this.checked=true;this.value='20';this.textContent='';this.dataset={};this.attributes={};this.listeners={};this.children=[];this.classList={remove(){}};}
  setAttribute(key,value){this.attributes[key]=String(value);}
  addEventListener(name,fn){(this.listeners[name]??=[]).push(fn);}
  dispatch(name){for(const fn of this.listeners[name]||[])fn({target:this});}
  replaceChildren(...nodes){this.children=nodes;}
  append(...nodes){for(const node of nodes){if(node.parentElement)node.parentElement.children=node.parentElement.children.filter(child=>child!==node);this.children.push(node);node.parentElement=this;}}
  getAttribute(name){return this.attributes[name];}
}
class FakeMap{
  constructor(){this.sources={};this.layers={};this.handlers={};this.zoom=12;this.center={lng:126.94,lat:37.49};this._style={layers:[]};this.canvas={style:{}};}
  getStyle(){return this._style;}
  getSource(id){return this.sources[id]||null;}
  addSource(id,desc){this.sources[id]={data:desc.data,setData(d){this.data=d;},getData:async()=>this.sources[id].data};}
  addLayer(layer){this.layers[layer.id]={...layer,layout:{...layer.layout}};this._style.layers.push({id:layer.id,type:layer.type});}
  getLayer(id){return this.layers[id]||null;}
  setLayoutProperty(id,key,value){this.layers[id].layout[key]=value;}
  setFilter(id,filter){this.layers[id].filter=filter;}
  on(name,layerOrCb,cb){(this.handlers[name]??=[]).push(cb||layerOrCb);}
  getZoom(){return this.zoom;}
  getCenter(){return this.center;}
  flyTo({center,zoom}){this.center={lng:center[0],lat:center[1]};this.zoom=zoom;}
  easeTo({center,zoom}){this.center={lng:center[0],lat:center[1]};this.zoom=zoom;}
  getCanvas(){return this.canvas;}
}
class Popup{
  setLngLat(x){this.position=x;return this;}
  setDOMContent(x){this.content=x;return this;}
  addTo(){return this;}
  remove(){}
}
const wait=async predicate=>{
  for(let i=0;i<60;i++){
    if(predicate())return;
    await new Promise(resolve=>setTimeout(resolve,5));
  }
  assert.fail('비동기 야간 시야 로드를 완료하지 못함');
};
test('지도 켜기→도로 분석→반경 조정→끔의 레이어 생명주기',async()=>{
  const saved={document:globalThis.document,fetch:globalThis.fetch,MutationObserver:globalThis.MutationObserver};
  const ids=['night-visibility-toggle','night-visibility-controls','night-visibility-quick-off',
    'night-visibility-radius','night-visibility-radius-value','night-visibility-exclude-major',
    'night-visibility-show-alley','night-visibility-show-path','night-visibility-status',
    'night-visibility-stats','night-visibility-top','night-visibility-float',
    'night-visibility-float-slot','night-visibility-float-content',
    'night-visibility-float-collapse','night-visibility-float-stop'];
  const nodes=Object.fromEntries(ids.map(id=>[id,new FakeEl(id)]));
  nodes['night-visibility-show-path'].checked=true;
  nodes['night-visibility-show-alley'].checked=true;
  nodes['night-visibility-radius'].checked=true;
  nodes['night-visibility-radius'].value='20';
  const origin=new FakeEl('night-section');origin.append(nodes['night-visibility-controls']);
  const street=JSON.parse(readFileSync(new URL('../public/data/sangdo1-night/lights.json',import.meta.url),'utf8'));
  const security=JSON.parse(readFileSync(new URL('../public/data/sangdo1-night/security.json',import.meta.url),'utf8'));
  const occlusionReach=JSON.parse(readFileSync(new URL('../public/data/sangdo1-night/occlusion-light-reach.geojson',import.meta.url),'utf8'));
  const occlusionRoads=JSON.parse(readFileSync(new URL('../public/data/sangdo1-night/occlusion-road-samples.json',import.meta.url),'utf8'));
  try{
    globalThis.document={getElementById:id=>nodes[id]||null,createElement:tag=>new FakeEl(tag)};
    globalThis.MutationObserver=class{observe(){}};
    globalThis.fetch=async url=>{
      const name=String(url);
      if(name.endsWith('/lights.json'))return {ok:true,json:async()=>street};
      if(name.endsWith('/security.json'))return {ok:true,json:async()=>security};
      if(name.endsWith('/occlusion-light-reach.geojson'))return {ok:true,json:async()=>occlusionReach};
      if(name.endsWith('/occlusion-road-samples.json'))return {ok:true,json:async()=>occlusionRoads};
      if(name.startsWith('https://overpass'))return {ok:true,json:async()=>({elements:[
        {type:'way',id:101,tags:{highway:'residential',name:'가상 보행로'},geometry:[
          {lat:37.5013,lon:126.95},{lat:37.5017,lon:126.95}]},
        {type:'way',id:102,tags:{highway:'footway',name:'가상 산책로'},geometry:[
          {lat:37.5013,lon:126.9505},{lat:37.5017,lon:126.9505}]}
      ]})};
      throw new Error(`알 수 없는 URL: ${name}`);
    };
    const map=new FakeMap();
    const app=new FakeEl('app');app.dataset.tab='map';
    map.sources['dongjak-admin-dongs']={getData:async()=>({features:[{
      properties:{dong_name:'상도1동'},geometry:{type:'Polygon',coordinates:[[
        [126.93,37.49],[126.97,37.49],[126.97,37.52],[126.93,37.52],[126.93,37.49]
      ]]}
    }]})};
    let currentTheme='light';
    const themes=[];
    const theme={currentTheme:()=>currentTheme,setTemporaryTheme(value){currentTheme=value??'light';themes.push(value);}};
    const view=installNightVisibility({map,maplibregl:{Popup},app,theme});
    assert.equal(view.isEnabled(),false);
    assert.equal(nodes['night-visibility-quick-off'].hidden,false);
    nodes['night-visibility-quick-off'].dispatch('click');
    await wait(()=>nodes['night-visibility-status'].textContent.includes('행정경계'));
    assert.equal(view.isEnabled(),true);
    assert.equal(nodes['night-visibility-float'].hidden,false);
    assert.equal(nodes['night-visibility-controls'].parentElement,nodes['night-visibility-float-slot']);
    assert.equal(nodes['night-visibility-float-content'].hidden,true);
    assert.equal(nodes['night-visibility-float'].dataset.collapsed,'true');
    assert.equal(nodes['night-visibility-float-collapse'].attributes['aria-expanded'],'false');
    assert.equal(nodes['night-visibility-quick-off'].hidden,false,'활성화 중에도 야간 해제 버튼을 유지');
    nodes['night-visibility-float-collapse'].dispatch('click');
    assert.equal(nodes['night-visibility-float-content'].hidden,false);
    nodes['night-visibility-float-collapse'].dispatch('click');
    assert.equal(nodes['night-visibility-float-content'].hidden,true);
    assert.equal(nodes['night-visibility-quick-off'].attributes['aria-pressed'],'true');
    assert.deepEqual(themes,['dark']);
    assert.equal(currentTheme,'dark');
    assert.equal(nodes['night-visibility-toggle'].attributes['aria-pressed'],'true');
    assert.equal(map.layers['dj-night-light-point'].layout.visibility,'none');
    assert.equal(map.layers['dj-night-area-fill'].paint['fill-opacity'],NIGHT_VISUAL_PALETTE.dimOpacity);
    assert.equal(map.layers['dj-night-light-glow'].paint['fill-opacity'],0.40);
    assert.equal(map.layers['dj-night-glow-outline'].layout.visibility,'none');
    assert.equal(map.layers['dj-night-dark-alley-casing'].layout.visibility,'none');
    assert.equal(map.layers['dj-night-reach-fill'].layout.visibility,'none');
    assert.equal(map.layers['dj-night-reach-outline'].layout.visibility,'none');
    assert.equal(map.layers['dj-night-occ-casing-clear'].layout.visibility,'visible');
    assert.equal(map.layers['dj-night-occ-clear'].paint['line-color'],NIGHT_VISUAL_PALETTE.clear);
    assert.equal(map.layers['dj-night-occ-casing-blocked'].filter[1][2],'blocked');
    assert.equal(map.layers['dj-night-occ-casing-outside'].filter[1][2],'outside');
    assert.equal(map.layers['dj-night-occ-outside'].paint['line-dasharray'],undefined);
    assert.equal(map.layers['dj-night-occ-uncertain'].paint['line-dasharray'],undefined);

    assert.equal(map.sources['dj-night-lights'].data.features.length,419);
    assert.equal(map.sources['dj-night-glow'].data.features.length,419);
    assert.equal(map.layers['dj-night-dark-alley'].layout.visibility,'none');
    nodes['night-visibility-show-path'].checked=false;
    nodes['night-visibility-show-path'].dispatch('input');
    assert.equal(map.layers['dj-night-dark-path'].layout.visibility,'none');
    assert.equal(map.layers['dj-night-dark-path-casing'].layout.visibility,'none');
    assert.equal(map.layers['dj-night-occ-blocked'].filter[2][2],false,'보행로 미표시 설정은 차폐 분석선에도 적용');
    nodes['night-visibility-radius'].value='35';
    nodes['night-visibility-radius'].dispatch('input');
    assert.equal(nodes['night-visibility-radius-value'].textContent,'35 m');
    nodes['night-visibility-float-stop'].dispatch('click');
    assert.equal(view.isEnabled(),false);
    assert.equal(nodes['night-visibility-quick-off'].attributes['aria-pressed'],'false');
    assert.equal(nodes['night-visibility-quick-off'].hidden,false);
    assert.equal(nodes['night-visibility-float'].hidden,true);
    assert.equal(nodes['night-visibility-controls'].parentElement,origin);
    assert.deepEqual(themes,['dark',null]);
    assert.equal(currentTheme,'light');
    assert.equal(map.layers['dj-night-light-point'].layout.visibility,'none');
    assert.equal(map.layers['dj-night-light-glow'].layout.visibility,'none');
    assert.equal(map.layers['dj-night-glow-outline'].layout.visibility,'none');
    assert.equal(app.dataset.sangdoNight,'off');
  }finally{
    globalThis.document=saved.document;
    globalThis.fetch=saved.fetch;
    globalThis.MutationObserver=saved.MutationObserver;
  }
});
