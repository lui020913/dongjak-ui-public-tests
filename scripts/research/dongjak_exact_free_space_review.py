"""Review remaining fixed-endpoint road gaps using exact free-space components.
No building removal, coordinate relaxation, source graph edits or PRI changes.
"""
import json, math, pathlib, sys, heapq
from collections import Counter
from shapely.geometry import Point,LineString
from shapely.ops import unary_union
from shapely.prepared import prep
import dongjak_corridor_gap_recovery as gap
from sangdo1_road_corridor_preview import SHIFT,MIN_RADIUS,MARGIN,MAX_RADIUS

def polygons(g):
    if g.geom_type=='Polygon':return [g]
    if hasattr(g,'geoms'):return [p for part in g.geoms for p in polygons(part)]
    return []

def exact_path(original,obs,known,endpoints=None):
    if original.length<.1:return None,'short'
    oa,ob=Point(original.coords[0]),Point(original.coords[-1])
    a,b=endpoints if endpoints is not None else (oa,ob)
    if max(a.distance(oa),b.distance(ob))>SHIFT+.001:return None,'endpoint_shift_guard'
    if not obs.is_empty and min(a.distance(obs),b.distance(obs))<gap.CLEAR:return None,'endpoint_obstructed'
    allowed=original.buffer(SHIFT)
    if not known.is_empty and known.intersection(original).length>=.5*original.length:
        allowed=allowed.intersection(known.buffer(1).union(original.buffer(.55)))
    free=allowed if obs.is_empty else allowed.difference(obs.buffer(gap.CLEAR+.002))
    # An exact connected free component is required. Never bridge disconnected
    # areas with a grid edge or an unsupported grade crossing.
    component=next((p for p in polygons(free) if p.covers(a) and p.covers(b)),None)
    if component is None:return None,'disconnected_free_space'
    safe=prep(component)
    pts=[a.coords[0],b.coords[0]]
    for ring in [component.exterior,*component.interiors]:
        pts.extend(tuple(c) for c in list(ring.coords)[:-1])
    pts=list(dict.fromkeys(pts))
    if len(pts)>650:return None,'visibility_complexity_guard'
    if len(pts)<2:return None,'short'
    goal=1
    dist={0:0.};parent={};queue=[(math.dist(pts[0],pts[goal]),0.,0)]
    checked={}
    while queue:
        _,cost,u=heapq.heappop(queue)
        if cost>dist[u]+1e-9:continue
        if u==goal:break
        for v in range(len(pts)):
            if v==u:continue
            k=(min(u,v),max(u,v))
            if k not in checked:
                line=LineString([pts[u],pts[v]])
                if line.length<1e-9 or not safe.covers(line):checked[k]=None
                else:
                    offset=line.interpolate(.5,normalized=True).distance(original)
                    checked[k]=line.length*(1+.18*offset*offset)
            weight=checked[k]
            if weight is None:continue
            nc=cost+weight
            if nc>=dist.get(v,math.inf):continue
            dist[v]=nc;parent[v]=u
            heapq.heappush(queue,(nc+math.dist(pts[v],pts[goal]),nc,v))
    if goal not in parent:return None,'visibility_no_path'
    ids=[goal]
    while ids[-1]!=0:ids.append(parent[ids[-1]])
    points=[pts[i] for i in reversed(ids)]
    center=LineString(points)
    if not center.is_simple or center.hausdorff_distance(original)>SHIFT+.001 or center.length>original.length*1.3+1:return None,'path_guard'
    widths=[];pieces=[]
    for u,v in zip(points,points[1:]):
        seg=LineString([u,v]);mid=seg.interpolate(.5,normalized=True)
        hint=mid.distance(known.boundary) if not known.is_empty and known.covers(mid) else 1.5
        width=min(MAX_RADIUS,max(MIN_RADIUS,hint),seg.distance(obs)-MARGIN if not obs.is_empty else MAX_RADIUS)
        if width<MIN_RADIUS:return None,'clearance_guard'
        widths.append(width);pieces.append(seg.buffer(width,quad_segs=8))
    surface=unary_union(pieces)
    if surface.geom_type!='Polygon' or not surface.covers(center) or surface.intersection(obs).area>1e-6:return None,'surface_guard'
    return (center,surface,2*min(widths),2*max(widths)),'recovered'

def regression():
    from shapely.geometry import box
    g=LineString([(0,0),(12,0)])
    obs=box(4,-.3,8,1.5)
    r,why=exact_path(g,obs,box(-1,-3,13,3))
    assert r is not None,why
    c,s,lo,hi=r
    assert c.coords[0]==g.coords[0] and c.coords[-1]==g.coords[-1]
    assert lo>=2*MIN_RADIUS and s.intersection(obs).area<=1e-6
    assert exact_path(g,box(4,-5,8,5),box(-1,-3,13,3))[1]=='disconnected_free_space'
    assert exact_path(g,box(-1,-1,1,1),box(-1,-3,13,3))[1]=='endpoint_obstructed'
    print('EXACT_FREE_SPACE_TEST_OK')

def main(base,out):
    baseline=json.loads((base/'summary.json').read_text())
    assert baseline['candidate_links']==7850 and baseline['unresolved_links']==421
    counts=Counter()
    def solve(g,obs,known,endpoints=None):
        result,reason=exact_path(g,obs,known,endpoints)
        counts[reason]+=1
        return result,reason
    original=gap.solve
    try:
        gap.solve=solve
        gap.main(base,out)
    finally:gap.solve=original
    before=baseline['candidate_links'];summary=json.loads((out/'summary.json').read_text())
    assert summary['graph_sha256']==baseline['graph_sha256'] and summary['original_links']==8271
    for name in ('candidate-centers','candidate-surfaces','smoothed-surfaces'):
        old=json.loads((base/(name+'.geojson')).read_text())['features']
        new=json.loads((out/(name+'.geojson')).read_text())['features']
        assert new[:len(old)]==old
    assert (base/'moved-nodes.geojson').read_bytes()==(out/'moved-nodes.geojson').read_bytes()
    result={'before':before,'after':summary['candidate_links'],'recovered':summary['candidate_links']-before,'remaining':summary['unresolved_links'],'exact_free_space_counts':dict(counts),'all_preexisting_candidates_unchanged':True,'source_graph_unchanged':True}
    (out/'exact-review.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
    print('EXACT_FREE_SPACE_REVIEW_RESULT',json.dumps(result,ensure_ascii=False))

if __name__=='__main__':
    if '--test' in sys.argv:regression()
    else:main(pathlib.Path(sys.argv[1]),pathlib.Path(sys.argv[2]))
