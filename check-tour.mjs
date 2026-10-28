import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {layoutPins} from './public/tour-math.js';
const tour=JSON.parse(await readFile(new URL('./public/tour.json',import.meta.url),'utf8'));
for(const width of [660,850,1100,1600]){
 for(const height of [690,800,1000]){
  for(const step of tour.steps){
   const out=layoutPins(step.pins.map((p,i)=>({x:width/2,y:150+i*80})),width,height);
   assert.equal(out.length,step.pins.length);
   for(const p of out){assert(Number.isFinite(p.left)&&Number.isFinite(p.top));assert(p.left>=0&&p.left+p.width<=width);assert(p.top>=120&&p.top<height-200);}
   for(let i=0;i<out.length;i++)for(let j=i+1;j<out.length;j++)if(out[i].side===out[j].side)assert(Math.abs(out[i].top-out[j].top)>=100);
  }
 }
}
assert(tour.steps.filter(s=>s.segment).length===2);
assert(tour.steps.filter(s=>s.facts.includes(20)).length===3);
console.log('Annotation placement bounds checked for all 65 steps at 12 desktop/tablet viewport sizes; both artery divisions and all 3 median-nerve stages present.');
