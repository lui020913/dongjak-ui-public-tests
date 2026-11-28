import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(process.argv[2]||'.');
// The source tree now owns the former release overlay. Validate its presence; never rewrite or copy it.
for(const ext of ['css','js'])if(!readFileSync(resolve(root,'src/mobile-next.'+ext),'utf8').length)throw Error('Empty canonical mobile asset');
const core='src/v840-ui-core.js';
// TIP text now lives in the canonical core; don't overwrite shortened copy at build time.
const tipCore=readFileSync(resolve(root,core),'utf8');
for(const sentence of ['상단 레이어에서 지도 기능을 관리하세요.','레이어에서 행정동을 선택하세요.'])if(!tipCore.includes(sentence))throw Error('Canonical TIP copy missing: '+sentence);
for(const id of ['ped-tools-panel','djNext-layer-panel','djNext-permissions','dj854-weather-sheet'])if(!tipCore.includes("'"+id+"'"))throw Error('Canonical TIP surface missing: '+id);
console.log('Mobile next canonical source verified.');
