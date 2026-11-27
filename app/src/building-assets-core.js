import {apartmentDisplayExclusions} from './completed-apartment-display.mjs';
import {applyBuildingDisplayTrims,loadBuildingDisplayTrimPack} from './building-display-road-trims.js';
import {collectGreenReviewCandidates} from './green-building-filter.js';
/**
 * 기존 국가기본도 + GIS건물통합정보 보완 데이터를 함께 불러옵니다.
 * 파일별 실패를 분리해 한 소스의 실패가 전체 도엽을 숨기지 않도록 합니다.
 * 이 모듈에는 API 키나 기기 권한이 필요하지 않습니다.
 */
export async function loadBuildingTileFeatures(sheet, fetchFn = globalThis.fetch, trimPack = undefined) {
  if (!sheet || typeof sheet.file !== 'string' || !sheet.file) {
    throw new Error('건물 도엽 파일 정보가 올바르지 않습니다.');
  }
  if (typeof fetchFn !== 'function') throw new Error('fetch 함수를 사용할 수 없습니다.');
  const sources = [{url:sheet.file,label:'기본 건물'}];
  if (typeof sheet.supplement === 'string' && sheet.supplement) {
    sources.push({url:sheet.supplement,label:'보완 건물'});
  }
  const results = await Promise.allSettled(sources.map(async (source) => {
    const response = await fetchFn(source.url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data?.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
      throw new Error('GeoJSON FeatureCollection 구조가 아닙니다.');
    }
    return data.features;
  }));
  // Keep test/custom loaders isolated; only the real static app loads the pack.
  const pack=trimPack===undefined&&fetchFn===globalThis.fetch?await loadBuildingDisplayTrimPack():trimPack;
  const displayGeometries=new Map();
  const features=[];
  const errors=[];
  const reviewCandidates=[];
  let successfulSources=0;
  for(let i=0;i<results.length;i++) {
    const result=results[i];
    if(result.status === 'fulfilled') {
      const excluded=apartmentDisplayExclusions(sheet.sheet,i===0?'base':'supplement',result.value);
      features.push(...result.value.filter(f=>!excluded.has(f)));
      reviewCandidates.push(...collectGreenReviewCandidates(sheet.sheet,i===0?'base':'supplement',result.value));
      for(const [feature,geometry] of applyBuildingDisplayTrims(sheet.sheet,i===0?'base':'supplement',sources[i].url,result.value,pack))displayGeometries.set(feature,geometry);
      successfulSources++;
    } else {
      errors.push({label:sources[i].label,url:sources[i].url,error:result.reason});
    }
  }
  if(successfulSources === 0) throw new Error('기본 건물과 보완 건물 데이터를 모두 불러오지 못했습니다.');
  return {features, reviewCandidates, displayGeometries, successfulSources, totalSources:sources.length, errors};
}
