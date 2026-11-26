// Shared live bus glyph. A front-view neutral badge conveys no geographic heading.
export const NEUTRAL_BUS_IMAGE='dj-live-bus-neutral';
export function neutralBusArt(){
 const width=48,height=48,data=new Uint8Array(width*height*4);
 const rect=(x0,y0,x1,y1,r,color)=>{
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
   const dx=Math.max(x0+r-x,0,x-(x1-r-1)),dy=Math.max(y0+r-y,0,y-(y1-r-1));
   if(dx*dx+dy*dy>r*r)continue;
   data.set(color,(y*width+x)*4);
  }
 };
 const white=[255,255,255,255],blue=[38,114,188,255],glass=[216,234,248,255],dark=[35,77,118,255];
 rect(5,3,43,45,9,white);rect(8,6,40,42,7,blue);
 rect(13,12,35,27,3,glass);rect(20,30,28,33,1,white);
 rect(13,34,18,39,2,white);rect(30,34,35,39,2,white);
 rect(12,40,19,44,1,dark);rect(29,40,36,44,1,dark);
 return {width,height,data};
}
export function ensureNeutralBusImage(map){
 try{if(map.hasImage?.(NEUTRAL_BUS_IMAGE))return true;if(!map.addImage)return false;map.addImage(NEUTRAL_BUS_IMAGE,neutralBusArt(),{pixelRatio:3});return true;}catch{return false;}
}
