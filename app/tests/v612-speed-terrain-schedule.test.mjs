import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isScheduleMergedStation} from '../src/metro-schedule-view.js';
import {speedFeatureFilter,speedGeojsonStats,SPEED_COLORS} from '../src/sangdo-speed-map.js';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('terrain remains enabled regardless of map pitch or island view bounds',()=>{
  const main=read('src/main.js');
  const block=main.split('function syncAutomaticTerrain(_pitch) {')[1].split('function visibleBuilding2D(){')[0];
  assert.ok(block.includes("map.setTerrain({source:'dongjak-terrain-dem',exaggeration:1.0})"));
  assert.ok(!block.includes('pitch >')&&!block.includes('pitch <'));
  assert.ok(!block.includes('map.getBounds'));
  assert.ok(!block.includes('setTerrain(null)'));
  assert.doesNotMatch(main,/installSangdoSpeedMap\(/);
  assert.match(main,/installPriMap\(/);
});
test('Line 1 and Sillim retain independent live and timetable tabs',()=>{
  assert.equal(isScheduleMergedStation({kind:'subway',selectedLine:'1호선',lines:['1호선','9호선']}),false);
  assert.equal(isScheduleMergedStation({kind:'subway',selectedLine:'신림선',lines:['신림선','2호선']}),false);
  assert.equal(isScheduleMergedStation({kind:'subway',lines:['1호선','신림선']}),false);
  assert.equal(isScheduleMergedStation({kind:'subway',lines:['1호선','9호선']}),false);
  assert.equal(isScheduleMergedStation({kind:'subway',selectedLine:'9호선',lines:['1호선','9호선']}),false);
  assert.equal(isScheduleMergedStation({kind:'bus',lines:['1호선']}),false);
  const src=read('src/transport-map.js');
  assert.match(src,/hoursTab\.hidden=merged/);
  assert.match(src,/selectTransportMode\(preferredTransportView\)/);
  assert.match(read('src/speed-ui-and-scrollbar.css'),/data-schedule-merged="true"/);
});
test('GeoJSON speed overlay loads only real source records and supports filters',()=>{
  const geo=JSON.parse(read('public/data/road-speed/sangdo1_speed_links.geojson'));
  assert.equal(geo.type,'FeatureCollection');
  assert.equal(geo.features.length,206);
  assert.deepEqual(speedGeojsonStats(geo.features),{10:23,30:68,40:20,50:95});
  assert.deepEqual(speedFeatureFilter([10,40]),['in',['get','speed'],['literal',[10,40]]]);
  for(const feature of geo.features){
    assert.match(feature.properties.link_id,/^\d+$/);
    assert.ok(Object.hasOwn(SPEED_COLORS,feature.properties.speed));
    const visit=coords=>{
      if(typeof coords[0]==='number'){assert.ok(coords[0]>126&&coords[0]<128);assert.ok(coords[1]>37&&coords[1]<38);}
      else coords.forEach(visit);
    };
    visit(feature.geometry.coordinates);
  }
  assert.doesNotMatch(read('index.html'),/id="sangdo-speed-controls"/);
  assert.match(read('src/pri-map.js'),/speedRiskDisplay\(/);
  assert.match(read('src/speed-ui-and-scrollbar.css'),/scrollbar-color:#43666b #192f34/);
});
