/**
 * Soft forward-facing radial pools for the live train symbol layer.
 * This is a separate translucent map image: the established train shape,
 * train atlas and the physical rail geometry are deliberately unchanged.
 */
export const TRAIN_BEAM_WIDTH=256;
export const TRAIN_BEAM_HEIGHT=96;
export const TRAIN_BEAM_LENGTH=45;
export const TRAIN_BEAM_LAYER='dongjak-live-metro-beams-v9251';
export const trainBeamImageId=facing=>`dj-live-train-beam-${facing==='left'?'left':'right'}`;

export function createTrainBeamSprite(facing){
  if(facing!=='left'&&facing!=='right')return null;
  const width=TRAIN_BEAM_WIDTH,height=TRAIN_BEAM_HEIGHT;
  const data=new Uint8Array(width*height*4);
  const direction=facing==='right'?1:-1;
  const originX=(width-1)/2+direction*72;
  const originY=(height-1)/2;
  const radius=TRAIN_BEAM_LENGTH;
  // One circular radial gradient centered just beyond the nose.
  // No triangles, paired light dots or hard edges.
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const r=Math.hypot(x-originX,y-originY)/radius;
    if(r>=1)continue;
    const alpha=Math.round(255*.96*Math.pow(1-r,0.95));
    if(!alpha)continue;
    const offset=(y*width+x)*4;
    // Warm-white core and soft amber fringe read as an incandescent headlamp.
    const core=Math.max(0,1-r*3);
    data[offset]=255;data[offset+1]=Math.round(211+38*core);data[offset+2]=Math.round(138+97*core);data[offset+3]=alpha;
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
