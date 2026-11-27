import {districtTileBoundary} from './district-tile-boundary.mjs';
// MVT protobuf: preserve every raw field except discarded road feature fields.
// Tile coordinates are evaluated before sending bytes to the browser.
const utf8=new TextDecoder();
const minor=new Set(['tertiary','tertiary_link','minor','service','track','path','footway','pedestrian','cycleway','steps','residential','unclassified','living_street','road']);
function number(b,p){let v=0,m=1;for(let k=0;k<10&&p<b.length;k++){const n=b[p++];v+=(n&127)*m;if(!(n&128))return [v,p];m*=128;}throw Error('Invalid protobuf varint');}
function varint(n){const out=[];while(n>=128){out.push(n%128+128);n=Math.floor(n/128);}out.push(n);return Uint8Array.from(out);}
function fields(b){const out=[];for(let p=0;p<b.length;){const start=p;let tag;[tag,p]=number(b,p);const wire=tag%8,id=Math.floor(tag/8);let value;if(wire===0)[value,p]=number(b,p);else if(wire===2){let len;[len,p]=number(b,p);if(len>b.length-p)throw Error('Truncated protobuf');value=b.subarray(p,p+len);p+=len;}else if(wire===1)p+=8;else if(wire===5)p+=4;else throw Error('Unsupported protobuf wire');if(p>b.length)throw Error('Truncated protobuf');out.push({id,wire,value,raw:b.subarray(start,p)});}return out;}
function concat(parts){const b=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let at=0;for(const p of parts){b.set(p,at);at+=p.length;}return b;}
function field(id,payload){return concat([varint(id*8+2),varint(payload.length),payload]);}
function packed(b){const out=[];for(let p=0;p<b.length;){let n;[n,p]=number(b,p);out.push(n);}return out;}
const zig=n=>n%2?-(n+1)/2:n/2;
function geometryParts(data){let x=0,y=0,part=[],parts=[];for(let p=0;p<data.length;){const cmd=data[p++],id=cmd%8,count=Math.floor(cmd/8);if(!count)throw Error('Invalid MVT geometry');if(id===7){if(part.length)part.push(part[0]);continue;}if(id!==1&&id!==2)throw Error('Unknown MVT geometry');for(let i=0;i<count;i++){if(p+1>=data.length)throw Error('Truncated geometry');x+=zig(data[p++]);y+=zig(data[p++]);if(id===1){if(part.length)parts.push(part);part=[];}part.push([x,y]);}}if(part.length)parts.push(part);return parts;}
const pointIn=(p,ring)=>{let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;};
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function intersects(a,b,c,d){if(Math.max(a[0],b[0])<Math.min(c[0],d[0])||Math.max(c[0],d[0])<Math.min(a[0],b[0])||Math.max(a[1],b[1])<Math.min(c[1],d[1])||Math.max(c[1],d[1])<Math.min(a[1],b[1]))return false;return cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0;}
function tilePolygons(z,x,y,extent,boundary){const n=2**z;const project=([lon,lat])=>[( (lon+180)/360*n-x)*extent,((1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*n-y)*extent];return (boundary.type==='Polygon'?[boundary.coordinates]:boundary.coordinates).map(p=>p.map(r=>r.map(project)));}
function touches(parts,polys,polygon){return polys.some(poly=>{const ring=poly[0];if(parts.some(part=>part.some(p=>pointIn(p,ring))))return true;for(const part of parts){for(let i=1;i<part.length;i++)for(let j=1;j<ring.length;j++)if(intersects(part[i-1],part[i],ring[j-1],ring[j]))return true;if(polygon&&ring.some(p=>pointIn(p,part)))return true;}return false;});}
export function reduceExteriorRoadTile(input,z,x,y,boundary=districtTileBoundary){
 const raw=input instanceof Uint8Array?input:new Uint8Array(input);
 let removed=0;
 const tile=fields(raw).map(top=>{
  if(top.id!==3||top.wire!==2)return top.raw;
  const layer=fields(top.value),name=layer.find(f=>f.id===1);
  if(!name||!['transportation','transportation_name'].includes(utf8.decode(name.value)))return top.raw;
  const keys=layer.filter(f=>f.id===3).map(f=>utf8.decode(f.value)),values=layer.filter(f=>f.id===4).map(f=>{const v=fields(f.value).find(v=>v.id===1&&v.wire===2);return v?utf8.decode(v.value):null;});
  const idx=keys.indexOf('class'),extent=layer.find(f=>f.id===5)?.value||4096;
  if(idx<0)return top.raw;
  const polys=tilePolygons(z,x,y,extent,boundary);
  const result=layer.filter(f=>{
   if(f.id!==2)return true;
   const flds=fields(f.value),tags=flds.filter(q=>q.id===2).flatMap(q=>q.wire===2?packed(q.value):[q.value]);
   let klass;for(let k=0;k+1<tags.length;k+=2)if(tags[k]===idx)klass=values[tags[k+1]];
   if(!minor.has(klass))return true;
   const geom=flds.filter(q=>q.id===4).flatMap(q=>q.wire===2?packed(q.value):[q.value]);
   if(!geom.length)return true;
   if(touches(geometryParts(geom),polys,flds.find(q=>q.id===3)?.value===3))return true;
   removed++;return false;
  });
  return result.length===layer.length?top.raw:field(3,concat(result.map(f=>f.raw)));
 });
 return {bytes:removed?concat(tile):raw,removed};
}
export function parseRoadTilePath(path){const m=path.match(/^\/api\/basemap\/tile\/(planet|backup_planet)\/([A-Za-z0-9_\-]{1,50})\/(\d{1,2})\/(\d{1,8})\/(\d{1,8})\.pbf$/);if(!m)return null;const z=Number(m[3]),x=Number(m[4]),y=Number(m[5]);if(z<0||z>16||x>=2**z||y>=2**z)return null;return {z,x,y,url:'https://tiles.openfreemap.org/'+m.slice(1).join('/').replace(/$/,'')+'.pbf'};}
export async function serveDistrictRoadTile(request,{fetcher=fetch,cache}={}){
 const parsed=parseRoadTilePath(new URL(request.url).pathname);
 const headers={'Access-Control-Allow-Origin':'*','Cache-Control':'public, max-age=86400','Content-Type':'application/vnd.mapbox-vector-tile'};
 if(!parsed)return new Response('Invalid tile',{status:400});
 const key=new Request(request.url);
 try{
  const hit=await cache?.match(key);if(hit)return hit;
  const upstream=await fetcher(parsed.url,{redirect:'error',signal:AbortSignal.timeout(12000)});
  if(!upstream.ok)throw Error('Upstream '+upstream.status);
  let data=new Uint8Array(await upstream.arrayBuffer());
  if(data[0]===31&&data[1]===139)data=new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
  const result=reduceExteriorRoadTile(data,parsed.z,parsed.x,parsed.y);
  const response=new Response(result.bytes,{headers:{...headers,'X-Dongjak-Removed-Road-Features':String(result.removed)}});
  try{await cache?.put(key,response.clone());}catch{}
  return response;
 }catch(e){return new Response('Reduced vector tile unavailable',{status:502,headers:{'Access-Control-Allow-Origin':'*','Cache-Control':'no-store'}});}
}
