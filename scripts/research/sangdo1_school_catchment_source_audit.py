#!/usr/bin/env python3
"""Read-only diagnostics for published elementary catchment shape downloads.
Never supplies credentials, visits only official hosts, and never pushes data.
"""
import html
import re
import urllib.error
import urllib.request
from urllib.parse import urlparse

PAGES = [
    "https://schoolzone.emac.kr/publicData/publicDataList.do",
    "https://www.data.go.kr/data/15159265/fileData.do",
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
            for term in ["2026.09.20", "20260920", "초등학교 통학구역", "15159265", "fileDownload", "downloadFile", "fnFile"]:
                hits=list(re.finditer(re.escape(term),text,re.I))
                print("TERM",repr(term),"matches",len(hits))
                for h in hits[:2]:
                    segment=text[max(0,h.start()-850):min(len(text),h.end()+1600)]
                    segment=re.sub(r"\s+"," ",segment)
                    print("SNIP",html.unescape(segment[:2200]))
            print("POSSIBLE_DOWNLOAD_LINKS",re.findall(r'<(?:a|form)[^>]{0,1000}(?:download|down|file)[^>]{0,1000}>',text,re.I)[:8])
        except Exception as exc:
            print("FAILED",type(exc).__name__,str(exc)[:450])

if __name__=="__main__":
    main()
