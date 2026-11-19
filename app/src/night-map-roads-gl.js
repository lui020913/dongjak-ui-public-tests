/**
 * v6.0: solid, slightly thinner, precision-stable MapLibre-native road observations.
 * Unlike the former HTML canvas overlay, these triangles are drawn *inside*
 * MapLibre's render pipeline (renderingMode: '3d': shared extrusion depth).
 * All geometry is relative to a local Mercator origin to avoid Float32 wobble.
 * Capsule strokes with antialiasing avoid butt-end cracks while panning.
 * Nothing is appended to the DOM or projected during map move events.
 * The existing geographic GeoJSON line layers remain the fallback and retain
 * feature clicks. This is a visualization, not a new lighting model.
 */
export const NIGHT_GL_LAYER_ID='dj-night-road-native-gl';
const MIN_PITCH=24;
const MIN_ZOOM=12.7;
const STRIDE=13;
const VERTICES_PER_SEGMENT=6;
const hexToRgb=color=>[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255);
const mercator=([lng,lat])=>{
  const phi=Math.max(-85.05112878,Math.min(85.05112878,lat))*Math.PI/180;
  return [(lng+180)/360,(1-Math.log(Math.tan(Math.PI/4+phi/2))/Math.PI)/2];
};
export function shouldRenderNightRoadInMap(pitch,zoom){
  return Number(pitch)>=MIN_PITCH&&Number(zoom)>=MIN_ZOOM;
}
export function nightLineHue(feature,palette){
  const {category,kind}=feature.properties||{};
  if(category==='uncertain')return palette.uncertain;
  if(category==='clear'||category==='lit')return palette.clear;
  return kind==='path'?palette.pathUnlit:palette.alleyUnlit;
}
const segmentDistance=([lng1,lat1],[lng2,lat2])=>{
  const mid=(lat1+lat2)*Math.PI/360;
  return Math.hypot((lng2-lng1)*111320*Math.cos(mid),(lat2-lat1)*111320);
};
/** Pure conversion: draw data changes only when analysis switches/radius changes. */
export function buildNightRoadVertices({occlusion=false,alley=true,path=true,occ=[],dark=[],lit=[]},palette,elevationAt=()=>0){
  const features=occlusion?occ:[...lit,...dark];
  const data=[];
  let count={clear:0,alleyUnlit:0,pathUnlit:0,uncertain:0};
  const elevationCache=new Map();
  // Store the Mercator origin in double precision, and upload only nearby
  // *relative* coordinates. Global Float32 Mercator x/y lose several screen
  // pixels at high zoom and make road strokes vibrate during camera moves.
  let origin=null;
  const toLocal=point=>{
    const xy=mercator(point);
    if(!origin)origin=xy;
    return [xy[0]-origin[0],xy[1]-origin[1]];
  };
  const elevationWorld=point=>{
    const key=point.join(',');
    if(elevationCache.has(key))return elevationCache.get(key);
    let h=0;
    try{const queried=elevationAt(point);if(Number.isFinite(queried))h=queried;}catch{/* terrain tile unavailable: sea-level fallback */}
    const mercatorMeters=1/(40075016.68557849*Math.cos(point[1]*Math.PI/180));
    const z=h*mercatorMeters;
    elevationCache.set(key,z);
    return z;
  };
  for(const feature of features){
    const pts=feature?.geometry?.coordinates;
    if(!Array.isArray(pts)||pts.length<2)continue;
    const props=feature.properties||{},kind=props.kind;
    if((kind==='path'&&!path)||(kind!=='path'&&!alley))continue;
    const cat=props.category||'outside';
    const rgb=hexToRgb(nightLineHue(feature,palette));
    // Road category is conveyed by line colour; all line styles are solid.
    const dash=0;
    let cumulative=0;
    for(let i=1;i<pts.length;i++){
      const a=pts[i-1],b=pts[i];
      if(!a?.every(Number.isFinite)||!b?.every(Number.isFinite))continue;
      const length=segmentDistance(a,b);
      if(!Number.isFinite(length)||length<0.1||length>75){cumulative+=Math.max(0,length||0);continue;}
      const A=[...toLocal(a),elevationWorld(a)],B=[...toLocal(b),elevationWorld(b)],previous=cumulative;
      cumulative+=length;
      const add=(t,side)=>data.push(...A,...B,t,side,...rgb,dash,previous+(cumulative-previous)*t);
      add(0,-1);add(1,-1);add(0,1);add(0,1);add(1,-1);add(1,1);
      if(cat==='uncertain')count.uncertain++;
      else if(cat==='clear'||cat==='lit')count.clear++;
      else if(kind==='path')count.pathUnlit++;
      else count.alleyUnlit++;
    }
  }
  return {vertices:new Float32Array(data),count,origin:origin||[0,0]};
}

