export function isReviewPhoto(value){return typeof value==='string'&&value.length<=410000&&/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]+={0,2}$/.test(value);}
export async function compressReviewPhoto(file,doc=document,win=window){
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>15*1024*1024)throw Error('Invalid photo');
 const url=win.URL.createObjectURL(file);
 try{
 const img=new win.Image();await new Promise((ok,fail)=>{img.onload=ok;img.onerror=fail;img.src=url;});
 const dim=Math.max(img.naturalWidth,img.naturalHeight);if(!dim)throw Error('Invalid photo');
 for(const bound of [1100,900,720,560]){const scale=Math.min(1,bound/dim),canvas=doc.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);for(const quality of [.78,.64,.5]){const value=canvas.toDataURL('image/jpeg',quality);if(isReviewPhoto(value))return value;}}
 throw Error('Photo too large');
 }finally{win.URL.revokeObjectURL(url);}
}
