import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const boundary=JSON.parse(readFileSync(new URL('../public/data/dongjak_sig_reference.geojson',import.meta.url),'utf8'));
const src=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
function contains(point,ring){let yes=false;const [x,y]=point;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if(((a[1]>y)!==(b[1]>y))&&(x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]))yes=!yes;}return yes;}
test('the same upstream district boundary is available as a local geojson asset',()=>{
 assert.equal(boundary.features.length,1);
 const f=boundary.features[0];assert.equal(f.properties.SIG_KOR_NM,'동작구');
 assert.equal(f.properties.SIG_CD,'11590');assert.equal(f.geometry.type,'Polygon');
 assert.ok(f.geometry.coordinates[0].length>=30);
 assert.equal(contains([126.960,37.510],f.geometry.coordinates[0]),true);
 assert.equal(contains([126.962,37.512],f.geometry.coordinates[0]),true);
 assert.equal(contains([128,38],f.geometry.coordinates[0]),false);
 assert.match(src,/const BOUNDARY_URL = '\/data\/dongjak_sig_reference\.geojson'/);
 assert.match(src,/app\.dataset\.djBoundaryReady='true'/);
 assert.match(src,/const BOUNDARY_UPSTREAM_FALLBACK_URL/);
});
