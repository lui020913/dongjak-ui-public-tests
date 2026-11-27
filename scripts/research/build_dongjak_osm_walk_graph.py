"""Build a separate district-wide, OSM-topology pedestrian graph.
Input: a complete-ways OSM extract with original node IDs and tags.
No geometry-only crossing, endpoint bridging, or private-access inference.
"""
import argparse, collections, hashlib, json, math, pathlib
import osmium

W,S,E,N=126.898199,37.470377,126.990385,37.522621
ALLOWED_FOOT={"yes","designated","permissive","official"}
DENIED={"no","private","customers","permit","destination","delivery","agricultural","forestry","restricted","military"}
PATHS={"footway","path","pedestrian","steps","track","corridor"}
ROADS={"residential","living_street","unclassified","service","tertiary","tertiary_link","secondary","secondary_link","primary","primary_link","road"}
CONDITIONAL={"access:conditional","foot:conditional","oneway:foot:conditional"}
def permitted(t):
    highway=t.get("highway","")
    foot=t.get("foot","")
    access=t.get("access","")
    if t.get("area")=="yes" or t.get("indoor")=="yes" or t.get("level") or t.get("construction") or t.get("proposed"):return False
    if any(t.get(k) for k in CONDITIONAL) or t.get("oneway:foot") in {"yes","1","true","-1"}:return False
    if foot in DENIED or (access in DENIED and foot not in ALLOWED_FOOT):return False
    if highway in PATHS:return True
    if highway=="cycleway":return foot in ALLOWED_FOOT or t.get("segregated")=="yes" and t.get("foot") not in DENIED
    if highway in ROADS:
        if t.get("motorroad")=="yes":return False
        if highway in {"primary","primary_link","secondary","secondary_link"}:return foot in ALLOWED_FOOT or t.get("sidewalk") in {"yes","both","left","right"}
        return True
    return False

class Extract(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.blocked=set()
        self.ways=[]
        self.stats=collections.Counter()
    def node(self,n):
        t=dict(n.tags)
        barrier=t.get("barrier","")
        if t.get("foot") in DENIED or (t.get("access") in DENIED and t.get("foot") not in ALLOWED_FOOT) or any(t.get(k) for k in CONDITIONAL):
            self.blocked.add(n.id)
        elif barrier and barrier not in {"bollard","cycle_barrier","kerb","cattle_grid","sally_port","entrance"} and t.get("foot") not in ALLOWED_FOOT:
            self.blocked.add(n.id)
    def way(self,w):
        t=dict(w.tags);h=t.get("highway")
        if not h:return
        self.stats["seen_"+h]+=1
        if not permitted(t):return
        refs=[]
        for n in w.nodes:
            if not n.location.valid():refs.append(None);continue
            p=(round(n.lon,7),round(n.lat,7))
            refs.append((n.ref,p) if W<=p[0]<=E and S<=p[1]<=N and n.ref not in self.blocked else None)
        part=[]
        for item in refs+[None]:
            if item is not None:part.append(item);continue
            if len(part)>1:self.ways.append((w.id,h,part));self.stats["accepted_"+h]+=1
            part=[]

def build(handler):
    # Compact arcs at shared OSM nodes and way ends. Preserve topology, not
    # coordinates alone: unrelated bridge/ground nodes may share a location.
    uses=collections.Counter(ref for _,_,part in handler.ways for ref,_ in part)
    ids={};nodes=[];edges=[]
    def node(ref,p):
        if ref not in ids:ids[ref]=len(nodes);nodes.append(list(p))
        return ids[ref]
    for way,h,part in handler.ways:
        start=0
        for end in range(1,len(part)):
            if end!=len(part)-1 and uses[part[end][0]]<2:continue
            a,ap=part[start];b,bp=part[end]
            coords=[list(p) for _,p in part[start:end+1]]
            dist=sum(math.hypot((x[0]-y[0])*88180,(x[1]-y[1])*111195) for x,y in zip(coords,coords[1:]))
            if dist>.01 and a!=b:
                edges.append([f"osm:{way}:{start}:{a}",node(a,ap),node(b,bp),round(dist,2),"01" if h in ROADS else "00",0,coords])
            start=end
    return {"schema":1,"source":"OpenStreetMap contributors via Geofabrik","license":"ODbL-1.0","bounds":[W,S,E,N],"nodes":nodes,"edges":edges,"stats":dict(handler.stats)}

def main():
    p=argparse.ArgumentParser()
    p.add_argument("input");p.add_argument("output");p.add_argument("--source-date",required=True)
    args=p.parse_args()
    handler=Extract()
    handler.apply_file(args.input,locations=True,idx="flex_mem")
    graph=build(handler);graph["source_date"]=args.source_date
    if len(graph["nodes"])<1000 or len(graph["edges"])<1000 or sum(v for k,v in graph["stats"].items() if k.startswith("accepted_") and k.removeprefix("accepted_") in PATHS)<100:
        raise RuntimeError("Incomplete district extract; do not publish")
    out=pathlib.Path(args.output);out.parent.mkdir(parents=True,exist_ok=True)
    raw=json.dumps(graph,ensure_ascii=False,separators=(",",":")).encode()
    out.write_bytes(raw)
    print("DISTRICT_OSM_WALK_GRAPH "+json.dumps({"nodes":len(graph["nodes"]),"edges":len(graph["edges"]),"stats":graph["stats"],"bytes":len(raw),"sha256":hashlib.sha256(raw).hexdigest(),"source_date":args.source_date}))
if __name__=="__main__":main()
