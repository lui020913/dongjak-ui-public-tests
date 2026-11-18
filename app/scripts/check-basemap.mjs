/** Local-only integrity check for the integrated CLEAN base-map edition. */
import {readFile,readdir,stat} from 'node:fs/promises';
import {resolve,dirname,extname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const errors=[];
const exists=async path=>{try{return (await stat(path)).isFile();}catch{return false;}};
const read=async path=>readFile(resolve(root,path),'utf8');
const required=[
  'package.json','index.html','src/main.js','src/base-layer-controls.js',
  'src/transport-map.js','src/style.css','src/building-assets.js',
  'src/fixed-rail-lines.js','src/station-accessibility.js',
  'server/transport-proxy.mjs','server/service-hours.mjs',
  'server/metro-timetable-common.mjs','public/buildings/manifest.json',
  'public/data/dongjak_roadwidth_estimated_202610.geojson'
];
for(const path of required)if(!await exists(resolve(root,path)))errors.push(`필수 파일 누락: ${path}`);
let base=0,supplement=0;
try{
  const manifest=JSON.parse(await read('public/buildings/manifest.json'));
  if(!Array.isArray(manifest.sheets)||manifest.sheets.length!==8)throw new Error('도엽 8개 조건 불일치');
  for(const sheet of manifest.sheets){
    for(const [key,expectedKey] of [['file','count'],['supplement','supplement_count']]){
      const path=`public${sheet[key]||''}`;
      if(!/^public\/buildings\/[\w.-]+\.geojson$/.test(path)||!await exists(resolve(root,path))){
        errors.push(`건물 데이터 누락: ${path}`);continue;
      }
      const size=(await stat(resolve(root,path))).size;
      if(size<100)errors.push(`건물 데이터 비정상 크기: ${path}`);
      if(key==='file')base+=Number(sheet[expectedKey]||0);
      else supplement+=Number(sheet[expectedKey]||0);
    }
  }
}catch(error){errors.push(`건물 목록 오류: ${error.message}`);}

// Check relative module references without contacting external APIs.
let scanned=0;
for(const dir of ['src','server','scripts']){
  const entries=await readdir(resolve(root,dir),{withFileTypes:true});
  for(const entry of entries){
    if(!entry.isFile()||!['.js','.mjs'].includes(extname(entry.name)))continue;
    const path=resolve(root,dir,entry.name);
    const content=await readFile(path,'utf8');scanned++;
    const matches=[...content.matchAll(/\b(?:from\s*|import\s*\()\s*['"](\.[^'"]+)['"]/g)];
    for(const m of matches){
      const target=resolve(dirname(path),m[1]);
      if(!await exists(target))errors.push(`모듈 누락: ${dir}/${entry.name} -> ${m[1]}`);
    }
  }
}
const html=await read('index.html');
for(const requiredId of ['id="map"','id="base-layer-controls"','id="transport-sheet"']){
  if(!html.includes(requiredId))errors.push(`지도 화면 요소 누락: ${requiredId}`);
}
console.log(`3D 건물 파일: 16종 (기본 ${base.toLocaleString('ko-KR')}개 + 보완 ${supplement.toLocaleString('ko-KR')}개 예상)`);
console.log(`JavaScript 모듈 참조 점검: ${scanned}개 파일`);
if(errors.length){for(const message of errors)console.error(`[실패] ${message}`);process.exitCode=1;}
else console.log('[정상] 건물 데이터 경로 · 지도 모듈 · 지도 UI 파일 확인. 실제 외부 API 응답은 별도 검증이 필요합니다.');
