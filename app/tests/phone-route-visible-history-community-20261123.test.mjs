import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {walkingRouteViewportPadding} from '../src/route-map-focus.js';

const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
// Source CI reads the tracked frontend file; isolated release builds install
// the identical approved production file as app/src/mobile-next.{js,css}.
const production=name=>{
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
test('map fit is measured after route preview DOM renders',()=>{
 const src=read('../src/main.js');
 const ui=production('mobile-next.js');
 assert.match(src,/walkingRouteViewportPadding\(/);
 assert.match(src,/sheetTop:visible\(card\)/);
 assert.match(ui,/requestAnimationFrame\(\(\)=>win\.requestAnimationFrame/);
 assert.match(ui,/showCompact\(\)/);
 assert.match(ui,/aria-controls','djNext-route-compare'/);
});
test('phone menu remains interactive while alternate route cards are initially collapsed',()=>{
 const css=production('mobile-next.css');
 const ui=production('mobile-next.js');
 assert.match(css,/\.dj9272-selected-route\{display:none!important/);
 assert.match(css,/\[data-dj9272-route-focus="true"\] \.dj9272-selected-route\{display:flex!important/);
 assert.match(css,/\[data-dj9272-route-focus="true"\] #djNext-route-compare\{display:none!important/);
 assert.match(ui,/expand\.setAttribute\('aria-expanded','false'\)/);
});
test('community, typography and history retain source owners but remove redundant UI',()=>{
 const ui=read('../src/version-history-v7.js');
 const style=production('mobile-next.css');
 assert.match(ui,/currentTexts\.has\(first\)/);
 assert.match(style,/dj-community-feed-status\{[^\n]*background:transparent!important/);
 assert.match(style,/dj885-type-choices button\[aria-pressed=true\]\{box-shadow:none!important/);
});
