import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {validateMuscleActions,actionRelationships} from './public/muscle-action-data.js';
import {lectureModelPaths} from './public/lecture-runtime.js';
const root=new URL('./public/',import.meta.url),catalog=JSON.parse(await readFile(new URL('lectures/lower-limb/muscle-actions.json',root)));
const byId=new Map(catalog.muscles.map(m=>[m.muscle_id,m]));
assert.equal(byId.size,52);
let bound=0;
for(const id of ['7','8','9','10']) {
 const data=JSON.parse(await readFile(new URL(`lectures/l${id}/tour.json`,root)));
 const path=data.modelPaths?.muscular||`/lectures/l${id}/models/muscular.glb`;
 const bytes=await readFile(new URL('.'+path,root)),gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
 assert.equal(gltf.animations?.length||0,0);assert.equal(gltf.skins?.length||0,0);
 const allNames=gltf.nodes.filter(n=>n.mesh!=null).map(n=>n.extras?.anatomyName||n.name);
 const expected=allNames.filter(n=>!/bursa|ligament|\bfascia\b|retinaculum|tract/i.test(n));
 const covered=[...new Set(data.muscles.flatMap(m=>m.mesh_names))];
 const edl=data.muscles.find(m=>m.profile_id==='edl'),tendonName='Tendon of extensor digitorum longus.r';
 if(id==='8'){
   assert(edl.mesh_names.includes(tendonName),'L8 EDL is still missing its distal tendon');
   assert.equal(edl.mesh_components[tendonName].kind,'toe_tendon');
   assert.deepEqual(edl.mesh_components[tendonName].digits,[2,3,4,5]);
   const step=data.steps.find(s=>s.profileId==='edl');assert(step.focus.includes(tendonName));
   assert(step.pins.some(p=>p.target===tendonName&&p.axis==='z'));
   assert.deepEqual(step.focusGroups['Extensor digitorum longus.r'],edl.mesh_names);
   // Exact source compressed topology, accessors and world transform: no
   // hand-built tendons, extra toe, scaling, or guessed attachment locations.
   const sourceBytes=await readFile(new URL('lectures/l1/models/muscular.glb',root));
   const source=JSON.parse(sourceBytes.subarray(20,20+sourceBytes.readUInt32LE(12)));
   const a=source.nodes.find(n=>n.name===tendonName),b=gltf.nodes.find(n=>n.name===tendonName);
   assert.deepEqual(b.translation,a.translation);assert.deepEqual(b.rotation,a.rotation);assert.deepEqual(b.scale,a.scale);
   const src=source.meshes[a.mesh].primitives[0],dst=gltf.meshes[b.mesh].primitives[0];
   for(const semantic of ['POSITION','NORMAL'])assert.deepEqual(gltf.accessors[dst.attributes[semantic]],source.accessors[src.attributes[semantic]]);
   const chunk=(raw,g,primitive)=>{const v=g.bufferViews[primitive.extensions.KHR_draco_mesh_compression.bufferView],offset=28+raw.readUInt32LE(12)+(v.byteOffset||0);return raw.subarray(offset,offset+v.byteLength);};
   assert.deepEqual(chunk(bytes,gltf,dst),chunk(sourceBytes,source,src),'EDL source topology was edited');
 }else{
   assert(!edl?.mesh_names.includes(tendonName),`L${id}: lecture-local tendon leaked into another lecture`);
   assert(!edl?.mesh_components,`L${id}: lecture-local motion behavior leaked`);
 }
 assert.deepEqual(covered.sort(),expected.sort(),`L${id}: missing muscle or fascia falsely classified as contractile`);
 assert(validateMuscleActions(data,new Map(allNames.map(n=>[n,{}])),catalog));
 for(const m of data.muscles) await access(new URL('.'+m.lecture_reference.src,root));
 for(const p of data.muscleProfiles||[]) {
   const source=byId.get(p.muscle_id);assert(source);assert.equal(p.action,source.lecture_action);
   assert.deepEqual(p.action_section,source.action_section);assert.deepEqual(p.action_details,p.action_section);
 }
 bound+=covered.length;
 // Prevent bad asset bindings from quietly opening an empty scene.
 const broken=structuredClone(data);broken.muscles[0].mesh_names=['Nonexistent muscle'];
 assert.throws(()=>validateMuscleActions(broken,new Map(allNames.map(n=>[n,{}])),catalog),/Missing action mesh/);
 const fakeClip=structuredClone(data);fakeClip.muscles[0].action_section.animation_trigger.animation_clip_name='fictional_clip';
 assert.throws(()=>validateMuscleActions(fakeClip,null,catalog),/unsupported animation contract/);
}
const actions=id=>byId.get(id).action_section.primary_actions;
const joints=id=>actions(id).map(a=>a.joint_id);
assert(!joints('biceps_femoris_short_head').includes('hip_right'));
assert(!joints('soleus').includes('knee_right'));
assert(joints('gastrocnemius').includes('knee_right'));
for(const id of ['flexor_hallucis_brevis','extensor_hallucis_brevis'])assert.deepEqual(joints(id),['hallux_mtp_right']);
assert(!joints('flexor_digitorum_brevis').includes('toes_dip_right'));
assert(actions('quadratus_plantae').every(a=>a.direct===false));
assert(actions('extensor_digitorum_brevis').every(a=>a.digits.join(',')==='2,3,4'));
assert.notDeepEqual(actions('adductor_magnus_adductor_part'),actions('adductor_magnus_hamstring_part'));
const rectus=byId.get('rectus_femoris');assert.deepEqual(joints('rectus_femoris'),['hip_right','knee_right']);
const knee=actions('rectus_femoris')[1],helpers=actionRelationships(rectus,knee,catalog.muscles);
assert.deepEqual(helpers.synergists.map(m=>m.muscle_id).sort(),['vastus_intermedius','vastus_lateralis','vastus_medialis']);
const hallux=byId.get('flexor_hallucis_brevis'),toeHelpers=actionRelationships(hallux,actions(hallux.muscle_id)[0],catalog.muscles);
assert(!toeHelpers.synergists.some(m=>m.muscle_id==='flexor_digitorum_brevis'));
console.log(`PASS: 52 action records, ${bound} bindings, physiological exclusions, toe/joint specificity and procedural clip metadata.`);

