import test from 'node:test';
import assert from 'node:assert/strict';
import {GREEN_REVIEW_COUNT,greenReviewPreviewEnabled,geometryReviewKey,partitionGreenReview} from '../src/green-building-review-preview.js';
const geometry={type:'Polygon',coordinates:[[[126.929518,37.503694],[126.929493,37.503691],[126.929476,37.503699],[126.929472,37.503719],[126.929485,37.503735],[126.929511,37.503738],[126.929528,37.503727],[126.929533,37.503709],[126.929518,37.503694]]]};
const feature={geometry,properties:{}};
test('audit preview is opt-in, 470 candidates, geometry-specific and sheet-specific',()=>{
 assert.equal(GREEN_REVIEW_COUNT,470);
 assert.equal(greenReviewPreviewEnabled(''),false);
 assert.equal(greenReviewPreviewEnabled('?greenBuildingPreview=1'),true);
 assert.equal(partitionGreenReview(2,[feature]).visible.length,1);
 assert.equal(partitionGreenReview(2,[feature],true).reviewExcluded.length,1);
 assert.equal(partitionGreenReview(1,[feature],true).visible.length,1);
 assert.equal(partitionGreenReview(2,[{...feature,properties:{name:'도서관'}}],true).visible.length,1);
 assert.equal(partitionGreenReview(2,[{...feature,properties:{amenity:'toilets'}}],true).visible.length,1);
});
