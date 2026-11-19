import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {officialSearchPlaces, searchOsmGeneralFacilities, queryOfficialPlaces} from '../src/seoul-official-facilities.js';
const root=path.dirname(fileURLToPath(import.meta.url));
const read=f=>fs.readFileSync(path.join(root,'..',f),'utf8');

test('v874 facility query returns matching café and convenience stores by name/category',()=>{
 const result=officialSearchPlaces('카페',[
  {id:'1',name:'상도 카페',category:'카페',lat:37.5,lng:126.9},
  {id:'2',name:'동작 편의점',category:'편의점',lat:37.5,lng:126.91}
 ]);
 assert.equal(result.length,1);
 assert.equal(result[0].name,'상도 카페');
});

test('v874 remote search converts source responses without fabricating contact details',async()=>{
 const places=await searchOsmGeneralFacilities('노량진 카페',{fetcher:async()=>({ok:true,json:async()=>[
  {place_id:3,lon:'126.943',lat:'37.513',type:'cafe',display_name:'테스트 카페, 서울 동작구',name:'테스트 카페'},
 ]})});
 assert.equal(places.length,1);
 assert.equal(places[0].category,'카페');
 assert.equal(places[0].phone,'');
 assert.match(places[0].source,/OpenStreetMap/);
});

test('v874 query merges official places and remote results when local results are few',async()=>{
 const old=globalThis.location;
 globalThis.location={origin:'https://example.org'};
 try{
  const calls=[];
  const places=await queryOfficialPlaces('노량진',{fetcher:async(url)=>{
    const s=String(url);calls.push(s);
    if(s.includes('/api/seoul-facilities'))return {ok:true,json:async()=>({places:[{id:'a',name:'노량진약국',category:'약국',lng:126.94,lat:37.5}]})};
    return {ok:true,json:async()=>[{place_id:5,lon:'126.942',lat:'37.52',type:'cafe',display_name:'노량진 카페, 동작구',name:'노량진 카페'}]};
  }});
  assert.equal(places.length,2);
  assert.deepEqual(places.map(p=>p.category),['약국','카페']);
  assert.equal(calls.length,2);
 }finally{globalThis.location=old;}
});

test('v874 source contains stable in-place metro line change and distinct mobile styles',()=>{
 const transport=read('src/transport-map.js');
 const css=read('src/v874-comprehensive-ui.css');
 assert.match(transport,/sameStationLineChange/);
 assert.match(transport,/if\(!sameStationLineChange\)\{onOpen\(\);panel\.hidden=false;\}/);
 assert.match(transport,/if\(!sameStationLineChange\)selectionMarker=/);
 assert.match(css,/@media\(max-width:699px\)/);
 assert.match(css,/metro-neighbor-row/);
 assert.match(css,/data-bus-class="trunk"/);
 assert.match(css,/dj-place-edge-drag/);
 assert.match(css,/\.dj-safety-nav/);
});

test('v874 weather fallback and onboarding navigator are explicit',()=>{
 const js=read('src/v874-comprehensive-ui.js');
 const css=read('src/v874-comprehensive-ui.css');
 assert.match(js,/\-\-°/);
 assert.match(js,/dataset\.dj874Navigator='dots'/);
 assert.match(css,/dj860-progress-track/);
 assert.match(css,/:active/);
});
