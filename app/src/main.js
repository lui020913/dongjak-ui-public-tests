import {installCommunityActivity} from './community-activity.js';
import {installImportantPlaceClick} from './important-place-click.js';
import {installParkInfoClick} from './park-info-click.js';
import {installFeaturedPlaceLabels} from './featured-place-labels.js';
import {installReadable3DLabels} from './readable-3d-labels.js';
import {installMobileMapControls} from './mobile-map-controls.js';
import {phoneProfile,installPhoneRenderBudget,offscreenEvictionIds} from './adaptive-phone-map-budget.mjs';
import {baseMapRecoveryDecision,BASE_STYLE_INITIAL_WAIT_MS} from './map-basemap-recovery.mjs';
import './adaptive-phone-map-budget.css';
import './button-material.css';
import './browser-install-menu.css';
import {installMobileLayoutCoordinator,installBottomTabNavigation} from './mobile-ui/index.js';
import {createMapStartupLoader} from './map-startup-loader.js';
import {installLandmarks} from './landmark-layer.js';
import {installNearbyPlaceLabels} from './nearby-place-labels.js';
import {installHangangBridgeLabels} from './hangang-bridge-labels.js';
import {installEducationLayer} from './education-layer.js';
import {installCivicFacilities} from './civic-facility-layer.js';
import {installApartmentLabels} from './apartment-labels.js';
import {initVersionHistory} from './version-history.js';
import * as maplibregl from 'maplibre-gl';
import {Capacitor, CapacitorHttp} from '@capacitor/core';
import {Geolocation} from '@capacitor/geolocation';
import './v910-cascade-order.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import './style.css';
import './map-patch/dongjak-integration.css';
import './map-patch/dongjak-v54-polish.css';
import './map-patch/dongjak-v55-mobile-fix.css';
import './map-patch/dongjak-v592-panel-search.css';
import './map-patch/dongjak-v593-ui-cleanup.css';
import './map-patch/dongjak-v594-layout-theme.css';
import './map-patch/dongjak-v595-pedestrian-tools.css';
import './map-patch/dongjak-v597-header-access.css';
import './map-patch/dj-v5911-place-polish.css';
import './layout-core.css';
import {installDongjakMapPatch} from './map-patch/dongjak-map-patch.js';
import {distanceMeters,makeRouteIndex,nearestOnRoute,splitRoute} from './navigation-geometry.js';
import {bearingDegrees,headingForCamera,shouldAutoReroute,offRouteThreshold,voiceCueKey,startNavigationCompass,signedHeadingDelta} from './navigation-experience.js';
import {installNavVoicePicker,applySelectedNavVoice} from './nav-voice-picker.js';
import {makeCommunityPost,updateCommunityLike,appendCommunityComment,formatCommunityDate,readCommunityPosts} from './community-store.js';
import {createCommunityComposerPortal} from './community-composer-portal.js';
import {installCommunityPushControl} from './community-push-client.js';
import {getActiveCloudClient} from './v824-favorites-cloud.js';
import {readSharedCommunity,publishCommunityPost,deleteSharedCommunityPost,setSharedCommunityLike,addSharedCommunityComment,isCommunitySignedIn,readCommunityNotifications,markCommunityNoticeRead,appealCommunityNotice,setSharedCommunityBookmark,reportSharedCommunity,readCommunityModerationStatus} from './community-cloud.js';
import {initPedestrianTools} from './pedestrian-tools.js';
import {fetchDongjakPedestrianVariants} from './dongjak-local-routing.js';
import {routeWithinDistrict} from './route-district-guard.mjs';
import {installDongjakOfficialDataLayers} from './dongjak-verified-data-layers.js';
import {installDongjakLiveTransit} from './features/liveTransit/integrate.js';
import './features/liveTransit/live-transit.css';
import './bus-route-detail.css';
import './dongjak-import-controls.css';
import {initTransportMap,closeTransportPanel,baseMapTransitPlace,subwayLineColor,searchCachedTransportPlaces,suppressNativeBusStopGlyphs} from './transport-map.js';
import {initStationAccessibility} from './station-accessibility.js';
import {searchPlaces,searchLocalPlaces} from './route-search.js';
import {cachedOfficialSearchPlaces,queryOfficialPlaces} from './seoul-official-facilities.js';
import {routeStationMatches,mergeRouteSearchResults,routeResultSubtitle} from './route-search-results.js';
import {walkingRouteViewportPadding} from './route-map-focus.js';
import {initMapQuickSearch} from './map-quick-search.js';
import './map-search-refinement.css';
import {installMapProduct} from './v815-map-product.js';
import {recentPlaces,recordRecentPlace,clearRecentPlaces,recentSearchQueries,recordSearchQuery} from './v815-place-store.js';
import {computeMultiStopRoutes} from './v815-route-planner.js';
import {VERIFIED_STATIONS} from './fixed-rail-data.js';
import {installRoadWidthLayer} from './road-width-layer.js';
import {installAdminDongLayer} from './admin-dong-layer.js';
import {installBaseLayerControls} from './base-layer-controls.js';
import {loadBuildingTileFeatures} from './building-assets.js';
import {nearestBuildingSheets} from './building-prewarm.js';
import {installSafetyLayers,installBridgeDeck} from './safety-layers.js';
import {installMapOrientationControls,installNeighborDistrictLabels,installDecorativeParkTrees} from './map-polish.js';
import {installGrassTexture,installForestShade,installBaseBuildingPalette,nightOcclusionBuildingPaint,buildingExtrusionAppearance,buildingFootprintPaint,buildingFootprintOutlinePaint,buildingPlanVisibility,buildingZoomOpacityExpression,BUILDING_ZOOM_FADE_START,BUILDING_ZOOM_FADE_END} from './map-appearance.js';
import {bufferedDistrictBounds} from './map-scope.js';
import {fallbackBoundary} from './fixed-rail-data.js';
import {isRoadDirectionSymbolLayer} from './map-direction.js';
import {preferKoreanBaseMapLabels} from './korean-labels.js';
import {installAdaptiveMapActions} from './adaptive-map-actions.js';
import {installScaleDocking} from './map-scale-docking.js';
import {installSafetyHomeGuard} from './safety-home-guard.js';
import {installViewportSafeMapPopups} from './map-popup-viewport.js';
import {installMapResumeRecovery} from './v875-map-resume.js';
import {createOutsideDistrictNotifier} from './dongjak-location-alert.js';
import {installMapImmersive} from './map-immersive.js';
import {installDistantHaze} from './distant-haze.js';
import {installNightVisibility,promoteNightAnalysisLayers} from './night-visibility-map.js';
import {installPriMap} from './pri-map.js';
import {installSolidMapLines} from './solid-map-lines.js';
import {evaluateCompositePriRouteCandidates} from './pri-route-client.js';
import './v841-route-and-tips.css';
import {slimMapTextHalos} from './map-label-halo.js';
import {installProtectionZoneMap} from './protection-zone-map.js';
import {installPolicyGapThreeSourceMap} from './policy-gap-3source-map-patch.js';
import {installSupabaseSafetyAi} from './v880-supabase-safety-ai.js';
import {installSangdoSpeedMap} from './sangdo-speed-map.js';
import {installBochaRoadLayer} from './bocha-road-layer.js';
import './bocha-road-layer.css';
import './protection-zone-map.css';
import './night-visibility.css';
import './safety-workspace.css';
import './night-visibility-panel.css';
import './v601-responsive.css';
import './v602-fixes.css';
import './v607-mobile-sheet.css';
import './v608-mobile-coordination.css';
import './v610-mobile-safety.css';
import './v613-map-ux.css';
import './v614-transport-compact.css';
import './metro-status-compact.css';
import './mobile-ui-v610.css';
import {updatePointAttachments,deletePointAttachments,
  checkPointAttachmentSelection,canPreviewPointImage,isPointImage} from './point-attachments.js';
import {initDongjakNews} from './dongjak-news.js';
import {installFloatingPanelUX} from './draggable-floats.js';
import './draggable-floats.css';
import './v611-registration-seam.css';
import './metro-sidepanel-20261110.css';
import './speed-ui-and-scrollbar.css';
import './version-history-v7.css';
import './mobile-ui-baseline.css';
import './v815-map-product.css';
import './v880-responsive-tap-guard.css';
import './v881-global-visual-system.css';
import './v881-mobile-ui.css';
import './v882-secondary-surface-polish.css';
import './v884-mobile-surface-fixes.css';
import './v884-mobile-search-keyboard.js';
import './v885-mobile-unified-layout.css';
import './v887-interaction-polish.css';
import './mobile-browser-layout.css';
import './mobile-browser-layout.js';
import './mobile-browser-webapp-tip.css';
import './mobile-browser-webapp-tip.js';
// Latest v8.8.9 gesture/controller fixes from the independently updated mobile branch.
import './v880-unified-sheet.css';
import './v889-mobile-visual-polish.css';
// Isolated portrait/tablet UI additions; keep the v8.9.1 mobile/HUD logic intact.

import './public-ui-production-overlay.css';
import './mobile-ui/current.css';
import './mobile-first-layout.css';
import './mobile-compact-transport-sheet.js';
import { installMobileSurfaceCoordinator } from './public-ui-mobile-surface-coordinator.js';
import { installRequestCompletion } from './v910-request-completion.js';
import {initWeatherWidget,initTheme,districtExteriorThemePaint,keepRegularMapText,filterCommercialPOI,clipBasemapLabelsToDistrict} from './ui-environment.js';
import {readManualThemeReload} from './manual-pwa-theme-reload.js';
import './mobile-ux-energy.css';
import './v929-phone-followup.js';
import './community-composer-portal.css';

// MapLibre v6 + Vite: 앞선 3D 실험판에서 검증한 웹 워커 설정을 사용합니다.
maplibregl.setWorkerUrl(workerUrl);

// Android APK에서는 Capacitor 위치 플러그인을 사용하며 PC에서는 브라우저 GPS를 사용합니다.
function hasLocationSupport() {
  return Capacitor.isNativePlatform() || Boolean(navigator.geolocation);
}
function errorLocationCode(error) {
  if (error?.code === 1 || String(error?.code) === 'OS-PLUG-GLOC-0003') return 1;
  if (error?.code === 3 || String(error?.code) === 'OS-PLUG-GLOC-0010') return 3;
  return 2;
}
function getDevicePosition(options={}) {
  if (Capacitor.isNativePlatform()) return Geolocation.requestPermissions().then(()=>Geolocation.getCurrentPosition(options));
  return new Promise((resolve,reject) => {
    if (!navigator.geolocation) return reject({code:2,message:'위치기능 미지원'});
    navigator.geolocation.getCurrentPosition(resolve,reject,options);
  });
}
async function startDeviceWatch(onPosition,onError,options={}) {
  if (Capacitor.isNativePlatform()) {
    const id=await Geolocation.watchPosition({
      ...options, interval:options.enableHighAccuracy?2000:5000, minimumUpdateInterval:options.enableHighAccuracy?1500:5000
    },(position,error)=>{
      if(error) onError(error);
      else if(position) onPosition(position);
    });
    return id;
  }
  if(!navigator.geolocation) throw new Error('위치기능 미지원');
  return navigator.geolocation.watchPosition(onPosition,onError,options);
}
function stopDeviceWatch(id) {
  if(id===null||id===undefined)return;
  if(Capacitor.isNativePlatform()) {
    Geolocation.clearWatch({id:String(id)}).catch(console.warn);
  } else navigator.geolocation?.clearWatch(id);
}

const DONGJAK_CENTER = [126.9494, 37.4987]; // [경도, 위도]
const PILOT_CENTER = [126.9530, 37.4960]; // 시범지역 개략 중심, 실제 조사 위치 아님
const BOUNDARY_URL = '/data/dongjak_sig_reference.geojson';
const BOUNDARY_UPSTREAM_FALLBACK_URL = 'https://raw.githubusercontent.com/KnellBalm/kr-admin-geojson/main/sig.geojson';
const STORAGE_KEY = 'dongjak_safety_navigation_v3'; // 이전 버전 자료와 분리
const CATEGORIES = ['전체','보행공간','교차로·시야','횡단시설','조명·시설물','기타'];
const COLORS = {'보행공간':'#e88737','교차로·시야':'#c35a73','횡단시설':'#3477c9','조명·시설물':'#8065bd','기타':'#798d83'};
const statusEl = document.getElementById('map-status');
const toastEl = document.getElementById('toast');
const overview = document.getElementById('overview-sheet');
const overviewHandle = document.getElementById('overview-sheet-handle');
const overviewToggle = document.getElementById('overview-sheet-toggle');
const overviewAdminClear = document.getElementById('overview-admin-clear');
const detail = document.getElementById('detail-sheet');
const editor = document.getElementById('entry-sheet');
const addButton = document.getElementById('toggle-add');
const addHint = document.getElementById('add-hint');
const form = document.getElementById('point-form');
const pointAttachmentInput = document.getElementById('point-attachment-input');
const pointAttachmentList = document.getElementById('point-attachment-list');
const detailAttachmentList = document.getElementById('detail-attachment-list');
let stagedPointFiles = [];
let existingPointFiles = [];
let removedPointFileIds = new Set();
let pointAttachmentLoadSeq = 0;
let detailAttachmentLoadSeq = 0;
let detailAttachmentObjectURLs = [];
let detailHeroObjectURL = null;

const app = document.getElementById('app');
app.dataset.tab = 'map'; // First entry always selects 안전지도 on PC and mobile.
// One shared bottom navigation is used at every viewport width.
installFloatingPanelUX();
initVersionHistory();

let toastTimeout;
let mapReady = false;
let is3D = false; // 지도 카메라 pitch에서 자동으로 계산되는 상태
let terrainAvailable = false;
let districtBuildingsReady = false;
// 건물 외곽은 사용자가 제공한 8개 국가기본도 건물 SHP로부터 생성합니다.
// 배경 지도 전체 3D 건물은 제거하며, 동작구 안 건물만 별도 GeoJSON으로 표시합니다.
const BUILDING_ZOOM_MIN = BUILDING_ZOOM_FADE_START;
const BUILDING_MANIFEST_URL = '/buildings/manifest.json';
let buildingManifest = null;
const loadedBuildingTiles = new Map();
const buildingLoading = new Set();
let buildingLoadTimer = null;
let building3DLastOpacity = -1;
let lastBuildingCount = 0;
let baseLayerControls=null;
let baseBuildingsVisible=true;

let overviewSheetState = 'expanded';
let overviewDrag = null;
let overviewWasManuallyToggled=false;
let overviewExplicitOpen=false;
// Empty demonstration data must not open an information panel covering the map.
// Registered places are actual user content; boundary selection is available from map options.
function hasSafetyOverviewContent(){return points.length>0;}
function showOverviewOnlyWithContent(){if(overview) overview.hidden=!hasSafetyOverviewContent();}

let gpsWatchId = null;
let gpsStarting = false;
let gpsFollow = true;
let gpsLastPosition = null;
let gpsLastAccuracy = 0;
const outsideDistrictAlert=createOutsideDistrictNotifier(()=>toast('현재 위치는 동작구가 아닙니다. 동작구 내 보행안전 정보 중심으로 제공됩니다.'));
const GPS_AUTO_KEY = 'dongjak_gps_tracking_optin_v1714';
// 구버전의 자동 위치 재개 기록 제거: 사용자가 위치 버튼을 눌렀을 때만 시작합니다.
try{localStorage.removeItem(GPS_AUTO_KEY);}catch{}

let boundaryGeometry = null;
let boundaryBounds = null;
let gpsMarker = null;
let pendingMarker = null;
let points = [];
let chosenLocation = null;
let openedPointId = null;
let editingPointId = null;
let addMode = false;
let activeFilter = '전체';
// 도보 경로 기능. 지도에 지점 찍기와 조사 지점 등록은 서로 다른 모드입니다.
let routePickMode = null; // 'start' | 'end' | null
let routeStart = null;
let routeEnd = null;
let routeResult = null;
let routeVariants = {standard:null,gentle:null};
// Early route/GPS presentation state: navigate('map') runs during startup,
// before the route presentation functions occur in the source file.
const NAV_GESTURE_NAMES=['dragPan','dragRotate','scrollZoom','doubleClickZoom','touchZoomRotate','touchPitch','boxZoom','keyboard'];
let savedNavGestureState=null;
let routePriVisuals=null;
let selectedRouteVariant = 'standard';
let routeStartMarker = null;
let routeEndMarker = null;
let routeRequestPending = false;
let routeWaypoints = [];
let routeProductTools = null;
let routeTransitCandidate = null;
let routeCandidateMarker = null;
let routeSearchTarget = null;
let routeSearchCandidate = null;
let routeSearchController = null;
let routeSearchSequence = 0;
// 실시간 GPS 도보 안내
let navMode = null; // 'gps' | null
let navWatchId = null;
let navMarker = null;
let navIndex = null;
let navProgress = 0;
let navFollow = true;
let navLastUpdateAt = 0;
let navArrived = false;
// v7.0.6: GPS 보행 내비게이션 — 기기 음성, 이동 방향, 이탈 재탐색(연속 표본 확인).
let navVoiceEnabled = false; // 사용자의 명시적 터치로만 켭니다.
let navHeadingUp = true;
let navCompass = null;
let navMovementHeading = NaN;
let navLastGps = null;
let navOffRouteSamples = 0;
let navLastOffRouteDistance = 0;
let navLastRerouteAt = -Infinity;
let navReroutePending = false;
let navRerouteController = null;
let navSessionToken = 0;
let navLastVoiceKey = '';
let navVoiceAvailable = typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance !== 'undefined';




function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toastEl.classList.remove('show'), 3400);
}
function status(message) { statusEl.textContent = message; }

function getOverviewSnapOffsets() {
  const height = overview?.offsetHeight || 0;
  const viewport = window.innerHeight || 760;
  // Wide screens can display a fuller panel; phones keep the map visible.
  const desktop = window.innerWidth >= 1080;
  const wide = window.innerWidth >= 700;
  // Desktop uses a compact disclosure card, not a translated draggable sheet.
  if(desktop)return {expanded:0,half:0,collapsed:0};
  const collapsedPeek = wide ? Math.min(190, Math.max(145, Math.round(viewport * 0.21))) : Math.min(150, Math.max(112, Math.round(viewport * 0.17)));
  const halfPeek = wide ? Math.min(340, Math.max(245, Math.round(viewport * 0.34))) : Math.min(285, Math.max(205, Math.round(viewport * 0.32)));
  return {
    expanded: 0,
    half: Math.max(0, height - halfPeek),
    collapsed: Math.max(0, height - collapsedPeek)
  };
}

function applyOverviewSheetState(nextState, options = {}) {
  if (!overview) return;
  // Only two useful states are needed for touch layouts: compact and content-fitted.
  // A third, artificially tall intermediate state created the empty white curtain.
  const validState = nextState === 'collapsed' ? 'collapsed' : 'expanded';
  overviewSheetState = validState;
  overview.dataset.sheetState = validState;
  overview.classList.toggle('dragging', Boolean(options.dragging));
  if (window.innerWidth < 1080) {
    overview.style.removeProperty('--sheet-offset');
    overview.style.removeProperty('--mobile-drag-height');
    overview.style.removeProperty('--mobile-drag-delta');
    app.dataset.overviewSheetState = validState;
  } else {
    overview.style.setProperty('--sheet-offset','0px');
    delete app.dataset.overviewSheetState;
  }
  if (overviewToggle) {
    const expanded = validState === 'expanded';
    overviewToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    overviewToggle.textContent = expanded ? '접기' : '더 보기';
  }
}

function syncOverviewSheetForViewport() {
  if (!overview || overview.hidden || app.dataset.tab !== 'map') return;
  applyOverviewSheetState(overviewSheetState);
}

function cycleOverviewSheetState() {
  overviewWasManuallyToggled=true;
  applyOverviewSheetState(overviewSheetState === 'collapsed' ? 'expanded' : 'collapsed');
}

// Administrative selection controls stay independent from the overview disclosure.
overviewAdminClear?.addEventListener('click',()=>document.getElementById('admin-dong-clear')?.click());
document.getElementById('open-admin-dongs-from-options')?.addEventListener('click',()=>{
  document.getElementById('open-admin-dongs')?.click();
  app.classList.remove('map-controls-open');
});
function initOverviewSheetInteraction() {
  if (!overview || !overviewHandle) return;
  overviewToggle?.addEventListener('click', cycleOverviewSheetState);
  window.addEventListener('resize',()=>{if(window.innerWidth>=1080&&!overviewWasManuallyToggled){overviewSheetState='expanded';syncOverviewSheetForViewport();}});
  const startDrag = event => {
    if (window.innerWidth >= 1080) return;
    if (event.button !== undefined && event.button !== 0) return;
    const pointerY = event.clientY ?? event.touches?.[0]?.clientY;
    if (!Number.isFinite(pointerY)) return;
    overviewDrag = {startY:pointerY, delta:0, startState:overviewSheetState};
    overview.classList.add('dragging');
    event.preventDefault();
  };
  const moveDrag = event => {
    if (!overviewDrag) return;
    const pointerY = event.clientY ?? event.touches?.[0]?.clientY;
    if (!Number.isFinite(pointerY)) return;
    // Do not stretch the sheet while it is still in collapsed state: its content
    // is hidden until the gesture ends, so increasing its height creates a huge blank region.
    overviewDrag.delta = pointerY - overviewDrag.startY;
    event.preventDefault();
  };
  const endDrag = () => {
    if (!overviewDrag) return;
    const {delta,startState} = overviewDrag;
    overviewDrag = null;
    overview.classList.remove('dragging');
    const state = delta < -36 ? 'expanded' : delta > 36 ? 'collapsed' : startState;
    applyOverviewSheetState(state);
  };
  overview.addEventListener('pointerdown', event => {
    if (event.target.closest('button,a,input,textarea,select,[role="button"]')) return;
    startDrag(event);
  });
  window.addEventListener('pointermove', moveDrag, {passive:false});
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  window.addEventListener('resize', syncOverviewSheetForViewport);
}

function keepMapLabelsUpright() {
  try {
    for (const layer of map.getStyle().layers) {
      if (layer.type !== 'symbol') continue;
      if(isRoadDirectionSymbolLayer(layer)){
        // Actual one-way direction remains defined by the underlying vector tiles.
        // Never override the icon/text rotation with viewport-based alignment.
        try{map.setLayoutProperty(layer.id,'symbol-placement','line');}catch{}
        for(const key of ['icon-pitch-alignment','icon-rotation-alignment','text-pitch-alignment','text-rotation-alignment']){
          try{map.setLayoutProperty(layer.id,key,'map');}catch{}
        }
        continue;
      }
      try { map.setLayoutProperty(layer.id, 'text-pitch-alignment', 'viewport'); } catch {}
      try { map.setLayoutProperty(layer.id, 'text-rotation-alignment', 'viewport'); } catch {}
      // 지명의 글자를 단위별로 잘라 줄바꿈하지 않습니다.
      try { if(map.getLayoutProperty(layer.id,'text-field'))map.setLayoutProperty(layer.id,'text-max-width',90); } catch {}
      try { map.setLayoutProperty(layer.id, 'icon-pitch-alignment', 'viewport'); } catch {}
      try { map.setLayoutProperty(layer.id, 'icon-rotation-alignment', 'viewport'); } catch {}
    }
  } catch (error) {
    console.warn('지도 라벨 정자세 적용 실패:', error);
  }
}

function thinNativeOnewayArrows() {
  // 기존 베이스맵의 실제 oneway 방향 판정은 건드리지 않고 화살표 간격만 줄입니다.
  // 도로 자체에 없는 방향 정보를 새로 만들어 표현하지 않습니다.
  for(const layer of map.getStyle().layers){
    if(layer.type!=='symbol')continue;
    const id=String(layer.id||'').toLowerCase();
    if(!/(oneway|one-way|direction-arrow|road-arrow|arrow.*road)/.test(id))continue;
    try { map.setLayoutProperty(layer.id,'symbol-spacing',280); }
    catch(error){ console.debug('[도로 화살표] 해당 레이어 간격을 변경할 수 없습니다.',layer.id,error); }
  }
}

function installParkNameLabels(map,boundaryGeometry){
  // Unify vegetation colors but keep recognizable park names from the same OSM base-map POIs.
  const base=map.getStyle().layers.find(l=>l['source-layer']==='poi'&&l.source);
  if(!base||map.getLayer('dongjak-park-names')||!boundaryGeometry)return;
  try{
    map.addLayer({id:'dongjak-park-names',type:'symbol',source:base.source,'source-layer':'poi',minzoom:12.4,
      filter:['all',['in',['get','class'],['literal',['park','garden','nature_reserve']]],['within',boundaryGeometry]],
      layout:{'text-field':['coalesce',['get','name:ko'],['get','name'],''],
        'text-size':['interpolate',['linear'],['zoom'],12.4,10.5,15.5,13],
        'text-font':['Noto Sans Regular','Open Sans Regular'],
        'text-allow-overlap':false,'text-max-width':18,'text-pitch-alignment':'viewport'},
      paint:{'text-color':'#346c45','text-halo-color':'#f1f8eb','text-halo-width':2.3}},base.id);
  }catch(error){console.debug('공원 이름 추가 레이어 생략',error);}
  document.getElementById('theme-toggle')?.addEventListener('click',()=>requestAnimationFrame(()=>{
    if(!map.getLayer('dongjak-park-names'))return;
    try{
      map.setPaintProperty('dongjak-park-names','text-color',app.dataset.theme==='dark'?'#c8eabf':'#346c45');
      map.setPaintProperty('dongjak-park-names','text-halo-color',app.dataset.theme==='dark'?'#20392f':'#f1f8eb');
    }catch{}
  }));
}


function hideGenericFacilityLabels() {
  try {
    let hidden = 0;
    for (const layer of map.getStyle().layers) {
      if (layer.type !== 'symbol') continue;
      const id = String(layer.id || '').toLowerCase();
      const sourceLayer = String(layer['source-layer'] || '').toLowerCase();
      const target = `${id} ${sourceLayer}`;
      const looksPoi = /poi|shop|retail|food|drink|restaurant|cafe|bar|commercial|service|tourism|hotel|leisure|entertainment|amenity/.test(target);
      const keepTransit = /bus|subway|station|rail|transit|transport|stop|platform/.test(target);
      const keepSafety = /hospital|clinic|pharmacy|police|fire|emergency|safety/.test(target);
      if (looksPoi && !keepTransit && !keepSafety) {
        map.setLayoutProperty(layer.id, 'visibility', 'none');
        hidden++;
      }
    }
    if (hidden) console.info(`[v17.6] 일반 생활시설 레이블 ${hidden}개 숨김`);
  } catch (error) {
    console.warn('생활시설 레이블 숨김 실패:', error);
  }
}

