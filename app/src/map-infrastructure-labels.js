/**
 * Adds Korean-first labels for named bus stops and road tunnels/underpasses
 * from the OpenFreeMap/OpenMapTiles vector source already used by the basemap.
 * No synthetic names or coordinates are generated.
 */
const nonEmptyName = [
  '!=',
  ['coalesce', ['get', 'name:nonlatin'], ['get', 'name:ko'], ['get', 'name'], ''],
  ''
];
const koreanFirstName = [
  'coalesce',
  ['get', 'name:nonlatin'],
  ['get', 'name:ko'],
  ['get', 'name']
];

function findVectorLayer(layers, sourceLayer, preferredId) {
  return layers.find(layer =>
    layer.id === preferredId && layer['source-layer'] === sourceLayer && layer.source
  ) || layers.find(layer => layer['source-layer'] === sourceLayer && layer.source);
}

function addLayerIfPossible(map, layer) {
  try {
    if (map.getLayer?.(layer.id)) return true;
    if (!map.getSource?.(layer.source)) return false;
    map.addLayer(layer);
    return true;
  } catch (error) {
    console.info('[지도 시설명 레이어] 추가하지 못했습니다:', layer.id, error?.message || error);
    return false;
  }
}

export function installBasemapInfrastructureLabels(map) {
  const styleLayers = map.getStyle?.()?.layers || [];
  const result = { busStops: false, tunnels: false };

  const poi = findVectorLayer(styleLayers, 'poi', 'poi_transit');
  if (poi) {
    result.busStops = addLayerIfPossible(map, {
      id: 'dj-basemap-bus-stop-names',
      type: 'symbol',
      source: poi.source,
      'source-layer': 'poi',
      minzoom: 15.0,
      filter: [
        'all',
        ['any',
          ['==', ['get', 'class'], 'bus'],
          ['==', ['get', 'subclass'], 'bus_stop'],
          ['==', ['get', 'subclass'], 'bus_station']
        ],
        nonEmptyName
      ],
      layout: {
        'symbol-placement': 'point',
        // Single bus-label renderer lives in transport-map.js; prevent duplicate labels.
        'visibility': 'none',
        'text-field': koreanFirstName,
        'text-font': ['Noto Sans Regular', 'Open Sans Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 15, 10.5, 17, 12, 19, 13.5],
        'text-anchor': 'top',
        'text-offset': [0, 1.05],
        'text-max-width': 11,
        'text-optional': true,
        'text-allow-overlap': true,
        'text-ignore-placement': true,
        'symbol-sort-key': ['case', ['==', ['get', 'subclass'], 'bus_stop'], 0, 1]
      },
      paint: {
        'text-color': '#18508e',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.5,
        'text-halo-blur': 0.2
      }
    });
  }

  const roadNames = findVectorLayer(styleLayers, 'transportation_name');
  if (roadNames) {
    result.tunnels = addLayerIfPossible(map, {
      id: 'dj-named-tunnel-underpass-labels',
      type: 'symbol',
      source: roadNames.source,
      'source-layer': 'transportation_name',
      minzoom: 14.4,
      filter: [
        'all',
        ['==', ['get', 'brunnel'], 'tunnel'],
        ['!=', ['get', 'class'], 'rail'],
        ['!=', ['get', 'class'], 'transit'],
        nonEmptyName
      ],
      layout: {
        'symbol-placement': 'line-center',
        'text-field': koreanFirstName,
        'text-font': ['Noto Sans Medium', 'Noto Sans Regular', 'Open Sans Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 14.4, 10.5, 16, 12, 18.5, 14],
        'text-max-width': 10,
        'text-keep-upright': true,
        'text-rotation-alignment': 'map',
        'text-pitch-alignment': 'viewport',
        'text-optional': true,
        'text-allow-overlap': true,
        'text-ignore-placement': true,
        'symbol-spacing': 520
      },
      paint: {
        'text-color': '#76543a',
        'text-halo-color': '#ffffff',
        'text-halo-width': 2,
        'text-halo-blur': 0.25
      }
    });
  }

  return result;
}
