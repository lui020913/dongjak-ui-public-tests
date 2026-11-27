"""Fetch complete highway ways with original node IDs and tags.
Fallback when the regional PBF host is unavailable; no geometry-only data.
"""
import json, pathlib, time, urllib.parse, urllib.request, xml.etree.ElementTree as ET

W,S,E,N=126.898199,37.470377,126.990385,37.522621
UA="Dongjak safety map pedestrian-network research (github.com/lui020913/dongjak-ui-public-tests)"
def fetch(url, data=None):
    req=urllib.request.Request(url,data=data,headers={"User-Agent":UA,"Accept":"application/xml,text/xml,*/*"})
    with urllib.request.urlopen(req,timeout=90) as response:
        return response.read()
def validate(root):
    if root.tag!="osm" or root.find("remark") is not None:
        raise ValueError("Incomplete OSM response")
    nodes={n.get("id") for n in root.findall("node")}
    ways=root.findall("way")
    if len(nodes)<1000 or len(ways)<100:
        raise ValueError("Too few nodes or ways")
    for way in ways:
        if any(nd.get("ref") not in nodes for nd in way.findall("nd")):
            raise ValueError("Missing referenced OSM node")
    return len(nodes),len(ways)
def write(root, date, source):
    nodes,ways=validate(root)
    output=ET.Element("osm",{"version":"0.6","generator":"Dongjak pedestrian research"})
    for tag in ("node","way"):
        for el in sorted(root.findall(tag),key=lambda e:int(e.get("id"))):
            output.append(el)
    ET.ElementTree(output).write("dongjak.osm",encoding="utf-8",xml_declaration=True)
    pathlib.Path("osm-source-date.txt").write_text(date+"\n")
    print("OSM_SOURCE "+json.dumps({"source":source,"date":date,"nodes":nodes,"ways":ways}))
def main():
    query=f'[out:xml][timeout:75];(way["highway"]({S},{W},{N},{E});>;);out meta;'
    for host in ("https://overpass-api.de/api/interpreter","https://overpass.kumi.systems/api/interpreter","https://overpass.private.coffee/api/interpreter"):
        try:
            root=ET.fromstring(fetch(host,urllib.parse.urlencode({"data":query}).encode()))
            meta=root.find("meta")
            date=(meta.get("osm_base","") if meta is not None else "")[:10]
            if len(date)!=10:raise ValueError("Missing snapshot date")
            write(root,date,host);return
        except Exception as e:print("OSM_SOURCE_UNAVAILABLE",host,str(e),flush=True)
    # The OSM map API has a node count limit. Small sequential cells with no
    # retries on rate limiting preserve full ways and referenced nodes.
    merged=ET.Element("osm",{"version":"0.6"});items={}
    for iy in range(4):
        for ix in range(4):
            w=W+(E-W)*ix/4;e=W+(E-W)*(ix+1)/4
            s=S+(N-S)*iy/4;n=S+(N-S)*(iy+1)/4
            root=ET.fromstring(fetch("https://api.openstreetmap.org/api/0.6/map?"+urllib.parse.urlencode({"bbox":f"{w},{s},{e},{n}"})))
            if root.tag!="osm":raise ValueError("Invalid map response")
            for el in root:
                if el.tag not in ("node","way"):continue
                key=(el.tag,el.get("id"))
                old=items.get(key)
                if old is not None and old.get("version")!=el.get("version"):
                    raise ValueError("OSM version changed during source collection")
                items[key]=el
            time.sleep(1)
    for el in items.values():merged.append(el)
    from datetime import datetime,timezone
    write(merged,datetime.now(timezone.utc).date().isoformat(),"OpenStreetMap API map cells (retrieval date)")
if __name__=="__main__":main()
