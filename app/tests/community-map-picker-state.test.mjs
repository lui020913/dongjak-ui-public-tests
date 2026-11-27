import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');
const main=read('main.js'),tabs=read('bottom-tab-navigation.js');
const section=(start,end)=>main.slice(main.indexOf(start),main.indexOf(end,main.indexOf(start)+start.length));
test('location picker cancel and selection share a draft resume path preserving map origin',()=>{
 const resume=section('function resumeCommunityLocationDraft()', 'function selectCommunityLocation(');
 assert.match(resume,/clearCommunityLocationPick\(\)/);
 assert.match(resume,/cancelCommunityTabMotion\(\)/);
 assert.match(resume,/navigate\('participate',\{resumeCommunityDraft:true\}\)/);
 assert.ok(resume.includes('if(!communityComposerFromMap||'));
 assert.match(resume,/resumeCommunityDraft:true/);
 assert.match(resume,/openCommunityComposer\(true\)/);
 const pick=section('function selectCommunityLocation(', "document.getElementById('community-map-pick')");
 assert.match(pick,/!communityPickMode\|\|app.dataset.tab!=='map'/);
 assert.match(pick,/resumeCommunityLocationDraft\(\)/);
 assert.match(main,/if\(communityPickMode\)resumeCommunityLocationDraft\(\)/);
});
test('leaving picker or viewing saved post clears selection mode and hint',()=>{
 assert.match(main,/if\(tab!=='map'&&communityPickMode\)clearCommunityLocationPick\(\)/);
 const clear=section('function clearCommunityLocationPick()', 'function cancelCommunityTabMotion()');
 assert.match(clear,/communityPickMode=false/);
 assert.match(clear,/const hint=document\.getElementById\('community-map-hint'\)/);
 assert.match(clear,/hint\.hidden=true/);
 assert.match(clear,/communityPickerDockObserver\?\.disconnect\(\)/);
 assert.match(clear,/delete app\.dataset\.communityPicking/);
 const show=section('function showCommunityLocation(', 'async function updateLike(');
 assert.match(show,/clearCommunityLocationPick\(\);\s*cancelCommunityTabMotion\(\);/);
 assert.doesNotMatch(show,/communityPickMode=true/);
});
test('programmatic picker cancels both tab motion owners and unregisters listener',()=>{
 assert.match(tabs,/cancelExternalTransition=\(\)=>\{cancelPrimary\(\);clearEntrance\(\);\}/);
 assert.match(tabs,/addEventListener\('dongjak:cancel-tab-transition',cancelExternalTransition\)/);
 assert.match(tabs,/removeEventListener\('dongjak:cancel-tab-transition',cancelExternalTransition\)/);
});

test('map tap stages a marker and road address; only explicit confirmation commits location',()=>{
 const select=section('function selectCommunityLocation(', 'function renderCommunityPickedAddress(');
 assert.match(select,/communityPickCandidate=candidate/);
 assert.match(select,/new maplibregl\.Marker\(\{color:'#ec6d35',scale:1\.05\}\)/);
 assert.match(select,/fetchRouteRoadAddress\(position\)/);
 assert.match(select,/communityPickCandidate===candidate&&communityPickMode/);
 assert.doesNotMatch(select,/communityPickedLocation\s*=(?!=)/);
 assert.doesNotMatch(select,/resumeCommunityLocationDraft\(\)/);
 const confirm=section('function confirmCommunityLocation(', "document.getElementById('community-map-accept').addEventListener");
 assert.match(confirm,/communityPickedLocation=candidate\.position/);
 assert.match(confirm,/renderCommunityPickedAddress\(candidate\)/);
 assert.match(confirm,/resumeCommunityLocationDraft\(\)/);
 const clear=section('function clearCommunityLocationPick()', 'function cancelCommunityTabMotion()');
 assert.match(clear,/communityPickMarker\?\.remove\(\)/);
 assert.match(clear,/communityPickCandidate=null/);
 assert.doesNotMatch(clear,/communityPickedLocation\s*=(?!=)/);
});

 test('inactive community surface relinquishes inline paint ownership without interrupting a live dissolve',()=>{
 const nav=section('function navigate(tab,','// Capture mobile HOME');
 assert.match(nav,/if\(panel\.id==='participation-panel'&&panel\.hidden&&!outgoing\)/);
 assert.match(nav,/communityComposerPortal\?\.close\(\)/);
 assert.match(nav,/delete panel\.dataset\.djPrimaryTransition/);
 assert.match(nav,/\['display','visibility','opacity','pointer-events','animation','transition','will-change','z-index'\]/);
 assert.match(nav,/panel\.style\.removeProperty\(key\)/);
 });

test('location picker snapshots the actual destination and ignores late duplicate report opens',()=>{
 const start=section("document.getElementById('community-map-pick').addEventListener","document.getElementById('community-map-cancel').addEventListener");
 assert.match(start,/communityPickerReturnTab=app\.dataset\.tab==='participate'/);
 assert.ok(start.indexOf('communityPickerReturnTab=')<start.indexOf("navigate('map'"));
 const resume=section('function resumeCommunityLocationDraft()', 'function selectCommunityLocation(');
 assert.ok(resume.indexOf('const returnTab=communityPickerReturnTab')<resume.indexOf('clearCommunityLocationPick()'));
 assert.match(resume,/if\(returnTab\)communityComposerFromMap=returnTab==='map'/);
 const report=section('onReport:()=>{','function makeCEl(');
 assert.ok(report.indexOf('if(communityComposerPortal?.isOpen()||communityPickMode)return')<report.indexOf('communityComposerFromMap='));
 const toggle=section("document.getElementById('community-compose-toggle').addEventListener","document.getElementById('community-compose-close').addEventListener");
 assert.match(toggle,/if\(app\.dataset\.tab!=='participate'\)navigate\('participate'\)/);
});


test('draft picker establishes the paint gate before navigation and removes stale tab ownership',()=>{
 const start=section("document.getElementById('community-map-pick').addEventListener","document.getElementById('community-map-cancel').addEventListener");
 assert.ok(start.indexOf("app.dataset.communityPicking='true'")<start.indexOf("navigate('map'"));
 assert.match(start,/panel\.hidden=true;delete panel\.dataset\.djTabOutgoing;delete panel\.dataset\.djPrimaryTransition/);
 const css=read('community-composer-portal.css');assert.match(css,/\[data-community-picking="true"\] #participation-panel\{display:none!important;visibility:hidden!important/);
});
