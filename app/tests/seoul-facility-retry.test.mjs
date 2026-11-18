import test from 'node:test';
import assert from 'node:assert/strict';
import {onePage,syncFacilitySource} from '../src/workers/seoul-facility-sync.mjs';
import {SOURCES} from '../functions/lib/seoul-facility-core.mjs';

const source=SOURCES.find(s=>s.id==='cafe');
const validRow={MGTNO:'source-1',BPLCNM:'동작구 테스트 카페',TRDSTATEGBN:'01',TRDSTATENM:'정상영업',
  UPTAENM:'커피숍',X:197956.2,Y:449638.5,RDNWHLADDR:'서울특별시 동작구 상도로 3'};
function jsonResponse(rows,total=rows.length){
  return {ok:true,status:200,json:async()=>({
    [source.service]:{RESULT:{CODE:'INFO-000'},list_total_count:total,row:rows}
  })};
}
async function withFetch(mock,fn){
  const old=globalThis.fetch;globalThis.fetch=mock;
  try{return await fn();}finally{globalThis.fetch=old;}
}
test('retries timeout thrown while reading the JSON response body',async()=>{
  let calls=0;
  await withFetch(async()=>{
    calls++;
    if(calls===1)return {ok:true,status:200,json:async()=>{
      const error=new Error('The operation was aborted due to timeout');
      error.name='TimeoutError';throw error;
    }};
    return jsonResponse([validRow]);
  },async()=>{
    const result=await onePage('PLACEHOLDER_TEST_ONLY',source,1);
    assert.equal(result.total,1);
    assert.equal(result.rows[0].MGTNO,'source-1');
  });
  assert.equal(calls,2);
});
test('retries transient HTTP 503 but not permanent HTTP 403',async()=>{
  let calls=0;
  await withFetch(async()=>{
    calls++;
    return calls===1?{ok:false,status:503}:jsonResponse([validRow]);
  },async()=>assert.equal((await onePage('TEST_KEY',source,1)).total,1));
  assert.equal(calls,2);
  calls=0;
  await withFetch(async()=>{calls++;return {ok:false,status:403};},async()=>
    assert.rejects(onePage('DONT_LEAK_THIS_KEY',source,1),/서울시 API HTTP 403/));
  assert.equal(calls,1);
});
test('repeated abort returns sanitized error without exposing API key',async()=>{
  let calls=0;
  await withFetch(async()=>{calls++;const e=new Error('The operation was aborted due to timeout');
    e.name='TimeoutError';throw e;
  },async()=>{
    await assert.rejects(onePage('VERY_SECRET_API_KEY',source,1001),error=>{
      assert.match(error.message,/page 1001/);
      assert.doesNotMatch(error.message,/VERY_SECRET_API_KEY/);
      return true;
    });
  });
  assert.equal(calls,3);
});
test('cross-page duplicate MGTNO counts once as stored while preserving upsert attempts',async()=>{
  let calls=0;
  let storedCount=0,syncArgs=null;
  const db={
    prepare(sql){
      return {bind(...args){
        return {sql,args,async run(){
          if(sql.includes('INSERT INTO seoul_facility_sync'))syncArgs=args;
          return {success:true};
        }};
      }};
    },
    async batch(stmts){
      for(const s of stmts){
        if(s.sql.includes('INSERT INTO seoul_facilities'))storedCount++;
        if(s.sql.includes('INSERT INTO seoul_facility_sync'))syncArgs=s.args;
      }
      return [];
    }
  };
  const result=await withFetch(async()=>{
    calls++;
    return jsonResponse(calls===1?Array(1000).fill(validRow):[validRow],1001);
  },()=>syncFacilitySource({SEOUL_OPEN_API_KEY:'TEST_KEY',SEOUL_FACILITIES_DB:db},source));
  assert.equal(calls,2);
  assert.equal(storedCount,2,'one unique row in each source page');
  assert.equal(result.received,1001);
  assert.equal(result.upserted,2);
  assert.equal(result.stored,1);
  assert.equal(syncArgs[3],1,'metadata row_count should equal number of distinct stored IDs');
});
test('failed sync records a safe stage-specific diagnostic without deleting old data',async()=>{
  const calls=[];
  const db={
    prepare(sql){return {bind(...args){return {sql,args,async run(){calls.push({sql,args});}}}}},
    async batch(){throw new Error('unexpected D1 write');}
  };
  await withFetch(async()=>{const e=new Error('The operation was aborted due to timeout');
    e.name='TimeoutError';throw e;
  },async()=>assert.rejects(syncFacilitySource({SEOUL_OPEN_API_KEY:'SECRET_DO_NOT_LOG',SEOUL_FACILITIES_DB:db},source),e=>{
    assert.match(e.message,/fetch page 1/);
    assert.doesNotMatch(e.message,/SECRET_DO_NOT_LOG/);
    return true;
  }));
  assert.equal(calls.length,1);
  assert.match(calls[0].args[2],/fetch page 1/);
  assert.ok(!calls[0].sql.includes('DELETE FROM'));
});
