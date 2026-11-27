"""Fetch the published SeoulPlan+ spatial ZIP via the official public UI.
Read-only acquisition: never publish a geometry until stage and source reviewed.
"""
import asyncio, json, hashlib, zipfile, io, re
from pathlib import Path
import shapefile
from pyproj import CRS, Transformer
from shapely.geometry import shape, mapping, Point
from shapely.ops import transform
from shapely import make_valid
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'audit-redevelopment-output'
OUT.mkdir(exist_ok=True)
URL='https://data.seoul.go.kr/dataList/OA-22712/F/1/datasetView.do'
EXPECTED='532_UQ120_도시계획사업(서울플랜+)_202609.zip'

async def download():
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,args=['--no-sandbox'])
        ctx=await browser.new_context(accept_downloads=True,locale='ko-KR')
        page=await ctx.new_page()
        await page.goto(URL,wait_until='domcontentloaded',timeout=90000)
        row=page.locator('tr').filter(has_text=EXPECTED).first
        await row.wait_for(timeout=60000)
        print('OFFICIAL_DOWNLOAD_ROW '+(await row.inner_text()).replace('\n',' '),flush=True)
        # Inspect only the matching published file's row, not other page content.
        for el in await row.locator('a,button,input[type=button]').all():
            print('DOWNLOAD_CONTROL '+json.dumps({'text':await el.inner_text(),'title':await el.get_attribute('title'),'aria':await el.get_attribute('aria-label'),'href':await el.get_attribute('href'),'onclick':await el.get_attribute('onclick')},ensure_ascii=False),flush=True)
        candidates=row.locator('a,button,input[type=button]')
        if await candidates.count()==0:
            raise RuntimeError('No download control in official file row')
        last_error=None
        for i in range(await candidates.count()):
            el=candidates.nth(i)
            if not await el.is_visible(): continue
            try:
                async with page.expect_download(timeout=30000) as event:
                    await el.click(timeout=10000)
                d=await event.value
                path=await d.path()
                raw=Path(path).read_bytes()
                if not zipfile.is_zipfile(io.BytesIO(raw)):raise ValueError('response is not ZIP')
                print('OFFICIAL_ZIP '+json.dumps({'filename':d.suggested_filename,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)},ensure_ascii=False),flush=True)
                await browser.close()
                return raw
            except Exception as e: last_error=type(e).__name__
        await browser.close()
        raise RuntimeError('Public file download did not complete: '+str(last_error))

def inspect(raw):
    z=zipfile.ZipFile(io.BytesIO(raw))
    print('ZIP_MEMBERS '+json.dumps(z.namelist(),ensure_ascii=False),flush=True)
    boundary=shape(json.loads((ROOT/'app/public/data/dongjak_sig_reference.geojson').read_text())['features'][0]['geometry'])
    results=[]
    for name in z.namelist():
        if not name.lower().endswith('.shp'):continue
        stem=name[:-4]
        names={n.lower():n for n in z.namelist()}
        def part(ext):
            actual=names.get((stem+ext).lower())
            return z.read(actual) if actual else None
        dbf,shx,prj=part('.dbf'),part('.shx'),part('.prj')
        if not dbf or not prj:raise ValueError('Missing DBF/CRS')
        crs=CRS.from_wkt(prj.decode('utf-8',errors='replace'))
        convert=Transformer.from_crs(crs,4326,always_xy=True).transform
        cpg=part('.cpg')
        encoding=(cpg.decode(errors='replace').strip() if cpg else 'cp949')
        if encoding=='949':encoding='cp949'
        if encoding=='65001':encoding='utf-8'
        def reader(enc):
            return shapefile.Reader(shp=io.BytesIO(z.read(name)),dbf=io.BytesIO(dbf),shx=io.BytesIO(shx) if shx else None,encoding=enc)
        try:
            r=reader(encoding);records=list(r.iterShapeRecords())
        except UnicodeDecodeError:
            r=reader('cp949' if encoding=='utf-8' else 'utf-8');records=list(r.iterShapeRecords())
        print('LAYER_FIELDS '+json.dumps({'name':name,'crs':crs.to_string(),'count':len(records),'fields':r.fields},ensure_ascii=False),flush=True)
        for sr in records:
            try:g=make_valid(transform(convert,shape(sr.shape.__geo_interface__)))
            except Exception:continue
            if g.is_empty or g.geom_type not in ('Polygon','MultiPolygon') or not g.intersects(boundary):continue
            # Keep only projects with meaningful district intersection; exact
            # official jurisdiction and confirmed stage will be reviewed next.
            if g.intersection(boundary).area<=0:continue
            props={str(k):v for k,v in sr.record.as_dict().items()}
            record={'type':'Feature','geometry':mapping(g),'properties':props}
            results.append(record)
            print('DONGJAK_PROJECT '+json.dumps({'properties':props,'bounds':g.bounds,'area_deg2':g.area},ensure_ascii=False,default=str),flush=True)
    if not results:raise RuntimeError('No intersecting project polygons; check source CRS/schema')
    (OUT/'seoulplan-202609-dongjak-review.geojson').write_text(json.dumps({'type':'FeatureCollection','features':results},ensure_ascii=False,default=str,separators=(',',':')))
    print('OFFICIAL_DONGJAK_GEOMETRIES '+str(len(results)),flush=True)
    # Emit a compact machine-readable geometry snapshot in fixed-size log
    # segments so the public-source dataset can be reviewed without a private artifact.
    data=json.dumps({'type':'FeatureCollection','features':results},ensure_ascii=False,default=str,separators=(',',':'))
    import base64,gzip
    encoded=base64.b64encode(gzip.compress(data.encode(),mtime=0)).decode()
    for i in range(0,len(encoded),4000):
        print('GEOMETRY_CHUNK '+str(i//4000)+' '+encoded[i:i+4000],flush=True)
    print('GEOMETRY_CHUNK_COUNT '+str((len(encoded)+3999)//4000),flush=True)

if __name__=='__main__':
    inspect(asyncio.run(download()))
