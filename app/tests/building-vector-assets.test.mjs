import test from 'node:test';import assert from 'node:assert/strict';import {VectorTile} from '@mapbox/vector-tile';import {PbfReader} from 'pbf';import {vectorIndex,encodeBuildingTile,tileRange,VECTOR_EXTENT,VECTOR_MAX_ZOOM} from '../scripts/building-vector-assets.mjs';
test('MVT prototype retains IDs, heights and polygons at detailed zoom',()=>{
 const f={type:'Feature',id:1,properties:{h:47,_render3d:true},geometry:{type:'Polygon',coordinates:[[[126.94,37.504],[126.9401,37.504],[126.9401,37.5041],[126.94,37.5041],[126.94,37.504]]]}};
 const idx=vectorIndex({type:'FeatureCollection',features:[f]});const [x,y]=tileRange([126.94,37.504,126.94,37.504],VECTOR_MAX_ZOOM);
 const b=encodeBuildingTile(idx,VECTOR_MAX_ZOOM,x,y),t=new VectorTile(new PbfReader(b)),l=t.layers.buildings;
 assert.equal(l.extent,VECTOR_EXTENT);assert.equal(l.length,1);assert.equal(l.feature(0).id,1);assert.equal(l.feature(0).properties.h,47);assert.equal(l.feature(0).type,3);
});
