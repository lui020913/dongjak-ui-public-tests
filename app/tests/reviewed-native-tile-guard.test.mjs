import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {nativeTilesInBounds,createNativeTileGuard} from '../src/reviewed-native-tile-guard.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const z=14,n=2**z,lon=126.9563,lat=37.5035;
const x=Math.floor((lon+180)/360*n),y=Math.floor((1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*n);
const bounds=[lon-.0001,lat-.0001,lon+.0001,lat+.0001];
const root='https://tiles.openfreemap.org/';
const tilejson='{"tiles":["https://tiles.openfreemap.org/example/{z}/{x}/{y}.pbf"]}';
const tile='audited native vector bytes';
const tiles=[];for(let i=x-1;i<=x+1;i++)for(let j=y-1;j<=y+1;j++)tiles.push({z,x:i,y:j,url:root+'example/'+z+'/'+i+'/'+j+'.pbf',sha256:sha(tile),bytes:Buffer.byteLength(tile)});
const manifest={tile_zoom:14,tilejson_url:root+'planet',tilejson_sha256:sha(tilejson),audited_tiles:tiles};
test('viewport uses all required audited tiles and refuses unsupported extent',()=>{assert.ok(nativeTilesInBounds(tiles,bounds)?.length>0);assert.equal(nativeTilesInBounds(tiles,[127.1,37.7,127.2,37.8]),null)});
test('exact native source and tile bytes must match',async()=>{
 for(const [badSource,badTile,expected] of [[false,false,true],[true,false,false],[false,true,false]]){
  const calls=[];const g=createNativeTileGuard(manifest,{fetcher:async url=>{calls.push(url);return new Response(url===manifest.tilejson_url?(badSource?'changed':tilejson):(badTile?'changed':tile))}});
  assert.equal(g.valid,true);assert.equal(await g.verify(bounds),expected);assert.ok(calls.includes(manifest.tilejson_url));
 }
 const g=createNativeTileGuard({...manifest,tilejson_url:'https://example.com/'},{fetcher:async()=>{throw Error('must not fetch')}});
 assert.equal(g.valid,false);assert.equal(await g.verify(bounds),false);
});
