import {createSelectedLocationPin} from './selected-location-pin.js';

/** Temporary location pin for selected verified bus stops and metro stations.
 * Uses the same coordinate as the clicked feature. No fabricated positions. */
export function selectedTransportPinElement(place,doc=globalThis.document){
  if(!doc?.createElement)return null;
  const pin=createSelectedLocationPin(doc);
  if(!pin)return null;
  const kind=place?.kind==='subway'?'subway':'bus';
  pin.className+=` dj-selected-transport-location dj825-transport-pin--${kind}`;
  pin.setAttribute('role','img');
  pin.setAttribute('aria-label',`${kind==='bus'?'선택한 버스정류장':'선택한 지하철역'}: ${String(place?.name||'위치')}`);
  return pin;
}
export function transportPinCoordinates(place){
  const lng=Number(place?.lng),lat=Number(place?.lat);
  return Number.isFinite(lng)&&Number.isFinite(lat)&&lng>=125&&lng<=128&&lat>=36&&lat<=39
    ?[lng,lat]:null;
}
export function createSelectedTransportPin({map,maplibregl,place,previous=null,documentRef=globalThis.document}={}){
  try{previous?.remove?.();}catch{}
  const coords=transportPinCoordinates(place);
  if(!coords||typeof maplibregl?.Marker!=='function'||!map)return null;
  const element=selectedTransportPinElement(place,documentRef);
  if(!element)return null;
  try{
    const onPhone=globalThis.matchMedia?.('(max-width:699px)')?.matches;
    return new maplibregl.Marker({element,anchor:'bottom',offset:[0,onPhone?-15:-4]})
      .setLngLat(coords).addTo(map);
  }catch(error){console.debug('[선택 정류소 표시]',error);return null;}
}
/** Chosen point stays between mobile header actions and bottom-sheet top. */
export function mobileTransportFocusOffset({viewportHeight,panelTop,containerTop=0}={}){
  const h=Number(viewportHeight)||700;
  const coveredFromTop=Number(panelTop)-Number(containerTop);
  // If layout isn't measurable yet, derive conservative bounds from viewport.
  const top=Number.isFinite(coveredFromTop)&&coveredFromTop>100?coveredFromTop:h*.54;
  // Leave enough map above the bottom sheet to make the selected pin visible.
  // A 50-55% height allocation used to put the marker behind a tall header.
  const desired=Math.min(top-65,Math.max(112,top*.54));
  const clamped=Math.max(90,Math.min(h-90,desired));
  return Math.round(clamped-h/2);
}
