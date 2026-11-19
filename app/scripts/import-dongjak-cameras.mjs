#!/usr/bin/env node
/**
 * Build a deployable GeoJSON from an official nationwide camera CSV/GeoJSON.
 * Takes coordinates from original records only. No address geocoding.
 *
 * Usage:
 *   node scripts/import-dongjak-cameras.mjs "C:\\Downloads\\전국무인교통단속카메라표준데이터.csv"
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {cameraImportPreview} from '../src/sangdo-camera-import.js';
const source=process.argv[2];
if(!source){console.error('사용법: node scripts/import-dongjak-cameras.mjs "카메라원본.csv"');process.exit(1);}
try{
  const buf=await readFile(resolve(source));
  let text;
  try{text=new TextDecoder('utf-8',{fatal:true}).decode(buf);}
  catch{text=new TextDecoder('euc-kr').decode(buf);}
  const geo=cameraImportPreview(text,source);
  if(!geo.features.length)throw new Error('동작구 범위 내 위도·경도 좌표가 포함된 카메라를 찾지 못했습니다.');
  const dest=new URL('../public/data/road-speed/dongjak_enforcement_points.geojson',import.meta.url);
  await mkdir(dirname(dest.pathname),{recursive:true});
  await writeFile(dest,JSON.stringify(geo),'utf8');
  console.log(`동작구 단속카메라 좌표 ${geo.features.length}개 저장 완료: ${dest.pathname}`);
  console.log('다음: npm run build && npm run deploy:pages');
  console.log('주의: 원본 데이터 기준일, 현장 설치·운영 여부는 별도 검증이 필요합니다.');
}catch(error){console.error('가져오기 실패:',error.message);process.exitCode=1;}
