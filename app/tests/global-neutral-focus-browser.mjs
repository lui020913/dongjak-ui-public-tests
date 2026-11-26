import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium,webkit} from 'playwright';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const html=read('../index.html');
const focus=html.match(/\/\* DJ_INTERACTION_FOCUS_START \*\/([\s\S]*?)\/\* DJ_INTERACTION_FOCUS_END \*\//)?.[1];
const script=html.match(/<script id="dj-interaction-input">[\s\S]*?<\/script>/)?.[0];
assert.ok(focus&&script);
const policy='<style>'+focus+'</style>'+script;
assert.ok(policy);
const style=read('../src/style.css'),production=read('../../frontend/production/mobile-next.css'),route=read('../src/route-screen-v3.css');
for(const engine of [chromium,webkit]){
 const browser=await engine.launch();
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  await page.setContent(`<html><head>${policy}<style>${style}\n${production}</style></head><body><div id="app" style="position:static"><button id="dj-user-tip-close" style="width:44px;height:44px">×</button><section id="ped-tools-panel"><button id="ped-tools-close">닫기</button></section><button id="focus-test">Test</button><input id="entry"><div id="shadow"></div></div></body></html>`);
  await page.evaluate(css=>{
    const s=document.querySelector('#shadow').attachShadow({mode:'open'});
    s.innerHTML='<style>'+css+'</style><button id="shadow-button">Route</button>';
  },route);
  const tip=page.locator('#dj-user-tip-close');
  const close=page.locator('#ped-tools-close');
  const props=el=>{const s=getComputedStyle(el);return {outline:s.outlineStyle,color:s.outlineColor,shadow:s.boxShadow,border:s.borderTopWidth,bg:s.backgroundColor}};
  const tipStyle=await tip.evaluate(props);
  assert.equal(tipStyle.border,'0px');assert.equal(tipStyle.shadow,'none');assert.equal(tipStyle.bg,'rgba(0, 0, 0, 0)');
  await page.evaluate(()=>{document.dispatchEvent(new Event('touchstart',{bubbles:true}));document.querySelector('#ped-tools-close').focus()});
  assert.equal(await close.evaluate(el=>getComputedStyle(el).outlineStyle),'none');
  assert.equal(await close.evaluate(el=>getComputedStyle(el).boxShadow),'none');
  await page.evaluate(()=>document.querySelector('#shadow').shadowRoot.querySelector('button').focus());
  assert.equal(await page.locator('#shadow-button').evaluate(el=>getComputedStyle(el).outlineStyle),'none');
  await page.evaluate(()=>{document.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true}));document.querySelector('#ped-tools-close').blur()});
  await page.keyboard.press('Tab');
  await page.evaluate(()=>document.querySelector('#focus-test').focus());
  const keyboard=await page.locator('#focus-test').evaluate(props);
  assert.equal(keyboard.outline,'solid');assert.equal(keyboard.color,'rgb(89, 99, 104)');
  console.log(engine.name()+' interaction focus cascade passed');
 }finally{await browser.close()}
}
