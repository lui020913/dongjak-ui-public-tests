/** v7.10.3 / opt-in safety markers. All glyphs share one 24-unit vector source.
 * The existing bus-stop marker is 64 px with icon-size 0.23 / 0.29 / 0.35
 * at zoom 16.4 / 18.2 / 20. Our 64px glyphs use 1.5x that size.
 */
export const BUS_STOP_REFERENCE_SIZES = Object.freeze([[16.4,0.23],[18.2,0.29],[20,0.35]]);
export const SAFETY_MARKER_RATIO = 1.5;
export const SAFETY_MARKER_LAYOUT_SIZE = Object.freeze([
  'interpolate',['linear'],['zoom'],13.3,0.26,16.4,0.345,18.2,0.435,20,0.525
]);
export const SAFETY_GLYPH_PATHS = Object.freeze({
  'audio-signals':['M5 9H9L14 5V19L9 15H5Z','M17 9A4 4 0 0 1 17 15','M19 6A8 8 0 0 1 19 18'],
  'official-aed':['M12 21L4.2 13.2a5.2 5.2 0 0 1 7.8-7.1 5.2 5.2 0 0 1 7.8 7.1Z','M11 8L9 13H12L11 17L16 11H12L13 8'],
  'road-incidents':['M3 17L8 6H16L21 17','M5 17H19','M8 10H16','M9 14H9.1','M15 14H15.1'],
  'sdot-environment':['M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0Z','M12 10v8','M12 18h.1'],
  accidents:[
    'M12 3 22 21H2L12 3Z',
    'M12 9V14','M12 17.5V17.6'
  ],
  'cctv-security':[
    'M3 8H17L21 12L17 16H3V8Z',
    'M8 16V21','M4 21H12','M17 12H17.1'
  ],
  'cctv-parking':[
    'M6 3H18A3 3 0 0 1 21 6V18A3 3 0 0 1 18 21H6A3 3 0 0 1 3 18V6A3 3 0 0 1 6 3Z',
    'M9 17V7H13A3 3 0 0 1 13 13H9'
  ],
  'cctv-other':[
    'M3 9H16L20 12L16 15H3V9Z',
    'M8 15V20','M4 20H12','M20 12H22'
  ],
  'survey-crosswalk':[
    'M3 4H21V20H3V4Z',
    'M7 7V17','M12 7V17','M17 7V17'
  ],
  'metro-elevator':[
    'M4 3H20V21H4V3Z',
    'M9 10L12 7L15 10','M12 7V17','M9 14L12 17L15 14'
  ],
  slope:['M3 20L9 13L13 15L21 5','M14 5H21V12']
});
export const SAFETY_ICON_COLORS = Object.freeze({
  'audio-signals':'#178e89','official-aed':'#cb4b66',
  'road-incidents':'#d46b3b','sdot-environment':'#a76d31',accidents:'#c75039','cctv-security':'#19847c','cctv-parking':'#b68128',
  'cctv-other':'#6a6b88','survey-crosswalk':'#0d9488',
  'metro-elevator':'#4e7cc3',slope:'#4f948d'
});

/** Identical path artwork is used by the control legend and the MapLibre marker. */
export function iconSvgMarkup(name){
  const paths=SAFETY_GLYPH_PATHS[name];
  if(!paths)return '';
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">${paths.map(d=>`<path d="${d}"/>`).join('')}</svg>`;
}

export function registerSafetyPictogram(map,name,overrideColor){
  if(typeof document==='undefined')return false;
  const key=`dj-safety-symbol-${name}${overrideColor?'-review':''}`;
  if(map.hasImage?.(key))return key;
  const color=overrideColor||SAFETY_ICON_COLORS[name];
  const paths=SAFETY_GLYPH_PATHS[name];
  if(!color||!paths)return false;
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
  const ctx=canvas.getContext?.('2d');
  if(!ctx||typeof Path2D==='undefined')return false;
  ctx.clearRect(0,0,64,64);
  ctx.fillStyle='rgba(3,26,35,.22)';ctx.beginPath();ctx.roundRect(3,5,58,58,15);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.roundRect(2,1,60,60,16);ctx.fill();
  ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(6,5,52,52,12);ctx.fill();
  ctx.save();ctx.translate(10,9);ctx.scale(44/24,44/24);
  ctx.strokeStyle='#fff';ctx.lineWidth=2.55;ctx.lineJoin='round';ctx.lineCap='round';
  for(const d of paths)ctx.stroke(new Path2D(d));
  ctx.restore();
  try{
    map.addImage(key,{width:64,height:64,data:ctx.getImageData(0,0,64,64).data});
    return key;
  }catch(error){console.warn('[보행안전 지도 아이콘 등록]',name,error);return false;}
}
