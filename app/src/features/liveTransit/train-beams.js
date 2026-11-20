/**
 * Soft forward-facing light cones for the live train symbol layer.
 * This is a separate translucent map image: the established headlight pixels,
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
  const originX=width/2+direction*41;
  // Match the two lamp heights of the existing 96px atlas crop.
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const depth=(x-originX)*direction;
    if(depth<0||depth>TRAIN_BEAM_LENGTH)continue;
    const spread=1.9+depth*.30;
    const distanceFade=Math.pow(Math.max(0,1-depth/TRAIN_BEAM_LENGTH),1.4);
    let light=0;
    for(const centreY of [45,55]){
      const widthFraction=Math.abs(y-centreY)/spread;
      if(widthFraction>=1)continue;
      const feather=Math.pow(1-widthFraction*widthFraction,2.4);
      const strength=.32*distanceFade*feather;
      light=1-(1-light)*(1-strength);
    }
    // No sharp wedge boundary: the leading edge fades into transparent pixels.
    const alpha=Math.round(255*Math.min(.42,light));
    if(alpha===0)continue;
    const offset=(y*width+x)*4;
    data[offset]=255;data[offset+1]=247;data[offset+2]=211;data[offset+3]=alpha;
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
