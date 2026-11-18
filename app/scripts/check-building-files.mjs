import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {dirname} from 'node:path';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest=JSON.parse(await readFile(resolve(ROOT,'public/buildings/manifest.json'),'utf8'));
if(!Array.isArray(manifest.sheets) || manifest.sheets.length !== 8) {
  throw new Error('건물 manifest에 8개의 도엽이 없습니다.');
}
let base=0, supplement=0;
for(const sheet of manifest.sheets) {
  for(const [field,countName] of [['file','기본'],['supplement','보완']]) {
    const url=sheet[field];
    if(typeof url !== 'string' || !/^\/buildings\/[\w.-]+\.geojson$/.test(url)) {
      throw new Error(`${sheet.sheet}번 도엽 ${countName} 파일 경로가 없습니다: ${String(url)}`);
    }
    const data=JSON.parse(await readFile(resolve(ROOT,'public'+url),'utf8'));
    if(data.type!=='FeatureCollection' || !Array.isArray(data.features)) throw new Error(`${url} GeoJSON이 손상됐습니다.`);
    const expected=field==='file'?sheet.count:sheet.supplement_count;
    if(data.features.length!==expected)throw new Error(`${url} 도형수 불일치: ${data.features.length} / ${expected}`);
    console.log(`[확인] ${sheet.sheet}번 ${countName}: ${data.features.length.toLocaleString('ko-KR')}개`);
    if(field==='file') base+=data.features.length; else supplement+=data.features.length;
  }
}
console.log(`총 기존 건물 ${base.toLocaleString('ko-KR')}개, 보완 건물 ${supplement.toLocaleString('ko-KR')}개. 파일 구성 정상.`);
