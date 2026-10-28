import * as THREE from 'three';
import {vertebraPart,PART_COLORS,LANDMARKS,normalizePoint} from './vertebra-math.js';
export function createVertebraTeaching({byName,scene,renderer}){
 const vertices=new Map(),colors=new Map(),originals=new Map(),moved=new Set(),plane=new THREE.Plane(new THREE.Vector3(1,0,0),0);let sliced=false;
 renderer.localClippingEnabled=true;
 for(const [name,m]of byName)originals.set(name,m.position.clone());
 function points(name){if(vertices.has(name))return vertices.get(name);const m=byName.get(name);if(!m)return null;const a=m.geometry.attributes.position,ps=[];for(let i=0;i<a.count;i++)ps.push(new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(m.matrixWorld));const b=new THREE.Box3().setFromPoints(ps),v={ps,b,min:b.min.toArray(),max:b.max.toArray()};vertices.set(name,v);return v;}
 function invalidate(){vertices.clear();for(const m of byName.values()){delete m.userData.points;delete m.userData.box;}}
 function layout(step){
  for(const name of moved){byName.get(name).position.copy(originals.get(name));}moved.clear();scene.updateMatrixWorld(true);invalidate();
  if(step.comparison){const names=['Vertebra C5','Vertebra T6','Vertebra L3'];names.forEach((name,i)=>{const m=byName.get(name);if(!m)return;const b=new THREE.Box3().setFromObject(m),center=b.getCenter(new THREE.Vector3()),goal=new THREE.Vector3((i-1)*.11,1,0),inverse=new THREE.Matrix4().copy(m.parent.matrixWorld).invert(),delta=goal.applyMatrix4(inverse).sub(center.applyMatrix4(inverse));m.position.add(delta);moved.add(name);});scene.updateMatrixWorld(true);invalidate();}
  sliced=!!step.section;
 }
 function position(pin){const v=points(pin.target);if(!v)return null;let goal;
  if(pin.part&&LANDMARKS[pin.part]){goal=new THREE.Vector3(...LANDMARKS[pin.part]).multiply(v.b.getSize(new THREE.Vector3())).add(v.b.min);if(pin.part==='foramen'||pin.part==='s2')return goal;}
  else if(pin.point)goal=new THREE.Vector3(...pin.point);
  else return null;
  const paired=['pedicle','lamina','transverse','superior-facet','inferior-facet','lateral-mass'].includes(pin.part),candidates=/Vertebra|Atlas|Axis/.test(pin.target)&&PART_COLORS[pin.part]?v.ps.filter(p=>{const n=normalizePoint(p.toArray(),v.min,v.max);return vertebraPart(pin.target,n)===pin.part&&(!paired||n[0]>.5);}):v.ps;
  return (candidates.length?candidates:v.ps).reduce((a,b)=>a.distanceToSquared(goal)<b.distanceToSquared(goal)?a:b).clone();
 }
 function apply(step,quiz=false){
  for(const [name,m]of byName){m.material.clippingPlanes=!quiz&&sliced&&['bones','ligaments'].includes(m.userData.displayLayer)?[plane]:null;if(quiz||!step.parts||m.userData.displayLayer!=='bones'||!step.focus.includes(name))continue;
   if(['Sacrum','Coccyx'].includes(name)){const key=name+'|'+step.id;if(!colors.has(key)){const v=points(name),arr=new Float32Array(v.ps.length*3),base=new THREE.Color('#d8d6c9'),spots=step.pins.filter(p=>p.target===name&&p.part&&!p.context).map(p=>({at:position(p),color:new THREE.Color(p.color)})),radius=v.b.getSize(new THREE.Vector3()).length()*.08;v.ps.forEach((p,i)=>{let col=base,dist=radius;for(const spot of spots){const d=p.distanceTo(spot.at);if(d<dist){dist=d;col=spot.color;}}col.toArray(arr,i*3);});colors.set(key,new THREE.BufferAttribute(arr,3));}m.geometry.setAttribute('color',colors.get(key));m.material.vertexColors=true;m.material.color.set('#ffffff');m.material.needsUpdate=true;continue;}
   if(!/Vertebra|Atlas|Axis/.test(name))continue;
   if(!colors.has(name)){const v=points(name),arr=new Float32Array(v.ps.length*3);v.ps.forEach((p,i)=>{new THREE.Color(PART_COLORS[vertebraPart(name,normalizePoint(p.toArray(),v.min,v.max))]||'#d7d4c7').toArray(arr,i*3);});colors.set(name,new THREE.BufferAttribute(arr,3));}
   m.geometry.setAttribute('color',colors.get(name));m.material.vertexColors=true;m.material.color.set('#ffffff');m.material.needsUpdate=true;
  }
 }
 return {layout,position,apply,setSection(value){sliced=value;},get section(){return sliced;},dispose(){for(const name of moved)byName.get(name)?.position.copy(originals.get(name));vertices.clear();colors.clear();originals.clear();moved.clear();}};
}
