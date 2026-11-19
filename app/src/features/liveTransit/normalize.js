import { validLngLat, pointBetweenStations, projectOnLine, pointBetweenDisplayedStations, snapToDisplayedRail } from './geometry.js';

export const LINE_COLORS={ '1호선':'#0052A4','2호선':'#00A84D','4호선':'#00A5DE','7호선':'#747F00','9호선':'#B89B2F','신림선':'#6789CA' };
const clean = s=>String(s??'').replace(/\s/g,'').replace(/역$/,'').replace(/\([^)]*\)/g,'').trim();
const asTime = value=>{ const n=Date.parse(value??''); return Number.isFinite(n)?n:NaN; };
const isFresh = (value,now,maxAgeMs)=>{ const n=asTime(value); return Number.isFinite(n)&&n<=now+10000&&now-n<=maxAgeMs; };
function stationCoord(station){
  const coord=station?.lngLat??station?.coordinates??station?.coordinate;
  if (validLngLat(coord)) return coord.map(Number);
  if(Number.isFinite(Number(station?.longitude))&&Number.isFinite(Number(station?.latitude))) return [Number(station.longitude),Number(station.latitude)];
  return null;
}
function findStationIndex(list,name){return list.findIndex(s=>clean(s.name)===clean(name)||(s.aliases??[]).some(x=>clean(x)===clean(name)));}
function lineConfig(lines,line,direction,station,destination){
  const c=lines?.[line]; if(!c) return null;
  const up=c.up??c.stations??[],down=c.down??[...up].reverse();
  const dest=clean(String(destination??'').replace(/행$/,''));
  const from=findStationIndex(up,station),to=dest?findStationIndex(up,dest):-1;
  const terminal=c.terminalDirections?.[dest];
  // Prefer an identifiable destination over the provider direction-code heuristic.
  const dir=from>=0&&to>=0&&from!==to?(to>from?'up':'down'):
    terminal??(String(direction)==='1'?'down':String(direction)==='0'?'up':null);
  return {stations:dir==='down'?down:up,directionKnown:!!dir,
    geometry:c.geometry??c.routeGeometry??(c.coordinates?{coordinates:c.coordinates}:null),segmentTimeSeconds:c.segmentTimeSeconds??120};
}
/** Build estimated train positions from arrival/departure events and actual track geometry.
 * Never infer a position if route geometry, station order, or observation time is absent.
 */
