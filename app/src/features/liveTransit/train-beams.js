/**
 * Soft forward-facing radial pools for the live train symbol layer.
 * This is a separate translucent map image: the established train shape,
 * train atlas and the physical rail geometry are deliberately unchanged.
 */
export const TRAIN_BEAM_WIDTH=256;
export const TRAIN_BEAM_HEIGHT=96;
export const TRAIN_BEAM_LENGTH=77;
export const TRAIN_BEAM_LAYER='dongjak-live-metro-beams-v9251';
export const trainBeamImageId=facing=>`dj-live-train-beam-${facing==='left'?'left':'right'}`;

export function createTrainBeamSprite(facing){
  if(facing!=='left'&&facing!=='right')return null;
  const width=TRAIN_BEAM_WIDTH,height=TRAIN_BEAM_HEIGHT;
  const data=new Uint8Array(width*height*4);
  const direction=facing==='right'?1:-1;
  const originX=(width-1)/2+direction*41;
  // Forward HALF of a soft radial light pool, not two yellow triangular cones.
  // The broad Gaussian falloff has no visible wedge boundary at any zoom.
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const depth=(x-originX)*direction;
    if(depth<0||depth>TRAIN_BEAM_LENGTH)continue;
    const forwardFade=Math.pow(Math.max(0,1-depth/TRAIN_BEAM_LENGTH),1.3);
    const radiusY=15+depth*.30;
    const dx=(depth-15)/52,dy=(y-50)/radiusY;
    const radialFalloff=Math.exp(-1.8*(dx*dx+dy*dy));
    const alpha=Math.round(255*Math.min(.82,.82*radialFalloff*forwardFade));
    if(alpha===0)continue;
    const offset=(y*width+x)*4;
    // Neutral, pale white-blue output: no yellow tint on the map surface.
    data[offset]=228;data[offset+1]=244;data[offset+2]=255;data[offset+3]=alpha;
  }
  return {width,height,data};
}

export function ensureTrainBeamImages(map){
  if(typeof map?.hasImage!=='function'||typeof map?.addImage!=='function')return false;
  for(const facing of ['left','right']){
    const name=trainBeamImageId(facing);
    if(!map.hasImage(name))map.addImage(name,createTrainBeamSprite(facing),{pixelRatio:3});
  }
  return true;
}
