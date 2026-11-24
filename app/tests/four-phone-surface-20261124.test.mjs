import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {refreshVegetationPaint,GREEN_PALETTE} from '../src/map-appearance.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('temporary dark theme recolors original and late vegetation without touching analytic lines',()=>{
 const layers=[{id:'park',type:'fill'},{id:'dongjak-forest-shade-0',type:'fill'},{id:'water',type:'fill'},{id:'dj-night-occ-clear',type:'line'}];
 const calls=[];const map={getStyle:()=>({layers}),setPaintProperty:(...args)=>calls.push(args)};
 refreshVegetationPaint(map,{dataset:{theme:'dark'}});
 assert.deepEqual(calls.filter(x=>x[1]==='fill-color'),[['park','fill-color',GREEN_PALETTE.dark.park],['dongjak-forest-shade-0','fill-color',GREEN_PALETTE.dark.forest]]);
 calls.length=0;refreshVegetationPaint(map,{dataset:{theme:'light'}});
 assert.deepEqual(calls.filter(x=>x[1]==='fill-color'),[['park','fill-color',GREEN_PALETTE.light.park],['dongjak-forest-shade-0','fill-color',GREEN_PALETTE.light.forest]]);
 assert.match(read('src/ui-environment.js'),/refreshVegetationPaint\(map,app\)/);
});
test('preview card is lower and the guide action remains accessible',()=>{
 const css=read('src/route-experience.css');assert.match(css,/max-height:min\(44dvh,350px\)/);
 assert.match(css,/bottom:calc\(max\(0px,env\(safe-area-inset-bottom,0px\) - 8px\)\)/);
 assert.match(css,/\.route-map-card-actions\{[\s\S]*?position:sticky!important/);
});
test('nearby content has a separate scroll owner; metro terminals retain grid slots',()=>{
 const css=read('src/mobile-ui/current.css'),ped=read('src/pedestrian-tools.js'),trans=read('src/transport-map.js');
 assert.match(ped,/scroll.append\(status,results\)/);assert.match(css,/\.dj-nearby-scroll\{[\s\S]*?overflow-y:auto!important/);
 assert.match(trans,/neighbor.verified&&!neighbor.previous\)\{previousNode.hidden=true/);
 assert.match(css,/\.metro-rail-current\{grid-column:2!important/);
 assert.match(css,/\.metro-rail-next\{grid-column:3!important/);
 assert.match(css,/\.metro-rail-next\)\[hidden\]\{[\s\S]*?display:none!important/);
 assert.match(css,/\.metro-planned-notice,\.metro-quota-notice\)\{[\s\S]*?margin:0 0 12px/);
});
test('expanded night card excludes HUD and only body scrolls',()=>{
 const css=read('src/mobile-ui/current.css');
 assert.match(css,/:has\(#night-visibility-float:not\(\[hidden\]\)\[data-collapsed="false"\]\) :is\(\.topbar,#dj-v794-toolbar,#djNext-toolbar,\.map-actions\)\{[\s\S]*?display:none!important/);
 assert.match(css,/\.night-visibility-float-content\{[\s\S]*?overflow-y:auto!important/);
});
