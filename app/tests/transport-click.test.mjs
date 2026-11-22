import test from 'node:test';
import assert from 'node:assert/strict';
import {initTransportMap,normalizeStationQueryName} from '../src/transport-map.js';

class MockNode {
  constructor(){this.hidden=false;this.textContent='';this.children=[];this.listeners=new Map();this.dataset={};this.style={setProperty(){},removeProperty(){}};this.classList={toggle(){},add(){},remove(){}};}
  setAttribute(name,value){(this.attrs??=new Map()).set(name,value);}
  removeAttribute(name){this.attrs?.delete(name);}
  getAttribute(name){return this.attrs?.get(name)??null;}
  addEventListener(name,fn){this.listeners.set(name,fn);}
  replaceChildren(...items){this.children=items;}
  append(...items){this.children.push(...items);}
  click(){this.listeners.get('click')?.();}
}
function createHarness(){
  const elements=new Map();
  globalThis.document={
    getElementById(id){if(!elements.has(id))elements.set(id,new MockNode());return elements.get(id);},
    createElement(){return new MockNode();}
  };
  const style=[{id:'poi_transit',type:'symbol','source-layer':'poi'}];
  const listeners=[];const sources=new Map();
  const map={
    addSource(id,data){sources.set(id,{setData(value){this.data=value},data});},
    getSource(id){return sources.get(id);},
    addLayer(layer){style.push(layer);},
    getStyle(){return {layers:style};},
    getLayer(id){return style.find(layer=>layer.id===id);},
    on(type,layerOrListener,cb){listeners.push({type,layer:typeof layerOrListener==='string'?layerOrListener:null,fn:cb||layerOrListener});},
    getCanvas(){return {style:{cursor:''}};},
    queryRenderedFeatures(){return this.features||[];},
    project(){return {x:20,y:20};}
  };
  elements.set('transport-sheet',new MockNode());
  elements.get('transport-sheet').hidden=true;
  const feature={id:812,layer:{id:'poi_transit',type:'symbol','source-layer':'poi'},
    properties:{class:'bus','name:nonlatin':'상도동중앙하이츠.상도전통시장'},
    geometry:{type:'Point',coordinates:[126.951,37.502]}};
  return {map,elements,listeners,feature};
}
test('OSM 정류소 목록이 실패해도 배경 파란 버스 아이콘을 눌러 상세 패널이 열림',async()=>{
  const h=createHarness();
  globalThis.fetch=async()=>{throw new Error('overpass offline')};
  let opened=0;
  initTransportMap({map:h.map,isDongjak:()=>true,onOpen:()=>{opened++},onClose:()=>{},canOpen:()=>true});
  const click=h.listeners.find(l=>l.type==='click'&&l.layer==='poi_transit');
  assert.ok(click,'poi_transit 이벤트 핸들러 등록');
  assert.equal(h.listeners.filter(l=>l.type==='click'&&l.layer==='poi_transit').length,1,'중복 클릭 핸들러 없음');
  click.fn({point:{x:20,y:20},lngLat:{lng:126.951,lat:37.502},features:[h.feature],
    originalEvent:{stopPropagation(){}}});
  assert.equal(h.elements.get('transport-sheet').hidden,false);
  assert.equal(h.elements.get('transport-title').textContent,'상도동중앙하이츠.상도전통시장');
  assert.equal(opened,1);
  h.elements.get('transport-close').click();
  assert.equal(h.elements.get('transport-sheet').hidden,true);
  h.map.features=[h.feature];
  const fallback=h.listeners.find(l=>l.type==='click'&&l.layer===null);
  fallback.fn({point:{x:20,y:20},lngLat:{lng:126.951,lat:37.502},originalEvent:{stopPropagation(){}}});
  assert.equal(h.elements.get('transport-sheet').hidden,false);
  assert.equal(opened,2);
  // pending async failing fetch should settle without throwing.
  await Promise.resolve();
});

test('rapid transport replacement cancels the outgoing fade and stale close completion',async()=>{
  const previousWindow=globalThis.window;
  const handlers=new Map();
  let pendingClose=null,cancelled=0;
  globalThis.window={
    addEventListener(type,fn){handlers.set(type,fn);},
    DongjakWindowMotion:{
      close(_panel,finish){pendingClose=finish;},
      cancel(){cancelled++;}
    }
  };
  try{
    const h=createHarness();
    globalThis.fetch=async()=>{throw new Error('overpass offline')};
    initTransportMap({map:h.map,isDongjak:()=>true,
      onOpen:()=>{},onClose:()=>{},canOpen:()=>true});
    const openSaved=handlers.get('dongjak:open-saved-transport');
    assert.equal(typeof openSaved,'function');
    const first={kind:'bus',name:'첫 번째 정류장',lng:126.951,lat:37.502,arsId:'20240'};
    const second={kind:'bus',name:'두 번째 정류장',lng:126.947,lat:37.509,arsId:'20241'};
    openSaved({detail:{place:first}});
    assert.equal(h.elements.get('transport-sheet').hidden,false);
    h.elements.get('transport-close').click();
    assert.equal(typeof pendingClose,'function');
    openSaved({detail:{place:second}});
    assert.equal(h.elements.get('transport-sheet').hidden,false);
    const closedBefore=pendingClose;
    closedBefore(); // A cancelled animation races a newly opened sheet.
    assert.equal(h.elements.get('transport-sheet').hidden,false,'stale close must not dismiss the new station');
    assert.ok(cancelled>=2,'both new selections clear any old animation owner');
    // Complete the *current* close as well, so mock fetch/callback work does
    // not outlive the test fixture and leak into subsequent independent tests.
    h.elements.get('transport-close').click();
    pendingClose?.();
    await new Promise(resolve=>setTimeout(resolve,25));
  }finally{
    if(previousWindow===undefined)delete globalThis.window;
    else globalThis.window=previousWindow;
  }
});

test('지하철 역명은 공식 API에서 사용하는 역명으로 정규화',()=>{
  assert.equal(normalizeStationQueryName('노량진역'),'노량진');
  assert.equal(normalizeStationQueryName('사당역 (2호선)'),'사당');
  assert.equal(normalizeStationQueryName('숭실대입구'),'숭실대입구');
});
