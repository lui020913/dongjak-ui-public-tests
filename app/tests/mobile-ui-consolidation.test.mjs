import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('one canonical current mobile patch replaces two versioned active CSS imports',()=>{
 const main=read('src/main.js'),css=read('src/mobile-ui/current.css');
 assert.ok(main.includes("import './mobile-ui/current.css';"));
 assert.equal(main.includes("import './v910-request-completion.css';"),false);
 assert.equal(main.includes("import './v914-mobile-ux-fixes.css';"),false);
 assert.equal(existsSync(new URL('../src/v910-request-completion.css',import.meta.url)),false);
 assert.equal(existsSync(new URL('../src/v914-mobile-ux-fixes.css',import.meta.url)),false);
 assert.ok(css.indexOf('BEGIN consolidated v910-request-completion.css')>=0);
 assert.ok(css.indexOf('BEGIN consolidated v914-mobile-ux-fixes.css')>css.indexOf('END consolidated v910-request-completion.css'));
 assert.ok(css.includes('#transport-sheet'));
 assert.ok(css.includes('.dj831-edge-blur'));
 assert.ok(main.indexOf("import './mobile-ui/current.css';")<main.indexOf("import './mobile-first-layout.css';"));
});
test('one JS module entry exposes UI coordinators without duplicate lifecycle code',()=>{
 const main=read('src/main.js'),source=read('src/mobile-ui/index.js');
 assert.ok(main.includes("from './mobile-ui/index.js'"));
 assert.ok(source.includes("from '../mobile-ui-coordinator.js'"));
 assert.ok(source.includes("from '../bottom-tab-navigation.js'"));
 assert.equal(main.includes("from './bottom-tab-navigation.js'"),false);
 assert.equal(main.includes("from './mobile-ui-coordinator.js'"),false);
});

test('future version-stamped CSS hotfixes cannot bypass the canonical current patch',()=>{
 const allowed=JSON.parse(read('src/mobile-ui/legacy-css-baseline.json')).files;
 const actual=readdirSync(new URL('../src/',import.meta.url)).filter(name=>/^v\\d{3,}[^/]*\\.css$/.test(name));
 const unreviewed=actual.filter(name=>!allowed.includes(name));
 assert.deepEqual(unreviewed,[],'Add current UI changes to mobile-ui/current.css instead of creating a versioned hotfix');
});
