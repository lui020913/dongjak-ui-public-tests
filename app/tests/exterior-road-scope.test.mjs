import test from 'node:test';
import assert from 'node:assert/strict';
import {exteriorTileRequest,installExteriorRoadScope} from '../src/exterior-road-scope.mjs';
import {reduceExteriorRoadTile,parseRoadTilePath} from '../server/district-road-tile.mjs';
const url='https://tiles.openfreemap.org/planet/20261126_001_pt/14/13969/6351.pbf';
test('ordinary mode uses a separate tile data endpoint; transit requests the original',()=>{
 const reduced=exteriorTileRequest(url,'Tile',false,'https://example.com').url;
 assert.equal(reduced,'https://example.com/api/basemap/tile/planet/20261126_001_pt/14/13969/6351.pbf');
 assert.equal(parseRoadTilePath(new URL(reduced).pathname).url,url);
 assert.equal(exteriorTileRequest(url,'Tile',true).url,url);
 assert.equal(exteriorTileRequest(url+'?dj-road-mode=full','Tile',false).url,url);
 assert.equal(exteriorTileRequest(url,'Source',false).url,url);
 assert.equal(parseRoadTilePath('/api/basemap/tile/planet/latest/14/99999/1.pbf'),null);
});
test('mode changes switch vector tile URLs, not style filters',()=>{
 const handlers={},source={tiles:[url],setTiles(tiles){this.tiles=tiles;}};
 const map={on:(e,f)=>handlers[e]=f,getSource:()=>source};
 const owner=installExteriorRoadScope(map);owner.update({},false);assert.match(source.tiles[0],/dj-road-mode=reduced$/);
 owner.update({},true);assert.match(source.tiles[0],/dj-road-mode=full$/);
 owner.update({},false);assert.match(source.tiles[0],/dj-road-mode=reduced$/);
});
const v=n=>{const b=[];while(n>=128){b.push(n%128+128);n=Math.floor(n/128);}b.push(n);return b;};
const msg=(id,b)=>[...v(id*8+2),...v(b.length),...b];
const num=(id,n)=>[...v(id*8),...v(n)];
const str=(id,s)=>msg(id,[...new TextEncoder().encode(s)]);
const zz=n=>n<0?-2*n-1:2*n;
function feature(classIndex,x,y){return msg(2,[...msg(2,[0,classIndex]),...num(3,2),...msg(4,[9,...v(zz(x)),...v(zz(y)),10,...v(zz(10)),0])]);}
function tile(name,features){return msg(3,[...str(1,name),...features.flat(),...str(3,'class'),...msg(4,str(1,'minor')),...msg(4,str(1,'primary')),...num(5,4096),...num(15,2)]);}
test('reduced output physically omits exterior minor features but preserves internal roads and other layers',()=>{
 // Zoom 0: test boundary around tile coordinate center. Outside point at 100,100.
 const boundary={type:'Polygon',coordinates:[[[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]]]};
 const inside=feature(0,2048,2048),outside=feature(0,100,100),major=feature(1,100,100),water=tile('water',[outside]);
 const input=Uint8Array.from([...tile('transportation',[inside,outside,major]),...water]);
 const expected=Uint8Array.from([...tile('transportation',[inside,major]),...water]);
 const result=reduceExteriorRoadTile(input,0,0,0,boundary);
 assert.equal(result.removed,1);assert.deepEqual(result.bytes,expected);
});
