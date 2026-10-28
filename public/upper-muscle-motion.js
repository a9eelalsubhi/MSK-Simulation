import * as THREE from './vendor/three.module.js';

// Original model coordinates: +Y superior, +Z palmar/anterior, -X right.
// All pivots are measured in world space. They are illustrative landmarks,
// not a replacement for a validated musculoskeletal rig or contact solver.
const deg=THREE.MathUtils.degToRad,X=new THREE.Vector3(1,0,0),Y=new THREE.Vector3(0,1,0),Z=new THREE.Vector3(0,0,1);
const ordinals=['first','second','third','fourth','fifth'];
export const isHandBone=n=>n.endsWith('.r')&&(/finger of hand|metacarpal/.test(n)||/^(Scaphoid|Lunate|Triquetral|Pisiform|Trapezium|Trapezoid|Capitate|Hamate)/.test(n));
export const isArmBone=n=>['Humerus.r','Radius.r','Ulna.r'].includes(n)||isHandBone(n);
export const isUpperContextBone=n=>isArmBone(n)||['Scapula.r','Clavicle.r','Body of sternum','Manubrium of sternum','Xiphoid process','Atlas (C1)','Axis (C2)'].includes(n)||/Vertebra [CTL]|rib\.r|rib\.l/.test(n);
const phalanx=(digit,part)=>`${part} phalanx of ${ordinals[digit-1]} finger of hand.r`;
const metacarpal=digit=>`${ordinals[digit-1][0].toUpperCase()+ordinals[digit-1].slice(1)} metacarpal bone.r`;
function requireBone(byName,name){const mesh=byName.get(name);if(!mesh)throw Error('Missing upper-limb joint landmark: '+name);return mesh;}
function end(byName,name,upper=true,axis='y'){
  const mesh=requireBone(byName,name),box=new THREE.Box3().setFromObject(mesh,true),span=box.max[axis]-box.min[axis];
  const p=mesh.geometry.attributes.position,v=new THREE.Vector3(),sum=new THREE.Vector3();let count=0;
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);if(upper?v[axis]>box.max[axis]-span*.08:v[axis]<box.min[axis]+span*.08){sum.add(v);count++;}}
  return count?sum.multiplyScalar(1/count):box.getCenter(sum);
}
export function createUpperJointPlan(byName,action){
  const id=action.joint_id,m=action.movement_id,stages=[];
  const shoulder=end(byName,'Humerus.r');shoulder.y-=.012;
  const elbow=end(byName,'Radius.r');elbow.y+=.006;
  const wrist=new THREE.Box3().setFromObject(requireBone(byName,'Lunate bone.r'),true).getCenter(new THREE.Vector3());
  let focusJoint=shoulder,description='',fixedBones=[],insertionBones=[],skin='attachments';
  const add=(pivot,axis,start,range,test,extra={})=>stages.push({pivot,axis:axis.clone().normalize(),start:deg(start),range:deg(range),test,...extra});
  const forearm=n=>['Radius.r','Ulna.r'].includes(n)||isHandBone(n);
  if(id==='shoulder_right'){
    const axis=['internal','external'].includes(m)?elbow.clone().sub(shoulder).normalize():['abduct','adduct'].includes(m)?Z:X;
    const initial=m==='adduct'?-30:action.initial||0;
    const range={flex:-50,extend:25,abduct:-(action.excursion||55),adduct:30,internal:-35,external:35}[m];
    add(shoulder,axis,['abduct','adduct'].includes(m)?-Math.abs(initial):initial,range,isArmBone);
    fixedBones=['Scapula.r','Clavicle.r','Body of sternum','Manubrium of sternum',...byName.keys()].filter((n,i,a)=>a.indexOf(n)===i&&(/^(Scapula.r|Clavicle.r|Body of sternum|Manubrium of sternum)$/.test(n)||/Vertebra [TL]|rib\.r|Hip bone.r/.test(n)));
    insertionBones=['Humerus.r'];description='Scapula fixed · humerus moves at the shoulder';
  }else if(id==='scapula_right'){
    const scapula=new THREE.Box3().setFromObject(requireBone(byName,'Scapula.r'),true).getCenter(new THREE.Vector3());
    const clavicle=end(byName,'Clavicle.r',true,'x'),acromial=end(byName,'Clavicle.r',false,'x');
    const girdle=n=>['Scapula.r','Clavicle.r'].includes(n)||isArmBone(n),scapular=n=>n==='Scapula.r'||isArmBone(n);
    // Parent order: SC excursion carries the girdle; AC rotation then carries
    // scapula + arm. Both shared joint anchors stay continuous in world space.
    if(['elevate','depress'].includes(m)){
      add(clavicle,Z,0,m==='elevate'?-9:7,girdle);
    }else if(['protract','retract'].includes(m)){
      // Curved glide around the chest, rather than a sideways mesh translation.
      add(clavicle,Y,0,m==='protract'?12:-9,girdle);
      add(acromial,Y,0,m==='protract'?10:-6,scapular);
    }else{
      add(clavicle,Z,m==='downward'?-6:0,m==='downward'?6:-8,girdle);
      add(acromial,Z,m==='downward'?-12:0,m==='downward'?12:-17,scapular);
    }
    focusJoint=scapula;fixedBones=[...byName.keys()].filter(n=>/Vertebra [CT]|rib\.r|Occipital/.test(n));insertionBones=['Scapula.r','Clavicle.r'];
    description='Chest fixed · scapula and clavicle move';
  }else if(id==='ribs_right'){
    const ribs=['Third rib.r','Fourth rib.r','Fifth rib.r'];
    for(const name of ribs){const box=new THREE.Box3().setFromObject(requireBone(byName,name),true);add(new THREE.Vector3(box.max.x,box.max.y-.01,box.min.z),X,0,-4,n=>n===name||n===`Costal cartilage of ${name.toLowerCase()}`);}
    focusJoint=new THREE.Box3().setFromObject(byName.get(ribs[1]),true).getCenter(new THREE.Vector3());
    fixedBones=['Scapula.r'];insertionBones=ribs;description='Scapula fixed · ribs 3–5 elevate';
  }else if(id==='elbow_right'){
    focusJoint=elbow;skin='elbow';
    add(elbow,X,m==='extend'?-65:0,m==='extend'?65:-85,forearm);
    if(action.condition==='Mid-pronation')add(elbow,end(byName,'Ulna.r',false).sub(elbow).normalize(),-65,0,n=>n==='Radius.r'||isHandBone(n));
    fixedBones=['Humerus.r','Scapula.r'];insertionBones=['Radius.r','Ulna.r'];
    description=action.condition==='Mid-pronation'?'Thumb-up posture · forearm flexes at the elbow':'Humerus fixed · forearm moves at the elbow';
  }else if(id==='forearm_right'){
    // Pronation: radius turns about a line from its head to the distal ulna.
    // The ulna never rotates with it. This also carries the attached hand.
    focusJoint=elbow.clone().lerp(wrist,.5);
    if(action.condition==='Elbow flexed')add(elbow,X,-65,0,forearm);
    const radialHead=end(byName,'Radius.r'),axis=end(byName,'Ulna.r',false).sub(radialHead).normalize();
    add(radialHead,axis,m==='supinate'?-130:0,m==='supinate'?130:-130,n=>n==='Radius.r'||isHandBone(n));
    fixedBones=['Humerus.r','Ulna.r','Scapula.r'];insertionBones=['Radius.r'];
    description='Ulna fixed · radius and hand rotate'+(action.condition?' · elbow flexed':'');
  }else if(id==='wrist_right'){
    focusJoint=wrist;skin='wrist';
    add(wrist,['abduct','adduct'].includes(m)?Z:X,0,{flex:-35,extend:35,abduct:-18,adduct:25}[m],isHandBone);
    fixedBones=['Radius.r','Ulna.r'];insertionBones=[...byName.keys()].filter(isHandBone);
    description='Forearm fixed · hand moves at the wrist';
  }else if(id==='thumb_cmc_right'||id==='little_cmc_right'){
    const digit=id==='thumb_cmc_right'?1:5,base=end(byName,metacarpal(digit)),target=n=>n===metacarpal(digit)||n.includes(`${ordinals[digit-1]} finger of hand.r`);
    focusJoint=base;
    if(m==='oppose'){
      if(digit===1){add(base,Y,0,25,target);add(base,Z,0,28,target);add(base,end(byName,metacarpal(1),false).sub(base).normalize(),0,25,target);}
      else add(base,new THREE.Vector3(-1,.25,0),0,25,target);
      description=digit===1?'Thumb metacarpal moves across the palm':'Little finger metacarpal cups the palm';
    }else{
      const radial=action.abduction_mode==='radial',axis=['flex','extend'].includes(m)||radial?Z:Y;
      add(base,axis,m==='adduct'?30:0,{flex:25,extend:-22,abduct:radial?-18:30,adduct:-30}[m],target);
      description='Thumb CMC joint · '+(radial?'radial abduction':m==='abduct'?'palmar abduction':action.movement.toLowerCase());
    }
    fixedBones=['Humerus.r','Radius.r','Ulna.r',...[...byName.keys()].filter(n=>isHandBone(n)&&!target(n))];insertionBones=[metacarpal(digit),phalanx(digit,'Proximal')];
  }else{
    const digits=action.digits||[1],writing=id==='fingers_writing_right';
    const kinds=writing?['mcp','pip','dip']:[id.includes('_mcp_')?'mcp':id.includes('_pip_')?'pip':id.includes('_dip_')?'dip':'ip'];
    for(const digit of digits)for(const kind of kinds){
      const part=kind==='mcp'?'Proximal':kind==='pip'?'Middle':'Distal',pivot=end(byName,phalanx(digit,part));
      const target=n=>n.includes(`${ordinals[digit-1]} finger of hand.r`)&&(kind==='mcp'||(kind==='pip'?/Middle|Distal/.test(n):n.startsWith('Distal')));
      const spreading=['abduct','adduct'].includes(m),spreadSign=digit<3?-1:digit>3?1:0;
      const flexAxis=digit===1?Z:X,flexSign=digit===1?1:-1;
      let start=0,range=0;
      if(writing){start=kind==='mcp'?0:kind==='pip'?-25:-15;range=kind==='mcp'?-35:-start;}
      else if(spreading){start=m==='adduct'?spreadSign*12:0;range=m==='adduct'?-start:spreadSign*12;}
      else{start=m==='extend'?flexSign*30:0;range=m==='extend'?-start:flexSign*(kind==='mcp'?40:45);}
      add(pivot,spreading?Z:flexAxis,start,range,target,{digit});
    }
    focusJoint=stages.reduce((sum,s)=>sum.add(s.pivot),new THREE.Vector3()).multiplyScalar(1/stages.length);fixedBones=['Humerus.r','Radius.r','Ulna.r',...[...byName.keys()].filter(n=>isHandBone(n)&&/metacarpal|bone/.test(n))];
    insertionBones=digits.flatMap(d=>['Proximal','Middle','Distal'].filter(p=>d!==1||p!=='Middle').map(p=>phalanx(d,p)));
    description=writing?'MCP joints flex · PIP and DIP joints extend':`Digit${digits.length>1?'s':''} ${digits.join(', ')} · ${kinds[0].toUpperCase()} joint${digits.length>1?'s':''}`;
  }
  if(!stages.length||stages.some(s=>!Number.isFinite(s.range)))throw Error(`Unsupported upper-limb action ${id}/${m}`);
  return {stages,focusJoint,description,fixedBones,insertionBones,skin,upper:true};
}

