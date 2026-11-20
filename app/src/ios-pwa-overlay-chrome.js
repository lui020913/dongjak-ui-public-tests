const LIGHT_SURFACE = '#eaf0ec';
const DARK_SURFACE = '#192d32';
const BROWSER_SURFACE = '#f3f7f5';
const DEFAULT_SCRIM = Object.freeze({r:0,g:0,b:0,a:0.4});

const SCRIM_SELECTOR = [
  '.version-history-backdrop:not([hidden])',
  '#map-safety-backdrop:not([hidden])',
  '#map-options-backdrop:not([hidden])',
  '#djNext-layer-panel:not([hidden])',
  '[data-dj-overlay-scrim="true"]:not([hidden])',
  '[data-dj-scrim="true"]:not([hidden])',
  '.dj-modal-backdrop:not([hidden])',
  '.modal-backdrop:not([hidden])',
  '.overlay-backdrop:not([hidden])',
  'dialog[open]'
].join(',');

const LEGACY_OVERLAY_IDS = [
  'dj-ai-search-modal',
  'map-gesture-guide',
  'djNext-layer-panel',
  'djNext-permissions',
  'dj860-onboarding',
  'dj854-weather-sheet',
  'dj-map-settings',
  'dj-app-about',
  'version-history-modal',
  'dj833-night-modal',
  'dj840-theme-confirm'
];

const RELEVANT_IDS = new Set([
  ...LEGACY_OVERLAY_IDS,
  'map-safety-backdrop',
  'map-options-backdrop',
  'dj-mobile-safe-top',
  'dj-ios-pwa-map-seam'
]);

const RELEVANT_SELECTOR = [
  SCRIM_SELECTOR,
  '[aria-modal="true"]',
  '[role="dialog"]',
  '[data-dj-overlay-open="true"]'
].join(',');

function clamp(value,min,max) {
  return Math.min(max,Math.max(min,value));
}

function channel(value) {
  const raw=String(value).trim();
  const number=parseFloat(raw);
  if(!Number.isFinite(number))return 0;
  return raw.endsWith('%') ? clamp(number,0,100)*2.55 : clamp(number,0,255);
}

