import * as THREE from './vendor/three.module.js';
import {createUpperJointPlan,createUpperMuscleDeformer} from './upper-muscle-motion.js?v=20261004-upper1';

// Atlas coordinates: +Y superior, +Z anterior, -X the patient's right.
// These are illustrative excursions, not patient-specific range measurements.
const deg = THREE.MathUtils.degToRad;
const X=new THREE.Vector3(1,0,0),Y=new THREE.Vector3(0,1,0),Z=new THREE.Vector3(0,0,1);
const ordinals=['first','second','third','fourth','fifth'];
const clamp=THREE.MathUtils.clamp;
export function aboutJoint(pivot,axis,angle,out=new THREE.Matrix4()) {
  // World-space rigid motion about a joint, NOT about the mesh's object origin.
  const q=new THREE.Quaternion().setFromAxisAngle(axis,angle);
  out.makeRotationFromQuaternion(q);
  const shifted=pivot.clone().applyMatrix4(out);
  out.setPosition(pivot.clone().sub(shifted));return out;
}
function endPoint(mesh,axis,upper=false){
  mesh.updateWorldMatrix(true,false);
  const box=new THREE.Box3().setFromObject(mesh,true),span=box.max[axis]-box.min[axis];
  const p=mesh.geometry.attributes.position,v=new THREE.Vector3(),sum=new THREE.Vector3();let count=0;
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);if(upper?v[axis]>=box.max[axis]-span*.09:v[axis]<=box.min[axis]+span*.09){sum.add(v);count++;}}
  return count?sum.multiplyScalar(1/count):box.getCenter(sum);
}
export function createJointPlan(byName,action){
  if(/^(shoulder|scapula|ribs|elbow|forearm|wrist|thumb|fingers|little)_/.test(action.joint_id))return createUpperJointPlan(byName,action);
  const id=action.joint_id,m=action.movement_id,foot=n=>n.endsWith('.r')&&!['Femur.r','Patella.r','Tibia.r','Fibula.r','Hip bone.r'].includes(n);
  const lower=n=>['Tibia.r','Fibula.r'].includes(n)||foot(n);
  const leg=n=>['Femur.r','Patella.r'].includes(n)||lower(n);
  const hip=new THREE.Vector3(-.08458,.86360,-.00549);
  const tibia=byName.get('Tibia.r'),talus=byName.get('Talus.r');
  if(!tibia||!talus)throw Error('Muscle motion requires tibia and talus joint landmarks.');
  const knee=endPoint(tibia,'y',true),ankle=new THREE.Box3().setFromObject(talus,true).getCenter(new THREE.Vector3());ankle.y+=.012;
  const stages=[];let description='',focusJoint;
  const add=(pivot,axis,start,range,test,extra={})=>stages.push({pivot,axis:axis.clone().normalize(),start:deg(start),range:deg(range),test,...extra});
  if(id==='hip_right'){
    focusJoint=hip;
    const conditional=action.condition?.toLowerCase().includes('hip flexed');
    if(conditional)add(hip,X,-40,0,leg);
    const axis=['internal','external'].includes(m)?knee.clone().sub(hip).normalize():['abduct','adduct'].includes(m)?Z:X;
    const ranges={flex:-55,extend:18,abduct:-30,adduct:12,internal:-25,external:25};
    add(hip,axis,0,ranges[m],leg);description=conditional?'Hip flexed first; then abduction.':'Pelvis fixed · femur moves at the hip';
  }else if(id==='knee_right'){
    focusJoint=knee;
    if(['internal','external'].includes(m)){
      add(knee,X,action.description.toLowerCase().includes('unlock')?8:40,0,lower);
      add(knee,ankle.clone().sub(knee).normalize(),0,m==='internal'?-12:12,lower);
      description='Free tibia rotates with the knee flexed; femur fixed.';
    }else{add(knee,X,m==='extend'?55:0,m==='extend'?-55:65,lower);description='Femur fixed · tibia and foot move';}
  }else if(id==='ankle_right'){
    focusJoint=ankle;add(ankle,X,0,m==='dorsi'?-18:32,foot);description='Tibia fixed · foot moves at the ankle';
  }else if(id==='hindfoot_right'){
    focusJoint=ankle.clone().add(new THREE.Vector3(0,-.02,-.01));
    add(focusJoint,new THREE.Vector3(.12,.25,1),0,m==='invert'?18:-15,n=>foot(n)&&n!=='Talus.r');
    description='Talus fixed · illustrative hindfoot inversion / eversion';
  }else{
    const digits=action.digits||[1],kind=id.includes('_mtp_')?'mtp':id.includes('_pip_')?'pip':id.includes('_dip_')?'dip':'ip';
    for(const digit of digits){
      const ordinal=ordinals[digit-1],prox=byName.get(`Proximal phalanx of ${ordinal} finger of foot.r`),dist=byName.get(`Distal phalanx of ${ordinal} finger of foot.r`);
      const bone=kind==='mtp'?prox:kind==='pip'?byName.get(`Middle phalanx of ${ordinal} finger of foot.r`):dist;
      if(!bone||!dist)throw Error(`Missing digit ${digit} ${kind} joint for muscle action.`);
      const pivot=endPoint(bone,'z'),axis=Y.clone().cross(endPoint(dist,'z',true).sub(pivot)).normalize();
      const isSpread=['abduct','adduct'].includes(m);
      const sign=isSpread?(m==='abduct'?(digit===1?1:-1):(digit===1?-1:1)):(m==='flex'?1:-1);
      const range=isSpread?10:kind==='mtp'?30:kind==='dip'?20:35;
      add(pivot,isSpread?Y:axis,0,range*sign,n=>{
        if(!n.includes(`${ordinal} finger of foot.r`))return false;
        return kind==='mtp'||(kind==='pip'?/Middle|Distal/.test(n):n.startsWith('Distal'));
      },{digit});
    }
    focusJoint=stages.reduce((sum,s)=>sum.add(s.pivot),new THREE.Vector3()).multiplyScalar(1/stages.length);
    description=`Only toe${digits.length>1?'s':''} ${digits.join(', ')} move · ${kind.toUpperCase()} joint`;
    if(!action.direct)description+=' · assisted through the FDL tendon connection';
  }
  if(stages.some(s=>!Number.isFinite(s.range)))throw Error(`Unsupported action ${id}/${m}`);
  return {stages,focusJoint,description};
}

