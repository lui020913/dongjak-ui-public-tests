import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nameQuery} from '../functions/api/osm-name-search.js';
import {normalizeNamedOsm,searchNamedOsm} from '../src/v875-osm-name-search.js';

const read=(path)=>readFileSync(new URL(path,import.meta.url),'utf8');
test('v875: named search accepts Starbucks aliases and limits area',()=>{
  assert.match(nameQuery('스타벅스'),/Starbucks/);
  assert.match(nameQuery('스타벅스'),/37\.435,126\.87/);
  assert.equal(nameQuery(''),null);
  assert.equal(nameQuery('test";DROP'),null);
});
test('v875: named search preserves real coordinates, filters unrelated brands and duplicates',()=>{
  const data={elements:[
    {id:1,tags:{name:'스타벅스 노량진점',brand:'Starbucks',amenity:'cafe'},lon:126.945,lat:37.512},
    {id:2,tags:{name:'스타벅스 노량진점',brand:'Starbucks'},lon:126.945,lat:37.512},
    {id:3,tags:{name:'동작 구청 카페'},lon:126.92,lat:37.51},
    {id:4,tags:{name:'스타벅스 강릉점'},lon:128.9,lat:37.75}]};
  const result=normalizeNamedOsm(data,'스타벅스');
  assert.equal(result.length,1);assert.equal(result[0].name,'스타벅스 노량진점');
  assert.equal(result[0].category,'카페');assert.equal(result[0].lng,126.945);
});
test('v875: search uses same-origin API, not an untrusted user-supplied endpoint',async()=>{
  const calls=[];
  const result=await searchNamedOsm('스타벅스',{fetcher:async (url)=>{
    calls.push(url);return {ok:true,json:async()=>({elements:[]})};
  }});
  assert.deepEqual(result,[]);assert.equal(calls[0],'/api/osm-name-search?q=%EC%8A%A4%ED%83%80%EB%B2%85%EC%8A%A4');
});
test('v875: transport header grip remains outside scroll body and PC is not reparented',()=>{
  const js=read('../src/v875-mobile-stability.js');
  assert.match(js,/if\(panel&&phone\(\)\)/);
  assert.match(js,/if\(child\.classList\.contains\('handle'\)\|\|child\.classList\.contains\('transport-panel-head'\)\)continue/);
  assert.match(js,/new MutationObserver\(decorateBus\)/);
});
test('v875: mobile-only CSS and cached weather, no initial refetch on click',()=>{
  const css=read('../src/v875-mobile-stability.css');
  const env=read('../src/ui-environment.js');
  assert.match(css,/@media\(max-width:699px\)/);
  assert.match(css,/\.dj875-transit-scroll\{/);
  assert.match(env,/CACHE_MS=10\*60\*1000/);
  assert.match(env,/dongjak:weather-refresh/);
});
