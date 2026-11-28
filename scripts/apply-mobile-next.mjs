import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(process.argv[2]||'.'),publicRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
function replace(path,from,to){
 const file=resolve(root,path),old=readFileSync(file,'utf8');
 if(old.split(from).length!==2)throw Error('Mobile next anchor changed: '+path+' :: '+from.slice(0,90));
 writeFileSync(file,old.replace(from,()=>to));
}
for(const ext of ['js','css'])copyFileSync(resolve(publicRoot,'frontend/production/mobile-next.'+ext),resolve(root,'src/mobile-next.'+ext));
const main='src/main.js';
replace(main,"import {installMobileFollowup} from './mobile-17-followup.js';","import {installMobileFollowup} from './mobile-17-followup.js';\nimport './mobile-next.css';\nimport {installPhoneToolbar,installPhonePermissions,installPhoneRouteComparison,installV9272PhoneExperience} from './mobile-next.js';");
replace(main,'installMobileFollowup({app,map,maplibregl});','installMobileFollowup({app,map,maplibregl});\ninstallPhoneToolbar({app});\ninstallPhonePermissions({app});\ninstallPhoneRouteComparison({app});\ninstallV9272PhoneExperience({app});');
const core='src/v840-ui-core.js';
// TIP text now lives in the canonical core; don't overwrite shortened copy at build time.
const tipCore=readFileSync(resolve(root,core),'utf8');
for(const sentence of ['상단 레이어에서 지도 기능을 관리하세요.','레이어에서 행정동을 선택하세요.'])if(!tipCore.includes(sentence))throw Error('Canonical TIP copy missing: '+sentence);
for(const id of ['ped-tools-panel','djNext-layer-panel','djNext-permissions','dj854-weather-sheet'])if(!tipCore.includes("'"+id+"'"))throw Error('Canonical TIP surface missing: '+id);
console.log('Mobile next integration anchors verified.');
