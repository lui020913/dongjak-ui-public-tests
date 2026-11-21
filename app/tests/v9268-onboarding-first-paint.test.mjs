import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/v860-onboarding.js', import.meta.url), 'utf8');

test('first onboarding slide renders at full opacity without a redundant entering animation', () => {
  assert.match(source, /opened=true;render\(0,'next',false\);app\.dataset\.dj860OnboardingOpen='true'/);
  assert.match(source, /function render\(.*animate=true\)/);
  assert.match(source, /if\(animate\).*visualPane\.classList\.add\('dj860-entering'\)/);
});

test('subsequent slides retain their compositor-controlled outgoing fade', () => {
  assert.match(source, /render\(target,direction,false\)/);
  assert.match(source, /duration:280,easing:'cubic-bezier\(\.4,0,\.2,1\)'/);
});