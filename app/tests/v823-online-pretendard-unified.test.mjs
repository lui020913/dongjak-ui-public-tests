import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const cdn='https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css';

test('v823: official variable Pretendard stylesheet loads once via HTML on all devices',()=>{
 const html=read('index.html');
 assert.ok(html.includes(cdn));
 assert.equal(html.split(cdn).length-1,1);
 assert.ok(html.indexOf(cdn)<html.indexOf('/src/local-font.css'));
 assert.doesNotMatch(read('src/style.css'),/@import url\('https:\/\/cdn\.jsdelivr\.net\/gh\/orioncactus\/pretendard/);
});
test('v823: high-specificity final rule covers PC/mobile, popups and startup without changing sizes',()=>{
 const css=read('src/local-font.css');
 for(const part of ['#app#app','maplibregl-popup','map-startup-overlay','input','textarea','button'])assert.ok(css.includes(part));
 assert.match(css,/Pretendard Variable/);
 assert.doesNotMatch(css,/font-size\s*:|font-weight\s*:/);
 assert.doesNotMatch(css,/@font-face|src\s*:\s*local\(/);
});
test('v823: no proprietary font files or legacy Nanum stylesheet in final public assets',()=>{
 const html=read('index.html');
 assert.doesNotMatch(html,/hangeul\.pstatic\.net/);
 assert.doesNotMatch(html,/Apple SD Gothic Neo/);
 const names=readdirSync(new URL('../public/',import.meta.url),{recursive:true}).map(String);
 assert.equal(names.some(n=>/AppleSDGothicNeo.*\.(ttf|otf|woff2?)$/i.test(n)),false);
});
