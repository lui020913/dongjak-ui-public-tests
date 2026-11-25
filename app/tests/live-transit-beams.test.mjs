import test from 'node:test';
import assert from 'node:assert/strict';
import {TRAIN_BEAM_WIDTH,TRAIN_BEAM_HEIGHT,createTrainBeamSprite,
  ensureTrainBeamImages,trainBeamImageId} from '../src/features/liveTransit/train-beams.js';

test('single radial light pool is circular, mirrored and fades smoothly',()=>{
 const left=createTrainBeamSprite('left'),right=createTrainBeamSprite('right');
 assert.equal(right.width,256);assert.equal(right.height,96);
 assert.equal(left.data.length,TRAIN_BEAM_WIDTH*TRAIN_BEAM_HEIGHT*4);
 assert.equal(createTrainBeamSprite('unknown'),null);
 const alpha=(x,y)=>right.data[(y*256+x)*4+3];
 for(let y=0;y<96;y++)for(let x=0;x<256;x++){
   const i=(y*256+x)*4,j=(y*256+255-x)*4;
   for(let k=0;k<4;k++)assert.equal(left.data[j+k],right.data[i+k]);
   assert(alpha(x,y)<=245);
 }
 assert(alpha(199,47)>230);
 assert.equal(alpha(219,47),alpha(199,67));
 assert.equal(alpha(179,47),alpha(199,27));
 assert(alpha(219,47)<alpha(199,47));
 assert(alpha(219,47)>100);
 assert.equal(alpha(250,45),0);
 const offset=(47*256+219)*4;assert(right.data[offset]<150);assert.equal(right.data[offset+2],255);
});

test('registering beams does not update or replace the existing train atlas',()=>{
  const images=new Map([['dj-live-train-1호선',{art:'original'}]]);
  const map={hasImage:id=>images.has(id),addImage:(id,sprite,options)=>{assert.equal(options.pixelRatio,3);images.set(id,sprite);}};
  assert.equal(ensureTrainBeamImages(map),true);
  assert(images.has(trainBeamImageId('left'))&&images.has(trainBeamImageId('right')));
  assert.deepEqual(images.get('dj-live-train-1호선'),{art:'original'});
  const count=images.size;assert.equal(ensureTrainBeamImages(map),true);assert.equal(images.size,count);
});
