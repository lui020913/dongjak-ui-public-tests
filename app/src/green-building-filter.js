// District-wide greenery overlap audit 2026-11-26, artifact 15083118052.
// Source-specific row deltas and geometry checksum. Changed data fails open.
// Display only; this is not a demolition or occupancy register.
import {buildingFootprintMetrics,hasNamedBuilding} from './building-display-detail.js';
const encoded=`2:base 97 2012624577 rBtCN9CuDbBBlChEwGaOQozBECsJgJ1MBBBBQiBmB_BBxEBBDBwmBf_L9lBPBBBLK8GiLvHBBBBBBMOHBBBGBCBpEsJBe_HfHoJrD1fB2DFBBBBwBBBBHBBBgDxG8BXoE0D8BtCvD
2:supplement 141 3131243736 SbKODDGQgBNJMDVbEMUBCEGBFGPrBbJjBIUDGEFKXSSkBGBOdNEBFCFCCKCDQaJEJGCLLECDSFHJXHRMKBsBDjBDCGQaFDoBDDMkBBMQGbMLBgBPDMQNeRFUQCHUNGHCLkBLNGEnBBDbQLFSKKbKMJCC
3:base 119 1332765495 2BBBdzBBCDImBBBEBB4QvMBCCmC1C9DBVB1BfwD3IBCB8YpStBzBdCBHBBBoBvCBBBBBSHvBUEBLjCeLB_D0DXBBB7CbKFxBBFJIDBCBBBBBCBJBIpEHCDCGCj7BBMDBHgKJpCGChCiCBB1CUXBBDE
3:supplement 90 413623535 EVCJH7BhCMHMLNJHGlBKNHCwB3BB-B2DKDGlBIMK-FEKdURKOPhBF0BExBJNDbKIzBQMEgBsBXNRNBBSKHNKgBHDYGKECXF3BPDXGPX2DsBNJ
4:base 23 3218557687 AtFKCHNimCBmCCCBCEFDBBEBqEiE8Q
4:supplement 3 2794916923 CEB
5:base 166 2162496733 7VyNGwMqSBzgBjGBBB2OhBBBB7ChBGPBryClBBBCB2BCBrGBBXGBBBBBBBBBBBBqDvC1MyCBBBzCFBkD30D7CB0ISnvBBBBBBWBBBBBkBBDBBBBBBBBBBBBBBBBBBBgH_HrH4SgEzgBBoaDmBBRBBBBBBD2KBBCtIBB7GeCBBBBBBBBBBBBWB2DBBBBBBBBB5CQB1C0yBoCBBJBBlBlFCBhH
5:supplement 18 4015710167 ABBBDLECFFKJIFHBFF
6:base 54 922284295 jHB0xCyuC9DDBsHlDBoHBiEBtKzB3REJBBMiDjB8VBBBj9CDChCBlwEK3G7Bz4CBB8K5LBjFBVBB1EBC_KB4uB
6:supplement 245 2002053772 CDBCGBDBJCDRHCBCDECBBBKFBBEEBCLCLBFGBDDBCEBCEBBBGDIBBFHBECGBDCEDIBHEDDCCCHDDCDNCBCEBGBBBDBHGBBBFCCCTNHBCHDBEBEDBKBHBBBCDDBCDBIDBFBHBCEGDDCCRDHGBCCBBBFBIBDCBCCBBCBBCDCECODGFBDDECBCBEEKFDCBCDECFCCDCCCBCFEGECECDGFBBEBIDBFCCLFFBBDBBEBEEOCBDKKDBCCCDC
7:base 209 2597849460 HzBBoETle5OmaBDBBWBBBZBMBBIBkBD1BCMiB0FqBlEuHJBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBF3BP5DGBKBBNErCBBBCxDBBlBFBBBBBRiFiFhPBgXBBrxCTajBBhBzBCCWuNBvDB0nBBBeZ4D2GgaRZGiBFrkBHBB4GRUBBBBBBBBBBBBCBmDMdoL0BYqHC0EBBQeBLDHBBBBBBBBGGGBBBBgBQ8EBBiDCBBBBBBBBBBBBBLOZNuB
7:supplement 76 911714291 BEGHBIWSECBKSGCHEEMBLCGFPCBBBGCIEOPDGFMDGBEGMHHPBDCDHZPHEBFEKRDFiBIENNWCFKETE
8:base 38 3727954555 uHB8EBD9GxBe8RCB7DBTCBBBveB7Yt1GvoBnBtUBCkTiDJB3ORIBBUkzB
8:supplement 21 3095095695 DXPDIdEEiBdaRnCNFmCvBEvBBf`;
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function decode(data){let row=0,value=0,shift=0;const indices=[];for(const c of data){const n=alphabet.indexOf(c);value+=(n&31)*2**shift;if(n&32){shift+=5;}else{row+=value;indices.push(row);value=shift=0;}}return indices;}
const records=new Map(encoded.split('\n').map(line=>{const [key,n,checksum,data]=line.split(' ');return [key,{count:Number(n),checksum:Number(checksum),indices:decode(data)}];}));
export const GREEN_REVIEW_CANDIDATES=[...records.values()].reduce((n,r)=>n+r.count,0);
function geometryHash(g){let h=2166136261;function visit(a){if(!Array.isArray(a))return;if(typeof a[0]==='number'){for(const v of a.slice(0,2))h=Math.imul(h^Math.round(v*1e6),16777619)>>>0;}else for(const v of a)visit(v);}visit(g?.coordinates);return h;}
export function greenBuildingFilterEnabled(search=''){return new URLSearchParams(search).get('greenBuildingPreview')!=='0';}
export function collectGreenReviewCandidates(sheet,kind,features){const r=records.get(sheet+':'+kind);if(!r||r.indices.length!==r.count)return [];const matched=r.indices.map(i=>features[i]);if(matched.some(f=>!f?.geometry))return [];let h=2166136261;for(const f of matched)h=Math.imul(h^geometryHash(f.geometry),16777619)>>>0;return h===r.checksum?matched:[];}
export function isGreenProtected(f){const p=f?.properties||{};if(hasNamedBuilding(f)||p.amenity||p.office||p.healthcare||p.emergency||p.public_service||p.shop||p.tourism)return true;
 if(/^(school|university|hospital|civic|public|government|church|chapel|temple|mosque|train_station|transportation|fire_station|library|kindergarten)$/i.test(String(p.building||'')))return true;
 const levels=Number(p.floors??p['building:levels']??p.levels??(Number(p.h)/3));return (Number.isFinite(levels)&&levels>=2)||buildingFootprintMetrics(f?.geometry).area>150;}
export function partitionGreenReview(features,candidates,enabled=true){if(!enabled)return {visible:features,reviewExcluded:[]};const candidateSet=new Set(candidates),visible=[],reviewExcluded=[];for(const f of features)(candidateSet.has(f)&&!isGreenProtected(f)?reviewExcluded:visible).push(f);return {visible,reviewExcluded};}
