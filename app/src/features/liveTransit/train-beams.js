/**
 * Soft forward-facing radial pools for the live train symbol layer.
 * This is a separate translucent map image: the established train shape,
 * train atlas and the physical rail geometry are deliberately unchanged.
 */
export const TRAIN_BEAM_WIDTH=256;
export const TRAIN_BEAM_HEIGHT=96;
export const TRAIN_BEAM_LENGTH=78;
export const TRAIN_BEAM_LAYER='dongjak-live-metro-beams-v9251';
export const trainBeamImageId=facing=>`dj-live-train-beam-${facing==='left'?'left':'right'}`;

export function createTrainBeamSprite(facing){
  if(facing!=='left'&&facing!=='right')return null;
  const width=TRAIN_BEAM_WIDTH,height=TRAIN_BEAM_HEIGHT;
  const data=new Uint8Array(width*height*4);
  const direction=facing==='right'?1:-1;
  const originX=(width-1)/2+direction*44;
  const originY=(height-1)/2;
  const radius=TRAIN_BEAM_LENGTH;
  // Radial rays originate at the train nose and spread only forwards.
  // Feather both the distance and angular edge; no detached circular pool.
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const forward=(x-originX)*direction,side=Math.abs(y-originY);
    if(forward<=0)continue;
    const r=Math.hypot(forward,side)/radius;
    const angle=Math.atan2(side,forward);
    if(r>=1||angle>=Math.PI*0.28)continue;
    const t=Math.max(0,Math.min(1,(Math.PI*0.28-angle)/(Math.PI*0.15)));
    const feather=t*t*(3-2*t);
    const alpha=Math.round(255*.96*Math.pow(1-r,1.25)*feather);
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
