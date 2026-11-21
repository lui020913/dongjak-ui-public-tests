import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(process.argv[2]||'.'), publicRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
function replace(path,from,to){
 const file=resolve(root,path),old=readFileSync(file,'utf8');
 if(old.split(from).length!==2)throw new Error('Unexpected source anchor: '+path);
 writeFileSync(file,old.replace(from,()=>to));
}
for(const ext of ['css','js'])copyFileSync(resolve(publicRoot,'frontend/production/mobile-17-followup.'+ext),resolve(root,'src/mobile-17-followup.'+ext));
replace('src/main.js',"import './mobile-first-overhaul.css';","import './mobile-first-overhaul.css';\nimport './mobile-17-followup.css';\nimport {installMobileFollowup} from './mobile-17-followup.js';");
replace('src/main.js','installMobileMapControls({app,map});','installMobileMapControls({app,map});\ninstallMobileFollowup({app,map,maplibregl});');
replace('src/public-ui-mobile-surface-coordinator.js','    if(query&&query.placeholder!==placeholder)query.placeholder=placeholder;','    // The native rotating search placeholder is the sole phone writer.\n    if(!win.matchMedia("(max-width:699px)").matches&&query&&query.placeholder!==placeholder)query.placeholder=placeholder;');
replace('src/dongjak-verified-data-layers.js',"const SANGDO1_ANALYSIS=new Set(['accidents','cctv-security','cctv-parking','cctv-other','survey-crosswalk','slope']);","const SANGDO1_ANALYSIS=new Set(['accidents','cctv-security','cctv-parking','cctv-other','survey-crosswalk','slope','road-incidents','sdot-environment','audio-signals']);");
replace('src/dongjak-verified-data-layers.js',"            data.features=filteredDistrictPoints({type:'FeatureCollection',features},boundary).features;",`            const verifiedLocations=filteredDistrictPoints({type:'FeatureCollection',features},boundary);
            const viewBoundary=typeof window!=='undefined'?await (await import('./admin-dong-layer.js')).getSangdo1Boundary():boundary;
            data.features=filteredDistrictPoints(verifiedLocations,viewBoundary).features;`);
replace('src/dongjak-verified-data-layers.js','  function onBoundaryUpdated(){','  async function onBoundaryUpdated(){');
replace('src/dongjak-verified-data-layers.js','      const clipped=filteredDistrictPoints(raw,boundary);',"      const viewBoundary=typeof window!=='undefined'?await (await import('./admin-dong-layer.js')).getSangdo1Boundary():boundary;\n      const clipped=filteredDistrictPoints(raw,viewBoundary);");
// Preserve the shared palette while using a more opaque phone-only dark palette.
replace('src/map-appearance.js','export function nativeBuildingFootprint(layer={}){',`export const MOBILE_DARK_BUILDING_PALETTE=Object.freeze({...BUILDING_VISUAL_PALETTE.dark,footprint:'#30383d',extrusion:'#353d43',nearOpacity:0.98,farOpacity:0.96});
export function buildingVisualPalette(theme='light',phone=Boolean(globalThis.window?.matchMedia?.('(max-width:699px)')?.matches)){
  return theme==='dark'&&phone?MOBILE_DARK_BUILDING_PALETTE:BUILDING_VISUAL_PALETTE[theme==='dark'?'dark':'light'];
}
export function nativeBuildingFootprint(layer={}){`);
const appearancePath=resolve(root,'src/map-appearance.js');
const appearance=readFileSync(appearancePath,'utf8');
const paletteRead="const p=BUILDING_VISUAL_PALETTE[theme==='dark'?'dark':'light'];";
if(appearance.split(paletteRead).length!==3)throw Error('Building paint anchors changed');
writeFileSync(appearancePath,appearance.replaceAll(paletteRead,'const p=buildingVisualPalette(theme);'));
replace('src/place-details.js','  if(mem.has(id))return mem.get(id);',`  if(mem.has(id))return mem.get(id);
  // First use the app's same-origin facility proxy; validate name and distance.
  if(p.name.length>=2&&p.name.length<=40&&!signal?.aborted){
    const child=new AbortController(),abort=()=>child.abort();
    signal?.addEventListener('abort',abort,{once:true});
    const timer=setTimeout(abort,10000);
    try{
      const response=await fetch('/api/osm-name-search?q='+encodeURIComponent(p.name),{signal:child.signal});
      if(response.ok){
        const answer=matchingOsmContact((await response.json()).elements||[],p);
        if(answer.phone||answer.website||answer.address){mem.set(id,answer);return answer;}
      }
    }catch{}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
  }`);
