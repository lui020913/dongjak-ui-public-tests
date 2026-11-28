#!/usr/bin/env python3
"""Read-only tracked-file dependency inventory. Review candidates, never a deletion list."""
import argparse
import collections
import csv
import json
import posixpath
import re
import subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
TEXT_EXT={'.js','.mjs','.cjs','.ts','.tsx','.jsx','.css','.scss','.html','.json','.jsonc','.webmanifest','.yaml','.yml','.py','.sh','.sql','.toml','.xml','.gradle','.properties','.md','.txt','.ps1','.cmd','.java','.kt'}
LITERAL=re.compile(r"""['"\x60]([^'"\x60\r\n]{1,400})['"\x60]""")
TOKEN=re.compile(r"""(?<![\w/.-])(?:app/|frontend/|scripts/|tests/|release/|\.github/|/data/|/buildings/|/icons/|/logos/)[A-Za-z0-9_./@\-\[\]]+""")
PATHISH=re.compile(r'^[A-Za-z0-9_./@\-\[\] ]+(?:\?[\w&=.-]+)?$')
DYNAMIC=re.compile(r"""(?:import\s*\(|fetch\s*\(|new\s+URL\s*\()[^;\n]{0,200}(?:\$\{|['"]\s*\+|,\s*import\.meta\.url)""")
FILE_EXT=re.compile(r'\.[A-Za-z0-9]{1,12}$')
def git(*args):
    return subprocess.check_output(['git',*args],cwd=ROOT)
def walk_graph(roots,edges):
    seen=set(roots)
    pending=list(roots)
    while pending:
        p=pending.pop()
        for q in edges.get(p,()):
            if q not in seen:
                seen.add(q);pending.append(q)
    return seen
