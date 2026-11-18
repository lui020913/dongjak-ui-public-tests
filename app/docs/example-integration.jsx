// 적용 예제 - 실제 App.jsx / MapView.jsx 구조에 맞게 수정하세요.
// 기존 지도·버스·3D 건물 기능을 대체하지 않으며, 필요 부분만 추가합니다.

import {useEffect} from 'react';
import maplibregl from 'maplibre-gl';
import {installDongjakMapPatch,installDongjakPersistentUI} from './dongjak-map-patch.js';
import './dongjak-always-visible.css';

/*
 * 기존 JSX에서 ref 지정 예시:
 *   <header ref={headerRef}>...</header>
 *   <div ref={searchRef} className="search-box">...</div>
 *   <nav ref={sideNavRef}>...</nav>
 *   <div ref={rightToolsRef}>...</div>
 *   <div ref={bottomCardRef}>...</div>
 *
 * 기존 MapLibre map 객체를 이미 생성한 뒤, 아래 useEffect를 실행합니다.
 * busStopsGeoJSON은 서울시 정류소 데이터(위도,경도,정류소명,ARS ID)를 사용합니다.
 * buildingsGeoJSON은 이름이 포함된 건물 GeoJSON이 있다면 사용하고, 없으면 null.
 */
export function useDongjakMapPatch({map,headerRef,searchRef,sideNavRef,rightToolsRef,bottomCardRef,busStopsGeoJSON,buildingsGeoJSON}){
  useEffect(()=>{
    if(!map) return;
    const clearUI=installDongjakPersistentUI({
      map,header:headerRef?.current,search:searchRef?.current,
      sideNavigation:sideNavRef?.current,rightControls:rightToolsRef?.current,bottomCard:bottomCardRef?.current,
    });
    const clearMap=installDongjakMapPatch({
      map,maplibregl,busStops:busStopsGeoJSON,buildings:buildingsGeoJSON,
      useBaseBuildingSource:true,
      noryangjinFix:true,
      // 아래에는 실제 원본 노량진역 표시 레이어 ID를 기입해야 중복 표시가 사라집니다.
      replaceStationLayerIds:[],
      stationNameProperty:'name',
    });
    return()=>{clearMap();clearUI();};
  },[map,busStopsGeoJSON,buildingsGeoJSON]);
}
