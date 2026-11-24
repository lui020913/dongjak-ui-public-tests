// Visual separation only: keep the estimated rail centreline coordinate unchanged.
// MapLibre rotates icon-offset together with icon-rotate and scales it by icon-size.
export const TRAIN_ICON_SIZE_STOPS=Object.freeze([11,.81,12.5,.90,13.2,1.00,15.5,1.16,18,1.40]);
export const TRAIN_LANE_GAP=12; // distinct directions without altering source track coordinates
const LEFT_TRAFFIC=new Set(['1호선']);
const RIGHT_TRAFFIC=new Set(['2호선','4호선','7호선','9호선','신림선']);
export function providerRailDirection(value){
  const code=String(value??'').trim();
  if(['0','상행','내선','내선순환'].includes(code))return 'up';
  if(['1','하행','외선','외선순환'].includes(code))return 'down';
  return null;
}
export function resolveRailDirection(line,providerDirection,from,to,terminal){
  const supplied=providerRailDirection(providerDirection);
  // On the circular 2 line a destination can be reached from either direction.
  if(line==='2호선')return supplied;
  if(from>=0&&to>=0&&from!==to)return to>from?'up':'down';
  return terminal==='up'||terminal==='down'?terminal:supplied;
}
export function railDirectionLabel(line,direction){
  if(direction==='up')return line==='2호선'?'내선순환':'상행';
  if(direction==='down')return line==='2호선'?'외선순환':'하행';
  return '';
}
export function trainLaneOffset(line,facing,headingKnown){
  if(!headingKnown||(facing!=='right'&&facing!=='left'))return 0;
  const side=LEFT_TRAFFIC.has(line)?-1:RIGHT_TRAFFIC.has(line)?1:0;
  // A right-facing raster points along +X; its right normal is +Y.
  // A mirrored raster points along -X; its right normal is -Y.
  return side*(facing==='left'?-1:1)*TRAIN_LANE_GAP;
}
export function trainLaneOffsetExpression(){
  return ['match',['get','trainLaneOffset'],TRAIN_LANE_GAP,['literal',[0,TRAIN_LANE_GAP]],-TRAIN_LANE_GAP,['literal',[0,-TRAIN_LANE_GAP]],['literal',[0,0]]];
}
