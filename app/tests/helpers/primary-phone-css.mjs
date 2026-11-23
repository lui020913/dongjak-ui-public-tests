import {readFileSync} from 'node:fs';

// Keep historical UI assertions scoped to the exact verbatim primary-page
// stylesheet rather than the surrounding shared mobile shell.
export function readPrimaryPhoneCss(){
 const source=readFileSync(new URL('../../src/mobile-first-layout.css',import.meta.url),'utf8');
 const begin='/* BEGIN original mobile-primary-fullscreen.css (verbatim, immediately after mobile-first-layout.css) */\n';
 const end='\n/* END original mobile-primary-fullscreen.css */';
 const first=source.indexOf(begin),last=source.indexOf(end,first+begin.length);
 if(first<0||last<first)throw new Error('Consolidated primary-phone CSS section is missing');
 return source.slice(first+begin.length,last);
}
