import {containsDistrictPoint} from './district-building-scope.mjs';
import {partitionDisplayBuildings} from './building-display-detail.js';
import {partitionGreenReview} from './green-building-filter.js';
export function prepareBuildingTile(data,boundary,green){
 const {features,reviewCandidates,displayGeometries,successfulSources,totalSources,errors}=data;
 const districtBuildings=features.filter(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type)&&containsDistrictPoint(boundary,f.properties?.x,f.properties?.y));
 const {visible:eligible,excluded}=partitionDisplayBuildings(districtBuildings);
 const {visible,reviewExcluded}=partitionGreenReview(eligible,reviewCandidates,green);
 const within=visible.map(f=>({...f,geometry:displayGeometries.get(f)||f.geometry,properties:{...f.properties,_render3d:true}}));
 return {within,visible,excluded,reviewExcluded,successfulSources,totalSources,errors:errors.map(e=>({...e,error:String(e.error)}))};
}
