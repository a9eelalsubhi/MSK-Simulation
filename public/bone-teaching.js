import * as THREE from 'three';
const COLORS=['#f08fb5','#71d7ca','#f5cc6a','#7bafff'];
export function createBoneTeaching({byName,scene}){
 const cache=new Map(),baseColors=new Map();let active=null;
 function points(name){if(cache.has(name))return cache.get(name);const m=byName.get(name);if(!m)return [];const a=m.geometry.attributes.position,ps=[];for(let i=0;i<a.count;i++)ps.push(new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(m.matrixWorld));cache.set(name,ps);return ps;}
 function path(name,axis,lo,hi,pick,count=30){const ps=points(name),out=[];for(let i=0;i<count;i++){const t=lo+(hi-lo)*i/(count-1),slice=ps.filter(p=>Math.abs(p[axis]-t)<(hi-lo)/count*.7);const p=pick(slice,t);if(p)out.push(p.clone());}return out;}
 const extreme=(ps,axis,dir)=>ps.length?ps.reduce((a,b)=>dir*b[axis]>dir*a[axis]?b:a):null;
 const borderPaths={
  medial:path('Scapula.r','y',1.262,1.402,ps=>extreme(ps,'x',1)),
  lateral:path('Scapula.r','y',1.262,1.367,ps=>extreme(ps,'x',-1)),
  superior:path('Scapula.r','x',-.118,-.087,ps=>extreme(ps.filter(p=>p.z<-.025),'y',1))
 };
 const clavPoints=points('Clavicle.r');const clavMin=Math.min(...clavPoints.map(p=>p.x)),clavMax=Math.max(...clavPoints.map(p=>p.x));
 const centerline=path('Clavicle.r','x',clavMin,clavMax,ps=>ps.length?ps.reduce((a,p)=>a.add(p),new THREE.Vector3()).multiplyScalar(1/ps.length):null,60);
 const lengths=[0];for(let i=1;i<centerline.length;i++)lengths[i]=lengths[i-1]+centerline[i].distanceTo(centerline[i-1]);
 const split=centerline[lengths.findIndex(l=>l>=lengths.at(-1)/3)]?.x??-.11;
 const clavBorders={anterior:path('Clavicle.r','x',clavMin+.002,split,ps=>extreme(ps,'z',1)),posterior:path('Clavicle.r','x',clavMin+.002,split,ps=>extreme(ps,'z',-1))};
 const midpoint=p=>p[Math.floor(p.length/2)];
 function closestCenter(p){return centerline.reduce((a,b)=>Math.abs(b.x-p.x)<Math.abs(a.x-p.x)?b:a,centerline[0]);}
 function tint(name,mode){const m=byName.get(name);if(!m)return;const key=name+mode;if(!baseColors.has(key)){const ps=points(name),out=new Float32Array(ps.length*3),base=new THREE.Color('#d7d5c8');ps.forEach((p,i)=>{let color=base;
 if(mode==='scapular-borders'){const paths=[borderPaths.superior,borderPaths.medial,borderPaths.lateral];let best=.0035;paths.forEach((path,j)=>{for(const q of path){const d=q.distanceTo(p);if(d<best){best=d;color=new THREE.Color(COLORS[j]);}}});}
 if(mode==='clavicle-parts')color=new THREE.Color(p.x<split?COLORS[0]:COLORS[1]);
 if(mode==='clavicle-surfaces')color=new THREE.Color(p.y>=closestCenter(p).y?COLORS[2]:COLORS[3]);
 if(mode==='clavicle-borders'){let best=.003;Object.values(clavBorders).forEach((path,j)=>path.forEach(q=>{const d=q.distanceTo(p);if(d<best){best=d;color=new THREE.Color(COLORS[j]);}}));}
 color.toArray(out,i*3);});baseColors.set(key,new THREE.BufferAttribute(out,3));}
 m.geometry.setAttribute('color',baseColors.get(key));m.material.vertexColors=true;m.material.color.set('#ffffff');m.material.needsUpdate=true;
 }
 return {apply(step,quiz=false){active=quiz?null:step.osteology;if(!active)return;if(active==='scapular-borders')tint('Scapula.r',active);if(active.startsWith('clavicle-'))tint('Clavicle.r',active);},position(pin){if(pin.feature&&borderPaths[pin.feature])return midpoint(borderPaths[pin.feature]);if(pin.feature&&clavBorders[pin.feature])return midpoint(clavBorders[pin.feature]);if(pin.point)return new THREE.Vector3(...pin.point);return null;},dispose(){cache.clear();baseColors.clear();},borderPaths};
}
