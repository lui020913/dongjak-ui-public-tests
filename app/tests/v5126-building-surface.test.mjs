import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildingFootprintPaint,buildingFootprintOutlinePaint,nativeBuildingOutline,installBaseBuildingPalette} from '../src/map-appearance.js';
const source=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('수직 2D: 이전 테마 값과 무관하게 라이트 면 유지, 외곽선 비활성화',()=>{
  for(const theme of ['dark','light']){
    const paint=buildingFootprintPaint(theme,0);
    assert.equal(paint['fill-opacity'],1);
    assert.equal(paint['fill-antialias'],true);
    if(theme==='light'){assert.equal(paint['fill-color'],'#fafafa');assert.equal(paint['fill-outline-color'],'#e2e2e2');}
    assert.equal(buildingFootprintOutlinePaint(theme,0)['line-opacity'],0);
  }
  assert.deepEqual(buildingFootprintPaint('dark',0),buildingFootprintPaint('light',0));
});

test('기울인 3D: 2D 건물 면은 계속 흐려지고 3D 레이어는 별도 유지',()=>{
  assert.ok(buildingFootprintPaint('dark',55)['fill-opacity']<0.15);
  const main=source('src/main.js');
  assert.match(main,/buildingModeVisibility\(show\)/);
  assert.match(main,/'fill-extrusion-height'/);
  assert.match(main,/loadBuildingTileFeatures\(sheet\)/);
});

test('원본 건물 윤곽선만 숨김; 도로, 구역, 야간 조명 레이어는 유지',()=>{
  assert.ok(nativeBuildingOutline({type:'line',id:'building-outline'}));
  assert.ok(nativeBuildingOutline({type:'line',id:'boundary','source-layer':'building'}));
  assert.ok(!nativeBuildingOutline({type:'line',id:'road-outline'}));
  const layers=[
    {type:'fill',id:'building'},
    {type:'line',id:'building-outline'},
    {type:'line',id:'road-outline'},
    {type:'line',id:'district-border'},
    {type:'fill',id:'dj-night-reach-fill'}
  ];
  const changed=[];const callbacks={};let pitch=0;
  const map={getStyle:()=>({layers}),getLayer:()=>true,getPitch:()=>pitch,
    setPaintProperty:(...args)=>changed.push(args),on:(n,fn)=>callbacks[n]=fn};
  const prev=globalThis.document;globalThis.document={getElementById:()=>null};
  try{installBaseBuildingPalette({map,app:{dataset:{theme:'dark'}}});
    assert.ok(changed.some(([id,property,value])=>id==='building-outline'&&property==='line-opacity'&&value===0));
    assert.ok(changed.every(([id])=>!['road-outline','district-border','dj-night-reach-fill'].includes(id)));
    pitch=55;callbacks.pitch();
    assert.ok(changed.some(([id,property,value])=>id==='building-outline'&&property==='line-opacity'&&value===0));
  }finally{globalThis.document=prev;}
});
