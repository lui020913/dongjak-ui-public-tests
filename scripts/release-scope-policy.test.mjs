import test from 'node:test';
import assert from 'node:assert/strict';
import {bumpVersion,validateClassifications} from './release-scope-policy.mjs';
const notes=[{id:'a',items:['기존 버튼 정렬']},{id:'b',items:['신규 지도 레이어']}];
const good={classifications:[{id:'a',scope:'patch',breakingChange:false,confidence:.95,reason:'기존 UI 수정'},{id:'b',scope:'minor',breakingChange:false,confidence:.95,reason:'신규 레이어'}]};
test('SemVer resets only required components',()=>{assert.equal(bumpVersion('8.25.1','patch'),'8.25.2');assert.equal(bumpVersion('8.25.7','minor'),'8.26.0');assert.equal(bumpVersion('8.25.7','major'),'9.0.0')});
test('complete classified notes are accepted',()=>assert.equal(validateClassifications(notes,good).get('b').scope,'minor'));
test('duplicate, uncertain and major suggestions fail closed',()=>{
 assert.throws(()=>validateClassifications(notes,{classifications:[good.classifications[0],good.classifications[0]]}));
 assert.throws(()=>validateClassifications(notes,{classifications:[good.classifications[0],{...good.classifications[1],confidence:.3}]}));
 assert.throws(()=>validateClassifications(notes,{classifications:[good.classifications[0],{...good.classifications[1],scope:'major',breakingChange:true}]}));
});
