import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('ordinary map settings no longer expose the removed dark theme switch',()=>{
  const code=read('app/src/v7120-settings.js');
  assert.doesNotMatch(code,/id="dj-settings-theme"|q\('#dj-settings-theme'\)|getElementById\('theme-toggle'\)/);
  assert.doesNotMatch(code,/라이트·다크 테마를 변경합니다/);
  assert.match(code,/id="dj-settings-motion"/);
  assert.match(code,/id="dj-settings-weather"/);
  assert.match(code,/id="dj-settings-tools"/);
});

test('My Info is the only user-facing font size and weight owner',()=>{
  const mapSettings=read('app/src/v7120-settings.js');
  const myInfo=read('app/src/v834-my-info.js');
  assert.doesNotMatch(mapSettings,/id="dj-settings-text"|prefs\.text=/);
  assert.match(myInfo,/글자 크기·굵기/);
  assert.match(myInfo,/data-dj885-type="scale"/);
  assert.match(myInfo,/data-dj885-type="weight"/);
});

test('five-screen visual rules load at the tail of index stylesheet stack',()=>{
  const html=read('app/index.html');
  const source=read('app/src/phone-surface-consistency-20261123.css');
  const older=html.indexOf('/src/phone-six-issues.css');
  const newer=html.indexOf('/src/phone-surface-consistency-20261123.css');
  assert.ok(older>=0&&newer>older,'visual consistency stylesheet must follow legacy styles');
  for(const selector of ['#dj-map-settings','.dj885-type-choices','.dj-edition-history','.route-location-row','.community-toolbar']){
    assert.ok(source.includes(selector),'missing screen selector: '+selector);
  }
  assert.match(source,/@layer request-completion/);
  assert.doesNotMatch(source,/maplibregl|\.maplibre|#dj-pri-dialog/);
});
