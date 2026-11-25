import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createTrainBeamSprite} from '../src/features/liveTransit/train-beams.js';
import {measuredPhoneDockClearance} from '../src/v889-mobile-sheet-motion.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const generatedOrSource=(generated,source)=>{
  try{return read(generated);}
  catch(error){if(error?.code!=='ENOENT')throw error;return read(source);}
};

test('school, daycare, park and civic use vector pictograms instead of one-Hangul-letter glyphs',()=>{
 const code=read('src/safety-layers.js');
 assert.match(code,/registerFacilityIcons\(map\)/);
 assert.match(code,/id:'public-glyphs'[\s\S]*?'icon-image'/);
 assert.match(code,/iconName\('school'\)/);
 assert.match(code,/iconName\('park'\)/);
 assert.match(code,/iconName\('civic'\)/);
 assert.doesNotMatch(code,/daycare','어'|school','학'|park','공'|government','관'/);
});

test('only park map label owner writes park names; supplementary layers retain clickable icons',()=>{
 const safety=read('src/safety-layers.js');
 const official=read('src/seoul-official-facilities.js');
 const main=read('src/main.js');
 assert.match(main,/installParkNameLabels\(map,boundaryGeometry\)/);
 assert.match(safety,/filter:\['!=',\['get','kind'\],'park'\]/);
 assert.match(official,/'text-field':\['case',\['==',\['get','category'\],'공원'\],''/);
 assert.match(official,/map\.on\('click',id,click\)/);
});

test('history and advanced tools use the SAME My Info detail/back animation and content owner',()=>{
 const info=read('src/v834-my-info.js');
 assert.match(info,/data-dj834-action="history"/);
 assert.doesNotMatch(info,/data-dj834-action="tools"/);
 assert.match(info,/className='dj834-advanced-tools'/);
 assert.match(info,/advancedTools\.append\(advancedTitle,toolsBox\);mapBox\.append\(advancedTools\)/);
 assert.match(info,/history:historyBox,map:mapBox/);
 assert.match(info,/enter\(detail,'forward'\)/);
 assert.match(info,/enter\(landing,'back'\)/);
 const followup=generatedOrSource('src/mobile-17-followup.js','../frontend/production/mobile-17-followup.js');
 assert.match(followup,/\.dj834-tools-container/);
 assert.doesNotMatch(followup,/createElement\('details'\);root\.className='dj17-more-root'/);
 const styles=generatedOrSource('src/mobile-17-followup.css','../frontend/production/mobile-17-followup.css');
 assert.match(styles,/\.dj834-tools-container/);
});

test('nearby compact and expanded panels share an 8px measured dock, not a stale 95px CSS guess',()=>{
 assert.equal(measuredPhoneDockClearance({top:714},{innerHeight:844},{gap:8}),138);
 assert.equal(measuredPhoneDockClearance({top:714},{innerHeight:844,visualViewport:{height:810,offsetTop:15}},{gap:8}),119);
 assert.equal(measuredPhoneDockClearance({top:714},{innerHeight:844},{minimum:150,gap:8}),150);
 const css=generatedOrSource('src/mobile-next.css','../frontend/production/mobile-next.css');
 assert.match(css,/inset:auto 12px var\(--dj-nearby-dock-clearance/);
 const native=read('src/pedestrian-tools.js'),motion=read('src/v889-mobile-sheet-motion.js');
 assert.match(native,/measuredPhoneDockClearance\(rect,window,\{minimum:0,gap:8\}\)/);
 assert.match(motion,/measuredPhoneDockClearance\(nav,win,\{minimum:72,gap:8\}\)/);
});

test('metro source renders warm-white translucent radial pool on known front, never a wedge',()=>{
 const right=createTrainBeamSprite('right'),left=createTrainBeamSprite('left');
 const px=(p,x,y)=>((y*p.width+x)*4);
 const nose=px(right,184,50),far=px(right,235,50);
 assert(right.data[nose+3]>100,'visible nose bloom');
 assert(right.data[far+3]<right.data[nose+3],'radial glow falls off forward');
 assert(right.data[nose]>right.data[nose+1]&&right.data[nose+1]>right.data[nose+2]);
 assert.equal(right.data[nose],255);
 assert(right.data[nose+3]>150,'stronger daytime-visible bloom');
 assert.equal(right.data[px(right,120,50)+3],0,'no light far behind the nose');
 assert.equal(left.data[px(left,71,50)+3],right.data[px(right,184,50)+3]);
 const m=read('src/features/liveTransit/index.js');
 assert.match(m,/\['get','trainBeam'\]/);
 assert.match(m,/TRAIN_BEAM_LAYER/);
});

test('map settings dismissal fades the entire backdrop without exposing a white frame',()=>{
 const code=read('src/v7120-settings.js');
 assert.match(code,/const animation=overlay\.animate\(\[\{opacity:1\},\{opacity:0\}\]/);
 assert.match(code,/overlay\.hidden=true;app\.classList\.remove\('dj-settings-open'\)/);
 assert.match(code,/\+\+settingsTransition;closingSettings\?\.cancel/);
 assert.doesNotMatch(code,/DongjakWindowMotion\.close\(overlay\.querySelector\('\.dj-map-settings-card'/);
});