/** CPU double-precision M * translate(origin) keeps vertices near zero.
 *  Never add the global world origin back in the GPU vertex shader: the
 *  extra Float32 addition would restore the original high-zoom jitter. */
export function relativeNightProjectionMatrix(matrix,origin){
  if(!matrix||matrix.length!==16)return null;
  const x=origin?.[0]||0,y=origin?.[1]||0;
  const adjusted=new Float32Array(matrix);
  for(let row=0;row<4;row++){
    adjusted[12+row]=Number(matrix[row])*x+Number(matrix[4+row])*y+Number(matrix[12+row]);
  }
  return adjusted;
}

// A triangle is drawn as a screen-space capsule, not a square-ended quad.
// Its round ends overlap at shared corners and hide joints. Fragment coverage
// uses a one-physical-pixel antialiasing transition rather than raw GL edges.
const VERTEX=`
precision highp float;
attribute vec3 a_from;
attribute vec3 a_to;
attribute vec2 a_corner;
attribute vec3 a_color;
attribute vec2 a_meta;
uniform mat4 u_matrix;
uniform vec2 u_viewport;
uniform float u_half_width;
varying vec3 v_color;
varying float v_dash;
varying float v_distance;
varying float v_along;
varying float v_across;
varying float v_seg_length;
void main(){
  vec4 a=u_matrix*vec4(a_from,1.0);
  vec4 b=u_matrix*vec4(a_to,1.0);
  if(a.w<=0.00001||b.w<=0.00001){gl_Position=vec4(2.0,2.0,2.0,1.0);return;}
  vec2 delta=(b.xy/b.w-a.xy/a.w)*(u_viewport*0.5);
  float segLen=length(delta);
  if(segLen<0.00001){gl_Position=vec4(2.0,2.0,2.0,1.0);return;}
  vec2 dir=delta/segLen;
  vec2 normal=vec2(-dir.y,dir.x);
  float endSign=a_corner.x>0.5?1.0:-1.0;
  vec4 point=mix(a,b,a_corner.x);
  vec2 offset=(normal*a_corner.y+dir*endSign)*u_half_width;
  point.xy+=offset*2.0/u_viewport*point.w;
  gl_Position=point;
  v_color=a_color;
  v_dash=a_meta.x;
  v_distance=a_meta.y;
  v_along=mix(0.0,segLen,a_corner.x)+endSign*u_half_width;
  v_across=a_corner.y*u_half_width;
  v_seg_length=segLen;
}`;
const FRAGMENT=`
precision highp float;
varying vec3 v_color;
varying float v_dash;
varying float v_distance;
varying float v_along;
varying float v_across;
varying float v_seg_length;
uniform float u_half_width;
uniform float u_casing;
void main(){
  // Signed distance to a capsule whose centerline is [0, v_seg_length].
  // A rounded cap at both ends prevents jagged black seams at intersections.
  float nearest=clamp(v_along,0.0,v_seg_length);
  float distanceToLine=length(vec2(v_along-nearest,v_across));
  float alpha=1.0-smoothstep(max(0.0,u_half_width-1.25),u_half_width+0.25,distanceToLine);
  if(alpha<=0.001)discard;
  // Continuous strokes for all three road classes (and unknown segments).
  vec3 color=u_casing>0.5?vec3(0.027,0.071,0.118):v_color;
  gl_FragColor=vec4(color,0.98*alpha);
}`;
function shader(gl,type,source){
  const obj=gl.createShader(type);gl.shaderSource(obj,source);gl.compileShader(obj);
  if(!gl.getShaderParameter(obj,gl.COMPILE_STATUS)){
    const error=gl.getShaderInfoLog(obj)||'unknown shader compilation failure';
    gl.deleteShader(obj);throw new Error(error);
  }
  return obj;
}
/** A native MapLibre custom style layer; never creates/appends any DOM canvas. */
export function createNightMapRoadLayer(map,palette){
  let ready=false,glBuffer=null,program=null,glRef=null,pending=true,enabled=false;
  let state={occlusion:false,alley:true,path:true,occ:[],dark:[],lit:[]};
  let vertices=new Float32Array(),counts={},localOrigin=[0,0];
  const layer={
    id:NIGHT_GL_LAYER_ID,type:'custom',renderingMode:'3d',
    onAdd(_map,gl){
      try{
        glRef=gl;
        const vs=shader(gl,gl.VERTEX_SHADER,VERTEX),fs=shader(gl,gl.FRAGMENT_SHADER,FRAGMENT);
        const p=gl.createProgram();gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);
        gl.deleteShader(vs);gl.deleteShader(fs);
        if(!gl.getProgramParameter(p,gl.LINK_STATUS)){
          const msg=gl.getProgramInfoLog(p)||'unknown program link failure';gl.deleteProgram(p);throw new Error(msg);
        }
        program=p;glBuffer=gl.createBuffer();
        if(!glBuffer)throw new Error('WebGL road buffer unavailable');
        ready=true;pending=true;map.triggerRepaint?.();
      }catch(error){console.warn('[야간 시야] 지도 내부 도로선 GPU 준비 실패; 기본 지도선 사용',error);ready=false;}
    },
    onRemove(_map,gl){
      if(glBuffer)gl.deleteBuffer(glBuffer);
      if(program)gl.deleteProgram(program);
      glBuffer=null;program=null;glRef=null;ready=false;pending=true;
    },
    render(gl,args){
      if(!enabled||!ready||!shouldRenderNightRoadInMap(map.getPitch(),map.getZoom()))return;
      const matrix=args?.defaultProjectionData?.mainMatrix;
      if(!matrix)return;
      if(pending){
        const built=buildNightRoadVertices(state,palette,coord=>{
          // queryTerrainElevation returns visual elevation (incl. MapLibre
          // exaggeration), keeping the analytical roads tied to the ground.
          const height=map.queryTerrainElevation?.(coord);
          return Number.isFinite(height)?height:0;
        });
        vertices=built.vertices;counts=built.count;localOrigin=built.origin;
        gl.bindBuffer(gl.ARRAY_BUFFER,glBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.DYNAMIC_DRAW);
        pending=false;
      }
      if(!vertices.length)return;
      const width=gl.drawingBufferWidth,height=gl.drawingBufferHeight;
      if(!width||!height)return;
      const pxRatio=width/(map.getCanvas?.()?.clientWidth||width);
      const factor=Math.max(0,Math.min(1,(map.getZoom()-MIN_ZOOM)/3.3));
      const core=(2.9+factor*3.0)*pxRatio;
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER,glBuffer);
      const stride=STRIDE*4;
      for(const [name,size,offset] of [['a_from',3,0],['a_to',3,3],['a_corner',2,6],['a_color',3,8],['a_meta',2,11]]){
        const loc=gl.getAttribLocation(program,name);
        if(loc<0)continue;
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc,size,gl.FLOAT,false,stride,offset*4);
      }
      gl.uniformMatrix4fv(gl.getUniformLocation(program,'u_matrix'),false,
        relativeNightProjectionMatrix(matrix,localOrigin));
      gl.uniform2f(gl.getUniformLocation(program,'u_viewport'),width,height);
      gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
      // The 3D custom layer shares building depth. The road remains on the ground
      // rather than drawing a bright stripe across a building facade or roof.
      for(const [halfWidth,casing] of [[(core+2.8*pxRatio)/2,1],[core/2,0]]){
        gl.uniform1f(gl.getUniformLocation(program,'u_half_width'),halfWidth);
        gl.uniform1f(gl.getUniformLocation(program,'u_casing'),casing);
        gl.drawArrays(gl.TRIANGLES,0,vertices.length/STRIDE);
      }
      for(const name of ['a_from','a_to','a_corner','a_color','a_meta']){
        const loc=gl.getAttribLocation(program,name);
        if(loc>=0)gl.disableVertexAttribArray(loc);
      }
    }
  };
  return {
    layer,
    isReady:()=>ready,
    isActive:()=>enabled&&ready&&shouldRenderNightRoadInMap(map.getPitch(),map.getZoom()),
    update(next){state={...state,...next};enabled=Boolean(next.enabled);pending=true;map.triggerRepaint?.();},
    invalidateTerrain(){if(enabled){pending=true;map.triggerRepaint?.();}},
    getCounts:()=>({...counts})
  };
}
