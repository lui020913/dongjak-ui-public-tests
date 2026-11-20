import test from 'node:test';
import assert from 'node:assert/strict';
import {notificationDecision} from '../scripts/qa-approval-notify.mjs';
const base='a'.repeat(40),head='b'.repeat(40);
const comment=(id,body,login='lui020913')=>({id,body,user:{login}});
const plan=comment(100,'수정 계획\n<!-- qa-approval:pending:route-fix;base='+base+';head='+head+';pr=93 -->');
test('request from exact owner plan, deduplicated by bot marker',()=>{const a=notificationDecision([plan],[],base);assert.equal(a.kind,'request');assert.match(a.body,/@lui020913/);assert.equal(notificationDecision([plan,comment(101,a.marker,'github-actions[bot]')],[],base),null);});
test('explicit owner approval alone triggers receipt; others cannot approve',()=>{assert.equal(notificationDecision([plan,comment(101,'승인','stranger')],[],base).kind,'request');assert.equal(notificationDecision([plan,comment(101,'승인')],[],base).kind,'received');assert.equal(notificationDecision([plan],[{user:{login:'lui020913'},content:'+1'}],base).kind,'received');assert.equal(notificationDecision([plan,comment(101,'거절')],[],base),null);});
test('stale, conflicting, or untrusted plans are never notified',()=>{assert.equal(notificationDecision([plan],[],'c'.repeat(40)),null);assert.equal(notificationDecision([plan,comment(101,plan.body)],[],base),null);assert.equal(notificationDecision([{...plan,user:{login:'stranger'}}],[],base),null);});
