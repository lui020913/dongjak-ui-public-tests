import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('public map labels have no retired night ownership dependency',()=>{
 for(const file of ['src/readable-3d-labels.js','src/hangang-bridge-labels.js','src/featured-place-labels.js','src/nearby-place-labels.js'])assert.doesNotMatch(read(file),/nightOwnsLayerOrder|v913-night-poi-isolation/);
 assert.equal(existsSync(new URL('../src/v913-night-poi-isolation.js',import.meta.url)),false);
});
test('the shared mobile layout and onboarding remain active without the retired night UI',()=>{
 const main=read('src/main.js'),html=read('index.html'),tour=read('src/v860-onboarding.js');
 assert.ok(!main.includes('v913-pc-design-system.css'));
 assert.ok(main.includes("import './mobile-first-layout.css'"));
 assert.ok(!html.includes('id="night-visibility-quick-off"'));
 assert.ok(tour.includes("app.dataset.dj860AutoResolved='true'"));
});
