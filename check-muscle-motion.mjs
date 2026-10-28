import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import * as THREE from './public/vendor/three.module.js';
import {aboutJoint,createMuscleDeformer,createMuscleMotionRig,createJointPlan} from './public/muscle-motion-rig.js';
import {lectureModelPaths} from './public/lecture-runtime.js';

// Decode the actual bundled Draco assets, not bounding-box substitutes. The
// browser uses the same decoder/positions and its own single renderer.
const context=vm.createContext({console,WebAssembly,TextDecoder,TextEncoder,setTimeout,clearTimeout});
vm.runInContext(await readFile('public/vendor/draco_wasm_wrapper.js','utf8'),context);
const draco=await context.DracoDecoderModule({wasmBinary:await readFile('public/vendor/draco_decoder.wasm')});
const decoder=new draco.Decoder();
async function model(path,layer,scene,byName){
 const bytes=await readFile('public'+path),length=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+length));
 const bin=bytes.subarray(20+length+8),objects=gltf.nodes.map(n=>{
   let obj=new THREE.Object3D();
   if(n.mesh!=null){
    const p=gltf.meshes[n.mesh].primitives[0],ext=p.extensions.KHR_draco_mesh_compression,view=gltf.bufferViews[ext.bufferView],input=bin.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength);
    const buffer=new draco.DecoderBuffer();buffer.Init(input,input.length);const decoded=new draco.Mesh(),status=decoder.DecodeBufferToMesh(buffer,decoded);assert(status.ok());
    const geo=new THREE.BufferGeometry();
    for(const [semantic,key]of [['POSITION','position'],['NORMAL','normal']]){
     if(ext.attributes[semantic]==null)continue;
     const attribute=decoder.GetAttributeByUniqueId(decoded,ext.attributes[semantic]),array=new draco.DracoFloat32Array();decoder.GetAttributeFloatForAllPoints(decoded,attribute,array);
     const values=new Float32Array(array.size());for(let i=0;i<values.length;i++)values[i]=array.GetValue(i);
     geo.setAttribute(key,new THREE.BufferAttribute(values,attribute.num_components()));draco.destroy(array);
    }
    const face=new draco.DracoInt32Array(),indices=[];for(let i=0;i<decoded.num_faces();i++){decoder.GetFaceFromMesh(decoded,i,face);indices.push(face.GetValue(0),face.GetValue(1),face.GetValue(2));}geo.setIndex(indices);
    draco.destroy(face);draco.destroy(decoded);draco.destroy(buffer);draco.destroy(status);
    obj=new THREE.Mesh(geo,new THREE.MeshStandardMaterial());obj.userData={anatomyName:n.extras?.anatomyName||n.name,displayLayer:layer};byName.set(obj.userData.anatomyName,obj);
   }
   if(n.matrix){obj.matrix.fromArray(n.matrix);obj.matrix.decompose(obj.position,obj.quaternion,obj.scale);}else{if(n.translation)obj.position.fromArray(n.translation);if(n.rotation)obj.quaternion.fromArray(n.rotation);if(n.scale)obj.scale.fromArray(n.scale);}
   return obj;
 });
 gltf.nodes.forEach((n,i)=>(n.children||[]).forEach(child=>objects[i].add(objects[child])));for(const root of gltf.scenes[gltf.scene||0].nodes)scene.add(objects[root]);
}
async function checkLecture(id){
const scene=new THREE.Scene(),byName=new Map(),data=JSON.parse(await readFile(`public/lectures/l${id}/tour.json`));
const paths=lectureModelPaths(String(id),data);
await model(paths.find(p=>p.system==='skeletal').path,'bones',scene,byName);
await model(paths.find(p=>p.system==='muscular').path,'muscles',scene,byName);scene.updateMatrixWorld(true);
const meshes=[...byName.values()];
const positions=new Map(meshes.map(m=>[m,m.geometry.attributes.position.array.slice()])),worlds=new Map(meshes.map(m=>[m,m.matrixWorld.clone()]));
const normals=new Map(meshes.filter(m=>m.geometry.attributes.normal).map(m=>[m,m.geometry.attributes.normal.array.slice()]));
const almost=(a,b,tolerance=2e-6)=>{assert.equal(a.length,b.length);for(let i=0;i<a.length;i++)assert(Math.abs(a[i]-b[i])<tolerance,`coordinate ${i}: ${a[i]} vs ${b[i]}`);};
// Joint pivot invariance and clinical movement signs in atlas coordinates.
const pivot=new THREE.Vector3(.1,.4,-.1),point=pivot.clone().add(new THREE.Vector3(0,-.4,0));
const flex=aboutJoint(pivot,new THREE.Vector3(1,0,0),-.5);assert(pivot.clone().applyMatrix4(flex).distanceTo(pivot)<1e-9);assert(point.clone().applyMatrix4(flex).z>point.z);
const plantar=aboutJoint(pivot,new THREE.Vector3(1,0,0),.4);assert(pivot.clone().add(new THREE.Vector3(0,0,.1)).applyMatrix4(plantar).y<pivot.y);
// Nonlinear distal tendon weights must not distort any neutral vertex.
const sample=byName.get('Tibialis anterior muscle.r')||byName.get(data.muscles[0].mesh_names[0]);const d=createMuscleDeformer(sample,new THREE.Vector3(0,-1,0),[],{distalOnly:true});d.apply([new THREE.Matrix4()]);almost(sample.geometry.attributes.position.array,positions.get(sample));d.restore();
let actions=0;
for(const muscle of data.muscles)for(const action of [...muscle.action_section.primary_actions,...muscle.action_section.secondary_actions]){
 scene.updateMatrixWorld(true);const plan=createJointPlan(byName,action),rig=createMuscleMotionRig({byName,meshes,muscle,action});
 assert(rig.clip instanceof THREE.AnimationClip);assert.equal(rig.clip.name,muscle.muscle_id+'_action_clip');
 assert(rig.moving.length>0);const startWorlds=new Map(rig.moving.map(m=>[m,m.matrixWorld.clone()])),startVertices=new Map(rig.selected.map(m=>[m,m.geometry.attributes.position.array.slice()]));rig.pose(1);scene.updateMatrixWorld(true);
 assert(rig.moving.some(m=>m.matrixWorld.elements.some((v,i)=>Math.abs(v-startWorlds.get(m).elements[i])>1e-5)));
 assert(rig.selected.some(m=>m.geometry.attributes.position.array.some((v,i)=>Math.abs(v-startVertices.get(m)[i])>1e-6)),`${muscle.name_en}: no actual tissue deformation`);
 for(const mesh of rig.selected)assert(mesh.geometry.attributes.position.array.every(Number.isFinite));
 if(id===8&&muscle.profile_id==='edl'){
   const tendon=byName.get('Tendon of extensor digitorum longus.r'),source=positions.get(tendon),originalWorld=worlds.get(tendon);
   const p=new THREE.Vector3(),q=new THREE.Vector3();
   if(action.joint_id.startsWith('toes_')){
     assert.deepEqual(byName.get('Extensor digitorum longus.r').geometry.attributes.position.array,positions.get(byName.get('Extensor digitorum longus.r')),'Toe motion pulled the ankle end of the leg belly');
     let stem=0;
     for(let i=0;i<tendon.geometry.attributes.position.count;i++){
       p.fromArray(source,i*3).applyMatrix4(originalWorld);q.fromBufferAttribute(tendon.geometry.attributes.position,i).applyMatrix4(tendon.matrixWorld);
       if(p.z<.03){assert(q.distanceTo(p)<2e-6,'Toe extension moved the common ankle stem');stem++;}
     }
     assert(stem>0);
     for(const stage of plan.stages){
       const ordinal=['first','second','third','fourth','fifth'][stage.digit-1];
       const bone=byName.get(`Distal phalanx of ${ordinal} finger of foot.r`);
       // Choose a rest-pose terminal tendon vertex near this digit's source
       // distal phalanx, then compare with THAT digit's rigid world motion.
       const restBox=new THREE.Box3().setFromBufferAttribute(bone.geometry.attributes.position).applyMatrix4(worlds.get(bone));
       const restCenter=restBox.getCenter(new THREE.Vector3());restCenter.z=restBox.max.z;
       let best=Infinity,index=-1;
       for(let i=0;i<tendon.geometry.attributes.position.count;i++){
         p.fromArray(source,i*3).applyMatrix4(originalWorld);
         if(p.z<stage.pivot.z+.001)continue;
         const distance=p.distanceToSquared(restCenter);if(distance<best){best=distance;index=i;}
       }
       assert(index>=0&&best<.001,'Missing distal slip for toe '+stage.digit);
       p.fromArray(source,index*3).applyMatrix4(originalWorld);
       const transform=bone.matrixWorld.clone().multiply(worlds.get(bone).clone().invert());
       q.fromBufferAttribute(tendon.geometry.attributes.position,index).applyMatrix4(tendon.matrixWorld);
       const originalPoint=p.clone(),expected=p.applyMatrix4(transform);
       assert(q.distanceTo(expected)<2e-6,`${action.joint_id}: EDL slip detached from toe ${stage.digit}; source=${originalPoint.toArray()} pivot=${stage.pivot.toArray()} distance=${q.distanceTo(expected)}`);
     }
   }else{
     const bone=byName.get(action.joint_id==='ankle_right'?'Talus.r':'Calcaneus.r');
     const transform=bone.matrixWorld.clone().multiply(worlds.get(bone).clone().invert());
     for(let i=0;i<tendon.geometry.attributes.position.count;i++){
       p.fromArray(source,i*3).applyMatrix4(originalWorld).applyMatrix4(transform);q.fromBufferAttribute(tendon.geometry.attributes.position,i).applyMatrix4(tendon.matrixWorld);
       assert(q.distanceTo(p)<2e-6,'Foot action detached the EDL tendons from the foot');
     }
   }
 }
 if([2,3].includes(id)){
   assert(plan.upper,'Upper actions reached a lower-limb pivot');
   for(const bone of rig.moving)assert(bone.userData.anatomyName.endsWith('.r'),'Left-side anatomy moved');
   const origin=worlds.get(byName.get('Humerus.r'));
   if(action.joint_id==='elbow_right')assert.deepEqual(byName.get('Humerus.r').matrixWorld.elements,origin.elements,'Elbow action moved humerus');
   if(action.joint_id==='forearm_right'&&!action.condition)assert.deepEqual(byName.get('Ulna.r').matrixWorld.elements,worlds.get(byName.get('Ulna.r')).elements,'Pronation rotated ulna');
   if(action.joint_id==='wrist_right')for(const name of ['Ulna.r','Radius.r'])assert.deepEqual(byName.get(name).matrixWorld.elements,worlds.get(byName.get(name)).elements,'Wrist action moved forearm');
   if(action.joint_id.startsWith('fingers_'))for(const name of ['First','Second','Third','Fourth','Fifth'].map(o=>o+' metacarpal bone.r'))assert.deepEqual(byName.get(name).matrixWorld.elements,worlds.get(byName.get(name)).elements,'Finger action moved palm');
   if(action.joint_id==='thumb_ip_right')assert(!rig.moving.some(b=>!b.userData.anatomyName.startsWith('Distal phalanx of first finger of hand')),'Thumb IP action moved unrelated joint');
   if(action.joint_id==='scapula_right'){
     const motion=name=>byName.get(name).matrixWorld.clone().multiply(worlds.get(byName.get(name)).clone().invert());
     const clavicle=motion('Clavicle.r'),scapula=motion('Scapula.r'),sternal=plan.stages[0].pivot;
     assert(sternal.clone().applyMatrix4(clavicle).distanceTo(sternal)<1e-8,'SC anchor disconnected');
     if(plan.stages.length>1){const ac=plan.stages[1].pivot;assert(ac.clone().applyMatrix4(clavicle).distanceTo(ac.clone().applyMatrix4(scapula))<1e-8,'AC anchor disconnected');}
   }
 }
 // Regression: knee movement follows the insertion without pulling the thigh
 // belly off its fixed femoral/pelvic segment. Conversely, the calf follows
 // the tibia during knee flexion, rather than elongating in world space.
 if(action.joint_id==='knee_right')for(const mesh of rig.selected){
   const source=positions.get(mesh),originalWorld=worlds.get(mesh),p=new THREE.Vector3(),q=new THREE.Vector3();
   const quad=['rectus','vastus-l','vastus-m','vastus-i'].includes(muscle.profile_id);
   const calf=muscle.profile_id==='gastrocnemius';
   const tibiaMotion=byName.get('Tibia.r').matrixWorld.clone().multiply(worlds.get(byName.get('Tibia.r')).clone().invert());
   let checked=0;
   for(let i=0;i<mesh.geometry.attributes.position.count;i++){
     p.fromArray(source,i*3).applyMatrix4(originalWorld);q.fromBufferAttribute(mesh.geometry.attributes.position,i).applyMatrix4(mesh.matrixWorld);
     if(quad&&p.y>.52){assert(q.distanceTo(p)<2e-6,'Quadriceps belly pulled away from fixed femur');checked++;}
     if(calf&&p.y<.30){assert(q.distanceTo(p.applyMatrix4(tibiaMotion))<2e-6,'Calf detached from moving tibial segment');checked++;}
   }
   if(quad||calf)assert(checked>0,'Attachment regression did not exercise source vertices');
 }
 if(action.digits){
   const changed=meshes.filter(m=>m.userData.displayLayer==='bones'&&m.matrixWorld.elements.some((v,i)=>Math.abs(v-worlds.get(m).elements[i])>1e-6));
   for(const mesh of changed)assert(plan.stages.some(s=>s.test(mesh.userData.anatomyName)),`Unrelated toe moved: ${mesh.userData.anatomyName}`);
 }
 rig.play();rig.tick(0);const a=rig.tick(70),b=rig.tick(140);assert(b>a,'Mixer phase not advancing');rig.pause();assert.equal(rig.tick(210),null);
 rig.dispose();scene.updateMatrixWorld(true);
 for(const mesh of meshes){almost(mesh.geometry.attributes.position.array,positions.get(mesh),1e-10);if(normals.has(mesh))almost(mesh.geometry.attributes.normal.array,normals.get(mesh),1e-10);almost(mesh.matrixWorld.elements,worlds.get(mesh).elements,1e-10);assert(mesh.matrixAutoUpdate);}
 actions++;
}
for(const mesh of meshes){mesh.geometry.dispose();mesh.material.dispose();}
console.log(`PASS L${id}: ${data.muscles.length} muscles / ${actions} real 3D actions; actual Draco geometry deforms, joint directions, digit specificity, mixer pause and exact source-pose restoration.`);
}
for(const id of process.argv.length>2?process.argv.slice(2).map(Number):[2,3,7,8,9,10])await checkLecture(id);
draco.destroy(decoder);
