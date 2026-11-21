/** Test fixture for a historical versioned stylesheet now stored in the
 * single mobile-ui-baseline.css. NEVER restore old runtime CSS files simply
 * to satisfy tests. The full cascade is still validated by the app build. */
import {readFileSync} from 'node:fs';
const baseline=readFileSync(new URL('../src/mobile-ui-baseline.css',import.meta.url),'utf8');

export function legacyCssSegment(name){
 const start='/* BEGIN LEGACY '+name+' */';
 const end='/* END LEGACY '+name+' */';
 const first=baseline.indexOf(start);
 const last=baseline.indexOf(end,first);
 if(first<0||last<=first)throw new Error('Missing historical CSS segment '+name);
 return baseline.slice(first+start.length,last);
}
export function inLegacyOrder(earlier,later){
 const first=baseline.indexOf('/* BEGIN LEGACY '+earlier+' */');
 const next=baseline.indexOf('/* BEGIN LEGACY '+later+' */');
 return first>=0&&next>first;
}
