/** Apply the same user text-size preference to MapLibre symbol text.
 * Zoom-dependent expressions must keep their zoom input at the top level:
 * wrapping the entire interpolate in ['*', ...] is invalid on some engines.
 */
export const MAP_TEXT_SCALE=Object.freeze({small:0.88,normal:1,large:1.16});
export function scaleMapLabelSize(original,choice='normal'){
 const factor=MAP_TEXT_SCALE[choice]??1;
 if(factor===1||original==null)return original??null;
 const mult=x=>typeof x==='number'?Math.round(x*factor*100)/100:['*',x,factor];
 if(typeof original==='number')return mult(original);
 if(!Array.isArray(original)||!Array.isArray(original[1]))return original;
 if(original[0]==='interpolate' && original[2]?.[0]==='zoom'){
  return original.map((item,i)=>i>=4&&i%2===0?mult(item):item);
 }
 if(original[0]==='step' && original[1]?.[0]==='zoom'){
  return original.map((item,i)=>i>=2&&i%2===0?mult(item):item);
 }
 return original; // Do not invalidate unknown expression semantics.
}
