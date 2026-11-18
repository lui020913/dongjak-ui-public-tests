#!/usr/bin/env python3
"""Generate a transparent 192px navigation mark from the existing green app icon.
Only exterior connected near-white pixels are made transparent; internal signs
and dark lettering are preserved. Does not modify the original app icons.
"""
from collections import deque
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'public/icons/dongjak-light-512.png'
OUTPUT = ROOT / 'public/icons/dongjak-nav-transparent.png'

def make():
    source = Image.open(SOURCE).convert('RGBA')
    pix = source.load()
    w,h = source.size
    # Only flood-fill near-white exterior from edges, never remove the white
    # interior of a sign or street illustration enclosed by colored strokes.
    def light(x,y):
        r,g,b,a=pix[x,y]
        return a<28 or (min(r,g,b)>211 and max(r,g,b)-min(r,g,b)<32)
    todo=deque()
    touched=bytearray(w*h)
    for x in range(w):
        for y in (0,h-1):
            if light(x,y):todo.append((x,y))
    for y in range(h):
        for x in (0,w-1):
            if light(x,y):todo.append((x,y))
    count=0
    while todo:
        x,y=todo.popleft()
        idx=y*w+x
        if touched[idx] or not light(x,y):continue
        touched[idx]=1;count+=1
        for dx,dy in ((0,1),(0,-1),(1,0),(-1,0)):
            xx,yy=x+dx,y+dy
            if 0<=xx<w and 0<=yy<h and not touched[yy*w+xx]:
                todo.append((xx,yy))
    for y in range(h):
        for x in range(w):
            if touched[y*w+x]:
                r,g,b,a=pix[x,y]
                pix[x,y]=(r,g,b,0)
    # If outer white was a solid square, flood fill should remove most of it;
    # if the icon was already transparent, preserve the existing alpha.
    out=source.resize((192,192),Image.Resampling.LANCZOS)
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    out.save(OUTPUT,'PNG',optimize=True)
    check=Image.open(OUTPUT).convert('RGBA')
    alpha=list(check.getchannel('A').getdata())
    transparent=sum(a<240 for a in alpha)
    opaque=sum(a>245 for a in alpha)
    if transparent < (192*192)*.06 or opaque < (192*192)*.07:
        raise RuntimeError(f'Invalid transparent logo output: transparent={transparent} opaque={opaque}')
    print(f'NAV LOGO: {OUTPUT} ({w}x{h} source); edge_removed={count}; transparent={transparent}; opaque={opaque}')
if __name__=='__main__':make()