// One selected soft-tissue mesh is mapped along its source long axis. Its
// proximal attachment stays fixed and its insertion follows the distal bone.
// Cross-sections rotate smoothly between endpoints; small volume compensation
// reflects shortening. This is an educational deformation, not a force model.
export function createMuscleDeformer(mesh,axis,stages,{distalOnly=false,groupDigits=false}={}){
  const position=mesh.geometry.attributes.position,normal=mesh.geometry.attributes.normal;
  const original=position.array.slice(),originalNormal=normal?.array.slice(),world=mesh.matrixWorld.clone(),inverse=world.clone().invert();
  const normalWorld=new THREE.Matrix3().getNormalMatrix(world),normalLocal=new THREE.Matrix3().getNormalMatrix(inverse);
  const points=new Float32Array(position.count*3),normals=normal?new Float32Array(normal.count*3):null;
  const weights=new Float32Array(position.count),stageIndex=new Uint8Array(position.count),v=new THREE.Vector3(),n=new THREE.Vector3();let low=Infinity,high=-Infinity;
  for(let i=0;i<position.count;i++){v.fromBufferAttribute(position,i).applyMatrix4(world);v.toArray(points,i*3);const t=v.dot(axis);low=Math.min(low,t);high=Math.max(high,t);if(normal){n.fromBufferAttribute(normal,i).applyMatrix3(normalWorld).normalize().toArray(normals,i*3);}}
  const span=Math.max(high-low,.0001),box=new THREE.Box3().setFromBufferAttribute(position).applyMatrix4(world),center=box.getCenter(new THREE.Vector3());
  const A=center.clone().addScaledVector(axis,low-center.dot(axis)),B=A.clone().addScaledVector(axis,span);
  for(let i=0;i<position.count;i++){
    v.fromArray(points,i*3);let w=clamp((v.dot(axis)-low)/span,0,1);
    if(distalOnly)w=Math.pow(w,5);weights[i]=w;
    if(groupDigits){let best=Infinity;stages.forEach((s,j)=>{const d=Math.abs(v.x-s.pivot.x);if(d<best){best=d;stageIndex[i]=j;}});}
  }
  const movedA=new THREE.Vector3(),movedB=new THREE.Vector3(),centerline=new THREE.Vector3(),radial=new THREE.Vector3(),q=new THREE.Quaternion(),identity=new THREE.Quaternion(),endRotation=new THREE.Quaternion();
  const culling=mesh.frustumCulled;mesh.frustumCulled=false;
  return {
    apply(matrices){
      // The caller composes posture and distal action in anatomical parent order.
      // The proximal muscle attachment remains fixed in world space.
      for(let i=0;i<position.count;i++){
        const idx=groupDigits?stageIndex[i]:matrices.length-1,transform=matrices[idx],w=weights[i];
        movedA.copy(A);movedB.copy(B);
        movedB.applyMatrix4(transform);endRotation.setFromRotationMatrix(transform);q.copy(identity).slerp(endRotation,w);
        v.fromArray(points,i*3);centerline.copy(A).addScaledVector(axis,span*clamp((v.dot(axis)-low)/span,0,1));radial.copy(v).sub(centerline);
        const taper=Math.sin(Math.PI*w),bulge=clamp(Math.sqrt(span/Math.max(.001,movedA.distanceTo(movedB))),.95,1.06);
        radial.applyQuaternion(q).multiplyScalar(1+(bulge-1)*taper);
        // Use displacement weights, not resampled positions: nonlinear tendon
        // weights must leave EVERY vertex unchanged in the neutral pose.
        v.copy(centerline).addScaledVector(movedB.sub(B),w).add(radial).applyMatrix4(inverse);position.setXYZ(i,v.x,v.y,v.z);
        if(normal){n.fromArray(normals,i*3);n.applyQuaternion(q).applyMatrix3(normalLocal).normalize();normal.setXYZ(i,n.x,n.y,n.z);}
      }
      position.needsUpdate=true;if(normal)normal.needsUpdate=true;
    },
    restore(){position.array.set(original);position.needsUpdate=true;if(normal){normal.array.set(originalNormal);normal.needsUpdate=true;}mesh.frustumCulled=culling;},
    vertexCount:position.count
  };
}

