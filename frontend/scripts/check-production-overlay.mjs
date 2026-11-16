import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

// Allowlisted CSS-only UI delta for the *existing* integrated application.
// Treat public commits as untrusted until these checks and full-app tests pass.
const cssPath=fileURLToPath(new URL('../production/dongjak-production-overlay.css',import.meta.url));
const original=readFileSync(cssPath,'utf8');
if(original.length===0 || original.length>12000) throw Error('Production overlay must be nonempty and <= 12 KB');
if(/[\u0000-\u0008\u000b\u000e-\u001f]/.test(original)) throw Error('Control character in overlay');
const source=original.replace(/\/\*[\s\S]*?\*\//g,'');
if(/\/\*|\*\//.test(source)) throw Error('Unterminated CSS comment');

const allowedSelectors=new Set([
  'html body #app .topbar .weather-widget #weather-label',
  'html body #app .topbar .map-quick-search-form > input',
  'html body #app .dj-sheet-chrome-title h2',
  'html body #app .dj-sheet-chrome-close svg',
  'html body #app #transport-close svg',
  'html body #app button:focus-visible',
  'html body #app a:focus-visible',
  'html body #app [role="button"]:focus-visible'
]);
const allowedProperties=new Set([
  'text-align','line-height','flex-shrink','outline','outline-offset'
]);
let depth=0;
let mediaDepth=0;
let ruleCount=0;
for(const [index,raw] of source.split(/\r?\n/).entries()){
  const line=raw.trim();
  if(!line)continue;
  if(/^@media \((min|max)-width: \d+px\) \{$/.test(line)){
    if(depth!==0)throw Error('Nested CSS media queries are forbidden at '+(index+1));
    depth=1;mediaDepth=1;continue;
  }
  if(line.endsWith('{')){
    const selector=line.slice(0,-1).trim();
    if(!allowedSelectors.has(selector))throw Error('Production selector not allowlisted: '+selector);
    if(depth>1)throw Error('Nested CSS selectors are not permitted');
    depth++;ruleCount++;continue;
  }
  if(line==='}'){
    if(depth<1)throw Error('Unbalanced CSS closing brace');
    depth--;
    if(depth===0)mediaDepth=0;
    continue;
  }
  const match=/^([a-z-]+): ([^;{}]+);$/.exec(line);
  if(!match || depth<(mediaDepth?2:1))throw Error('Malformed or unscoped declaration at line '+(index+1));
  const property=match[1],value=match[2];
  if(!allowedProperties.has(property))throw Error('Unapproved CSS property: '+property);
  if(/url\s*\(|@|\\|!important|var\s*\(|expression\s*\(|[<>]/i.test(value))throw Error('Unsafe CSS value: '+property);
}
if(depth!==0 || ruleCount<1)throw Error('Unbalanced or empty CSS');
console.log('PASS: production CSS delta is scoped, restricted and credential-free ('+ruleCount+' rules).');
