"""Conservative second-pass graph-chain display matching, never a survey update."""
import json, pathlib, math, sys
from collections import Counter
from shapely.geometry import LineString, Point
from shapely.ops import transform, substring
from dongjak_road_building_audit import PUBLIC, TO_M, feature, metric
import dongjak_road_layer_alignment as base

class NetworkCrosswalk(base.Crosswalk):
    def __init__(self,original,corrected,ids,edges=None):
        super().__init__(original,corrected,ids)
        self.edges=edges if edges is not None else json.loads((PUBLIC/"data/safety/walk/dongjak_walk_graph.json").read_text())["edges"]
        self.chain_counts=Counter()
    def nodes(self,i):return tuple(self.edges[i][1:3])
    def tangent(self,g,d):
        a=g.interpolate(max(0,d-.5));b=g.interpolate(min(g.length,d+.5))
        x,y=b.x-a.x,b.y-a.y;n=math.hypot(x,y)
        return (x/n,y/n) if n>1e-8 else (0,0)
    def align(self,g,link_id=None,scope=None):
        return self.align_with_limits(g,link_id,scope)
    def align_with_limits(self,g,link_id=None,scope=None,max_offset=2.5,mean_offset=1.5,max_display_offset=5.5,allowed_edges=None):
        first,status,edge=super().align(g,link_id,scope)
        if status!="no_unique_match" or (link_id is not None and self.ids.get(str(link_id))):return first,status,edge
        if g.geom_type!="LineString" or g.length<3:return first,status,edge
        # Include unsuccessful and special original edges in the match decision.
        # No leap over a missing road, parallel carriageway, or unrelated junction.
        ix=[self.keys[int(k)] for k in self.tree.query(g.buffer(max_offset)) if allowed_edges is None or self.keys[int(k)] in allowed_edges]
        steps=max(2,math.ceil(g.length))
        samples=[g.interpolate(k/steps,normalized=True) for k in range(steps+1)]
        chosen=[]
        for k,p in enumerate(samples):
            tx,ty=self.tangent(g,g.length*k/steps);opts=[]
            for i in ix:
                old=self.original[i];dist=p.distance(old)
                if dist>max_offset:continue
                d=old.project(p);ux,uy=self.tangent(old,d)
                if abs(tx*ux+ty*uy)<.84:continue
                opts.append((dist,i,d))
            opts.sort()
            if not opts:return g,"chain_gap",None
            best=opts[0]
            for alt in opts[1:]:
                if alt[0]-best[0]>.65:break
                _,i,d=best;_,j,e=alt
                if not set(self.nodes(i))&set(self.nodes(j)) or min(d,self.original[i].length-d)>2 or min(e,self.original[j].length-e)>2:
                    return g,"chain_ambiguous",None
            chosen.append(best)
        if sum(x[0] for x in chosen)/len(chosen)>mean_offset:return g,"chain_offset_guard",None
        runs=[]
        for dist,i,d in chosen:
            if runs and runs[-1][0]==i:runs[-1][1].append(d)
            else:runs.append((i,[d]))
        if len({i for i,_ in runs})!=len(runs):return g,"chain_revisit",None
        if any(i not in self.corrected for i,_ in runs):return g,"chain_unresolved_road",None
        if any(len(ds)<2 for _,ds in runs):return g,"chain_short_run",None
        parts=[];previous=None
        for k,(i,ds) in enumerate(runs):
            old=self.original[i];new=self.corrected[i];u,v=self.nodes(i)
            sign=1 if ds[-1]>=ds[0] else -1
            if abs(ds[-1]-ds[0])<.1 or any((b-a)*sign<-.1 for a,b in zip(ds,ds[1:])):return g,"chain_direction_guard",None
            start_node,end_node=(u,v) if sign>0 else (v,u)
            a,b=ds[0],ds[-1]
            if k:
                if previous!=start_node or (a if sign>0 else old.length-a)>3:return g,"chain_node_guard",None
                a=0 if sign>0 else old.length
            if k<len(runs)-1:
                if (old.length-b if sign>0 else b)>3:return g,"chain_node_guard",None
                b=old.length if sign>0 else 0
            segment=substring(new,a/old.length,b/old.length,normalized=True)
            if segment.geom_type!="LineString":return g,"chain_short_run",None
            coords=list(segment.coords)
            if parts:
                if Point(parts[-1]).distance(Point(coords[0]))>.05:return g,"chain_joint_guard",None
                coords=coords[1:]
            parts.extend(coords);previous=end_node
        if len(parts)<2:return g,"chain_short_run",None
        result=LineString(parts)
        if not result.is_simple or not .8*g.length<=result.length<=1.2*g.length or result.hausdorff_distance(g)>max_display_offset:return g,"chain_geometry_guard",None
        if scope is not None and not scope.buffer(.002).covers(result):return g,"boundary_guard",None
        # Geometry remains on accepted reconstructed road centers; no arbitrary
        # interpolated connector at a mismatched graph junction.
        self.chain_counts["aligned"]+=1
        return result,"aligned",[i for i,_ in runs]