export function metroToFeatures(metro=[],lines={},now=Date.now(),maxAgeMs=90000,renderedRailPaths=null){
  const features=[];
  for(const item of metro){
    if(!isFresh(item.observedAt,now,maxAgeMs))continue;
    const conf=lineConfig(lines,item.line,item.direction,item.station,item.destination);
    if(!conf||!Array.isArray(conf.stations)||!conf.stations.length||!conf.geometry)continue;
    const idx=findStationIndex(conf.stations,item.station);
    if(idx<0)continue;
    const here=stationCoord(conf.stations[idx]); if(!here)continue;
    const status=String(item.status??'');
    const displayed=renderedRailPaths instanceof Map;
    const paths=displayed?renderedRailPaths.get(item.line):null;
    const between=(a,b,f)=>displayed?pointBetweenDisplayedStations(paths,a,b,f):pointBetweenStations(conf.geometry,a,b,f);
    const stationPoint=()=>{if(displayed)return snapToDisplayedRail(paths,here);const snap=projectOnLine(conf.geometry.coordinates,here);return snap&&snap.errorMeters<=180?snap.point:null;};
    let pos=null,description='역 위치 기준 추정',nextStation='',travelFrom=null,travelTo=null,travelFraction=0;
    const selectTravel=(a,b,f)=>{travelFrom=a;travelTo=b;travelFraction=f;return a&&b?between(a,b,f):null;};
    const eventTime=asTime(item.eventAt || item.observedAt);
    const time=Number.isFinite(conf.segmentTimeSeconds)&&conf.segmentTimeSeconds>0?conf.segmentTimeSeconds:120;
    const fraction=Math.max(0,Number.isFinite(eventTime)?(now-eventTime)/1000/time:0);
    if(conf.directionKnown&&status==='2'&&idx<conf.stations.length-1){
      const next=stationCoord(conf.stations[idx+1]);
      pos=selectTravel(here,next,Math.min(.88,fraction));
      nextStation=conf.stations[idx+1].name;description='역 출발정보·소요시간 기반 추정 (GPS 아님)';
    }else if(conf.directionKnown&&(status==='0'||status==='3')&&idx>0){
      const prev=stationCoord(conf.stations[idx-1]);
      const progress=status==='0'?Math.min(.99,.93+fraction*.12):Math.min(.88,fraction);
      pos=selectTravel(prev,here,progress);nextStation=conf.stations[idx].name;
      description=status==='0'?'역 진입정보 기반 추정 (GPS 아님)':'전역 출발정보 기반 추정 (GPS 아님)';
    }else pos=stationPoint();
    // No displayed path or disconnected interval: do not synthesize a chord or place the marker off the line.
    if(!validLngLat(pos))continue;
    // Sample the same connected rail path, oriented in the inferred travel direction.
    // At a stop, prefer the outgoing path; at the last station use the incoming path.
    if(conf.directionKnown&&!travelFrom&&!travelTo){
      const next=stationCoord(conf.stations[idx+1]),prev=stationCoord(conf.stations[idx-1]);
      if(next){travelFrom=here;travelTo=next;travelFraction=0;}
      else if(prev){travelFrom=prev;travelTo=here;travelFraction=1;}
    }
    let headingKnown=false,headingFromLng=0,headingFromLat=0,headingToLng=0,headingToLat=0;
    if(travelFrom&&travelTo){
      // A local tangent (not a station-to-station chord) follows curves in either direction.
      const a=between(travelFrom,travelTo,Math.max(0,travelFraction-.0125));
      const b=between(travelFrom,travelTo,Math.min(1,travelFraction+.0125));
      if(validLngLat(a)&&validLngLat(b)&&(a[0]!==b[0]||a[1]!==b[1])){
        headingKnown=true;[headingFromLng,headingFromLat]=a;[headingToLng,headingToLat]=b;
      }
    }
    features.push({type:'Feature',geometry:{type:'Point',coordinates:pos},properties:{id:String(item.id),mode:'metro',line:String(item.line),name:String(item.line),vehicleLabel:String(item.trainNo??''),station:String(item.station),destination:String(item.destination??''),direction:String(item.direction??''),nextStation,status,headingKnown,headingFromLng,headingFromLat,headingToLng,headingToLat,accuracy:'estimated',accuracyText:description,color:LINE_COLORS[item.line]??'#64748b',observedAt:item.observedAt}});
  }
  return features;
}

/** Bus positions are raw WGS84 coordinates. Optional map-matching only if within 60m. */
export function busToFeatures(bus=[],routes={},now=Date.now(),maxAgeMs=90000){
  const features=[];
  for(const item of bus){
    if(!isFresh(item.observedAt,now,maxAgeMs))continue;
    const lng=Number(item.longitude), lat=Number(item.latitude);
    if(!validLngLat([lng,lat])||lng<124||lng>132||lat<32||lat>40)continue;
    const line=routes?.[String(item.routeId)];
    let pos=[lng,lat], accuracy='reported', description='버스 위치 API 수신 좌표';
    const geom=line?.geometry?.coordinates??line?.coordinates;
    if(Array.isArray(geom)&&geom.length>1){
      const snapped=projectOnLine(geom,pos);
      if(snapped&&snapped.errorMeters<=60){pos=snapped.point;accuracy='map-matched';description='버스 위치 API 좌표를 노선에 보정';}
    }
    features.push({type:'Feature',geometry:{type:'Point',coordinates:pos},properties:{id:String(item.id),mode:'bus',name:String(item.routeName??item.routeId??''),vehicleLabel:String(item.vehicleNumber??''),destination:String(item.destination??''),accuracy,accuracyText:description,color:'#278CE2',observedAt:item.observedAt}});
  }
  return features;
}
export function payloadToCollection(payload,opts={},now=Date.now()){
  const raw=[...metroToFeatures(payload?.metro??[],opts.stationLines??{},now,opts.maxAgeMs??90000,opts.renderedRailPaths),...busToFeatures(payload?.bus??[],opts.busRoutes??{},now,opts.maxAgeMs??90000)];
  const within=typeof opts.withinDistrict==='function'?opts.withinDistrict:()=>true;
  const seen=new Set();const features=[];
  for(const f of raw){if(!within(f.geometry.coordinates,f.properties)||seen.has(f.properties.id))continue;seen.add(f.properties.id);features.push(f);}
  return {type:'FeatureCollection',features};
}
