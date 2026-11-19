import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, statSync} from 'node:fs';

const code=readFileSync(new URL('../src/v860-onboarding.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/v860-onboarding.css',import.meta.url),'utf8');
const banners=[
  ['welcome','01-map-overview.png'],
  ['safety','02-safety-layers.png'],
  ['route','03-walking-route.png'],
  ['discover','04-local-discovery.png'],
  ['account','05-account-favorites.png']
];

test('all five existing onboarding pages use local horizontal AI illustration slots',()=>{
  assert.equal(banners.length,5);
  for(const [key,filename] of banners){
    assert.match(code,new RegExp("key:'"+key+"'[^\\n]*src:'/onboarding/"+filename.replaceAll('.','\\.')+"'"));
    const file=new URL('../public/onboarding/'+filename,import.meta.url);
    const data=readFileSync(file);
    assert.equal(data.subarray(1,4).toString(),'PNG','PNG signature '+filename);
    const width=data.readUInt32BE(16), height=data.readUInt32BE(20);
    assert.equal(width,1440,filename+' width');
    assert.equal(height,720,filename+' height');
    assert.ok(statSync(file).size<750000,'mobile optimized '+filename);
  }
});
test('AI banners fill square-cornered hero while retaining SVG fallback',()=>{
  assert.match(css,/dj860-visual-pane\.dj860-ai-banner-pane/);
  assert.match(css,/position:absolute!important/);
  assert.match(css,/object-fit:cover!important/);
  assert.match(css,/border-radius:0!important/);
  assert.match(code,/image\.addEventListener\('error'/);
  assert.match(code,/visual\.innerHTML=ARTWORK\[slide\.key\]/);
  assert.match(code,/visual\.classList\.toggle\('dj860-has-ai-banner'/);
});
test('Skip is bold; progress dots and navigation share right alignment',()=>{
  assert.match(css,/\.dj860-onboarding \.dj860-skip\s*\{\s*font-weight:850!important/);
  assert.match(css,/\.dj860-onboarding \.dj860-dots\s*\{[\s\S]*?justify-content:flex-end!important/);
  assert.match(css,/\.dj860-onboarding \.dj860-actions\s*\{\s*justify-content:flex-end!important/);
});
