"""Third-pass alignment: corroborate displaced source networks with the same
official road polygon. Do not infer identity merely from nearby centerlines."""
import json, pathlib, sys
from collections import Counter
from shapely.geometry import LineString, box
from shapely.strtree import STRtree
from dongjak_road_building_audit import PUBLIC, metric
import dongjak_road_layer_alignment as base
import dongjak_network_layer_alignment as net

class PolygonCrosswalk(net.NetworkCrosswalk):
    def __init__(self,original,corrected,ids,edges=None,polygons=None):
        super().__init__(original,corrected,ids,edges)
        self.polygons=polygons if polygons is not None else [metric(f["geometry"]) for f in base.read(PUBLIC/"data/dongjak_roadwidth_estimated_202610.geojson")["features"]]
        self.poly_tree=STRtree(self.polygons)
        self.third_counts=Counter()
    def align(self,g,link_id=None,scope=None):
        result,status,edge=super().align(g,link_id,scope)
        if status not in ("chain_gap","chain_offset_guard","no_unique_match") or g.geom_type!="LineString" or g.length<3:
            return result,status,edge
        if link_id is not None and self.ids.get(str(link_id)):return result,status,edge
        # Corroborate source line and candidate path against one original road
        # polygon. At least 95% of each must be inside; no union of different
        # road identities and no score reassignment across parallel roads.
        hits=[int(k) for k in self.poly_tree.query(g,predicate="intersects")
              if self.polygons[int(k)].intersection(g).length>=.95*g.length]
        if len(hits)!=1:return result,status,edge
        poly=self.polygons[hits[0]]
        nearby=[self.keys[int(k)] for k in self.tree.query(g.buffer(5))]
        compatible=set()
        for i in nearby:
            old=self.original[i]
            portion=old.intersection(g.buffer(5))
            if portion.length<.1:continue
            if poly.intersection(portion).length>=.95*portion.length:compatible.add(i)
        if not compatible:return result,status,edge
        proposed,why,ids=self.align_with_limits(g,link_id,scope,5.0,3.0,6.0,compatible)
        if why!="aligned":
            self.third_counts[why]+=1
            return result,status,edge
        # The strict first pass inside align_with_limits may return a single
        # edge; still require that edge belongs to the same polygon context.
        path_ids=ids if isinstance(ids,list) else [ids]
        if not all(i in compatible for i in path_ids) or poly.intersection(proposed).length<.95*proposed.length:
            self.third_counts["polygon_guard"]+=1
            return result,status,edge
        self.third_counts["aligned"]+=1
        return proposed,"aligned",ids

def regression():
    a=LineString([(0,0),(10,0)]);b=LineString([(10,0),(20,0)])
    g=LineString([(2,3),(18,3)])
    edges=[["a",1,2],["b",2,3]]
    c=PolygonCrosswalk({0:a,1:b},{0:a,1:b},{0:"a",1:"b"},edges,[box(-1,-1,21,4)])
    assert c.align(g)[1]=="aligned",c.align(g)[1]
    c=PolygonCrosswalk({0:a,1:b},{0:a,1:b},{0:"a",1:"b"},edges,[box(-1,2,21,4)])
    assert c.align(g)[1]!="aligned"
    c=PolygonCrosswalk({0:a,1:b},{0:a,1:b},{0:"a",1:"b"},edges,[box(-1,-1,21,4),box(-1,-2,21,5)])
    assert c.align(g)[1]!="aligned"
    print("POLYGON_ALIGNMENT_REGRESSION_OK")

if __name__=="__main__":
    if "--test" in sys.argv:regression()
    else:
        review,out=map(pathlib.Path,sys.argv[1:3])
        base.main(review,out,PolygonCrosswalk)
        night=net.night_display(review,out,PolygonCrosswalk)
        summary=base.read(out/"summary.json")
        summary["night_display_index"]=night
        summary["limitations"]=["Single-link, graph-connected chain, and unique official polygon corroboration; unmatched originals retained","Third pass only: original offset <=5m, mean <=3m, final offset <=6m; >=95% polygon coverage","Review candidates only; no measured survey correction or operational integration"]
        (out/"summary.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2))
        print("POLYGON_ALIGNMENT_RESULT",json.dumps(summary,ensure_ascii=False))
