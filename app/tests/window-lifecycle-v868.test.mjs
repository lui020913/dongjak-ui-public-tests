import test from 'node:test';
import assert from 'node:assert/strict';
import {createWindowLifecycle} from '../src/window-lifecycle-state.js';

test('button opens and X dismisses any surface without a simulated click',()=>{
  let time=10000;const m=createWindowLifecycle({now:()=>time});
  assert.equal(m.requestOpen('news-panel',{explicit:true}),true);
  m.dismiss('news-panel');
  assert.equal(m.requestOpen('news-panel',{origin:'automatic'}),false);
  assert.equal(m.snapshot('news-panel').phase,'closed');
  assert.equal(m.requestOpen('news-panel',{explicit:true}),true);
});
test('closed transit cannot resurrect as another sheet from the same touch',()=>{
  let time=1000;const m=createWindowLifecycle({now:()=>time});
  m.requestOpen('transport-sheet');m.dismiss('transport-sheet');
  assert.equal(m.requestOpen('overview-sheet'),false);
  assert.equal(m.requestOpen('maplibre-popup'),false);
  time+=700;
  assert.equal(m.requestOpen('overview-sheet'),true);
});
test('map popups and facilities share the same cooldown, explicit click reopens',()=>{
  let time=500;const m=createWindowLifecycle({now:()=>time});
  m.requestOpen('maplibre-popup',{explicit:true});m.dismiss('maplibre-popup');
  assert.equal(m.requestOpen('maplibre-popup'),false);
  assert.equal(m.requestOpen('detail-sheet',{explicit:true}),true);
});
test('auto welcome and login prompts open on first start',()=>{
  let time=0;const m=createWindowLifecycle({now:()=>time});
  for(const id of ['dj860-onboarding','dj-transit-signin-prompt','dj832-dongjak-boundary']){
    assert.equal(m.requestOpen(id),true);m.dismiss(id);time+=700;
  }
});
test('dismiss is idempotent and never schedules a re-open',()=>{
  const m=createWindowLifecycle();
  assert.equal(m.requestOpen('route-panel',{explicit:true}),true);
  assert.equal(m.dismiss('route-panel'),true);
  assert.equal(m.dismiss('route-panel'),false);
  assert.equal(m.snapshot('route-panel').phase,'closed');
});

test('switching surfaces is not mistaken for a user X gesture',()=>{
  let time=3000;const m=createWindowLifecycle({now:()=>time});
  assert.equal(m.requestOpen('route-panel',{explicit:true}),true);
  m.dismiss('route-panel',{global:false});
  assert.equal(m.requestOpen('participation-panel'),true);
});
