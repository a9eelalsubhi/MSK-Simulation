import * as THREE from 'three';
export function createLowerLimbTeaching({byName}){
 const points=new Map(),anchors=new Map(),colors=new Map();
 function vertices(name){if(points.has(name))return points.get(name);const m=byName.get(name);if(!m)return [];const a=m.geometry.attributes.position,p=[];for(let i=0;i<a.count;i++)p.push(new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(m.matrixWorld));points.set(name,p);return p;}
 function position(pin){const ps=vertices(pin.target);if(!ps.length)return null;const key=pin.target+'|'+(pin.point?.join(',')||`${pin.axis||'y'}:${pin.at??.5}`);if(anchors.has(key))return anchors.get(key).clone();let goal;
 if(pin.point)goal=new THREE.Vector3(...pin.point);else{const box=new THREE.Box3().setFromPoints(ps),axis=pin.axis||'y',value=THREE.MathUtils.lerp(box.min[axis],box.max[axis],pin.at??.5),slice=ps.filter(p=>Math.abs(p[axis]-value)<Math.max(.0005,(box.max[axis]-box.min[axis])*.05));goal=slice.length?slice.reduce((a,b)=>a.add(b),new THREE.Vector3()).multiplyScalar(1/slice.length):box.getCenter(new THREE.Vector3());}
 const closest=ps.reduce((a,b)=>a.distanceToSquared(goal)<b.distanceToSquared(goal)?a:b);anchors.set(key,closest.clone());return closest.clone();
 }
 function apply(step,quiz=false){if(quiz)return;const targets=step.socketColors||step.osteology==='hip-regions'?['Hip bone.r']:step.landmarkColor?[...new Set(step.pins.filter(p=>!p.context&&byName.get(p.target)?.userData.displayLayer==='bones').map(p=>p.target))]:[];
 for(const name of targets){const m=byName.get(name);if(!m)continue;const key=name+'|'+step.title;if(!colors.has(key)){const ps=vertices(name),base=new THREE.Color('#d8d2c2'),arr=new Float32Array(ps.length*3),spots=step.pins.filter(p=>p.target===name&&!p.context).map(p=>({point:position(p),color:new THREE.Color(p.color)})),center=new THREE.Vector3(-.08458,.86360,-.00549),normal=new THREE.Vector3(-.80005,-.58402,.13729).normalize();
 ps.forEach((v,i)=>{let c=base;
 if(step.socketColors){const delta=v.clone().sub(center),axial=delta.dot(normal),r=delta.clone().addScaledVector(normal,-axial).length();if(axial>-.027&&axial<.009&&r<.029){c=new THREE.Color(r>.014?'#39d9cc':'#ff6788');}}
 else if(step.osteology==='hip-regions'){c=new THREE.Color(v.y>.890||(v.y>.867&&v.x<-.075)?'#39d9cc':v.z>.007?'#ffc548':'#ff6788');}
 else {let distance=name.includes('phalanx')||name.includes('tarsal')?.006:.013;for(const spot of spots){const d=v.distanceTo(spot.point);if(d<distance){distance=d;c=spot.color;}}}
 c.toArray(arr,i*3);});colors.set(key,new THREE.BufferAttribute(arr,3));}
 m.geometry.setAttribute('color',colors.get(key));m.material.vertexColors=true;m.material.color.set('#ffffff');m.material.needsUpdate=true;
 }}
 return {position,apply,dispose(){points.clear();anchors.clear();colors.clear();}};
}
