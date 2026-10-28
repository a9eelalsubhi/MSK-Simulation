import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import * as THREE from './public/vendor/three.module.js';
import {LECTURE_IDS,lectureModelPaths,validateLecture,lectureTargets} from './public/lecture-runtime.js';
const base=new URL('./public/',import.meta.url),cache=new Map();
async function model(path){
  if(cache.has(path))return cache.get(path);
  const bytes=await readFile(new URL('.'+path,base));
  assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(8),bytes.length);
  const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  const meshes=new Map(),parent=new Map();
  gltf.nodes.forEach((node,i)=>(node.children||[]).forEach(child=>{assert(!parent.has(child),`${path}: multiply parented node`);parent.set(child,i);}));
  const worlds=new Map();
  function world(i,trail=new Set()){
    if(worlds.has(i))return worlds.get(i);
    assert(!trail.has(i),`${path}: hierarchy cycle`);trail.add(i);
    const node=gltf.nodes[i],local=node.matrix?new THREE.Matrix4().fromArray(node.matrix):new THREE.Matrix4().compose(
      new THREE.Vector3(...(node.translation||[0,0,0])),new THREE.Quaternion(...(node.rotation||[0,0,0,1])),new THREE.Vector3(...(node.scale||[1,1,1])));
    const matrix=parent.has(i)?world(parent.get(i),trail).clone().multiply(local):local;
    assert(matrix.elements.every(Number.isFinite));assert(Math.abs(matrix.determinant())>1e-12,`${path}: degenerate transform`);
    worlds.set(i,matrix);return matrix;
  }
  for(const [i,node]of gltf.nodes.entries())if(node.mesh!=null){
    const name=node.extras?.anatomyName||node.name;assert(name);assert(!meshes.has(name),`${path}: duplicate ${name}`);
    const primitive=gltf.meshes[node.mesh].primitives[0],p=gltf.accessors[primitive.attributes.POSITION];
    assert(p.count>0);assert(p.min?.every(Number.isFinite)&&p.max?.every(Number.isFinite));
    const box=new THREE.Box3(new THREE.Vector3(...p.min),new THREE.Vector3(...p.max)).applyMatrix4(world(i));
    assert(!box.isEmpty());meshes.set(name,{box});
  }
  cache.set(path,meshes);return meshes;
}
let scenes=0,pins=0,quizzes=0;
for(const id of LECTURE_IDS){
  const prefix=id==='4'?'':`lectures/l${id}/`,data=JSON.parse(await readFile(new URL(prefix+'tour.json',base),'utf8')),names=new Map(),boneNames=new Set();
  if(id==='4')assert.deepEqual(data,JSON.parse(await readFile(new URL('./tour-source.json',import.meta.url),'utf8')),'L4: canonical source must preserve published context/ghosting after regeneration');
  for(const {path,system}of lectureModelPaths(id,data))for(const [name,m]of await model(path)){assert(!names.has(name),`L${id}: duplicate ${name}`);names.set(name,m);if(system==='skeletal')boneNames.add(name);}
  validateLecture(data,names);
  for(const step of data.steps){
    for(const page of step.pages)await access(new URL(prefix+`slides/${page}.jpg`,base));
    for(const ref of step.sourceReferences||[])await access(new URL('.'+ref.src,base));
    for(const page of step.referencePages||[]){assert(data.referenceSlides?.[page],`L${id}/${step.id}: missing reference page ${page}`);await access(new URL('.'+data.referenceSlides[page].src,base));}
    for(const key of ['boneColors','structureColors','sceneOpacity'])for(const [name,value]of Object.entries(step[key]||{})){
      assert(names.has(name),`L${id}/${step.id}: ${key} target ${name}`);
      if(key==='sceneOpacity')assert(value>=0&&value<=1);
    }
    const visible=new Set([...step.focus,...(step.context||[]),...(step.boneContext||[]),...(step.muscleFocus||[]),...(step.ghostMuscles||[])]);
    for(const pin of step.pins)assert(visible.has(pin.target)||boneNames.has(pin.target)||!pin.context,`L${id}/${step.id||step.title}: hidden context pin ${pin.target}`);
  }
  for(const key of ['muscleProfiles','nerveProfiles'])for(const profile of data[key]||[]){
    if(profile.target)assert(names.has(profile.target));
    for(const field of ['scene','motorScene','skinScene','injuryScene'])if(profile[field])assert(data.steps.some(s=>s.id===profile[field]),`L${id}: profile ${field}`);
  }
  for(const route of data.routes||[])for(const step of route.stages||[])if(typeof step==='string')assert(data.steps.some(s=>s.id===step),`L${id}: route ${route.id}/${step}`);
  scenes+=data.steps.length;pins+=data.steps.reduce((n,s)=>n+s.pins.length,0);quizzes+=(data.functionalQuiz||[]).length;
  console.log(`L${id}: ${data.steps.length} scenes; ${names.size} loaded meshes; ${lectureTargets(data).size} exact references; source and quiz mappings valid`);
}
console.log(`PASS: ${LECTURE_IDS.length} lectures, ${scenes} scenes, ${pins} annotations, ${quizzes} functional questions; ${cache.size} model assets with valid hierarchy / transforms.`);
