export const BUS_ROUTE_SOURCE='dj-selected-bus-route';
const CASE=BUS_ROUTE_SOURCE+'-casing',LINE=BUS_ROUTE_SOURCE+'-line';
export const BUS_ROUTE_STOPS=BUS_ROUTE_SOURCE+'-stops',BUS_ROUTE_STOP_NAMES=BUS_ROUTE_SOURCE+'-stop-names';
const empty=()=>({type:'FeatureCollection',features:[]});
const VEHICLES=BUS_ROUTE_SOURCE+'-vehicles',VEHICLE_LAYER=VEHICLES+'-icon',VEHICLE_IMAGE=VEHICLES+'-art';
export const BUS_ROUTE_VEHICLE_REFRESH_MS=15000;
const selectedVehicles=new WeakMap();
export const selectedBusVehicleRoute=map=>selectedVehicles.get(map)||null;
export const BUS_ROUTE_LINE_WIDTH=['interpolate',['linear'],['zoom'],10,1.4,12,2,14,2.8,16,3.5,18,4.5,20,5.5];
const CASING_WIDTH=['interpolate',['linear'],['zoom'],10,2.2,12,3.2,14,4.2,16,5.4,18,6.5,20,7.5];
export function routeVehicleFeatures(rows,routeId,route,color,previous=new Map(),now=Date.now()){
 const seen=new Set(),features=[];
 for(const b of Array.isArray(rows)?rows:[]){
  const coord=[b.longitude,b.latitude],at=Date.parse(b.observedAt||b.receivedAt||'');
  if(String(b.routeId)!==routeId||!b.id||seen.has(b.id)||!coord.every(Number.isFinite)||coord[0]<125||coord[0]>129||coord[1]<36||coord[1]>39||!Number.isFinite(at)||at>now+10000||now-at>150000)continue;
  seen.add(b.id);const prior=previous.get(b.id);let heading=prior?.heading||0,headingKnown=prior?.headingKnown===true;
  if(prior&&at>prior.at){const dx=(coord[0]-prior.coord[0])*Math.cos(coord[1]*Math.PI/180),dy=coord[1]-prior.coord[1],distance=Math.hypot(dx,dy)*111000;if(distance>=8&&distance<3000){heading=(Math.atan2(dx,dy)*180/Math.PI+360)%360;headingKnown=true;}}
  previous.set(b.id,{coord,at,heading,headingKnown});
  features.push({type:'Feature',properties:{id:String(b.id),routeId,route,color,heading,headingKnown,observedAt:b.observedAt||'',receivedAt:b.receivedAt||'',
    ...(b.vehicleNumber?{vehicleNumber:b.vehicleNumber}:{}),...(b.nextStopId?{nextStopId:b.nextStopId}:{}),...(Number.isInteger(b.sectionOrder)&&b.sectionOrder>0?{sectionOrder:b.sectionOrder}:{}),...(b.busType?{busType:b.busType}:{}),...(b.congestion?{congestion:b.congestion}:{})},geometry:{type:'Point',coordinates:coord}});
 }
 for(const id of previous.keys())if(!seen.has(id))previous.delete(id);
 return {type:'FeatureCollection',features};
}
function vehicleArt(map){
 if(map.hasImage?.(VEHICLE_IMAGE))return true;
 if(!map.addImage||!globalThis.document?.createElement)return false;
 const c=document.createElement('canvas');c.width=48;c.height=72;const g=c.getContext('2d');if(!g||typeof g.roundRect!=='function')return false;
 g.fillStyle='#fff';g.beginPath();g.roundRect(6,2,36,68,11);g.fill();
 g.fillStyle='#2672bc';g.beginPath();g.roundRect(9,5,30,62,9);g.fill();
 g.fillStyle='#d7eaf8';g.beginPath();g.roundRect(12,10,24,14,4);g.fill();
 g.fillStyle='#f5f9fb';g.fillRect(14,30,20,24);
 g.fillStyle='#234d76';g.fillRect(10,27,4,27);g.fillRect(34,27,4,27);
 g.fillStyle='#ffcf66';g.fillRect(12,59,6,3);g.fillRect(30,59,6,3);
 map.addImage(VEHICLE_IMAGE,g.getImageData(0,0,48,72),{pixelRatio:3});return true;
}
export function busRouteColor(type){
  return ({'1':'#e5b928','2':'#4a9c39','3':'#3566c1','4':'#3d9b46','5':'#e5b928','6':'#c63d42','7':'#2b9d65','8':'#3566c1','9':'#3566c1'})[String(type)]||'#267f92';
}
export function createBusRouteOverlay({map,apiBase,fetcher=globalThis.fetch,vehicleFetcher=null,onState=()=>{}}){
  let active=null,sequence=0,controller=null,geometry=empty(),vehicles=empty(),vehicleController=null,vehicleTimer=null;
  const previousVehicles=new Map(),baseFilters=new Map();
  let selectedStopIds=[],mapVisible=true;
  const cache=new Map();
  function draw(){
    try{
      if(!map.getSource(BUS_ROUTE_SOURCE)){
        if(!geometry.features.length)return;
        map.addSource(BUS_ROUTE_SOURCE,{type:'geojson',data:mapVisible?geometry:empty()});
      }
      const anchor=map.getLayer('transport-bus-stop')?'transport-bus-stop':undefined;
      for(const [id,paint] of [[CASE,{'line-color':'#ffffff','line-width':CASING_WIDTH,'line-opacity':0.8}],[LINE,{'line-color':['get','color'],'line-width':BUS_ROUTE_LINE_WIDTH,'line-opacity':0.92}]]){
        if(!map.getLayer(id))map.addLayer({id,type:'line',source:BUS_ROUTE_SOURCE,filter:['==',['geometry-type'],'LineString'],layout:{'line-join':'round','line-cap':'round'},paint},anchor);
      }
      const filter=['==',['geometry-type'],'Point'];
      if(!map.getLayer(BUS_ROUTE_STOPS))map.addLayer({id:BUS_ROUTE_STOPS,type:'circle',source:BUS_ROUTE_SOURCE,filter,minzoom:14.5,paint:{'circle-radius':['interpolate',['linear'],['zoom'],14.5,2.4,16,3.2,18,4.2,20,4.8],'circle-color':'#fff','circle-stroke-color':['get','color'],'circle-stroke-width':['interpolate',['linear'],['zoom'],14.5,1.4,18,1.8]}});
      if(!map.getLayer(BUS_ROUTE_STOP_NAMES))map.addLayer({id:BUS_ROUTE_STOP_NAMES,type:'symbol',source:BUS_ROUTE_SOURCE,filter,minzoom:16,layout:{'text-field':['get','name'],'text-size':['interpolate',['linear'],['zoom'],16,10,18,11.5],'text-anchor':'top','text-offset':[0,.85],'text-allow-overlap':false},paint:{'text-color':'#203d32','text-halo-color':'#fff','text-halo-width':1.7}});
      map.getSource(BUS_ROUTE_SOURCE).setData(mapVisible?geometry:empty());
      syncStopFilters();drawVehicles();
    }catch{/* a theme style reload will redraw on style.load */}
  }
  function syncStopFilters(){
    if(!map.setFilter||!map.getFilter)return;
    for(const id of ['dj-transport-bus-pictogram','transport-bus-names','transport-bus-names-close']){
      if(!map.getLayer(id))continue;
      if(!mapVisible||!selectedStopIds.length){if(baseFilters.has(id)){map.setFilter(id,baseFilters.get(id));baseFilters.delete(id);}continue;}
      if(!baseFilters.has(id))baseFilters.set(id,map.getFilter(id)||null);
      const original=baseFilters.get(id),exclude=['!',['in',['to-string',['get','arsId']],['literal',selectedStopIds]]];
      map.setFilter(id,original?['all',original,exclude]:exclude);
    }
  }
  function drawVehicles(){
    if(!vehicleFetcher)return;
    try{
      if(!map.getSource(VEHICLES)){if(!vehicles.features.length)return;map.addSource(VEHICLES,{type:'geojson',data:mapVisible?vehicles:empty()});}
      if(!map.getLayer(VEHICLE_LAYER)){
        let icon=false;try{icon=vehicleArt(map);}catch{}
        map.addLayer(icon?{id:VEHICLE_LAYER,type:'symbol',source:VEHICLES,minzoom:11,filter:['==',['get','headingKnown'],true],layout:{'icon-image':VEHICLE_IMAGE,'icon-size':['interpolate',['linear'],['zoom'],11,.68,16,1,19,1.24],'icon-rotate':['get','heading'],'icon-rotation-alignment':'map','icon-pitch-alignment':'map','icon-allow-overlap':true,'icon-ignore-placement':true}}:{id:VEHICLE_LAYER,type:'circle',source:VEHICLES,minzoom:11,paint:{'circle-color':['get','color'],'circle-radius':5,'circle-stroke-color':'#fff','circle-stroke-width':1.5}});
      }
      if(!map.getLayer(VEHICLE_LAYER+'-unknown'))map.addLayer({id:VEHICLE_LAYER+'-unknown',type:'circle',source:VEHICLES,minzoom:11,filter:['!=',['get','headingKnown'],true],paint:{'circle-color':['get','color'],'circle-radius':5,'circle-stroke-color':'#fff','circle-stroke-width':1.5}});
      if(map.getLayer(VEHICLE_LAYER)?.type==='circle')map.setFilter?.(VEHICLE_LAYER,['==',['get','headingKnown'],true]);
      map.getSource(VEHICLES).setData(mapVisible?vehicles:empty());
    }catch{}
  }
  function updateVehicleState(status,code=null){if(active){active={...active,vehicleStatus:status,vehicleError:code,vehicleCount:vehicles.features.length};onState(active);}}
  async function refreshVehicles(){
    if(!vehicleFetcher||!active||active.status!=='shown'||vehicleController||globalThis.document?.hidden)return;
    const id=active.id,seq=sequence,ac=new AbortController();vehicleController=ac;
    const timeout=setTimeout(()=>ac.abort(),27000);
    try{
      const res=await vehicleFetcher(apiBase+'/live-vehicles?'+new URLSearchParams({modes:'bus',routeId:id}),{signal:ac.signal});
      const body=await res.json();
      if(seq!==sequence)return;if(ac.signal.aborted)throw Error('vehicle request timeout');
      if(!res.ok||body.ok!==true||!Array.isArray(body.bus)){const err=Error('vehicle feed unavailable');err.code=body.code;throw err;}
      vehicles=routeVehicleFeatures(body.bus,id,active.route,active.color,previousVehicles);
      if(mapVisible&&vehicles.features.length)selectedVehicles.set(map,id);else selectedVehicles.delete(map);
      drawVehicles();updateVehicleState(vehicles.features.length?'live':'empty');
    }catch(error){if(seq===sequence){vehicles=empty();selectedVehicles.delete(map);drawVehicles();updateVehicleState('error',error.code);}}
    finally{clearTimeout(timeout);if(vehicleController===ac)vehicleController=null;}
  }
  function startVehiclePoll(){
    if(!vehicleFetcher)return;
    void refreshVehicles();vehicleTimer=setInterval(()=>void refreshVehicles(),BUS_ROUTE_VEHICLE_REFRESH_MS);
  }
  const onVisibility=()=>{if(!globalThis.document?.hidden)void refreshVehicles();};
  globalThis.document?.addEventListener?.('visibilitychange',onVisibility);
  const onStyle=()=>{baseFilters.clear();draw();drawVehicles();};
  map.on?.('style.load',onStyle);
  function clear(){
    sequence++;controller?.abort();controller=null;vehicleController?.abort();vehicleController=null;if(vehicleTimer!==null)clearInterval(vehicleTimer);vehicleTimer=null;active=null;geometry=empty();vehicles=empty();previousVehicles.clear();selectedVehicles.delete(map);selectedStopIds=[];syncStopFilters();draw();drawVehicles();onState(null);
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
      selectedStopIds=[...new Set(routeStops.map(s=>String(s.arsId||'')).filter(s=>/^\d{5}$/.test(s)))];
      draw();active={id,route,color,status:'shown',stopCount:routeStops.length,vehicleStatus:vehicleFetcher?'loading':'off',vehicleCount:0};onState(active);startVehiclePoll();
    }catch(error){
      if(seq!==sequence)return;
      active=null;onState({id,route,status:'error',code:error?.code||'ROUTE_PATH_UPSTREAM'});
    }finally{clearTimeout(timer);if(controller===ac)controller=null;}
  }
  return {select,clear,refreshVehicles,setMapVisible(value){mapVisible=Boolean(value);if(mapVisible&&active&&vehicles.features.length)selectedVehicles.set(map,active.id);else selectedVehicles.delete(map);syncStopFilters();draw();drawVehicles();},getActive:()=>active,
    getRouteStops:()=>active?.status==='shown'?(cache.get(active.id)?.stops||[]):[],
    getRouteVehicles:()=>vehicles.features.map(f=>f.properties),
    getRouteCoordinates:()=>geometry.features.find(feature=>feature.geometry?.type==='LineString')?.geometry?.coordinates||[],
    destroy(){clear();map.off?.('style.load',onStyle);globalThis.document?.removeEventListener?.('visibilitychange',onVisibility);}};
}
