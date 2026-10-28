import * as THREE from './vendor/three.module.js';
import {isUpperContextBone,isHandBone} from './upper-muscle-motion.js?v=20261004-upper1';
import {createMuscleMotionRig} from './muscle-motion-rig.js?v=20261005-edl1';

// Portal the existing renderer into the panel. There is still exactly one
// WebGL context, one set of anatomy assets, and one application animation loop.
export function createMuscleMotionViewer({scene,byName,meshes,camera,controls,host,resize,capture,restore,inspect,cancelCamera,dirty,hideLabels}){
  let active=false,saved=null,rig=null,onPhase=()=>{},muscle=null,action=null,whole=false;
  const originalParent=host.parentNode,originalNext=host.nextSibling;
  function configure(entry,movement){
    rig?.dispose();rig=null;scene.updateMatrixWorld(true);
    muscle=entry;action=movement;inspect(entry,movement);hideLabels();cancelCamera();
    scene.updateMatrixWorld(true);rig=createMuscleMotionRig({byName,meshes,muscle,action});
    whole=true;applyVisibility();resize();frame();dirty();onPhase(0,false,rig.description);
  }
  function frame(all=whole,view=null){
    if(!rig)return;whole=all;
    const box=new THREE.Box3(),points=[];
    // Sample the actual articulated envelope once, not a rest-pose cache.
    const old=rig.phase;
    const localJoint=['ankle_right','hindfoot_right'].includes(action.joint_id)||/hallux|toes/.test(action.joint_id);
    for(const phase of [0,.5,1]){
      rig.pose(phase);scene.updateMatrixWorld(true);
      for(const mesh of rig.selected)box.expandByObject(mesh,true);
      if(localJoint){
        for(const mesh of meshes)if(mesh.userData.displayLayer==='bones'&&mesh.userData.anatomyName.endsWith('.r')&&new THREE.Box3().setFromObject(mesh,true).max.y<.12)box.expandByObject(mesh,true);
      }else for(const mesh of rig.moving){
        const name=mesh.userData.anatomyName;
        if(action.joint_id==='shoulder_right'&&name!=='Humerus.r')continue;
        if(action.joint_id==='scapula_right'&&!['Scapula.r','Clavicle.r'].includes(name))continue;
        if(action.joint_id==='hip_right'&&!['Femur.r','Patella.r'].includes(name))continue;
        // A knee demonstration needs the complete tibia and foot in view:
        // otherwise the learner sees a moving tendon but a clipped lever.
        if(!all&&action.joint_id==='knee_right'&&!['Tibia.r','Fibula.r'].includes(name))continue;
        box.expandByObject(mesh,true);
      }
      points.push(rig.focusJoint.clone());
    }
    rig.pose(old);scene.updateMatrixWorld(true);
    if(!all&&localJoint){
      // Long toe extensors still exist in the scene, but the default close view
      // teaches their small distal joint action. Whole muscle shows their origin.
      box.min.y=Math.max(box.min.y,-.015);box.max.y=Math.min(box.max.y,.16);
    }
    if(!all&&rig.upper){
      // Crop the sampled action envelope to its joint, instead of letting a
      // long extrinsic tendon force a hand close-up back out to the shoulder.
      const radius=action.joint_id==='forearm_right'?.19:action.joint_id==='scapula_right'?.17:action.joint_id==='shoulder_right'?.13:action.joint_id==='elbow_right'?.12:.105;
      const extent=new THREE.Vector3(radius,radius,radius);
      box.intersect(new THREE.Box3(rig.focusJoint.clone().sub(extent),rig.focusJoint.clone().add(extent)));
    }
    points.forEach(p=>box.expandByPoint(p));
    const sphere=box.getBoundingSphere(new THREE.Sphere()),center=sphere.center;
    const handAction=rig.upper&&(/thumb|fingers|little|wrist/.test(action.joint_id));
    const preferred=muscle.motion_view?.[all?'whole':'joint'];
    const direction=new THREE.Vector3(...(view==='front'?[0,.1,1]:view==='back'?[0,.1,-1]:view==='side'?[-1,.08,.12]:preferred|| (handAction?[-.25,.15,1]:action.plane==='frontal'?[0,.1,1]:action.plane==='transverse'?[-.5,.9,.3]:muscle.view==='back'?[-.85,.12,-.5]:[-1,.12,.28]))).normalize();
    const half=Math.min(THREE.MathUtils.degToRad(camera.fov/2),Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect));
    const distance=Math.max(.09,sphere.radius/Math.sin(half)*1.13);
    camera.position.copy(center).addScaledVector(direction,distance);controls.target.copy(center);camera.up.set(0,1,0);controls.update();cancelCamera();dirty();
  }
  function applyVisibility(){
    if(!active||!muscle)return;
    const names=new Set(muscle.mesh_names);
    for(const mesh of meshes){
      const name=mesh.userData.anatomyName,isBone=mesh.userData.displayLayer==='bones';
      // Hide the other static soft tissues while their bones articulate.
      mesh.visible=names.has(name)||(isBone&&(rig?.upper?isUpperContextBone(name):(name.endsWith('.r')||/Hip bone|Sacrum|Coccyx|Vertebra L/.test(name))));
      if(!mesh.visible)continue;
      const mat=mesh.material;mat.vertexColors=false;mat.color.set(isBone?'#d8e1df':muscle.mesh_components?.[name]?.color||'#cd273f');
      mat.emissive.set(isBone?'#000000':'#811b2a');mat.emissiveIntensity=isBone?0:.12;
      mat.opacity=isBone?.65:1;mat.transparent=isBone;mat.depthWrite=!isBone;mat.needsUpdate=true;
    }
  }
  function unmount(){
    if(!active)return;rig?.dispose();rig=null;active=false;
    originalParent.insertBefore(host,originalNext?.parentNode===originalParent?originalNext:null);
    host.classList.remove('ma-portalled-canvas');host.querySelector('canvas').style.touchAction=saved.touchAction;host.querySelector('canvas').setAttribute('aria-label',saved.canvasLabel);
    const snapshot=saved;saved=null;restore(snapshot);resize();dirty();
  }
  return {
    mount(slot,entry,movement,callback){if(!active){saved=capture();saved.touchAction=host.querySelector('canvas').style.touchAction;saved.canvasLabel=host.querySelector('canvas').getAttribute('aria-label');active=true;slot.append(host);host.classList.add('ma-portalled-canvas');host.querySelector('canvas').style.touchAction='none';host.querySelector('canvas').setAttribute('aria-label','3D muscle action: press Play to animate; drag to rotate and pinch to zoom');controls.enabled=true;}onPhase=callback;configure(entry,movement);},
    configure(entry,movement){if(active)configure(entry,movement);},
    unmount,applyVisibility,frame,
    play(){if(rig){rig.play();dirty();}},pause(){rig?.pause();},
    pose(value){if(rig){rig.pause();rig.pose(value);dirty();onPhase(rig.phase,false,rig.description);}},
    tick(now){if(!active||!rig)return false;const phase=rig.tick(now);if(phase===null)return false;onPhase(phase,true,rig.description);return true;},
    get active(){return active;},get playing(){return !!rig?.playing;},
    dispose:unmount
  };
}
