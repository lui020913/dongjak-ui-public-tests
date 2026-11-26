import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GREEN_REVIEW_CANDIDATES,collectGreenReviewCandidates,greenBuildingFilterEnabled,isGreenProtected,partitionGreenReview} from '../src/green-building-filter.js';
import {loadBuildingTileFeatures} from '../src/building-assets.js';
const root=new URL('../public/',import.meta.url);
const read=p=>JSON.parse(readFileSync(new URL(p.replace(/^\//,''),root),'utf8'));
test('all sixteen exact source files reconcile with the 1300 district audit candidates; protected and noncandidate footprints stay',()=>{
 const manifest=read('buildings/manifest.json');let total=0,filtered=0,protectedCount=0;
 for(const sheet of manifest.sheets){
  for(const [kind,path] of [['base',sheet.file],['supplement',sheet.supplement]]){
   const features=read(path).features;
   const candidates=collectGreenReviewCandidates(sheet.sheet,kind,features);
   total+=candidates.length;
   const result=partitionGreenReview(features,candidates,true);
   filtered+=result.reviewExcluded.length;protectedCount+=candidates.filter(isGreenProtected).length;
   assert.equal(result.reviewExcluded.length,result.reviewExcluded.filter(f=>candidates.includes(f)&&!isGreenProtected(f)).length);
   assert.equal(result.visible.length+result.reviewExcluded.length,features.length);
   assert.equal(partitionGreenReview(features,candidates,false).visible.length,features.length);
   if(candidates.length){const shifted=[{},...features];assert.equal(collectGreenReviewCandidates(sheet.sheet,kind,shifted).length,0);}
  }
 }
 assert.equal(GREEN_REVIEW_CANDIDATES,1300);assert.equal(total,1300);
 assert.ok(filtered>0&&protectedCount>0);assert.equal(filtered+protectedCount,1300);
 console.log('GREEN_AUDIT_FILTER',JSON.stringify({total,filtered,protectedCount}));
});
test('original comparison mode and facility protections',()=>{
 assert.equal(greenBuildingFilterEnabled(''),true);
 assert.equal(greenBuildingFilterEnabled('?greenBuildingPreview=0'),false);
 for(const properties of [{name:'도서관'},{amenity:'toilets'},{building:'school'},{floors:2}])assert.equal(isGreenProtected({properties}),true);
});
test('failed base source cannot shift supplement audit indices',async()=>{
 const sheet=read('buildings/manifest.json').sheets[5];
 const data=read(sheet.supplement);
 const result=await loadBuildingTileFeatures(sheet,async url=>url===sheet.file?{ok:false,status:502}:{ok:true,json:async()=>data});
 assert.equal(result.successfulSources,1);assert.equal(result.reviewCandidates.length,245);
});
