#!/usr/bin/env python3
"""Read-only diagnostics for published elementary catchment shape downloads.
Never supplies credentials, visits only official hosts, and never pushes data.
"""
import html
import io
import zipfile
import hashlib
from http.cookiejar import CookieJar
import re
import urllib.error
import urllib.request
from urllib.parse import urlparse

PAGES = [
    "https://schoolzone.emac.kr/publicData/publicDataList.do",
    "https://www.data.go.kr/data/15159265/fileData.do",
    "https://schoolzone.emac.kr/resources/js/publicData/publicDataList.js",
]
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; research-catchment-data-audit/1.0)",
    "Accept": "text/html,application/xhtml+xml,application/json,*/*",
}

def get(url):
    assert urlparse(url).netloc in {"schoolzone.emac.kr", "www.data.go.kr"}
    req=urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as resp:
        out=resp.read(3_000_000)
        return resp.status, resp.geturl(), resp.headers.get("Content-Type", ""), out

def main():
    for url in PAGES:
        print("\n=== OFFICIAL URL", url, "===")
        try:
            status, actual, mime, b = get(url)
            print("status", status, "url", actual, "type", mime, "bytes", len(b))
            text = b.decode("utf-8", errors="replace")
            if url.endswith("publicDataList.js"):
                print("OFFICIAL_DOWNLOAD_SCRIPT", text[:26000])
            for term in ["2026.09.20", "20260920", "초등학교 통학구역", "15159265", "fileDownload", "downloadFile", "fnFile"]:
                hits=list(re.finditer(re.escape(term),text,re.I))
                print("TERM",repr(term),"matches",len(hits))
                for h in hits[:2]:
                    segment=text[max(0,h.start()-850):min(len(text),h.end()+1600)]
                    segment=re.sub(r"\s+"," ",segment)
                    print("SNIP",html.unescape(segment[:2200]))
            print("POSSIBLE_DOWNLOAD_LINKS",re.findall(r'<(?:a|form)[^>]{0,1000}(?:download|down|file)[^>]{0,1000}>',text,re.I)[:8])
            if "schoolzone.emac.kr" in url:
                print("SCRIPTS",re.findall(r'<script[^>]+src=["\\\']([^"\\\']+)["\\\']',text,re.I)[-24:])
                for term in ["attached_file", "data-atchFileId", "fn_download", "fn_down", "download", "atchFileId", "fileSn", "fn_view_detail"]:
                    found=list(re.finditer(re.escape(term),text,re.I))
                    print("EVENT_FIND",term,len(found))
                    for h in found[-3:]:
                        snippet=html.unescape(text[max(0,h.start()-400):h.end()+850])
                        print("EVENT_SNIP",re.sub(r"\\s+"," ",snippet)[:1200])
                if "/publicData/publicDataView.do" in text:
                    print("VIEW URL candidate /publicData/publicDataView.do?nttId=2966")

        except Exception as exc:
            print("FAILED",type(exc).__name__,str(exc)[:450])


def verify_public_zip():
    base="https://schoolzone.emac.kr"
    download=base+"/publicData/publicDataFileDownload.do?nttId=2966&atchFileId=FILE_000000100002996&fileSn=0"
    import urllib.request
    opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(CookieJar()))
    try:
        opener.open(urllib.request.Request(base+"/publicData/publicDataList.do",headers=HEADERS),timeout=20).close()
        headers={**HEADERS,"Referer":base+"/publicData/publicDataList.do"}
        with opener.open(urllib.request.Request(download,headers=headers),timeout=40) as resp:
            mime=resp.headers.get("Content-Type","")
            size=0
            parts=[]
            while True:
                block=resp.read(1024*1024)
                if not block: break
                size+=len(block)
                if size>200_000_000: raise ValueError("Official file exceeds research safety cap")
                parts.append(block)
            buf=b"".join(parts)
            print("OFFICIAL_ZIP_STATUS",resp.status,"CONTENT_TYPE",mime,"BYTES",size,
                  "SHA256",hashlib.sha256(buf).hexdigest(),"MAGIC",buf[:8].hex())
            if zipfile.is_zipfile(io.BytesIO(buf)):
                with zipfile.ZipFile(io.BytesIO(buf)) as z:
                    print("OFFICIAL_ZIP_COUNT",len(z.infolist()))
                    print("OFFICIAL_ZIP_FILES",[(x.filename,x.file_size) for x in z.infolist()[:45]])
                with open("school_catchment_20260920_official.zip","wb") as outf:outf.write(buf)
                print("OFFICIAL_ZIP_WRITTEN", "school_catchment_20260920_official.zip")
            else:
                print("OFFICIAL_ZIP_NOT_ZIP",buf[:300].decode("utf-8",errors="replace"))
    except Exception as err:
        print("OFFICIAL_ZIP_FETCH_ERROR",type(err).__name__,str(err)[:350])

if __name__=="__main__":
    main()
    verify_public_zip()