initOverviewSheetInteraction();
document.getElementById('overview-sheet-close')?.addEventListener('click',(event)=>{
  event.preventDefault();event.stopPropagation();
  overviewExplicitOpen=false;
  overview.hidden=true; // Closing must work even if the sheet was previously expanded.
  if(overviewDrag){overviewDrag=null;overview.classList.remove('dragging');}
});
// Never re-open the overview over an active night-visibility analysis.
// Several independent map navigation callbacks previously set hidden=false.
// This observer makes the exclusion invariant for ALL entry points.
function enforceExclusiveNightPanel(){
  if((app.dataset.sangdoNight==='on' || (!hasSafetyOverviewContent() && !overviewExplicitOpen)) && overview && !overview.hidden) overview.hidden=true;
}
const exclusiveNightPanelObserver=new MutationObserver(enforceExclusiveNightPanel);
exclusiveNightPanelObserver.observe(app,{attributes:true,attributeFilter:['data-sangdo-night']});
exclusiveNightPanelObserver.observe(overview,{attributes:true,attributeFilter:['hidden']});
enforceExclusiveNightPanel();
installAdaptiveMapActions({app,overview,actions:document.querySelector('.map-actions')});
requestAnimationFrame(() => applyOverviewSheetState(overviewSheetState));
const mapToolsToggle=document.getElementById('map-tools-toggle');
const mapSafetyToggle=document.getElementById('map-safety-toggle');
const mapSafetyBackdrop=document.getElementById('map-safety-backdrop');
const mapSafetyControls=document.getElementById('map-safety-controls');
const safetyMobileView=window.matchMedia('(max-width: 1079px), (min-width:1080px) and (max-width:1366px) and (pointer:coarse)');
const syncSafetyPresentation=()=>{
  const open=app.dataset.tab==='map'&&app.classList.contains('map-safety-open');
  mapSafetyToggle?.setAttribute('aria-expanded',String(open));
  if(mapSafetyToggle)mapSafetyToggle.textContent=open?'보행안전 닫기':'보행안전';
  if(!open&&app.classList.contains('dj-safety-peek'))app.classList.remove('dj-safety-peek');
  if(mapSafetyBackdrop)mapSafetyBackdrop.hidden=!(open&&safetyMobileView.matches&&!app.classList.contains('dj-safety-peek'));
  mapSafetyControls?.setAttribute('aria-hidden',String(!open));
};
const syncSafetyMenu=opened=>{
  if(!opened)app.classList.remove('dj-safety-peek');
  if(opened)app.classList.remove('map-controls-open');
  app.classList.toggle('map-safety-open',Boolean(opened));
  if(opened)document.getElementById('map-gesture-guide')?.setAttribute('hidden','');
  syncSafetyPresentation();
};
// Night mode and route tools may close the menu by changing the app class
// directly. Mirror those changes to the backdrop and accessibility state.
const safetyStateObserver=new MutationObserver(syncSafetyPresentation);
safetyStateObserver.observe(app,{attributes:true,attributeFilter:['class','data-tab']});
safetyMobileView.addEventListener?.('change',syncSafetyPresentation);
mapSafetyBackdrop?.addEventListener('click',()=>syncSafetyMenu(false));
syncSafetyPresentation();
const mapOptionsBackdrop=document.getElementById('map-options-backdrop');
const mobileWebappHelp=document.getElementById('mobile-webapp-help');
const syncMapOptions=expanded=>{
  if(expanded)document.getElementById('map-gesture-guide')?.setAttribute('hidden','');
  if(expanded)syncSafetyMenu(false);
  app.classList.toggle('map-controls-open',expanded);
  mapOptionsBackdrop.hidden=!expanded;
  mapToolsToggle?.setAttribute('aria-expanded',String(expanded));
  if(mapToolsToggle)mapToolsToggle.textContent='지도 옵션';
  if(!expanded)mobileWebappHelp.hidden=true;
};
const closeMapOptions=()=>syncMapOptions(false);
// v6.0.8: legacy handlers sometimes remove the open class directly (map
// click, search, route mode). Keep backdrop/ARIA in sync with that state.
const mobileOptionsStateObserver=new MutationObserver(()=>{
  const visible=app.dataset.tab==='map'&&app.classList.contains('map-controls-open');
  if(!visible&&app.classList.contains('map-controls-open'))app.classList.remove('map-controls-open');
  if(mapOptionsBackdrop)mapOptionsBackdrop.hidden=!visible;
  mapToolsToggle?.setAttribute('aria-expanded',String(visible));
  if(!visible&&mobileWebappHelp)mobileWebappHelp.hidden=true;
});
mobileOptionsStateObserver.observe(app,{attributes:true,attributeFilter:['class','data-tab']});
mapToolsToggle?.addEventListener('click',()=>{
  syncSafetyMenu(false);
  syncMapOptions(!app.classList.contains('map-controls-open'));
});
document.getElementById('map-options-mobile-close')?.addEventListener('click',closeMapOptions);
document.getElementById('map-options-desktop-close')?.addEventListener('click',closeMapOptions);
mapOptionsBackdrop?.addEventListener('click',closeMapOptions);
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&app.classList.contains('map-controls-open'))closeMapOptions();
});
mapSafetyToggle?.addEventListener('click',()=>{
  const opened=!app.classList.contains('map-safety-open');
  closeMapOptions();
  syncSafetyMenu(opened);
});
document.getElementById('map-safety-close')?.addEventListener('click',()=>syncSafetyMenu(false));
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&app.classList.contains('map-safety-open'))syncSafetyMenu(false);
});
new MutationObserver(()=>{
  if(app.dataset.tab!=='map'&&app.classList.contains('map-safety-open'))syncSafetyMenu(false);
}).observe(app,{attributes:true,attributeFilter:['data-tab']});

// 이전에 실제 3D 렌더링이 성공했던 OpenFreeMap Bright 스타일을 사용합니다.
const djPhone=window.matchMedia?.('(max-width:699px)')?.matches===true;
const djInitialBudget=phoneProfile({phone:djPhone,ua:navigator.userAgent,memory:navigator.deviceMemory,cores:navigator.hardwareConcurrency,saveData:Boolean(navigator.connection?.saveData)});
const djNormalPixelRatio=Math.min(djPhone?1.25:1.5, Math.max(1, Number(globalThis.devicePixelRatio)||1));
const themeReloadState=readManualThemeReload(window.sessionStorage);
const map = new maplibregl.Map({
  container: 'map',
  attributionControl:false,
  style: 'https://tiles.openfreemap.org/styles/bright',
  center: themeReloadState?.camera?.center||DONGJAK_CENTER,
  zoom: themeReloadState?.camera?.zoom??12.5,
  pitch: themeReloadState?.camera?.pitch??0,
  bearing: themeReloadState?.camera?.bearing??0,
  minZoom: 10,
  maxZoom: 19,
  // 동작구 경계 바깥 약 10km까지 카메라 이동을 제한합니다.
  maxBounds: bufferedDistrictBounds(fallbackBoundary.features[0].geometry),
  renderWorldCopies: false,
  maxPitch: 70,
  // Cap GPU raster size on high-DPI displays (2x DPR costs 4x pixels).
  pixelRatio: djInitialBudget==='economy'?1:djNormalPixelRatio,
  // Mobile multisampling is a substantial and permanent GPU cost; retain it on desktop only.
  canvasContextAttributes: { antialias: !djPhone && djInitialBudget!=='economy' }
});
// The extra compact (i) control duplicated the attribution link in Map Options.
// Keep source credits in '지도 옵션 > 지도 데이터 출처'; do not overlay the map.

installSolidMapLines(map);
const djRenderBudget=installPhoneRenderBudget({map,app,phone:djPhone,initial:djInitialBudget,normalRatio:djNormalPixelRatio});
installSupabaseSafetyAi({map,maplibregl,app});
installPriMap({map,maplibregl,app,restoreMode:themeReloadState?.priMode});
installMapResumeRecovery({map,app});
installViewportSafeMapPopups({map});
installMobileLayoutCoordinator({app,map});
// Initial loading screen waits for real map, boundary and transport setup.
// Timetable/news servers are deliberately not required for map readiness.
const startupLoader=createMapStartupLoader({map});
// Always keep the scale physically above the visible overview card.
installScaleDocking({map,app,overview});
// If the remote Bright style cannot load, keep a usable map rather than a blank screen.
// This is an emergency fallback only; ordinary navigation uses the original vector map.
let mapStyleRecovered=false;
app.dataset.djBasemapSource='loading';
// A slow cellular connection can take over twelve seconds to stream the
// OpenFreeMap vector style. Switching styles that early permanently replaces
// road, building, land-use and transit vector rendering with bare raster OSM.
const mapRecoveryStartedAt=Date.now();
let mapRecoveryTimer=0;
function checkBaseMapRecovery(){
  if(mapReady||mapStyleRecovered)return;
  let currentStyle=null;
  try{currentStyle=map.getStyle?.()||null;}catch{}
  const decision=baseMapRecoveryDecision({
    mapReady,alreadyRecovered:mapStyleRecovered,style:currentStyle,
    elapsedMs:Date.now()-mapRecoveryStartedAt
  });
  if(decision==='keep')return;
  if(decision==='wait'||decision==='wait-vector'){
    if(decision==='wait-vector'){
      app.dataset.djBasemapSource='vector-loading';
      status('벡터 기본지도 연결 중 · 원래 지도를 유지합니다');
    }
    mapRecoveryTimer=setTimeout(checkBaseMapRecovery,12000);
    return;
  }
  mapStyleRecovered=true;
  app.dataset.djBasemapSource='emergency-osm';
  status('기본지도 연결 실패 · 임시 지도를 표시합니다 (다시 연결하려면 새로고침)');
  try{
    map.setStyle({version:8,sources:{'osm-emergency':{
      type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize:256,attribution:'© OpenStreetMap contributors'
    }},layers:[{id:'osm-emergency-base',type:'raster',source:'osm-emergency'}]});
  }catch(error){app.dataset.djBasemapSource='error';console.error('[지도 기본 모드 전환 실패]',error);status('지도 로딩 실패 · 네트워크를 확인한 뒤 새로고침하세요');}
}
mapRecoveryTimer=setTimeout(checkBaseMapRecovery,BASE_STYLE_INITIAL_WAIT_MS);
const quickSearch=initMapQuickSearch({map,maplibregl,app,onPick:()=>{
  // Search is available in every app tab. Selecting a result must reveal the map.
  if(app.dataset.tab!=='map')navigate('map');
  closeMapOptions();
  if(!overview.hidden)applyOverviewSheetState('collapsed');
}});
const immersiveChrome=installMapImmersive({
  map,app,restoreButton:document.getElementById('map-chrome-restore'),
  canHide:()=>!addMode&&!routePickMode&&!communityPickMode&&detail.hidden&&editor.hidden&&
    document.getElementById('transport-sheet')?.hidden!==false,
  onRestore:()=>requestAnimationFrame(syncOverviewSheetForViewport)
});
const visualTheme = initTheme({map,app});
// Theme changes now update MapLibre + UI in place. Do not reload the PWA.

initWeatherWidget({
  getPosition: () => getDevicePosition({enableHighAccuracy:false,timeout:12000,maximumAge:120000}),
  onMessage:toast
});
map.on('error', (e) => {
  const message = e.error?.message || e.message || '알 수 없는 지도 오류';
  console.error('[동작하는 안전지도] 지도 오류:', e.error || e);
  if (!mapReady) status('기본지도 연결 오류 · 네트워크를 확인해 주세요.');
  else if (/Failed to fetch|fetch|HTTP|network/i.test(message)) toast('일부 지도 데이터 연결에 문제가 있습니다.');
});

// DEM은 지형 높이 정보입니다. 지형이 준비되지 않았더라도 3D 건물 기능은 사용할 수 있습니다.
// v9: 2D/3D는 별도 모드가 아닙니다. 사용자가 지도를 기울이면 3D 건물이 나타납니다.
// 지도 조작 제스처로만 기울기를 변경합니다. 슬라이더와 모드 버튼은 사용하지 않습니다.
const PITCH_BUILDING_START = 10;
const PITCH_BUILDING_FULL = 30;
// v6.2: 지형을 기울기에 따라 setTerrain(null)로 해제하면 높이 정보가
// 평면/입체를 반복하며 사라집니다. 기울기 0°에서도 DEM 소스를 유지합니다.
// 이전 버전의 화면 경계(한강 인근) 기반 해제도 제거합니다.
// DEM 오류 시에만 2D 기본지도를 유지하고, 건물 3D는 별도 처리합니다.
let terrainEnabled = false;
let terrainErrorNotified = false;
let lastBuildingOpacity = -1;
let lastPitchStatus = '';
let movementIsSlow=false;
let djBuildingBatchBusy=false;
let lastFootprintPaintKey='';
function syncAutomaticTerrain(_pitch) {
  if(!mapReady || !terrainAvailable || terrainEnabled)return;
  try {
    map.setTerrain({source:'dongjak-terrain-dem',exaggeration:1.0});
    terrainEnabled=true;
  }catch(error){
    console.error('[동작하는 안전지도] 고정 지형 적용 실패:',error);
    terrainAvailable=false;
    terrainEnabled=false;
    if(!terrainErrorNotified){
      terrainErrorNotified=true;
      toast('지형 높이 데이터를 적용하지 못했습니다. 3D 건물은 계속 이용할 수 있습니다.');
    }
  }
}

function visibleBuilding2D(){
  // Loaded layers remain visible across the threshold; minzoom and paint
  // expressions smoothly fade them rather than flipping visibility on zoomend.
  return baseBuildingsVisible && mapReady && Boolean(boundaryGeometry);
}
function visibleBuilding3D(){
  return baseBuildingsVisible && !movementIsSlow && mapReady && Boolean(boundaryGeometry) && map.getPitch() >= PITCH_BUILDING_START;
}
function syncTiltWithBuildings() {
  if (!mapReady) return;
  const pitch=map.getPitch();
  is3D=pitch>=PITCH_BUILDING_START;
  const show=visibleBuilding3D();
  const theme=visualTheme.currentTheme();
  const appearance=nightOcclusionBuildingPaint(
    buildingExtrusionAppearance(theme,pitch,PITCH_BUILDING_START,PITCH_BUILDING_FULL),
    app.dataset.sangdoNight==='on'&&theme==='dark');
  const {opacity,color}=appearance;
  // At most one footprint-paint update per ~2 degrees instead of a full
  // setPaintProperty on every mousemove/pitch event for *every* GIS tile.
  const steppedPitch=Math.round(pitch/2)*2;
  const fillVisible=visibleBuilding2D() && (movementIsSlow || buildingPlanVisibility(pitch)>0);
  const paintKey=`${theme}/${steppedPitch}/${fillVisible}/${movementIsSlow}`;
  const updateFootprint=paintKey!==lastFootprintPaintKey;
  const footprint=updateFootprint?{...buildingFootprintPaint(theme,steppedPitch),
    ...(movementIsSlow?{'fill-opacity':0.65}:{})}:null;
  if(footprint)footprint['fill-opacity']=buildingZoomOpacityExpression(footprint['fill-opacity']);
  lastFootprintPaintKey=paintKey;
  for(const info of loadedBuildingTiles.values()){
    if(info.footprintFillId && map.getLayer(info.footprintFillId)){
      const desired=fillVisible?'visible':'none';
      if(map.getLayoutProperty(info.footprintFillId,'visibility')!==desired)
        map.setLayoutProperty(info.footprintFillId,'visibility',desired);
      if(updateFootprint && footprint){
        for(const [key,value] of Object.entries(footprint)){
          if(map.getPaintProperty?.(info.footprintFillId,key)!==value)
            map.setPaintProperty(info.footprintFillId,key,value);
        }
      }
    }
    if(info.footprintLineId && map.getLayer(info.footprintLineId) &&
        map.getLayoutProperty(info.footprintLineId,'visibility')!=='none')
      map.setLayoutProperty(info.footprintLineId,'visibility','none');
    if(!map.getLayer(info.layerId))continue;
    const desired=show?'visible':'none';
    if(map.getLayoutProperty(info.layerId,'visibility')!==desired)
      map.setLayoutProperty(info.layerId,'visibility',desired);
    if(show && (Math.abs(opacity-(info.lastOpacity??-1))>0.045 || info.lastColor!==color)){
      map.setPaintProperty(info.layerId,'fill-extrusion-opacity',buildingZoomOpacityExpression(opacity));
      map.setPaintProperty(info.layerId,'fill-extrusion-color',color);
      info.lastOpacity=opacity;info.lastColor=color;
    }
  }
  if (show) building3DLastOpacity=opacity;
  syncAutomaticTerrain(pitch);
  if (visibleBuilding2D()) scheduleBuildingLoad();
  let message = !baseBuildingsVisible
    ? '3D 건물 표시 꺼짐 · 지도 표시 설정에서 다시 켤 수 있습니다'
    : pitch < PITCH_BUILDING_START
      ? '평면 지도 · 기울이면 건물이 입체로 나타납니다'
    : !boundaryGeometry
      ? '입체 지도 · 동작구 행정경계 불러오는 중'
      : map.getZoom() < BUILDING_ZOOM_MIN
        ? '입체 지도 · 건물을 보려면 조금 더 확대해 주세요'
        : `입체 지도 · 건물 ${lastBuildingCount.toLocaleString()}동 표시 중`;
  if (message !== lastPitchStatus && boundaryGeometry) { status(message);lastPitchStatus=message; }
}

// Night analysis changes the 3D building opacity to prevent bright roads
// showing through translucent roofs. Restore normal opacity when turned off.
new MutationObserver(()=>{
  // The night analysis requires the original building occlusion even mid-gesture.
  if(app.dataset.sangdoNight==='on')movementIsSlow=false;
  syncTiltWithBuildings();
}).observe(app,{attributes:true,attributeFilter:['data-sangdo-night']});

function intersects(a,b){return a[0]<=b[2]&&a[2]>=b[0]&&a[1]<=b[3]&&a[3]>=b[1];}
function getVisibleBBox(){
  const b=map.getBounds(), minX=b.getWest(),maxX=b.getEast(),minY=b.getSouth(),maxY=b.getNorth();
  const dx=Math.min(0.012,(maxX-minX)*0.15),dy=Math.min(0.009,(maxY-minY)*0.15);
  return [minX-dx,minY-dy,maxX+dx,maxY+dy];
}
function scheduleBuildingLoad(){
  if (!visibleBuilding2D() || map.getZoom()<BUILDING_ZOOM_MIN || djBuildingBatchBusy || (djPhone&&map.isMoving?.())) return;
  clearTimeout(buildingLoadTimer);
  buildingLoadTimer=setTimeout(()=>{loadVisibleBuildingSheets().catch(err=>console.warn('건물 타일 표시 오류:',err));},230);
}
async function ensureBuildingManifest(){
  if(buildingManifest)return buildingManifest;
  const resp=await fetch(BUILDING_MANIFEST_URL);
  if(!resp.ok)throw new Error(`건물 목록 ${resp.status}`);
  const data=await resp.json();
  if (!Array.isArray(data.sheets))throw new Error('건물 타일 목록이 손상되었습니다.');
  buildingManifest=data;
  return data;
}
// 좁고 비정상적으로 작은 건물 외곽은 시설물일 가능성이 있어 3D에 표시하지 않습니다.
// 확정적 건물 판정은 아니며 건축물 전체를 제거하는 기준이 아닙니다.
export function shouldRender3DBuilding(geometry){
  const coords=geometry?.coordinates;
  if(!Array.isArray(coords))return false;
  const ring=geometry.type==='Polygon'?coords[0]:geometry.type==='MultiPolygon'?coords[0]?.[0]:null;
  if(!Array.isArray(ring)||ring.length<4)return false;
  const origin=ring[0];
  if(!Array.isArray(origin))return false;
  const latScale=111320,lngScale=111320*Math.cos(origin[1]*Math.PI/180);
  let xMin=Infinity,xMax=-Infinity,yMin=Infinity,yMax=-Infinity,twiceArea=0;
  for(let i=0;i<ring.length;i++){
    const [lng,lat]=ring[i];
    const x=(lng-origin[0])*lngScale,y=(lat-origin[1])*latScale;
    const [nextLng,nextLat]=ring[(i+1)%ring.length];
    const nextX=(nextLng-origin[0])*lngScale,nextY=(nextLat-origin[1])*latScale;
    xMin=Math.min(xMin,x);xMax=Math.max(xMax,x);
    yMin=Math.min(yMin,y);yMax=Math.max(yMax,y);
    twiceArea+=x*nextY-nextX*y;
  }
  const area=Math.abs(twiceArea)*0.5;
  const shortSide=Math.min(xMax-xMin,yMax-yMin);
  return area>=8 && !(area<28 && shortSide<2.5);
}
// v17.12: 기존 국가기본도와 GIS건물 보완 GeoJSON을 모두 로딩합니다.

async function loadOneBuildingSheet(sheet){
  if(loadedBuildingTiles.has(sheet.sheet)||buildingLoading.has(sheet.sheet))return;
  buildingLoading.add(sheet.sheet);
  try {
    const {features, successfulSources, totalSources, errors}=await loadBuildingTileFeatures(sheet);
    for(const problem of errors) console.warn(`[동작하는 안전지도] ${sheet.sheet}번 ${problem.label} 로딩 실패:`,problem.error);
    if(!boundaryGeometry)return;
    // Tile-native buildings are incomplete in parts of Sangdo 1-dong. The
    // supplied base+supplement GIS footprints must also be available overhead.
    const within=features.filter(f=>Number.isFinite(f.properties?.x)&&Number.isFinite(f.properties?.y)&&
      isDongjak(f.properties.x,f.properties.y)===true&&['Polygon','MultiPolygon'].includes(f.geometry?.type))
      .map(f=>({...f,properties:{...f.properties,_render3d:shouldRender3DBuilding(f.geometry)}}));
    const sourceId=`dongjak-buildings-data-${sheet.sheet}`;
    const layerId=`dongjak-buildings-3d-${sheet.sheet}`;
    const footprintFillId=`dongjak-buildings-footprint-${sheet.sheet}`;
    const footprintLineId=`dongjak-buildings-outline-${sheet.sheet}`;
    map.addSource(sourceId,{type:'geojson',data:{type:'FeatureCollection',features:within}});
    const buildingStyle=nightOcclusionBuildingPaint(
      buildingExtrusionAppearance(visualTheme.currentTheme(),map.getPitch()),
      app.dataset.sangdoNight==='on'&&visualTheme.currentTheme()==='dark');
    const footprintStyle=buildingFootprintPaint(visualTheme.currentTheme(),map.getPitch());
    footprintStyle['fill-opacity']=buildingZoomOpacityExpression(footprintStyle['fill-opacity']);
    const outlineStyle=buildingFootprintOutlinePaint(visualTheme.currentTheme(),map.getPitch());
    const firstSymbol=map.getStyle().layers.find(l=>l.type==='symbol')?.id;
    map.addLayer({id:footprintFillId,type:'fill',source:sourceId,minzoom:BUILDING_ZOOM_MIN,
      layout:{visibility:visibleBuilding2D() && buildingPlanVisibility(map.getPitch())>0?'visible':'none'},paint:footprintStyle},firstSymbol);
    map.addLayer({id:footprintLineId,type:'line',source:sourceId,minzoom:BUILDING_ZOOM_MIN,
      layout:{visibility:'none'},paint:outlineStyle},firstSymbol);
    map.addLayer({id:layerId,type:'fill-extrusion',source:sourceId,
      filter:['==',['get','_render3d'],true],minzoom:BUILDING_ZOOM_MIN,
      layout:{visibility:visibleBuilding3D()?'visible':'none'},
      paint:{'fill-extrusion-color':buildingStyle.color,'fill-extrusion-opacity':buildingZoomOpacityExpression(buildingStyle.opacity),
        'fill-extrusion-height':['interpolate',['linear'],['zoom'],BUILDING_ZOOM_FADE_START,0,BUILDING_ZOOM_FADE_END,['get','h']],
        'fill-extrusion-base':0}
    },firstSymbol);
    loadedBuildingTiles.set(sheet.sheet,{layerId,footprintFillId,footprintLineId,count:within.length,sourceCount:successfulSources});
    lastBuildingCount=[...loadedBuildingTiles.values()].reduce((sum,t)=>sum+t.count,0);
    building3DLastOpacity=-1;
    syncTiltWithBuildings();
    // A newly loaded 3D sheet must never cover the active night analysis roads.
    if(app.dataset.sangdoNight==='on')promoteNightAnalysisLayers(map);
    console.info(`[동작하는 안전지도] ${sheet.sheet}번 도엽: 기본+보완 건물 ${within.length.toLocaleString()}개, 소스 ${successfulSources}/${totalSources}개 로딩`);
  }catch(error){console.warn(`[동작하는 안전지도] ${sheet.sheet}번 건물 데이터 오류:`,error);}
  finally{buildingLoading.delete(sheet.sheet);}
}
// Avoid fetching all 112,000+ building footprints at startup. Loading only the
// closest tiles while the browser is idle removes much of the initial 3D-tilt
// hitch without delaying the 2D basemap or exhausting mobile memory.
let initialBuildingWarmupScheduled=false;
function scheduleInitialBuildingWarmup(){
  if(initialBuildingWarmupScheduled||!boundaryGeometry||!mapReady||!baseBuildingsVisible||djRenderBudget.isEconomy())return;
  initialBuildingWarmupScheduled=true;
  const run=async()=>{
    if(!boundaryGeometry||!baseBuildingsVisible)return;
    try{
      const manifest=await ensureBuildingManifest();
      const center=map.getCenter();
      const narrow=window.innerWidth<800 || window.matchMedia?.('(pointer:coarse)')?.matches;
      const nearby=nearestBuildingSheets(manifest,[center.lng,center.lat],narrow?2:4);
      // Every sheet is separately parsed/installed; schedule the next sheet on
      // another idle task instead of janking the first interactive map frame.
      for(const sheet of nearby){
        if(!baseBuildingsVisible)return;
        await new Promise(resolve=>{
          if(typeof requestIdleCallback==='function')requestIdleCallback(resolve,{timeout:2200});
          else setTimeout(resolve,350);
        });
        if(!map.getStyle?.()?.layers?.length)return;
        await loadOneBuildingSheet(sheet);
      }
    }catch(error){console.info('[3D 건물 사전 준비] 요청 시 재시도 가능:',error?.message);}
  };
  if(typeof requestIdleCallback==='function')requestIdleCallback(()=>void run(),{timeout:1800});
  else setTimeout(()=>void run(),900);
}
function djTrimOffscreenBuildings(sheets){
  if(!djRenderBudget.isEconomy()||app.dataset.sangdoNight==='on'||map.isMoving?.())return;
  const visible=sheets.map(s=>s.sheet);
  for(const id of offscreenEvictionIds([...loadedBuildingTiles.keys()],visible,2)){
    const info=loadedBuildingTiles.get(id),sourceId='dongjak-buildings-data-'+id;
    if(!info||buildingLoading.has(id))continue;
    const owned=[info.footprintFillId,info.footprintLineId,info.layerId];
    if(map.getStyle().layers.some(l=>l.source===sourceId&&!owned.includes(l.id)))continue;
    try{for(const layerId of owned)if(map.getLayer(layerId))map.removeLayer(layerId);
      if(map.getSource(sourceId))map.removeSource(sourceId);
      loadedBuildingTiles.delete(id);
    }catch(error){console.debug('[건물 캐시 정리]',error?.message);}
  }
  lastBuildingCount=[...loadedBuildingTiles.values()].reduce((sum,t)=>sum+t.count,0);
}
async function loadVisibleBuildingSheets(){
  if(!visibleBuilding2D()||map.getZoom()<BUILDING_ZOOM_MIN||djBuildingBatchBusy||(djPhone&&map.isMoving?.()))return;
  djBuildingBatchBusy=true;
  let interrupted=false;
  try{
    const manifest=await ensureBuildingManifest();
    if(!visibleBuilding2D()||map.getZoom()<BUILDING_ZOOM_MIN)return;
    const bbox=getVisibleBBox();
    const sheets=manifest.sheets.filter(s=>intersects(s.bbox,bbox));
    djTrimOffscreenBuildings(sheets);
    for(const sheet of sheets){
      if(!visibleBuilding2D()||(djPhone&&map.isMoving?.())){interrupted=true;break;}
      if(loadedBuildingTiles.has(sheet.sheet)){
        const old=loadedBuildingTiles.get(sheet.sheet);loadedBuildingTiles.delete(sheet.sheet);loadedBuildingTiles.set(sheet.sheet,old);continue;
      }
      await loadOneBuildingSheet(sheet);
      if(djPhone&&getVisibleBBox().some((v,i)=>Math.abs(v-bbox[i])>0.000001)){interrupted=true;break;}
      if(djRenderBudget.isEconomy())await new Promise(r=>setTimeout(r,0));
    }
  }finally{djBuildingBatchBusy=false;if(interrupted)scheduleBuildingLoad();}
}
map.on('moveend',scheduleBuildingLoad);
map.on('zoomend',()=>{syncTiltWithBuildings();});
// Do not delete 3D globally. If sustained frame intervals exceed 45ms during
// a mouse drag, temporarily draw the lightweight 2D footprints and restore
// 3D immediately at moveend. Normal-speed moves retain full buildings.
let interactiveMoving=false,slowSamples=0,lastFrameStamp=0;
map.on('movestart',()=>{interactiveMoving=true;slowSamples=0;lastFrameStamp=0;});
map.on('render',()=>{
  if(!interactiveMoving||movementIsSlow||!baseBuildingsVisible||app.dataset.sangdoNight==='on'||map.getPitch()<PITCH_BUILDING_START)return;
  const now=performance.now();
  if(lastFrameStamp){
    const interval=now-lastFrameStamp;
    if(interval>(djRenderBudget.isEconomy()?28:45) && interval<320)slowSamples++;
    else if(interval<=40)slowSamples=Math.max(0,slowSamples-1);
    if(slowSamples>=(djRenderBudget.isEconomy()?3:7)){
      // Preserve desktop 3D while dragging; only phones may trade 3D for FPS.
      if(window.matchMedia?.('(max-width:699px)')?.matches){movementIsSlow=true;syncTiltWithBuildings();}
      else slowSamples=0;
    }
  }
  lastFrameStamp=now;
});
map.on('moveend',()=>{
  interactiveMoving=false;slowSamples=0;lastFrameStamp=0;
  if(movementIsSlow){movementIsSlow=false;syncTiltWithBuildings();}
});

