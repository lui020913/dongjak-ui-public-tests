import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve, dirname} from 'node:path';
import {loadBuildingTileFeatures} from '../src/building-assets.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mockResponse=(features)=>({ok:true,json:async()=>({type:'FeatureCollection',features})});

test('기본·보완 건물 도형을 모두 사용한다', async()=>{
  const requested=[];
  const fetchFn=async(url)=>{requested.push(url);return mockResponse([{properties:{source:url}}]);};
  const result=await loadBuildingTileFeatures({file:'/buildings/tile_2.geojson',supplement:'/buildings/supplement_2.geojson'},fetchFn);
  assert.deepEqual(requested,['/buildings/tile_2.geojson','/buildings/supplement_2.geojson']);
  assert.equal(result.features.length,2);
  assert.equal(result.successfulSources,2);
  assert.equal(result.errors.length,0);
});

test('보완 데이터가 실패해도 기본 도형은 표시한다',async()=>{
  const result=await loadBuildingTileFeatures({file:'/base',supplement:'/bad'},async(url)=>url==='/bad'?{ok:false,status:404}:mockResponse([{}]));
  assert.equal(result.features.length,1);
  assert.equal(result.successfulSources,1);
  assert.equal(result.errors.length,1);
});

test('기본 데이터가 실패해도 보완 도형은 표시한다',async()=>{
  const result=await loadBuildingTileFeatures({file:'/bad',supplement:'/add'},async(url)=>url==='/bad'?{ok:false,status:404}:mockResponse([{}]));
  assert.equal(result.features.length,1);
  assert.equal(result.successfulSources,1);
});

test('모든 건물 파일이 누락되면 명확한 오류를 반환한다',async()=>{
  await assert.rejects(loadBuildingTileFeatures({file:'/bad',supplement:'/bad2'},async()=>({ok:false,status:404})),/모두 불러오지 못했습니다/);
});

test('manifest의 기존 8개와 보완 8개 건물 파일이 실제 존재한다',async()=>{
  const manifest=JSON.parse(await readFile(resolve(root,'public/buildings/manifest.json'),'utf8'));
  assert.equal(manifest.sheets.length,8);
  for(const sheet of manifest.sheets){
    assert.ok(sheet.file&&sheet.supplement,`도엽 ${sheet.sheet}`);
    const base=JSON.parse(await readFile(resolve(root,'public'+sheet.file),'utf8'));
    const add=JSON.parse(await readFile(resolve(root,'public'+sheet.supplement),'utf8'));
    assert.equal(base.type,'FeatureCollection');
    assert.equal(add.type,'FeatureCollection');
    assert.equal(base.features.length,sheet.count);
    assert.equal(add.features.length,sheet.supplement_count);
  }
});
