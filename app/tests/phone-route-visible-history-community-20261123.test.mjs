import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {walkingRouteViewportPadding} from '../src/route-map-focus.js';

const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const prod=name=>{
  try{return read('../src/'+name);}
  catch(error){if(error?.code!=='ENOENT')throw error;return read('../../frontend/production/'+name);}
};

test('walking route camera uses actual toolbar and card bounds, not viewport guesses',()=>{
 const p=walkingRouteViewportPadding({viewportHeight:850,mapTop:0,toolbarBottom:205,sheetTop:600,navigationTop:770});
 assert.ok(p.top>=205&&p.top<240,JSON.stringify(p));
 assert.ok(p.bottom>=260&&p.bottom<300,JSON.stringify(p));
 assert.equal(p.left,p.right);
 assert.ok(p.top+p.bottom<850-120);
});
test('walking route camera always preserves usable window on short mobile',()=>{
 const p=walkingRouteViewportPadding({viewportHeight:480,toolbarBottom:185,sheetTop:270,navigationTop:420});
 assert.ok(p.top+p.bottom<=480-126,JSON.stringify(p));
 assert.ok(Number.isFinite(p.top)&&Number.isFinite(p.bottom));
});
test('route map fit uses actual preview geometry and the visible map card, not hidden ghost cards',()=>{
 const src=read('../src/main.js'),ui=read('../src/route-experience-20261123.js');
 assert.match(src,/walkingRouteViewportPadding\(/);
 assert.match(src,/sheetTop:visible\(card\)/);
 assert.match(ui,/const actions=mapCard\.querySelector\('\.route-map-card-actions'\)/);
 assert.match(ui,/actions\?\.before\(choices\)/);
 assert.doesNotMatch(ui,/mapCard\.append\(methodology\)/);
 assert.match(ui,/choices\.append\(choiceHead,priHeading,choiceRows,hint,legend\)/);
});
test('phone route cards have a single owner; native route actions and map fit remain',()=>{
 const old=prod('mobile-next.js');
 const modern=read('../src/route-experience-20261123.js');
 const css=read('../src/route-experience.css');
 assert.match(old,/export function installPhoneRouteComparison\(\)\{return undefined;\}/);
 assert.doesNotMatch(old,/cards\.id='djNext-route-compare'/);
 assert.match(modern,/route-map-card/);
 assert.match(modern,/dongjak:route-pri-ready/);
 assert.match(modern,/native\.click\(\)/);
 assert.match(css,/#dj-route-choice-list/);
 assert.match(css,/#route-guide-start/);
});
test('community, typography and history retain source owners but remove redundant UI',()=>{
 const ui=read('../src/version-history-v7.js');
 const style=prod('mobile-next.css');
 assert.match(ui,/new Set\(\(currentRelease\?\.items/);
 assert.doesNotMatch(ui,/el\('details','dj-edition-patch/);
 assert.match(style,/dj-community-feed-status\{[^\n]*background:transparent!important/);
 assert.match(style,/dj885-type-choices button\[aria-pressed=true\]\{box-shadow:none!important/);
});
