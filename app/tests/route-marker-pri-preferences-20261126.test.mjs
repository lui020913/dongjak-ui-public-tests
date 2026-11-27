import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CURRENT_SIX_FACTORS} from '../src/pri-data.mjs';
import {compareCompositePriRoutes,visualizeCompositePriRoutes,normalizeRoutePriFactors} from '../src/pri-route-exposure.mjs';

const routes={standard:{coords:[[126.94,37.5],[126.9415,37.5]]},gentle:{coords:[[126.94,37.501],[126.9415,37.501]]}};
const segment=(id,coords,lighting,other)=>({id,geometry:{type:'LineString',coordinates:coords},scores:Object.fromEntries(CURRENT_SIX_FACTORS.map(k=>[k,k==='lighting'?lighting:other])),evidence:{}});
const bundle=()=>({segments:[segment('a',routes.standard.coords,95,20),segment('b',routes.gentle.coords,10,90)]});

test('default six and selected factors actually change route recommendation and coloring',()=>{
 const b=bundle();
 assert.deepEqual(normalizeRoutePriFactors(),[...CURRENT_SIX_FACTORS]);
 assert.deepEqual(compareCompositePriRoutes(routes,b),compareCompositePriRoutes(routes,b,[...CURRENT_SIX_FACTORS]));
 assert.equal(compareCompositePriRoutes(routes,b).recommendation,'gentle');
 const result=compareCompositePriRoutes(routes,b,['lighting']);
 assert.equal(result.recommendation,'standard');
 assert.equal(result.standard.risk,5);
 assert.equal(result.gentle.risk,90);
 assert.deepEqual(result.selectedFactors,['lighting']);
 const visuals=visualizeCompositePriRoutes(routes,b,['lighting']);
 assert.equal(visuals.standard.features[0].properties.tone,'low');
 assert.equal(visuals.gentle.features[0].properties.tone,'severe');
});

test('custom subset excludes missing and modeled observations; invalid empty selections rejected',()=>{
 const b=bundle();
 b.segments[0].evidence.lighting={modeled:true};
 assert.equal(compareCompositePriRoutes(routes,b,['lighting']).standard.risk,null);
 assert.equal(compareCompositePriRoutes(routes,b,['lighting']).recommendation,null);
 assert.equal(visualizeCompositePriRoutes(routes,b,['lighting']).standard.features[0].properties.tone,'unknown');
 b.segments[1].scores.crossing=null;
 assert.equal(compareCompositePriRoutes(routes,b,['lighting','crossing']).gentle.risk,null);
 assert.throws(()=>normalizeRoutePriFactors([]),RangeError);
 assert.throws(()=>normalizeRoutePriFactors(['nonexistent']),RangeError);
 assert.deepEqual(normalizeRoutePriFactors(['lighting','lighting']),['lighting']);
});

test('route markers and dialogs have explicit lifecycle guards',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.ok(main.includes("drawRouteMarkers(picking||preview||guiding||app.dataset.transitComparison==='true')"));
 assert.ok(main.includes('routeEndpointMarkerKeys[key]===next'));
 assert.ok(main.includes('routeCandidateMarker?.remove()'));
 assert.ok(main.includes("window.addEventListener('pagehide'"));
 assert.ok(main.includes('routeRequestGeneration'));
 const pref=readFileSync(new URL('../src/route-pri-preferences.js',import.meta.url),'utf8');
 assert.ok(pref.includes('if(dialog.open)return'));
 assert.ok(pref.includes('apply.disabled=count===0'));
 assert.ok(pref.includes('selected=next;close()'));
});
