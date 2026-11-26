import test from 'node:test';
import assert from 'node:assert/strict';
import {createTransportWindowLifecycle} from '../src/transport-window-lifecycle.js';

test('지도 클릭 한 번으로 창이 한 번만 열리고 닫히면 복구되지 않는다',()=>{
  let tick=1000;
  const manager=createTransportWindowLifecycle({now:()=>tick});
  const gesture={isTrusted:true};
  assert.equal(manager.beginOpen('subway:노들:9',{origin:'map',mapEvent:{originalEvent:gesture}}),true);
  assert.equal(manager.beginOpen('subway:노들:9',{origin:'map',mapEvent:{originalEvent:gesture}}),false);
  assert.equal(manager.dismiss(),true);
  assert.equal(manager.snapshot().status,'closed');
  assert.equal(manager.dismiss(),false);
  tick+=100;
  assert.equal(manager.beginOpen('subway:노들:9',{origin:'map',mapEvent:{originalEvent:{isTrusted:true}}}),false);
  assert.equal(manager.snapshot().status,'closed');
  tick+=701;
  assert.equal(manager.beginOpen('subway:노들:9',{origin:'map',mapEvent:{originalEvent:{isTrusted:true}}}),true);
});

test('닫은 직후에도 사용자가 명시적으로 선택한 즐겨찾기는 정상 실행',()=>{
  let tick=1000;
  const manager=createTransportWindowLifecycle({now:()=>tick});
  assert.equal(manager.beginOpen('bus:20190',{origin:'map'}),true);
  assert.equal(manager.dismiss(),true);
  assert.equal(manager.beginOpen('bus:20190',{origin:'saved'}),true);
  assert.equal(manager.beginOpen('bus:20190',{origin:'navigation'}),true);
});

test('지하철 호선 변경과 새 역 이동은 같은 패널에서 처리',()=>{
  const manager=createTransportWindowLifecycle();
  assert.equal(manager.beginOpen('subway:노량진:1',{origin:'map'}),true);
  assert.equal(manager.beginOpen('subway:노량진:1',{origin:'map'}),false);
  assert.equal(manager.beginOpen('subway:노량진:9',{origin:'navigation'}),true);
  assert.equal(manager.beginOpen('subway:노들:9',{origin:'navigation'}),true);
  assert.equal(manager.snapshot().key,'subway:노들:9');
});


test('교통정보 닫기 로직은 합성 버튼 클릭을 재전송하지 않는다',async()=>{
  const {readFile}=await import('node:fs/promises');
  const source=await readFile(new URL('../src/v806-unified-ui.js',import.meta.url),'utf8');
  const transport=await readFile(new URL('../src/transport-map.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/dispatchLocalClick\(element\('transport-close'\)/);
  assert.match(source,/node\.dispatchEvent\(new EventCtor\('dongjak:transport-dismiss'\)\)/);
  assert.match(transport,/bindReliablePopupClose\(closeButton,[\s\S]*?close\(true\)/);
  assert.match(transport,/if\(seq===closingSequence\)close\(true\)/);
  assert.match(transport,/closeInput\.reset\(\)/);
  assert.match(transport,/windowState\.beginOpen\(openKey,\{origin,refresh,mapEvent\}\)/);
});
