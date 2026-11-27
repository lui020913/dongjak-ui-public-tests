"""Re-audit the exact viewport asset polygons, excluding all quarantined geometry.
The original reviewed graph and all source feature properties remain unchanged.
"""
import hashlib,json,pathlib,sys
from dongjak_native_id_eligibility import main as audit
def read(p):return json.loads(p.read_text())
def write(p,o):p.write_text(json.dumps(o,ensure_ascii=False,separators=(',',':')))
def main(assets,hybrid,out):
    out.mkdir(parents=True,exist_ok=True)
    m=read(assets/'manifest.json')
    assert m['surface_count']==12045 and m['quarantine']['count']==9 and m['source_surface_count']==12054
    assert not m['operational_enabled']
    original=read(assets/m['native']['file'])
    rows=[]
    for t in m['tiles']:
        raw=(assets/t['file']).read_bytes()
        assert len(raw)==t['bytes'] and hashlib.sha256(raw).hexdigest()==t['sha256']
        f=json.loads(raw)['features'];assert len(f)==t['count'];rows.extend(f)
    assert len(rows)==12045
    exact=out/'exact';exact.mkdir(exist_ok=True)
    write(exact/'hybrid-road-surfaces.geojson',{'type':'FeatureCollection','features':rows})
    write(exact/'hybrid-summary.json',read(hybrid/'hybrid-summary.json'))
    audit(exact,out)
    n=read(out/'native-id-eligibility.json')
    assert n['source_graph_sha256']==m['graph_sha256']
    assert n['style_sha256']==original['style_sha256'],'native style changed: new source audit required'
    ids=sorted(set(n['eligible_native_ids'])&set(original['eligible_native_ids']))
    n['eligible_native_ids']=ids;n['eligible_id_count']=len(ids)
    n['surface_count']=len(rows);n['quarantined_count']=9
    n['original_eligible_id_count']=original['eligible_id_count']
    n['excluded_after_quarantine']=sorted(set(original['eligible_native_ids'])-set(ids))
    assert ids and len(ids)<=259
    write(out/'native-id-eligibility.json',n)
    # Copy only validated operational assets, replacing the ID manifest with
    # the exact-surface re-audit. The application package remains QA-only.
    import shutil
    dist=out/'road-display-review';shutil.copytree(assets,dist)
    raw=(out/'native-id-eligibility.json').read_bytes()
    (dist/'native-id-eligibility.json').write_bytes(raw)
    m['native']={'file':'native-id-eligibility.json','sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)}
    m['native_reaudit']={'eligible_ids':len(ids),'exact_surface_count':len(rows),'quarantine_count':9,'old_ids':259}
    write(dist/'manifest.json',m)
    print('OPERATIONAL_NATIVE_REAUDIT_RESULT',json.dumps({'eligible_ids':len(ids),'excluded_after_quarantine':len(n['excluded_after_quarantine']),'exact_surface_count':len(rows),'quarantine_count':9,'operational_enabled':False}))
if __name__=='__main__':main(*map(pathlib.Path,sys.argv[1:4]))