def regression():
    a=LineString([(0,0),(10,0)]);b=LineString([(10,0),(20,0)])
    aa=LineString([(0,1),(10,1)]);bb=LineString([(10,1),(20,1)])
    edges=[["a",1,2],["b",2,3]]
    c=NetworkCrosswalk({0:a,1:b},{0:aa,1:bb},{0:"a",1:"b"},edges)
    g=LineString([(2,0),(18,0)])
    result,status,ids=c.align(g)
    assert status=="aligned" and ids==[0,1] and result.distance(Point(10,1))<.001,(status,ids)
    c=NetworkCrosswalk({0:a,1:b},{0:aa},{0:"a",1:"b"},edges)
    assert c.align(g)[1]=="chain_unresolved_road"
    c=NetworkCrosswalk({0:a,1:b},{0:aa,1:LineString([(10,2),(20,2)])},{0:"a",1:"b"},edges)
    assert c.align(g)[1]=="chain_joint_guard"
    print("NETWORK_ALIGNMENT_REGRESSION_OK")

def night_display(review,out,crosswalk_class=NetworkCrosswalk):
    edges=json.loads((PUBLIC/"data/safety/walk/dongjak_walk_graph.json").read_text())["edges"]
    originals={i:transform(TO_M,LineString(e[6])) for i,e in enumerate(edges) if len(e)>=7 and len(e[6])>=2}
    accepted={f["properties"]["edge_index"]:base.line(f["geometry"]) for f in base.read(review/"candidate-centers.geojson")["features"]}
    cross=crosswalk_class(originals,accepted,{i:edges[i][0] for i in originals})
    scope=metric(base.read(PUBLIC/"data/protection-zone/boundary_reference.geojson")["features"][0]["geometry"])
    src=PUBLIC/"data/sangdo1-night/occlusion-road-samples.json"
    raw=src.read_bytes();data=json.loads(raw);counts=Counter();features=[]
    for j,way in enumerate(data["lines"]):
        points=way.get("samples",[])
        for k,(a,b) in enumerate(zip(points,points[1:])):
            if not all(isinstance(q.get(v),(int,float)) and math.isfinite(q[v]) for q in (a,b) for v in ("lon","lat")):counts["invalid_sample"]+=1;continue
            g=transform(TO_M,LineString([(a["lon"],a["lat"]),(b["lon"],b["lat"])]))
            if not .1<=g.length<=15 or not scope.buffer(.002).covers(g):counts["outside_or_gap"]+=1;continue
            result,status,edge=cross.align(g,scope=scope);counts[status]+=1
            if status!="aligned":continue
            # Keep d, dClear, dUncertain, x/y, actual sample coordinates and
            # category calculations in source. Only index a display line.
            features.append(feature(result,{"way_row":j,"way_id":way.get("id"),"sample_start":k,"sample_end":k+1,"edge_index":edge}))
    base.write(out,"night-sample-display-index",features)
    return {"counts":dict(counts),"sample_source_unchanged":src.read_bytes()==raw,"source_way_count":len(data["lines"]),"display_only":True}
if __name__=="__main__":
    if "--test" in sys.argv:regression()
    else:
        review,out=map(pathlib.Path,sys.argv[1:3]);base.main(review,out,NetworkCrosswalk)
        night=night_display(review,out)
        summary=base.read(out/"summary.json");summary["night_display_index"]=night;summary["limitations"].append("Second pass allows only unambiguous graph-connected chains, with original-source offset <=2.5m and corrected-display offset <=5.5m. No operational integration.")
        (out/"summary.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2))
        print("NETWORK_ALIGNMENT_RESULT",json.dumps(summary,ensure_ascii=False))