// 우클릭/Control+드래그 및 두 손가락 기울이기 조작을 명시적으로 활성화합니다.
map.dragRotate.enable();
map.touchPitch.enable();
map.on('pitch',syncTiltWithBuildings);
// Repaint the added GIS 2D footprint/outline sources when theme changes.
document.getElementById('theme-toggle')?.addEventListener('click',()=>requestAnimationFrame(syncTiltWithBuildings));
function gotoDongjak(){
  if (boundaryBounds) map.fitBounds(boundaryBounds,{padding:{top:160,bottom:255,left:26,right:26},maxZoom:13,duration:800,pitch:0,bearing:0});
  else map.flyTo({center:DONGJAK_CENTER,zoom:12.5,pitch:0,bearing:0,duration:700});
}
document.getElementById('center-dongjak').addEventListener('click',gotoDongjak);
// 위치 권한은 앱 시작 시 갑자기 요청하지 않습니다. 처음 사용자가 GPS를 눌렀을 때만 권한을 요청합니다.
// 사용자가 추적을 허용한 뒤에는 지도를 사용하는 동안 watchPosition으로 위치가 계속 갱신됩니다.
function renderGpsStatus(active){
  const btn=document.getElementById('current-location');
  btn?.classList.toggle('gps-active',active);
  btn?.setAttribute('aria-label',active?'현재 위치 추적 중 · 누르면 내 위치로':'내 위치 자동 추적 시작');
  btn?.setAttribute('title',active?'내 위치로 이동 · 추적 중':'내 위치 추적 시작');
  const stop=document.getElementById('stop-gps-tracking');
  if(stop)stop.hidden=!active;
}
function onGpsPosition(position){
  const coords=position?.coords;
  if(!coords||!Number.isFinite(coords.latitude)||!Number.isFinite(coords.longitude))return;
  const lng=coords.longitude,lat=coords.latitude;
  gpsLastPosition=[lng,lat];
  gpsLastAccuracy=Number(coords.accuracy)||0;
  outsideDistrictAlert.check(lng,lat,boundaryGeometry,gpsLastAccuracy);
  if(!gpsMarker){
    const marker=document.createElement('div');marker.className='dj-current-position-marker';
    marker.setAttribute('aria-label','현재 GPS 위치');
    const pulse=document.createElement('span');pulse.className='dj-current-position-pulse';
    marker.append(pulse);
    gpsMarker=new maplibregl.Marker({element:marker,anchor:'center',pitchAlignment:'viewport',rotationAlignment:'viewport'}).setLngLat([lng,lat]).addTo(map);
  }
  else gpsMarker.setLngLat([lng,lat]);
  if(gpsFollow && mapReady && app.dataset.tab==='map'){
    const center=map.getCenter();
    const deltaMeters=Math.hypot((lng-center.lng)*111195*Math.cos(lat*Math.PI/180),(lat-center.lat)*111195);
    // GPS noise alone must not trigger a 450ms animated WebGL repaint every fix.
    if(deltaMeters>15||map.getZoom()<15.5)map.easeTo({center:[lng,lat],zoom:Math.max(map.getZoom(),15.5),duration:450});
  }
  renderGpsStatus(true);
}
function stopGpsTracking({forget=false}={}){
  if(gpsWatchId!==null)stopDeviceWatch(gpsWatchId);
  gpsWatchId=null;gpsStarting=false;
  if(forget){try{localStorage.removeItem(GPS_AUTO_KEY);}catch{}}
  renderGpsStatus(false);
}
async function startGpsTracking({manual=false}={}){
  if(!hasLocationSupport()){
    if(manual)toast('이 기기에서 위치정보를 사용할 수 없습니다.');
    return;
  }
  gpsFollow=true;
  if(gpsWatchId!==null){
    if(gpsLastPosition)map.flyTo({center:gpsLastPosition,zoom:Math.max(map.getZoom(),16),duration:650});
    return;
  }
  if(gpsStarting)return;
  gpsStarting=true;
  if(manual)toast('위치 권한을 확인하고 계속 추적합니다.');
  try{
    const id=await startDeviceWatch(onGpsPosition,error=>{
      const code=errorLocationCode(error);
      if(code===1){stopGpsTracking({forget:true});toast('위치 권한이 거부되었습니다. 설정에서 허용해 주세요.');}
      else if(manual)toast('GPS 신호가 약합니다. 야외에서 다시 확인해 주세요.');
    },{enableHighAccuracy:false,timeout:20000,maximumAge:15000});
    gpsWatchId=id;
  }catch(error){
    gpsStarting=false;
    if(errorLocationCode(error)===1)stopGpsTracking({forget:true});
    if(manual)toast('GPS 추적을 시작하지 못했습니다. 위치 권한을 확인해 주세요.');
    return;
  }
  gpsStarting=false;renderGpsStatus(true);
}
document.getElementById('current-location').addEventListener('click',()=>startGpsTracking({manual:true}));
document.getElementById('stop-gps-tracking')?.addEventListener('click',()=>{
  stopGpsTracking({forget:true});gpsFollow=false;toast('위치 추적을 중지했습니다.');
});
map.on('dragstart',()=>{gpsFollow=false;});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){if(gpsWatchId!==null)stopGpsTracking();}
});


function asFeature(geometry, properties={}) {return {type:'Feature',properties,geometry};}
function allRings(geometry) {
  return geometry.type==='Polygon' ? [geometry.coordinates[0]] : geometry.coordinates.map(p=>p[0]);
}
// v12: 동작구 바깥 2D 지도는 유지하지만 동작구 외부 입체 건물은 표시하지 않습니다. 배경지도와 도로는 서울 전역에 표시됩니다.
function signedArea(ring){
  let n=0;
  for(let i=0;i<ring.length-1;i++) n+=(ring[i][0]*ring[i+1][1] - ring[i+1][0]*ring[i][1]);
  return n;
}
function closed(ring){
  const a=ring.map(([x,y])=>[x,y]);
  if (a.length>0 && (a[0][0]!==a.at(-1)[0] || a[0][1]!==a.at(-1)[1])) a.push([...a[0]]);
  return a;
}
function maskOutside(geometry){
  // 행정경계의 외곽 링을 세계 폴리곤의 '구멍'으로 만듭니다.
  const outer = [[-179,-85],[179,-85],[179,85],[-179,85],[-179,-85]];
  const outerSign=Math.sign(signedArea(outer));
  const holes = allRings(geometry).map(r=>{
    const hole=closed(r);
    return Math.sign(signedArea(hole))===outerSign ? hole.reverse() : hole;
  });
  return asFeature({type:'Polygon',coordinates:[outer,...holes]});
}
function computeBounds(geometry){
  let left=180,bottom=90,right=-180,top=-90;
  for(const ring of allRings(geometry)){
    for(const [lng,lat] of ring){
      left=Math.min(lng,left);right=Math.max(lng,right);bottom=Math.min(lat,bottom);top=Math.max(lat,top);
    }
  }
  return [[left,bottom],[right,top]];
}
async function loadDongjakBoundary(){
  try{
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(),12000);
    let response;
    try {
      try {
        response=await fetch(BOUNDARY_URL,{signal:controller.signal});
        if(!response.ok)throw new Error('Cached Dongjak boundary HTTP '+response.status);
      }catch(localError){
        // A missing local asset must never turn into an unbounded reload.
        // Recover from the same upstream source that shipped before this fix.
        console.warn('동작구 경계 로컬 자료 확인 실패, 원본 조회:',localError?.message);
        response=await fetch(BOUNDARY_UPSTREAM_FALLBACK_URL,{signal:controller.signal});
      }
    }
    finally {clearTimeout(timer);}
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    const features=(await response.json()).features;
    const feature=features.find(f=>f?.properties?.SIG_KOR_NM==='동작구' || f?.properties?.FULL_NM==='서울특별시 동작구');
    if(!feature?.geometry)throw new Error('동작구 행정경계가 없습니다.');
    boundaryGeometry=feature.geometry;
    app.dataset.djBoundaryReady='true';
    boundaryBounds=computeBounds(boundaryGeometry);
    if(gpsLastPosition)outsideDistrictAlert.check(...gpsLastPosition,boundaryGeometry,gpsLastAccuracy);
    // 다운로드한 실제 경계 기준 + 10km까지 지도 이동 범위 갱신.
    map.setMaxBounds(bufferedDistrictBounds(boundaryGeometry));
    // 동작구 밖 원본 시설명은 가리되, 추가 자치구 라벨은 별도 심벌로 표시합니다.
    clipBasemapLabelsToDistrict(map,boundaryGeometry);
    // 건물은 검증된 원본 벡터 타일을 유지합니다. 별도 지리 필터로 건물을 누락시키지 않습니다.
    // 참고: 동작구 외부 3D 건물을 완전히 숨기는 문제는 아직 미해결입니다.
    districtBuildingsReady=true;
    syncTiltWithBuildings();
    scheduleBuildingLoad();
    // Warm nearby building layers on idle even when the initial camera is flat
    // or too far out to meet the normal on-demand building visibility gate.
    scheduleInitialBuildingWarmup();

    // v17: 동작구 외부를 회색 65% 마스크로 시각적으로 구분합니다. 실제 지도 및 도로 데이터는 유지합니다.
    // 밝은 영역은 지도 데이터 삭제나 화면 자르기가 아니라 선택적 시각적 강조입니다.
    installParkNameLabels(map,boundaryGeometry);
    map.addSource('district-exterior',{type:'geojson',data:maskOutside(boundaryGeometry)});
    map.addLayer({id:'district-exterior-fade',type:'fill',source:'district-exterior',
      paint:districtExteriorThemePaint(visualTheme.currentTheme())},'registered-points-halo');
    visualTheme.refresh();
    map.addSource('district-outline',{type:'geojson',data:feature});
    map.addLayer({id:'district-border-halo',type:'line',source:'district-outline',
      layout:{'line-cap':'round','line-join':'round'},
      paint:{'line-color':'rgba(255,255,255,0.96)','line-width':12.5,'line-opacity':matchMedia('(max-width:699px)').matches?0.42:0.92,'line-blur':4.2}});
    map.addLayer({id:'district-border',type:'line',source:'district-outline',
      layout:{'line-cap':'round','line-join':'round'},
      paint:{'line-color':'#0f7f73','line-width':3.35,'line-opacity':0.96}});
    baseLayerControls?.apply();
    map.on('pitch',()=>{
      const pitch=map.getPitch();
      // 측면에서 지표면 경계선이 가늘어지는 현상을 보완합니다(수직 벽 모델은 아님).
      if(map.getLayer('district-border'))map.setPaintProperty('district-border','line-width',2.6+pitch/28);
      if(map.getLayer('district-border-halo'))map.setPaintProperty('district-border-halo','line-width',10.5+pitch/18);
    });
    installNeighborDistrictLabels(map,features,boundaryBounds,isDongjak);
    status('동작구 경계 적용 · 지도를 기울이면 건물과 지형이 나타납니다');
    syncTiltWithBuildings();
    // 첫 화면에서 동작구의 전체 윤곽이 잘 보이도록 자동 줌합니다.
    if(!sessionStorage.getItem('dongjak_integrated_seen')) {
      gotoDongjak();
      sessionStorage.setItem('dongjak_integrated_seen','1');
    }
  }catch(error){
    app.dataset.djBoundaryReady='error';
    console.warn('경계 로드 실패:',error);
    status('지도 사용 가능 · 동작구 경계 연결 실패');
    toast('행정경계를 받지 못했습니다. 인터넷 연결을 확인해 주세요.');
  }
}

// [경도, 위도] 점이 실제 동작구 경계 안에 있는지 확인합니다.
function pointInRing(lng,lat,ring){
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const xi=ring[i][0],yi=ring[i][1],xj=ring[j][0],yj=ring[j][1];
    if ((yi>lat)!==(yj>lat) && lng<(xj-xi)*(lat-yi)/(yj-yi)+xi) inside=!inside;
  }
  return inside;
}
function pointInPolygon(lng,lat,rings){
  return rings.length>0 && pointInRing(lng,lat,rings[0]) && !rings.slice(1).some(r=>pointInRing(lng,lat,r));
}
function isNearDongjakBoundary(lng,lat,thresholdMeters=175){
  if(!boundaryGeometry || !Number.isFinite(lng) || !Number.isFinite(lat))return false;
  const polys=boundaryGeometry.type==='Polygon'?[boundaryGeometry.coordinates]:(boundaryGeometry.coordinates||[]);
  const mx=111320*Math.cos(lat*Math.PI/180),my=111320;
  let closest=Infinity;
  for(const rings of polys){
    for(const ring of rings){
      for(let i=1;i<ring.length;i++){
        const a=ring[i-1],b=ring[i];
        const ax=(a[0]-lng)*mx,ay=(a[1]-lat)*my;
        const bx=(b[0]-lng)*mx,by=(b[1]-lat)*my;
        const dx=bx-ax,dy=by-ay;
        const t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1)));
        closest=Math.min(closest,Math.hypot(ax+t*dx,ay+t*dy));
        if(closest<=thresholdMeters)return true;
      }
    }
  }
  return false;
}
function isDongjak(lng,lat){
  if(!boundaryGeometry) return null;
  if(boundaryGeometry.type==='Polygon') return pointInPolygon(lng,lat,boundaryGeometry.coordinates);
  return boundaryGeometry.coordinates.some(rings=>pointInPolygon(lng,lat,rings));
}

function pointCollection(){
  const filtered=points.filter(p=>activeFilter==='전체'||p.category===activeFilter);
  return {type:'FeatureCollection',features:filtered.map(p=>asFeature({type:'Point',coordinates:[p.lng,p.lat]}, {pointId:p.id,category:p.category}))};
}
function drawPoints(){
  const visible=points.filter(p=>activeFilter==='전체'||p.category===activeFilter);
  document.getElementById('points-count').textContent=activeFilter==='전체'?`등록 ${points.length}곳`:`${visible.length} / 전체 ${points.length}곳`;
  const filterResult=document.getElementById('filter-result');
  filterResult.textContent=activeFilter==='전체'?`전체 ${points.length}곳 표시`:`${activeFilter} · ${visible.length}곳 표시`;
  filterResult.style.display=points.length?'':'none';
  if(!hasSafetyOverviewContent())overview.hidden=true;
  const source=map.getSource('registered-points');
  if(source) source.setData(pointCollection());
}
function setFilter(value){
  activeFilter=CATEGORIES.includes(value)?value:'전체';
  for (const el of document.querySelectorAll('[data-filter]')){
    const selected=el.dataset.filter===activeFilter;
    el.classList.toggle('selected',selected);
    el.setAttribute('aria-pressed',String(selected));
  }
  drawPoints();
}
for(const button of document.querySelectorAll('[data-filter]')) button.addEventListener('click',()=>setFilter(button.dataset.filter));

function photoValid(value){return typeof value==='string' && /^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(value);}
function readPoints(){
  try{
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
    if(Array.isArray(saved)) points=saved.filter(p=>p&&typeof p.id==='string'&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&typeof p.title==='string')
      .map(p=>({...p,photo:photoValid(p.photo)?p.photo:null}));
  }catch(error){console.warn('지점 로딩 실패:',error);toast('저장된 지점을 불러오지 못했습니다.');}
  drawPoints();
}
function writePoints(){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(points));return true;}
  catch(error){console.error('저장 실패:',error);toast('브라우저 저장공간이 부족하거나 차단됐습니다.');return false;}
}

// Files selected in the point registration/editor stay in memory until Save.
// Only on Save do their Blobs enter device-local IndexedDB (never Cloudflare).
function resetPointFileDraft() {
  ++pointAttachmentLoadSeq;
  stagedPointFiles = [];
  existingPointFiles = [];
  removedPointFileIds = new Set();
  if(pointAttachmentInput) pointAttachmentInput.value = '';
  renderPointFileDraft();
}
function pointFileSizeLabel(size) {
  return size >= 1048576 ? `${(size / 1048576).toFixed(1)}MB` : `${Math.max(1,Math.round(size / 1024))}KB`;
}
function createPointFileRow(file, onRemove, {download=false}={}) {
  const row=document.createElement('div');row.className='point-file-row';
  const name=document.createElement('span');name.className='point-file-name';name.textContent=file.name;name.title=file.name;
  const type=document.createElement('small');type.textContent=`${isPointImage(file)?'사진':'문서'} · ${pointFileSizeLabel(file.size)}`;
  const info=document.createElement('div');info.className='point-file-info';info.append(name,type);
  row.append(info);
  const action=document.createElement('button');action.type='button';action.className='point-file-action';
  if(download){
    action.textContent='저장';action.setAttribute('aria-label',`${file.name} 내려받기`);
    action.addEventListener('click',()=>{
      const url=URL.createObjectURL(file.blob);
      const a=document.createElement('a');a.href=url;a.download=file.name;
      document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
    });
  }else{
    action.textContent='×';action.setAttribute('aria-label',`${file.name} 첨부 취소`);
    action.addEventListener('click',onRemove);
  }
  row.append(action);
  return row;
}
function renderPointFileDraft(){
  if(!pointAttachmentList)return;
  pointAttachmentList.replaceChildren();
  const retained=existingPointFiles.filter(file=>!removedPointFileIds.has(file.id));
  if(!retained.length&&!stagedPointFiles.length){
    const empty=document.createElement('p');empty.className='point-file-empty';empty.textContent='선택한 파일이 없습니다.';
    pointAttachmentList.append(empty);
    return;
  }
  for(const file of retained) pointAttachmentList.append(createPointFileRow(file,()=>{
    removedPointFileIds.add(file.id);renderPointFileDraft();
  }));
  for(const [index,file] of stagedPointFiles.entries()) pointAttachmentList.append(createPointFileRow(file,()=>{
    stagedPointFiles.splice(index,1);renderPointFileDraft();
  }));
}
pointAttachmentInput?.addEventListener('change',()=>{
  const next=Array.from(pointAttachmentInput.files||[]);
  pointAttachmentInput.value='';
  if(!next.length)return;
  try{
    checkPointAttachmentSelection(existingPointFiles,[...stagedPointFiles,...next],removedPointFileIds);
    stagedPointFiles.push(...next);renderPointFileDraft();
  }catch(error){toast(error.message||'첨부파일을 확인해 주세요.');}
});
async function loadPointFileDraft(pointId){
  resetPointFileDraft();
  if(!pointId)return;
  const sequence=pointAttachmentLoadSeq;
  try{
    const files=await getPointAttachments(pointId);
    if(sequence!==pointAttachmentLoadSeq||editingPointId!==pointId)return;
    existingPointFiles=files;renderPointFileDraft();
  }catch(error){toast(`기존 첨부파일을 읽지 못했습니다: ${error.message}`);}
}
function revokeDetailAttachmentObjectURLs(){
  for(const url of detailAttachmentObjectURLs)URL.revokeObjectURL(url);
  detailAttachmentObjectURLs=[];
  if(detailHeroObjectURL){URL.revokeObjectURL(detailHeroObjectURL);detailHeroObjectURL=null;}
}
async function renderDetailPointFiles(point){
  const sequence=++detailAttachmentLoadSeq;
  revokeDetailAttachmentObjectURLs();
  detailAttachmentList.replaceChildren();
  const counter=document.getElementById('detail-attachment-count');
  counter.textContent='';
  try{
    const files=await getPointAttachments(point.id);
    if(sequence!==detailAttachmentLoadSeq||openedPointId!==point.id||detail.hidden)return;
    counter.textContent=`${files.length}개`;
    if(!files.length){
      const empty=document.createElement('p');empty.className='point-file-empty';empty.textContent='등록된 첨부자료가 없습니다.';
      detailAttachmentList.append(empty);return;
    }
    for(const file of files){
      const row=createPointFileRow(file,undefined,{download:true});
      if(canPreviewPointImage(file)){
        const thumb=document.createElement('img');thumb.className='point-file-thumbnail';thumb.alt='';
        const url=URL.createObjectURL(file.blob);detailAttachmentObjectURLs.push(url);thumb.src=url;row.prepend(thumb);
      }
      detailAttachmentList.append(row);
    }
    if(!point.photo){
      const cover=files.find(canPreviewPointImage);
      if(cover){
        detailHeroObjectURL=URL.createObjectURL(cover.blob);
        const image=document.getElementById('detail-photo-image');
        image.src=detailHeroObjectURL;image.hidden=false;
        document.getElementById('detail-photo-placeholder').hidden=true;
        document.getElementById('upload-photo').textContent='＋ 대표 사진 추가 / 교체';
      }
    }
  }catch(error){
    if(sequence!==detailAttachmentLoadSeq)return;
    const msg=document.createElement('p');msg.className='point-file-empty';msg.textContent='첨부파일을 불러올 수 없습니다.';
    detailAttachmentList.append(msg);
    console.warn('지점 첨부파일 조회 실패:',error);
  }
}

function showOverview(){
  ++detailAttachmentLoadSeq;
  revokeDetailAttachmentObjectURLs();
  closeTransportPanel(false);
  detail.hidden=true;editor.hidden=true;showOverviewOnlyWithContent();
  app.classList.remove('detail-open','edit-open');
  requestAnimationFrame(() => applyOverviewSheetState(overviewSheetState));
}
// X means dismiss the current surface and leave the map unobstructed.
// It must not call showOverview(), because that function deliberately opens
// the overview sheet for non-close workflows (delete/edit completion, etc.).
function closeDetailToMap(event){
  if(event?.type==='click'&&window.DongjakWindowMotion){window.DongjakWindowMotion.close(detail,()=>closeDetailToMap());return;}
  ++detailAttachmentLoadSeq;
  revokeDetailAttachmentObjectURLs();
  closeTransportPanel(false);
  detail.hidden=true;editor.hidden=true;overview.hidden=true;
  overviewExplicitOpen=false;
  editingPointId=null;openedPointId=null;
  if(addMode){
    addMode=false;
    addButton.classList.remove('active');
    addButton.textContent='＋ 지점 등록';
    addHint.hidden=true;
  }
  clearPending();
  app.classList.remove('detail-open','edit-open','adding');
}
function clearPending(){
  if(pendingMarker)pendingMarker.remove();
  pendingMarker=null;
  chosenLocation=null;
}
function setAddMode(enabled,{restoreOverview=true}={}){
  if(enabled){
    immersiveChrome.restore();closeTransportPanel(false);
    app.classList.remove('map-controls-open');
    mapToolsToggle?.setAttribute('aria-expanded','false');
    if(mapToolsToggle)mapToolsToggle.textContent='지도 옵션';
    quickSearch.close();
  }
  addMode=enabled;
  addButton.classList.toggle('active',enabled);
  addButton.textContent=enabled?'× 추가 취소':'＋ 지점 등록';
  addHint.hidden=!enabled;
  app.classList.toggle('adding',enabled);
  if(enabled){
    editingPointId=null;
    resetPointFileDraft();
    clearPending();
    overview.hidden=true;detail.hidden=true;editor.hidden=true;
    app.classList.remove('detail-open','edit-open');
    document.getElementById('entry-heading').textContent='조사 지점 등록';
    document.getElementById('entry-submit-label').textContent='조사 후보지 저장';
    toast('동작구 안의 원하는 위치를 지도에서 클릭해 주세요.');
  }else{
    clearPending();
    editor.hidden=true;
    if(detail.hidden&&restoreOverview)showOverview();
  }
}
function openDetail(p){
  immersiveChrome.restore();
  closeTransportPanel(false);
  openedPointId=p.id;
  setAddMode(false);
  overview.hidden=true;editor.hidden=true;detail.hidden=false;
  app.classList.remove('edit-open');app.classList.add('detail-open');
  document.getElementById('detail-title').textContent=p.title;
  document.getElementById('bookmark-point').textContent=p.favorite?'★ 관심 지점 저장됨':'☆ 관심 지점으로 저장';
  document.getElementById('detail-subtitle').textContent='동작구 · 조사 후보';
  document.getElementById('detail-category').textContent=p.category||'기타';
  document.getElementById('detail-category').style.color=COLORS[p.category]||COLORS['기타'];
  document.getElementById('detail-observation').textContent=p.observation||'미입력';
  document.getElementById('detail-improvement').textContent=p.improvement||'미입력';
  const photo=photoValid(p.photo)?p.photo:null;
  const image=document.getElementById('detail-photo-image');
  image.hidden=!photo;image.src=photo||'';
  document.getElementById('detail-photo-placeholder').hidden=!!photo;
  document.getElementById('remove-photo').hidden=!photo;
  document.getElementById('upload-photo').textContent=photo?'사진 교체하기':'＋ 현장사진 추가하기';
  renderDetailPointFiles(p);
}

