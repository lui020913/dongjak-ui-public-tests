// Paint two compact headlights onto the leading end of the existing RGBA sprite.
// Keep source artwork, canvas dimensions, pixel ratio and the centre of rotation.
// This is a direction indicator, not live information about the train's real lights.
export function withTrainHeadlights(sprite,facing){
  if(!sprite||!['left','right'].includes(facing))return sprite;
  const {width:w,height:h,data:original}=sprite;
  if(!Number.isInteger(w)||!Number.isInteger(h)||!original||original.length!==w*h*4)return sprite;
  let minX=w,maxX=-1,minY=h,maxY=-1;
  const alpha=(x,y)=>original[(y*w+x)*4+3];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(alpha(x,y)>=180){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
  const bh=maxY-minY+1,bw=maxX-minX+1;
  if(bh<10||bw<24)return sprite;
  const dir=facing==='right'?1:-1;
  const data=new Uint8Array(original);
  const unit=Math.min(w,h)/96;
  const rim=3.7*unit,core=2.05*unit;
  // Use the opaque front silhouette instead of hard-coded atlas crop positions.
  // Keep both lights inside the train; never put an arrow or beam on the track.
  for(const fraction of [.44,.68]){
    const y=Math.round(minY+(bh-1)*fraction);
    let edge=facing==='right'?maxX:minX;
    while(edge>=minX&&edge<=maxX&&alpha(edge,y)<180)edge-=dir;
    if(edge<minX||edge>maxX)continue;
    const cx=edge-dir*Math.max(3,Math.round(3.6*unit));
    if(cx<minX||cx>maxX||alpha(cx,y)<180)continue;
    for(let py=Math.max(0,Math.floor(y-rim-1));py<=Math.min(h-1,Math.ceil(y+rim+1));py++){
      for(let px=Math.max(0,Math.floor(cx-rim-1));px<=Math.min(w-1,Math.ceil(cx+rim+1));px++){
        if(alpha(px,py)<180)continue;
        const d=Math.hypot(px-cx,py-y),i=(py*w+px)*4;
        if(d>rim+.5*unit)continue;
        // Fine dark rim for contrast even on the white roof; neutral white-blue luminous core.
        const color=d<=core?[248,252,255]:d<=core+1.0*unit?[219,240,255]:[44,53,59];
        const opacity=d<=core+1.0*unit?Math.min(1,1.15-(d-core)*.10):Math.max(0,Math.min(.78,(rim+.5*unit-d)/unit));
        for(let k=0;k<3;k++)data[i+k]=Math.round(data[i+k]*(1-opacity)+color[k]*opacity);
      }
    }
  }
  return {...sprite,data};
}
