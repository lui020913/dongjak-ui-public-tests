import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {blendHexColor,parseCssColor,findActiveScrim} from '../src/ios-pwa-overlay-chrome.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('detent movement and clipping use the same timing and natural compact geometry',()=>{
 const s=read('src/v889-mobile-sheet-motion.js');
 assert.match(s,/translate \$\{DURATION\}ms \$\{EASING\}, clip-path \$\{DURATION\}ms \$\{EASING\}/);
 assert.match(s,/compactRect=panel.getBoundingClientRect\(\);\s*panel.classList.add\(EXPANDED\)/);
 assert.match(s,/expandedRect.bottom\+startDelta.y-dockBottom/);
});

test('status surface blends the real overlay scrim instead of staying at the light theme color',()=>{
 const js=read('src/ios-pwa-overlay-chrome.js');
 const css=read('src/ios-pwa-overlay-chrome.css');
 const html=read('index.html');
 assert.match(js,/findActiveScrim/);
 assert.match(js,/blendHexColor\(baseColor,scrimColor\)/);
 assert.match(js,/themeMeta\.setAttribute\('content',statusColor\)/);
 assert.match(css,/--dj-ios-pwa-status-color/);
 assert.match(css,/#dj-mobile-safe-top/);
 assert.match(js,/root\.dataset\.djIosOverlayOpen/);
 assert.match(css,/var\(--dj-ios-pwa-base-color\) 0%/);
 assert.equal(css.split('/* Preserve the opaque, sharp search surface').length,2);
 assert.match(html,/ios-pwa-overlay-chrome\.css/);
 assert.match(html,/ios-pwa-overlay-chrome\.js/);
 assert.doesNotMatch(html,/mobile-pwa-status-tone-v793/);
});

test('40 percent black scrim produces the matching dimmed status surface',()=>{
 const scrim=parseCssColor('rgba(0, 0, 0, 0.4)');
 assert.deepEqual(scrim,{r:0,g:0,b:0,a:0.4});
 assert.equal(blendHexColor('#eef3ef',scrim),'#8f928f');
});

test('8-digit hex scrims retain their alpha channel',()=>{
 assert.deepEqual(parseCssColor('#091918b7'),{
  r:9,g:25,b:24,a:183/255
 });
});

test('legacy v7.9.3 status-tone files are removed',()=>{
 assert.equal(existsSync(new URL('../src/mobile-pwa-status-tone-v793.css',import.meta.url)),false);
 assert.equal(existsSync(new URL('../src/mobile-pwa-status-tone-v793.js',import.meta.url)),false);
 assert.doesNotMatch(read('src/ios-pwa-overlay-chrome.css'),/backdrop-filter:\s*blur/i);
});


function mockScrim({id='',opacity='1',backgroundColor='rgba(19,40,32,0.4)',zIndex='5000',hidden=false,rect={width:390,height:844,top:0,bottom:844},dialog=false,ariaHidden=false}={}){
 return {id,hidden,parentElement:null,getAttribute:key=>key==='aria-hidden'&&ariaHidden?'true':null,
  closest:()=>null,matches:selector=>dialog&&selector==='dialog[open]',
  getBoundingClientRect:()=>rect,style:{opacity,backgroundColor,zIndex,display:'block',visibility:'visible'}};
}
function sampleScrims(items){
 return findActiveScrim({querySelectorAll:()=>items,documentElement:{}},{
  innerWidth:390,innerHeight:844,getComputedStyle:(node,pseudo)=>pseudo==='::backdrop'?{...node.style,backgroundColor:'rgba(0,0,0,0.5)'}:node.style
 });
}
test('visible scrim matches its actual opacity, even with decorative aria-hidden',()=>{
 const scrim=mockScrim({opacity:'0.5',ariaHidden:true});
 assert.deepEqual(sampleScrims([scrim]),{r:19,g:40,b:32,a:0.2});
 assert.equal(sampleScrims([mockScrim({opacity:'0'})]),null);
 assert.equal(sampleScrims([mockScrim({hidden:true})]),null);
});
test('opaque cards and compact sheets are not mistaken for modal scrims',()=>{
 const card=mockScrim({backgroundColor:'rgb(255,255,255)'});
 const sheet=mockScrim({rect:{width:390,height:300,top:544,bottom:844}});
 assert.equal(sampleScrims([card,sheet]),null);
});
test('closing top scrim restores remaining scrim, then original theme; native dialog uses backdrop',()=>{
 const low=mockScrim({zIndex:'4000',backgroundColor:'rgba(8,22,18,0.24)'});
 const high=mockScrim({zIndex:'6000'});
 assert.deepEqual(sampleScrims([low,high]),{r:19,g:40,b:32,a:0.4});
 high.hidden=true;assert.deepEqual(sampleScrims([low,high]),{r:8,g:22,b:18,a:0.24});
 low.hidden=true;assert.equal(sampleScrims([low,high]),null);
 assert.deepEqual(sampleScrims([mockScrim({dialog:true})]),{r:0,g:0,b:0,a:0.5});
 assert.equal(blendHexColor('#192d32',null),'#192d32');
});