// A branched foot tendon is not a second muscle belly. Keep its common ankle
// stem fixed during toe extension, and attach each distal slip to its own toe.
// Assign rest vertices to the nearest anatomical digit centerline once; blend
// rigid joint motion only across a short band around the active joint plane.
// This avoids pulling all four slips toward one averaged bounding-box endpoint.
function createToeTendonDeformer(mesh,byName,stages){
  const position=mesh.geometry.attributes.position,normal=mesh.geometry.attributes.normal;
  const original=position.array.slice(),originalNormal=normal?.array.slice();
  const world=mesh.matrixWorld.clone(),inverse=world.clone().invert();
  const normalWorld=new THREE.Matrix3().getNormalMatrix(world),normalLocal=new THREE.Matrix3().getNormalMatrix(inverse);
  const points=new Float32Array(position.count*3),normals=normal?new Float32Array(normal.count*3):null;
  const weights=new Float32Array(position.count),stageIndex=new Uint8Array(position.count);
  const longitudinalPositions=new Float32Array(position.count),distalExtents=new Float32Array(stages.length);
  const v=new THREE.Vector3(),n=new THREE.Vector3(),a=new THREE.Vector3(),edge=new THREE.Vector3(),nearest=new THREE.Vector3();
  const paths=stages.map(stage=>{
    const ordinal=ordinals[stage.digit-1];
    const bones=['Proximal','Middle','Distal'].map(part=>byName.get(`${part} phalanx of ${ordinal} finger of foot.r`));
    const centers=bones.map(bone=>new THREE.Box3().setFromObject(bone,true).getCenter(new THREE.Vector3()));
    const tip=endPoint(bones.at(-1),'z',true);
    return {centers,halfBand:Math.min(.006,tip.distanceTo(stage.pivot)*.2)};
  });
  for(let i=0;i<position.count;i++){
    v.fromBufferAttribute(position,i).applyMatrix4(world);v.toArray(points,i*3);
    if(normal)n.fromBufferAttribute(normal,i).applyMatrix3(normalWorld).normalize().toArray(normals,i*3);
    let best=Infinity,index=0;
    paths.forEach((path,j)=>{
      for(let k=0;k<path.centers.length-1;k++){
        a.copy(path.centers[k]);edge.copy(path.centers[k+1]).sub(a);
        const t=clamp(nearest.copy(v).sub(a).dot(edge)/Math.max(edge.lengthSq(),1e-12),0,1);
        nearest.copy(a).addScaledVector(edge,t);
        const distance=v.distanceToSquared(nearest);if(distance<best){best=distance;index=j;}
      }
    });
    stageIndex[i]=index;
    // The exported slips run along +Z and sit above/off-center from bone
    // centerlines. A projection onto an oblique centroid axis can classify a
    // real distal slip as proximal solely because of its transverse offset.
    const longitudinal=v.z-stages[index].pivot.z;
    longitudinalPositions[i]=longitudinal;distalExtents[index]=Math.max(distalExtents[index],longitudinal);
  }
  for(let i=0;i<position.count;i++){
    const index=stageIndex[i];
    // DIP tendons can end only millimeters beyond the pivot. Bound the blend
    // band by this slip's actual source extent, so its tip follows the digit.
    const half=Math.max(.0001,Math.min(paths[index].halfBand,distalExtents[index]*.15));
    const t=clamp((longitudinalPositions[i]+half)/(half*2),0,1);weights[i]=t*t*(3-2*t);
  }
  const moved=new THREE.Vector3(),rotated=new THREE.Vector3(),rotations=stages.map(()=>new THREE.Matrix3());
  const culling=mesh.frustumCulled;mesh.frustumCulled=false;
  return {
    apply(matrices){
      matrices.forEach((matrix,i)=>rotations[i].getNormalMatrix(matrix));
      for(let i=0;i<position.count;i++){
        const index=stageIndex[i],w=weights[i];
        v.fromArray(points,i*3);moved.copy(v).applyMatrix4(matrices[index]);v.lerp(moved,w).applyMatrix4(inverse);position.setXYZ(i,v.x,v.y,v.z);
        if(normal){n.fromArray(normals,i*3);rotated.copy(n).applyMatrix3(rotations[index]);n.lerp(rotated,w).applyMatrix3(normalLocal).normalize();normal.setXYZ(i,n.x,n.y,n.z);}
      }
      position.needsUpdate=true;if(normal)normal.needsUpdate=true;
    },
    restore(){position.array.set(original);position.needsUpdate=true;if(normal){normal.array.set(originalNormal);normal.needsUpdate=true;}mesh.frustumCulled=culling;}
  };
}

