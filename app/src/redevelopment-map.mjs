// Use the existing confirmed district project polygons, not synthetic site outlines.
export const REDEVELOPMENT_STYLE=Object.freeze({fill:'#ebeae5',outline:'#d6d7d0',fillMinZoom:13.2,labelMinZoom:14});
export const REDEVELOPMENT_SOURCE='dj-confirmed-redevelopment';
const fillId=REDEVELOPMENT_SOURCE+'-fill',lineId=REDEVELOPMENT_SOURCE+'-outline',labelId=REDEVELOPMENT_SOURCE+'-label';
const nativeConstruction=l=>l.type==='fill'&&!l.id.startsWith('dj-')&&/(?:^|[-_])construction(?:[-_]|$)/i.test(l.id);
export function repaintRedevelopment(map,app){
 const visibility=app?.dataset?.sangdoNight==='on'?'none':'visible';
 for(const id of [fillId,lineId,labelId])if(map.getLayer?.(id)&&map.getLayoutProperty?.(id,'visibility')!==visibility)map.setLayoutProperty(id,'visibility',visibility);
}
export function installRedevelopment({map,app}){
 const layers=map.getStyle?.()?.layers||[],s=REDEVELOPMENT_STYLE;
 // Only explicit construction layers; never change generic residential or school polygons.
 for(const l of layers.filter(nativeConstruction)){
  map.setPaintProperty(l.id,'fill-color',s.fill);
  map.setPaintProperty(l.id,'fill-antialias',true);
  if(l.minzoom>s.fillMinZoom)map.setLayerZoomRange(l.id,s.fillMinZoom,l.maxzoom??24);
 }
 if(!map.getSource(REDEVELOPMENT_SOURCE))map.addSource(REDEVELOPMENT_SOURCE,{type:'geojson',data:'/data/redevelopment/confirmed-projects-202609.geojson',maxzoom:18,tolerance:.5});
 const before=layers.find(l=>l.id.startsWith('dj-site-use-fill-'))?.id||layers.find(l=>l.type==='symbol'||l.type==='fill-extrusion'||['transportation','water','building'].includes(l['source-layer']))?.id;
 const spec={source:REDEVELOPMENT_SOURCE,minzoom:s.fillMinZoom,layout:{visibility:'visible'}};
 if(!map.getLayer(fillId))map.addLayer({...spec,id:fillId,type:'fill',paint:{'fill-color':s.fill,'fill-opacity':1,'fill-antialias':true}},before);
 if(!map.getLayer(lineId))map.addLayer({...spec,id:lineId,type:'line',layout:{...spec.layout,'line-cap':'round','line-join':'round'},paint:{'line-color':s.outline,'line-width':['interpolate',['linear'],['zoom'],13.2,.5,17,1],'line-opacity':.8,'line-blur':.25}},before);
 if(!map.getLayer(labelId))map.addLayer({id:labelId,type:'symbol',source:REDEVELOPMENT_SOURCE,minzoom:s.labelMinZoom,layout:{'text-field':['coalesce',['get','label'],['get','name'],''],'text-font':['Noto Sans Regular','Open Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],14,10,17,12],'text-max-width':14,'text-padding':5,'text-allow-overlap':false,'text-rotation-alignment':'viewport','text-pitch-alignment':'viewport'},paint:{'text-color':'#42544e','text-halo-color':'#ffffff','text-halo-width':1.2}});
 repaintRedevelopment(map,app);
}
