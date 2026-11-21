import test from 'node:test';
import assert from 'node:assert/strict';
import {createThemeState} from '../src/theme-state-core.mjs';

test('manual light/dark choice changes effective theme without remounts',()=>{
  const state=createThemeState('light');
  assert.deepEqual(state.snapshot(),{theme:'light',preference:'light',temporary:null});
  assert.equal(state.toggle(),'dark');
  assert.equal(state.value,'dark');
  assert.equal(state.toggle(),'light');
  assert.equal(state.value,'light');
});

test('night analysis uses temporary dark and restores the saved preference',()=>{
  const state=createThemeState('light');
  assert.equal(state.override('dark'),true);
  assert.equal(state.value,'dark');
  assert.equal(state.preference,'light');
  assert.equal(state.override(null),true);
  assert.equal(state.value,'light');
  assert.equal(state.preference,'light');
});

test('a preference changed during night analysis is applied on exit only',()=>{
  const state=createThemeState('light');
  state.override('dark');
  assert.equal(state.toggle(),'dark');
  assert.equal(state.value,'dark');
  assert.equal(state.preference,'dark');
  assert.equal(state.toggle(),'light');
  assert.equal(state.value,'dark');
  state.override(null);
  assert.equal(state.value,'light');
});

test('unknown theme values cannot corrupt stored preference or temporary mode',()=>{
  const state=createThemeState('unsupported');
  assert.equal(state.choose('sunset'),false);
  assert.equal(state.override('system'),false);
  assert.deepEqual(state.snapshot(),{theme:'light',preference:'light',temporary:null});
  assert.equal(state.choose('dark'),true);
  assert.equal(state.value,'dark');
});
