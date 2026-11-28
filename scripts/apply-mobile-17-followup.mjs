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
console.log('Mobile follow-up anchors verified and applied.');
