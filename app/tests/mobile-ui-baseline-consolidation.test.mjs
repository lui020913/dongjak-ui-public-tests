import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const legacy=["v700-mobile-cleanup.css","v701-compact-info-panels.css","v702-ui-alignment.css","v703-ui-layout-tightening.css","v704-user-request-fixes.css","v705-integrated-ui.css","v706-walk-navigation.css","v707-responsive-metro-history.css","v708-floating-ux.css","v709-control-fixes.css","v710-exclusive-panels.css","v711-map-layout.css","v712-interaction-layout.css","v713-rail-scale.css","v714-map-first-layout.css","v715-mobile-polish.css","v716-standalone-edges.css","v718-facts-empty.css","v719-repair-ui.css","v720-ui-consistency.css","v721-overlay-interactions.css","v722-bottom-panels-ios-header.css","v723-navigation-and-panels.css","v724-final-layout.css","v727-ios-edge-and-safety-buttons.css","v728-exclusive-responsive.css"];
test('26 old version-stamped mobile stylesheets are physically retired',()=>{
 const source=read('src/main.js'),css=read('src/mobile-ui-baseline.css');
 assert.ok(source.includes("import './mobile-ui-baseline.css';"));
 assert.ok(source.indexOf("import './version-history-v7.css';")<source.indexOf("import './mobile-ui-baseline.css';"));
 assert.ok(source.indexOf("import './mobile-ui-baseline.css';")<source.indexOf("import './v815-map-product.css';"));
 assert.ok(source.indexOf("import './mobile-ui-baseline.css';")<source.indexOf("import './mobile-ui/current.css';"));
 let previous=-1;
 for(const name of legacy){
  assert.equal(existsSync(new URL('../src/'+name,import.meta.url)),false,name+' must not remain on disk');
  assert.equal(source.includes("import './"+name+"';"),false,name+' must not remain imported');
  const start=css.indexOf('/* BEGIN LEGACY '+name+' */');
  const end=css.indexOf('/* END LEGACY '+name+' */');
  assert.ok(start>previous&&end>start,name+' must retain original cascade order');
  previous=end;
 }
 assert.equal((css.match(/\/\* BEGIN LEGACY /g)||[]).length,26);
 assert.equal((css.match(/\/\* END LEGACY /g)||[]).length,26);
 assert.ok((css.match(/url\(/g)||[]).length>=5,'the v700 inline icons must remain intact');
 assert.ok(!/@import|@charset|@layer/.test(css),'all legacy CSS stays a plain ordered stylesheet');
});
test('new UI changes have only one canonical patch source, separate from historical baseline',()=>{
 const main=read('src/main.js'),readme=read('src/mobile-ui/README.md');
 assert.ok(main.includes("import './mobile-ui/current.css';"));
 assert.ok(readme.includes('mobile-ui-baseline.css'));
 assert.ok(readme.includes('mobile-ui/current.css'));
});
