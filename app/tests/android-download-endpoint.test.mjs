import test from 'node:test';
import assert from 'node:assert/strict';
import {androidReleaseTag,androidReleaseAsset,resolveAndroidDownload,ANDROID_DOWNLOAD_FILENAME} from '../src/browser-install-menu.mjs';
import {handleAndroidDownload} from '../functions/api/android-download.apk.js';
const sha='a'.repeat(40),v='9.2.138',marker={application_version:v,source_commit:sha,public_ui_source_commit:sha,release_status:'DEPLOYED_PRODUCTION'};
const tag='android-debug-v'+v+'-src-'+sha.slice(0,12),name='Dongjak-Safety-Map-v'+v+'-debug.apk';
const url='https://github.com/lui020913/dongjak-ui-public-tests/releases/download/'+tag+'/'+name;
const release={tag_name:tag,target_commitish:'main',draft:false,prerelease:false,assets:[{name,browser_download_url:url,state:'uploaded',size:4}]};
function fixture({m=marker,r=release,ref=sha,method='GET'}={}){
 const calls=[];
 const context={request:new Request('https://example.org/api/android-download.apk',{method}),env:{ASSETS:{fetch:async()=>Response.json(m)}}};
 const fetchImpl=async u=>{calls.push(u);if(u.endsWith('/releases/tags/'+tag))return Response.json(r);if(u.endsWith('/git/ref/tags/'+tag))return Response.json({object:{type:'commit',sha:ref}});if(u===url)return new Response(new Uint8Array([80,75,3,4]),{headers:{'content-length':'4'}});return new Response(null,{status:404});};
 return {calls,context,fetchImpl};
}
test('exact source-qualified tag matches real published format',()=>{
 assert.equal(androidReleaseTag(marker),tag);
 assert.equal(androidReleaseAsset(marker,release,'debug',sha),url);
 assert.equal(androidReleaseAsset(marker,release,'debug','b'.repeat(40)),null);
});
test('HEAD checks verified metadata without transferring APK; GET streams requested filename',async()=>{
 const head=fixture({method:'HEAD'});
 const h=await handleAndroidDownload(head.context,head.fetchImpl);
 assert.equal(h.status,200);assert.equal(h.headers.get('X-Dongjak-APK-Verified'),'1');assert.equal(head.calls.length,2);
 const get=fixture(),g=await handleAndroidDownload(get.context,get.fetchImpl);
 assert.equal(g.status,200);assert.equal(g.headers.get('Content-Disposition'),'attachment; filename="'+ANDROID_DOWNLOAD_FILENAME+'"');
 assert.equal(ANDROID_DOWNLOAD_FILENAME,'Dongjak Safety Map.apk');
 assert.deepEqual(new Uint8Array(await g.arrayBuffer()),new Uint8Array([80,75,3,4]));assert.equal(get.calls.length,3);
});
test('preview, mismatched source, draft and missing asset cannot download',async()=>{
 for(const options of [{m:{...marker,release_status:'CANDIDATE_PREVIEW_NOT_PRODUCTION'}},{m:{...marker,public_ui_source_commit:'b'.repeat(40)}},{ref:'b'.repeat(40)},{r:{...release,draft:true}},{r:{...release,assets:[]}}]){
  const f=fixture(options);assert.equal((await handleAndroidDownload(f.context,f.fetchImpl)).status,503);assert.ok(!f.calls.includes(url));
 }
});
test('install menu only advertises the same-origin endpoint after verified HEAD',async()=>{
 const win={location:{href:'https://example.org/'},fetch:async(path,opts)=>{assert.equal(path,'/api/android-download.apk');assert.equal(opts.method,'HEAD');return new Response(null,{headers:{'X-Dongjak-APK-Verified':'1'}});}};
 assert.equal(await resolveAndroidDownload(win),'https://example.org/api/android-download.apk');
 win.fetch=async()=>new Response(null,{status:503});assert.equal(await resolveAndroidDownload(win),null);
});