import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeProj,hull,inflate,inPoly,inGeometry,sampleWays,annotate,findDark,kindOf,isExcluded,isIgnored,
  lightingBounds,isValidLight} from '../src/night-visibility-analysis.js';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
test('제공된 가로등·보안등 위치 데이터가 그대로 포함된다',()=>{
  const street=JSON.parse(read('public/data/sangdo1-night/lights.json'));
  const security=JSON.parse(read('public/data/sangdo1-night/security.json'));
  assert.equal(street.length,114);assert.equal(security.length,305);
  assert.equal(street.reduce((sum,l)=>sum+(l.lamps||0),0),688);
  assert.ok([...street,...security].every(isValidLight));
  assert.deepEqual(lightingBounds([...street,...security]).length,4);
});
test('5m 샘플을 이용한 암부 판정은 10m 이상 연속 구간만 출력한다',()=>{
  const p=makeProj(37.5,126.95);
  const way={id:7,tags:{highway:'residential',name:'실험로'},geometry:[{lat:37.5,lon:126.95},{lat:37.5003,lon:126.95}]};
  const lines=sampleWays([way],p,5);
  assert.ok(lines[0].samples.length>=7);
  const region=[[-200,-200],[200,-200],[200,200],[-200,200]];
  annotate(lines,[p.toXY(37.498,126.95)],region);
  const far=findDark(lines,20,10);
  assert.equal(far.segments.length,1);
  assert.ok(far.darkLen>30&&far.totalLen>30);
  const near=findDark(lines,1000,10);
  assert.equal(near.segments.length,0);
  assert.equal(near.darkLen,0);
});
test('행정경계 폴리곤 및 내부 구멍과 외부 여부를 구분한다',()=>{
  const g={type:'Polygon',coordinates:[[[0,0],[5,0],[5,5],[0,5],[0,0]],[[1,1],[2,1],[2,2],[1,2],[1,1]]]};
  assert.equal(inGeometry(4,4,g),true);
  assert.equal(inGeometry(1.5,1.5,g),false);
  assert.equal(inGeometry(7,7,g),false);
  assert.equal(inPoly([3,3],[[0,0],[5,0],[5,5],[0,5]]),true);
  assert.equal(hull([[0,0],[1,1],[2,0],[1,0]]).length,3);
  assert.equal(inflate([[0,0],[2,0],[1,2]],5).length,3);
});
test('간선도로·횡단도·계단·공원길을 기존 분석 정의대로 분류한다',()=>{
  assert.equal(isExcluded({name:'상도로'}),true);
  assert.equal(isExcluded({tunnel:'yes'}),true);
  assert.equal(isExcluded({name:'어느 골목'}),false);
  assert.equal(isIgnored({footway:'crossing'}),true);
  assert.equal(isIgnored({service:'parking_aisle'}),true);
  assert.equal(kindOf({highway:'steps'}),'path');
  assert.equal(kindOf({highway:'residential'}),'alley');
});
test('야간 분석 UI와 지도 연결점이 있고 원본 대중교통 코드가 유지된다',()=>{
  const html=read('index.html'),main=read('src/main.js'),js=read('src/night-visibility-map.js');
  for(const id of ['night-visibility-toggle','night-visibility-quick-off','night-visibility-radius',
    'night-visibility-exclude-major','night-visibility-show-alley','night-visibility-show-path',
    'night-visibility-top','night-visibility-stats'])assert.match(html,new RegExp(id));
  assert.match(main,/installNightVisibility\(\{map,maplibregl,app,toast,theme:visualTheme,\s*onActivate:/);
  assert.match(main,/initTransportMap\(/);
  assert.match(js,/dj-night-dark-path/);
  assert.match(js,/getSangdoBoundary\(map\)/);
  assert.match(js,/fetchSangdoRoads\(lights\)/);
  assert.match(js,/scopeIsOfficial/);
  assert.match(js,/new maplibregl\.Popup/);
});