const upper=JSON.parse(await readFile(new URL('lectures/upper-limb/muscle-actions.json',root)));
assert.equal(upper.muscles.length,56);
for(const id of ['2','3']){
 const data=JSON.parse(await readFile(new URL(`lectures/l${id}/tour.json`,root)));
 const path=lectureModelPaths(id,data).find(p=>p.system==='muscular').path;
 const bytes=await readFile(new URL('.'+path,root)),gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));
 const byName=new Map(gltf.nodes.filter(n=>n.mesh!=null).map(n=>[n.extras?.anatomyName||n.name,{}]));
 validateMuscleActions(data,byName,upper);
 assert.equal(data.muscles.length,data.muscleProfiles.length);
 for(const profile of data.muscleProfiles){
   const entry=data.muscles.find(m=>m.profile_id===profile.id);assert(entry);
   assert.equal(entry.lecture_action,profile.action);
   const step=data.steps.find(s=>s.profileId===profile.id);
   assert.deepEqual(entry.source_references,step.referencePages.map(key=>data.referenceSlides[key]));
   for(const reference of entry.source_references)await access(new URL('.'+reference.src,root));
 }
}
const get=id=>upper.muscles.find(m=>m.muscle_id===id).action_section.primary_actions;
assert(!get('flexor_digitorum_superficialis').some(a=>a.joint_id==='fingers_dip_right'));
assert(get('flexor_digitorum_profundus').some(a=>a.joint_id==='fingers_dip_right'));
assert(!get('extensor_pollicis_brevis').some(a=>a.joint_id==='thumb_ip_right'));
assert(get('extensor_pollicis_longus').some(a=>a.joint_id==='thumb_ip_right'));
assert.equal(get('lumbricals_hand')[0].joint_id,'fingers_writing_right');
assert.deepEqual(get('extensor_indicis')[0].digits,[2]);
assert.deepEqual(get('abductor_digiti_minimi')[0].digits,[5]);
assert.equal(get('abductor_pollicis_longus')[0].abduction_mode,'radial');
assert.equal(get('abductor_pollicis_brevis')[0].abduction_mode,'palmar');
console.log('PASS: all 56 L2/L3 muscle profiles, 98 lecture-supported actions, current source references and upper-limb joint/digit exclusions.');