replace('src/v824-favorites-cloud.js','    const popup=redirectOnly?null:openKakaoPopup(window);',"    window.dispatchEvent(new Event('dj:mobile-kakao-start'));\n    const popup=redirectOnly?null:openKakaoPopup(window);");
replace('src/v824-favorites-cloud.js','      if(!linkExisting)await sendPendingKakaoNotice(session);',"      if(!linkExisting)await sendPendingKakaoNotice(session);\n      window.dispatchEvent(new Event('dj:mobile-kakao-completed'));");
replace('src/v824-favorites-cloud.js','      try{popup?.close();}catch{}',"      window.dispatchEvent(new Event('dj:mobile-kakao-cancelled'));\n      try{popup?.close();}catch{}");
// Add safety and the remaining registered windows to the shared expansion lifecycle.
const controller='src/dj-v8212-sheet-controller.js';
const controllerFile=resolve(root,controller);
let controllerSource=readFileSync(controllerFile,'utf8');
const oldExpandable="'admin-dong-picker','transport-sheet','dj-mobile-utilities','map-gesture-guide','ped-tools-panel','dj854-weather-sheet'].includes(id)";
if(controllerSource.split(oldExpandable).length!==3)throw Error('Shared sheet expansion anchors changed');
 controllerSource=controllerSource.replaceAll(oldExpandable,"'admin-dong-picker','transport-sheet','dj-mobile-utilities','map-gesture-guide','map-safety-controls','map-advanced-controls','detail-sheet','entry-sheet','pza-road-sheet','night-visibility-float','road-width-legend','ped-tools-panel','dj854-weather-sheet'].includes(id)");
writeFileSync(controllerFile,controllerSource);
// A gesture has already animated the panel; do not replay the More exit.
replace(controller,"if(btn)dispatchLocalClick(btn,win);else panel.hidden=true;","if(id==='dj-mobile-utilities')panel.dispatchEvent(new CustomEvent('dongjak:close-more',{detail:{immediate:true}}));\n        else if(btn)dispatchLocalClick(btn,win);else panel.hidden=true;");
// Restore the tip only on a deliberate map-tab interaction.
replace('src/v840-coordinated-ui.js',' const selectedMap=()=>{'," const selectedMap=()=>{\n   if(win.matchMedia('(max-width:699px)').matches){delete app.dataset.djUserTipDismissed;label.classList.remove('is-visible');label.hidden=true;}");

// Legacy single-row fallback writes inline !important, so CSS cannot hide the More button.
replace('src/v831-swipe-feature-toolbar.js','  })) important(more,name,value);',"  })) important(more,name,value);\n  if(phone)important(more,'display','none');");
// Reuse the existing consent modal for the original night control inside Safety.
replace('src/v831-swipe-feature-toolbar.js',"   if(e.target.closest?.('#dj-v794-night')==null)return;","   const inSafety=win.matchMedia?.('(max-width:699px)')?.matches&&e.target.closest?.('#night-visibility-toggle');\n   if(e.target.closest?.('#dj-v794-night')==null&&!inSafety)return;\n   if(inSafety&&app.dataset.sangdoNight==='on')return;");
// Keep the original capture handler and its legacy contract. Safety uses a
// separate delegated handler; a click can reach only one of these routes.
replace('src/v831-swipe-feature-toolbar.js',' function requestNight(e){'," function requestSafetyNight(e){\n   if(!win.matchMedia?.('(max-width:699px)')?.matches||!e.target.closest?.('#night-visibility-toggle'))return;\n   requestNight(e);\n }\n function requestNight(e){");
replace('src/v831-swipe-feature-toolbar.js',"   scroller.addEventListener('click',requestNight,true);","   scroller.addEventListener('click',requestNight,true);\n   doc.addEventListener('click',requestSafetyNight,true);");
replace('src/v831-swipe-feature-toolbar.js',"   scroller?.removeEventListener('click',requestNight,true);","   scroller?.removeEventListener('click',requestNight,true);\n   doc.removeEventListener('click',requestSafetyNight,true);");

console.log('Mobile follow-up anchors verified and applied.');
