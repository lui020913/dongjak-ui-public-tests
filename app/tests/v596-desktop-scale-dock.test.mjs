import test from 'node:test';
import assert from 'node:assert/strict';
import {desktopInformationDock,scaleDockTop} from '../src/map-scale-docking.js';
const rect=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height});

test('desktop: place BOTH card and scale in upper-left lane beside vertical nav, not at the bottom',()=>{
  const dock=desktopInformationDock({
    appRect:rect(0,0,1625,900),headerRect:rect(235,0,1180,72),
    navRect:rect(16,88,87,425),toolsRect:rect(120,90,96,44),
    cardHeight:60,scaleHeight:26
  });
  assert.equal(dock.card.left,228);
  assert.equal(dock.card.top,88);
  assert.equal(dock.card.width,430);
  assert.equal(dock.scale.left,dock.card.left);
  assert.equal(dock.scale.top,dock.card.top+60+10);
  assert.ok(dock.scale.top<300);
});

test('portrait desktop: side navigation can extend down without pushing card to map bottom',()=>{
  const dock=desktopInformationDock({
    appRect:rect(0,0,1200,1500),headerRect:rect(0,0,1200,100),
    navRect:rect(25,136,141,620),toolsRect:rect(25,780,140,64),
    cardHeight:62,scaleHeight:25
  });
  assert.equal(dock.card.left,178);
  assert.equal(dock.card.top,136);
  assert.equal(dock.card.width,430);
  assert.ok(dock.scale.top<450);
});

test('avoid map-options button in the same horizontal lane',()=>{
  const dock=desktopInformationDock({
    appRect:rect(0,0,1280,800),headerRect:rect(0,0,1280,72),
    navRect:rect(16,86,88,400),toolsRect:rect(125,140,110,40),
    cardHeight:70,scaleHeight:24
  });
  assert.equal(dock.card.top,86);
  assert.ok(dock.card.left>=247,'button overlap shifts dock sideways, not down');
  assert.ok(dock.scale.top>dock.card.top);
  assert.ok(dock.scale.top<190);
});

test('scale fallback mobile geometry remains unchanged',()=>{
  assert.equal(scaleDockTop({mapTop:72,mapBottom:928,cardTop:null,scaleHeight:26}),812);
});


test('compact desktop dock remains near the top on tall windows',()=>{
  const dock=desktopInformationDock({
    appRect:rect(0,0,920,1700),headerRect:rect(0,0,920,110),
    navRect:rect(18,152,145,710),toolsRect:rect(18,880,145,62),
    cardHeight:67,scaleHeight:27
  });
  assert.equal(dock.card.top,152);
  assert.equal(dock.card.left,175);
  assert.equal(dock.scale.top,229);
  assert.ok(dock.scale.top+27<300);
});
