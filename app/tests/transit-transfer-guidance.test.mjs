import test from 'node:test';import assert from 'node:assert/strict';
import {sameBusTransfer,transferLabel,transferSteps,transitFollowFix} from '../src/transit-transfer-guidance.mjs';
const a={kind:'bus',destination:{arsId:'20123',name:'상도역',lng:126.95,lat:37.5}};
const b={kind:'bus',origin:{arsId:'20123',name:'상도역',lng:126.951,lat:37.5}};
test('same-stop transfer uses verified ARS identity rather than matched road coordinates or names',()=>{
 assert.equal(sameBusTransfer(a,b),true);
 assert.equal(sameBusTransfer(a,{...b,origin:{...b.origin,arsId:'20124'}}),false);
 assert.equal(sameBusTransfer(a,{...b,origin:{name:'상도역'}}),false);
 assert.equal(sameBusTransfer(a,{...b,kind:'rail'}),false);
 assert.equal(transferLabel(true),'제자리 환승');
 assert.deepEqual(transferSteps([a,b]),[{step:2,sameStop:true}]);
});
test('camera accepts fresh device positions only, including exterior transit positions',()=>{
 const now=100000,p={timestamp:now,coords:{longitude:127.02,latitude:37.52,accuracy:20}};
 assert.deepEqual(transitFollowFix(p,now),{coords:[127.02,37.52],accuracy:20,timestamp:now});
 assert.equal(transitFollowFix({...p,timestamp:now-16000},now),null);
 assert.equal(transitFollowFix({...p,coords:{...p.coords,accuracy:100}},now),null);
});
