import {readPrimaryPhoneCss} from './helpers/primary-phone-css.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  AI_DISMISS_GUARD_MS,markAiSurfaceDismissal,isAiBlockedAfterDismiss,
  isAiSurfaceDismissControl,isMapDetailVisible,installAiSurfaceDismissGuard
} from '../src/ai-surface-dismiss-guard.js';

const source=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');

test('dismissal guard is shared by popup, transport, and mobile orb entrypoints',()=>{
  const now=Date.now();
  const until=markAiSurfaceDismissal(now);
  assert.equal(until>=now+AI_DISMISS_GUARD_MS,true);
  assert.equal(isAiBlockedAfterDismiss(now+AI_DISMISS_GUARD_MS-1),true);
  assert.equal(isAiBlockedAfterDismiss(until),false);
  for(const selector of ['#transport-close','.dj-place-header-close','.maplibregl-popup-close-button']){
    assert(isAiSurfaceDismissControl({closest:s=>s.includes(selector)?{}:null}),selector);
  }
  const openPopups={querySelector:()=>({})};
  const empty={querySelector:()=>null};
  assert.equal(isMapDetailVisible(openPopups),true);
  assert.equal(isMapDetailVisible(empty),false);
  const listeners=new Map();
  const doc={
    addEventListener(name,fn){listeners.set(name,fn);},
    removeEventListener(name,fn){if(listeners.get(name)===fn)listeners.delete(name);}
  };
  const release=installAiSurfaceDismissGuard(doc);
  const before=Date.now();
  listeners.get('pointerdown')({target:{closest:s=>s.includes('.dj-place-header-close')?{}:null}});
  assert(isAiBlockedAfterDismiss(before+1000));
  release();
  assert.equal(listeners.size,0);
});

test('language remains in App & Display row regardless of initialization order',()=>{
  const home=source('v834-my-info.js'),language=source('v854-language.js');
  const css=readPrimaryPhoneCss();
  const wrapped=home.indexOf('records.append(child)');
  const correct=home.indexOf('displayGroup.insertBefore(languageControl');
  assert(wrapped!==-1&&correct>wrapped);
  assert(language.includes('section.hidden=true'));
  assert(language.includes('if(section.hidden)section.hidden=false'));
  assert(css.includes('.dj834-settings-group > .dj854-language-section'));
  assert(css.includes('.dj854-language-section[hidden]'));
  assert(css.includes('background:transparent!important'));
  assert(css.includes('display:flex!important;flex-direction:row!important'));
  assert(css.includes('.dj854-language-section > select'));
});

test('light account and font details use the same screen-colored canvas as header',()=>{
  const css=readPrimaryPhoneCss();
  assert(css.includes('Only intentional form inputs and inset photo/profile cards remain elevated'));
  for(const key of ['.dj834-detail-content','.dj834-account-container',
    '.dj877-type-settings','#dj824-account','.dj824-account-details']){
    assert(css.includes(key),key);
  }
  assert(css.includes('background-color:transparent!important'));
  assert(css.includes('var(--dj-primary-page-ink'));
});

test('AI cannot open through facility X, facility drag, or transport close/release',()=>{
  const ai=source('v880-supabase-safety-ai.js');
  const orb=source('v890-mobile-ai-orb.js');
  const place=source('place-details.js');
  const transit=source('transport-map.js');
  for(const code of [ai,orb])assert(code.includes('isAiBlockedAfterDismiss()'));
  assert(ai.includes('isMapDetailVisible(document)'));
  assert(orb.includes('isMapDetailVisible(doc)'));
  assert(orb.includes('!pointerIntent&&!keyboardIntent&&!accessibilityIntent'));
  assert(place.includes("document.dispatchEvent(new CustomEvent('dongjak:facility-dismiss-start'))"));
  assert(place.includes('markAiSurfaceDismissal()'));
  assert(transit.includes('if(wasVisible)markAiSurfaceDismissal()'));
  assert(transit.includes("new CustomEvent('dongjak:transport-dismiss-start')"));
});