// Segment skinning uses the actual source vertices. Bone-distance weights are
// calculated once on configure, never in the animation loop. Reusing typed
// arrays avoids per-frame allocations and restores the exact original arrays.
export function createUpperMuscleDeformer(mesh,byName,plan){
  const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal,original=p.array.slice(),originalNormal=n?.array.slice();
  const world=mesh.matrixWorld.clone(),inverse=world.clone().invert(),nw=new THREE.Matrix3().getNormalMatrix(world),nl=new THREE.Matrix3().getNormalMatrix(inverse);
  const groups=[[]],points=new Float32Array(p.count*3),normals=n?new Float32Array(n.count*3):null,weights=new Float32Array(p.count),indices=new Uint8Array(p.count);
  const samples=group=>{
    const values=[];
    for(const name of group){const bone=byName.get(name);if(!bone)continue;const pos=bone.geometry.attributes.position,stride=Math.max(1,Math.floor(pos.count/96)),v=new THREE.Vector3();for(let i=0;i<pos.count;i+=stride)values.push(v.fromBufferAttribute(pos,i).applyMatrix4(bone.matrixWorld).clone());}
    return values;
  };
  const stationary=samples(plan.fixedBones),insertion=[];
  for(const name of plan.insertionBones){
    const members=plan.stages.flatMap((s,i)=>s.test(name)?[i]:[]);if(!members.length)continue;
    let index=groups.findIndex(g=>g.join(',')===members.join(','));if(index<0){index=groups.length;groups.push(members);}
    insertion.push({index,points:samples([name])});
  }
  const v=new THREE.Vector3(),q=new THREE.Vector3(),normal=new THREE.Vector3(),transformed=new THREE.Vector3();
  const distance=(point,set)=>{let d=Infinity;for(const s of set)d=Math.min(d,point.distanceToSquared(s));return d;};
  const smooth=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
  const elbow=plan.stages.find(s=>s.axis.x>.9)?.pivot||plan.focusJoint;
  for(let i=0;i<p.count;i++){
    v.fromBufferAttribute(p,i).applyMatrix4(world).toArray(points,i*3);
    if(n)normal.fromBufferAttribute(n,i).applyMatrix3(nw).normalize().toArray(normals,i*3);
    let d=Infinity,index=0;for(const item of insertion){const candidate=distance(v,item.points);if(candidate<d){d=candidate;index=item.index;}}
    indices[i]=index;const fixed=distance(v,stationary);
    weights[i]=Number.isFinite(fixed+d)?fixed/Math.max(1e-9,fixed+d):0;
    if(plan.skin==='elbow')weights[i]=smooth((elbow.y+.055-v.y)/.095);
    if(plan.skin==='wrist')weights[i]=smooth((plan.focusJoint.y+.025-v.y)/.055);
  }
  const transforms=groups.map(()=>new THREE.Matrix4()),rotations=groups.map(()=>new THREE.Matrix3()),culled=mesh.frustumCulled;mesh.frustumCulled=false;
  return {
    apply(stageMatrices){
      groups.forEach((members,i)=>{transforms[i].identity();for(const j of members)transforms[i].multiply(stageMatrices[j]);rotations[i].getNormalMatrix(transforms[i]);});
      for(let i=0;i<p.count;i++){
        const index=indices[i],w=weights[i];v.fromArray(points,i*3);q.copy(v).applyMatrix4(transforms[index]);v.lerp(q,w).applyMatrix4(inverse);p.setXYZ(i,v.x,v.y,v.z);
        if(n){normal.fromArray(normals,i*3);transformed.copy(normal).applyMatrix3(rotations[index]);normal.lerp(transformed,w).applyMatrix3(nl).normalize();n.setXYZ(i,normal.x,normal.y,normal.z);}
      }
      p.needsUpdate=true;if(n)n.needsUpdate=true;
    },
    restore(){p.array.set(original);p.needsUpdate=true;if(n){n.array.set(originalNormal);n.needsUpdate=true;}mesh.frustumCulled=culled;}
  };
}
