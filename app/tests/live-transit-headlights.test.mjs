import test from 'node:test';
import assert from 'node:assert/strict';
import {withTrainHeadlights} from '../src/features/liveTransit/train-headlights.js';
function artwork(){
 const width=96,height=96,data=new Uint8Array(width*height*4);
 for(let y=28;y<68;y++)for(let x=4;x<92;x++)data.set([210,221,225,255],(y*width+x)*4);
 return {width,height,data};
}
function mirror(sprite){const {width:w,height:h,data}=sprite,out=new Uint8Array(data.length);for(let y=0;y<h;y++)for(let x=0;x<w;x++)out.set(data.subarray((y*w+x)*4,(y*w+x)*4+4),(y*w+w-1-x)*4);return {...sprite,data:out};}
function changed(a,b){const points=[];for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++){const i=(y*a.width+x)*4;if(a.data.subarray(i,i+3).some((v,k)=>v!==b.data[i+k]))points.push([x,y]);}return points;}
test('headlights are painted only on the correct leading end; source is not mutated',()=>{
 const base=artwork(),copy=base.data.slice(),right=withTrainHeadlights(base,'right'),left=withTrainHeadlights(base,'left');
 assert.deepEqual(base.data,copy);assert.equal(right.width,96);assert.equal(right.height,96);
 const r=changed(base,right),l=changed(base,left);
 assert(r.length>20&&l.length>20);assert(r.every(([x])=>x>80));assert(l.every(([x])=>x<15));
 assert.deepEqual(mirror(right).data,left.data);
 assert(r.some(([x,y])=>{const p=(y*96+x)*4;return right.data[p]===248&&right.data[p+2]===255;}));
});
test('transparent boundaries and off-state artwork are retained exactly',()=>{
 const base=artwork(),lit=withTrainHeadlights(base,'right');
 for(let i=3;i<base.data.length;i+=4)assert.equal(lit.data[i],base.data[i]);
 assert.equal(withTrainHeadlights(base,'unknown'),base);
 const empty={width:96,height:96,data:new Uint8Array(96*96*4)};assert.equal(withTrainHeadlights(empty,'right'),empty);
});
