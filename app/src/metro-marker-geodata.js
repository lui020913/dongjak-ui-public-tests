/**
 * MapLibre GeoJSON-based subway markers.
 * Far/overview zoom: transfer lines are shown as adjacent, separate colored circles.
 * Close zoom: each line marker is anchored to its own rendered rail geometry.
 * Overview shares one station name; detail preserves each line's name and places it away from its neighbor.
 */
const asCollection=features=>({type:'FeatureCollection',features});
const isCoordinate=x=>Array.isArray(x)&&x.length===2&&x.every(Number.isFinite);
const point=(coords,properties)=>({type:'Feature',geometry:{type:'Point',coordinates:coords},properties});

// At the widest district overview hide all custom subway symbols and lines.
export const METRO_MARKER_MIN_ZOOM=12.2;
export const METRO_PLATFORM_SPLIT_ZOOM=15.55;

/** Adjacent per-line overview badges and geographically separated detail badges. */
export function metroMarkerGeojson(items,{
  canonicalStations=[],normalizeName=x=>x,normalizeLine=x=>x,placements,
  colors={},radiusPredicate=()=>true,
  nearby=()=>false,isDistrict=()=>false,stationScope=null
}={}){
  const groups=new Map();
  // Verified station locations outrank basemap POIs, which may name station exits
  // rather than station/platform centers.
  for(const p of [...items.filter(x=>x.kind==='subway'),...canonicalStations.filter(x=>x.kind==='subway')]){
    const key=normalizeName(p.name);
    if(!key||!Number.isFinite(p.lng)||!Number.isFinite(p.lat)||!radiusPredicate(p.lng,p.lat))continue;
    if(!groups.has(key))groups.set(key,{...p,name:key,lines:new Set()});
    const g=groups.get(key);
    for(const route of p.lines||[]){
      const line=normalizeLine(route);
      if(colors[line])g.lines.add(line);
    }
    // Canonical items are appended last and replace inaccurate basemap POIs.
    if(canonicalStations.includes(p)){g.lng=p.lng;g.lat=p.lat;g.source=p.source;}
  }
  const features=[];
  for(const [key,g] of groups){
    const lines=[...g.lines].filter(line=>!stationScope||stationScope(key,line,g.lng,g.lat));
    if(!lines.length)continue;
    const base=[g.lng,g.lat];
    if(!isCoordinate(base))continue;
    const linePoints=placements(key,lines,g.lng,g.lat).filter(x=>isCoordinate([x.lng,x.lat]));
    if(!linePoints.length)continue;

    // Overview still uses two separate circles for a transfer station.
    // Their geographic anchor is shared, while a small screen-space offset keeps
    // the line-colored badges touching rather than merging into one multicolor disc.
    const summaryCoordinate=linePoints.length===1?[linePoints[0].lng,linePoints[0].lat]:[
      linePoints.reduce((sum,p)=>sum+p.lng,0)/linePoints.length,
      linePoints.reduce((sum,p)=>sum+p.lat,0)/linePoints.length
    ];
    const summaryLabel=key==='이수'?'이수·총신대입구역':(key.endsWith('역')?key:`${key}역`);
    const openable=Boolean(isDistrict(summaryCoordinate[0],summaryCoordinate[1])||nearby(summaryCoordinate[0],summaryCoordinate[1]));
    linePoints.forEach((lp,index)=>{
      const line=normalizeLine(lp.line);
      const lineToken=String(line).replace(/[^\w가-힣]/g,'');
      const offsetStep=68;
      const iconOffset=[(index-(linePoints.length-1)/2)*offsetStep,0];
      features.push(point(summaryCoordinate,{
        stationKey:key,stationName:key,lines:lines.join(','),role:'summary',line,interchange:linePoints.length>1,
        badge:line==='신림선'?'신림':String(line).replace(/호선$/,''),
        color:colors[line],iconId:`dj-station-summary-${lineToken}`,
        iconLines:[line],iconOffset,label:summaryLabel,labelOffset:[linePoints.length>1?0.56:0,-1.40],labelAnchor:'bottom',labelOn:index===0,
        openable
      }));
    });

    // Close zoom: each service gets its own marker on its own rail line.
    // Preserve per-line names even when identical, with opposite label anchors.
    linePoints.forEach((lp,index)=>{
      const line=normalizeLine(lp.line);
      const name=key==='이수'?(line==='4호선'?'총신대입구':'이수'):key;
      const baseLabel=name.endsWith('역')?name:`${name}역`;
      // The badge already identifies the line; never add a redundant route suffix.
      const label=baseLabel;
      const multi=linePoints.length>1;
      const above=!multi||index%2===0;
      const side=multi?(index-(linePoints.length-1)/2)*1.8:0;
      features.push(point([lp.lng,lp.lat],{
        stationKey:key,stationName:key==='이수'?'이수·총신대입구':key,
        lines:lines.join(','),role:'detail',line,
        badge:line==='신림선'?'신림':line.replace(/호선$/,''),color:colors[line],
        iconId:`dj-station-line-${line}`,iconLines:[line],iconOffset:[0,0],offset:[0,0],
        label,labelOffset:[side,above?-1.65:1.65],labelAnchor:above?'bottom':'top',labelOn:true,
        openable:Boolean(isDistrict(lp.lng,lp.lat)||nearby(lp.lng,lp.lat))
      }));
    });
  }
  return asCollection(features);
}

export function visibleMetroLayerRole(zoom){
  if(zoom<METRO_MARKER_MIN_ZOOM)return 'hidden';
  return zoom<METRO_PLATFORM_SPLIT_ZOOM?'summary':'detail';
}

 // Curated existing fixed-rail stations: within roughly 1 km of the district
 // or the next station along a corridor adjoining the district. This is not
 // the 10 km search radius. Keep remote guide stations hidden.
 export const ADJACENT_METRO_NAMES=new Set(['대방','신길','용산','대림','구로디지털단지','신림','서울대입구','낙성대','방배','이촌','남태령','신풍','보라매','내방','샛강','구반포','신반포','서울지방병무청','당곡']);
 export function makeMetroDisplayScope(canonicalStations,{normalizeName=x=>x,normalizeLine=x=>x,isDistrict=()=>false}={}){
  const allowed=new Map();
  for(const station of canonicalStations||[]){
   const name=normalizeName(station.name);
   if(!ADJACENT_METRO_NAMES.has(name))continue;
   if(!allowed.has(name))allowed.set(name,new Set());
   for(const line of station.lines||[])allowed.get(name).add(normalizeLine(line));
  }
  return (name,line,lng,lat)=>isDistrict(lng,lat)===true||allowed.get(normalizeName(name))?.has(normalizeLine(line))===true;
 }
