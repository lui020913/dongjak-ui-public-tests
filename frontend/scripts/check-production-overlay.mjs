import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

// Allowlisted CSS-only UI delta for the *existing* integrated application.
// Treat public commits as untrusted until these checks and full-app tests pass.
const cssPath=fileURLToPath(new URL('../production/dongjak-production-overlay.css',import.meta.url));
const original=readFileSync(cssPath,'utf8');
if(original.length===0 || original.length>24000) throw Error('Production overlay must be nonempty and <= 24 KB');
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
const layoutSelectors=new Set([
  "html body #app#app#app#app#app#app#app#app#app#app #transport-sheet[data-kind=\"subway\"]:not(.dj871-sheet-expanded):not([hidden])",
  "html body #app#app#app#app#app#app#app#app#app#app #transport-sheet[data-kind=\"subway\"] .metro-direction-grid",
  "html body #app#app#app#app#app#app#app#app#app#app #transport-sheet[data-kind=\"subway\"] .metro-direction-heading",
  "html body #app#app#app#app#app#app#app#app#app#app #transport-sheet[data-kind=\"subway\"] .metro-arrival-direction-group .transport-arrival-row",
  "html body #app#app#app#app#app#app#app#app#app#app #transport-sheet[data-kind=\"subway\"] .transport-panel-head",
  "html body #app#app#app#app#app#app#app#app#app#app #transport-sheet .dj875-transit-scroll",
  "html body #app#app#app#app#app#app#app#app#app#app #route-map-card:not([hidden])",
  "html body #app#app#app#app#app#app#app#app#app#app #route-map-card .dj804-compare-card",
  "html body #app#app#app#app#app#app#app#app#app#app #route-map-card .dj804-compare-grid",
  "html body #app#app#app#app#app#app#app#app#app#app #route-map-card .dj804-compare-metrics",
  "html body #app#app#app#app#app#app#app#app#app#app #route-panel .dj-sheet-chrome",
  "html body #app#app#app#app#app#app#app#app#app#app #participation-panel .dj-sheet-chrome",
  "html body #app#app#app#app#app#app#app#app#app#app #news-panel .dj-sheet-chrome",
  "html body #app#app#app#app#app#app#app#app#app#app #mine-panel .dj-sheet-chrome",
  "html body #app#app#app#app#app#app#app#app#app#app #route-panel .dj836-sheet-body",
  "html body #app#app#app#app#app#app#app#app#app#app #participation-panel .dj836-sheet-body",
  "html body #app#app#app#app#app#app#app#app#app#app #news-panel .dj836-sheet-body",
  "html body #app#app#app#app#app#app#app#app#app#app #mine-panel .dj836-sheet-body",
  "html body #app#app#app#app#app#app#app#app#app#app #dj840-map-tip:not([hidden])",
  "html body #app#app#app#app#app#app#app#app#app#app #bottom-nav .nav-tab"
]);
const layoutProperties=new Set(['max-height','min-height','height','padding','gap','margin','border-radius','grid-template-columns','align-items','justify-content','flex-shrink','flex','overflow-y','overscroll-behavior-y','min-width','text-align','line-height','font-size']);
let activeSelector='';
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
    if(!allowedSelectors.has(selector)&&!layoutSelectors.has(selector))throw Error('Production selector not allowlisted: '+selector);
    if(depth>1)throw Error('Nested CSS selectors are not permitted');
    activeSelector=selector;depth++;ruleCount++;continue;
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
  if(!(layoutSelectors.has(activeSelector)?layoutProperties:allowedProperties).has(property))throw Error('Unapproved CSS property: '+property);
  if(/url\s*\(|@|\\|var\s*\(|expression\s*\(|[<>]/i.test(value) || (!layoutSelectors.has(activeSelector)&&/!important/i.test(value)) || !/^[a-zA-Z0-9#.,%() +/!-]+$/.test(value) || /!(?!important$)/.test(value))throw Error('Unsafe CSS value: '+property);
}
if(depth!==0 || ruleCount<1)throw Error('Unbalanced or empty CSS');
console.log('PASS: production CSS delta is scoped, restricted and credential-free ('+ruleCount+' rules).');
