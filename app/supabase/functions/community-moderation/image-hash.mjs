// 64-bit luminance difference hash. No credentials, user IDs or image storage.
// Low-contrast images are excluded because their hashes are not discriminative.
export function differenceHash(data,width,height){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<9||height<8||width*height*4!==data.length)return null;
 const cells=[];
 for(let y=0;y<8;y++)for(let x=0;x<9;x++){
  let sum=0;
  for(let sy=0;sy<4;sy++)for(let sx=0;sx<4;sx++){
   const yy=Math.min(height-1,Math.floor((y+(sy+.5)/4)*height/8));
   const xx=Math.min(width-1,Math.floor((x+(sx+.5)/4)*width/9));
   const i=(yy*width+xx)*4;
   sum+=(299*data[i]+587*data[i+1]+114*data[i+2])/1000;
  }
  cells.push(sum/16);
 }
 if(Math.max(...cells)-Math.min(...cells)<24)return null;
 let bits='';
 for(let y=0;y<8;y++)for(let x=0;x<8;x++)bits+=cells[y*9+x]>cells[y*9+x+1]?'1':'0';
 // Flat directional gradients have low-information hashes even when contrast is high.
 if(bits.split('1').length-1<6||bits.split('0').length-1<6)return null;
 return bits;
}
