import test from 'node:test';
import assert from 'node:assert/strict';
import {splitRailDetail} from '../src/transit-rail-detail.mjs';
import {busSegment,transferCandidates} from '../src/transit-route-planner.mjs';
import {chooseShortestPedestrianNetwork,shouldCompareTransitPedestrianNetwork} from '../src/pedestrian-network-comparison.mjs';
test('7호선 to 신림선 changes at 보라매, preserving ordered stops and distinct boarding legs',()=>{
 const detail={kind:'rail',lines:['7','7','신림','신림'],stops:['상도','장승배기','보라매','보라매공원','보라매병원'],first:{meters:100,minutes:2},last:{meters:200,minutes:3},targets:[{lng:126.94791,lat:37.502834},{lng:126.9234964,lat:37.4929598},{lng:126.924,lat:37.493}],pri:{first:{risk:10},last:{risk:20}}};
 const r=splitRailDetail(detail);
 assert.deepEqual(r.legs.map(l=>l.lines),[['7'],['신림']]);
 assert.equal(r.legs[0].destination,'보라매');assert.equal(r.legs[1].origin,'보라매');
 assert.equal(r.walks.length,3);assert.equal(r.walks[1].stationTransfer,true);assert.equal(r.targets.length,6);
 assert.deepEqual(r.priLegs,[detail.pri.first,null,detail.pri.last]);assert.strictEqual(splitRailDetail(r),r);
});
test('repeated bus geometry does not select the long loop when ordered stops admit a direct route',()=>{
 const point=(lng,lat)=>[lng,lat];
 const a=point(126.95,37.5),b=point(126.951,37.5),c=point(126.952,37.5),detour=point(126.95,37.52);
 const coordinates=[a,detour,b,c,a,b,c];
 const stops=[a,b,c].map(([lng,lat])=>({lng,lat}));
 assert.deepEqual(busSegment(coordinates,stops),[a,b,c]);
 assert.equal(busSegment([a,b], [stops[2],stops[0]]),null);
});
test('real shorter pedestrian path wins; failed or remote network alternatives do not replace local route',()=>{
 const from={lng:126.95,lat:37.5},to={lng:126.96,lat:37.5};
 const route=(kilometers,coords,source)=>({kilometers,coords,source});
 const local=route(2.1,[[126.95,37.5],[126.955,37.51],[126.96,37.5]],'seoul-pedestrian-graph');
 const shortcut=route(1.05,[[126.95,37.5],[126.96,37.5]],'valhalla-external');
 assert.strictEqual(chooseShortestPedestrianNetwork(local,shortcut,from,to),shortcut);
 assert.strictEqual(chooseShortestPedestrianNetwork(local,null,from,to),local);
 assert.strictEqual(chooseShortestPedestrianNetwork(local,route(.2,[[126.95,37.51],[126.96,37.51]],'external'),from,to),local);
 assert.equal(shouldCompareTransitPedestrianNetwork(local,from,to),true);
});
