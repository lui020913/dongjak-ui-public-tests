import test from 'node:test';
import assert from 'node:assert/strict';
import {TRAIN_BEAM_WIDTH,TRAIN_BEAM_HEIGHT,createTrainBeamSprite,
  ensureTrainBeamImages,trainBeamImageId} from '../src/features/liveTransit/train-beams.js';

test('the two soft headlight beams point forward and mirror exactly',()=>{
  const left=createTrainBeamSprite('left'),right=createTrainBeamSprite('right');
  assert.equal(right.width,256);assert.equal(right.height,96);
  assert.equal(left.data.length,TRAIN_BEAM_WIDTH*TRAIN_BEAM_HEIGHT*4);
  assert.equal(createTrainBeamSprite('unknown'),null);
  let lit=0,transparent=0,fartherLit=0;
  for(let y=0;y<TRAIN_BEAM_HEIGHT;y++)for(let x=0;x<TRAIN_BEAM_WIDTH;x++){
    const i=(y*TRAIN_BEAM_WIDTH+x)*4,j=(y*TRAIN_BEAM_WIDTH+TRAIN_BEAM_WIDTH-1-x)*4;
    for(let k=0;k<4;k++)assert.equal(left.data[j+k],right.data[i+k]);
    const alpha=right.data[i+3];if(alpha){lit++;if(x>195)fartherLit++}else transparent++;
    assert(alpha<=220,'beam remains a bounded translucent white-blue glow');
    if(x<169)assert.equal(alpha,0,'no beam behind the train nose');
  }
  assert(lit>300&&transparent>16000&&fartherLit>100);
  assert.equal(right.data[(45*256+250)*4+3],0,'beam tip fades away');
});

test('registering beams does not update or replace the existing train atlas',()=>{
  const images=new Map([['dj-live-train-1호선',{art:'original'}]]);
  const map={hasImage:id=>images.has(id),addImage:(id,sprite,options)=>{assert.equal(options.pixelRatio,3);images.set(id,sprite);}};
  assert.equal(ensureTrainBeamImages(map),true);
  assert(images.has(trainBeamImageId('left'))&&images.has(trainBeamImageId('right')));
  assert.deepEqual(images.get('dj-live-train-1호선'),{art:'original'});
  const count=images.size;assert.equal(ensureTrainBeamImages(map),true);assert.equal(images.size,count);
});
