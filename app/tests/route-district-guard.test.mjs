import test from 'node:test';
import assert from 'node:assert/strict';
import {routeWithinDistrict} from '../src/route-district-guard.mjs';
const outer=[[0,0],[10,0],[10,10],[0,10],[0,0]],hole=[[4,4],[6,4],[6,6],[4,6],[4,4]];
const polygon={type:'Polygon',coordinates:[outer,hole]};
const inside=(x,y)=>x>0&&x<10&&y>0&&y<10&&!(x>=4&&x<=6&&y>=4&&y<=6);
test('valid route stays within the district',()=>assert.equal(routeWithinDistrict([[1,1],[3,3],[9,3]],polygon,inside),true));
test('outside endpoint and missing boundary fail closed',()=>{
  assert.equal(routeWithinDistrict([[1,1],[11,1]],polygon,inside),false);
  assert.equal(routeWithinDistrict([[1,1],[2,2]],null,inside),false);
  assert.equal(routeWithinDistrict([[1,1],[NaN,2]],polygon,inside),false);
});
test('inside endpoints cannot bridge an excluded hole',()=>{
  assert.equal(routeWithinDistrict([[1,5],[9,5]],polygon,inside),false);
  assert.equal(routeWithinDistrict([[1,5],[1,3],[9,3],[9,5]],polygon,inside),true);
});
test('cannot bridge two disjoint district polygons',()=>{
  const box=(a,b)=>[[a,0],[b,0],[b,2],[a,2],[a,0]];
  const geometry={type:'MultiPolygon',coordinates:[[box(0,2)],[box(3,5)]]};
  const contains=(x,y)=>y>0&&y<2&&((x>0&&x<2)||(x>3&&x<5));
  assert.equal(routeWithinDistrict([[1,1],[4,1]],geometry,contains),false);
  assert.equal(routeWithinDistrict([[.5,1],[1.5,1]],geometry,contains),true);
});