def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--out',default='dependency-audit-output')
    opts=ap.parse_args()
    out=Path(opts.out).resolve();out.mkdir(parents=True,exist_ok=True)
    files=sorted(p.decode('utf-8','surrogateescape') for p in git('ls-files','-z').split(b'\0') if p)
    known=set(files)
    sizes={p:(ROOT/p).stat().st_size for p in files if (ROOT/p).is_file()}
    byname=collections.defaultdict(list)
    for p in files: byname[posixpath.basename(p)].append(p)
    dirs=set()
    for p in files:
        parts=p.split('/')
        dirs.update('/'.join(parts[:i])+'/' for i in range(1,len(parts)))
    edges=collections.defaultdict(set);weak=collections.defaultdict(set)
    folders=collections.defaultdict(set);dynamic=[];skipped=[]
    def candidates(p,value):
        v=value.strip().split('?')[0].split('#')[0]
        if not v or v.startswith(('https:','http:','data:','node:','mailto:','//')): return []
        if not PATHISH.fullmatch(v): return []
        if v.startswith('/'): raw=['app/public'+v,'app'+v,v.lstrip('/')]
        elif v.startswith('.'): raw=[posixpath.join(posixpath.dirname(p),v)]
        elif '/' in v: raw=[v,posixpath.join(posixpath.dirname(p),v),'app/'+v,'app/public/'+v]
        else: raw=[posixpath.join(posixpath.dirname(p),v)]
        result=set()
        for n in raw:
            n=posixpath.normpath(n)
            if n.startswith('../'): continue
            if v.endswith('/') and n+'/' in dirs: folders[p].add(n+'/')
            result.update(q for q in (n,n+'.js',n+'.mjs',n+'.ts',n+'.css',n+'/index.js',n+'/index.mjs') if q in known and q!=p)
        if not result and FILE_EXT.search(v) and '/' not in v:
            for q in byname.get(v,[]):
                if q!=p: weak[p].add(q)
        return result
    for p in files:
        ext=Path(p).suffix.lower()
        if ext not in TEXT_EXT: continue
        # Large GIS feature collections contain geometry, not source references.
        # Manifests, config, code and small JSON are still traversed.
        if p.startswith('app/public/data/') and ext=='.json' and sizes.get(p,0)>2_000_000 and 'manifest' not in p:
            skipped.append(p);continue
        if sizes.get(p,0)>8_000_000:
            skipped.append(p);continue
        try: s=(ROOT/p).read_text(encoding='utf-8')
        except (UnicodeError,OSError):
            skipped.append(p);continue
        for m in LITERAL.finditer(s):
            edges[p].update(candidates(p,m.group(1)))
        for m in TOKEN.finditer(s):
            edges[p].update(candidates(p,m.group(0)))
        if ext in {'.js','.mjs','.ts','.tsx','.jsx','.cjs'}:
            for m in DYNAMIC.finditer(s):
                dynamic.append({'file':p,'line':s.count('\n',0,m.start())+1,'expression':m.group(0)[:160]})
    def present(items): return {p for p in items if p in known}
    browser_roots=present(['app/index.html','app/platforms/entry.js','app/src/main.js'])
    server_roots={p for p in files if p.startswith(('app/functions/','app/server/','app/supabase/functions/')) and Path(p).suffix in {'.js','.mjs','.ts'}}
    build_roots=present(['app/vite.config.js','app/package.json','package.json','app/capacitor.config.json']) | {p for p in files if p.startswith(('app/scripts/','scripts/','.github/workflows/','frontend/production/','frontend/scripts/','release/')) and not p.endswith('.md')}
    test_roots={p for p in files if p.startswith(('tests/','app/tests/')) or '.test.' in p or 'playwright' in Path(p).name}
    research_roots={p for p in files if p.startswith(('app/public/research/','docs/','app/docs/','app/archive/','app/README','frontend/')) or p.endswith('.md')} - build_roots
    reach={k:walk_graph(v,edges) for k,v in [('browser',browser_roots),('server',server_roots),('build',build_roots),('test',test_roots),('research',research_roots)]}
    active=reach['browser']|reach['server']|reach['build']
    incoming=collections.defaultdict(set);weak_in=collections.defaultdict(set)
    for p,targets in edges.items():
        for q in targets: incoming[q].add(p)
    for p,targets in weak.items():
        for q in targets: weak_in[q].add(p)
    active_prefixes=sorted({d for p,ds in folders.items() if p in active for d in ds})
    records=[]
    for p in files:
        scopes=[k for k,v in reach.items() if p in v]
        dynamic_matches=[d for d in active_prefixes if p.startswith(d)]
        if p in reach['browser']: status='browser-reachable'
        elif p in reach['server']: status='server-reachable'
        elif p in reach['build']: status='build-or-release-reachable'
        elif p.startswith('app/android/'): status='platform-convention-keep'
        elif p in reach['test']: status='test-reachable'
        elif dynamic_matches: status='dynamic-folder-review'
        elif p in reach['research']: status='research-or-docs'
        elif incoming[p] or weak_in[p]: status='indirect-or-weak-review'
        elif p.startswith(('app/src/','app/public/')): status='unresolved-review'
        else: status='other-review'
        records.append({'path':p,'bytes':sizes.get(p,0),'classification':status,'scopes':scopes,'direct_references':sorted(incoming[p]),'weak_basename_references':sorted(weak_in[p]),'dynamic_prefixes':dynamic_matches})
    def summarize(rs):
        result={}
        for r in rs:
            g=result.setdefault(r['classification'],{'files':0,'bytes':0})
            g['files']+=1;g['bytes']+=r['bytes']
        return result
    review=[r for r in records if r['path'].startswith(('app/src/','app/public/')) and r['classification'] in {'unresolved-review','indirect-or-weak-review','research-or-docs','dynamic-folder-review'}]
    summary={'source_commit':git('rev-parse','HEAD').decode().strip(),'tracked_files':len(files),'all':summarize(records),'source':summarize([r for r in records if r['path'].startswith('app/src/')]),'public':summarize([r for r in records if r['path'].startswith('app/public/')]),'strong_edges':sum(map(len,edges.values())),'dynamic_expression_count':len(dynamic),'skipped_text_files':skipped,'largest_review_candidates':[{k:r[k] for k in ('path','bytes','classification')} for r in sorted(review,key=lambda x:-x['bytes'])[:35]],'warning':'Static lexical evidence only. Dynamic URLs, externally linked assets, platform conventions and build-time injection can be missed. No file is certified safe to delete.'}
    (out/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
    (out/'inventory.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
    (out/'dynamic-references.json').write_text(json.dumps(dynamic,ensure_ascii=False,indent=2),encoding='utf-8')
    (out/'edges.json').write_text(json.dumps({p:sorted(v) for p,v in edges.items() if v},ensure_ascii=False,indent=2),encoding='utf-8')
    with (out/'inventory.csv').open('w',encoding='utf-8-sig',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=list(records[0]))
        writer.writeheader()
        for r in records: writer.writerow({k:' | '.join(v) if isinstance(v,list) else v for k,v in r.items()})
    print(json.dumps(summary,ensure_ascii=False,indent=2))
    assert len(records)==len(known)
    assert sum(g['files'] for g in summary['all'].values())==len(files)
if __name__=='__main__': main()
