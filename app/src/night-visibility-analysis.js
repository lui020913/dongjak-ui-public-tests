/**
 * Sangdo 1-dong lighting-distance analysis.
 * Adapted from the user-provided sangdo1-night-map-main/analysis.js.
 * This is an illumination-proximity estimate, NOT measured illuminance or crime risk.
 */
export const STEP_METERS = 5;
export const MIN_DARK_METERS = 10;
export const EXCLUDED_MAJOR_ROADS = new Set(['상도로', '양녕로', '상도지하차도']);

export function makeProj(lat0,lon0){
  const ky=111320, kx=ky*Math.cos(lat0*Math.PI/180);
  return {lat0,lon0,kx,ky,toXY:(lat,lon)=>[(lon-lon0)*kx,(lat-lat0)*ky],
    toLonLat:(x,y)=>[lon0+x/kx,lat0+y/ky]};
}
export function hull(points){
  const p=points.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  if(p.length<3)return p;
  const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
  const lo=[],up=[];
  for(const q of p){while(lo.length>=2&&cross(lo.at(-2),lo.at(-1),q)<=0)lo.pop();lo.push(q);}
  for(let i=p.length-1;i>=0;i--){const q=p[i];while(up.length>=2&&cross(up.at(-2),up.at(-1),q)<=0)up.pop();up.push(q);}
  lo.pop();up.pop();return lo.concat(up);
}
export function inflate(poly,meters){
  if(!poly.length)return [];
  const cx=poly.reduce((s,p)=>s+p[0],0)/poly.length;
  const cy=poly.reduce((s,p)=>s+p[1],0)/poly.length;
  return poly.map(([x,y])=>{const dx=x-cx,dy=y-cy,n=Math.hypot(dx,dy)||1;return [x+dx*meters/n,y+dy*meters/n];});
}
export function inPoly(point,poly){
  if(!poly?.length)return false;
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const [xi,yi]=poly[i], [xj,yj]=poly[j];
    if((yi>point[1])!==(yj>point[1])&&point[0]<(xj-xi)*(point[1]-yi)/(yj-yi)+xi)inside=!inside;
  }
  return inside;
}
export function inGeometry(lon,lat,geometry){
  if(!geometry)return false;
  const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.type==='MultiPolygon'?geometry.coordinates:[];
  return polygons.some(rings=>Array.isArray(rings)&&rings.length&&inPoly([lon,lat],rings[0])&&
    !rings.slice(1).some(ring=>inPoly([lon,lat],ring)));
}
export function sampleWays(ways,proj,step=STEP_METERS){
  const lines=[];
  for(const w of ways){
    const g=w.geometry||[];
    if(!Array.isArray(g)||g.length<2)continue;
    const samples=[];
    for(let i=0;i<g.length-1;i++){
      const a=proj.toXY(g[i].lat,g[i].lon),b=proj.toXY(g[i+1].lat,g[i+1].lon);
      const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
      if(!Number.isFinite(length)||length>1500||length<0.01)continue;
      const n=Math.max(1,Math.ceil(length/step));
      for(let k=0;k<n;k++){
        const t=k/n;
        samples.push({x:a[0]+(b[0]-a[0])*t,y:a[1]+(b[1]-a[1])*t,
          lat:g[i].lat+(g[i+1].lat-g[i].lat)*t,lon:g[i].lon+(g[i+1].lon-g[i].lon)*t});
      }
    }
    const last=g.at(-1),lp=proj.toXY(last.lat,last.lon);
    samples.push({x:lp[0],y:lp[1],lat:last.lat,lon:last.lon});
    if(samples.length>1)lines.push({id:w.id,tags:w.tags||{},samples});
  }
  return lines;
}
export function annotate(lines,lightsXY,scope){
  for(const ln of lines)for(const p of ln.samples){
    let best=Infinity;
    for(const l of lightsXY){const dx=p.x-l[0],dy=p.y-l[1],d2=dx*dx+dy*dy;if(d2<best)best=d2;}
    p.d=Math.sqrt(best);
    p.inScope=typeof scope==='function'?scope(p):inPoly([p.x,p.y],scope);
  }
  return lines;
}
export function kindOf(t){return ['footway','path','pedestrian','steps','track'].includes(t?.highway)?'path':'alley';}
export function kindLabel(kind,tags={}){return tags.highway==='steps'?'계단':kind==='path'?'산책로·보행로':'골목·차도';}
export function isExcluded(t){return EXCLUDED_MAJOR_ROADS.has(String(t?.name||'').trim())||t?.tunnel==='yes';}
export function isIgnored(t){return t?.footway==='sidewalk'||t?.footway==='crossing'||t?.highway==='crossing'||
  t?.service==='parking_aisle'||t?.service==='driveway';}
export function findDark(lines,radius,minLen=MIN_DARK_METERS){
  const segments=[];let totalLen=0,darkLen=0;
  for(const ln of lines){
    let run=null;
    const flush=()=>{
      if(run&&run.len>=minLen&&run.points.length>=2){
        segments.push({wayId:ln.id,name:ln.tags.name||'',tags:ln.tags,kind:kindOf(ln.tags),
          points:run.points,length:run.len,maxD:run.maxD});
        darkLen+=run.len;
      }
      run=null;
    };
    const s=ln.samples;
    for(let i=1;i<s.length;i++){
      const a=s[i-1],b=s[i],length=Math.hypot(b.x-a.x,b.y-a.y);
      if(!Number.isFinite(length)||length>15){flush();continue;}
      const inside=a.inScope&&b.inScope;
      if(inside)totalLen+=length;
      const dark=inside&&a.d>radius&&b.d>radius;
      if(dark){
        if(!run)run={points:[{lat:a.lat,lon:a.lon}],len:0,maxD:0};
        run.points.push({lat:b.lat,lon:b.lon});run.len+=length;
        run.maxD=Math.max(run.maxD,a.d,b.d);
      }else flush();
    }
    flush();
  }
  return {segments,totalLen,darkLen};
}

export function lightingBounds(lights,paddingMeters=75){
  const minLat=Math.min(...lights.map(l=>l.lat)),maxLat=Math.max(...lights.map(l=>l.lat));
  const minLon=Math.min(...lights.map(l=>l.lon)),maxLon=Math.max(...lights.map(l=>l.lon));
  const latMid=(minLat+maxLat)/2;
  return [minLat-paddingMeters/111320,minLon-paddingMeters/(111320*Math.cos(latMid*Math.PI/180)),
    maxLat+paddingMeters/111320,maxLon+paddingMeters/(111320*Math.cos(latMid*Math.PI/180))];
}

export function isValidLight(l){return l&&Number.isFinite(l.lat)&&Number.isFinite(l.lon)&&l.lat>37.45&&l.lat<37.55&&l.lon>126.89&&l.lon<127.02;}
