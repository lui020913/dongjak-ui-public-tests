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
// Pilot clipping is now canonical in app source. Do not re-inject retired TOPIS/S-DoT handlers.
const pilotSource=readFileSync(resolve(root,'src/dongjak-verified-data-layers.js'),'utf8');
for(const required of ['const SANGDO1_ANALYSIS=new Set(Object.keys(EXTRA_LAYER_DEFS));','getSangdo1Boundary():boundary','filteredDistrictPoints(raw,viewBoundary)']){
 if(!pilotSource.includes(required))throw Error('Canonical pilot scope contract missing: '+required);
}
if(/'road-incidents':\s*\{|\'sdot-environment\':\s*\{/.test(pilotSource))throw Error('Retired public feed definitions must not be injected');
// Add safety and the remaining registered windows to the shared expansion lifecycle.
const controller='src/dj-v8212-sheet-controller.js';
const controllerFile=resolve(root,controller);
let controllerSource=readFileSync(controllerFile,'utf8');
const oldExpandable="'admin-dong-picker','transport-sheet','dj-mobile-utilities','map-gesture-guide','ped-tools-panel'].includes(id)";
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
