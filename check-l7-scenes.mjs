import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const data=JSON.parse(readFileSync('public/lectures/l7/tour.json','utf8'));
const buffer=readFileSync('public/lectures/l7/models/articular.glb');
const gltf=JSON.parse(buffer.subarray(20,20+buffer.readUInt32LE(12)).toString());
const names=new Set(gltf.nodes.map(n=>n.name));
assert.equal(names.size,91);
for(const index of [18,19,22,23,50,51,52,53,58,59,60,63,64,65,66,67]) {
 const step=data.steps[index];
 for(const pin of step.pins.filter(p=>/ligament|meniscus|cruciate/i.test(p.target))){
  assert(names.has(pin.target),`${index+1}: independently modeled ${pin.target}`);
  assert(step.focus.includes(pin.target));
  assert(!pin.context,'Actual structure must be selected, not just a context marker');
 }
}
assert(!data.steps[21].focus.includes('Femur.r'),'Socket must not be hidden by femoral head');
assert(data.steps[21].focus.includes('Acetabular labrum.r'));
assert.equal(data.steps[21].view,'socket');
assert(data.steps[21].cameraSpan<=.12);
assert(!data.steps[50].focus.includes('Femur.r'),'Superior meniscal view must be uncovered');
for(const name of ['Anterior cruciate ligament.r','Posterior cruciate ligament.r'])assert(data.steps[53].focus.includes(name));
assert(data.steps[53].sceneOpacity['Femur.r']<.2);
for(const index of [63,64])for(const [name,opacity] of Object.entries(data.steps[index].sceneOpacity))assert(opacity<.3,`${name} must not obscure ankle ligaments`);
assert(data.steps.every(s=>s.studyView));
console.log('PASS: actual articular geometry, unobstructed acetabulum/menisci, cruciate and ankle visibility, isolated teaching scenes.');
