import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const code=html.match(/<script id="dj-production-style-recovery">([\s\S]*?)<\/script>/)?.[1];
function fixture({missing=false,external=false}={}){
 const events={},winEvents={},timers=new Map();let seq=0,now=0,resize=0,reloads=0;
 function node(tag){return {tagName:tag.toUpperCase(),children:[],style:{},hidden:false,textContent:'',setAttribute(){},append(...children){this.children.push(...children);},addEventListener(name,fn){this[name]=fn;},remove(){body.children=body.children.filter(n=>n!==this);},querySelector(tag){return this.children.flatMap(x=>[x,...x.children]).find(n=>n.tagName===tag.toUpperCase());}};}
 const body=node('body'),link={tagName:'LINK',href:'https://app.test/assets/index-abc.css',sheet:missing?null:{cssRules:[{}]}},font={tagName:'LINK',href:'https://font.test/assets/font.css',sheet:null};
 const document={body,hidden:false,querySelectorAll:()=>external?[link,font]:[link],createElement:node,addEventListener:(name,fn)=>events[name]=fn};
 const window={addEventListener:(name,fn)=>winEvents[name]=fn,dispatchEvent:()=>resize++};
 vm.runInNewContext(code,{document,window,URL,Event:class{},location:{href:'https://app.test/',origin:'https://app.test',reload:()=>reloads++},Date:{now:()=>now},setTimeout:(fn,ms)=>{timers.set(++seq,{fn,at:now+ms});return seq;},clearTimeout:id=>timers.delete(id)});
 function tick(ms){const end=now+ms;for(;;){const entry=[...timers.entries()].sort((a,b)=>a[1].at-b[1].at)[0];if(!entry||entry[1].at>end)break;now=entry[1].at;timers.delete(entry[0]);entry[1].fn();}now=end;}
 return {body,link,events,winEvents,tick,resize:()=>resize,reloads:()=>reloads};
}
test('normal production and failed optional font never show recovery',()=>{const f=fixture({external:true});f.events.DOMContentLoaded();assert.equal(f.body.children.length,0);assert.equal(f.link.href,'https://app.test/assets/index-abc.css');});
test('missing CSS is retried once and broken UI is covered until valid CSS returns',()=>{const f=fixture({missing:true});f.events.DOMContentLoaded();assert.equal(f.body.children[0].id,'dj-css-recovery');assert.match(f.link.href,/dj-css-retry=1/);f.tick(600);assert.equal(new URL(f.link.href).searchParams.getAll('dj-css-retry').length,1);f.link.sheet={cssRules:[{}]};f.events.load({target:f.link});assert.equal(f.body.children.length,0);assert.equal(f.resize(),1);});
test('persistent failure offers explicit reload, never loops navigation automatically',()=>{const f=fixture({missing:true});f.events.DOMContentLoaded();f.tick(12000);const button=f.body.children[0].querySelector('button');assert.equal(button.hidden,false);assert.equal(f.reloads(),0);button.click();assert.equal(f.reloads(),1);});
test('home screen resume checks stylesheet availability again',()=>{const f=fixture();f.events.DOMContentLoaded();f.link.sheet=null;f.winEvents.pageshow();assert.equal(f.body.children[0].id,'dj-css-recovery');});
