import * as maplibregl from 'maplibre-gl';
import {installMapThemeZoomGuard} from './v862-map-theme-zoom-guard-core.js';

// Load before main.js. The guard observes MapLibre's existing event stream and
// never changes the map initializer, data sources or layer ownership.
if(typeof document!=='undefined'){
  installMapThemeZoomGuard({MapClass:maplibregl.Map,app:document.getElementById('app')});
}
