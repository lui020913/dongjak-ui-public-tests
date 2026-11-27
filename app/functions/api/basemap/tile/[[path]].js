import {serveDistrictRoadTile} from '../../../../server/district-road-tile.mjs';
export const onRequestGet=({request})=>serveDistrictRoadTile(request,{cache:globalThis.caches?.default});
