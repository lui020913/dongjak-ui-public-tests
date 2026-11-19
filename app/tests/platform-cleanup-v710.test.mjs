import {historicalSnapshotTest} from './support/historical-snapshot-audit.mjs';
import {stripApprovedV825TransportUI} from './support/approved-v825-transport-ui.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {approvedProtectionHash} from './support/approved-walk-integration.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const path=p=>resolve(root,p);

test('legacy patch manifests and user-research raw data are not bundled with runtime source',()=>{
  const manifest=JSON.parse(readFileSync(path('docs/REMOVED_FILES_MANIFEST.json'),'utf8'));
  assert.ok(manifest.count>300);
  for(const file of ['analysis/protection-zone/results.zip','__test_orig.html','PATCH_MANIFEST.json',
    'APPLY_PATCH.cmd','fallback-only/src/map-direction.js'])assert.equal(existsSync(path(file)),false,file);
});
historicalSnapshotTest('common map and public tiles survive cleanup unchanged',()=>{
  const hashMap=JSON.parse(readFileSync(path('PC_MAP_PROTECTED_SHA256.json'),'utf8'));
  for(const key of ['src/main.js','src/style.css','src/map-startup-loader.js','src/transport-map.js']){
    assert.equal(createHash('sha256').update(key==='src/transport-map.js'?stripApprovedV825TransportUI(readFileSync(path(key),'utf8')):readFileSync(path(key))).digest('hex'),approvedProtectionHash(key,hashMap[key]));
  }
  assert.ok(existsSync(path('public/buildings/manifest.json')));
  assert.ok(existsSync(path('public/data/metro-accessibility-verified.geojson')));
  assert.ok(existsSync(path('docs/CHANGELOG_SEMVER_FULL.md')));
});
