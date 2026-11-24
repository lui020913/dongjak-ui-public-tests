import test from 'node:test';
import assert from 'node:assert/strict';
import {TRAIN_ICON_SIZE_STOPS,TRAIN_LANE_GAP,trainLaneOffset,trainLaneOffsetExpression,providerRailDirection,resolveRailDirection,railDirectionLabel} from '../src/features/liveTransit/train-lanes.js';
const rad=Math.PI/180;
// MapLibre icon-offset is rotated in local sprite coordinates.
function screenOffset(line,angle,facing){
  const rotation=(angle-(facing==='left'?180:0))*rad;
  const y=trainLaneOffset(line,facing,true);
  return [-Math.sin(rotation)*y,Math.cos(rotation)*y];
}
test('nearby train icons preserve clear sightlines and opposing lane separation',()=>{
  assert.deepEqual(TRAIN_ICON_SIZE_STOPS.filter((_,i)=>i%2===0),[11,12.5,13.2,15.5,18,20,22]);
  const sizes=TRAIN_ICON_SIZE_STOPS.filter((_,i)=>i%2===1);
  assert(sizes.every((v,i)=>v>0&&(i===0||v>=sizes[i-1])));
  assert(sizes[3]===1&&sizes[4]>=1.8&&sizes[5]>=3&&sizes[6]<=4.3);
  assert(sizes[6]/sizes[2]>5,'close zoom must visibly enlarge trains');
  assert(TRAIN_LANE_GAP>=10&&TRAIN_LANE_GAP<=14);
});
test('opposing trains remain on correct sides through arbitrary screen rotations and sprite mirroring',()=>{
  for(const angle of [0,32,90,120,179,225,270,340])for(const facing of ['left','right']){
    const travel=[Math.cos(angle*rad),Math.sin(angle*rad)];
    for(const line of ['1호선','2호선','4호선','7호선','9호선','신림선']){
      const [x,y]=screenOffset(line,angle,facing);
      const cross=travel[0]*y-travel[1]*x;
      const expected=(line==='1호선'?-1:1)*TRAIN_LANE_GAP;
      assert(Math.abs(cross-expected)<1e-8);
      const [rx,ry]=screenOffset(line,angle+180,facing);
      assert(Math.abs(rx+x)<1e-8&&Math.abs(ry+y)<1e-8);
    }
  }
});
test('unknown heading, unrecognized line and unavailable data are not assigned an invented lane',()=>{
  assert.equal(trainLaneOffset('1호선','right',false),0);
  assert.equal(trainLaneOffset('7호선',null,true),0);
  assert.equal(trainLaneOffset('unknown','right',true),0);
  assert.deepEqual(trainLaneOffsetExpression().at(-1),['literal',[0,0]]);
});
test('official direction codes and Korean labels are supported',()=>{
  for(const value of [0,'0','상행','내선','내선순환'])assert.equal(providerRailDirection(value),'up');
  for(const value of [1,'1','하행','외선','외선순환'])assert.equal(providerRailDirection(value),'down');
  assert.equal(providerRailDirection(''),null);
  assert.equal(railDirectionLabel('1호선','up'),'상행');
  assert.equal(railDirectionLabel('9호선','down'),'하행');
  assert.equal(railDirectionLabel('2호선','up'),'내선순환');
  assert.equal(railDirectionLabel('2호선','down'),'외선순환');
});
test('loop direction takes precedence; linear routes retain destination correction',()=>{
  assert.equal(resolveRailDirection('2호선','0',2,0,null),'up');
  assert.equal(resolveRailDirection('2호선','1',0,2,null),'down');
  assert.equal(resolveRailDirection('2호선','',0,2,null),null);
  assert.equal(resolveRailDirection('9호선','0',2,0,null),'down');
  assert.equal(resolveRailDirection('7호선','',-1,-1,'up'),'up');
});
