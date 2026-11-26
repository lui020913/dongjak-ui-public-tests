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
replace('src/v831-swipe-feature-toolbar.js',"  if(phone)important(more,'display','none');","  if(phone)important(more,'display','none');\n  if(phone&&row.dataset.djNextReady==='1')important(scrollport,'display','none');");
replace('src/v860-onboarding.js',"      if(index===ONBOARDING_SLIDES.length-1)close({afterClose:showMapGuide});else move(1);","      if(index===ONBOARDING_SLIDES.length-1){\n        if(win.matchMedia?.('(max-width:699px)')?.matches&&doc.getElementById('djNext-permissions'))close({afterClose:()=>win.dispatchEvent(new CustomEvent('dj-next:permission-intro',{detail:{continue:showMapGuide}}))});\n        else close({afterClose:showMapGuide});\n      }else move(1);");
const core='src/v840-ui-core.js';
// TIP text now lives in the canonical core; don't overwrite shortened copy at build time.
const tipCore=readFileSync(resolve(root,core),'utf8');
for(const sentence of ['상단 레이어에서 지도 기능을 관리하세요.','레이어에서 행정동을 선택하세요.'])if(!tipCore.includes(sentence))throw Error('Canonical TIP copy missing: '+sentence);
for(const id of ['ped-tools-panel','djNext-layer-panel','djNext-permissions','dj854-weather-sheet'])if(!tipCore.includes("'"+id+"'"))throw Error('Canonical TIP surface missing: '+id);
replace('src/pedestrian-tools.js',"showPanel('내 주변 보행정보');","showPanel('주변 안전정보');");
replace('src/transport-map.js',"if(title.dataset){if(place.kind==='bus'&&/^\\d{5}$/.test(String(place.arsId||'')))title.dataset.dj912Ars=String(place.arsId);else delete title.dataset.dj912Ars;}","if(title.dataset){if(place.kind==='bus'&&/^\\d{5}$/.test(String(place.arsId||''))&&!globalThis.window?.matchMedia?.('(max-width:699px)')?.matches)title.dataset.dj912Ars=String(place.arsId);else delete title.dataset.dj912Ars;}");
replace('src/transport-map.js',"if(title.dataset&&place.kind==='bus'&&/^\\d{5}$/.test(String(place.arsId)))title.dataset.dj912Ars=String(place.arsId);","if(title.dataset&&place.kind==='bus'&&/^\\d{5}$/.test(String(place.arsId))&&!globalThis.window?.matchMedia?.('(max-width:699px)')?.matches)title.dataset.dj912Ars=String(place.arsId);");
const graph='src/lib/dongjakWalkSlopeRouter.mjs';
replace(graph,"['shortest','avoid_vehicle_permitted','gentle'].includes(mode)","['shortest','avoid_vehicle_permitted','gentle','balanced'].includes(mode)");
replace(graph,"        if (mode==='gentle') {","        if (mode==='gentle'||mode==='balanced') {");
replace(graph,'        const next=cost+arc.length*factor;',"        if(mode==='balanced')factor=1+0.65*(factor-1)+(mixed?0.7:0);\n        const next=cost+arc.length*factor;");
replace(graph,"    if(uncertainTerrainMeters>0)warnings.push","    if(mode==='balanced')warnings.push('Provisional combined distance, terrain and vehicle-permission heuristic; not a verified PRI or safety rating.');\n    if(uncertainTerrainMeters>0)warnings.push");
const worker='src/workers/dongjak-walk-worker.mjs';
replace(worker,'    self.postMessage({id,ok:true,routes:{standard:a,gentle:b}});',"    let balanced=null;\n    try{balanced=router.route(start,end,{mode:'balanced',maxSnapMeters:85})}catch{}\n    self.postMessage({id,ok:true,routes:{standard:a,gentle:b,balanced}});");
replace('src/dongjak-local-routing.js',"const result={standard:toAppRoute(data.routes.standard,'shortest'),gentle:toAppRoute(data.routes.gentle,'gentle')};","const result={standard:toAppRoute(data.routes.standard,'shortest'),gentle:toAppRoute(data.routes.gentle,'gentle'),balanced:data.routes.balanced?toAppRoute(data.routes.balanced,'balanced'):null};");
const planner='src/v815-route-planner.js';
replace(planner,'const std=[],gentleSegments=[];','const std=[],gentleSegments=[],balancedSegments=[];');
replace(planner,'    if(pair?.gentle)gentleSegments.push(pair.gentle);','    if(pair?.gentle)gentleSegments.push(pair.gentle);\n    if(pair?.balanced)balancedSegments.push(pair.balanced);');
replace(planner,"  return {standard,gentle,usingLocal:[...std,...gentleSegments].every(s=>s.source==='seoul-pedestrian-graph')};","  const balanced=balancedSegments.length===points.length-1?combineRouteSegments(balancedSegments,'balanced'):null;\n  return {standard,gentle,balanced,usingLocal:[...std,...gentleSegments,...balancedSegments].every(s=>s.source==='seoul-pedestrian-graph')};");
replace(planner,'let seconds=0,kilometers=0,slopeAscentM=0,slopeDescentM=0,slopeUncertainM=0;','let seconds=0,kilometers=0,slopeAscentM=0,slopeDescentM=0,slopeUncertainM=0,vehiclePermittedM=0;');
replace(planner,'    slopeUncertainM+=Number(segment.slopeUncertainM)||0;','    slopeUncertainM+=Number(segment.slopeUncertainM)||0;\n    vehiclePermittedM+=Number(segment.vehiclePermittedM)||0;');
replace(planner,'return {coords,maneuvers,seconds,kilometers,slopeAscentM,slopeDescentM,slopeUncertainM,','return {coords,maneuvers,seconds,kilometers,slopeAscentM,slopeDescentM,slopeUncertainM,vehiclePermittedM,');
replace(main,"import {computeMultiStopRoutes} from './v815-route-planner.js';","import {computeMultiStopRoutes,railTransferOptions} from './v815-route-planner.js';");
replace(main,"let routeVariants = {standard:null,gentle:null};","let routeVariants = {standard:null,gentle:null,balanced:null};\nlet routeGeneration=0;");
replace(main,"  routeVariants = {standard:null,gentle:null};","  routeGeneration++;routeVariants = {standard:null,gentle:null,balanced:null};\n  window.dispatchEvent(new Event('dj-next:route-clear'));");
replace(main,"  routeVariants={standard:null,gentle:null};","  routeGeneration++;routeVariants={standard:null,gentle:null,balanced:null};\n  window.dispatchEvent(new Event('dj-next:route-clear'));");
replace(main,"  if(alternative)alternative.setData(coords?.length?lineFeature(routeVariants[other]?.coords):emptyWalkingRoute());","  if(alternative){\n    const features=coords?.length?Object.entries(routeVariants).filter(([kind,r])=>kind!==selectedRouteVariant&&r?.coords?.length>=2).map(([kind,r])=>({type:'Feature',properties:{kind},geometry:{type:'LineString',coordinates:r.coords}})):[];\n    alternative.setData({type:'FeatureCollection',features});\n  }\n  if(map.getLayer('walking-route-line'))map.setPaintProperty('walking-route-line','line-color',selectedRouteVariant==='balanced'?'#087e68':selectedRouteVariant==='gentle'?'#a4742e':'#3978c8');");
// The canonical public route baseline now uses neutral #87939b for the
// unselected candidate, not the historical pink #bd6980. Keep the release
// patch anchored to the current source instead of failing protected builds.
// This layer is hidden while the chosen route displays measured PRI colors.
replace(main,"paint:{'line-color':'#87939b','line-width'","paint:{'line-color':['match',['get','kind'],'standard','#3978c8','gentle','#a4742e','balanced','#087e68','#87939b'],'line-width'");
replace(main,"function routeDataNote(result){\n  if(!result)return '';","function routeDataNote(result){\n  if(!result)return '';\n  if(result.routeMode==='balanced')return '종합 최적(잠정): 거리·추정 경사·차량 통행 허용 링크 비용을 반영했습니다. PRI·사고·조명·실측 보행안전은 아직 미반영입니다.';");
// Canonical rerouting validates the selected route and uses the existing provider fallback.
// Balanced is release-only and must still use real local geometry, never an invented external profile.
// All variants, including balanced GPS reroutes, use the district-validated provider path.
replace(main,"  return fetchPedestrianRoute(from,to,which,signal);","  if(which==='balanced')throw Error('이 구간에는 종합 경로 분석자료가 없습니다.');\n  return fetchPedestrianRoute(from,to,which,signal);");
replace(main,"  if(app.dataset.tab==='map')fitWalkingRoute(result.coords);","  window.dispatchEvent(new CustomEvent('dj-next:route-selected',{detail:selectedRouteVariant}));\n  if(app.dataset.tab==='map'){fitWalkingRoute(result.coords);syncRoutePresentation();}");
replace(main,"    toast(selectedRouteVariant==='gentle'?'경사 회피 우선 경로를 표시합니다.':'일반 보행 경로를 표시합니다.');","    toast(selectedRouteVariant==='gentle'?'경사 회피 우선 경로를 표시합니다.':selectedRouteVariant==='balanced'?'종합 최적(잠정) 경로를 표시합니다.':'일반 보행 경로를 표시합니다.');");
replace(main,"  const requestGeneration=++routeRequestGeneration;\n  const btn=document.getElementById('route-calc');","  const requestGeneration=++routeRequestGeneration;\n  const generation=routeGeneration;\n  const btn=document.getElementById('route-calc');");
replace(main,"    const gentle=routeWithinDistrict(local.gentle?.coords,boundaryGeometry,isDongjak)?local.gentle:null;","    const gentle=routeWithinDistrict(local.gentle?.coords,boundaryGeometry,isDongjak)?local.gentle:null;\n    const balanced=routeWithinDistrict(local.balanced?.coords,boundaryGeometry,isDongjak)?local.balanced:null;");
replace(main,"    return {...local,standard,gentle,usingLocal:true};","    return {...local,standard,gentle,balanced,usingLocal:true};");
replace(main,"    const gentle=routeWithinDistrict(result.gentle?.coords,boundaryGeometry,isDongjak)?result.gentle:null;","    const gentle=routeWithinDistrict(result.gentle?.coords,boundaryGeometry,isDongjak)?result.gentle:null;\n    const balanced=routeWithinDistrict(result.balanced?.coords,boundaryGeometry,isDongjak)?result.balanced:null;");
replace(main,'    routeVariants={standard,gentle};',"    if(generation!==routeGeneration)return;\n    routeVariants={standard,gentle,balanced:balanced||null};");
replace(main,"    selectedRouteVariant=standard?'standard':'gentle';","    selectedRouteVariant=standard?'standard':'gentle';\n    const transit=routeWaypoints.length?null:(railTransferOptions(routeStart,routeEnd,{limit:1})[0]||null);\n    window.dispatchEvent(new CustomEvent('dj-next:route-comparison',{detail:{...routeVariants,transit,selected:selectedRouteVariant}}));");
replace(main,"  } catch(error) {\n    if(requestGeneration!==routeRequestGeneration)return;\n    console.error('[동작하는 안전지도] 길찾기 오류:',error);","  } catch(error) {\n    if(requestGeneration!==routeRequestGeneration||generation!==routeGeneration)return;\n    console.error('[동작하는 안전지도] 길찾기 오류:',error);");
// The PRI route review owns the source label on ordinary and gentle routes.
 // Add the release-only balanced label without restoring the obsolete
 // pre-PRI two-line textContent branch (which no longer exists in main).
