// Strict route containment: split each line at polygon-ring crossings and test
// every open interval, including holes and gaps between MultiPolygon parts.
export function routeWithinDistrict(coords, geometry, contains) {
  if(!Array.isArray(coords)||coords.length<2||!geometry||typeof contains!=='function')return false;
  const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.type==='MultiPolygon'?geometry.coordinates:null;
  if(!Array.isArray(polygons)||!polygons.length)return false;
  if(!coords.every(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1])&&contains(p[0],p[1])===true))return false;
  const edges=[];
  for(const rings of polygons)for(const ring of rings)for(let i=0;i<ring.length;i++){
    const a=ring[i],b=ring[(i+1)%ring.length];if(a[0]!==b[0]||a[1]!==b[1])edges.push([a,b]);
  }
  if(!edges.length)return false;
  const cross=(ax,ay,bx,by)=>ax*by-ay*bx;
  for(let i=1;i<coords.length;i++){
    const [x,y]=coords[i-1], [ex,ey]=coords[i];const dx=ex-x,dy=ey-y;
    if(!dx&&!dy)continue;
    const cuts=[0,1];
    for(const [a,b] of edges){
      if(Math.max(x,ex)<Math.min(a[0],b[0])||Math.min(x,ex)>Math.max(a[0],b[0])||Math.max(y,ey)<Math.min(a[1],b[1])||Math.min(y,ey)>Math.max(a[1],b[1]))continue;
      const vx=b[0]-a[0],vy=b[1]-a[1],qx=a[0]-x,qy=a[1]-y,den=cross(dx,dy,vx,vy);
      if(den===0){
        if(cross(qx,qy,dx,dy)===0){const d=dx*dx+dy*dy;for(const p of [a,b]){const t=((p[0]-x)*dx+(p[1]-y)*dy)/d;if(t>0&&t<1)cuts.push(t);}}
        continue;
      }
      const t=cross(qx,qy,vx,vy)/den,u=cross(qx,qy,dx,dy)/den;
      if(t>0&&t<1&&u>=0&&u<=1)cuts.push(t);
    }
    cuts.sort((a,b)=>a-b);
    for(let j=1;j<cuts.length;j++){const t=(cuts[j-1]+cuts[j])/2;if(contains(x+t*dx,y+t*dy)!==true)return false;}
  }
  return true;
}
