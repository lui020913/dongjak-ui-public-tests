import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assertSupabaseAuthorizeUrl} from '../src/v831-kakao-popup.js';
import {MOBILE_FLOATING_SHEETS} from '../src/dj-v8212-sheet-controller.js';

const css=readFileSync(new URL('../src/v829-mobile-layout-system.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app='https://dongjak-walk-safety-preview.pages.dev/oauth-popup.html';
const supa='https://abc.supabase.co';
test('only Supabase Kakao authorization URL with exact callback is accepted',()=>{
 const sign=`${supa}/auth/v1/authorize?provider=kakao&redirect_to=${encodeURIComponent(app)}`;
 const link=`${supa}/auth/v1/user/identities/authorize?provider=kakao&redirect_to=${encodeURIComponent(app)}`;
 assert.equal(assertSupabaseAuthorizeUrl(sign,supa,app),true);
 assert.equal(assertSupabaseAuthorizeUrl(link,supa,app),true);
 for(const bad of [
  `https://evil.example/auth/v1/authorize?provider=kakao&redirect_to=${encodeURIComponent(app)}`,
  `${supa}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(app)}`,
  `${supa}/auth/v1/authorize?provider=kakao&redirect_to=https://wrong.example/`,
 ])assert.throws(()=>assertSupabaseAuthorizeUrl(bad,supa,app));
});
test('mobile header owner is one flex row not a row/column grid',()=>{
 const portion=css.slice(css.indexOf('/* One authoritative header layout'),css.indexOf('/* Only the SVG draws the X'));
 assert.match(portion,/display:flex!important;flex-flow:row nowrap!important/);
 assert.match(portion,/align-self:center!important/);
 assert.doesNotMatch(portion,/grid-template-columns/);
 assert.match(html,/dj-v8212-sheet-controller.js/);
});
test('admin layer hides map controls only while admin is active, not on default map',()=>{
 assert.match(css,/data-dj-active-sheet="admin-dong-picker"/);
 assert.match(css,/\.map-actions/);
 assert.match(css,/\.dj-sheet-swipe-zone/);
 assert.ok(MOBILE_FLOATING_SHEETS.some(([id])=>id==='admin-dong-picker'));
 assert.ok(MOBILE_FLOATING_SHEETS.some(([id])=>id==='mine-panel'));
 assert.ok(MOBILE_FLOATING_SHEETS.some(([id])=>id==='route-panel'));
});
