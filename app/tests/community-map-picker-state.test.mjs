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
 assert.match(clear,/community-map-hint'\)\.hidden=true/);
 const show=section('function showCommunityLocation(', 'async function updateLike(');
 assert.match(show,/clearCommunityLocationPick\(\);\s*cancelCommunityTabMotion\(\);/);
 assert.doesNotMatch(show,/communityPickMode=true/);
});
test('programmatic picker cancels both tab motion owners and unregisters listener',()=>{
 assert.match(tabs,/cancelExternalTransition=\(\)=>\{cancelPrimary\(\);clearEntrance\(\);\}/);
 assert.match(tabs,/addEventListener\('dongjak:cancel-tab-transition',cancelExternalTransition\)/);
 assert.match(tabs,/removeEventListener\('dongjak:cancel-tab-transition',cancelExternalTransition\)/);
});
