export const BUS_ROUTE_SOURCE='dj-selected-bus-route';
const CASE=BUS_ROUTE_SOURCE+'-casing',LINE=BUS_ROUTE_SOURCE+'-line';
export const BUS_ROUTE_STOPS=BUS_ROUTE_SOURCE+'-stops',BUS_ROUTE_STOP_NAMES=BUS_ROUTE_SOURCE+'-stop-names';
const empty=()=>({type:'FeatureCollection',features:[]});
export function busRouteColor(type){
  return ({'1':'#e5b928','2':'#4a9c39','3':'#3566c1','4':'#3d9b46','5':'#e5b928','6':'#c63d42','7':'#2b9d65','8':'#3566c1','9':'#3566c1'})[String(type)]||'#267f92';
}
export function createBusRouteOverlay({map,apiBase,fetcher=globalThis.fetch,onState=()=>{}}){
  let active=null,sequence=0,controller=null,geometry=empty();
  const cache=new Map();
  function draw(){
    try{
      if(!map.getSource(BUS_ROUTE_SOURCE)){
        if(!geometry.features.length)return;
        map.addSource(BUS_ROUTE_SOURCE,{type:'geojson',data:geometry});
      }
      const anchor=map.getLayer('transport-bus-stop')?'transport-bus-stop':undefined;
      for(const [id,paint] of [[CASE,{'line-color':'#ffffff','line-width':8,'line-opacity':0.92}],[LINE,{'line-color':['get','color'],'line-width':5,'line-opacity':0.95}]]){
        if(!map.getLayer(id))map.addLayer({id,type:'line',source:BUS_ROUTE_SOURCE,filter:['==',['geometry-type'],'LineString'],layout:{'line-join':'round','line-cap':'round'},paint},anchor);
      }
      const filter=['==',['geometry-type'],'Point'];
      if(!map.getLayer(BUS_ROUTE_STOPS))map.addLayer({id:BUS_ROUTE_STOPS,type:'circle',source:BUS_ROUTE_SOURCE,filter,minzoom:14.5,paint:{'circle-radius':['interpolate',['linear'],['zoom'],14.5,4,18,6],'circle-color':'#fff','circle-stroke-color':['get','color'],'circle-stroke-width':2.5}});
      if(!map.getLayer(BUS_ROUTE_STOP_NAMES))map.addLayer({id:BUS_ROUTE_STOP_NAMES,type:'symbol',source:BUS_ROUTE_SOURCE,filter,minzoom:16,layout:{'text-field':['get','name'],'text-size':12,'text-anchor':'top','text-offset':[0,1.05],'text-allow-overlap':false},paint:{'text-color':'#203d32','text-halo-color':'#fff','text-halo-width':1.7}});
      map.getSource(BUS_ROUTE_SOURCE).setData(geometry);
    }catch{/* a theme style reload will redraw on style.load */}
  }
  map.on?.('style.load',draw);
  function clear(){
    sequence++;controller?.abort();controller=null;active=null;geometry=empty();draw();onState(null);
  }
  async function select({routeId,route,routeType}){
    const id=String(routeId||'');
    if(!/^\d{5,15}$/.test(id))return;
    if(active?.id===id)return; // Explicit clear or another route changes the selection.
    clear();
    const seq=sequence;
    active={id,route,status:'loading'};onState(active);
    const ac=new AbortController();controller=ac;
    const timer=setTimeout(()=>ac.abort(),18000);
    try{
      let coordinates=cache.get(id)?.coordinates,routeStops=cache.get(id)?.stops||[];
      if(!coordinates||Date.now()-cache.get(id).at>3600000){
        const response=await fetcher(apiBase+'/bus/route-path?'+new URLSearchParams({routeId:id}),{signal:ac.signal});
        const data=await response.json();
        if(!response.ok){const error=new Error('route unavailable');error.code=data.code;throw error;}
        if(data.routeId!==id||!Array.isArray(data.coordinates)||data.coordinates.length<2||
          data.coordinates.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)))throw new Error('invalid route');
        coordinates=data.coordinates;
        routeStops=Array.isArray(data.stops)?data.stops.filter(s=>s&&typeof s.name==='string'&&Number.isFinite(s.lng)&&Number.isFinite(s.lat)&&s.lng>=124&&s.lng<=132&&s.lat>=33&&s.lat<=39):[];
        if(cache.size>=40)cache.delete(cache.keys().next().value);
        cache.set(id,{coordinates,stops:routeStops,at:Date.now()});
      }
      if(seq!==sequence)return;
      const color=busRouteColor(routeType);
      geometry={type:'FeatureCollection',features:[{type:'Feature',properties:{routeId:id,color},geometry:{type:'LineString',coordinates}},...routeStops.map(s=>({type:'Feature',properties:{routeId:id,color,name:s.name,seq:s.seq,arsId:s.arsId},geometry:{type:'Point',coordinates:[s.lng,s.lat]}}))]};
      draw();active={id,route,status:'shown',stopCount:routeStops.length};onState(active);
    }catch(error){
      if(seq!==sequence)return;
      active=null;onState({id,route,status:'error',code:error?.code||'ROUTE_PATH_UPSTREAM'});
    }finally{clearTimeout(timer);if(controller===ac)controller=null;}
  }
  return {select,clear,getActive:()=>active,destroy(){clear();map.off?.('style.load',draw);}};
}
