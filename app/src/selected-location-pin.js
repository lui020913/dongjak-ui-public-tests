/** The same trusted SVG for facility, bus-stop and metro-selection markers. */
export function createSelectedLocationPin(doc=globalThis.document){
  if(!doc?.createElement)return null;
  const pin=doc.createElement('span');
  pin.className='dj807-facility-pin';
  // Static markup, no interpolated/untrusted input.
  pin.innerHTML='<svg viewBox="0 0 28 36" aria-hidden="true"><path d="M14 1.5C6.9 1.5 1.5 7 1.5 13.8c0 8.3 12.5 20.6 12.5 20.6s12.5-12.3 12.5-20.6C26.5 7 21.1 1.5 14 1.5Z"/><circle cx="14" cy="13.5" r="4.8"/></svg>';
  return pin;
}
