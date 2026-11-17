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

// Additional exact mobile alignment rules. These are a narrow, reviewed
// exception: no generic selector/property expansion and no dynamic values.
const alignmentPrefix='html body #app#app#app#app#app#app#app#app#app#app ';
const exactAlignment=new Map([
 ['html body #app', {'--dj890-dock-gap':'8px !important'}],
 [alignmentPrefix+'#mine-panel .dj834-settings-group > button', {
   'display':'flex !important','align-items':'center !important','justify-content':'flex-start !important','gap':'12px !important','min-width':'0 !important','min-height':'62px !important','padding':'11px 14px !important','text-align':'left !important'
 }],
 [alignmentPrefix+'#mine-panel .dj834-settings-group > button > .dj834-setting-icon', {'flex':'0 0 33px !important','margin':'0 !important'}],
 [alignmentPrefix+'#mine-panel .dj834-settings-group > button > span:nth-child(2)', {'flex':'1 1 0% !important','min-width':'0 !important','white-space':'normal !important','word-break':'keep-all !important','overflow-wrap':'break-word !important','writing-mode':'horizontal-tb !important','text-align':'left !important','line-height':'1.4 !important'}],
 [alignmentPrefix+'#mine-panel .dj834-settings-group > button > .dj834-current-theme', {'flex':'0 0 auto !important','margin-left':'auto !important','white-space':'nowrap !important','word-break':'keep-all !important'}],
 [alignmentPrefix+'#mine-panel .dj834-settings-group > button > .dj834-chevron', {'flex':'0 0 16px !important','width':'16px !important','margin-left':'auto !important','text-align':'right !important','white-space':'nowrap !important','line-height':'1 !important'}],
 [alignmentPrefix+'#route-panel .route-select-actions > button', {'flex':'0 0 auto !important','min-width':'44px !important','min-height':'44px !important','white-space':'nowrap !important','word-break':'keep-all !important','overflow-wrap':'normal !important','writing-mode':'horizontal-tb !important','text-align':'center !important'}],
 [alignmentPrefix+'#route-panel .route-location-text', {'flex':'1 1 auto !important','min-width':'0 !important','word-break':'keep-all !important','overflow-wrap':'break-word !important'}],
 [alignmentPrefix+'#route-panel .route-select-actions', {'flex':'0 0 auto !important','gap':'6px !important','align-items':'center !important'}]
]);
let activeMedia='';
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
    depth=1;mediaDepth=1;activeMedia=line;continue;
  }
  if(line.endsWith('{')){
    const selector=line.slice(0,-1).trim();
    if(!allowedSelectors.has(selector)&&!layoutSelectors.has(selector)&&!exactAlignment.has(selector))throw Error('Production selector not allowlisted: '+selector);
    if(exactAlignment.has(selector)&&activeMedia!=='@media (max-width: 699px) {')throw Error('Alignment rules must be in exactly the mobile media query');
    if(depth>1)throw Error('Nested CSS selectors are not permitted');
    activeSelector=selector;depth++;ruleCount++;continue;
  }
  if(line==='}'){
    if(depth<1)throw Error('Unbalanced CSS closing brace');
    depth--;
    if(depth===0){mediaDepth=0;activeMedia='';}
    continue;
  }
  const match=/^(--dj890-dock-gap|[a-z-]+): ([^;{}]+);$/.exec(line);
  if(!match || depth<(mediaDepth?2:1))throw Error('Malformed or unscoped declaration at line '+(index+1));
  const property=match[1],value=match[2];
  if(exactAlignment.has(activeSelector)){
    const declarations=exactAlignment.get(activeSelector);
    if(!Object.hasOwn(declarations,property)||declarations[property]!==value)throw Error('Unreviewed mobile alignment value: '+activeSelector+' / '+property);
    continue;
  }
  if(!(layoutSelectors.has(activeSelector)?layoutProperties:allowedProperties).has(property))throw Error('Unapproved CSS property: '+property);
  if(/url\s*\(|@|\\|var\s*\(|expression\s*\(|[<>]/i.test(value) || (!layoutSelectors.has(activeSelector)&&/!important/i.test(value)) || !/^[a-zA-Z0-9#.,%() +/!-]+$/.test(value) || /!(?!important$)/.test(value))throw Error('Unsafe CSS value: '+property);
}
if(depth!==0 || ruleCount<1)throw Error('Unbalanced or empty CSS');
console.log('PASS: production CSS delta is scoped, restricted and credential-free ('+ruleCount+' rules).');
