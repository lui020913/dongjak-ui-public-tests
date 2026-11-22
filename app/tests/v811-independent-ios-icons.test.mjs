import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const read=rel=>readFileSync(new URL(rel,root));
const sha=data=>createHash('sha256').update(data).digest('hex');
const index=read('index.html').toString('utf8');
const artwork=read('src/app-artwork-v7104.js').toString('utf8');

function pngMeta(rel){
  const data=read(rel);
  assert.equal(data.subarray(1,4).toString('ascii'),'PNG');
  return {data,width:data.readUInt32BE(16),height:data.readUInt32BE(20),hasAlpha:data[25]===6};
}

test('iPhone Home Screen icon is its own alpha PNG, not the light or dark theme icon',()=>{
  assert.match(index,/rel="apple-touch-icon"[^>]*href="\/icons\/dongjak-ios-home-180\.png"/);
  for(const s of [180,192,512]){
    const ios=pngMeta(`public/icons/dongjak-ios-home-${s}.png`);
    assert.equal(ios.width,s);assert.equal(ios.height,s);assert.ok(ios.hasAlpha);
    const light=read(`public/icons/dongjak-light-${s}.png`);
    const dark=read(`public/icons/dongjak-dark-${s}.png`);
    assert.notEqual(sha(ios.data),sha(light));
    assert.notEqual(sha(ios.data),sha(dark));
    assert.notEqual(sha(light),sha(dark));
  }
});

test('v8.0.3 existing light theme icons have been restored byte-for-byte',()=>{
  const originals={180:'7a0b68393c12',192:'5f9851c9d820',512:'0afb91263c6d',1024:'af2bea3ab455'};
  for(const [size,expected] of Object.entries(originals)){
    assert.equal(sha(read(`public/icons/dongjak-light-${size}.png`)).slice(0,12),expected);
  }
});

test('theme artwork module does not rewrite the iOS Home Screen icon',()=>{
  assert.doesNotMatch(artwork,/getElementById\('dj-apple-touch-icon'\)/);
  assert.match(artwork,/dongjak-\$\{mode\}/);
  for(const mode of ['light','dark']){
    const manifest=JSON.parse(read(`public/manifest-${mode}.webmanifest`).toString('utf8'));
    assert.ok(manifest.icons.every(icon=>icon.src.includes(`dongjak-${mode}-`)));
  }
});

test('pre-paint theme switching keeps iOS icon path stable while updating manifest',()=>{
  const boot=index.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  assert.ok(boot);
  for(const targetMode of ['dark','light']){
    const touch={href:'/icons/dongjak-ios-home-180.png'};
    const manifest={href:'/manifest-light.webmanifest'};
    const theme={content:''};
    const doc={documentElement:{dataset:{},classList:{toggle(){}}},getElementById(id){
      return id==='dj-apple-touch-icon'?touch:id==='dj-app-manifest'?manifest:id==='dj-browser-theme-color'?theme:null;
    }};
    const pending={expires:Date.now()+5000,theme:targetMode,night:targetMode==='dark'?'on':null};
    const localStorage={getItem:()=>targetMode,setItem(){}};
    const sessionStorage={getItem:()=>JSON.stringify(pending),removeItem(){}};
    vm.runInNewContext(boot,{document:doc,localStorage,sessionStorage,Date,navigator:{userAgent:''},window:{matchMedia:()=>({matches:false})}},{timeout:1500});
    assert.equal(touch.href,'/icons/dongjak-ios-home-180.png');
    assert.equal(manifest.href,`/manifest-${targetMode}.webmanifest`);
  }
});
