// Perpendicular widths only for unmatched PDF candidates. No physical separation inference.
export function sectionWidths(base,widthGeo,ids){
 const sx=111195*Math.cos(37.5*Math.PI/180),sy=111195,xy=([lon,lat])=>[(lon-126.95)*sx,(lat-37.5)*sy];
 const cross=(a,b)=>a[0]*b[1]-a[1]*b[0],sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
 const band=w=>w<4?100:w<6?70:30;
 const quantile=(a,q)=>{const i=(a.length-1)*q,j=Math.floor(i);return a[j]+(a[Math.min(j+1,a.length-1)]-a[j])*(i-j);};
 const round=n=>+n.toFixed(2);
 function insideRing(p,r){let inside=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
 const polys=[];
 for(const f of widthGeo.features){const g=f.geometry;for(const poly of g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[]){const rings=poly.map(r=>r.map(xy));if(!rings[0]?.length)continue;const x=rings[0].map(p=>p[0]),y=rings[0].map(p=>p[1]);polys.push({id:f.properties.RW_SN,rings,bbox:[Math.min(...x),Math.min(...y),Math.max(...x),Math.max(...y)]});}}
 const contains=(p,q)=>p[0]>=q.bbox[0]&&p[0]<=q.bbox[2]&&p[1]>=q.bbox[1]&&p[1]<=q.bbox[3]&&insideRing(p,q.rings[0])&&!q.rings.slice(1).some(r=>insideRing(p,r));
 function measure(p,n,q){const ts=[];for(const r of q.rings)for(let i=1;i<r.length;i++){const a=r[i-1],v=sub(r[i],a),d=cross(n,v);if(Math.abs(d)<1e-10)continue;const delta=sub(a,p),t=cross(delta,v)/d,u=cross(delta,n)/d;if(u>=0&&u<1)ts.push(t);}
 const neg=ts.filter(t=>t<-.001),pos=ts.filter(t=>t>.001);if(!neg.length||!pos.length)return null;const l=-Math.max(...neg),r=Math.min(...pos),w=l+r;if(w<1.5||w>25||Math.min(l,r)/w<.15)return null;return w;}
 const rows=[],diagnostics={target:ids.size,accepted:0,noCoverage:0,unstable:0,bands:{100:0,70:0,30:0}};
 for(const s of base.segments){if(!ids.has(s.id))continue;const points=s.pts.map(([lat,lon])=>xy([lon,lat]));const edges=[];let length=0;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],d=Math.hypot(...sub(b,a));if(d>.01){edges.push({a,b,start:length,d});length+=d;}}if(length<6){diagnostics.noCoverage++;continue;}
 const count=Math.max(3,Math.ceil(length/3)),values=[],used=new Set();
 for(let i=0;i<count;i++){const t=(i+.5)*length/count,e=edges.find(e=>t>=e.start&&t<e.start+e.d);if(!e)continue;const frac=(t-e.start)/e.d,p=[e.a[0]+(e.b[0]-e.a[0])*frac,e.a[1]+(e.b[1]-e.a[1])*frac],n=[-(e.b[1]-e.a[1])/e.d,(e.b[0]-e.a[0])/e.d];const hits=polys.filter(q=>contains(p,q));if(hits.length!==1)continue;const w=measure(p,n,hits[0]);if(w!==null){values.push(w);used.add(hits[0].id);}}
 if(values.length<3||values.length/count<.6){diagnostics.noCoverage++;continue;}
 values.sort((a,b)=>a-b);const med=quantile(values,.5),lo=quantile(values,.1),hi=quantile(values,.9),risk=band(round(med));if(values.filter(w=>band(w)===risk).length/values.length<.75||hi/lo>2.5){diagnostics.unstable++;continue;}
 rows.push({id:s.id,method:'cross-section',roadWidthIds:[...used].sort((a,b)=>a-b),widthM:round(med),p10M:round(lo),p90M:round(hi),sampleCount:count,validSampleCount:values.length,coveragePct:round(100*values.length/count),stableWidthBand:band(lo)===risk&&band(hi)===risk,conditionalMixedRisk:risk,reliability:'직각 단면 추정(현장 확인 필요)'});diagnostics.accepted++;diagnostics.bands[risk]++;
 }
 return {rows,diagnostics};
}
