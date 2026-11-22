import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {installLanguagePreference} from '../src/v854-language.js';

// Minimal DOM/MutationObserver implementation: reproduces a real browser's
// childList notifications when element.textContent is assigned, even if the
// assigned value is identical. This used to create a perpetual microtask loop
// in v8.5.4 before the map had a chance to paint.
function makeDOM(){
  const observers=[];
  let deliveryCount=0;
  const notify=(target,record)=>{
    for(const obs of observers){
      if(!obs.active||!obs.target)continue;
      let current=target,match=false;
      while(current){if(current===obs.target){match=true;break;}current=current.parentElement;}
      if(!match)continue;
      if(record.type==='childList'&&!obs.options.childList)continue;
      if(record.type==='attributes'&&(!obs.options.attributes||!obs.options.attributeFilter?.includes(record.attributeName)))continue;
      if(record.type==='characterData'&&!obs.options.characterData)continue;
      queueMicrotask(()=>{
        deliveryCount++;
        // Fail with a finite error instead of hanging the test indefinitely.
        if(deliveryCount>60)throw new Error('Potential infinite MutationObserver microtask loop');
        obs.callback([record]);
      });
    }
  };
  class TextNode{
    constructor(value,parent){this.nodeType=3;this.parentElement=parent;this.parentNode=parent;this._value=value;this.ownerDocument=doc;}
    get nodeValue(){return this._value;}
    set nodeValue(value){this._value=value;notify(this,{type:'characterData',target:this});}
  }
  class Element{
    constructor(tag){this.nodeType=1;this.tagName=tag.toUpperCase();this.parentElement=null;this.childNodes=[];this.attrs=new Map();this.ownerDocument=doc;this._textWrites=0;this.options=[];this.value='';this.dataset={};}
    append(...nodes){for(const node of nodes){node.parentElement=this;node.parentNode=this;this.childNodes.push(node);}notify(this,{type:'childList',target:this,addedNodes:nodes});}
    prepend(...nodes){for(const node of nodes){node.parentElement=this;node.parentNode=this;}this.childNodes.unshift(...nodes);notify(this,{type:'childList',target:this,addedNodes:nodes});}
    insertBefore(node,reference){
      if(node.parentElement){
        const siblings=node.parentElement.childNodes;
        const oldIndex=siblings.indexOf(node);
        if(oldIndex>=0)siblings.splice(oldIndex,1);
      }
      node.parentElement=this;node.parentNode=this;
      const index=reference?this.childNodes.indexOf(reference):-1;
      this.childNodes.splice(index>=0?index:this.childNodes.length,0,node);
      notify(this,{type:'childList',target:this,addedNodes:[node]});
    }
    get textContent(){return this.childNodes.map(n=>n.nodeType===3?n.nodeValue:n.textContent).join('');}
    set textContent(value){this._textWrites++;const node=new TextNode(value,this);this.childNodes=[node];notify(this,{type:'childList',target:this,addedNodes:[node]});}
    setAttribute(name,value){this.attrs.set(name,String(value));notify(this,{type:'attributes',target:this,attributeName:name});}
    getAttribute(name){return this.attrs.get(name)||null;}
    hasAttribute(name){return this.attrs.has(name);}
    addEventListener(){}
    closest(selector){return selector==='[data-dj-no-translate]'&&this.attrs.has('data-dj-no-translate')?this:null;}
    querySelector(selector){if(selector==='select')return this.find(el=>el.tagName==='SELECT');if(selector==='label')return this.find(el=>el.tagName==='LABEL');if(selector==='.dj854-language-section')return this.find(el=>el.className.includes('dj854-language-section'));if(selector==='.dj836-sheet-body')return this.find(el=>el.attrs.get('class')==='dj836-sheet-body');if(selector==='.dj834-my-home .dj834-settings-group')return this.find(el=>el.className==='dj834-settings-group');return null;}
    querySelectorAll(selector){return selector==='*'?this.descendants():[];}
    descendants(){return this.childNodes.filter(n=>n.nodeType===1).flatMap(n=>[n,...n.descendants()]);}
    find(pred){return this.descendants().find(pred)||null;}
    set className(value){this.attrs.set('class',value);}
    get className(){return this.attrs.get('class')||'';}
    set id(value){this.attrs.set('id',value);}
    get id(){return this.attrs.get('id')||'';}
  }
  const doc={nodeType:9,documentElement:{lang:'ko'},createElement:tag=>new Element(tag),createTreeWalker(root){const nodes=[];const visit=n=>{if(n.nodeType===3)nodes.push(n);else for(const child of n.childNodes||[])visit(child);};visit(root);let i=0;return {nextNode(){return nodes[i++]||null;}};},getElementById(id){return id==='app'?app:id==='mine-panel'?mine:null;}};
  const app=new Element('div'),mine=new Element('div'),body=new Element('div');body.className='dj836-sheet-body';mine.append(body);app.append(mine);
  const landing=new Element('section'),group=new Element('div');
  landing.className='dj834-my-home';group.className='dj834-settings-group';
  landing.append(group);body.append(landing);
  class FakeMutationObserver{
    constructor(callback){this.callback=callback;this.active=false;this.target=null;this.options=null;observers.push(this);}
    observe(target,options){this.active=true;this.target=target;this.options=options;}
    disconnect(){this.active=false;}
  }
  const win={localStorage:{getItem(){return null;},setItem(){}},queueMicrotask,dispatchEvent(){}};
  return {doc,app,body,win,FakeMutationObserver,getDeliveryCount:()=>deliveryCount};
}

test('v8.5.5: translating an observed panel does not starve map startup with a self-triggered mutation loop', async()=>{
  const {doc,body,win,FakeMutationObserver,getDeliveryCount}=makeDOM();
  const previous=globalThis.MutationObserver;
  globalThis.MutationObserver=FakeMutationObserver;
  try{
    const cleanup=installLanguagePreference(doc,win);
    const section=body.querySelector('.dj854-language-section');
    assert.ok(section,'language selector should be installed');
    const label=section.querySelector('label');
    const writes=label._textWrites;
    // Adding a search result / panel node happens frequently during map startup.
    body.append(doc.createElement('div'));
    // Drain the mutation observer microtasks.
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(label._textWrites,writes,'observer must not write unchanged label text on each mutation');
    assert.ok(getDeliveryCount()<60,'mutation notifications must settle');
    cleanup();
  }finally{globalThis.MutationObserver=previous;}
});

test('v8.5.5: TIP measurement ignores its own inline style mutations',()=>{
  const source=readFileSync(new URL('../src/v854-tip-marquee.js',import.meta.url),'utf8');
  assert.match(source,/attributeFilter:\['hidden','class'\]/);
  assert.match(source,/getPropertyValue\('--dj854-tip-overflow'\)/);
});
