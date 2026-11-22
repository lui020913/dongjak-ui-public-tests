import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildingPlanVisibility,buildingFootprintPaint,buildingFootprintOutlinePaint} from '../src/map-appearance.js';
import {promoteNightAnalysisLayers,NIGHT_FOREGROUND_LAYERS,NIGHT_VISUAL_PALETTE} from '../src/night-visibility-map.js';
import {buildNightRoadVertices,createNightMapRoadLayer,shouldRenderNightRoadInMap,NIGHT_GL_LAYER_ID} from '../src/night-map-roads-gl.js';
import {analyzeOcclusion,occlusionLineFeatures} from '../src/night-occlusion.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('light overhead remains opaque, dark footprints translucent; 2D plan stops at 3D pitch',()=>{
  assert.equal(buildingPlanVisibility(0),1);
  assert.equal(buildingPlanVisibility(3),1);
  assert.ok(buildingPlanVisibility(12)<0.26);
  assert.equal(buildingPlanVisibility(19),0);
  assert.equal(buildingPlanVisibility(45),0);
  for(const theme of ['light','dark']){
    assert.equal(buildingFootprintPaint(theme,0)['fill-opacity'],theme==='dark'?0.74:1);
    assert.equal(buildingFootprintPaint(theme,35)['fill-opacity'],0);
    assert.equal(buildingFootprintOutlinePaint(theme,35)['line-opacity'],0);
  }
  const main=read('src/main.js');
  assert.match(main,/visibleBuilding2D\(\) && \(movementIsSlow \|\| buildingPlanVisibility\(pitch\)>0\)/);
  assert.match(main,/movementIsSlow\?\{'fill-opacity':0\.65\}/);
  assert.match(main,/promoteNightAnalysisLayers\(map\)/);
});

test('road stroke layers are re-ordered above new buildings and kept above light coverage',()=>{
  const base=['road','dj-night-reach-fill', ...NIGHT_FOREGROUND_LAYERS.slice(0,4), '3d-building','legend'];
  const layers=base.map(id=>({id}));
  const map={getStyle:()=>({layers}),getLayer:id=>layers.find(x=>x.id===id)||null,
    moveLayer(id){const i=layers.findIndex(x=>x.id===id);layers.push(...layers.splice(i,1));}};
  assert.equal(promoteNightAnalysisLayers(map),true);
  const available=NIGHT_FOREGROUND_LAYERS.filter(id=>base.includes(id));
  assert.deepEqual(layers.slice(-available.length).map(x=>x.id),available);
  assert.equal(promoteNightAnalysisLayers(map),false,'avoid reordering on every idle frame');
});

test('offline road dataset supplies clear, obstructed, and out-of-range segments',()=>{
  const roads=JSON.parse(read('public/data/sangdo1-night/occlusion-road-samples.json'));
  const segments=occlusionLineFeatures(analyzeOcclusion(roads.lines,20,5).segments).features;
  const counts=segments.reduce((acc,f)=>(acc[f.properties.category]=(acc[f.properties.category]||0)+1,acc),{});
  assert.ok(counts.clear>50);
  assert.ok(counts.outside>100);
  assert.ok(counts.blocked>0);
  assert.ok(segments.some(f=>f.properties.kind==='path'));
  assert.ok(segments.some(f=>f.properties.kind==='alley'));
});

