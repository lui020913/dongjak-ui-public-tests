/* Selective road comparison. Fail open to the original native roads. */
export function roadExpression(filter){
 if(filter==null)return true;
 if(!Array.isArray(filter)||!filter.length)throw Error('Unsupported native filter');
 const [op,...args]=filter;
 if(op==='all'||op==='any')return [op,...args.map(roadExpression)];
 if(op==='none')return ['!',['any',...args.map(roadExpression)]];
 const prop=k=>k==='$id'?['id']:k==='$type'?['geometry-type']:['get',k];
 if(['==','!=','<','<=','>','>='].includes(op)&&typeof args[0]==='string'&&args.length===2)return [op,prop(args[0]),args[1]];
 if(['in','!in'].includes(op)&&typeof args[0]==='string'&&args.length>=2){
   const e=['in',prop(args[0]),['literal',args.slice(1)]];return op==='in'?e:['!',e];
 }
 if(['has','!has'].includes(op)&&typeof args[0]==='string'&&args.length===1){
   const e=args[0]==='$id'?['!=',['id'],null]:args[0]==='$type'?true:['has',args[0]];return op==='has'?e:['!',e];
 }
 if(['==','!=','<','<=','>','>=','in','!','match','case','within','has','to-boolean','literal'].includes(op))return filter;
 throw Error('Unsupported filter operator '+op);
}
export function createSelectiveRoadReview(map,eligibility,boundary,verified,sourceId='dj-reviewed-base-road-surfaces'){
 const saved=new Map();let active=false;
 const ids=eligibility?.eligible_native_ids;
 const valid=verified&&Array.isArray(ids)&&ids.length===eligibility.eligible_id_count&&ids.length>0&&ids.every(n=>Number.isSafeInteger(n)&&n>0)&&new Set(ids).size===ids.length&&['Polygon','MultiPolygon'].includes(boundary?.type);
 const same=(a,b)=>JSON.stringify(a??null)===JSON.stringify(b??null);
 const restore=()=>{
   for(const [id,old] of saved){try{if(map.getLayer(id))map.setFilter(id,old??null)}catch{/* keep original on style reload */}}
   saved.clear();active=false;
 };
 const update=enabled=>{
   const ready=valid&&enabled&&map.getZoom()>=eligibility.minimum_display_zoom&&map.getSource(sourceId)&&map.isSourceLoaded(sourceId);
   if(!ready){if(active)restore();return 0}
   if(active)return saved.size;
   try{
    for(const l of eligibility.style_transport_layers){
      // Only native ground line styling; never edit transport symbols, fills,
      // bridges, tunnels, labels or a different source.
      if(l.type!=='line'||/rail|tram|subway|ferry|aerial|tunnel|bridge/i.test(l.id))continue;
      const actual=map.getStyle()?.layers?.find(x=>x.id===l.id);
      if(!actual||actual.source!==eligibility.source_name||actual['source-layer']!=='transportation'||actual.type!=='line')continue;
      const old=map.getFilter(l.id);
      if(!same(old,l.filter))continue;
      let base;try{base=roadExpression(old)}catch{continue}
      const isEligible=['all',['in',['id'],['literal',ids]],['within',boundary],['in',['get','class'],['literal',['motorway','trunk','primary','secondary','tertiary','minor','service','track','path','street','pedestrian','residential','living_street','road','unclassified']]],['in',['coalesce',['get','brunnel'],''],['literal',['','no']]]];
      // Preserve native features with any grade/covered metadata.
      for(const k of ['bridge','tunnel','layer','level','covered'])isEligible.push(['in',['to-string',['coalesce',['get',k],'']],['literal',['','0','no','false','none']]]);
      const next=['all',base,['!',isEligible]];
      saved.set(l.id,old);
      map.setFilter(l.id,next);
      if(!same(map.getFilter(l.id),next))throw Error('Filter rejected '+l.id);
    }
    active=saved.size>0;
    return saved.size;
   }catch(e){restore();console.warn('Selective road review restored native layers:',e);return 0}
 };
 return {update,restore,valid};
}
