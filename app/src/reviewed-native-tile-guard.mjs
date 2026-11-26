/** Confirm that the exact audited native tile bytes are still being served.
 * This is a read-only QA gate. Never allow replacement for unknown tile bytes.
 */
const hex=async bytes=>Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const validURL=v=>{try{const u=new URL(v);return u.protocol==='https:'&&u.hostname==='tiles.openfreemap.org'&&!u.username&&!u.password}catch{return false}};
export function nativeTilesInBounds(tiles,bounds,zoom=14){
 const n=2**zoom,pad=.002;
 const x=lon=>Math.floor((lon+180)/360*n);
 const y=lat=>Math.floor((1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*n);
 const minX=x(bounds[0]-pad),maxX=x(bounds[2]+pad),minY=y(bounds[3]+pad),maxY=y(bounds[1]-pad);
 if(maxX-minX>8||maxY-minY>8||minX>maxX||minY>maxY)return null;
 const byKey=new Map(tiles.map(t=>[t.x+':'+t.y,t]));
 const selected=[];
 for(let i=minX;i<=maxX;i++)for(let j=minY;j<=maxY;j++){const t=byKey.get(i+':'+j);if(!t)return null;selected.push(t)}
 return selected;
}
export function createNativeTileGuard(n,{fetcher=globalThis.fetch}={}){
 const tiles=n?.audited_tiles;
 const valid=Boolean(globalThis.crypto?.subtle&&n?.tile_zoom===14&&validURL(n.tilejson_url)&&hash(n.tilejson_sha256)&&Array.isArray(tiles)&&tiles.length>0&&tiles.every(t=>t.z===14&&Number.isInteger(t.x)&&Number.isInteger(t.y)&&validURL(t.url)&&hash(t.sha256)&&Number.isInteger(t.bytes)&&t.bytes>0));
 // Revalidate on each viewport after a bounded interval. Failure is fail-open
 // to the original native road rendering, never to a blank map.
 let checkedAt=0,sourceOK=false;const cached=new Map();
 async function verify(bounds){
  if(!valid)return false;
  try{
   if(Date.now()-checkedAt>60000||!sourceOK){
    const r=await fetcher(n.tilejson_url,{cache:'no-store'});
    sourceOK=r.ok&&await hex(await r.arrayBuffer())===n.tilejson_sha256;
    checkedAt=Date.now();cached.clear();
   }
   if(!sourceOK)return false;
   const required=nativeTilesInBounds(tiles,bounds,n.tile_zoom);
   if(!required?.length||required.length>12)return false;
   for(let i=0;i<required.length;i+=3){
    const ok=await Promise.all(required.slice(i,i+3).map(async t=>{
     if(cached.get(t.url)===true)return true;
     const r=await fetcher(t.url,{cache:'no-store'});
     if(!r.ok)return false;
     const bytes=await r.arrayBuffer();
     const same=bytes.byteLength===t.bytes&&await hex(bytes)===t.sha256;
     if(same)cached.set(t.url,true);
     return same;
    }));
    if(ok.some(x=>!x))return false;
   }
   return true;
  }catch{return false}
 }
 return {valid,verify};
}
