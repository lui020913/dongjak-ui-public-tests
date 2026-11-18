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
replace('src/dongjak-verified-data-layers.js',"            data.features=filteredDistrictPoints({type:'FeatureCollection',features},boundary).features;","            const viewBoundary=typeof window!=='undefined'?await (await import('./admin-dong-layer.js')).getSangdo1Boundary():boundary;\n            data.features=filteredDistrictPoints({type:'FeatureCollection',features},viewBoundary).features;");
replace('src/dongjak-verified-data-layers.js','  function onBoundaryUpdated(){','  async function onBoundaryUpdated(){');
replace('src/dongjak-verified-data-layers.js','      const clipped=filteredDistrictPoints(raw,boundary);',"      const viewBoundary=typeof window!=='undefined'?await (await import('./admin-dong-layer.js')).getSangdo1Boundary():boundary;\n      const clipped=filteredDistrictPoints(raw,viewBoundary);");
replace('src/map-appearance.js',"footprint:'#40575d',footprintOpacity:1,obliqueOpacity:0.07,extrusion:'#30464d',nearOpacity:0.88,farOpacity:0.82","footprint:'#30383d',footprintOpacity:1,obliqueOpacity:0,extrusion:'#353d43',nearOpacity:1,farOpacity:1");
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
console.log('Mobile follow-up anchors verified and applied.');
