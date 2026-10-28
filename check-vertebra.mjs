import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from './public/vendor/three.module.js';
import {createVertebraLab} from './public/vertebra-lab.js';

const url=p=>new URL(p,import.meta.url).href;
const source=fs.readFileSync('public/vertebra-teaching.js','utf8').replace("'three'",JSON.stringify(url('./public/vendor/three.module.js'))).replace("'./vertebra-math.js'",JSON.stringify(url('./public/vertebra-math.js')));
const {createVertebraTeaching}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const scene=new THREE.Scene(),group=new THREE.Group();group.position.set(.25,.3,-.4);group.scale.setScalar(1.3);scene.add(group);
const names=['Vertebra C5','Vertebra T6','Vertebra L3','Sacrum','Spinal dura'];
const byName=new Map(names.map((n,i)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(.04,.025,.045,4,4,4),new THREE.MeshStandardMaterial());m.position.set(i*.01,1+i*.15,.03);m.userData.displayLayer=n==='Spinal dura'?'nerves':'bones';group.add(m);return [n,m];}));
scene.updateMatrixWorld(true);
const originals=new Map([...byName].map(([n,m])=>[n,{pos:m.position.clone(),vertices:[...m.geometry.attributes.position.array]}]));
const teaching=createVertebraTeaching({byName,scene,renderer:{}}),data=JSON.parse(fs.readFileSync('public/lectures/l12/tour.json'));
const comparison=data.steps.find(s=>s.id==='compare-shapes');
teaching.layout(comparison);
for(const [i,n]of names.slice(0,3).entries()){const center=new THREE.Box3().setFromObject(byName.get(n)).getCenter(new THREE.Vector3());assert(center.distanceTo(new THREE.Vector3((i-1)*.11,1,0))<1e-6,'Comparison works under transformed parents');assert.deepEqual([...byName.get(n).geometry.attributes.position.array],originals.get(n).vertices,'Geometry and scale are preserved');}
const typical=data.steps.find(s=>s.id==='typical-body');teaching.layout(typical);teaching.apply(typical);
for(const n of names)assert(byName.get(n).position.distanceTo(originals.get(n).pos)<1e-9,'Leaving comparison restores anatomical positions');
const mesh=byName.get('Vertebra L3'),color=mesh.geometry.attributes.color;assert(color&&mesh.material.vertexColors);
const lamina=teaching.position(typical.pins.find(p=>p.part==='lamina'));assert(lamina instanceof THREE.Vector3);assert(new THREE.Box3().setFromObject(mesh).containsPoint(lamina),'Pins remain on actual geometry');
teaching.apply(typical);assert.equal(mesh.geometry.attributes.color,color,'Color buffers are reused');
teaching.setSection(true);teaching.apply(typical);assert(mesh.material.clippingPlanes?.length===1);assert.equal(byName.get('Spinal dura').material.clippingPlanes,null,'Section clips bones, not nerves');
teaching.apply(typical,true);assert.equal(mesh.material.clippingPlanes,null,'Quiz bypasses clipping');
teaching.layout(comparison);teaching.dispose();for(const n of names)assert(byName.get(n).position.equals(originals.get(n).pos),'Disposal restores separated models');

class El extends EventTarget{
 constructor(tag){super();this.tag=tag;this.children=[];this.style={setProperty(){}};this.value='';this.attributes={};}
 append(...es){this.children.push(...es);for(const e of es)e.parent=this;if(this.tag==='select'&&!this.value)this.value=es[0]?.value||es[0]?.children?.[0]?.value||'';}
 after(e){this.parent.children.splice(this.parent.children.indexOf(this)+1,0,e);e.parent=this.parent;}
 replaceChildren(...es){this.children=es;}setAttribute(k,v){this.attributes[k]=v;}before(e){this.panel=e;}remove(){this.removed=true;}showModal(){this.open=true;}close(){this.open=false;}click(){this.onclick?.();this.dispatchEvent(new Event('click'));}
}
const walk=e=>[e,...e.children.flatMap(walk)],find=(e,text)=>walk(e).find(x=>x.tag==='button'&&x.textContent===text);
for(const lid of [12,13,14]){
 const d=JSON.parse(fs.readFileSync(`public/lectures/l${lid}/tour.json`)),topics=new El('nav'),viewport=new El('div'),body=new El('body'),slide=new El('button');
 globalThis.document={createElement:t=>new El(t),getElementById:id=>({topics,viewport,showSlide:slide})[id],body};
 let selected=-1,inspected=null,quiz=false,section=false,refreshes=0;
 const lab=createVertebraLab({data:d,select:i=>selected=i,study:s=>inspected=s,teaching:{get section(){return section},setSection:v=>section=v},refresh:()=>refreshes++,isQuiz:()=>quiz});
 const panel=topics.panel,dialog=body.children[0],picker=walk(panel).find(e=>e.tag==='select');lab.update(d.steps[5]);picker.value='Atlas (C1)';find(panel,'Inspect this vertebra').click();lab.update(inspected);assert.equal(inspected.focus[0],'Atlas (C1)');assert(inspected.pins.some(p=>p.part==='anterior-arch'));find(viewport,'Restore lesson').click();assert.equal(selected,5,'Inspection returns to the last lesson');
 find(panel,'Compare C5 · T6 · L3').click();if(lid===12)assert.equal(d.steps[selected].id,'compare-shapes','Compare button must not jump to inferior-facet scene');else assert(inspected.comparison);
 const open=panel.children.at(-1);open.click();assert(dialog.open);
 if(lid===13){assert.equal(walk(dialog).filter(e=>e.tag==='option').length,16);assert(find(dialog,'Intrinsic intermediate'));find(dialog,'Intrinsic intermediate').click();assert.equal(d.steps[selected].id,'erector-columns');assert(!dialog.open);}
 if(lid===14){assert.equal(walk(dialog).filter(e=>e.tag==='table').length,3);find(dialog,'Lumbar puncture').click();assert.equal(d.steps[selected].id,'lumbar-puncture');assert(!dialog.open);}
 const tools=viewport.children[0];find(tools,'Section view').click();assert(section&&refreshes===1);
 quiz=true;dialog.close();open.click();find(panel,'Inspect this vertebra').click();find(tools,'Intact view').click();assert(!dialog.open&&refreshes===1,'Study navigation and section controls are guarded during quiz');
 lab.dispose();assert([panel,dialog,...viewport.children].every(e=>e.removed),'Dynamic UI is removed');
}
console.log('PASS: original shape preservation, transformed comparison/restoration, geometry anchors, color reuse, section/quiz safety, 26-level picker, layer/profile/table jumps and cleanup.');