// Segment-weighted skinning for knee and ankle actions. A knee action must
// not drag the entire quadriceps belly away from the femur. Its distal tendon
// follows the patella first and then the tibia; a calf belly below the knee
// instead follows the tibia. All weights are computed once from rest vertices.
// This preserves the source shape on a fixed segment and follows real world
// joint transforms, rather than translating an estimated bounding-box endpoint.
function createSegmentDeformer(mesh,plan,{quadriceps=false,patella,footTendon=false}={}){
  const position=mesh.geometry.attributes.position,normal=mesh.geometry.attributes.normal;
  const original=position.array.slice(),originalNormal=normal?.array.slice();
  const world=mesh.matrixWorld.clone(),inverse=world.clone().invert();
  const normalWorld=new THREE.Matrix3().getNormalMatrix(world),normalLocal=new THREE.Matrix3().getNormalMatrix(inverse);
  const points=new Float32Array(position.count*3),normals=normal?new Float32Array(normal.count*3):null;
  const weights=new Float32Array(position.count*2),v=new THREE.Vector3(),moved=new THREE.Vector3(),patellar=new THREE.Vector3(),n=new THREE.Vector3(),rotated=new THREE.Vector3();
  const box=new THREE.Box3().setFromObject(mesh,true),pivot=plan.focusJoint;
  const patellaBox=quadriceps?new THREE.Box3().setFromObject(patella,true):null;
  const smooth=(t)=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  for(let i=0;i<position.count;i++){
    v.fromBufferAttribute(position,i).applyMatrix4(world);v.toArray(points,i*3);
    if(normal)n.fromBufferAttribute(normal,i).applyMatrix3(normalWorld).normalize().toArray(normals,i*3);
    if(footTendon){
      // This separate distal tendon lies entirely on the moving foot. Its
      // proximal end follows the long belly's distal attachment at the ankle.
      weights[i*2+1]=1;
    }else if(quadriceps){
      const middle=(patellaBox.min.y+patellaBox.max.y)/2,top=patellaBox.max.y+.035,bottom=patellaBox.min.y-.035;
      const distal=smooth((middle-v.y)/(middle-bottom));
      weights[i*2]=smooth((top-v.y)/(top-middle))*(1-distal); // patella
      weights[i*2+1]=distal; // tibial tuberosity / patellar ligament
    }else{
      const ankle=plan.stages[0].pivot.y<.2;
      const top=ankle?Math.max(pivot.y+.12,box.min.y+.055):pivot.y+.11;
      const bottom=ankle?box.min.y:pivot.y-.05;
      weights[i*2+1]=smooth((top-v.y)/Math.max(.001,top-bottom));
    }
  }
  const culling=mesh.frustumCulled,rotation=new THREE.Matrix3(),patellaRotation=new THREE.Matrix3();mesh.frustumCulled=false;
  return {
    apply([distal,patellaTransform=distal]){
      rotation.getNormalMatrix(distal);patellaRotation.getNormalMatrix(patellaTransform);
      for(let i=0;i<position.count;i++){
        const p=weights[i*2],d=weights[i*2+1],fixed=1-p-d;
        v.fromArray(points,i*3);moved.copy(v).applyMatrix4(distal);patellar.copy(v).applyMatrix4(patellaTransform);
        v.multiplyScalar(fixed).addScaledVector(patellar,p).addScaledVector(moved,d).applyMatrix4(inverse);position.setXYZ(i,v.x,v.y,v.z);
        if(normal){n.fromArray(normals,i*3);rotated.copy(n).applyMatrix3(rotation).multiplyScalar(d);patellar.copy(n).applyMatrix3(patellaRotation);n.multiplyScalar(fixed).addScaledVector(patellar,p).add(rotated).applyMatrix3(normalLocal).normalize();normal.setXYZ(i,n.x,n.y,n.z);}
      }
      position.needsUpdate=true;if(normal)normal.needsUpdate=true;
    },
    restore(){position.array.set(original);position.needsUpdate=true;if(normal){normal.array.set(originalNormal);normal.needsUpdate=true;}mesh.frustumCulled=culling;}
  };
}

