// v17.11: Only show verified Korean-language facility and stop labels.
// Do not invent Korean translations for OSM features with English-only names.
const HAS_HANGUL = /[가-힣]/;

export function koreanNameOnly(...candidates) {
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined) continue;
    const raw = String(candidate).trim();
    if (!HAS_HANGUL.test(raw)) continue;
    // Remove romanized duplicate names (e.g. "Sangdo Middle School 사당중학교").
    const text = raw
      .replace(/\b[A-Za-z]+(?:[\s.\-'][A-Za-z]+)*\b/g, ' ')
      .replace(/[\[\]{}|/]/g, ' ')
      .replace(/\s*\(\s*\)\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/^[\s.,;:·\-]+|[\s.,;:·\-]+$/g, '')
      .trim();
    if (HAS_HANGUL.test(text)) return text;
  }
  return '';
}

export function koreanOSMName(tags = {}, fallback = '') {
  return koreanNameOnly(tags['name:ko'], tags['official_name:ko'], tags['name:nonlatin'], tags.name, tags.local_name)
    || fallback;
}

export function preferKoreanBaseMapLabels(map) {
  let updated = 0;
  for (const layer of map.getStyle().layers) {
    if (layer.type !== 'symbol') continue;
    const id = String(layer.id || '').toLowerCase();
    const src = String(layer['source-layer'] || '').toLowerCase();
    // Existing POI and transit labels are the English names shown in the screenshots.
    // Keep pictograms; only change the text field to official Korean tags, if present.
    // Only third-party vector sources: preserve application symbols and arrows.
    if (!layer['source-layer'] || layer.id.startsWith('dj-') ||
        layer.id.startsWith('dongjak-') || layer.id.startsWith('transport-') ||
        /oneway|arrow|direction/.test(id)) continue;
    try {
      map.setLayoutProperty(layer.id, 'text-field',
        ['case', ['==', ['coalesce',['get','name:ko'],['get','name_ko'],''], '동작구'], '',
          ['coalesce',['get','name:ko'],['get','name_ko'],'']]);
      updated++;
    } catch (error) {
      console.warn('[한국어 라벨] 배경지도 POI 텍스트 설정 건너뜀', layer.id, error);
    }
  }
  return updated;
}
