/** Retired in v5.12.11. No DOM view or independent redraw loop. */
export const shouldProjectNightRoads=()=>false;
export const createNightRoadCanvas=()=>({isActive:()=>false,update(){},redraw(){}});