export function createMuscleMotionRig({byName,meshes,muscle,action}){
  const plan=createJointPlan(byName,action),moving=meshes.filter(m=>m.userData.displayLayer==='bones'&&plan.stages.some(s=>s.test(m.userData.anatomyName)));
  if(action.joint_id==='knee_right'&&['flex','extend'].includes(action.movement_id)&&byName.has('Patella.r'))moving.push(byName.get('Patella.r'));
  const rest=moving.map(mesh=>({mesh,world:mesh.matrixWorld.clone(),matrix:mesh.matrix.clone(),auto:mesh.matrixAutoUpdate}));
  const id=action.joint_id,toe=id.includes('hallux')||id.includes('toes');
  const axis=muscle.region==='foot'?new THREE.Vector3(0,0,1):['piriformis','gemellus-s','gemellus-i','obturator-i','obturator-e','quadratus'].includes(muscle.profile_id)?new THREE.Vector3(-1,-.2,0).normalize():new THREE.Vector3(0,-1,0);
  const segment=['knee_right','ankle_right','hindfoot_right'].includes(id);
  const quadriceps=id==='knee_right'&&['rectus','vastus-l','vastus-m','vastus-i'].includes(muscle.profile_id);
  const deformers=muscle.mesh_names.map(name=>{
    const mesh=byName.get(name),footTendon=muscle.mesh_components?.[name]?.kind==='toe_tendon';
    if(plan.upper)return createUpperMuscleDeformer(mesh,byName,plan);
    if(footTendon&&toe)return createToeTendonDeformer(mesh,byName,plan.stages);
    // With an explicit distal tendon, a toe-only action leaves the leg belly
    // and ankle stem in place. Do not rotate the ankle attachment about an MTP
    // joint: it would detach from the tendon despite looking like contraction.
    if(toe&&muscle.mesh_components?.[name]?.kind==='belly')return {apply(){},restore(){}};
    if(segment)return createSegmentDeformer(mesh,plan,{quadriceps,patella:byName.get('Patella.r'),footTendon});
    return createMuscleDeformer(mesh,axis,plan.stages,{distalOnly:toe&&muscle.region!=='foot',groupDigits:plan.stages.length>1&&toe&&action.direct});
  });
  const driver=new THREE.Object3D();driver.phase=0;
  const clip=new THREE.AnimationClip(muscle.action_section.animation_trigger.animation_clip_name,2.8,[new THREE.NumberKeyframeTrack('.phase',[0,1.4,2.8],[0,1,0],THREE.InterpolateSmooth)]);
  const mixer=new THREE.AnimationMixer(driver),playback=mixer.clipAction(clip);playback.setLoop(THREE.LoopRepeat,Infinity);
  const matrices=plan.stages.map(()=>new THREE.Matrix4()),combined=new THREE.Matrix4(),local=new THREE.Matrix4(),distal=new THREE.Matrix4(),patellaTransform=new THREE.Matrix4();let lastTime=null,playing=false,phase=0;
  function pose(value){
    phase=clamp(value,0,1);
    plan.stages.forEach((s,i)=>{aboutJoint(s.pivot,s.axis,s.start+s.range*phase,matrices[i]);if(s.translation)matrices[i].setPosition(s.translation.clone().multiplyScalar(phase));});
    for(const r of rest){combined.identity();plan.stages.forEach((s,i)=>{if(s.test(r.mesh.userData.anatomyName))combined.multiply(matrices[i]);});if(r.mesh.userData.anatomyName==='Patella.r'&&action.joint_id==='knee_right'&&['flex','extend'].includes(action.movement_id)){const s=plan.stages[0];aboutJoint(s.pivot,s.axis,(s.start+s.range*phase)*.33,combined);}r.mesh.parent.updateWorldMatrix(true,false);local.copy(r.mesh.parent.matrixWorld).invert().multiply(combined).multiply(r.world);r.mesh.matrixAutoUpdate=false;r.mesh.matrix.copy(local);r.mesh.matrixWorldNeedsUpdate=true;}
    distal.identity();matrices.forEach(m=>distal.multiply(m));
    if(quadriceps){const s=plan.stages[0];aboutJoint(s.pivot,s.axis,(s.start+s.range*phase)*.33,patellaTransform);}
    // Quadratus plantae pulls on FDL, not on a phalanx. Show its small
    // contraction while the assisted toes articulate; do not pretend that its
    // insertion rotates rigidly around a toe joint it never crosses.
    if(action.direct===false)distal.makeTranslation(-axis.x*.003*phase,-axis.y*.003*phase,-axis.z*.003*phase);
    for(const d of deformers)d.apply(plan.upper?matrices:action.direct===false?[distal]:toe?matrices:quadriceps?[distal,patellaTransform]:[distal]);
    for(const r of rest)r.mesh.updateWorldMatrix(false,false);
    return phase;
  }
  pose(0);
  return {
    ...plan,clip,moving,selected:muscle.mesh_names.map(n=>byName.get(n)),
    pose,
    play(){playing=true;lastTime=null;mixer.stopAllAction();driver.phase=0;playback.reset().play();},
    pause(){playing=false;lastTime=null;playback.paused=true;},
    tick(now){if(!playing)return null;const delta=lastTime===null?0:Math.min(.08,(now-lastTime)/1000);lastTime=now;mixer.update(delta);return pose(driver.phase);},
    get playing(){return playing;},get phase(){return phase;},
    dispose(){playing=false;mixer.stopAllAction();mixer.uncacheRoot(driver);for(const d of deformers)d.restore();for(const r of rest){r.mesh.matrix.copy(r.matrix);r.mesh.matrixAutoUpdate=r.auto;r.mesh.matrixWorldNeedsUpdate=true;r.mesh.updateWorldMatrix(false,false);}}
  };
}
