import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {vegetationPalette,repaintVegetation} from '../src/map-appearance.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('stale night preferences cannot recolor forest polygons or mutate road paints',()=>{
 const layers=[{id:'park',type:'fill'},{id:'dongjak-forest-shade-0',type:'fill'},{id:'dj-night-occ-clear',type:'line'}];
 const paint=new Map(),map={getStyle:()=>({layers}),getPaintProperty:id=>paint.get(id),setPaintProperty:(id,key,value)=>paint.set(id,value)};
 const app={dataset:{theme:'light',sangdoNight:'on'}};
 assert.equal(vegetationPalette(app).forest,'#92bd86');repaintVegetation(map,app);
 assert.equal(paint.get('park'),'#a5ca92');assert.equal(paint.get('dongjak-forest-shade-0'),'#92bd86');assert.equal(paint.has('dj-night-occ-clear'),false);
 app.dataset.sangdoNight='off';repaintVegetation(map,app);assert.equal(paint.get('park'),'#a5ca92');
 assert.match(read('src/ui-environment.js'),/repaintVegetation\(map,app\)/);
});
test('phone layout isolates nearby scroll and hides terminal without moving station slots',()=>{
 const css=read('src/mobile-ui/current.css'),near=read('src/pedestrian-tools.js');
 assert.match(near,/scrollBody.classList.add\('dj-nearby-scroll-body'\)/);
 assert.match(css,/\.dj-nearby-scroll-body\{[\s\S]*?overflow-y:auto!important/);
 assert.match(css,/\.metro-rail-next\)\[hidden\]\{[\s\S]*?display:none!important/);
 assert.match(css,/\.metro-rail-current\{grid-column:2!important/);
 assert.match(read('src/route-experience.css'),/max-height:min\(44dvh,342px\)/);
 assert.doesNotMatch(css,/data-sangdo-night="on"\]:has\(#night-visibility-float/);
});

test('ordinary mobile sheets retain shared light surface tokens',()=>{
 const css=read('src/mobile-ui/current.css');
 assert.match(css,/var\(--dj-theme-surface,#fff\)/);
 assert.doesNotMatch(css,/data-theme="dark"|data-sangdo-night="on"/);
});

test('preview keeps four pixel minimum bottom clearance above safe area',()=>{
 const css=read('src/route-experience.css');
 assert.match(css,/data-dj-route-stage="preview"\]\s+#route-map-card:not\(\[hidden\]\)\s*\{[^}]*bottom:calc\(env\(safe-area-inset-bottom,0px\) \+ 4px\)!important/);
});