addButton.addEventListener('click',()=>setAddMode(!addMode));
document.getElementById('close-detail').addEventListener('click',closeDetailToMap);
document.getElementById('back-to-map').addEventListener('click',closeDetailToMap);
document.getElementById('cancel-add').addEventListener('click',()=>{
  if(editingPointId){
    const p=points.find(x=>x.id===editingPointId);
    editingPointId=null;
    if(p)openDetail(p);else closeDetailToMap();
  }else{
    setAddMode(false,{restoreOverview:false});
    closeDetailToMap();
  }
});
document.getElementById('edit-point').addEventListener('click',()=>{
  const p=points.find(x=>x.id===openedPointId);
  if(!p){toast('수정할 지점이 없습니다.');return;}
  editingPointId=p.id;
  addMode=false;addHint.hidden=true;
  app.classList.remove('adding','detail-open');app.classList.add('edit-open');
  overview.hidden=true;detail.hidden=true;editor.hidden=false;
  document.getElementById('entry-heading').textContent='조사정보 수정';
  document.getElementById('entry-submit-label').textContent='변경내용 저장';
  document.getElementById('chosen-position').textContent=`현재 좌표: 위도 ${p.lat.toFixed(6)} / 경도 ${p.lng.toFixed(6)}`;
  document.getElementById('point-title').value=p.title;
  document.getElementById('point-category').value=CATEGORIES.includes(p.category)?p.category:'기타';
  document.getElementById('point-observation').value=p.observation||'';
  document.getElementById('point-improvement').value=p.improvement||'';
  loadPointFileDraft(p.id);
});
form.addEventListener('submit',async (event)=>{
  event.preventDefault();
  const submitButton=form.querySelector('button[type="submit"]');
  if(submitButton.disabled)return;
  const title=document.getElementById('point-title').value.trim();
  if(!title){toast('지점 이름을 입력해 주세요.');return;}
  const payload={title,category:document.getElementById('point-category').value,
    observation:document.getElementById('point-observation').value.trim(),
    improvement:document.getElementById('point-improvement').value.trim()};
  const pointId=editingPointId;
  if(!pointId&&!chosenLocation){toast('지도에서 등록할 위치를 선택해 주세요.');return;}
  submitButton.disabled=true;
  try{
    // Validate before touching stored point information. Save to IndexedDB
    // atomically; never silently discard files when a browser refuses storage.
    checkPointAttachmentSelection(existingPointFiles,stagedPointFiles,removedPointFileIds);
    if(pointId){
      const p=points.find(x=>x.id===pointId);
      if(!p)throw new Error('수정할 지점을 찾지 못했습니다.');
      const before={...p};Object.assign(p,payload);
      if(!writePoints()){Object.assign(p,before);throw new Error('지점 정보를 저장하지 못했습니다.');}
      try{await updatePointAttachments(p.id,stagedPointFiles,removedPointFileIds);}
      catch(error){Object.assign(p,before);writePoints();throw error;}
      editingPointId=null;
      resetPointFileDraft();drawPoints();openDetail(p);
      toast('조사내용과 첨부파일을 저장했습니다.');
      return;
    }
    const p={id:crypto.randomUUID?.()||`${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      lng:chosenLocation.lng,lat:chosenLocation.lat,...payload,photo:null};
    points.push(p);
    if(!writePoints()){
      points=points.filter(x=>x.id!==p.id);
      throw new Error('저장공간이 부족하거나 사용이 차단되어 지점을 저장하지 못했습니다.');
    }
    try{await updatePointAttachments(p.id,stagedPointFiles,removedPointFileIds);}
    catch(error){points=points.filter(x=>x.id!==p.id);writePoints();throw error;}
    resetPointFileDraft();setFilter('전체');setAddMode(false);openDetail(p);
    toast('새 조사 지점과 첨부자료가 저장됐습니다.');
  }catch(error){toast(error.message||'지점 등록에 실패했습니다. 다시 확인해 주세요.');}
  finally{submitButton.disabled=false;}
});
document.getElementById('delete-point').addEventListener('click',()=>{
  const p=points.find(x=>x.id===openedPointId);
  if(!p||!window.confirm(`'${p.title}' 지점을 삭제하시겠습니까?`))return;
  const original=[...points];points=points.filter(x=>x.id!==p.id);
  if(!writePoints()){points=original;return;}
  deletePointAttachments(p.id).catch(error=>console.warn('지점 첨부파일 정리 실패:',error));
  drawPoints();showOverview();toast('지점을 삭제했습니다.');
});

// 지점 선택 및 빈 지도 클릭은 MapLibre 이벤트로 직접 처리합니다.
map.on('click',(event)=>{
  if(navMode==='gps')return;
  // One-tap dismissal: tool drawers must not remain over the map after a map tap.
  if(app.classList.contains('map-controls-open'))closeMapOptions();
  if(app.classList.contains('map-safety-open')&&!app.classList.contains('dj-safety-peek'))syncSafetyMenu(false);
  if(document.getElementById('map-gesture-guide')?.hidden===false)
    document.getElementById('map-gesture-guide-close')?.click();
  const floating=document.getElementById('night-visibility-float');
  if(floating&&!floating.hidden&&floating.dataset.collapsed!=='true')
    document.getElementById('night-visibility-float-collapse')?.click();
  // Page overlays do not block map areas outside them: a direct map tap restores the map.
  if(app.dataset.tab!=='map' && !communityPickMode && !routePickMode && !addMode){
    navigate('map');
    if(!overview.hidden)applyOverviewSheetState('collapsed');
    return;
  }
  if(communityPickMode) { selectCommunityLocation(event.lngLat); return; }
  if(routePickMode) { pickRouteLocation(event.lngLat,event.point); return; }
  if(!addMode){
    // Collapse white panels only when tapping non-interactive map space.
    // Station, entrance and field-report markers must keep their click handlers.
    const clickable=['transport-subway-station','transport-subway-names','transport-bus-stop',
      'transport-bus-names','poi_transit','registered-points-click',
      'dj-metro-summary-icon','dj-metro-summary-name','dj-metro-detail-icon','dj-metro-detail-name','metro-access-exits',
      'metro-access-exit-labels','metro-access-elevator','metro-access-escalator','metro-access-stairs',
      'pza-child-fill','pza-senior-fill','pza-child-point','pza-senior-point',
      'pza-candidates-line','pza-focus-line','pza-focus-marker','pza-focus-marker-label','pza-hotspots-fill',
      'dongjak-park-names'];
    const layers=clickable.filter(id=>map.getLayer(id));
    const hits=layers.length?map.queryRenderedFeatures(event.point,{layers}):[];
    if(hits.length)return;
    if(app.dataset.tab==='map'){
      if(!document.getElementById('transport-sheet')?.hidden){
        closeTransportPanel(true);
      }
      if(!overview.hidden)applyOverviewSheetState('collapsed');
      if(!detail.hidden)showOverview();
      if(app.classList.contains('map-controls-open')){
        closeMapOptions();
      }
      quickSearch.close();
    }
    return;
  }
  const {lng,lat}=event.lngLat;
  const inside=isDongjak(lng,lat);
  if(inside===null){toast('동작구 경계를 불러오는 중입니다. 잠시 후 다시 눌러 주세요.');return;}
  if(!inside){toast('이번 앱은 동작구 내부만 등록할 수 있습니다.');return;}
  clearPending();chosenLocation={lng,lat};
  pendingMarker=new maplibregl.Marker({color:'#20a082',scale:0.88}).setLngLat([lng,lat]).addTo(map);
  form.reset();resetPointFileDraft();editor.hidden=false;addHint.hidden=true;
  document.getElementById('chosen-position').textContent=`선택 좌표: 위도 ${lat.toFixed(6)} / 경도 ${lng.toFixed(6)}`;
});

// 현장사진은 서버로 전송하지 않고 현재 브라우저에 압축하여 보관합니다.
function compressPhoto(file){
  return new Promise((resolve,reject)=>{
    if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)){reject(new Error('JPG·PNG·WEBP 사진만 등록 가능합니다.'));return;}
    if(file.size>15*1024*1024){reject(new Error('사진 원본은 15MB 이하만 선택해 주세요.'));return;}
    const url=URL.createObjectURL(file);
    const img=new Image();
    img.onload=()=>{
      try{
        const dim=Math.max(img.naturalWidth,img.naturalHeight);
        if(!dim)throw new Error('사진 크기를 읽지 못했습니다.');
        for(const bound of [1100,900,720,560]){
          const factor=Math.min(1,bound/dim);
          const canvas=document.createElement('canvas');
          canvas.width=Math.max(1,Math.round(img.naturalWidth*factor));
          canvas.height=Math.max(1,Math.round(img.naturalHeight*factor));
          const context=canvas.getContext('2d');
          if(!context)throw new Error('사진 처리 기능을 지원하지 않습니다.');
          context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
          context.drawImage(img,0,0,canvas.width,canvas.height);
          for(const quality of [0.78,0.64,0.5]){
            const result=canvas.toDataURL('image/jpeg',quality);
            if(result.length<=410000){resolve(result);return;}
          }
        }
        reject(new Error('이미지를 충분히 압축하지 못했습니다.'));
      }catch(error){reject(error);}finally{URL.revokeObjectURL(url);}
    };
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('사진 파일을 읽지 못했습니다.'));};
    img.src=url;
  });
}
const photoInput=document.getElementById('detail-photo-input');
const photoUpload=document.getElementById('upload-photo');
photoUpload.addEventListener('click',()=>{if(openedPointId)photoInput.click();});
photoInput.addEventListener('change',async()=>{
  const file=photoInput.files?.[0];photoInput.value='';if(!file)return;
  const targetId=openedPointId;photoUpload.disabled=true;photoUpload.textContent='사진 처리 중…';
  try{
    const converted=await compressPhoto(file);
    const p=points.find(x=>x.id===targetId);if(!p)throw new Error('지점을 찾지 못했습니다.');
    const before=p.photo;p.photo=converted;
    if(!writePoints()){p.photo=before;throw new Error('브라우저 저장에 실패했습니다.');}
    if(openedPointId===targetId)openDetail(p);
    toast('현장사진을 저장했습니다.');
  }catch(error){toast(error.message||'사진 등록에 실패했습니다.');}
  finally{
    photoUpload.disabled=false;
    const p=points.find(x=>x.id===openedPointId);
    photoUpload.textContent=p?.photo?'사진 교체하기':'＋ 현장사진 추가하기';
  }
});
document.getElementById('remove-photo').addEventListener('click',()=>{
  const p=points.find(x=>x.id===openedPointId);
  if(!p?.photo||!window.confirm('현장사진만 삭제하시겠습니까?'))return;
  const before=p.photo;p.photo=null;
  if(!writePoints()){p.photo=before;return;}
  openDetail(p);toast('사진을 삭제했습니다.');
});
// 지도 로드 후 건물·지점·동작구 경계 및 바깥쪽 밝은 표시를 구성합니다.
installMobileMapControls({app,map});
map.on('load',()=>{
  // Camera-distance haze is active only in the oblique perspective view.
  installDistantHaze({map,app,themeButton:document.getElementById('theme-toggle')});
  // Protection-zone overlays and night visibility are mutually exclusive.
  // Preserve the previously verified safety-workspace handoff; v6.0.13 lost it.
  let protectionOverlay=null;
  const nightMode=installNightVisibility({map,maplibregl,app,toast,theme:visualTheme,
    onActivate:()=>protectionOverlay?.disable({restoreNight:false})});
  protectionOverlay=installProtectionZoneMap({map,maplibregl,app,nightMode});
  installPolicyGapThreeSourceMap({map,maplibregl,app,nightMode,protectionOverlay});
  installSangdoSpeedMap({map,maplibregl,app});
  installBochaRoadLayer({map,maplibregl,app});
  installNearbyPlaceLabels(map,{maplibregl});
  installHangangBridgeLabels(map,{maplibregl});
  installImportantPlaceClick({map,maplibregl});
  installParkInfoClick({map,maplibregl,isDongjak});
  visualTheme.refresh();
  startupLoader.baseReady();
  mapReady=true;
  clearTimeout(mapRecoveryTimer);
  app.dataset.djBasemapSource=mapStyleRecovered?'emergency-osm':'openfreemap-bright';
  if(mapStyleRecovered)toast('임시 기본지도입니다. 원래 지도는 새로고침 후 다시 연결됩니다.');
  // 기존 버스/지하철 레이어는 그대로 유지: 새 레이어로 겹쳐 표시하지 않습니다.
  // 배경지도 벡터 타일에서 이름이 확인되는 건물에 한해 17배율 이상 라벨을 추가합니다.
  try {
    installDongjakMapPatch({map,maplibregl,busStops:[],buildings:[],noryangjinFix:false,useBaseBuildingSource:true});
  } catch(error) { console.warn('[고배율 건물명] 레이어 연결 실패:',error); }
  baseLayerControls=installBaseLayerControls({map,app,onBuildingsChange:(enabled)=>{
    baseBuildingsVisible=enabled;
    syncTiltWithBuildings();
  }});
  installMapOrientationControls(map,maplibregl);
  installGrassTexture({map,app});
  installForestShade({map,app});
  installBaseBuildingPalette({map,app});
  status('지도 준비 완료 · 동작구 경계 불러오는 중');
  // 공개 Terrarium DEM: API 키 없이 지형을 표시합니다. 지형 데이터의 상세도는 지역별로 다릅니다.
  try {
    map.addSource('dongjak-terrain-dem', {
      type:'raster-dem',
      tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
      encoding:'terrarium',
      tileSize:256,
      maxzoom:12,
      attribution:'Elevation data: Mapzen/Mapzen Terrain Tiles and original data providers'
    });
    terrainAvailable=true;
    syncTiltWithBuildings();
  } catch (error) {
    console.warn('고도자료 소스 추가 오류:',error);
    terrainAvailable=false;
  }
  // 배경지도에 내장된 입체 건물은 끄고, 동작구 건물 데이터만 따로 그립니다.
  // 기존 지도 스타일에 포함된 3D 건물이 동작구 외부에도 보이던 문제를 막습니다.
  try {
    for (const layer of map.getStyle().layers) {
      if (layer.type==='fill-extrusion') map.setLayoutProperty(layer.id,'visibility','none');
    }
  } catch(error) {console.warn('원본 지도 3D 레이어 숨김 실패:',error);}
  // 텍스트 회전/기울임은 서로 다릅니다. 지도 기울기와 상관없이 정자세 + 이탈릭 서체를 제거합니다.
  keepMapLabelsUpright();
  thinNativeOnewayArrows();
  keepRegularMapText(map);
  slimMapTextHalos(map);
  // The installed symbol layers arrive asynchronously after initial style load.
  // This only updates labels whose halo still exceeds the cap.
  map.on('idle',()=>slimMapTextHalos(map));
  // 일반 상업시설/생활시설 POI는 분류 태그를 기준으로 표시를 제한합니다.
  filterCommercialPOI(map);
  // 원본 지도에서 외국어만 있는 시설·정류장 이름은 숨기고 한국어 표기가 있으면 우선합니다.
  preferKoreanBaseMapLabels(map);
  // Never reveal out-of-district bus symbols while the boundary is still loading
  // or when its remote request fails. A clipped in-district layer is added later.
  suppressNativeBusStopGlyphs(map);
  // Eliminate only the heavy road casing, not the actual road surface.
  // Keep secondary paths visible; do not hide rail or subway line colors.
  for(const layer of map.getStyle().layers){
    if(layer.type!=='line')continue;
    const id=String(layer.id||'').toLowerCase();
    if(!/(road|highway|street|motorway|trunk|primary|secondary|tertiary)/.test(id))continue;
    if(!/(casing|outline)/.test(id))continue;
    try{map.setPaintProperty(layer.id,'line-color','#e9efeb');map.setPaintProperty(layer.id,'line-opacity',0.27);}
    catch(e){console.warn('[도로 외곽선] 스타일 조정 제외',layer.id,e);}
  }
  // v17: 지도 도로명 텍스트만 숨깁니다. 도로선·역명·POI는 유지합니다.
  try {
    let hiddenRoadLabels = 0;
    for (const layer of map.getStyle().layers) {
      if (layer.type !== 'symbol') continue;
      const id = String(layer.id || '');
      const sourceLayer = String(layer['source-layer'] || '');
      if (sourceLayer === 'transportation_name' || /(?:^|[-_])(road|street|highway)[-_]?(?:name|label|text)(?:$|[-_])|(?:^|[-_])(?:name|label)[-_]?(?:road|street|highway)(?:$|[-_])/i.test(id)) {
        map.setLayoutProperty(id, 'visibility', 'none');
        hiddenRoadLabels++;
      }
    }
    console.info(`[v17] 도로명 레이어 ${hiddenRoadLabels}개 숨김`);
  } catch (error) { console.warn('도로명 숨김 실패:', error); }
  map.addSource('walking-route-alternative',{type:'geojson',data:emptyWalkingRoute()});
  map.addSource('walking-route', {type:'geojson',data:emptyWalkingRoute()});
  const firstLabel = map.getStyle().layers.find(layer=>layer.type==='symbol')?.id;
  map.addLayer({id:'walking-route-alternate-line',type:'line',source:'walking-route-alternative',
    layout:{'line-cap':'round','line-join':'round'},
    paint:{'line-color':'#87939b','line-width':['interpolate',['linear'],['zoom'],11,2.8,17,5.1],
      'line-opacity':0.72,'line-dasharray':[1.8,2.4]}},firstLabel);
  map.addLayer({id:'walking-route-outline',type:'line',source:'walking-route',
    layout:{'line-cap':'round','line-join':'round'},
    paint:{'line-color':'#ffffff','line-width':['interpolate',['linear'],['zoom'],11,6,17,11],'line-opacity':0.94}},firstLabel);
  // 실제 이동한 구간은 회색으로 표시하고, 남은 구간은 녹색으로 표시합니다.
  map.addSource('walking-route-traveled',{type:'geojson',data:emptyWalkingRoute()});
  map.addLayer({id:'walking-route-traveled-line',type:'line',source:'walking-route-traveled',
    layout:{'line-cap':'round','line-join':'round'},
    paint:{'line-color':'#929da5','line-width':['interpolate',['linear'],['zoom'],11,3.7,17,7.8]}},firstLabel);
  // Ordinary, unassessed directions are BLUE, never falsely green/safe.
  map.addLayer({id:'walking-route-line',type:'line',source:'walking-route',
    layout:{'line-cap':'round','line-join':'round'},
    paint:{'line-color':'#2766dc','line-width':['interpolate',['linear'],['zoom'],11,3.5,17,7.5]}},firstLabel);
  map.addSource('walking-route-pri',{type:'geojson',data:emptyWalkingRoute()});
  map.addLayer({id:'walking-route-pri-colors',type:'line',source:'walking-route-pri',
    filter:['!=',['get','tone'],'unknown'],
    layout:{'line-cap':'round','line-join':'round','visibility':'none'},
    paint:{'line-color':['get','color'],'line-width':['interpolate',['linear'],['zoom'],11,4,17,8.5]}},firstLabel);
  map.addLayer({id:'walking-route-pri-unknown',type:'line',source:'walking-route-pri',
    filter:['==',['get','tone'],'unknown'],
    layout:{'line-cap':'round','line-join':'round','visibility':'none'},
    paint:{'line-color':'#85949d','line-width':['interpolate',['linear'],['zoom'],11,4,17,8.5],
      'line-dasharray':[1.3,1.2]}},firstLabel);
  map.addSource('registered-points',{type:'geojson',data:pointCollection()});
  map.addLayer({id:'registered-points-halo',type:'circle',source:'registered-points',
    paint:{'circle-radius':11,'circle-color':'#ffffff','circle-stroke-color':'#fff','circle-stroke-width':1}});
  map.addLayer({id:'registered-points-click',type:'circle',source:'registered-points',
    paint:{'circle-radius':8.4,'circle-stroke-color':'#fff','circle-stroke-width':2,
      'circle-color':['match',['get','category'],'보행공간',COLORS['보행공간'],'교차로·시야',COLORS['교차로·시야'],'횡단시설',COLORS['횡단시설'],'조명·시설물',COLORS['조명·시설물'],COLORS['기타']]}});
  map.on('click','registered-points-click',(event)=>{
    if(navMode==='gps'||addMode || routePickMode)return;
    const id=event.features?.[0]?.properties?.pointId;
    const p=points.find(x=>x.id===id);
    if(p)openDetail(p);
  });
  map.on('mouseenter','registered-points-click',()=>{map.getCanvas().style.cursor='pointer';});
  map.on('mouseleave','registered-points-click',()=>{map.getCanvas().style.cursor='';});
  drawPoints();
  installRoadWidthLayer({map, maplibregl, app, canOpen:()=>!navMode&&app.dataset.tab==='map' && !addMode && !routePickMode && !communityPickMode && detail.hidden && editor.hidden, onError:()=>toast('도로폭 데이터를 불러오지 못했습니다.')});
  // 동작구 행정동 경계와 이름은 행정동 GeoJSON 기준으로 따로 표시합니다.
  // 동작구 외곽선을 먼저 불러온 다음 같은 자료의 시군구·행정동 경계를 일치시킵니다.
  // The administrative-district picker uses the same shared bottom-sheet shell on every viewport.
  const adminInit=()=>installAdminDongLayer({map,openButton:document.getElementById('open-admin-dongs'),
    picker:document.getElementById('admin-dong-picker'),
    onDistrictBoundary:(feature)=>{
      if(!feature.geometry)return;
      boundaryGeometry=feature.geometry;
      boundaryBounds=computeBounds(boundaryGeometry);
      if(gpsLastPosition)outsideDistrictAlert.check(...gpsLastPosition,boundaryGeometry,gpsLastAccuracy);
      map.getSource('district-outline')?.setData({type:'FeatureCollection',features:[feature]});
      map.getSource('district-exterior')?.setData(maskOutside(boundaryGeometry));
      // Reclip bus tile fallback against the updated SGIS district polygon.
      map.fire('dongjak:boundary-updated');
      // 통계청 SGIS 기준 시군구 외곽으로 변경되어 행정동 경계와 불일치를 줄입니다.
      console.info('[행정동] 외곽 시군구 경계도 2026-10 자료와 일치시켰습니다.');
    },
    onError:(error)=>console.warn('행정동 자료 조회 실패:',error)});
  // Official-source data overlays are opt-in and lazy-loaded after district boundary is available.
  installDongjakOfficialDataLayers({map,maplibregl,getBoundary:()=>boundaryGeometry,
    canOpen:()=>!navMode&&!addMode&&!routePickMode&&!communityPickMode});
  const boundaryReady = loadDongjakBoundary();
  boundaryReady.then(adminInit).catch(error=>console.warn('행정동 설치 실패:',error));
  boundaryReady.then(()=>startupLoader.boundaryReady()).catch(()=>startupLoader.error());
  boundaryReady.then(()=>{if(map.getLayer('dj-nearby-place-names'))map.moveLayer('dj-nearby-place-names');requestAnimationFrame(()=>visualTheme.refresh());}).catch(()=>{});
  // 안전시설/횡단보도는 사용자가 버튼을 눌렀을 때 공개 OSM 자료를 조회합니다.
  boundaryReady.then(()=>{
    installSafetyLayers({map,maplibregl,isDongjak,
      canOpen:()=>!navMode&&app.dataset.tab==='map'&&!addMode&&!routePickMode&&!communityPickMode});
    installBridgeDeck({map,isDongjak});
    installDecorativeParkTrees({map,isDongjak});
  }).catch(error=>console.warn('안전 지도 레이어 초기화 실패',error));
  // 생활권 인지를 위해 이름이 등록된 아파트만 중간/높은 축척에 표시.
  boundaryReady.then(()=>installApartmentLabels({map,maplibregl,boundaryGeometry}))
    .catch(error=>console.warn('아파트 라벨 표시 생략:',error));
  // 동작구청·서울현충원 등 대표 랜드마크 아이콘.
  // Use native vector POIs as immediate fallback even when Overpass times out.
  boundaryReady.then(()=>installCivicFacilities({map,maplibregl,boundaryGeometry,app}))
    .catch(error=>console.warn('학교·공공·체육시설 레이어:',error));
  // Verified representative locations must remain accessible even if remote boundary data stalls.
  const placeDistrictCheck=(lng,lat)=>isDongjak(lng,lat)!==false;
  // Named universities, district office and national cemetery use native map labels;
  // they do not disappear during pan/tilt or while boundary/OSM APIs are pending.
  installFeaturedPlaceLabels({map,maplibregl,app});
  installReadable3DLabels({map,app});
  installLandmarks({map,maplibregl,isDongjak:placeDistrictCheck});
  installEducationLayer({map,maplibregl,isDongjak:placeDistrictCheck});
  // OSM에 공개된 버스정류소/지하철 역명 및 일부 노선 태그를 별도 레이어로 표시합니다.
  // 실시간 도착정보는 인증된 서울시 API를 사용하는 중계 서버가 있을 때만 표시합니다.
  const accessibilityLayer=initStationAccessibility({map,maplibregl,isInDistrict:(lng,lat)=>isDongjak(lng,lat)===true || isNearDongjakBoundary(lng,lat,220),canOpen:()=>!navMode&&app.dataset.tab==='map' && !addMode && !routePickMode});
  boundaryReady.then(()=>{accessibilityLayer.refreshBoundary();accessibilityLayer.bringToFront();}).catch(()=>{});
  boundaryReady.then(()=>initTransportMap({map, maplibregl, isDongjak,boundaryGeometry,
    getDistrictGeometry:()=>boundaryGeometry,isNearBoundary:isNearDongjakBoundary, onOpen:()=>{
    overview.hidden=true; detail.hidden=true; editor.hidden=true;
    immersiveChrome.restore();
  }, onClose:()=>{
    // Closing a station/stop sheet should return to the map itself. Do not
    // immediately surface the overview sheet underneath the user's X action.
    overview.hidden=true;
  }, canPickRoute:()=>Boolean(routePickMode),
  onRoutePick:(place)=>{if(routePickMode)showTransitRouteConfirmation(place);},
  onRouteSelect:(which,place)=>{
    if(!setRouteLocation(which,{lng:place.lng,lat:place.lat,label:describeTransitPlace(place)}))return;
    navigate('route');
    toast(which==='start'?'출발지로 지정했습니다.':'목적지로 지정했습니다.');
  }, canOpen:()=>!navMode&&app.dataset.tab==='map' && !addMode && !routePickMode && !communityPickMode})).then(()=>{
    baseLayerControls?.apply();
    accessibilityLayer.bringToFront();
    startupLoader.transportReady();
    try{installDongjakLiveTransit({map,maplibregl,app,isDongjak,onNotice:toast});}catch(error){console.warn('실시간 차량 레이어 초기화 실패:',error);}
  }).catch(error=>{console.warn('교통 지도 초기화 실패:',error);});
});

// 이번 버전은 저장 키를 따로 사용해 이전 버전 자료를 자동으로 가져오지 않습니다.
readPoints();


// ────────────────────────────────────────────────────────────
// 경량 내비게이션. 실제 제보·커뮤니티 서버가 없는 시범 버전입니다.
// ────────────────────────────────────────────────────────────
const navButtons = [...document.querySelectorAll('.nav-tab')];
const pagePanels = [...document.querySelectorAll('.page-panel')];
const communityStorageKey = 'dongjak_safety_community_v15_posts';
let communityPosts = readCommunityPosts(localStorage.getItem(communityStorageKey));
let sharedCommunityPosts=[],communityCloudStatus='공유 게시글 조회 전',communityRefreshSequence=0;
async function refreshSharedCommunity(){
  const seq=++communityRefreshSequence;
  communityCloudStatus='공개 게시판 확인 중…';
  if(app.dataset.tab==='participate')renderCommunity();
  try{
    const requested=communityDeepLink;
    const result=await readSharedCommunity(requested);
    if(seq!==communityRefreshSequence)return;
    sharedCommunityPosts=result.posts;
    if(requested){
      communityDeepLink=null;
      if(app.dataset.tab==='participate'){
        communityDetail=result.posts.some(p=>p.id===requested)?requested:null;
        if(!communityDetail)toast('게시글을 찾을 수 없습니다.');
      }
    }
    communityCloudStatus='공개 게시판 · '+(result.authenticated?'로그인됨':'읽기 전용 · 로그인 후 작성 가능');
  }catch{
    if(seq!==communityRefreshSequence)return;
    // Connectivity failure must never erase a previously loaded feed.
    communityCloudStatus='공유 게시판 연결 실패 · 기존 기록은 유지됩니다.';
  }
  if(app.dataset.tab==='participate'){renderCommunity();void refreshCommunityNotices();void refreshCommunityModerationStatus();}
}
window.addEventListener('dongjak:auth-state',()=>{resetCommunityNotices();communitySavedOnly=false;communityReplyTo=null;communityModerationStatus=null;const status=document.getElementById('community-moderation-status');if(status)status.hidden=true;document.getElementById('community-saved-toggle')?.setAttribute('aria-pressed','false');if(app.dataset.tab==='participate')void refreshSharedCommunity();});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void refreshCommunityNotices();});
const dongjakNews=initDongjakNews({app,onToast:toast});
// Warm both headline feeds on map startup; opening 동작 소식 reads their cache.
void dongjakNews.prefetch();
let communityFilter = '전체';
let communityNotices=[],communityDetail=null,communitySearch='',communityNoticeSeq=0,communityListScroll=0,communitySavedOnly=false,communityReplyTo=null,communityModerationStatus=null,communityDeepLink=null,communityNoticePrimed=false;
async function refreshCommunityModerationStatus(){const token=communityRefreshSequence;try{const state=await readCommunityModerationStatus();if(token!==communityRefreshSequence)return;communityModerationStatus=state;const label=document.getElementById('community-moderation-status');if(label){label.hidden=!state||state.ready;label.textContent=state?.ready?'공개 게시글과 댓글은 AI 검사 후 등록됩니다.':'공개 글 AI 검사를 준비 중입니다. 등록할 수 없을 때는 작성 내용이 유지됩니다.';}}catch{/* keep prior state */}}
function paintCommunityNoticeBadge(){const button=document.getElementById('community-notifications-toggle');if(!button)return;const count=communityNotices.filter(n=>!n.read_at).length;button.textContent='알림';button.setAttribute('aria-label',count?'커뮤니티 읽지 않은 알림 '+count+'개':'커뮤니티 알림');button.classList.toggle('has-unread',count>0);const nav=document.querySelector('#bottom-nav [data-tab="participate"]');if(nav)nav.classList.toggle('community-has-unread',count>0);}
function resetCommunityNotices(){++communityNoticeSeq;communityNotices=[];communityNoticePrimed=false;const panel=document.getElementById('community-notifications');if(panel){panel.hidden=true;panel.replaceChildren();}paintCommunityNoticeBadge();}
function renderCommunityNotices(){const panel=document.getElementById('community-notifications');if(!panel)return;panel.replaceChildren();void installCommunityPushControl(panel,getActiveCloudClient(),toast).catch(()=>{});if(!communityNotices.length){panel.append(makeCEl('p','','새 알림이 없습니다.'));return;}
 for(const n of communityNotices){const item=makeCEl('article','community-notice');item.append(makeCEl('strong','',n.kind==='post'?'게시물이 삭제되었어요':'댓글이 삭제되었어요'),makeCEl('p','','삭제 사유: '+(moderationReasons[n.reason]||'운영정책 위반')),makeCEl('small','',formatCommunityDate(Date.parse(n.created_at))));if(!n.read_at)item.append(communityButton('읽음','community-filter',async()=>{try{await markCommunityNoticeRead(n.id);n.read_at=new Date().toISOString();paintCommunityNoticeBadge();renderCommunityNotices();}catch{toast('읽음 처리 실패');}}));if(n.appeal){item.append(makeCEl('p','community-appeal-status',({pending:'이의제기 검토 중',approved:'이의제기 승인 · 복원 완료',declined:'이의제기 검토 완료 · 삭제 유지'})[n.appeal.state]||'상태 확인 중'));}else{const open=communityButton('이의제기','community-filter',()=>{if(item.querySelector('form'))return;const form=makeCEl('form','community-appeal-form');const input=document.createElement('textarea');input.required=true;input.maxLength=500;input.placeholder='삭제에 이의를 제기하는 이유';input.setAttribute('aria-label','이의제기 사유');const send=makeCEl('button','community-filter','접수');send.type='submit';form.append(input,send);form.addEventListener('submit',async e=>{e.preventDefault();send.disabled=true;try{await appealCommunityNotice(n.id,input.value);toast('이의제기가 접수되었습니다.');form.remove();await refreshCommunityNotices();}catch(err){toast(err.message);send.disabled=false;}});item.append(form);});item.append(open);}panel.append(item);}}
async function refreshCommunityNotices(){const seq=++communityNoticeSeq;try{const notices=await readCommunityNotifications();if(seq!==communityNoticeSeq)return;const newNotices=communityNoticePrimed?notices.filter(n=>!n.read_at&&!communityNotices.some(old=>old.id===n.id)):[];communityNoticePrimed=true;communityNotices=notices;paintCommunityNoticeBadge();const panel=document.getElementById('community-notifications');if(panel&&!panel.hidden&&!panel.querySelector('.community-appeal-form'))renderCommunityNotices();if(newNotices.length){const n=newNotices[0];toast((n.kind==='post'?'게시물':'댓글')+'이 삭제되었습니다. 알림에서 사유를 확인해 주세요.');}}catch{if(seq===communityNoticeSeq&&!document.getElementById('community-notifications').hidden)document.getElementById('community-notifications').replaceChildren(makeCEl('p','','알림을 불러오지 못했습니다.'));}}
const moderationReasons={profanity:'욕설 및 비속어',harassment:'괴롭힘 및 비하',spam:'도배 및 스팸',sexual:'음란성 콘텐츠',graphic:'과도하게 자극적인 이미지',privacy:'개인정보 노출',illegal_ad:'불법 광고',uncertain:'운영정책 위반 의심',unavailable:'검사 보류'};
const moderationMessage=(result,kind)=>result?.state==='removed'?kind+'이 삭제되었습니다. '+(moderationReasons[result.reason]||'운영정책 위반'):result?.state==='review'?kind+'이 검토 대기 중입니다. 공개되지 않습니다.':null;
let communityPickMode = false;
let communityComposerOrigin='community',communityComposerEpoch=0;
let communityComposerPortal=null;
// A full-screen mobile report must out-rank legacy !important header styles.
// Store and restore the prior inline display declaration exactly.
let communityTopbarDisplayRestore=null;
// Map-origin editor overlays the active MapLibre canvas, not a selected tab.
// Keep this short-lived hit layer above WebGL and restore all inline styles.
let mapReportHitRestore=null;
function setMapReportHitLayer(active){
  if(active){
    if(mapReportHitRestore)return;
    const targets=[
      [document.getElementById('participation-panel'),['z-index','pointer-events']],
      [document.getElementById('community-form'),['pointer-events']],
      [document.getElementById('community-compose-close'),['pointer-events']]
    ];
    mapReportHitRestore=targets.filter(([node])=>node).map(([node,props])=>({
      node,styles:props.map(key=>({
        key,value:node.style.getPropertyValue(key),priority:node.style.getPropertyPriority(key)
      }))
    }));
    for(const {node,styles} of mapReportHitRestore)for(const {key} of styles)
      node.style.setProperty(key,key==='z-index'?'12000':'auto','important');
  }else if(mapReportHitRestore){
    for(const {node,styles} of mapReportHitRestore)for(const {key,value,priority} of styles){
      if(value)node.style.setProperty(key,value,priority);
      else node.style.removeProperty(key);
    }
    mapReportHitRestore=null;
  }
}
function setCommunityTopbarBlocked(blocked){
  const header=document.querySelector('#app > .topbar');
  if(!header)return;
  if(blocked){
    if(!communityTopbarDisplayRestore)communityTopbarDisplayRestore={
      value:header.style.getPropertyValue('display'),
      priority:header.style.getPropertyPriority('display')
    };
    header.style.setProperty('display','none','important');
  }else if(communityTopbarDisplayRestore){
    const {value,priority}=communityTopbarDisplayRestore;
    if(value)header.style.setProperty('display',value,priority);
    else header.style.removeProperty('display');
    communityTopbarDisplayRestore=null;
  }
}
let communityPickedLocation = null;
let communityDraftPhoto = null;
let communityLocationMarker = null;
function saveCommunity(next) {
  try {
    localStorage.setItem(communityStorageKey, JSON.stringify(next));
    communityPosts = next;
    return true;
  } catch (error) {
    console.error('커뮤니티 저장 실패:', error);
    toast('저장공간이 부족합니다. 사진을 줄이거나 오래된 게시글을 삭제해 주세요.');
    return false;
  }
}

// The first mobile frame is a map, not an automatically opened information sheet.
// Explicit later navigation back to 안전지도 opens the full information panel.
let firstMapEntryPending = true;
function navigate(tab,{suppressOverview=false,resumeCommunityDraft=false}={}) {
  // All non-navigation destinations are unavailable until guidance ends.
  if(app.classList.contains('route-guiding')&&tab!=='map')return;
  const initialMapEntry = tab === 'map' && firstMapEntryPending;
  if (tab === 'map') firstMapEntryPending = false;
  closeTransportPanel(false);
  if (!['map','route','participate','news','mine'].includes(tab)) return;
  // A fresh tab entry always starts with the community list. Do not retain
  // the editor's visible state when a parent close animation is interrupted.
  // Selecting or cancelling a map location is the explicit draft-resume path.
  const previousTab=app.dataset.tab;
  const communityPanel=document.getElementById('participation-panel');
  const reopeningCommunity=tab==='participate'&&communityPanel?.hidden;
  if((reopeningCommunity||(previousTab!==tab&&(previousTab==='participate'||tab==='participate')))&&!communityPickMode&&!resumeCommunityDraft){
    communityDetail=null;
    communityComposerEpoch++;
    const form=document.getElementById('community-form');
    if(form){window.DongjakWindowMotion?.cancel?.(form);communityComposerPortal?.close();form.hidden=true;communityPanel?.classList.remove('dj9256-composing');setMapReportHitLayer(false);setCommunityTopbarBlocked(false);}
    const panel=document.getElementById('participation-panel');if(panel)delete panel.dataset.djPatchKeyboard;
    communityComposerOrigin='community';
  }
  immersiveChrome.restore();
  if (addMode) setAddMode(false);
  if (editingPointId) { editingPointId = null; showOverview(); }
  if (tab !== 'map') {
    if (!detail.hidden) showOverview();
  }
  app.dataset.tab = tab;
  // In HOME mode route-panel synchronization must not reopen safety overview.
  if(tab==='map'&&suppressOverview)app.dataset.djSafetyHomeOnly='1';
  else delete app.dataset.djSafetyHomeOnly;
  // The Safety Map bottom tab is HOME, not an information-sheet trigger.
  // On explicit home navigation, hide both legacy overview and district picker.
  if(tab!=='map'){overview.hidden=true;document.getElementById('map-gesture-guide')?.setAttribute('hidden','');}
  if(tab!=='map'||suppressOverview){
    const districtPicker=document.getElementById('admin-dong-picker');
    if(districtPicker)districtPicker.hidden=true;
  }
  for (const b of navButtons) {
    const active = b.dataset.tab === tab;
    b.classList.toggle('active', active);
    if (active) b.setAttribute('aria-current','page');
    else b.removeAttribute('aria-current');
  }
  for (const panel of pagePanels){
    const outgoing=panel.dataset.djTabOutgoing==='true' && panel.dataset.page!==tab;
    if(panel.dataset.page!==tab && !outgoing)window.DongjakWindowMotion?.cancel(panel);
    // The mobile tab transition owner closes this outgoing page after its
    // bounded map-return fade. Other tab changes reveal the incoming body.
    panel.hidden=panel.dataset.page!==tab && !outgoing;
  }
  if (tab === 'participate'){renderCommunity();void refreshSharedCommunity();}
  if (tab === 'news') dongjakNews.open();
  if (tab === 'mine') {
    renderMy();
    // The legacy fullscreen sheet controller can apply a 92px *inline*
    // bottom inset after stylesheet layout. My Info now owns its clearance
    // inside .dj836-sheet-body, so prevent the outer 94px blank clipping band
    // even when a runtime !important style beats authored CSS.
    const mine=document.getElementById('mine-panel');
    if(mine&&window.matchMedia('(max-width:699px)').matches){
      mine.style.setProperty('padding-bottom','0px','important');
      window.requestAnimationFrame(()=>{
        if(app.dataset.tab==='mine'&&window.matchMedia('(max-width:699px)').matches)
          mine.style.setProperty('padding-bottom','0px','important');
      });
    }
  }
  if (tab !== 'map' && routePickMode) {routePickMode=null;closeTransitRouteConfirmation();}
  if (tab === 'map') {
    if(suppressOverview){
      overview.hidden=true;
      overviewExplicitOpen=false;
    }else if (detail.hidden && editor.hidden && !addMode) {
      overview.hidden = !hasSafetyOverviewContent() || (initialMapEntry && window.innerWidth < 1080);
      if (!overview.hidden) applyOverviewSheetState('expanded');
    }
    requestAnimationFrame(() => {
      map.resize();
      if(suppressOverview)overview.hidden=true;
      else syncOverviewSheetForViewport();
    });
  }
  syncRoutePresentation();
  if(tab==='map'&&suppressOverview){
    overview.hidden=true;overviewExplicitOpen=false;
    const picker=document.getElementById('admin-dong-picker');if(picker)picker.hidden=true;
  }
}
// Capture mobile HOME before any older tab, sheet or district listeners. Other
// devices retain their dedicated desktop sidebar behaviour unchanged.
// Intercept only actual bottom-tab changes before the legacy HOME guard.
installBottomTabNavigation({doc:document,win:window,app});
installSafetyHomeGuard({doc:document,win:window,app,onHome:()=>{
  const finish=()=>{routePickMode=null;closeTransitRouteConfirmation();quickSearch.close();navigate('map',{suppressOverview:true});};
  const active=pagePanels.find(p=>!p.hidden);
  // Primary phone tabs are real screens. Do not slide them down as map sheets.
  if(active&&window.matchMedia('(max-width:699px)').matches&&['route','participate','news','mine'].includes(app.dataset.tab)){
    window.DongjakWindowMotion?.cancel?.(active);finish();
  }else if(active&&window.DongjakWindowMotion)window.DongjakWindowMotion.close(active,finish);else finish();
}});
// The Safety Map bottom tab acts as HOME on both PC and mobile. No implicit
// overview or district selection on return, first entry or repeated taps.
// Explicit district picker access remains available in map options.
for(const b of navButtons)b.addEventListener('click',()=>{
  overviewExplicitOpen=false;
  if(b.dataset.tab==='map'){
    navigate('map',{suppressOverview:true});
    return;
  }
  navigate(b.dataset.tab);
});
// Docked safety/map actions persist on desktop even on non-map tabs.
// Switch to the map first, then allow the ORIGINAL button listener to run.
for(const id of ['map-tools-toggle','map-safety-toggle','night-visibility-quick-off','toggle-road-width']){
  const action=document.getElementById(id);
  action?.addEventListener('click',()=>{
    if(app.dataset.tab!=='map')navigate('map');
  },{capture:true});
}
// Each auxiliary page has a persistent X that returns to the existing map tab.
function closePrimaryPageToMap(panel){
  const finish=()=>navigate('map',{suppressOverview:true});
  if(panel&&window.matchMedia('(max-width:699px)').matches){
    window.DongjakWindowMotion?.cancel?.(panel);finish();
  }else if(panel&&window.DongjakWindowMotion)window.DongjakWindowMotion.close(panel,finish);
  else finish();
}
for(const button of document.querySelectorAll('[data-close-page]')){
  button.addEventListener('click',()=>closePrimaryPageToMap(button.closest('.page-panel')));
}
document.getElementById('news-close-to-map')?.addEventListener('click',()=>closePrimaryPageToMap(document.getElementById('news-panel')));
// 경로 상세 결과는 아래 도보 길찾기 핸들러에서 연결합니다.
document.getElementById('participate-register').addEventListener('click', () => {
  navigate('map');
  setAddMode(true);
});

function makeRecord(title, subtitle, callback) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'record-item';
  const a = document.createElement('strong');
  a.textContent = title;
  const b = document.createElement('small');
  b.textContent = subtitle;
  const arrow = document.createElement('span');
  arrow.textContent = '›';
  arrow.className = 'record-arrow';
  const inner = document.createElement('span');
  inner.className = 'record-text';
  inner.append(a,b);
  btn.append(inner,arrow);
  btn.addEventListener('click',callback);
  return btn;
}
function renderMy() {
  document.getElementById('my-count').textContent = String(points.length);
  document.getElementById('my-saved-count').textContent = String(points.filter(p => p.favorite).length);
  document.getElementById('my-note-count').textContent = String(communityPosts.length);
  const favRoot = document.getElementById('my-favorites');
  const ptsRoot = document.getElementById('my-points');
  favRoot.replaceChildren();ptsRoot.replaceChildren();
  const jumpToPoint = (p) => {
    setFilter('전체');
    navigate('map');
    map.flyTo({center:[p.lng,p.lat],zoom:16.8,duration:750});
    openDetail(p);
  };
  for (const p of points.filter(p => p.favorite)) favRoot.append(makeRecord(p.title,p.category,jumpToPoint.bind(null,p)));
  for (const p of points) ptsRoot.append(makeRecord(p.title,`${p.category} · 조사 후보`,jumpToPoint.bind(null,p)));
  if (!favRoot.children.length) {
    const msg = document.createElement('p');msg.className='empty-hint';msg.textContent='관심 지점이 없습니다. 지도에서 지점을 선택하고 ☆를 눌러보세요.';favRoot.append(msg);
  }
  if (!ptsRoot.children.length) {
    const msg = document.createElement('p');msg.className='empty-hint';msg.textContent='등록한 지점이 없습니다. 지도에서 먼저 후보지를 기록해 보세요.';ptsRoot.append(msg);
  }
}
// v15 · 위치 연결형 동네 커뮤니티 (현재 브라우저에만 저장)
const communityForm = document.getElementById('community-form');
const communityPhotoInput = document.getElementById('community-photo-input');
communityComposerPortal=createCommunityComposerPortal(communityForm);
function openCommunityComposer(open,{animate=true}={}) {
  const motion=window.DongjakWindowMotion;
  const phone=window.matchMedia('(max-width:699px)').matches;
  if(!phone){
    communityComposerPortal?.restoreDesktop();
    delete communityForm.dataset.djDialogFade;
    if(open){communityForm.hidden=false;communityForm.scrollIntoView({behavior:'instant',block:'start'});motion?.open(communityForm);return;}
    if(communityForm.hidden)return;
    const finish=()=>{communityForm.hidden=true;};
    if(motion)motion.close(communityForm,finish);else finish();
    return;
  }
  if(open){
    if(communityComposerPortal?.isOpen())return;
    communityComposerEpoch++;
    motion?.cancel?.(communityForm);
    // No old sheet expansion, parent header movement or native dock sizing.
    document.getElementById('participation-panel')?.classList.remove('dj9256-composing');
    communityComposerPortal.open();
    setMapReportHitLayer(false);
    setCommunityTopbarBlocked(false);
    return;
  }
  if(!communityComposerPortal?.isOpen())return;
  communityComposerEpoch++;
  const mapOrigin=communityComposerOrigin==='map';
  const panel=document.getElementById('participation-panel');
  communityComposerPortal.close();
  panel?.classList.remove('dj9256-composing');
  setMapReportHitLayer(false);
  setCommunityTopbarBlocked(false);
  if(panel)delete panel.dataset.djPatchKeyboard;
  if(mapOrigin){
    communityComposerOrigin='community';
    navigate('map',{suppressOverview:true});
  }
}
document.getElementById('community-compose-toggle').addEventListener('click',()=>{communityComposerOrigin='community';openCommunityComposer(communityForm.hidden);});
document.getElementById('community-compose-close').addEventListener('click',()=>openCommunityComposer(false));
for (const chip of document.querySelectorAll('.community-filter[data-community-filter]')) {
  chip.addEventListener('click',()=>{
    communityFilter=chip.dataset.communityFilter;communityDetail=null;
    for(const b of document.querySelectorAll('.community-filter[data-community-filter]')) {
      const active=b===chip;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));
    }
    renderCommunity();
  });
}
document.getElementById('community-sort').addEventListener('change',()=>{communityDetail=null;renderCommunity();});
document.getElementById('community-dong-filter').addEventListener('change',()=>{communityDetail=null;renderCommunity();});
// Hide the dock while the comment field owns the mobile keyboard.
const syncCommentKeyboard=()=>{
  const focused=document.activeElement?.matches?.('.community-comment-form input[type=text]');
  const phone=window.matchMedia('(max-width:699px)').matches;
  const active=phone&&focused&&app.dataset.tab==='participate';
  const vv=window.visualViewport;
  app.classList.toggle('dj-community-comment-keyboard',Boolean(active));
  if(active){
    const room=Math.max(0,(vv?.offsetTop||0)+(vv?.height||window.innerHeight));
    const panel=document.getElementById('participation-panel');
    const panelTop=Math.max(0,panel?.getBoundingClientRect().top||0);
    app.style.setProperty('--dj-comment-visible-bottom',Math.max(160,room-panelTop)+'px');
    const sc=panel?.querySelector(':scope>.dj836-sheet-body');
    const box=document.activeElement.getBoundingClientRect();
    if(sc&&box.bottom>room-16)sc.scrollTop+=box.bottom-room+16;
  }else app.style.removeProperty('--dj-comment-visible-bottom');
};
for(const [target,type] of [[document,'focusin'],[document,'focusout'],[window.visualViewport,'resize'],[window.visualViewport,'scroll']])target?.addEventListener(type,()=>requestAnimationFrame(syncCommentKeyboard),{passive:true});
document.getElementById('community-refresh').addEventListener('click',()=>void refreshSharedCommunity());
// Each route point has one location picker. Search/map/GPS remain separate
// native actions but are no longer three persistent buttons per point.
for(const menu of document.querySelectorAll('#route-panel .route-location-menu')){
  menu.addEventListener('click',event=>{
    if(event.target.closest('button'))queueMicrotask(()=>{menu.open=false;});
  });
}
document.getElementById('community-saved-toggle').addEventListener('click',async()=>{if(!await isCommunitySignedIn()){toast('로그인 후 저장한 글을 볼 수 있습니다.');return;}communitySavedOnly=!communitySavedOnly;communityDetail=null;document.getElementById('community-saved-toggle').setAttribute('aria-pressed',String(communitySavedOnly));renderCommunity();});
document.getElementById('community-search').addEventListener('input',e=>{communitySearch=e.target.value;communityDetail=null;renderCommunity();});
document.getElementById('community-notifications-toggle').addEventListener('click',()=>{
 const panel=document.getElementById('community-notifications');panel.hidden=!panel.hidden;if(panel.hidden)return;panel.replaceChildren(makeCEl('p','','알림 불러오는 중…'));void refreshCommunityNotices();
});
communityPhotoInput.addEventListener('change',async()=>{
  const file=communityPhotoInput.files?.[0];communityPhotoInput.value='';if(!file)return;
  try {
    communityDraftPhoto=await compressPhoto(file);
    document.getElementById('community-photo-image').src=communityDraftPhoto;
    document.getElementById('community-photo-preview').hidden=false;
    toast('사진을 첨부했습니다.');
  } catch(error) { toast(error.message||'사진을 읽지 못했습니다.'); }
});
document.getElementById('community-photo-remove').addEventListener('click',()=>{
  communityDraftPhoto=null;
  document.getElementById('community-photo-preview').hidden=true;
  document.getElementById('community-photo-image').removeAttribute('src');
});
function selectCommunityLocation(lngLat) {
  const inside=isDongjak(lngLat.lng,lngLat.lat);
  if(inside===null){toast('동작구 경계를 불러오는 중입니다.');return;}
  if(!inside){toast('동작구 안의 위치를 선택해 주세요.');return;}
  communityPickedLocation={lng:Number(lngLat.lng.toFixed(6)),lat:Number(lngLat.lat.toFixed(6))};
  communityPickMode=false;
  document.getElementById('community-map-hint').hidden=true;
  document.getElementById('community-location-label').textContent=`선택한 위치 · ${communityPickedLocation.lat.toFixed(5)}, ${communityPickedLocation.lng.toFixed(5)}`;
  navigate('participate',{resumeCommunityDraft:true});
  openCommunityComposer(true);
  toast('위치를 연결했습니다.');
}
document.getElementById('community-map-pick').addEventListener('click',()=>{
  if(routePickMode){routePickMode=null;syncRoutePresentation();}
  // Keep the draft but return the live form to its original parent before
  // switching tabs. It will be portaled again after the map pick finishes.
  communityComposerPortal?.close();
  communityForm.hidden=true;
  document.getElementById('participation-panel')?.classList.remove('dj9256-composing');
  setCommunityTopbarBlocked(false);
  setMapReportHitLayer(false);
  communityPickMode=true;
  navigate('map');
  document.getElementById('community-map-hint').hidden=false;
  toast('지도에서 게시글에 연결할 위치를 선택해 주세요.');
});
document.getElementById('community-map-cancel').addEventListener('click',()=>{
  communityPickMode=false;
  document.getElementById('community-map-hint').hidden=true;
  navigate('participate',{resumeCommunityDraft:true});
  openCommunityComposer(true);
});
// Structured issue fields are relevant to '보행 불편' posts, not general discussion.
const issueDetails=document.getElementById('community-issue-details');
const syncIssueDetails=()=>{
  const category=document.getElementById('community-category').value;
  const dong=document.getElementById('community-dong');
  dong.required=category!=='자유게시판';
  dong.options[0].disabled=dong.required;
  issueDetails.hidden=category!=='보행 불편';
  if(!communityPickedLocation)document.getElementById('community-location-label').textContent=category==='보행 불편'?'지도 위치 선택 필수':'위치 지정 없음 · 선택사항';
};
document.getElementById('community-category').addEventListener('change',syncIssueDetails);
syncIssueDetails();
// The full-screen composer sits above the app toast; keep feedback beside its submit action.
function setCommunityPublishFeedback(message='',pending=false){
  const button=communityForm.querySelector('button[type="submit"]');
  if(!button)return;
  let note=communityForm.querySelector('[data-community-publish-feedback]');
  if(!note&&message){
    note=document.createElement('p');
    note.dataset.communityPublishFeedback='true';
    note.setAttribute('role','status');
    note.setAttribute('aria-live','polite');
    note.style.cssText='margin:0 0 8px;font-size:13px;line-height:1.45;overflow-wrap:anywhere;';
    button.before(note);
  }
  if(note){note.textContent=message;note.hidden=!message;note.style.color=pending?'#365c50':'#a12626';}
}
communityForm.addEventListener('invalid',event=>{
  const field=event.target;
  setCommunityPublishFeedback(field.id==='community-share-publicly'?'공개 게시판 등록에 동의해 주세요.':field.id==='community-dong'?'지역을 선택해 주세요.':field.id==='community-title'?'제목을 입력해 주세요.':field.id==='community-text'?'내용을 입력해 주세요.':'필수 입력 항목을 확인해 주세요.');
},true);
communityForm.addEventListener('submit',async(event)=>{
  event.preventDefault();
  if(communityForm.dataset.djPublishing==='true')return;
  const title=document.getElementById('community-title').value.trim();
  const plainBody=document.getElementById('community-text').value.trim();
  const isIssue=document.getElementById('community-category').value==='보행 불편';
  const kind=document.getElementById('community-issue-type')?.value||'기타';
  const priority=document.getElementById('community-priority')?.value||'일반 확인';
  const body=isIssue?`[보행불편 유형: ${kind}] [현장 확인: ${priority}]\n${plainBody}`.slice(0,1200):plainBody;
  const nickname=document.getElementById('community-nickname').value.trim()||'익명 주민';
  if(!title||!plainBody){setCommunityPublishFeedback('제목과 내용을 입력해 주세요.');return;}
  if(document.getElementById('community-category').value!=='자유게시판'&&!document.getElementById('community-dong').value){setCommunityPublishFeedback('지역을 선택해 주세요.');return;}
  if(isIssue&&(!communityPickedLocation||isDongjak(communityPickedLocation.lng,communityPickedLocation.lat)!==true)){setCommunityPublishFeedback('지도에서 동작구 내 제보 위치를 선택해 주세요.');return;}
  const wantsPublic=Boolean(document.getElementById('community-share-publicly')?.checked);
  if(!wantsPublic){setCommunityPublishFeedback('공개 등록에 동의해 주세요. 작성 내용은 유지됩니다.');return;}
  let outcome=null;
  communityForm.dataset.djPublishing='true';
  const publishButton=communityForm.querySelector('button[type="submit"]');
  if(publishButton)publishButton.disabled=true;
  setCommunityPublishFeedback('로그인 확인 및 AI 검사 중입니다…',true);
  try{
    if(!await isCommunitySignedIn()){
      setCommunityPublishFeedback('공개 게시판에 등록하려면 로그인해 주세요. 작성 내용은 유지됩니다.');
      return;
    }
    // A cached readiness result must not permanently block retries. The server
    // still enforces authentication, moderation readiness and publication policy.
    const post=makeCommunityPost({
      title,body,nickname,category:document.getElementById('community-category').value,dong:document.getElementById('community-dong').value,
      photo:communityDraftPhoto,location:communityPickedLocation
    });
    outcome=await publishCommunityPost(post);
  }catch(error){setCommunityPublishFeedback(error?.message||'서버 등록에 실패했습니다. 작성 내용은 유지됩니다.');return;}
  finally{delete communityForm.dataset.djPublishing;if(publishButton)publishButton.disabled=false;}
  setCommunityPublishFeedback();
  void refreshSharedCommunity();
  communityForm.reset();
  communityDraftPhoto=null;communityPickedLocation=null;
  document.getElementById('community-photo-preview').hidden=true;
  document.getElementById('community-photo-image').removeAttribute('src');
  syncIssueDetails();
  openCommunityComposer(false);
  communityFilter='전체';
  for(const btn of document.querySelectorAll('.community-filter[data-community-filter]')) {
    const active=btn.dataset.communityFilter==='전체';
    btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active));
  }
  document.getElementById('community-sort').value='new';
  renderCommunity();toast(moderationMessage(outcome,'게시물')||'공개 게시판에 등록했습니다.');
});
// Shared controls are located in 지도 옵션 to avoid cluttering the main map.
const pedestrianTools=initPedestrianTools({
  map,maplibregl,isDongjak,
  requestPosition:getDevicePosition,
  onToast:toast,
  onShowMap:()=>{if(app.dataset.tab!=='map')navigate('map');},
  onReport:()=>{
    const origin=app.dataset.tab==='map'?'map':'community';
    navigate('participate');communityComposerOrigin=origin;
    document.getElementById('community-category').value='보행 불편';
    syncIssueDetails();
    openCommunityComposer(true,{animate:true});
    if(!window.matchMedia('(max-width:699px)').matches)document.getElementById('community-title')?.focus({preventScroll:true});
  }
});

function makeCEl(tag,cls,text) {
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(text!==undefined)el.textContent=String(text);
  return el;
}
function communityButton(text,cls,fn) {
  const btn=makeCEl('button',cls,text);btn.type='button';btn.addEventListener('click',fn);return btn;
}
function showCommunityLocation(post) {
  if(!post.location)return;
  navigate('map');
  map.flyTo({center:[post.location.lng,post.location.lat],zoom:16.2,pitch:0,duration:800});
  communityLocationMarker?.remove();
  communityLocationMarker=new maplibregl.Marker({color:'#b262ad',scale:0.95})
    .setLngLat([post.location.lng,post.location.lat])
    .setPopup(new maplibregl.Popup({offset:22}).setText(`커뮤니티 게시글 · ${post.title}`))
    .addTo(map);
  communityLocationMarker.togglePopup();
}
async function updateLike(postId) {
  const shared=sharedCommunityPosts.find(p=>p.id===postId);if(shared){try{await setSharedCommunityLike(postId,!shared.liked);await refreshSharedCommunity();}catch(error){toast(error.message||'공감 등록 실패');}return;}
  const next=updateCommunityLike(communityPosts,postId);
  if(saveCommunity(next))renderCommunity();
}
async function submitCommunityComment(postId,formEl) {
  const input=formEl.querySelector('input');
  const body=input.value.trim();
  if(!body){toast('댓글을 입력해 주세요.');return;}
  if(sharedCommunityPosts.some(p=>p.id===postId)){if(communityModerationStatus?.ready===false){toast('공개 글 AI 검사를 준비 중입니다. 작성 내용은 유지됩니다.');return;}if(formEl.dataset.djPublishing==='true')return;formEl.dataset.djPublishing='true';const button=formEl.querySelector('button[type=submit]');if(button)button.disabled=true;try{const photo=formEl.communityPhoto||null;const outcome=await addSharedCommunityComment(postId,body,photo,formEl.communityParentId||null);communityReplyTo=null;const message=moderationMessage(outcome,'댓글');if(message)toast(message);await refreshSharedCommunity();}catch(error){toast(error.message||'댓글 등록 실패');}finally{delete formEl.dataset.djPublishing;if(button)button.disabled=false;}return;}
  const next=appendCommunityComment(communityPosts,postId,body);
  if(!next){toast('댓글은 게시글당 40개까지 등록할 수 있습니다.');return;}
  if(saveCommunity(next))renderCommunity();
}
function showCommunityReport(postId,commentId,anchor){if(anchor.querySelector('.community-report-form'))return;const form=makeCEl('form','community-report-form');const select=document.createElement('select');select.setAttribute('aria-label','신고 사유');for(const [value,label] of [...Object.entries(moderationReasons).filter(([k])=>!['uncertain','unavailable'].includes(k)),['other','기타']]){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);}const send=makeCEl('button','community-filter','신고 접수');send.type='submit';const close=communityButton('취소','community-filter',()=>form.remove());form.append(select,send,close);form.addEventListener('submit',async e=>{e.preventDefault();send.disabled=true;try{await reportSharedCommunity(postId,commentId,select.value);form.remove();toast('신고가 접수되었습니다.');}catch(err){toast(err.message);send.disabled=false;}});anchor.append(form);}
function renderCommunity() {
  const root=document.getElementById('community-list');if(!root)return;root.replaceChildren();
  // The always-present feed status was redundant with the controls and empty
  // state. Only report exceptional connection failures in the actual feed.
  if(communityCloudStatus.includes('연결 실패')){
    const error=makeCEl('p','dj-community-connection-error',communityCloudStatus);
    error.setAttribute('role','status');root.append(error);
  }
  const all=[...sharedCommunityPosts,...communityPosts];
  if(communityDetail&&!all.some(p=>p.id===communityDetail))communityDetail=null;
  const detail=Boolean(communityDetail);const panel=document.getElementById('participation-panel');if(panel)panel.dataset.communityDetail=String(detail);if(detail)root.append(communityButton('‹ 목록으로','community-back',()=>{communityDetail=null;communityReplyTo=null;renderCommunity();if(panel)panel.querySelector('.dj836-sheet-body').scrollTop=communityListScroll;}));
  const query=communitySearch.trim().toLowerCase();
  const dongFilter=document.getElementById('community-dong-filter')?.value||'';
  let shown=all.filter(p=>detail?p.id===communityDetail:(communitySavedOnly?Boolean(p.bookmarked):!p.bookmarkOnly)&&(communityFilter==='전체'||p.category===communityFilter)&&(!dongFilter||p.dong===dongFilter)&&(!query||(p.title+' '+p.body).toLowerCase().includes(query)));
  if(document.getElementById('community-sort')?.value==='popular')
    shown=shown.sort((a,b)=>(b.likes||0)-(a.likes||0)||b.created-a.created);
  else shown=shown.sort((a,b)=>b.created-a.created);
  if(!shown.length){
    const loading=communityCloudStatus.includes('확인 중');
    const offline=communityCloudStatus.includes('연결 실패');
    const filtered=Boolean(all.length||communitySavedOnly||query||dongFilter||communityFilter!=='전체');
    const empty=makeCEl('section','dj-community-empty-state');
    empty.setAttribute('aria-label','커뮤니티 게시판 상태');
    empty.append(makeCEl('h3','dj-community-empty-title',loading?'동네 이야기를 불러오는 중입니다':offline?'공유 게시판 연결을 확인해 주세요':filtered?'조건에 맞는 게시글이 없습니다':'아직 게시글이 없습니다'));
    empty.append(makeCEl('p','dj-community-empty-copy',loading?'공개 게시글을 확인하고 있습니다.':offline?'공개 게시판에 연결하지 못했습니다. 이 기기의 글은 그대로 보관됩니다.':filtered?'검색어·분류를 변경하거나 전체 글을 확인해 주세요.':'동네의 보행 불편이나 개선 아이디어를 첫 글로 남겨 주세요.'));
    const actions=makeCEl('div','dj-community-empty-actions');
    if(filtered&&!loading){
      actions.append(communityButton('전체 게시글 보기','dj-community-empty-primary',()=>{
        communityFilter='전체';communitySearch='';communitySavedOnly=false;communityDetail=null;
        document.getElementById('community-search').value='';
        document.getElementById('community-dong-filter').value='';
        document.getElementById('community-saved-toggle').setAttribute('aria-pressed','false');
        for(const chip of document.querySelectorAll('.community-filter[data-community-filter]')){
          const selected=chip.dataset.communityFilter==='전체';
          chip.classList.toggle('active',selected);chip.setAttribute('aria-pressed',String(selected));
        }
        renderCommunity();
      }));
    }
    // The persistent + 글쓰기 action already opens the same composer.
    // A second identical call-to-action made the empty state look crowded.
    if(loading||offline||filtered)actions.append(communityButton(loading?'새로고침':'공개 글 다시 확인','dj-community-empty-secondary',()=>refreshSharedCommunity()));
    if(actions.childElementCount)empty.append(actions);
     root.append(empty);
    return;
  }
  for (const post of shown) {
    const card=makeCEl('article',detail?'community-post community-post-detail':'community-post community-post-preview');
    const header=makeCEl('div','community-post-head');
    const cat=makeCEl('span','community-post-category',post.category);
    const meta=makeCEl('span','community-post-meta',`${post.nickname} · ${formatCommunityDate(post.created)}${post.shared?' · 공개':' · 내 기기'}`);
    header.append(cat);if(post.dong)header.append(makeCEl('span','community-post-dong',post.dong));header.append(meta);
    card.append(header);if(!detail){const open=communityButton(post.title,'community-post-title community-open-detail',()=>{const sc=document.querySelector('#participation-panel>.dj836-sheet-body');communityListScroll=sc?.scrollTop||0;communityDetail=post.id;communityReplyTo=null;renderCommunity();if(sc)sc.scrollTop=0;});card.append(open,makeCEl('p','community-post-body',post.body));if(post.photo){const img=document.createElement('img');img.className='community-feed-thumb';img.src=post.photo;img.alt='첨부 사진';img.loading='lazy';card.append(img);}const mini=makeCEl('p','community-summary-count',`공감 ${post.likes||0} · 댓글 ${post.comments?.length||0}${post.photo?' · 사진':''}${post.location?' · 위치':''}`);card.append(mini);root.append(card);continue;}card.append(makeCEl('h4','community-post-title',post.title),makeCEl('p','community-post-body',post.body));
    if(post.photo){
      const img=document.createElement('img');img.className='community-post-image';
      img.src=post.photo;img.loading='lazy';img.alt='게시글 첨부 사진';card.append(img);
    }
    if(post.location){
      card.append(communityButton('⌖ 지도에서 위치 보기','community-location-link',()=>showCommunityLocation(post)));
    }
    const actions=makeCEl('div','community-post-actions');
    actions.append(communityButton(`${post.liked?'♥':'♡'} 공감 ${post.likes||0}`,`community-like${post.liked?' liked':''}`,()=>updateLike(post.id)));
    const commentsArea=makeCEl('div','community-comments');
    const commentButton=communityButton(`댓글 ${post.comments?.length||0}`,'community-comment-toggle',()=>{
      commentsArea.hidden=!commentsArea.hidden;
    });
    actions.append(commentButton);
    if(post.shared){actions.append(communityButton(post.bookmarked?'저장 해제':'저장','community-bookmark',async()=>{try{await setSharedCommunityBookmark(post.id,!post.bookmarked);await refreshSharedCommunity();toast(post.bookmarked?'저장한 글에서 제외했습니다.':'게시글을 저장했습니다.');}catch(e){toast(e.message);}}));actions.append(communityButton('신고','community-report',()=>showCommunityReport(post.id,null,card)));actions.append(communityButton('공유','community-share',async()=>{const target=new URL(location.href);target.hash='community='+post.id;try{if(navigator.share){await navigator.share({title:post.title,url:target.href});}else{await navigator.clipboard.writeText(target.href);toast('게시글 링크를 복사했습니다.');}}catch(e){if(e?.name!=='AbortError')toast('공유하지 못했습니다.');}}));}
    if(!post.shared||post.mine)actions.append(communityButton('삭제','community-post-delete',async()=>{
      if(!window.confirm(post.shared?'공개 게시글과 댓글을 삭제하시겠습니까?':'이 기기에 저장된 게시글과 댓글을 삭제하시겠습니까?'))return;
      if(post.shared){try{await deleteSharedCommunityPost(post.id);await refreshSharedCommunity();toast('게시글을 삭제했습니다.');}catch(error){toast(error.message||'삭제 실패');}return;}
      const next=communityPosts.filter(p=>p.id!==post.id);
      if(saveCommunity(next)){renderCommunity();toast('게시글을 삭제했습니다.');}
    }));
    card.append(actions);
    commentsArea.hidden=false;
    const orderedComments=(post.comments||[]).filter(c=>!c.parentId).flatMap(c=>[c,...(post.comments||[]).filter(x=>x.parentId===c.id)]);for(const comment of [...orderedComments,...(post.comments||[]).filter(c=>!orderedComments.includes(c))]){
      const row=makeCEl('div',comment.parentId?'community-comment-row community-comment-reply':'community-comment-row');
      row.append(makeCEl('b','',comment.nickname||'익명 주민'),makeCEl('p','',comment.body),makeCEl('small','',formatCommunityDate(comment.created)));
      if(comment.photo){const img=document.createElement('img');img.className='community-post-image';img.src=comment.photo;img.alt='댓글 첨부 사진';img.loading='lazy';row.append(img);}if(post.shared){if(!comment.parentId)row.append(communityButton('답글','community-reply-button',()=>{communityReplyTo=comment;commentForm.communityParentId=comment.id;replyLabel.hidden=false;replyLabel.firstChild.textContent=(comment.nickname||'익명 주민')+'님에게 답글';input.placeholder='답글을 입력하세요';input.focus();}));row.append(communityButton('신고','community-report',()=>showCommunityReport(post.id,comment.id,row)));}commentsArea.append(row);
    }
    const commentForm=makeCEl('form','community-comment-form');
    const input=document.createElement('input');input.type='text';input.required=true;input.maxLength=300;input.placeholder='댓글을 입력하세요';input.setAttribute('aria-label','댓글 입력');
    const send=makeCEl('button','community-comment-submit', '등록');send.type='submit';
    const replyLabel=makeCEl('div','community-reply-label');replyLabel.append(makeCEl('span','',communityReplyTo?(communityReplyTo.nickname||'익명 주민')+'님에게 답글':''),communityButton('취소','community-reply-button',()=>{communityReplyTo=null;commentForm.communityParentId=null;replyLabel.hidden=true;input.placeholder='댓글을 입력하세요';}));replyLabel.hidden=!communityReplyTo;commentForm.communityParentId=communityReplyTo?.id||null;commentsArea.append(replyLabel);
    commentForm.append(input,send);if(post.shared){const file=document.createElement('input');file.type='file';file.accept='image/jpeg,image/png,image/webp';file.hidden=true;const attach=communityButton('사진','community-comment-photo',()=>file.click());file.addEventListener('change',async()=>{try{if(file.files?.[0]){commentForm.communityPhoto=await compressPhoto(file.files[0]);attach.textContent='사진 첨부됨';}}catch{toast('사진을 첨부하지 못했습니다.');}finally{file.value='';}});commentForm.append(attach,file);}
    commentForm.addEventListener('submit',e=>{e.preventDefault();submitCommunityComment(post.id,commentForm);});
    if(post.shared)commentsArea.append(makeCEl('small','community-form-note','공개 댓글은 텍스트와 첨부 사진을 AI로 검사합니다.'));commentsArea.append(commentForm);card.append(commentsArea);root.append(card);
  }
}
const bookmarkButton = document.getElementById('bookmark-point');
bookmarkButton.addEventListener('click',() => {
  const p=points.find(x=>x.id===openedPointId);
  if(!p)return;
  const was=!!p.favorite;p.favorite=!was;
  if(!writePoints()) {p.favorite=was;return;}
  bookmarkButton.textContent=p.favorite?'★ 관심 지점 저장됨':'☆ 관심 지점으로 저장';
  toast(p.favorite?'관심 지점에 추가했습니다.':'관심 지점에서 제외했습니다.');
});
navigate('map');
if(['route','participate','news','mine'].includes(themeReloadState?.tab))map.once('load',()=>requestAnimationFrame(()=>navigate(themeReloadState.tab)));
function openActivityPost(id){if(navMode==='gps')return;communityDeepLink=id;navigate('participate');}
window.addEventListener('dongjak:open-community-post',e=>{if(e.detail?.id)openActivityPost(e.detail.id);});
installCommunityActivity({openPost:openActivityPost});
const sharedCommunityId=location.hash.match(/^#community=([0-9a-f-]{36})$/i)?.[1];if(sharedCommunityId){communityDeepLink=sharedCommunityId;navigate('participate');}
function openCommunityNoticesFromPush(){navigate('participate');const panel=document.getElementById('community-notifications');panel.hidden=false;void refreshCommunityNotices();}
if(location.hash==='#community-notices')openCommunityNoticesFromPush();
navigator.serviceWorker?.addEventListener('message',event=>{if(event.data?.kind==='community-notice-open')openCommunityNoticesFromPush();});
void refreshCommunityNotices();window.setInterval(()=>{if(document.visibilityState==='visible')void refreshCommunityNotices();},60000);



// ═════════════════════════════════════════════════════════════
// v13: 도보 길찾기 (Valhalla pedestrian route)
// 테스트 서버는 이용량 제한이 있고 발표용 프로토타입에서만 사용합니다.
// 개발 Vite 프록시는 CORS를 해결하며, 앱 배포에는 별도 경로 서비스가 필요합니다.
// ═════════════════════════════════════════════════════════════
function emptyWalkingRoute() {
  return {type:'FeatureCollection',features:[]};
}
let priRouteReviewSequence=0,priVariantChosenManually=false;
const priMapNote=document.createElement('p');
priMapNote.id='dj-pri-route-advice';
priMapNote.className='dj-pri-route-advice';
priMapNote.setAttribute('role','status');
priMapNote.hidden=true;
document.getElementById('route-map-card')?.append(priMapNote);
const priEditorNote=document.createElement('p');
priEditorNote.id='dj-pri-route-editor-advice';
priEditorNote.className='dj-pri-route-advice';
priEditorNote.hidden=true;
document.getElementById('route-summary')?.append(priEditorNote);
function showPriRouteAdvice(result){
  const explain=entry=>entry?.risk===null||!entry?'자료 없음':
    entry.risk.toFixed(1)+'점 · 경로 중 관측 '+Math.round(entry.coverage*100)+'% · 평균 '+entry.observedFactorsMean+'/6 지표';
  const text=!result
    ? '종합 PRI 자료를 확인하지 못했습니다. 이 경로에 안전도 평가가 적용되지 않았습니다.'
    : result.recommendation
    ? '상도1동 종합 PRI 비교(연구용): '+(result.recommendation==='standard'?'일반 보행':'경사 회피')+
      ' 후보의 관측 구간 위험점수가 더 낮습니다. 일반 '+explain(result.standard)+' / 경사 '+explain(result.gentle)+
      '. 실제 통행 위험·안전은 보증하지 않습니다.'
    : '종합 PRI 경로 비교 보류: '+(result.reason==='same-route'?'동일한 경로입니다.':
      result.reason==='similar-risk'?'두 후보의 관측 점수 차이가 작습니다.':
      result.reason==='excessive-detour'?'위험점수가 낮은 후보가 25% 넘게 우회하므로 자동 추천하지 않습니다.':
      '두 경로의 조사범위가 부족하거나 서로 달라 공정하게 비교할 수 없습니다.')+
      ' 일반 '+explain(result.standard)+' / 경사 '+explain(result.gentle)+
      '. 미평가 도로는 안전한 도로로 계산하지 않습니다.';
  const shortText=result?.recommendation
    ? 'PRI 연구용 상대 저위험 후보: '+(result.recommendation==='standard'?'일반 보행':'경사 회피')+
      ' · 관측 위험도 '+result[result.recommendation].risk.toFixed(1)+'점 · 관측 구간 '+Math.round(result[result.recommendation].coverage*100)+'%'
    : '종합 PRI 경로 비교 보류 · 평가된 구간이 부족하거나 비교 근거가 충분하지 않습니다.';
  priMapNote.textContent=shortText;priMapNote.hidden=false;
  priEditorNote.textContent=text;priEditorNote.hidden=false;
}
function clearPriRouteAdvice(){
  priRouteReviewSequence++;priVariantChosenManually=false;
  for(const node of [priMapNote,priEditorNote]){node.textContent='';node.hidden=true;}
}
function lockRouteMapGestures(locked){
  if(locked&&savedNavGestureState===null){
    savedNavGestureState=NAV_GESTURE_NAMES.map(name=>{
      const control=map?.[name];
      const enabled=typeof control?.isEnabled==='function'&&control.isEnabled();
      if(enabled)control.disable();
      return {control,enabled};
    });
  }else if(!locked&&savedNavGestureState!==null){
    for(const {control,enabled} of savedNavGestureState)
      if(enabled&&typeof control?.enable==='function')control.enable();
    savedNavGestureState=null;
  }
}
function syncRoutePresentation() {
  const onMap = app.dataset.tab === 'map';
  const picking = Boolean(routePickMode) && onMap;
  const preview = Boolean(routeResult) && onMap && !picking && !navMode && app.dataset.djWalkArrived!=='1';
  const guiding = Boolean(routeResult) && Boolean(navMode) && onMap;
  app.classList.toggle('route-picking',picking);
  app.classList.toggle('route-preview',preview || guiding);
  app.classList.toggle('route-guiding',guiding);
  lockRouteMapGestures(false);
  document.getElementById('nav-map-controls').hidden=!guiding;
  document.getElementById('route-pick-hint').hidden=!picking;
  document.getElementById('route-map-card').hidden=!preview;
  document.getElementById('nav-live-card').hidden=!guiding;
  syncPriRouteLine();
  if (picking) {
    document.getElementById('route-pick-text').textContent = routePickMode==='start'
      ? '지도에서 출발지를 선택하세요.' : routePickMode==='waypoint'
      ? '지도에서 경유지를 선택하세요.' : '지도에서 목적지를 선택하세요.';
    showOverview();
  }
  if (preview || guiding) {
    overview.hidden=true;
    detail.hidden=true;
    editor.hidden=true;
    const metric=readRouteMetrics();
    document.getElementById('route-map-metrics').textContent = `${metric.duration} · ${metric.distance}`;
    const pri=routeResult?.priExposure;
    const priInfo=pri?.risk!==null && pri?.coverage>=0.65
      ? '종합 PRI 부분평가 '+pri.risk.toFixed(1)+'점 · 구간 관측 '+Math.round(pri.coverage*100)+'%'
      : 'PRI 위험도 미평가';
    document.getElementById('route-map-source').textContent=(routeResult?.source==='seoul-pedestrian-graph'
      ? '서울시 도보 네트워크' : '외부 보행경로 서버')+' · '+priInfo;
  } else if (onMap && !picking && detail.hidden && editor.hidden && app.dataset.djSafetyHomeOnly!=='1') {
    showOverviewOnlyWithContent();
  }
}
function presentRouteLabel(p) {
  return p ? p.label : '선택되지 않음';
}
function updateRouteCalcAvailability(){
  const btn=document.getElementById('route-calc');if(!btn)return;
  const mobile=window.matchMedia('(max-width:699px)').matches;
  btn.disabled=routeRequestPending||Boolean(mobile&&(!routeStart||!routeEnd));
  if(mobile&&(!routeStart||!routeEnd))btn.setAttribute('aria-label','출발지와 목적지를 먼저 지정해 주세요');
  else btn.removeAttribute('aria-label');
}
function updateRouteLabels() {
  document.getElementById('route-start-label').textContent=presentRouteLabel(routeStart);
  document.getElementById('route-end-label').textContent=presentRouteLabel(routeEnd);
  // Reset is meaningful only after the user has actually selected a location.
  // Keeping it on the empty route screen adds a purposeless white button.
  const clear=document.getElementById('route-clear');
  if(clear)clear.hidden=!(routeStart||routeEnd||routeResult||routeWaypoints.length);
  updateRouteCalcAvailability();
}
function makeRouteMarker(position, color) {
  return new maplibregl.Marker({color,scale:0.95}).setLngLat([position.lng,position.lat]).addTo(map);
}
function drawRouteMarkers() {
  routeStartMarker?.remove();routeEndMarker?.remove();
  routeStartMarker=routeStart ? makeRouteMarker(routeStart,'#2563eb') : null;
  routeEndMarker=routeEnd ? makeRouteMarker(routeEnd,'#0ba876') : null;
}
function clearTransitPreview(){
  const empty={type:'FeatureCollection',features:[]};
  for(const id of ['dj815-transit-walk','dj815-transit-rail']){
    try{map.getSource(id)?.setData(empty);}catch{}
  }
}
function syncPriRouteLine(){
  const source=map.getSource('walking-route-pri');
  const measured=routePriVisuals?.[selectedRouteVariant];
  const enabled=Boolean(routeResult?.coords?.length>=2&&app.dataset.tab==='map'&&!navMode);
  // Before PRI completes, or when no six-factor data can be loaded, the route
  // is unassessed (dashed gray), NEVER automatically safe/green or blue.
  const unknown=enabled?{
    type:'FeatureCollection',features:[{
      type:'Feature',properties:{tone:'unknown',color:'#8c969c',observed:false},
      geometry:{type:'LineString',coordinates:routeResult.coords}
    }]
  }:emptyWalkingRoute();
  if(source)source.setData(enabled&&measured?.features?.length?measured:unknown);
  for(const id of ['walking-route-pri-colors','walking-route-pri-unknown']){
    if(map.getLayer(id)){
      map.setLayoutProperty(id,'visibility',enabled?'visible':'none');
      // showRouteLine() raises the native white route outline: the PRI
      // segments MUST be raised after it or white hides the risk colors.
      if(enabled)map.moveLayer(id);
    }
  }
  // Compare one real candidate at a time; otherwise the legacy release-only
  // third mode could draw a green alternative that was NOT scored by PRI.
  // Users switch the native candidate buttons to see each measured line.
  if(map.getLayer('walking-route-alternate-line'))
    map.setLayoutProperty('walking-route-alternate-line','visibility',enabled||navMode?'none':'visible');
  if(map.getLayer('walking-route-line'))map.setPaintProperty('walking-route-line','line-opacity',enabled?0:1);
}
function showRouteLine(coords) {
  const src=map.getSource('walking-route');
  if(src)src.setData(lineFeature(coords));
  if(coords?.length>=2){for(const id of ['walking-route-alternate-line','walking-route-outline','walking-route-traveled-line','walking-route-line']){if(map.getLayer(id)){map.setLayoutProperty(id,'visibility','visible');map.moveLayer(id);}}}
  const other=selectedRouteVariant==='standard'?'gentle':'standard';
  const alternative=map.getSource('walking-route-alternative');
  if(alternative)alternative.setData(coords?.length?lineFeature(routeVariants[other]?.coords):emptyWalkingRoute());
  const gray=map.getSource('walking-route-traveled');
  if(gray)gray.setData(emptyWalkingRoute());
  syncPriRouteLine();
}
function lineFeature(coords){
  return coords?.length>=2
    ? {type:'FeatureCollection',features:[{type:'Feature',properties:{},geometry:{type:'LineString',coordinates:coords}}]}
    : emptyWalkingRoute();
}
function paintRouteProgress(progressMeters){
  if(!navIndex)return;
  const parts=splitRoute(navIndex,progressMeters);
  const pending=map.getSource('walking-route');
  const finished=map.getSource('walking-route-traveled');
  if(pending)pending.setData(lineFeature(parts.remaining));
  if(finished)finished.setData(lineFeature(parts.traveled));
}
function invalidateRoute() {
  routePriVisuals=null;
  clearTransitPreview();
  stopNavigation();
  routeResult = null;
  clearPriRouteAdvice();
  routeVariants = {standard:null,gentle:null};
  document.getElementById('route-variants').hidden=true;
  showRouteLine(null);
  document.getElementById('route-summary').hidden=true;
  document.getElementById('route-status').textContent='위치를 확인한 뒤 경로 찾기를 눌러주세요.';
  syncRoutePresentation();
}
function routeLocationInside(position){
  if(position?.lng==null||position?.lat==null)return false;
  const lng=Number(position.lng),lat=Number(position.lat);
  return Number.isFinite(lng)&&Number.isFinite(lat)?isDongjak(lng,lat):false;
}
function requireDongjakRouteLocation(position){
  const inside=routeLocationInside(position);
  if(inside!==true){
    if(typeof window!=='undefined'&&typeof CustomEvent!=='undefined'){
      window.dispatchEvent(new CustomEvent('dongjak:route-boundary-denied',{detail:{unavailable:inside===null}}));
    }else{
      toast(inside===null?'동작구 경계정보를 불러오지 못했습니다. 동작구 내 영역을 선택해주세요.':'동작구 내 영역을 선택해주세요.');
    }
    return false;
  }
  return true;
}
async function resolveRouteAddress(position){
  try{const q=new URLSearchParams({lat:String(position.lat),lon:String(position.lng)});const response=await fetch('/api/reverse-address?'+q,{signal:AbortSignal.timeout(6500)});if(!response.ok)return;const data=await response.json();if(typeof data.address==='string'&&data.address){position.label=data.address;position.name=data.address;if(position===routeStart||position===routeEnd)updateRouteLabels();if(routeWaypoints.includes(position))routeProductTools?.setWaypoints(routeWaypoints);}}catch{}
}
function setRouteLocation(which,position) {
  if(!requireDongjakRouteLocation(position))return false;
  if (which==='start') routeStart=position;
  else routeEnd=position;
  invalidateRoute();
  drawRouteMarkers();
  updateRouteLabels();
  if(position.resolveAddress)void resolveRouteAddress(position);
  return true;
}
// UI-only swap request; route state, markers and invalidation stay here.
window.addEventListener('dongjak:route-swap',()=>{
  if(navMode){toast('안내를 종료한 뒤 방향을 바꿔 주세요.');return;}
  if(!routeStart&&!routeEnd)return;
  const previousStart=routeStart;
  routeStart=routeEnd;routeEnd=previousStart;
  invalidateRoute();
  drawRouteMarkers();
  updateRouteLabels();
  toast('출발지와 목적지를 바꿨습니다.');
});
window.addEventListener('dongjak:route-select',event=>{
  const {which,place}=event.detail||{};
  if(!['start','end'].includes(which)||!Number.isFinite(Number(place?.lng))||!Number.isFinite(Number(place?.lat)))return;
  closeTransportPanel(false);
  closeTransitRouteConfirmation();
  routePickMode=null;
  const label=String(place.name||'선택한 시설');
  if(!setRouteLocation(which,{name:label,label,lng:Number(place.lng),lat:Number(place.lat),kind:'place'}))return;
  navigate('route');
  toast(which==='start'?`${label}을(를) 출발지로 지정했습니다.`:`${label}을(를) 목적지로 지정했습니다.`);
});
function describeTransitPlace(place) {
  const name=String(place?.name||'교통시설').trim();
  const info=place?.kind==='bus' ? (place.arsId ? ` · ARS ${place.arsId}` : ' · 버스정류장')
    : (place?.lines?.length ? ` · ${place.lines.join('·')}` : ' · 지하철역');
  return `${name}${info}`;
}
function transitAtMapClick(point,lngLat) {
  // 역·정류장 레이어의 픽셀 근처에서 실제 표시된 feature만 확인합니다.
  // 이름이 비슷하지만 다른 방향의 버스정류장을 잘못 선택하지 않게
  // 클릭 지점과 가장 가까운 좌표의 마커를 우선합니다.
  const available = [
    'transport-subway-names','transport-subway-station','transport-subway-station-shadow',
    'transport-bus-stop','transport-bus-names','poi_transit'
  ].filter(id=>map.getLayer(id));
  if(!available.length || !point)return null;
  const features=map.queryRenderedFeatures(
    [[point.x-13,point.y-13],[point.x+13,point.y+13]],{layers:available}
  );
  const matches=[];
  for(const feature of features){
    const props=feature.properties||{};
    let place=null;
    if(String(feature.layer?.id||'').startsWith('transport-')){
      const coordinates=feature.geometry?.coordinates;
      const lng=Number(coordinates?.[0]),lat=Number(coordinates?.[1]);
      const kind=props.kind;
      if((kind==='bus'||kind==='subway') && Number.isFinite(lng)&&Number.isFinite(lat)){
        place={name:String(props.name||'정류장'),lng,lat,kind,arsId:String(props.arsId||''),
          lines:String(props.lines||'').split(',').map(x=>x.trim()).filter(Boolean)};
      }
    } else if(feature.layer?.id==='poi_transit') place=baseMapTransitPlace(feature,lngLat);
    if(!place)continue;
    const xy=map.project([place.lng,place.lat]);
    const distance=Math.hypot(xy.x-point.x,xy.y-point.y);
    matches.push({place,distance});
  }
  matches.sort((a,b)=>a.distance-b.distance);
  return matches[0]?.place||null;
}
function showTransitRouteConfirmation(place) {
  if(!requireDongjakRouteLocation(place))return;
  immersiveChrome.restore();
  closeTransitRouteConfirmation();
  routeTransitCandidate=place;
  routeCandidateMarker=new maplibregl.Marker({color:'#ec6d35',scale:1.05})
    .setLngLat([place.lng,place.lat]).addTo(map);
  const panel=document.getElementById('route-transit-confirm');
  document.getElementById('route-transit-confirm-name').textContent=place.name;
  document.getElementById('route-transit-confirm-desc').textContent=place.kind==='bus'
    ? (place.arsId?`버스정류장 · ARS ${place.arsId}. 정류장명과 번호를 확인해 주세요.`:'버스정류장 · 지도의 표시 위치가 맞는지 확인해 주세요.')
    : place.kind==='subway'?'지하철역 · 역명과 호선을 확인해 주세요.'
    : `${place.address||'지도에서 선택한 위치'} · 이곳이 맞습니까?`;
  const tags=document.getElementById('route-transit-confirm-lines');
  tags.replaceChildren();
  for(const line of place.lines||[]){
    const chip=document.createElement('span');chip.className='route-confirm-line';chip.textContent=line;
    chip.style.setProperty('--route-line-color',subwayLineColor(line));tags.append(chip);
  }
  document.getElementById('route-transit-accept').textContent=routePickMode==='start'?'여기서 출발':routePickMode==='waypoint'?'경유지 추가':'여기로 도착';
  panel.hidden=false;
}
// Some HTML-based facility pins stop the map click from reaching the route
// picker. In route selection mode they should open the ordinary route candidate
// confirmation instead of their facility details popup.
window.addEventListener('dongjak:route-map-place',event=>{
  if(!routePickMode||!document.getElementById('route-transit-confirm')?.hidden)return;
  const name=String(event.detail?.name||'선택한 장소');
  const lng=Number(event.detail?.lng),lat=Number(event.detail?.lat);
  if(!Number.isFinite(lng)||!Number.isFinite(lat))return;
  showTransitRouteConfirmation({kind:'point',source:'facility',name,lng,lat,lines:[]});
});

function closeTransitRouteConfirmation() {
  document.getElementById('route-transit-confirm').hidden=true;
  routeCandidateMarker?.remove();routeCandidateMarker=null;
  routeTransitCandidate=null;
}
function closeRouteSearch(){
  routeSearchController?.abort();routeSearchController=null;routeSearchSequence++;
  document.getElementById('route-place-search').hidden=true;
  document.getElementById('route-search-confirm').hidden=true;
  routeSearchTarget=null;routeSearchCandidate=null;
}
function beginRouteSearch(which){
  closeRouteSearch();
  routeSearchTarget=which;
  document.getElementById('route-place-search').hidden=false;
  document.getElementById('route-search-title').textContent=which==='start'?'출발지 검색':which==='waypoint'?'경유지 검색':'목적지 검색';
  document.getElementById('route-search-results').replaceChildren();
  document.getElementById('route-search-status').textContent='서울·동작구 내 역명, 정류장명, 장소명 또는 주소를 입력하세요.';
  document.getElementById('route-search-query').value='';
  document.getElementById('route-search-submit').disabled=false;
  paintRecentRouteSearch();
  if(app.dataset.djRouteScreenV3!=='1')document.getElementById('route-search-query').focus();
}
function chooseSearchResult(place){
  const which=routeSearchTarget;
  if(!which||!Number.isFinite(place.lng)||!Number.isFinite(place.lat))return;
  if(!requireDongjakRouteLocation(place))return;
  recordRecentPlace(place);
  // A validated search result fills the pending inline waypoint; map picking
  // retains its explicit coordinate confirmation.
  if(which==='waypoint'){
    if(navMode||routeWaypoints.length>=5)return;
    const label=String(place.name||place.address||'선택한 장소');
    routeWaypoints.push({name:label,label,lng:place.lng,lat:place.lat});
    invalidateRoute();routeProductTools?.setWaypoints(routeWaypoints);
    closeRouteSearch();navigate('route');toast('경유지를 추가했습니다.');
    return;
  }
  const label=String(place.name||place.address||'선택한 장소');
  if(!setRouteLocation(which,{lng:place.lng,lat:place.lat,label,kind:place.kind||'place'}))return;
  closeRouteSearch();
  map.flyTo({center:[place.lng,place.lat],zoom:15.5,duration:480});
  navigate('route');
  toast(which==='start'?'출발지가 설정됐습니다.':'목적지가 설정됐습니다.');
}
window.addEventListener('dongjak:route-recent-pick',event=>{if(navMode||app.dataset.tab!=='route')return;beginRouteSearch('end');chooseSearchResult(event.detail);});
function paintRecentRouteSearch(){
  const places=recentPlaces(),queries=recentSearchQueries();
  paintRouteSearchResults(places,places.length||queries.length?'최근 검색 기록':'서울·동작구 내 역명, 정류장명, 장소명 또는 주소를 입력하세요.');
  if(!places.length&&!queries.length)return;
  const results=document.getElementById('route-search-results');
  const tools=document.createElement('div');tools.className='dj-recent-search-tools';
  const clear=document.createElement('button');clear.type='button';clear.textContent='기록 삭제';clear.addEventListener('click',()=>{clearRecentPlaces();paintRecentRouteSearch();});tools.append(clear);
  for(const q of queries.filter(q=>!places.some(p=>p.name===q))){const b=document.createElement('button');b.type='button';b.textContent=q;b.addEventListener('click',()=>{document.getElementById('route-search-query').value=q;recordSearchQuery(q);document.getElementById('route-search-form').requestSubmit();});tools.append(b);}
  results.prepend(tools);
}
function routeLocalMatches(query){
  return mergeRouteSearchResults(query,routeStationMatches(query),searchCachedTransportPlaces(query),
    searchLocalPlaces(query),cachedOfficialSearchPlaces(query));
}
function paintRouteSearchResults(matches,message){
  const results=document.getElementById('route-search-results');
  results.replaceChildren();
  const allowed=matches.filter(p=>routeLocationInside(p)===true);
  document.getElementById('route-search-status').textContent=!boundaryGeometry?'동작구 경계정보를 확인하는 중입니다.':allowed.length!==matches.length?(allowed.length?`동작구 내 검색 결과 ${allowed.length}개`:'동작구 내 검색 결과가 없습니다.'):message;
  for(const place of allowed){
    const button=document.createElement('button');button.type='button';button.className='route-search-item';
    const head=document.createElement('strong');head.textContent=place.name;
    const hint=document.createElement('small');hint.textContent=routeResultSubtitle(place);
    button.append(head,hint);
    button.addEventListener('click',()=>chooseSearchResult(place));
    results.append(button);
  }
}
document.getElementById('route-search-query').addEventListener('input',()=>{
  if(!routeSearchTarget)return;
  routeSearchController?.abort();routeSearchController=null;routeSearchSequence++;
  document.getElementById('route-search-submit').disabled=false;
  const query=document.getElementById('route-search-query').value.trim();
  if(!query){paintRecentRouteSearch();return;}
  const local=query.length>=2?routeLocalMatches(query):[];
  paintRouteSearchResults(local,query.length<2?'장소명 또는 주소를 2글자 이상 입력해 주세요.':
    local.length?`검색 결과 ${local.length}개 · 추가 검색 중`:'장소를 검색하고 있습니다…');
});
async function runRouteSearch(event){
  event.preventDefault();
  if(!routeSearchTarget)return;
  const query=document.getElementById('route-search-query').value.trim();
  routeSearchController?.abort();routeSearchController=new AbortController();
  const controller=routeSearchController;
  const seq=++routeSearchSequence;
  document.getElementById('route-search-confirm').hidden=true;
  routeSearchCandidate=null;
  if(query.length<2||query.length>80){paintRouteSearchResults([],'장소명 또는 주소를 2~80자로 입력해 주세요.');document.getElementById('route-search-submit').disabled=false;return;}
  if(event.isTrusted&&app.dataset.djRouteScreenV3!=='1')recordSearchQuery(query);
  const local=routeLocalMatches(query);
  paintRouteSearchResults(local,local.length?`검색 결과 ${local.length}개 · 추가 검색 중`:'장소를 검색하고 있습니다…');
  document.getElementById('route-search-submit').disabled=true;
  // Official index and general geocoder are independent. Preserve immediate
  // local rail/facility results even when either provider is unavailable.
  const signal=controller.signal;
  const officialController=new AbortController();
  const cancelOfficial=()=>officialController.abort();
  signal.addEventListener('abort',cancelOfficial,{once:true});
  const timeout=setTimeout(cancelOfficial,3500);
  try{
    const [official,remote]=await Promise.allSettled([
      queryOfficialPlaces(query,{signal:officialController.signal,remoteFallback:false}),
      searchPlaces(query,{signal,includeRemote:true})
    ]);
    if(signal.aborted||seq!==routeSearchSequence)return;
    const matches=mergeRouteSearchResults(query,local,official.status==='fulfilled'?official.value:[],remote.status==='fulfilled'?remote.value:[]);
    const partial=official.status==='rejected'||remote.status==='rejected';
    paintRouteSearchResults(matches,matches.length?`검색 결과 ${matches.length}개${partial?' · 일부 외부 결과를 불러오지 못했습니다.':''}`:
      partial?'검색 결과가 없습니다. 연결 상태를 확인하거나 지도에서 선택하세요.':'검색 결과가 없습니다. 다른 장소명 또는 주소를 입력하세요.');
  }finally{
    clearTimeout(timeout);signal.removeEventListener('abort',cancelOfficial);
    if(seq===routeSearchSequence)document.getElementById('route-search-submit').disabled=false;
  }
}
document.getElementById('route-search-start').addEventListener('click',()=>beginRouteSearch('start'));
document.getElementById('route-search-end').addEventListener('click',()=>beginRouteSearch('end'));
document.getElementById('route-search-close').addEventListener('click',closeRouteSearch);
document.getElementById('route-search-form').addEventListener('submit',runRouteSearch);
document.getElementById('route-search-back').addEventListener('click',()=>{document.getElementById('route-search-confirm').hidden=true;routeSearchCandidate=null;});
document.getElementById('route-search-accept').addEventListener('click',()=>{
  if(!routeSearchCandidate||!routeSearchTarget)return;
  const {lng,lat,name}=routeSearchCandidate;
  const which=routeSearchTarget;
  if(!setRouteLocation(which,{lng,lat,label:name}))return;
  map.flyTo({center:[lng,lat],zoom:15,duration:600});
  closeRouteSearch();
  toast(which==='start'?'검색한 출발지를 지정했습니다.':'검색한 목적지를 지정했습니다.');
});
document.getElementById('route-transit-retry').addEventListener('click',closeTransitRouteConfirmation);
document.getElementById('route-transit-accept').addEventListener('click',()=>{
  if(!routeTransitCandidate||!routePickMode)return;
  const place=routeTransitCandidate;
  if(!requireDongjakRouteLocation(place))return;
  const which=routePickMode;
  closeTransitRouteConfirmation();
  routePickMode=null;
  const label=place.kind==='point'
    ?(['search','facility'].includes(place.source) ? place.name : (place.address||'지도에서 선택한 위치'))
    :describeTransitPlace(place);
  if(which==='waypoint'){
    if(navMode){toast('안내 중에는 경유지를 추가할 수 없습니다. 안내를 먼저 종료해 주세요.');navigate('route');return;}
    if(routeWaypoints.length>=5){toast('경유지는 최대 5곳입니다.');navigate('route');return;}
    const waypoint={name:label,lng:place.lng,lat:place.lat,label};routeWaypoints.push(waypoint);if(place.kind==='point'&&!['search','facility'].includes(place.source))void resolveRouteAddress(waypoint);
    invalidateRoute();
    routeProductTools?.setWaypoints(routeWaypoints);
    navigate('route');toast('경유지를 추가했습니다.');return;
  }
  if(!setRouteLocation(which,{lng:place.lng,lat:place.lat,label,resolveAddress:place.kind==='point'&&!['search','facility'].includes(place.source)}))return;
  navigate('route');
  toast(which==='start'?'선택한 위치를 출발지로 확정했습니다.':'선택한 위치를 목적지로 확정했습니다.');
});

function beginRoutePick(which) {
  if (addMode) setAddMode(false);
  if (editingPointId) {editingPointId=null;showOverview();}
  closeRouteSearch();
  closeTransitRouteConfirmation();
  routePickMode=which;
  navigate('map');
  syncRoutePresentation();
  toast(which==='start'?'지도에서 출발지를 선택해 주세요.':'지도에서 목적지를 선택해 주세요.');
}
function pickRouteLocation(lngLat,point) {
  if (!routePickMode)return;
  if(!document.getElementById('route-transit-confirm').hidden)return;
  const transit=transitAtMapClick(point,lngLat);
  if(transit){showTransitRouteConfirmation(transit);return;}
  // 일반 지도 위치도 마커를 먼저 표시하고, 사용자가 확인한 뒤에만 저장합니다.
  showTransitRouteConfirmation({kind:'point',name:'지도에서 선택한 위치',
    lng:lngLat.lng,lat:lngLat.lat,lines:[]});
}
function resetRoute() {
  clearTransitPreview();
  stopNavigation();
  closeRouteSearch();closeTransitRouteConfirmation();
  routePickMode=null;routeStart=null;routeEnd=null;routeResult=null;
  routeWaypoints=[];routeProductTools?.setWaypoints([]);
  clearPriRouteAdvice();
  routeVariants={standard:null,gentle:null};
  document.getElementById('route-variants').hidden=true;
  routeStartMarker?.remove();routeEndMarker?.remove();
  routeStartMarker=null;routeEndMarker=null;
  showRouteLine(null);
  document.getElementById('route-status').textContent='';
  document.getElementById('route-summary').hidden=true;
  updateRouteLabels();
  if (app.dataset.tab==='map') showOverview();
  syncRoutePresentation();
}
// Valhalla는 Google polyline과 달리 정밀도 6자리의 인코딩을 사용합니다.
function decodePolyline6(encoded) {
  let index=0,lat=0,lon=0;
  const points=[];
  if (typeof encoded!=='string') throw new Error('경로 인코딩 데이터가 없습니다.');
  while(index<encoded.length) {
    const values=[];
    for(let axis=0;axis<2;axis++) {
      let shift=0,result=0,b;
      do {
        if(index>=encoded.length)throw new Error('경로 인코딩이 잘못됐습니다.');
        b=encoded.charCodeAt(index++)-63;
        result|=(b&31)<<shift;
        shift+=5;
        if(shift>35)throw new Error('경로 좌표 인코딩 길이가 올바르지 않습니다.');
      } while(b>=32);
      values.push(result&1?~(result>>1):result>>1);
    }
    lat+=values[0];lon+=values[1];
    const xy=[lon/1e6,lat/1e6];
    if(!xy.every(Number.isFinite) || Math.abs(xy[0])>180 || Math.abs(xy[1])>90) {
      throw new Error('경로 좌표가 올바르지 않습니다.');
    }
    points.push(xy);
  }
  return points;
}
function readRouteMetrics() {
  if(!routeResult)return {duration:'—',distance:'—'};
  const seconds=routeResult.seconds;
  const kilometers=routeResult.kilometers;
  return {duration:`약 ${Math.max(1,Math.ceil(seconds/60))}분`,distance:kilometers<1?`${Math.round(kilometers*1000)}m`:`${kilometers.toFixed(2)}km`};
}
function fitWalkingRoute(coords) {
  if(!Array.isArray(coords)||coords.length<2)return;
  const bounds=coords.reduce((b,p)=>b.extend(p),new maplibregl.LngLatBounds(coords[0],coords[0]));
  const mobile=window.matchMedia('(max-width:699px)').matches;
  let padding={top:190,bottom:185,left:35,right:35};
  if(mobile){
    const root=map.getContainer?.(),rect=root?.getBoundingClientRect?.();
    const visible=node=>{
      if(!node||node.hidden)return false;
      const box=node.getBoundingClientRect?.();
      const style=window.getComputedStyle?.(node);
      return box?.height>0&&style?.visibility!=='hidden'&&style?.display!=='none'&&style?.opacity!=='0';
    };
    const toolbarBottom=Math.max(110,...['.topbar','#djNext-toolbar','#dj-v794-toolbar','#dj831-scrollport']
      .map(selector=>document.querySelector(selector)).filter(visible)
      .map(node=>node.getBoundingClientRect().bottom));
    const card=document.getElementById('route-map-card');
    const nav=document.getElementById('bottom-nav');
    padding=walkingRouteViewportPadding({
      mapTop:rect?.top||0,viewportHeight:rect?.height||root?.clientHeight||window.innerHeight,
      toolbarBottom,sheetTop:visible(card)?card.getBoundingClientRect().top:undefined,
      navigationTop:visible(nav)?nav.getBoundingClientRect().top:undefined,
      side:24,minVisible:135
    });
  }
  map.fitBounds(bounds,{padding,maxZoom:16.0,duration:780,pitch:0,bearing:0});
}
window.addEventListener('dj-next:fit-route',()=>{
  if(app.dataset.tab==='map'&&routeResult?.coords?.length>=2)fitWalkingRoute(routeResult.coords);
});
async function fetchPedestrianRoute(from,to,profile='standard',externalSignal) {
  if([from,to].some(p=>routeLocationInside(p)!==true))throw new Error('동작구 내 출발지와 도착지만 지원합니다.');
  const useHills=profile==='gentle'?0:0.5;
  const payload={locations:[{lat:from.lat,lon:from.lng},{lat:to.lat,lon:to.lng}],
    costing:'pedestrian',costing_options:{pedestrian:{use_hills:useHills}},
    units:'kilometers',language:'en-US'};
  const url='/routing/route'; // Vite 개발 프록시 / Cloudflare Pages 동명 Function
  const abort=new AbortController();
  const externalAbort=()=>abort.abort();
  if(externalSignal?.aborted)abort.abort();
  externalSignal?.addEventListener('abort',externalAbort,{once:true});
  const timer=setTimeout(()=>abort.abort(),20000);
  try {
    let data={}; let httpStatus=0; let isOk=false;
    if(Capacitor.isNativePlatform()) {
      // APK에서는 Vite 개발서버가 없으므로 Android 네이티브 HTTP로 경로 서버 호출.
      const nativeResponse=await CapacitorHttp.post({
        url:'https://valhalla1.openstreetmap.de/route',
        headers:{'Content-Type':'application/json','X-Client-Id':'dongjak-safety-prototype'},
        data:payload, connectTimeout:15000, readTimeout:20000
      });
      httpStatus=nativeResponse.status;
      isOk=httpStatus>=200 && httpStatus<300;
      try{data=typeof nativeResponse.data==='string'?JSON.parse(nativeResponse.data):nativeResponse.data||{};}catch{}
    }else{
      const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','X-Client-Id':'dongjak-safety-prototype'},
        body:JSON.stringify(payload),signal:abort.signal});
      httpStatus=response.status;isOk=response.ok;
      try{data=await response.json();}catch{}
    }
    if(!isOk || data.error_code || data.error) {
      throw new Error(data.error || data.message || `경로 서버 오류 (HTTP ${httpStatus})`);
    }
    const trip=data.trip;
    if(!trip?.legs?.length || !trip?.summary)throw new Error('도보 경로를 찾지 못했습니다. 다른 위치를 선택해 주세요.');
    const coords=[];
    const maneuvers=[];
    for(const leg of trip.legs) {
      const segmentOffset=coords.length;
      const segment=decodePolyline6(leg.shape);
      const shared=coords.length && segment.length && coords.at(-1)[0]===segment[0][0] && coords.at(-1)[1]===segment[0][1];
      if(shared)segment.shift();
      for(const maneuver of leg.maneuvers || []) {
        const idx=Math.max(0,Math.min(segmentOffset + Number(maneuver.begin_shape_index || 0) - (shared?1:0),segmentOffset+segment.length-1));
        maneuvers.push({index:idx,type:Number(maneuver.type),instruction:String(maneuver.instruction || '')});
      }
      coords.push(...segment);
    }
    if(coords.length<2)throw new Error('표시할 도보 경로 좌표가 없습니다.');
    if(!routeWithinDistrict(coords,boundaryGeometry,isDongjak))throw new Error('동작구 경계를 벗어나는 경로는 지원하지 않습니다.');
    return {coords,seconds:Number(trip.summary.time),kilometers:Number(trip.summary.length),maneuvers,
      source:'valhalla-external'};
  } finally {clearTimeout(timer);externalSignal?.removeEventListener('abort',externalAbort);}
}
function routeDataNote(result){
  if(!result)return '';
  if(result.source==='seoul-pedestrian-graph'){
    const grade=Number.isFinite(result.slopeAscentM)?` · 추정 상승 ${Math.round(result.slopeAscentM)}m / 하강 ${Math.round(result.slopeDescentM)}m`:'';
    const unsure=result.slopeUncertainM>0?` · 고도 검증 부족 ${Math.round(result.slopeUncertainM)}m`:'';
    const snap=Math.max(result.snapStartM||0,result.snapEndM||0);
    return `서울시 동작구 도보 링크 기반${grade}${unsure}${snap>25?` · 지정점과 보행로 사이 최대 ${Math.round(snap)}m`:''} · 보도·통행상태 미검증`;
  }
  return result.segmentCount?`경유 ${result.segmentCount}구간의 실제 보행경로 합산 · 이용 데이터가 구간별로 다를 수 있음 · 통행 상태 미검증`:'외부 시험용 도보 경로 서버 결과 · 동작구 도보 네트워크 적용 실패 또는 범위 밖 · 실제 통행 가능 여부 미검증';
}
async function fetchPreferredPedestrianPair(from,to,signal){
  if([from,to].some(p=>routeLocationInside(p)!==true))throw new Error('동작구 내 출발지와 도착지만 지원합니다.');
  try {
    const local=await fetchDongjakPedestrianVariants(from,to,{signal});
    const standard=routeWithinDistrict(local.standard?.coords,boundaryGeometry,isDongjak)?local.standard:null;
    const gentle=routeWithinDistrict(local.gentle?.coords,boundaryGeometry,isDongjak)?local.gentle:null;
    if(!standard&&!gentle)throw new Error('동작구 내 보행 경로를 찾지 못했습니다.');
    return {...local,standard,gentle,usingLocal:true};
  }catch(error){
    if(error?.name==='AbortError')throw error;
    console.warn('[서울시 보행 네트워크 경로 전환 실패, 외부 경로 시도]',error);
    const settled=await Promise.allSettled([
      fetchPedestrianRoute(from,to,'standard',signal),fetchPedestrianRoute(from,to,'gentle',signal)
    ]);
    const standard=settled[0].status==='fulfilled'?settled[0].value:null;
    const gentle=settled[1].status==='fulfilled'?settled[1].value:null;
    if(!standard&&!gentle)throw new Error(`서울시 도보 네트워크: ${error.message||error}; 외부 경로: ${settled[0].reason?.message||settled[1].reason?.message||'조회 실패'}`);
    return {standard,gentle,usingLocal:false};
  }
}
function currentPreferredModeResult(from,to,which,signal){
  if(routeResult?.source==='seoul-pedestrian-graph'){
    return fetchPreferredPedestrianPair(from,to,signal).then(routes=>{
      const result=routes[which];
      if(!result?.coords?.length)throw new Error('선택한 보행 경로를 다시 찾지 못했습니다.');
      return result;
    });
  }
  return fetchPedestrianRoute(from,to,which,signal);
}
function applySelectedRouteVariant(){
  const result=routeVariants[selectedRouteVariant];
  if(!result)return;
  routeResult=result;
  showRouteLine(result.coords);
  const metrics=readRouteMetrics();
  document.getElementById('route-length').textContent=metrics.distance;
  document.getElementById('route-duration').textContent=metrics.duration;
  const terrainNote=document.getElementById('route-data-note');
  if(terrainNote)terrainNote.textContent=routeDataNote(result);
  for(const button of document.querySelectorAll('[data-route-variant]')){
    button.setAttribute('aria-pressed',String(button.dataset.routeVariant===selectedRouteVariant));
  }
  if(app.dataset.tab==='map')fitWalkingRoute(result.coords);
  syncPriRouteLine();
}
for(const button of document.querySelectorAll('[data-route-variant]')){
  button.addEventListener('click',()=>{
    if(navMode){toast('안내 중에는 경로를 변경할 수 없습니다.');return;}
    if(!routeVariants[button.dataset.routeVariant])return;
    selectedRouteVariant=button.dataset.routeVariant;
    priVariantChosenManually=true;
    applySelectedRouteVariant();
    toast(selectedRouteVariant==='gentle'?'경사 회피 우선 경로를 표시합니다.':'일반 보행 경로를 표시합니다.');
  });
}
async function calculateRoute() {
  if(routeRequestPending)return;
  if(!routeStart || !routeEnd) {toast('출발지와 목적지를 모두 지정해 주세요.');return;}
  if(![routeStart,...routeWaypoints,routeEnd].every(requireDongjakRouteLocation))return;
  const d=Math.hypot((routeStart.lat-routeEnd.lat)*111000,(routeStart.lng-routeEnd.lng)*88000);
  if(d<15) {toast('출발지와 목적지가 너무 가깝습니다.');return;}
  if(d>40000) {toast('시범 앱에서는 약 40km 이내의 도보 경로만 계산합니다.');return;}
  routeRequestPending=true;
  const btn=document.getElementById('route-calc');
  btn.disabled=true;
  document.getElementById('route-status').textContent='실제 보행로를 따라 경로를 계산하고 있습니다…';
  document.getElementById('route-summary').hidden=true;
  try {
    const requested=[routeStart,...routeWaypoints,routeEnd];
    const result=routeWaypoints.length
      ? await computeMultiStopRoutes(requested,fetchPreferredPedestrianPair,{
          onProgress:(n,total)=>{document.getElementById('route-status').textContent=`경유 경로 ${n}/${total}구간을 계산하고 있습니다…`;}})
      : await fetchPreferredPedestrianPair(routeStart,routeEnd);
    const current=[routeStart,...routeWaypoints,routeEnd];
    if(requested.length!==current.length||requested.some((p,i)=>p!==current[i])||!current.every(p=>routeLocationInside(p)===true))throw new Error('경로 조건이 변경됐습니다. 다시 시도해 주세요.');
    const {usingLocal}=result;
    const standard=routeWithinDistrict(result.standard?.coords,boundaryGeometry,isDongjak)?result.standard:null;
    const gentle=routeWithinDistrict(result.gentle?.coords,boundaryGeometry,isDongjak)?result.gentle:null;
    if(!standard&&!gentle)throw new Error('동작구 경계 안에서 연결되는 경로를 찾지 못했습니다.');
    routeVariants={standard,gentle};
    routePriVisuals=null; // no stale overlay while new path/PRI data is pending
    const thisPriReview=++priRouteReviewSequence,reviewedVariants=routeVariants;
    priVariantChosenManually=false;
    for(const node of [priMapNote,priEditorNote]){
      node.textContent='종합 PRI 관측 구간을 대조하고 있습니다…';node.hidden=false;
    }
    // A slow GIS overlay must not hold the already-computed walking route
    // behind a loading screen. Apply advice only to the still-current result.
    void (async()=>{
      let comparison=null;
      try {
        comparison=await evaluateCompositePriRouteCandidates({standard,gentle});
      } catch(error) {
        console.warn('[PRI route] Partial assessment unavailable; ordinary walking routes preserved',error);
      }
      if(thisPriReview!==priRouteReviewSequence||routeVariants!==reviewedVariants)return;
      routePriVisuals=comparison?.visuals||null;
      if(standard)standard.priExposure=comparison?.standard||null;
      if(gentle)gentle.priExposure=comparison?.gentle||null;
      showPriRouteAdvice(comparison);
      window.dispatchEvent(new CustomEvent('dongjak:route-pri-ready',{detail:comparison}));
      if(comparison?.recommendation&&!priVariantChosenManually&&!navMode){
        selectedRouteVariant=comparison.recommendation;
        applySelectedRouteVariant();
        document.getElementById('route-status').textContent+=' · PRI 상대 저위험 후보 선택';
      }
      syncRoutePresentation();
    })();
    window.dispatchEvent(new CustomEvent('dongjak:route-variants-ready',{detail:{standard,gentle}}));
    selectedRouteVariant=standard?'standard':'gentle';
    applySelectedRouteVariant();
    document.getElementById('route-variants').hidden=false;
    for(const button of document.querySelectorAll('[data-route-variant]')){
      const kind=button.dataset.routeVariant;
      button.disabled=!routeVariants[kind];
      button.setAttribute('aria-pressed',String(kind===selectedRouteVariant));
    }
    document.getElementById('route-summary').hidden=false;
    const compare=standard&&gentle
      ? (JSON.stringify(standard.coords)===JSON.stringify(gentle.coords)
        ? '두 조건에서 같은 경로가 계산됐습니다. 평지라는 뜻은 아닙니다.'
        : '최단 도보 경로와 경사 회피 우선 경로를 비교할 수 있습니다.')
      : '제공 가능한 보행 경로 한 개만 계산됐습니다.';
    document.getElementById('route-status').textContent=`${usingLocal?'서울시 도보 네트워크 사용':'보행 네트워크와 외부 서버 혼합 또는 외부 서버 사용'} · ${routeWaypoints.length?`경유지 ${routeWaypoints.length}곳 · `:''}${compare}`;
    navigate('map');
    fitWalkingRoute(routeResult.coords);
    syncRoutePresentation();
    toast('도보 경로가 지도에 표시됐습니다.');
  } catch(error) {
    console.error('[동작하는 안전지도] 길찾기 오류:',error);
    const message=error.name==='AbortError'
      ? '경로 서버의 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.'
      : String(error.message||'알 수 없는 경로 오류');
    document.getElementById('route-status').textContent=`길찾기 실패: ${message}`;
    toast('경로를 불러오지 못했습니다. 길찾기 메뉴의 메시지를 확인해 주세요.');
  } finally {
    routeRequestPending=false;updateRouteCalcAvailability();
  }
}
document.getElementById('route-pick-start').addEventListener('click',()=>beginRoutePick('start'));
document.getElementById('route-pick-end').addEventListener('click',()=>beginRoutePick('end'));
document.getElementById('route-pick-cancel').addEventListener('click',()=>{closeTransitRouteConfirmation();routePickMode=null;navigate('route');});
document.getElementById('route-gps-start').addEventListener('click',()=>{
  if(!hasLocationSupport()){toast('이 기기에서는 GPS 기능을 사용할 수 없습니다.');return;}
  const b=document.getElementById('route-gps-start');b.disabled=true;b.textContent='위치 확인 중…';
  getDevicePosition({enableHighAccuracy:true,timeout:13000,maximumAge:10000}).then(({coords})=>{
    const accepted=setRouteLocation('start',{lng:coords.longitude,lat:coords.latitude,label:'현재 위치',resolveAddress:true});
    if(accepted){
      map.flyTo({center:[coords.longitude,coords.latitude],zoom:15.3,duration:600});
      toast('현재 위치를 출발지로 지정했습니다.');
    }
    b.disabled=false;b.textContent='⌖ 현재 위치를 출발지로 지정';
  }).catch((error)=>{toast(errorLocationCode(error)===1?'위치 권한이 거부됐습니다.':'현재 위치를 확인하지 못했습니다. 지도에서 선택해 주세요.');
    b.disabled=false;b.textContent='⌖ 현재 위치를 출발지로 지정';
  });
});
document.getElementById('route-calc').addEventListener('click',calculateRoute);
updateRouteCalcAvailability();
window.matchMedia('(max-width:699px)').addEventListener?.('change',updateRouteCalcAvailability);
document.getElementById('route-clear').addEventListener('click',resetRoute);
document.getElementById('route-return-map').addEventListener('click',()=>{
  if(!routeResult)return;
  navigate('map');fitWalkingRoute(routeResult.coords);syncRoutePresentation();
});
document.getElementById('route-map-edit').addEventListener('click',()=>navigate('route'));
document.getElementById('route-map-close').addEventListener('click',resetRoute);
updateRouteLabels();
syncRoutePresentation();

// v8.0.3 map-product extension: one route engine, ordered real walking legs.
routeProductTools=installMapProduct({map,maplibregl,navigate,
  getRoutePoints:()=>routeStart&&routeEnd
    ? [routeStart,...routeWaypoints,routeEnd].map(p=>({...p,name:p.name||p.label||'선택한 장소'})) : [],
  onWaypointSearch:()=>{if(navMode){toast('안내를 종료한 뒤 경유지를 변경해 주세요.');return;}if(routeWaypoints.length>=5){toast('경유지는 최대 5곳입니다.');return;}beginRouteSearch('waypoint');},
  onWaypointPick:()=>{if(navMode){toast('안내를 종료한 뒤 경유지를 변경해 주세요.');return;}if(routeWaypoints.length>=5){toast('경유지는 최대 5곳입니다.');return;}beginRoutePick('waypoint');},
  onWaypointsChange:next=>{
    if(navMode){toast('GPS 안내 중에는 경유지를 변경할 수 없습니다. 안내를 종료해 주세요.');routeProductTools?.setWaypoints(routeWaypoints);return;}
    if(!next.every(requireDongjakRouteLocation)){routeProductTools?.setWaypoints(routeWaypoints);return;}
    routeWaypoints=next.map(p=>({...p,label:p.name}));invalidateRoute();
  },
  onTransitPreview:async plan=>{
    if(!routeStart||!routeEnd)throw new Error('출발지와 목적지가 필요합니다.');
    if(routeWaypoints.length)throw new Error('경유지 없는 두 지점만 지원합니다.');
    if(navMode)throw new Error('GPS 안내 중에는 다른 이동안을 표시할 수 없습니다.');
    const railCoords=plan.stops.map(name=>VERIFIED_STATIONS[name]);
    if(railCoords.some(p=>!p)||!routeWithinDistrict(railCoords,boundaryGeometry,isDongjak))throw new Error('동작구 경계를 벗어나는 대중교통 경로는 지원하지 않습니다.');
    const first=await fetchPreferredPedestrianPair(routeStart,plan.origin);
    const last=await fetchPreferredPedestrianPair(plan.destination,routeEnd);
    if(!routeStart||!routeEnd||routeWaypoints.length)throw new Error('이동 중 경로 조건이 변경됐습니다. 다시 시도하세요.');
    const startWalk=first.standard||first.gentle,endWalk=last.standard||last.gentle;
    if(!startWalk||!endWalk)throw new Error('역과 출발·도착 장소를 연결할 실제 보행경로가 없습니다.');
    if(!map.isStyleLoaded?.())throw new Error('지도 스타일을 불러오는 중입니다.');
    invalidateRoute();
    const walk={type:'FeatureCollection',features:[startWalk,endWalk].map(r=>({type:'Feature',properties:{},geometry:{type:'LineString',coordinates:r.coords}}))};
    const rail={type:'FeatureCollection',features:railCoords.length>=2?[{type:'Feature',properties:{},geometry:{type:'LineString',coordinates:railCoords}}]:[]};
    for(const [id,data,color,dash] of [['dj815-transit-walk',walk,'#168f82',null],['dj815-transit-rail',rail,'#bd7735',[2,2]]]){
      if(!map.getSource(id))map.addSource(id,{type:'geojson',data});else map.getSource(id).setData(data);
      if(!map.getLayer(`${id}-line`))map.addLayer({id:`${id}-line`,type:'line',source:id,layout:{'line-join':'round','line-cap':'round'},
        paint:{'line-color':color,'line-width':5,'line-opacity':.9,...(dash?{'line-dasharray':dash}:{})}});
    }
    const coords=[...startWalk.coords,...railCoords,...endWalk.coords];
    navigate('map');fitWalkingRoute(coords);
  }
});


// ═════════════════════════════════════════════════════════════
// v14 실시간 도보 안내: GPS watchPosition / 지도 보간 / 진척도 / 안내 카드
// GPS는 브라우저·OS 권한이 필요하고, 화면이 꺼지면 갱신이 중단될 수 있습니다.
// ═════════════════════════════════════════════════════════════
function updateNavButtonLabels(){
  document.getElementById('nav-voice').textContent=navVoiceEnabled?'음성 안내 켜짐':'음성 안내 꺼짐';
  document.getElementById('nav-voice').setAttribute('aria-pressed',String(navVoiceEnabled));
  document.getElementById('nav-orientation').textContent=navHeadingUp?'진행방향 보기':'북쪽 고정';
  document.getElementById('nav-orientation').setAttribute('aria-pressed',String(navHeadingUp));
  document.getElementById('nav-reset-camera')?.setAttribute('aria-pressed',String(navFollow));
  document.getElementById('nav-follow').textContent=navFollow?'◎ 내 위치 따라가기':'◉ 위치 따라가기 켜기';
}
function speakNav(text,key='') {
  if(!navVoiceEnabled||!navVoiceAvailable||!text || document.hidden)return;
  if(key && navLastVoiceKey===key)return;
  if(key)navLastVoiceKey=key;
  try{
    window.speechSynthesis.cancel();
    const message=new window.SpeechSynthesisUtterance(text);
    message.lang='ko-KR';message.rate=1.03;message.volume=0.92;
    applySelectedNavVoice(message);
    window.speechSynthesis.speak(message);
  }catch(error){console.warn('[도보 음성 안내]',error);}
}
function navNextTurn(){
  if(!routeResult||!navIndex)return null;
  return (routeResult.maneuvers||[])
    .filter(m=>m.index>=0&&m.index<navIndex.lengths.length&&![1,2,3].includes(m.type))
    .map(m=>({...m,at:navIndex.lengths[m.index]}))
    .find(m=>m.at>navProgress+7)||null;
}
function navTurnName(type){
  return ({4:'목적지 도착',5:'목적지 도착',6:'목적지 도착',
    9:'완만하게 우회전',10:'우회전',11:'급하게 우회전',12:'유턴',13:'유턴',
    14:'급하게 좌회전',15:'좌회전',16:'완만하게 좌회전',
    17:'직진',18:'우측 진입',19:'좌측 진입',20:'오른쪽 출구',21:'왼쪽 출구',
    22:'직진 유지',23:'오른쪽 유지',24:'왼쪽 유지',26:'회전교차로 진입',27:'회전교차로 진출',
    40:'계단 구간',41:'에스컬레이터 구간'})[type]||'경로를 따라 이동';
}
function formatDistance(m) {
  const n=Math.max(0,Number(m)||0);
  return n<1000?`${Math.round(n/5)*5}m`:`${(n/1000).toFixed(2)}km`;
}
function updateNavMarker(pos,acc) {
  if(!navMarker) {
    const el=document.createElement('div');
    el.className='nav-position-dot';el.setAttribute('aria-label','내 현재 GPS 위치');
    navMarker=new maplibregl.Marker({element:el,anchor:'center'}).setLngLat(pos).addTo(map);
  } else navMarker.setLngLat(pos);
  if(Number.isFinite(acc))document.getElementById('nav-accuracy').textContent=`위치 오차 약 ${Math.round(acc)}m`;
}
function updateNavGuidance(offRoute=false) {
  if(!routeResult || !navIndex)return;
  const remain=Math.max(0,navIndex.total-navProgress);
  const seconds=remain/(Math.max(navIndex.total,1))*routeResult.seconds;
  document.getElementById('nav-remain-distance').textContent=formatDistance(remain);
  document.getElementById('nav-remain-time').textContent=`약 ${Math.max(1,Math.ceil(seconds/60))}분`;
  if(offRoute||navReroutePending) {
    document.getElementById('nav-instruction').textContent='경로에서 벗어난 것으로 보입니다';
    return;
  }
  const next=navNextTurn();
  if(!next) {
    document.getElementById('nav-instruction').textContent=remain<40?'목적지가 가까워졌습니다':'경로를 따라 계속 이동하세요';
    if(remain<30)speakNav('목적지 주변입니다. 실제 도착 위치를 확인하세요.',`arrive-${navSessionToken}`);
    return;
  }
  const turn=navTurnName(next.type);
  const distance=Math.max(0,next.at-navProgress);
  document.getElementById('nav-instruction').textContent=distance>20?`${formatDistance(distance)} 앞 · ${turn}`:turn;
  const cue=voiceCueKey(next.index,distance);
  if(cue&&navLastGps&&navLastGps.accuracy<=40)speakNav(distance>20?`${Math.max(10,Math.round(distance/10)*10)}미터 앞에서 ${turn}입니다.`:`${turn}입니다.`,cue);
}
async function autoRerouteFromGps(pos,accuracy){
  if(navMode!=='gps'||!routeEnd||navReroutePending||routeWaypoints.length)return;
  if(isDongjak(pos[0],pos[1])!==true)return;
  // Never silently skip remaining waypoints when GPS rerouting is requested.
  const now=Date.now();
  if(!shouldAutoReroute({offRouteMeters:navLastOffRouteDistance,accuracy,
    consecutiveSamples:navOffRouteSamples,now,lastAttemptAt:navLastRerouteAt,pending:navReroutePending}))return;
  navLastRerouteAt=now;
  navReroutePending=true;
  const token=navSessionToken;
  const controller=new AbortController();navRerouteController=controller;
  navOffRouteSamples=0;
  document.getElementById('nav-mode-tag').textContent='↻ 경로 다시 찾는 중';
  document.getElementById('nav-warning').textContent='현재 위치에서 목적지까지 보행 경로를 다시 계산합니다…';
  speakNav('경로에서 벗어났습니다. 새로운 도보 경로를 찾겠습니다.',`reroute-${now}`);
  try {
    const data=await currentPreferredModeResult({lng:pos[0],lat:pos[1]},routeEnd,selectedRouteVariant,controller.signal);
    if(!data?.coords||data.coords.length<2)throw new Error('재탐색 경로 좌표가 부족합니다.');
    if(token!==navSessionToken || navMode!=='gps'||controller.signal.aborted)return;
    routeResult=data;
    // The new GPS-origin geometry is NOT the previously evaluated route.
    // Drop the old alternate and all stale PRI coloring/comparison evidence.
    // Once guidance ends, show only this actually recomputed path as unassessed.
    routePriVisuals=null;
    routeVariants={standard:null,gentle:null,[selectedRouteVariant]:data};
    window.dispatchEvent(new CustomEvent('dongjak:route-variants-ready',{detail:routeVariants}));
    window.dispatchEvent(new CustomEvent('dongjak:route-pri-ready',{detail:null}));
    navIndex=makeRouteIndex(data.coords);
    navProgress=0;navLastUpdateAt=0;navOffRouteSamples=0;
    navLastVoiceKey='';
    showRouteLine(data.coords);
    document.getElementById('nav-mode-tag').textContent='● GPS 도보 안내';
    document.getElementById('nav-warning').textContent=routeDataNote(data);
    navReroutePending=false;
    updateNavGuidance();
    toast('현재 위치에서 경로를 다시 계산했습니다.');
  } catch(error) {
    if(token!==navSessionToken||controller.signal.aborted)return;
    document.getElementById('nav-mode-tag').textContent='● GPS 도보 안내';
    document.getElementById('nav-warning').textContent='경로 재탐색에 실패했습니다. 기존 경로를 확인하거나 길찾기를 다시 시도해 주세요.';
    console.warn('[도보 자동 재탐색]',error);
  } finally {
    if(navRerouteController===controller)navRerouteController=null;
    if(token===navSessionToken)navReroutePending=false;
  }
}
function followNavigationPosition(pos,heading=NaN,{compassUpdate=false}={}){
  if(!navFollow || app.dataset.tab!=='map')return;
  const xy=map.project(pos);
  const width=map.getCanvas().clientWidth;
  const height=map.getCanvas().clientHeight;
  // 하단 안내 카드 위에 사용자를 배치하여 진행 방향을 읽기 쉽게 유지합니다.
  const offCenter=Math.hypot(xy.x-width/2,xy.y-height*0.43);
  const compassHeading=navCompass?.heading();
  const preferred=Number.isFinite(compassHeading)?compassHeading:Number.isFinite(heading)?heading:navMovementHeading;
  const bearing=navHeadingUp ? headingForCamera(preferred,map.getBearing()) : 0;
  const rotate=Math.abs(signedHeadingDelta(bearing,map.getBearing()))>(compassUpdate?2:5);
  // Orientation events never change route progress or trigger GPS rerouting.
  if(compassUpdate&&!rotate)return;
  if(offCenter>55||rotate||map.getZoom()<16.3){
    map.easeTo({center:pos,zoom:Math.max(map.getZoom(),16.3),bearing,
      padding:{top:15,bottom:60,left:0,right:0},duration:compassUpdate?180:500,essential:true});
  }
}

function updateNavState(pos,accuracy=0,heading=NaN) {
  if(!navMode||!navIndex)return;
  if(!pos.every(Number.isFinite))return;
  if(isDongjak(pos[0],pos[1])!==true){
    navOffRouteSamples=0;navRerouteController?.abort();
    document.getElementById('nav-warning').textContent='동작구 경계 밖이거나 경계 확인이 불가해 안내를 일시 중지합니다.';
    document.getElementById('nav-instruction').textContent='동작구 내에서 안내를 이용해 주세요.';return;
  }
  const now=performance.now();
  const nearest=nearestOnRoute(navIndex,pos);
  const actualAccuracy=Number.isFinite(accuracy)?accuracy:100;
  document.getElementById('nav-accuracy').textContent=`GPS 오차 약 ${Math.round(actualAccuracy)}m`;
  updateNavMarker(pos,actualAccuracy);
  let movementHeading=Number.isFinite(heading) && heading>=0?heading:NaN;
  if(!Number.isFinite(movementHeading)&&navLastGps && actualAccuracy<=40 && navLastGps.accuracy<=40
    && distanceMeters(navLastGps.pos,pos)>12)movementHeading=bearingDegrees(navLastGps.pos,pos);
  navLastGps={pos,accuracy:actualAccuracy};
  if(Number.isFinite(movementHeading))navMovementHeading=movementHeading;
  if(Number.isFinite(movementHeading))followNavigationPosition(pos,movementHeading);
  else followNavigationPosition(pos);
  // 실제 목적지 인근은 경로 선형 스냅 여부와 무관하게 도착 여부를 확인합니다.
  if(routeEnd && actualAccuracy<=35 && distanceMeters(pos,[routeEnd.lng,routeEnd.lat])<Math.max(17,actualAccuracy)){
    stopNavigation(true);return;
  }
  if(actualAccuracy>65) {
    navOffRouteSamples=0;
    document.getElementById('nav-warning').textContent=routeWaypoints.length?'GPS 정확도가 낮아 경유지 경로 진행을 보류합니다.':'GPS 위치 정확도가 낮아 경로 진행과 자동 재탐색을 보류합니다.';
    return;
  }
  const offRouteLimit=offRouteThreshold(actualAccuracy);
  navLastOffRouteDistance=nearest.offRouteMeters;
  if(nearest.offRouteMeters>offRouteLimit){
    // 지하철 출입구·고층건물 인근 GPS 튐으로 인한 잘못된 재검색을 막습니다.
    navOffRouteSamples=actualAccuracy<=40?navOffRouteSamples+1:0;
    document.getElementById('nav-warning').textContent=navReroutePending
      ?'현재 위치에서 새 경로를 찾고 있습니다…'
      :routeWaypoints.length
        ?`계획 경로에서 약 ${Math.round(nearest.offRouteMeters)}m 벗어났습니다. 경유지 포함 안내는 자동 재탐색을 지원하지 않습니다. 안내를 종료하고 경로를 다시 계산하세요.`
        :`계획 경로에서 약 ${Math.round(nearest.offRouteMeters)}m 떨어져 있습니다. GPS를 확인하고 필요 시 자동으로 재탐색합니다.`;
    updateNavGuidance(true);
    if(!navReroutePending)void autoRerouteFromGps(pos,actualAccuracy);
    return;
  }
  navOffRouteSamples=0;
  const deltaSec=navLastUpdateAt?Math.max(0.5,(now-navLastUpdateAt)/1000):0;
  const proposed=nearest.progressMeters;
  if(navLastUpdateAt && proposed-navProgress>Math.max(38,deltaSec*3.5+22)) {
    document.getElementById('nav-warning').textContent='위치가 급격히 변경되어 진행률을 유지합니다. GPS를 다시 확인합니다.';
    navLastUpdateAt=now;return;
  }
  navProgress=Math.max(navProgress,proposed);
  navLastUpdateAt=now;
  paintRouteProgress(navProgress);
  updateNavGuidance();
  if(!navReroutePending)document.getElementById('nav-warning').textContent=routeWaypoints.length?'경유지 포함 안내 · 경로 이탈 시 자동 재탐색은 지원되지 않습니다.':'실시간 GPS 안내 중 · 횡단보도와 보행 가능 여부를 현장에서 확인하세요.';
  const end=navIndex.coords.at(-1);
  if(navIndex.total-navProgress<=18 && distanceMeters(pos,end)<28)stopNavigation(true);
}

function stopNavigation(arrived=false) {
  navSessionToken++;
  navCompass?.stop();navCompass=null;navMovementHeading=NaN;
  navRerouteController?.abort();navRerouteController=null;navReroutePending=false;
  navOffRouteSamples=0;navLastOffRouteDistance=0;navLastGps=null;navLastVoiceKey='';
  try{window.speechSynthesis?.cancel();}catch{}
  if(navWatchId!==null) {
    stopDeviceWatch(navWatchId);navWatchId=null;
  }
  navMarker?.remove();navMarker=null;
  if(routeResult) {
    if(arrived && navIndex)paintRouteProgress(navIndex.total);
    else showRouteLine(routeResult.coords);
  }
  navMode=null;navIndex=null;navProgress=0;navLastUpdateAt=0;navFollow=true;
  if(arrived)app.dataset.djWalkArrived='1';
  updateNavButtonLabels();
  syncRoutePresentation();
  if(arrived) {
    document.getElementById('route-status').textContent='목적지 근처에 도착했습니다. 실제 위치와 보행환경을 확인하세요.';
    // The dedicated arrival dialog is the sole completion message.
    // Arrival is a navigation state transition, not another route computation.
    // The view shows only existing route estimates and never fabricates actual steps.
    window.dispatchEvent(new CustomEvent('dongjak:route-arrived',{detail:{
      kilometers:routeResult?.kilometers??null,
      seconds:routeResult?.seconds??null
    }}));
  }
}
async function startNavigation() {
  if(!routeResult||!routeResult.coords?.length) {toast('먼저 도보 경로를 계산해 주세요.');return;}
  if(!routeWithinDistrict(routeResult.coords,boundaryGeometry,isDongjak)){toast('동작구 내 경로만 안내할 수 있습니다.');return;}
  if(!hasLocationSupport()){toast('이 기기에서 위치정보를 사용할 수 없습니다.');return;}
  if(!Capacitor.isNativePlatform() && !window.isSecureContext){toast('웹 GPS는 HTTPS 또는 같은 PC의 localhost에서만 사용할 수 있습니다.');return;}
  stopNavigation();
  navMode='gps';navHeadingUp=true;
  map.easeTo({pitch:0,zoom:16.3,duration:250});
  navCompass=startNavigationCompass(window,heading=>{
    if(navMode==='gps'&&navFollow&&navHeadingUp&&navLastGps&&!document.hidden)
      followNavigationPosition(navLastGps.pos,heading,{compassUpdate:true});
  });
  navIndex=makeRouteIndex(routeResult.coords);
  navProgress=0;navLastUpdateAt=0;navFollow=true;
  navLastGps=null;navOffRouteSamples=0;navLastRerouteAt=-Infinity;navLastVoiceKey='';
  updateNavButtonLabels();
  document.getElementById('nav-mode-tag').textContent='● GPS 실시간 안내';
  document.getElementById('nav-warning').textContent=routeWaypoints.length?'경유지 안내 · 자동 재탐색 없이 진행합니다. 위치 권한을 허용하세요.':'위치 권한을 허용하면 실시간 추적을 시작합니다.';
  document.getElementById('nav-accuracy').textContent='GPS 연결 중';
  document.getElementById('nav-instruction').textContent='현재 위치를 확인하는 중…';
  navigate('map');
  updateNavGuidance();
  syncRoutePresentation();
  try {
    const watchId=await startDeviceWatch(
      ({coords})=>{if(navMode==='gps')updateNavState([coords.longitude,coords.latitude],coords.accuracy,coords.heading);},
      error=>{
        if(navMode!=='gps')return;
        const code=errorLocationCode(error);
        const msg=code===1?'위치 권한이 거부됐습니다. 휴대전화 위치 권한을 허용해 주세요.'
          :code===3?'GPS 응답이 지연되고 있습니다. 위치 서비스를 확인하세요.'
          :'GPS 위치를 확인하지 못했습니다. 위치 서비스와 인터넷 연결을 확인하세요.';
        document.getElementById('nav-warning').textContent=msg;
        if(code===1) {stopNavigation();toast(msg);}
      },
      {enableHighAccuracy:true,maximumAge:2500,timeout:20000}
    );
    if(navMode==='gps')navWatchId=watchId;
    else stopDeviceWatch(watchId);
  }catch(error){console.error(error);toast('GPS 추적을 시작하지 못했습니다.');stopNavigation();}
}
document.getElementById('route-guide-start').addEventListener('click',()=>startNavigation());
document.getElementById('route-start-gps').addEventListener('click',()=>startNavigation());
document.getElementById('nav-stop').addEventListener('click',()=>{stopNavigation();toast('안내를 종료했습니다.');});
document.getElementById('nav-follow').addEventListener('click',()=>{
  navFollow=!navFollow;
  updateNavButtonLabels();
  if(navFollow && navLastGps)followNavigationPosition(navLastGps.pos);
  toast(navFollow?'현재 위치를 따라갑니다.':'지도를 자유롭게 이동할 수 있습니다.');
});
document.getElementById('nav-voice').addEventListener('click',()=>{
  if(!navVoiceAvailable){toast('이 브라우저에서는 음성 읽기를 지원하지 않습니다.');return;}
  navVoiceEnabled=!navVoiceEnabled;
  navLastVoiceKey='';
  if(!navVoiceEnabled){try{window.speechSynthesis.cancel();}catch{}}
  updateNavButtonLabels();
  if(navVoiceEnabled){
    const next=navNextTurn();
    if(next&&navIndex&&!navReroutePending&&navLastGps&&navLastGps.accuracy<=40){
      const distance=Math.max(0,next.at-navProgress);
      speakNav(distance>20?`${Math.max(10,Math.round(distance/10)*10)}미터 앞에서 ${navTurnName(next.type)}입니다.`:`${navTurnName(next.type)}입니다.`,voiceCueKey(next.index,distance)||'voice-ready');
    }else speakNav('도보 음성 안내를 시작합니다.','voice-ready');
  }
});
document.getElementById('nav-orientation').addEventListener('click',()=>{
  navHeadingUp=!navHeadingUp;updateNavButtonLabels();
  if(navLastGps && navFollow)followNavigationPosition(navLastGps.pos);
  else if(!navHeadingUp)map.easeTo({bearing:0,duration:400});
});
// 실제 손가락 드래그로 지도를 움직이면 현재 위치 자동 추적을 일시 정지합니다.
function pauseNavigationCamera(){if(navMode==='gps'&&navFollow){navFollow=false;updateNavButtonLabels();}}
for(const event of ['dragstart','zoomstart','rotatestart','pitchstart'])map.on(event,e=>{if(e.originalEvent)pauseNavigationCamera();});
document.getElementById('nav-reset-camera').addEventListener('click',()=>{
 if(navMode!=='gps')return;
 navFollow=true;navHeadingUp=true;updateNavButtonLabels();
 const pos=navLastGps?.pos;
 const compass=navCompass?.heading();
 const bearing=headingForCamera(Number.isFinite(compass)?compass:navMovementHeading,map.getBearing());
 map.easeTo({...(pos?{center:pos}:{}),zoom:16.3,pitch:0,bearing,padding:{top:15,bottom:60,left:0,right:0},duration:350});
});
document.getElementById('nav-toggle-3d').addEventListener('click',()=>{
 if(navMode!=='gps')return;
 pauseNavigationCamera();map.easeTo({pitch:map.getPitch()>10?0:50,duration:300});
});
for(const [id,delta] of [['nav-zoom-in',1],['nav-zoom-out',-1]])document.getElementById(id).addEventListener('click',()=>{
 if(navMode!=='gps')return;pauseNavigationCamera();map.easeTo({zoom:map.getZoom()+delta,duration:220});
});
updateNavButtonLabels();
installNavVoicePicker({onChange:()=>{navLastVoiceKey='';}});
// 앱을 최소화하거나 화면을 잠그면 브라우저 GPS는 일시 정지될 수 있습니다.
document.addEventListener('visibilitychange',()=>{
  if(document.hidden && navMode==='gps')
    document.getElementById('nav-warning').textContent='화면을 끄거나 다른 앱으로 전환하면 위치 추적이 중단될 수 있습니다.';
});

;(() => {const boot=()=>{installMobileSurfaceCoordinator(document,window);installRequestCompletion(document,window);};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();})();