replace(main,"    document.getElementById('route-map-source').textContent=transitPreview?(transitPreview.kind==='bus'?'버스 '+transitPreview.route+' · 운행시간·요금 미확인':transitPreview.kind==='rail'?'지하철 연계 · 배차·대기 미반영':'환승 '+transitPreview.changes+'회 · 운행시간·요금 미확인'):(routeResult?.source==='seoul-pedestrian-graph'","    document.getElementById('route-map-source').textContent=transitPreview?(transitPreview.kind==='bus'?'버스 '+transitPreview.route+' · 운행시간·요금 미확인':transitPreview.kind==='rail'?'지하철 연계 · 배차·대기 미반영':'환승 '+transitPreview.changes+'회 · 운행시간·요금 미확인'):selectedRouteVariant==='balanced'?'종합 최적(잠정) · PRI 미반영':(routeResult?.source==='seoul-pedestrian-graph'");
replace('src/v815-map-product.js','  return {setWaypoints,renderStored};','  return {setWaypoints,renderStored,renderTransit};');
// Canonical V3 owns transit search, result selection and preview; no legacy open-transit injection.
replace('index.html','<button type="button" data-route-variant="gentle" aria-pressed="false">경사 회피 우선</button>','<button type="button" data-route-variant="gentle" aria-pressed="false">경사 회피 우선</button>\n              <button type="button" data-route-variant="balanced" aria-pressed="false" disabled>종합 최적 (잠정)</button>');
// Keep walking comparisons available when displaying a verified rail connection.
// The public app owns rail cancellation, preview state, and marker cleanup.
// Keep canonical invalidateRoute() ownership for all transit modes.
// Canonical transit preview owns fitWalkingRoute and details; do not rewrite navigation.
replace('index.html','<button type="button" data-route-variant="balanced" aria-pressed="false" disabled>종합 최적 (잠정)</button>','<button type="button" data-route-variant="balanced" aria-pressed="false" disabled>종합 최적 (잠정)</button>\n              <button type="button" id="djNext-transit-option" disabled>대중교통 경로</button>');

replace('src/v831-swipe-feature-toolbar.js','for(const child of [...row.children])if(child!==scroller&&child!==more)scroller.appendChild(child);','for(const child of [...row.children])if(child!==scroller&&child!==more&&child.id!==\'djNext-rail\')scroller.appendChild(child);');
console.log('Mobile next integration anchors verified.');
