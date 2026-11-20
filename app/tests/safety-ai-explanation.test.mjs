import test from 'node:test';import assert from 'node:assert/strict';
import {explanationMode,protectionSubtype,matchesProtectionSubtype,evidenceAnswer} from '../supabase/functions/dongjak-safety-ai/answer-policy.mjs';
test('precise subtype excludes unrelated protection zones',()=>{
 const a={category:'protection_zone',title:'청송경로당 관련 노인 보호구역'},b={category:'protection_zone',title:'강남유치원 관련 어린이 보호구역'};
 assert.equal(protectionSubtype('노인 보호구역 위치'),'노인');assert.equal(protectionSubtype('어린이 보호구역 위치'),'어린이');assert.equal(protectionSubtype('어린이와 노인 보호구역'),null);
 assert.deepEqual([a,b].filter(x=>matchesProtectionSubtype(x,'노인')),[a]);
 assert.deepEqual([a,b].filter(x=>matchesProtectionSubtype(x,'어린이')),[b]);
 const answers=['child','teen','adult','senior'].map(m=>evidenceAnswer([a],m,'protection_zone','노인'));assert.equal(new Set(answers).size,4);for(const answer of answers)assert.match(answer,/1건/);
 assert.equal(explanationMode('unknown'),'adult');
});