/** Parse browser-computed rgb/rgba or CSS hex colors into 8-bit channels. */
export function parseCssColor(value) {
  const text=String(value||'').trim().toLowerCase();
  if(!text)return null;
  if(text==='transparent')return {r:0,g:0,b:0,a:0};

  const hex=text.match(/^#([\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i);
  if(hex) {
    let digits=hex[1];
    if(digits.length===3||digits.length===4)digits=[...digits].map(x=>x+x).join('');
    const hasAlpha=digits.length===8;
    return {
      r:parseInt(digits.slice(0,2),16),
      g:parseInt(digits.slice(2,4),16),
      b:parseInt(digits.slice(4,6),16),
      a:hasAlpha?parseInt(digits.slice(6,8),16)/255:1
    };
  }

  const rgb=text.match(/^rgba?\((.*)\)$/i);
  if(!rgb)return null;
  const parts=rgb[1].replace(/\s*\/\s*/,',').split(/[,\s]+/).filter(Boolean);
  if(parts.length<3)return null;
  const alphaRaw=parts[3]??'1';
  const alphaNumber=parseFloat(alphaRaw);
  const alpha=alphaRaw.endsWith('%')?clamp(alphaNumber,0,100)/100:clamp(alphaNumber,0,1);
  return {
    r:channel(parts[0]),
    g:channel(parts[1]),
    b:channel(parts[2]),
    a:Number.isFinite(alpha)?alpha:1
  };
}

/** Blend an overlay color over a solid surface and return an opaque hex color. */
export function blendHexColor(baseColor,overlayColor) {
  const base=parseCssColor(baseColor);
  const overlay=typeof overlayColor==='string'?parseCssColor(overlayColor):overlayColor;
  if(!base||!overlay)return String(baseColor||LIGHT_SURFACE);
  const alpha=clamp(Number(overlay.a)||0,0,1);
  const blend=(a,b)=>Math.round(a*(1-alpha)+b*alpha).toString(16).padStart(2,'0');
  return '#'+blend(base.r,overlay.r)+blend(base.g,overlay.g)+blend(base.b,overlay.b);
}

export function isIosHomeScreenPhone(win=window) {
  const nav=win.navigator||{};
  const ios=/iPhone|iPad|iPod/.test(nav.userAgent||'') ||
    (nav.platform==='MacIntel' && Number(nav.maxTouchPoints)>1);
  const standalone=nav.standalone===true ||
    !!win.matchMedia?.('(display-mode: standalone)').matches;
  return !!(ios && standalone && win.matchMedia?.('(max-width: 699px)').matches);
}

function isVisible(element,win) {
  if(!element||element.hidden||element.getAttribute?.('aria-hidden')==='true')return false;
  const style=win.getComputedStyle(element);
  if(style.display==='none'||style.visibility==='hidden')return false;
  const rect=element.getBoundingClientRect();
  return rect.width>0&&rect.height>0;
}

function colorFromStyle(style) {
  if(!style)return null;
  const direct=parseCssColor(style.backgroundColor);
  if(direct&&direct.a>0.02)return direct;
  const image=String(style.backgroundImage||'');
  const match=image.match(/rgba?\([^)]*\)|#[\da-f]{3,8}/i);
  return match?parseCssColor(match[0]):null;
}

function styleColors(element,win) {
  const colors=[];
  for(const pseudo of [undefined,'::before','::after','::backdrop']) {
    try {
      const style=win.getComputedStyle(element,pseudo);
      const color=colorFromStyle(style);
      if(color&&color.a>0.02)colors.push({color,zIndex:Number.parseInt(style.zIndex,10)||0});
    } catch(_error) {}
  }
  return colors;
}

/** Read the actual visible scrim color instead of assuming every modal is identical. */
export function findActiveScrim(doc,win=window) {
  let best=null;
  const width=win.innerWidth||doc.documentElement.clientWidth||1;
  const height=win.innerHeight||doc.documentElement.clientHeight||1;
  for(const element of doc.querySelectorAll(SCRIM_SELECTOR)) {
    if(!isVisible(element,win))continue;
    const rect=element.getBoundingClientRect();
    const coversViewport=rect.width>=width*0.8&&rect.height>=height*0.55&&rect.bottom>=height*0.75;
    const pseudoBackdrop=styleColors(element,win).find(item=>item.color.a>0.02);
    const computed=win.getComputedStyle(element);
    const candidates=[];
    if(pseudoBackdrop)candidates.push(pseudoBackdrop);
    if(coversViewport)candidates.push(...styleColors(element,win));
    for(const candidate of candidates) {
      if(!best||candidate.zIndex>=best.zIndex)best=candidate;
    }
  }
  return best?.color||null;
}

function hasActiveOverlay(doc,app,win) {
  if(app.classList.contains('map-safety-open')&&!app.classList.contains('dj-safety-peek'))return true;
  if(app.classList.contains('map-controls-open'))return true;
  if(LEGACY_OVERLAY_IDS.some(id=>isVisible(doc.getElementById(id),win)))return true;
  if(isVisible(doc.getElementById('map-safety-backdrop'),win))return true;
  if(isVisible(doc.getElementById('map-options-backdrop'),win))return true;
  return !!doc.querySelector('dialog[open], [aria-modal="true"]:not([hidden]), [data-dj-overlay-open="true"]');
}

export function installPwaOverlayChrome(doc=document,win=window) {
  const root=doc.documentElement;
  const body=doc.body;
  const app=doc.getElementById('app');
  const themeMeta=doc.querySelector('meta[name="theme-color"]');
  if(!root||!body||!app||!themeMeta)return ()=>{};

  let seam=doc.getElementById('dj-ios-pwa-map-seam');
  let observer=null;
  let frame=0;
  let enabled=false;

  const baselineColor=()=>app.dataset.theme==='dark'?DARK_SURFACE:BROWSER_SURFACE;

  function ensureSeam() {
    if(seam&&seam.isConnected)return;
    seam=doc.createElement('div');
    seam.id='dj-ios-pwa-map-seam';
    seam.setAttribute('aria-hidden','true');
    app.appendChild(seam);
  }

  function restoreBrowserSurface() {
    seam?.remove();
    seam=null;
    root.classList.remove('dj-ios-home-pwa');
    delete root.dataset.djIosOverlayOpen;
    root.style.removeProperty('--dj-ios-pwa-base-color');
    root.style.removeProperty('--dj-ios-pwa-status-color');
    root.style.removeProperty('background-color');
    root.style.removeProperty('color-scheme');
    themeMeta.setAttribute('content',baselineColor());
  }

  function sync() {
    enabled=isIosHomeScreenPhone(win);
    if(!enabled) {
      restoreBrowserSurface();
      return;
    }

    const theme=app.dataset.theme==='dark'?'dark':'light';
    const baseColor=theme==='dark'?DARK_SURFACE:LIGHT_SURFACE;
    const overlayOpen=hasActiveOverlay(doc,app,win);
    const scrimColor=overlayOpen?(findActiveScrim(doc,win)||DEFAULT_SCRIM):null;
    const statusColor=overlayOpen?blendHexColor(baseColor,scrimColor):baseColor;

    if(root.dataset.theme!==theme)root.dataset.theme=theme;
    root.classList.add('dj-ios-home-pwa');
    root.dataset.djIosOverlayOpen=String(overlayOpen);
    root.style.colorScheme=theme;
    root.style.setProperty('--dj-ios-pwa-base-color',baseColor);
    root.style.setProperty('--dj-ios-pwa-status-color',statusColor);
    root.style.setProperty('background-color',statusColor,'important');
    if(themeMeta.getAttribute('content')!==statusColor)themeMeta.setAttribute('content',statusColor);
    ensureSeam();
  }

  function schedule() {
    if(frame)return;
    if(typeof win.requestAnimationFrame==='function') {
      frame=win.requestAnimationFrame(()=>{frame=0;sync();});
    } else sync();
  }

  function relevantNode(node) {
    if(!node||node.nodeType!==1)return false;
    if(node===root||node===app||RELEVANT_IDS.has(node.id))return true;
    if(node.matches?.(RELEVANT_SELECTOR)||node.closest?.(RELEVANT_SELECTOR))return true;
    return !!node.querySelector?.(RELEVANT_SELECTOR);
  }

  const Observer=win.MutationObserver;
  if(Observer) {
    observer=new Observer(records=>{
      const changed=records.some(record=>{
        if(record.type==='attributes')return relevantNode(record.target);
        return [...record.addedNodes,...record.removedNodes].some(relevantNode);
      });
      if(changed)schedule();
    });
    observer.observe(body,{
      attributes:true,
      attributeFilter:['class','hidden','open','aria-hidden','aria-modal','style','data-state','data-open','data-theme'],
      childList:true,
      subtree:true
    });
  }

  const width=win.matchMedia?.('(max-width: 699px)');
  const standalone=win.matchMedia?.('(display-mode: standalone)');
  for(const media of [width,standalone])media?.addEventListener?.('change',sync);
  win.addEventListener?.('pageshow',sync);
  win.addEventListener?.('resize',schedule);
  sync();

  return ()=>{
    observer?.disconnect();
    if(frame)win.cancelAnimationFrame?.(frame);
    for(const media of [width,standalone])media?.removeEventListener?.('change',sync);
    win.removeEventListener?.('pageshow',sync);
    win.removeEventListener?.('resize',schedule);
    restoreBrowserSurface();
  };
}

if(typeof document!=='undefined'&&typeof window!=='undefined') {
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>installPwaOverlayChrome(),{once:true});
  else installPwaOverlayChrome();
}