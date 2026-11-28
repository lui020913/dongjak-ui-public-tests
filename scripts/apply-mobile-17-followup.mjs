import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(process.argv[2]||'.');
// The source tree now owns the former release overlay. Validate its presence; never rewrite or copy it.
for(const ext of ['css','js'])if(!readFileSync(resolve(root,'src/mobile-17-followup.'+ext),'utf8').length)throw Error('Empty canonical mobile asset');
// Pilot clipping is now canonical in app source. Do not re-inject retired TOPIS/S-DoT handlers.
const pilotSource=readFileSync(resolve(root,'src/dongjak-verified-data-layers.js'),'utf8');
for(const required of ['const SANGDO1_ANALYSIS=new Set(Object.keys(EXTRA_LAYER_DEFS));','getSangdo1Boundary():boundary','filteredDistrictPoints(raw,viewBoundary)']){
 if(!pilotSource.includes(required))throw Error('Canonical pilot scope contract missing: '+required);
}
if(/'road-incidents':\s*\{|\'sdot-environment\':\s*\{/.test(pilotSource))throw Error('Retired public feed definitions must not be injected');
console.log('Mobile follow-up canonical source verified.');
