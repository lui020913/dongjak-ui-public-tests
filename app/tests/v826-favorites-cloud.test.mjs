import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {placeKey,cleanPlace,savedPlaces,toggleSavedPlace,addSavedPlace,removeSavedPlace,
  getPlaceFolders,createPlaceFolder,renamePlaceFolder,deletePlaceFolder,setSavedPlaceFolder,
  favoritesSnapshot,replaceFavoritesSnapshot,mergeFavoritesSnapshots} from '../src/v815-place-store.js';
import {readCloudSnapshot,saveCloudSnapshot,isValidEmail,cloudConfiguration} from '../src/v824-favorites-cloud.js';
const root=new URL('../',import.meta.url);
const source=file=>fs.readFileSync(new URL(file,root),'utf8');
const store=new Map();
const installStorage=()=>{
  store.clear();globalThis.localStorage={getItem:key=>store.get(key)??null,setItem:(key,val)=>store.set(key,String(val)),removeItem:key=>store.delete(key)};
};
const subway={name:'상도',kind:'subway',lng:126.9532,lat:37.5012,lines:['7호선'],selectedLine:'7호선'};
const bus={name:'상도역',kind:'bus',lng:126.9532,lat:37.5012,arsId:'20158'};
const place={name:'상도시장',lng:126.9532,lat:37.5012};
test('v826: metro, bus and facilities with shared coordinates keep separate favorites',()=>{
  installStorage();
  assert.notEqual(placeKey(subway),placeKey(bus));
  assert.notEqual(placeKey(place),placeKey(bus));
  assert.equal(addSavedPlace(subway).saved,true);
  assert.equal(addSavedPlace(bus).saved,true);
  assert.equal(toggleSavedPlace(place).saved,true);
  assert.equal(savedPlaces().length,3);
  assert.equal(cleanPlace(bus).arsId,'20158');
  assert.deepEqual(cleanPlace(subway).lines,['7호선']);
  assert.equal(removeSavedPlace(bus),true);
  assert.equal(savedPlaces().length,2);
  delete globalThis.localStorage;
});
test('v826: custom groups can be created renamed deleted and reassign existing records',()=>{
  installStorage();
  assert.equal(createPlaceFolder('출퇴근'),'출퇴근');
  assert.equal(createPlaceFolder('출퇴근'),null);
  assert.equal(addSavedPlace(bus,'출퇴근').saved,true);
  assert.equal(savedPlaces()[0].folder,'출퇴근');
  assert.equal(renamePlaceFolder('출퇴근','지하철·버스'),true);
  assert.equal(savedPlaces()[0].folder,'지하철·버스');
  assert.equal(setSavedPlaceFolder(bus,'집'),true);
  assert.equal(savedPlaces()[0].folder,'집');
  assert.equal(deletePlaceFolder('지하철·버스'),true);
  assert.equal(getPlaceFolders().includes('지하철·버스'),false);
  assert.equal(deletePlaceFolder('즐겨찾기'),false);
  delete globalThis.localStorage;
});
test('v826: deleting a custom group rehomes its favorites instead of deleting the place',()=>{
  installStorage();createPlaceFolder('동작구 산책');addSavedPlace(place,'동작구 산책');
  assert.equal(deletePlaceFolder('동작구 산책'),true);
  assert.equal(savedPlaces()[0].folder,'즐겨찾기');
  delete globalThis.localStorage;
});
test('v826: snapshot sanitizes out-of-range coordinates, duplicates and unknown groups',()=>{
  installStorage();
  const remote={groups:['즐겨찾기','여행','여행'],places:[
    {...bus,folder:'여행'}, {...bus,folder:'여행'}, {name:'bad',lng:0,lat:0,folder:'여행'},
    {...subway,folder:'does not exist'}
  ]};
  assert.equal(replaceFavoritesSnapshot(remote),true);
  assert.deepEqual(getPlaceFolders().filter(x=>x==='여행'),['여행']);
  assert.equal(savedPlaces().length,2);
  assert.equal(savedPlaces().find(x=>x.kind==='subway').folder,'즐겨찾기');
  assert.equal(favoritesSnapshot().places.length,2);
  delete globalThis.localStorage;
});
test('v826: server and guest snapshots are merged by stable ID without losing existing groups',()=>{
  installStorage();
  const merged=mergeFavoritesSnapshots({groups:['회사'],places:[{...subway,folder:'회사'}]},
    {groups:['학교앞'],places:[{...bus,folder:'학교앞'}]});
  assert.deepEqual(merged.groups,['회사','학교앞']);
  assert.equal(merged.places.length,2);
  delete globalThis.localStorage;
});
test('v826: server API selects and upserts ONLY user-scoped snapshot rows',async()=>{
  const calls=[];
  const mock={from(name){assert.equal(name,'user_favorite_state');return {
    select(field){calls.push(['select',field]);return {eq(key,value){calls.push(['eq',key,value]);return {maybeSingle:async()=>({data:{snapshot:{groups:[],places:[place]}},error:null})};}};},
    upsert(body,options){calls.push(['upsert',body.user_id,options.onConflict]);return Promise.resolve({error:null});}
  };}};
  assert.equal((await readCloudSnapshot(mock,'id-1')).places.length,1);
  assert.equal(await saveCloudSnapshot(mock,'id-1',{groups:[],places:[]}),true);
  assert.deepEqual(calls[1],['eq','user_id','id-1']);
  assert.deepEqual(calls[2],['upsert','id-1','user_id']);
});
test('v826: opt-in cloud config never requires a service role secret',()=>{
  assert.equal(isValidEmail('walk@example.com'),true);
  assert.equal(isValidEmail('invalid'),false);
  assert.equal(cloudConfiguration().configured,false);
  const sql=source('supabase/favorites.sql');
  assert.match(sql,/enable row level security/);
  assert.match(sql,/auth\.uid\(\)/);
  assert.match(sql,/revoke all .* from anon, authenticated/);
  assert.doesNotMatch(source('src/v824-favorites-cloud.js'),/service_role\s*[:=]\s*['"]/);
});
test('v826: transport detail, personal list, online account and release history are integrated',()=>{
  assert.match(source('src/transport-map.js'),/transport-save-place/);
  assert.match(source('src/transport-map.js'),/dongjak:open-saved-transport/);
  assert.match(source('src/v815-map-product.js'),/createPlaceFolder/);
  assert.match(source('src/v815-map-product.js'),/installFavoritesCloud/);
  assert.match(source('src/app-release-log.json'),/버스정류장·지하철역 교통정보창에서 즐겨찾기를 저장/);
  assert.match(source('src/transport-map.js'),/createSelectedTransportPin/);
  assert.match(source('src/transport-map.js'),/mobileTransportFocusOffset/);
  assert.ok(JSON.parse(source('src/app-release-log.json')).releases.some(entry=>entry.version==='8.1.0')); 
  assert.match(source('src/app-release-log.json'),/\"sourceVersion\": \"v8\.26\.0\"/);
  assert.match(source('index.html'),/v824-favorites\.css/);
  assert.match(source('src/place-details.js'),/getPlaceFolders\(\)/);
});

test('v826: session identity change clears the previous account before loading the next',()=>{
  const auth=source('src/v824-favorites-cloud.js');
  assert.match(auth,/incoming\?\.id&&user\?\.id&&incoming\.id!==user\.id/);
  assert.match(auth,/replaceFavoritesSnapshot\(\{groups:\[\],places:\[\]\},\{origin:'cloud'\}\)/);
});