test('native MapLibre WebGL road layer produces three styles, without a screen canvas',()=>{
  const oldDocument=globalThis.document;
  const calls=[];
  const map={pitch:40,zoom:16,
    getPitch(){return this.pitch;},getZoom(){return this.zoom;},
    getCanvas:()=>({clientWidth:500}),triggerRepaint(){calls.push('repaint');}};
  const features=['clear','outside','blocked','uncertain'].map((category,i)=>({
    type:'Feature',properties:{category,kind:i===1?'path':'alley'},
    geometry:{type:'LineString',coordinates:[[126.95,37.50+i*0.001],[126.9501,37.5001+i*0.001]]}
  }));
  const vertices=buildNightRoadVertices({occlusion:true,occ:features},NIGHT_VISUAL_PALETTE);
  assert.equal(vertices.vertices.length,4*6*13,'four lines, six vertices per segment');
  assert.ok(vertices.count.clear>0&&vertices.count.alleyUnlit>0&&vertices.count.pathUnlit>0);
  assert.equal(shouldRenderNightRoadInMap(40,16),true);
  assert.equal(shouldRenderNightRoadInMap(0,16),false);
  const funcs=new Map();let fnId=0;
  const gl={VERTEX_SHADER:35633,FRAGMENT_SHADER:35632,COMPILE_STATUS:35713,LINK_STATUS:35714,
    ARRAY_BUFFER:34962,DYNAMIC_DRAW:35048,FLOAT:5126,BLEND:3042,SRC_ALPHA:770,ONE_MINUS_SRC_ALPHA:771,TRIANGLES:4,
    drawingBufferWidth:1000,drawingBufferHeight:700,
    createShader:()=>({}),shaderSource(){},compileShader(){},getShaderParameter:()=>true,deleteShader(){},
    createProgram:()=>({}),attachShader(){},linkProgram(){},getProgramParameter:()=>true,deleteProgram(){},
    createBuffer:()=>({}),deleteBuffer(){},bindBuffer(){},bufferData(_target,data){calls.push(['buffer',data.length]);},
    getAttribLocation(_program,name){if(!funcs.has(name))funcs.set(name,fnId++);return funcs.get(name);},
    useProgram(){},enableVertexAttribArray(){},vertexAttribPointer(){},disableVertexAttribArray(){},
    getUniformLocation(_p,name){return name;},uniformMatrix4fv(){},uniform2f(){},uniform1f(){},
    enable(){},blendFunc(){},drawArrays(_mode,_start,count){calls.push(['draw',count]);}};
  globalThis.document={createElement(){throw Error('HTML canvas is forbidden for native road rendering');}};
  try{
    const native=createNightMapRoadLayer(map,NIGHT_VISUAL_PALETTE);
    assert.equal(native.layer.type,'custom');
    assert.equal(native.layer.renderingMode,'3d');
    assert.equal(native.layer.id,NIGHT_GL_LAYER_ID);
    native.update({enabled:true,occlusion:true,alley:true,path:true,occ:features});
    native.layer.onAdd(map,gl);
    assert.equal(native.isReady(),true);
    assert.equal(native.isActive(),true);
    native.layer.render(gl,{defaultProjectionData:{mainMatrix:new Float32Array(16)}});
    assert.deepEqual(calls.filter(x=>Array.isArray(x)&&x[0]==='draw').map(x=>x[1]),[24,24]);
    assert.ok(calls.some(x=>Array.isArray(x)&&x[0]==='buffer'&&x[1]===4*6*13));
    map.pitch=0;
    assert.equal(native.isActive(),false);
    native.layer.render(gl,{defaultProjectionData:{mainMatrix:new Float32Array(16)}});
    assert.equal(calls.filter(x=>Array.isArray(x)&&x[0]==='draw').length,2,'2D views use native standard line layers');
    native.layer.onRemove(map,gl);
    assert.equal(native.isReady(),false);
  }finally{globalThis.document=oldDocument;}
});

test('terrain elevation is encoded in native map vertex coordinates',()=>{
  const feature={type:'Feature',properties:{kind:'alley',category:'clear'},geometry:{type:'LineString',
    coordinates:[[126.95,37.5],[126.9501,37.5001]]}};
  const sea=buildNightRoadVertices({occlusion:true,occ:[feature]},NIGHT_VISUAL_PALETTE);
  const high=buildNightRoadVertices({occlusion:true,occ:[feature]},NIGHT_VISUAL_PALETTE,()=>100);
  assert.equal(sea.vertices[2],0);
  assert.ok(high.vertices[2]>0&&high.vertices[5]>0);
  assert.equal(high.vertices.length,sea.vertices.length);
});

test('the startup screen omits duplicate eyebrow and pitched roads do not use an HTML overlay',()=>{
  const html=read('index.html');
  assert.doesNotMatch(html,/<div class="map-startup-eyebrow">동작구 보행안전 지도<\/div>/);
  assert.doesNotMatch(read('src/night-visibility-map.js'),/createNightRoadCanvas|requestAnimationFrame/);
  assert.doesNotMatch(read('src/night-road-canvas.js'),/document\.createElement|appendChild|requestAnimationFrame/);
});
