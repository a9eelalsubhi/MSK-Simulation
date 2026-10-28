import {configureReferenceSlides} from './reference-slides.js?v=20261028-yasser';
import {resolveLecture,lectureModelPaths,lectureTargets,validateLecture,createLifetime} from './lecture-runtime.js?v=20261003-simple1';
import {createMuscleMotionViewer} from './muscle-motion-viewer.js?v=20261005-edl1';
import {createMuscleActions} from './muscle-actions.js?v=20261004-upper1';
import {validateMuscleActions} from './muscle-action-data.js?v=20261005-edl1';
import {prepareAnatomyModel,loadAnatomyModel,disposeObjectTree} from './mesh-resources.js?v=20261003-audit4';
import {createAnnotationManager} from './annotation-manager.js?v=20261003-audit4';
import {createVertebraTeaching} from './vertebra-teaching.js?v=20261003';
import {createVertebraLab} from './vertebra-lab.js?v=20261028-yasser';
import {createLowerNerveLab} from './lower-nerve-lab.js?v=20261028-yasser';
import {createVesselLab} from './vessel-lab.js?v=20260929b';
import {mergeVertices} from './vendor/BufferGeometryUtils.js';
import {createLowerLimbTeaching} from './lower-limb-teaching.js';
import {createLowerLimbLab} from './lower-limb-lab.js';
import {createLowerMuscleLab} from './lower-muscle-lab.js';
import * as THREE from 'three';
import {createNerveLab} from './nerve-lab.js';
import {createLayerControls} from './layer-controls.js?v=20261003-audit4';
import {OrbitControls} from './vendor/OrbitControls.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {DRACOLoader} from './vendor/DRACOLoader.js';
import {createForearmLab} from './forearm-lab.js';
import {createMuscleStudy} from './muscle-study.js?v=20261003-simple1';
import {createBoneTeaching} from './bone-teaching.js';
import {createEnhancements} from './enhancements.js?v=20261003-audit4';
import {PART_COLORS} from './tour-math.js';
const requestedLecture=new URLSearchParams(location.search).get('lecture'),lectureId=resolveLecture(location.search),isVertebra=['12','13','14'].includes(lectureId),isLower=['7','8','9','10'].includes(lectureId),isLowerNerves=lectureId==='10',isLowerVessels=lectureId==='9',isLowerBones=lectureId==='7',isLowerMuscles=lectureId==='8',isBones=['1','7'].includes(lectureId),isForearm=lectureId==='3',isNerves=lectureId==='5',isMuscles=['2','3','8'].includes(lectureId),lectureBase=lectureId==='4'?'':'/lectures/l'+lectureId;
let vertebraTeaching=null,vertebraLab=null;
let muscleActions=null,muscleActionCatalog=null,motionViewer=null;
let lectureData=null,boneTeaching=null,muscleStudy=null,forearmLab=null,nerveLab=null,lowerLab=null,lowerMuscleLab=null,vesselLab=null,lowerNerveLab=null,running=true,frameId=null,renderDirty=true;
const $=id=>document.getElementById(id),host=$('canvasHost');
const state={step:0,pin:0,isolated:false,opacity:.12,labels:true,arteries:false,veins:false,bones:true,muscles:false,nerves:false,ligaments:false,lessonContext:false,spotlight:null};
let extras=null,layerControls=null;
let topics=[],steps=[],meshes=[],selected=[],pins=[],ready=false,transition=null,renderer,controls;
const byName=new Map(),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.001,20),segmentCache=new Map();
const small=()=>innerWidth<=650;
const lifetime=createLifetime();let annotations=null,pinPaging=false,lectureScope=new Set();
// Register teardown before the first await, including failures and navigation during decoding.
lifetime.own(()=>{
 running=false;ready=false;cancelAnimationFrame(frameId);transition=null;
 for(const feature of [muscleActions,motionViewer,annotations,extras,layerControls,muscleStudy,forearmLab,nerveLab,boneTeaching,lowerLab,lowerMuscleLab,vesselLab,lowerNerveLab,vertebraLab,vertebraTeaching]){try{feature?.dispose();}catch(e){console.error(e);}}
 controls?.dispose();disposeObjectTree(scene);renderer?.dispose();renderer?.forceContextLoss();renderer?.domElement.remove();
 $('annotations').replaceChildren();$('pinLines').replaceChildren();$('slideContent').replaceChildren();$('diagramImage').removeAttribute('src');pins=[];selected=[];meshes=[];byName.clear();segmentCache.clear();explorerEntries=[];
});
window.addEventListener('pagehide',()=>lifetime.dispose(),{once:true});
function el(tag,text,cls){const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;}
let explorerStep=null;
let referenceRegistry=null;
function current(){return explorerStep||steps[state.step];}
function referenceSlides(step){
 const related=referenceRegistry?.steps[lectureId]?.[step.title];
 if(related)return [{...related,label:'Related reference · '+related.label}];
 if(step.sourceReferences)return step.sourceReferences;
 if(lectureData.referenceSlides)return (step.referencePages||[]).map(id=>lectureData.referenceSlides[id]).filter(Boolean);
 return step.pages.map(p=>({src:`${lectureBase}/slides/${p}.jpg`,label:`Lecture page ${p}`}));
}
function showReferenceDiagram(step){
 if(!step.diagram)return;
 const ref=referenceSlides(step)[0];
 if(!ref){$('tourDiagram').hidden=true;return;}
 $('diagramImage').src=ref.src;$('diagramImage').alt=ref.label;
 $('diagramBadge').textContent=referenceRegistry?.lectures[lectureId]?ref.label:lectureData.referenceSlides?'Related reference · '+ref.label:step.diagram.note||ref.label;
}
function worldCache(m){
 if(m.userData.points)return m.userData.points;
 const a=m.geometry.attributes.position,points=[],v=new THREE.Vector3(),stride=Math.max(1,Math.floor(a.count/3500));
 for(let i=0;i<a.count;i+=stride){v.fromBufferAttribute(a,i).applyMatrix4(m.matrixWorld);points.push(v.clone());}
 m.userData.box=new THREE.Box3().setFromObject(m,true);m.userData.points=points;return points;
}
function anchor(name,at=.5,axis='y',reference){
 const m=byName.get(name);if(!m)return null;const points=worldCache(m),box=m.userData.box;
 let value=THREE.MathUtils.lerp(box.min[axis],box.max[axis],at);
 if(reference&&byName.has(reference)){const ref=byName.get(reference);worldCache(ref);value=THREE.MathUtils.lerp(ref.userData.box.min[axis],ref.userData.box.max[axis],at);}
 const span=Math.max(.001,box.max[axis]-box.min[axis]),sample=points.filter(p=>Math.abs(p[axis]-value)<span*.035);
 if(!sample.length)return points.reduce((best,p)=>Math.abs(p[axis]-value)<Math.abs(best[axis]-value)?p:best,points[0]).clone();
 // Averaging vertices can land in empty space between branches. Keep the
 // requested slice, but pin the arrow to an actual surface vertex in that slice.
 const center=sample.reduce((sum,p)=>sum.add(p),new THREE.Vector3()).multiplyScalar(1/sample.length);
 return sample.reduce((best,p)=>p.distanceToSquared(center)<best.distanceToSquared(center)?p:best,sample[0]).clone();
}
function segments(name,muscleName){
 if(segmentCache.has(name))return segmentCache.get(name);
 const m=byName.get(name),muscle=byName.get(muscleName);if(!m||!muscle)return null;
 worldCache(m);const box=m.userData.box,span=box.max.x-box.min.x,ray=new THREE.Raycaster(),hits=[];
 for(let i=1;i<39;i++){const p=anchor(name,i/40,'x');ray.set(new THREE.Vector3(p.x,p.y,.6),new THREE.Vector3(0,0,-1));const hit=ray.intersectObject(muscle,false)[0];if(hit&&hit.point.z>p.z-.003)hits.push(p.x);}
 // Illustrative projected boundaries, explicitly labeled as approximate in the tour.
 let low=hits.length?Math.min(...hits):box.min.x+span*.34,high=hits.length?Math.max(...hits):box.min.x+span*.67;
 low=THREE.MathUtils.clamp(low,box.min.x+span*.15,box.max.x-span*.3);high=THREE.MathUtils.clamp(high,low+span*.15,box.max.x-span*.12);
 const a=m.geometry.attributes.position,colors=new Float32Array(a.count*3),v=new THREE.Vector3();
 for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(m.matrixWorld);const part=v.x>high?0:v.x>low?1:2;new THREE.Color(PART_COLORS[part]).toArray(colors,i*3);}
 m.geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
 const centers=[(high+box.max.x)/2,(low+high)/2,(box.min.x+low)/2].map(x=>anchor(name,(x-box.min.x)/span,'x'));
 const result={mesh:m,centers};segmentCache.set(name,result);return result;
}
function buildPins(){
 pins=[];$('annotations').replaceChildren();$('pinLines').replaceChildren();const step=current();if(!step||!ready)return;
 step.pins.forEach((p,i)=>{
  const position=vertebraTeaching?.position(p)||boneTeaching?.position(p)||(p.segment!=null?segments(step.segment.vessel,step.segment.muscle)?.centers[p.segment]:anchor(p.target,p.at??.5,p.axis||'y',p.reference));if(!position)return;
  const color=forearmLab?.color(p.target,p.color)||p.color||PART_COLORS[i%3],card=el('div',null,'anatomy-pin');card.style.setProperty('--pin-color',color);card.append(el('strong',p.name),el('p',p.text));card.setAttribute('dir','auto');
  const dot=el('button',String(i+1),'pin-number');dot.setAttribute('aria-label',p.name+' — '+p.text);dot.style.color=color;dot.onclick=()=>{state.pin=i;if(isLower||isVertebra){state.spotlight=state.spotlight===p.target?null:p.target;updateVisibility();focusStep();}};
  const line=document.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('stroke',color);line.setAttribute('stroke-width','1.25');line.setAttribute('marker-end',`url(#pin-arrow-${i})`);const defs=document.createElementNS('http://www.w3.org/2000/svg','defs'),marker=document.createElementNS('http://www.w3.org/2000/svg','marker'),arrow=document.createElementNS('http://www.w3.org/2000/svg','path');marker.id=`pin-arrow-${i}`;for(const [k,v]of Object.entries({viewBox:'0 0 8 8',refX:'8',refY:'4',markerWidth:'6',markerHeight:'6',orient:'auto'}))marker.setAttribute(k,v);arrow.setAttribute('d','M0 0 L8 4 L0 8 Z');arrow.setAttribute('fill',color);marker.append(arrow);defs.append(marker);$('pinLines').append(defs);line.setAttribute('opacity','.8');if(p.context)line.setAttribute('stroke-dasharray','4 4');
  $('annotations').append(card,dot);$('pinLines').append(line);const mesh=byName.get(p.target),localPosition=mesh.worldToLocal(position.clone());pins.push({p,position,mesh,localPosition,card,dot,line,index:i});
 });
 annotations?.reset();
}
function updatePins(){annotations?.update();}

function updateVisibility(){
 const step=current();if(!step)return;renderDirty=true;const contextSet=new Set(step.context||[]);
 const spotlightGroup=new Set(step.focusGroups?.[state.spotlight]||[state.spotlight]);
 for(const m of meshes){
  const name=m.userData.anatomyName,layer=m.userData.displayLayer,isSelected=selected.includes(m),context=contextSet.has(name),isVessel=layer==='arteries'||layer==='veins';
  m.visible=state.isolated?isSelected:(isSelected||context||(isLower?!step.studyView&&state[layer]:state[layer]));
  if((isLowerMuscles||isLowerVessels||isLowerNerves)&&layer==='bones'&&!extras?.quizActive)m.visible=!step.boneContext||step.boneContext.includes(name);
  const mat=m.material;mat.vertexColors=!!step.segment&&step.segment.vessel===name;
  const pin=step.pins.find(p=>p.target===name&&!p.context);
  let color=layer==='arteries'?'#d94759':layer==='veins'?'#438fe0':layer==='bones'?'#c6cfce':layer==='muscles'?'#bc6474':layer==='ligaments'?'#d1b876':'#f6ca6c';
  if(isLowerVessels&&lectureData.vesselColors?.[name])color=lectureData.vesselColors[name];if(isSelected&&pin?.color&&!(isLower&&layer==='bones'))color=pin.color;if((isLower||isVertebra)&&step.structureColors?.[name])color=step.structureColors[name];if((isNerves||isLowerNerves)&&lectureData.nerveColors?.[name])color=lectureData.nerveColors[name];if(isMuscles&&lectureData.muscleColors?.[name]&&!(isLowerMuscles&&isSelected&&pin?.color))color=forearmLab?.color(name)||lectureData.muscleColors[name];if((isBones||isForearm)&&step.boneColors?.[name])color=forearmLab?.color(name,step.boneColors[name])||step.boneColors[name];if(mat.vertexColors)color='#ffffff';mat.color.set(color);
  mat.opacity=isSelected?1:context ? .42 :isVessel ? .08 :state.opacity;mat.transparent=mat.opacity<1;mat.depthWrite=mat.opacity>=.99;mat.emissive.set(isSelected?color:'#000000');mat.emissiveIntensity=isLowerNerves&&isSelected&&layer==='nerves'?.22:isLowerVessels&&isSelected&&isVessel?.18:isLower?0:isSelected ? .16 : 0;mat.needsUpdate=true;
 }
 boneTeaching?.apply(step,extras?.quizActive);vertebraTeaching?.apply(step,extras?.quizActive);extras?.applyMuscles();if((isLower||isVertebra)&&!state.spotlight&&!extras?.quizActive){for(const m of meshes){const opacity=step.sceneOpacity?.[m.userData.anatomyName];if(opacity!=null){m.material.opacity=opacity;m.material.transparent=opacity<1;m.material.depthWrite=opacity===1;}}}
 if(isLowerNerves&&state.lessonContext&&!extras?.quizActive){const context=new Set(step.contextMuscles||[]);for(const m of meshes){const n=m.userData.anatomyName;if(m.userData.displayLayer==='muscles'&&context.has(n)&&!step.focus.includes(n)){m.visible=true;m.material.opacity=.12;m.material.transparent=true;m.material.depthWrite=false;}}}
 if((isLowerMuscles||isLowerVessels||isLowerNerves)&&!extras?.quizActive){for(const m of meshes){if(m.userData.displayLayer!=='bones')continue;const focusBone=state.spotlight===m.userData.anatomyName;const opacity=focusBone?1:.42;m.material.opacity=opacity;m.material.transparent=opacity<1;m.material.depthWrite=focusBone;}}
 if(isVertebra&&!extras?.quizActive){const scope=new Set(step.focus),bones=new Set(step.boneContext||[]);for(const m of meshes){const name=m.userData.anatomyName;if(m.userData.displayLayer==='bones'&&bones.has(name)&&!state.isolated){m.visible=true;m.material.opacity=step.sceneOpacity?.[name]??(lectureId==='14'?.22:.42);m.material.transparent=true;m.material.depthWrite=false;}if(scope.has(name)&&m.userData.displayLayer==='muscles'){m.visible=true;m.material.opacity=step.sceneOpacity?.[name]??1;m.material.transparent=m.material.opacity<1;m.material.depthWrite=!m.material.transparent;}}}
 layerControls?.apply();
 if(isVertebra&&!extras?.quizActive){const scope=new Set([...step.focus,...(step.context||[])]),bones=new Set(step.boneContext||[]),boneSpot=byName.get(state.spotlight)?.userData.displayLayer==='bones';for(const m of meshes){const name=m.userData.anatomyName,keepBone=m.userData.displayLayer==='bones'&&bones.has(name)&&!state.isolated&&!boneSpot;if(!state.lessonContext&&!scope.has(name)&&!keepBone&&!layerControls?.isEnabledManually(m.userData.displayLayer))m.visible=false;if(state.spotlight&&name!==state.spotlight&&!keepBone)m.visible=false;}}
 if(isLower&&!extras?.quizActive){const scope=new Set(step.focus.concat(step.context||[],(isLowerVessels||isLowerNerves)&&state.spotlight?[state.spotlight]:[])),boneSpotlight=byName.get(state.spotlight)?.userData.displayLayer==='bones';for(const m of meshes){const name=m.userData.anatomyName,isBone=m.userData.displayLayer==='bones',keepSkeleton=(isLowerMuscles||isLowerVessels||isLowerNerves)&&isBone&&!boneSpotlight&&(!step.boneContext||step.boneContext.includes(name));if(!state.lessonContext&&!scope.has(name)&&!keepSkeleton&&!layerControls?.isEnabledManually(m.userData.displayLayer))m.visible=false;if(state.lessonContext&&isBone&&!isLowerMuscles&&!isLowerVessels&&!isLowerNerves&&!layerControls?.isEnabledManually('bones')){m.visible=true;if(!scope.has(name))m.material.opacity=.10;}if(state.spotlight&&!spotlightGroup.has(name)&&!keepSkeleton)m.visible=false;m.material.transparent=m.material.opacity<1;m.material.depthWrite=!m.material.transparent;} }
 if(!extras?.quizActive)for(const m of meshes)if(layerControls?.isDisabledManually(m.userData.displayLayer))m.visible=false;
 motionViewer?.applyVisibility();
 $('isolate').classList.toggle('active',state.isolated);$('isolate').textContent=state.isolated?'Show context':'Isolate highlights';
}
function animateCamera(target,distance,back=false){
 const direction=Array.isArray(back)?new THREE.Vector3(...back).normalize():back==='socket'?new THREE.Vector3(-.80,-.58,.14):back==='oblique'?new THREE.Vector3(-.75,.12,.65).normalize():back==='medial'?new THREE.Vector3(1,0,0):back==='lateral'?new THREE.Vector3(-1,0,0):back==='superior'?new THREE.Vector3(0,1,.001):back==='inferior'?new THREE.Vector3(0,-1,.001):new THREE.Vector3(0,0,back===true?-1:1);const to=target.clone().addScaledVector(direction,distance);
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){camera.position.copy(to);controls.target.copy(target);controls.update();return;}
 transition={start:performance.now(),from:camera.position.clone(),fromTarget:controls.target.clone(),to,target};
}
function focusStep(viewOverride){
 if(!ready)return;const view=typeof viewOverride==='string'||Array.isArray(viewOverride)?viewOverride:null,step=current();if(isLower||isVertebra){focusLowerStep(step,view??step.view);return;}const box=new THREE.Box3();
 (step.focus||step.pins.map(p=>p.target)).forEach(n=>{const m=byName.get(n);if(m){worldCache(m);box.union(m.userData.box);}});if(box.isEmpty())return;
 const target=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
 if(step.region&&byName.has(step.region.target)){target.copy(anchor(step.region.target,step.region.at??.5,step.region.axis||'y'));size.setScalar(step.region.span||.18);}
 const verticalSpan=isLower&&['superior','inferior'].includes(step.view)?size.z:size.y,horizontalSpan=isLower&&['medial','lateral'].includes(step.view)?size.z:size.x;
 annotations?.setFocus(target);const span=Math.max(verticalSpan,horizontalSpan/camera.aspect,.095),distance=span/Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*(small()?1.13:.95);target.y-=small()?.01:.045*span;if(step.diagram&&!small())target.x-=span*.14;
 animateCamera(target,Math.max(.25,distance),(['superior','inferior','medial','lateral'].includes(view??step.view)?(view??step.view):(view??step.view)==='back'));$('front').classList.toggle('active',step.view!=='back');$('back').classList.toggle('active',step.view==='back');$('body').classList.remove('active');
}
function focusLowerStep(step,side=step.view){
 const box=new THREE.Box3(),targets=state.spotlight?(step.focusGroups?.[state.spotlight]||[state.spotlight]):step.focus;
 targets.forEach(n=>{const m=byName.get(n);if(m&&m.visible){worldCache(m);box.union(m.userData.box);}});if(box.isEmpty())return;
 let target=box.getCenter(new THREE.Vector3()),span;
 const direction=Array.isArray(side)?new THREE.Vector3(...side).normalize():new THREE.Vector3(...({socket:[-.80,-.58,.14],oblique:[-.75,.12,.65],back:[0,0,-1],medial:[1,0,0],lateral:[-1,0,0],superior:[0,1,.001],inferior:[0,-1,.001]}[side]||[0,0,1])).normalize();
 if(!state.spotlight&&step.cameraTarget){target.set(...step.cameraTarget);span=step.cameraSpan||.2;}
 else if(!state.spotlight&&step.region){target.copy(anchor(step.region.target,step.region.at??.5,step.region.axis||'y'));span=step.region.span;}
 else {span=box.getBoundingSphere(new THREE.Sphere()).radius*2;}
 annotations?.setFocus(target);span=Math.max(.035,span);const usable=small() ? .55 : (isLowerVessels ? (step.region?.span<.4?.73:.60) : isLowerMuscles ? .82 : .68);const angle=Math.min(THREE.MathUtils.degToRad(camera.fov/2),Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect));
 const distance=span*.5/(Math.sin(angle)*usable);const right=new THREE.Vector3().crossVectors(direction,camera.up).negate().normalize();
 if(!small())target.addScaledVector(right,span*.17);else target.y-=span*.12;
 if(isVertebra&&!small())target.addScaledVector(new THREE.Vector3().crossVectors(direction,right).normalize(),-span*.09);
 animateCamera(target,distance,direction.toArray());
}
function selectStep(index){
 if(extras?.quizActive)return;
 if(!Number.isInteger(index)||index<0||index>=steps.length)throw Error('Invalid tour step');extras?.cancelAnimation();explorerStep=null;$('explorerPanel').hidden=true;state.step=index;state.pin=0;state.isolated=false;state.lessonContext=false;state.spotlight=null;const step=current(),topic=topics.find(t=>t.id===step.topic);
 selected=meshes.filter(m=>(step.focus||[]).includes(m.userData.anatomyName)||step.pins.some(p=>p.target===m.userData.anatomyName&&!p.context));
 for(const key of ['arteries','veins','bones','muscles','nerves']){state[key]=key==='bones';$(key).checked=state[key];}if(isVertebra){state.muscleOpacity=step.muscleFocus?.length||lectureId==='13'?1:0;}
 if(lectureId==='4')state.muscleOpacity=step.muscleFocus?.length?.28:0;if(isLowerVessels)state.muscleOpacity=.24;if(isLowerNerves)state.muscleOpacity=step.muscleFocus?.length?.24:0;
 if(isBones||isMuscles||isNerves){state.muscleOpacity=(isLower&&step.muscleFocus?.length) ? .75 : isNerves?(step.muscleFocus?.length ? .35 : 0):isMuscles?1:step.muscleFocus?.length ? 0.4 : 0;$('muscleOpacity').value=state.muscleOpacity*100;$('muscleValue').value=Math.round(state.muscleOpacity*100)+'%';}
 $('sceneTitle').textContent=topic.title;$('sceneSubtitle').textContent=topic.subtitle;$('stepTitle').textContent=step.title;$('stepCaption').textContent=step.caption||'Follow each callout to its anatomical location. Drag the model to change the viewing angle.';
 $('stepChapter').textContent=`${topic.subtitle} · ${lectureData.referenceSlides?referenceSlides(step).map(r=>r.label).join(' / '):'p. '+step.pages.join(', ')}`;$('stepCount').textContent=`${index+1} / ${steps.length}`;$('tourProgress').max=steps.length;$('tourProgress').value=index+1;$('previous').disabled=index===0;$('next').textContent=index===steps.length-1?'Full lecture explorer →':'Next →';
 document.querySelectorAll('.topic').forEach(b=>{const active=b.dataset.topic===step.topic;b.classList.toggle('active',active);b.setAttribute('aria-current',active?'step':'false');});$('tourDiagram').hidden=isLower||isVertebra||!step.diagram;
 muscleActions?.update(step);vertebraTeaching?.layout(step);vertebraLab?.update(step);showReferenceDiagram(step);lowerLab?.update(step);lowerMuscleLab?.update(step);muscleStudy?.update(step);forearmLab?.update(step);nerveLab?.update(step);vesselLab?.update(step);lowerNerveLab?.update(step);buildPins();updateVisibility();focusStep();
}
function next(){if(!steps.length)return;if((small()||pinPaging)&&state.labels&&state.pin<pins.length-1){state.pin++;return;}if(explorerStep){selectStep((isVertebra&&['inspection','comparison'].includes(explorerStep.topic))||explorerStep.topic==='muscle-action-inspection'?state.step:0);return;}if(state.step===steps.length-1){openExplorer();return;}selectStep(state.step+1);}
function previous(){if(explorerStep){selectStep((isVertebra&&['inspection','comparison'].includes(explorerStep.topic))||explorerStep.topic==='muscle-action-inspection'?state.step:steps.length-1);return;}if((small()||pinPaging)&&state.pin>0){state.pin--;return;}if(state.step>0)selectStep(state.step-1);}
function showSlide(){
 const step=current();if(!step)return;
 $('slideTitle').textContent=step.title+' · Reference slides';
 const book=referenceRegistry?.lectures[lectureId];
 if(book){
  const refs=referenceSlides(step),initial=Math.max(0,book.pages.findIndex(p=>p.src===refs[0]?.src));
  const controls=el('div'),prev=el('button','←'),next=el('button','→'),select=el('select'),figure=el('figure'),img=el('img'),caption=el('figcaption');
  select.setAttribute('aria-label','Reference slide page');prev.setAttribute('aria-label','Previous reference slide');next.setAttribute('aria-label','Next reference slide');
  book.pages.forEach((p,i)=>{const o=el('option',p.label);o.value=i;select.append(o);});
  const render=i=>{const page=book.pages[i];select.value=i;img.src=page.src;img.alt=page.label;caption.textContent=page.label;prev.disabled=i===0;next.disabled=i===book.pages.length-1;};
  prev.onclick=()=>render(Number(select.value)-1);next.onclick=()=>render(Number(select.value)+1);select.onchange=()=>render(Number(select.value));
  controls.style.cssText='display:flex;gap:12px;align-items:center;padding:12px;position:sticky;top:0;background:#101f34;z-index:2';controls.append(prev,select,next);
  figure.append(caption,img);$('slideContent').replaceChildren(el('p',book.file+' · page navigation is independent of Next'),controls,figure);render(initial);
 }else $('slideContent').replaceChildren(...referenceSlides(step).map(ref=>{const figure=el('figure');figure.style.margin='0 0 24px';const img=el('img');const mapped=referenceRegistry?.aliases[ref.src]||ref;img.src=mapped.src;img.alt=mapped.label;img.loading='lazy';figure.append(el('figcaption',mapped.label),img);return figure;}));
 $('slideDialog').showModal();
}
function resize(){if(!renderer||lifetime.disposed)return;renderDirty=true;const width=host.clientWidth,height=host.clientHeight;if(!width||!height)return;renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();annotations?.invalidate();}
async function initialize(){
 const refs=await fetch('/reference-slides/manifest.json',{signal:lifetime.signal,cache:'no-cache'});if(!refs.ok)throw Error('Reference slides unavailable');referenceRegistry=await refs.json();configureReferenceSlides(referenceRegistry);if(referenceRegistry.lectures[lectureId])$('lectureSource').prepend('Displayed slides: Dr Yasser Al Harbi — '+referenceRegistry.lectures[lectureId].file+'. The teaching tour is unchanged. ');
 const data=await fetch(lectureBase+'/tour.json',{signal:lifetime.signal,cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Tour unavailable');return r.json();});lifetime.signal.throwIfAborted();if(data.muscleActionCatalog){const response=await fetch(data.muscleActionCatalog.path,{signal:lifetime.signal,cache:'no-cache'});if(!response.ok)throw Error('Muscle action catalog unavailable');muscleActionCatalog=await response.json();lifetime.signal.throwIfAborted();validateMuscleActions(data,null,muscleActionCatalog);}validateLecture(data);lectureScope=lectureTargets(data);lectureData=data;topics=data.topics;steps=data.steps;if(data.referenceSourceNote)$('lectureSource').textContent+=' '+data.referenceSourceNote;
 $('topics').replaceChildren(...topics.map((t,i)=>{const b=el('button',null,'topic');b.dataset.topic=t.id;b.append(el('span',String(i+1).padStart(2,'0'),'num'),el('span',t.title));b.onclick=()=>selectStep(steps.findIndex(s=>s.topic===t.id));return b;}));
 setupExplorer();
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=isLower?1.05:1.3;host.append(renderer.domElement);renderer.domElement.addEventListener('webglcontextlost',event=>{if(lifetime.disposed)return;event.preventDefault();lifetime.dispose();$('loading').hidden=false;$('loading').replaceChildren(el('b','The 3D view needs to reload'));const retry=el('button','Reload anatomy');retry.onclick=()=>location.reload();$('loading').append(retry);},{signal:lifetime.signal});renderer.domElement.setAttribute('aria-label','Anatomy tour: use Next and Previous, and drag the model to rotate');
 controls=new OrbitControls(camera,renderer.domElement);const cameraChanged=()=>renderDirty=true;controls.addEventListener('change',cameraChanged);lifetime.own(()=>controls.removeEventListener('change',cameraChanged));controls.enableDamping=true;controls.minDistance=.035;controls.maxDistance=5;controls.target.set(-.1,1.3,0);camera.position.set(-.1,1.3,1);controls.update();controls.addEventListener('start',()=>transition=null);
 scene.add(new THREE.HemisphereLight(0xd7f2ff,0x18303f,isLower?1.1:2));const key=new THREE.DirectionalLight(0xffefdf,isLower?2.0:3);key.position.set(-2,3,4);scene.add(key);if(isLower)scene.add(new THREE.AmbientLight(0xffffff,1.1));const fill=new THREE.DirectionalLight(0x8fcfff,isLower?.85:2);fill.position.set(3,1,-2);scene.add(fill);const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);lifetime.own(()=>resizeObserver.disconnect());window.addEventListener('resize',resize,{signal:lifetime.signal});window.addEventListener('orientationchange',resize,{signal:lifetime.signal});document.addEventListener('fullscreenchange',resize,{signal:lifetime.signal});resize();
 const draco=new DRACOLoader();draco.setDecoderPath('/vendor/');draco.setDecoderConfig({type:'wasm'});draco.setWorkerLimit(2);const loader=new GLTFLoader();loader.setDRACOLoader(draco);const systems=lectureModelPaths(lectureId,data);lifetime.own(()=>draco.dispose());
  for(let i=0;i<systems.length;i++){
   const {system,path}=systems[i];$('loading').querySelector('small').textContent=`Preparing anatomy layers · ${i+1} / ${systems.length}`;
   const revision=data.assetVersions?.[system],assetPath=revision?path+(path.includes('?')?'&':'?')+'v='+encodeURIComponent(revision):path;
   const model=await loadAnatomyModel(loader,assetPath,lifetime.signal);lifetime.signal.throwIfAborted();scene.add(model.scene);
   const loaded=prepareAnatomyModel(model.scene,system);
   for(const m of loaded){
    const name=m.userData.anatomyName;if(byName.has(name))throw Error('Duplicate anatomy mesh: '+name);
    if((isLower||isVertebra)&&system==='skeletal'){m.geometry.deleteAttribute('normal');const oldGeometry=m.geometry;m.geometry=mergeVertices(oldGeometry,.00001);oldGeometry.dispose();m.geometry.computeVertexNormals();}
    meshes.push(m);byName.set(name,m);
   }
  }
  validateLecture(data,byName);validateMuscleActions(data,byName,muscleActionCatalog);
  const bounds=new THREE.Box3();for(const name of lectureScope){const m=byName.get(name);if(m)bounds.union(new THREE.Box3().setFromObject(m));}controls.minDistance=data.camera?.minDistance??.035;controls.maxDistance=data.camera?.maxDistance??Math.max(1.5,bounds.getBoundingSphere(new THREE.Sphere()).radius*6);
  annotations=createAnnotationManager({viewport:$('viewport'),canvas:renderer.domElement,overlay:$('annotations'),svg:$('pinLines'),camera,controls,getPins:()=>pins,getState:()=>state,onPaging:value=>{pinPaging=value;const hide=!value||pins.length<2||!state.labels;if($('pinNavigation').hidden!==hide)$('pinNavigation').hidden=hide;const text=`Callout ${state.pin+1} of ${pins.length}`;if($('pinCount').textContent!==text)$('pinCount').textContent=text;}});
 scene.updateMatrixWorld(true);draco.dispose();if(isVertebra){vertebraTeaching=createVertebraTeaching({byName,scene,renderer});vertebraLab=createVertebraLab({data:lectureData,select:selectStep,study:openVertebraStudy,teaching:vertebraTeaching,refresh:updateVisibility,isQuiz:()=>!!extras?.quizActive});}if(isBones||isLowerMuscles)boneTeaching=isLower?createLowerLimbTeaching({byName,scene}):createBoneTeaching({byName,scene});if(isLowerBones)lowerLab=createLowerLimbLab({data:lectureData,select:selectStep,isQuiz:()=>!!extras?.quizActive});if(isLowerMuscles)lowerMuscleLab=createLowerMuscleLab({data:lectureData,select:selectStep,isQuiz:()=>!!extras?.quizActive});if(isMuscles)muscleStudy=createMuscleStudy({data:lectureData,select:selectStep,openActions:id=>muscleActions?.open(id)});if(isForearm)forearmLab=createForearmLab({data:lectureData,select:selectStep,state,getCurrent:current,refresh:()=>{buildPins();updateVisibility();}});if(isNerves)nerveLab=createNerveLab({data:lectureData,select:selectStep});if(isLowerVessels)vesselLab=createVesselLab({data:lectureData,select:selectStep,isQuiz:()=>!!extras?.quizActive});if(isLowerNerves)lowerNerveLab=createLowerNerveLab({data:lectureData,select:selectStep,isQuiz:()=>!!extras?.quizActive});layerControls=createLayerControls({extraLayers:isLowerBones||isVertebra?['ligaments']:[],meshes,refresh:updateVisibility,isQuiz:()=>!!extras?.quizActive,isIsolated:()=>state.isolated,isSelected:m=>selected.includes(m),isEligible:m=>m.userData.displayLayer==='bones'?(isVertebra?data.column.includes(m.userData.anatomyName):true):lectureScope.has(m.userData.anatomyName)});ready=true;selectStep(0);$('loading').hidden=true;
 extras=createEnhancements({studyLayer:isVertebra?({12:'bones',13:'muscles',14:'nerves'}[lectureId]):isBones?'bones':isMuscles?'muscles':(isNerves||isLowerNerves)?'nerves':'arteries',functionalQuiz:lectureData.functionalQuiz,quizLayers:lectureData.quizLayers,muscleScope:(isLowerVessels||isLowerNerves)?'focus':lectureId==='4'?'relations':null,targetNames:lectureData.targetNames,quizTargets:lectureData.quizTargets,independentLayers:true,isQuizContext:m=>m.userData.displayLayer==='bones'&&(isVertebra?data.column.includes(m.userData.anatomyName):true),frameSearch:isVertebra?entry=>{if(!entry.step.region)return false;focusLowerStep(entry.step);return true;}:null,setFocus:point=>annotations?.setFocus(point),viewSelection:side=>focusStep({Anterior:'front',Posterior:'back',Medial:'medial',Lateral:'lateral',Superior:'superior',Inferior:'inferior'}[side]),getCurrent:current,camera,controls,canvas:renderer.domElement,meshes,steps,byName,state,refresh:updateVisibility,select:selectStep,cancelCamera:()=>transition=null,capture:()=>({state:{...state},explorer:explorerStep,selected:[...selected],position:camera.position.clone(),target:controls.target.clone()}),restore:saved=>{Object.assign(state,saved.state);explorerStep=saved.explorer;selected=saved.selected;transition=null;camera.position.copy(saved.position);controls.target.copy(saved.target);buildPins();updateVisibility();}});

 if(data.muscles?.length){motionViewer=createActionViewer();muscleActions=createMuscleActions({data,catalog:muscleActionCatalog,viewer:motionViewer,study:openMuscleActionStudy,returnToTour:()=>selectStep(state.step),isQuiz:()=>!!extras?.quizActive,inspectActive:()=>current()?.topic==='muscle-action-inspection'});muscleActions.update(current());}
 updateVisibility();
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let down,multiTouch=false;const activePointers=new Set();
 renderer.domElement.addEventListener('pointerdown',e=>{activePointers.add(e.pointerId);if(activePointers.size===1){down=[e.clientX,e.clientY];multiTouch=false;}else multiTouch=true;},{signal:lifetime.signal});
 renderer.domElement.addEventListener('pointercancel',e=>{activePointers.delete(e.pointerId);down=null;},{signal:lifetime.signal});
 renderer.domElement.addEventListener('pointerup',e=>{activePointers.delete(e.pointerId);if(motionViewer?.active||multiTouch||!down||(!controls.enabled&&!extras?.quizActive)||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(meshes.filter(m=>m.visible&&(!extras?.quizActive||extras.isPickable(m.userData.anatomyName))&&(current()?.topic==='muscle-action-inspection'?['muscles']:isVertebra?['bones','muscles','ligaments','arteries','nerves']:isBones?(isLower?['bones','muscles','ligaments']:['bones','muscles']):isMuscles?['muscles','arteries','nerves']:['arteries','veins','nerves']).includes(m.userData.displayLayer)),false)[0];if(!hit)return;const name=hit.object.userData.anatomyName;if(extras?.handlePick(name))return;if(muscleActions?.pick(name))return;if(explorerStep){const entry=explorerEntries.find(e=>e.pin.target===name&&!e.pin.context);if(entry)openExplorer(entry);return;}const i=steps.findIndex(s=>s.pins.some(p=>p.target===name&&!p.context));if(i>=0)selectStep(i);},{signal:lifetime.signal});
 // Render only changed camera/material frames; damping and pulses still animate.
 // Idle study time keeps annotations responsive without redrawing the GPU scene.
 function frame(now){if(!running)return;frameId=requestAnimationFrame(frame);const motionChanged=motionViewer?.tick(now),moving=!!transition||!!extras?.animating||motionChanged;if(transition){let t=Math.min(1,(now-transition.start)/850);t=t*t*(3-2*t);camera.position.lerpVectors(transition.from,transition.to,t);controls.target.lerpVectors(transition.fromTarget,transition.target,t);if(t>=1)transition=null;}extras?.tick(now);vesselLab?.tick();lowerNerveLab?.tick();const changed=controls.update();if(renderDirty||changed||moving){renderer.render(scene,camera);renderDirty=false;}updatePins();}frameId=requestAnimationFrame(frame);
 const context=document.modelContext;if(context?.registerTool){const life={signal:lifetime.signal};Promise.resolve(context.registerTool({name:'navigate_anatomy_tour',description:'Show a numbered visual lecture step with anatomical callouts.',inputSchema:{type:'object',properties:{step:{type:'integer',minimum:1,maximum:steps.length}},required:['step'],additionalProperties:false},execute(input){if(!Number.isInteger(input?.step)||input.step<1||input.step>steps.length)throw Error('Invalid step');selectStep(input.step-1);return {step:state.step+1,title:current().title,labels:current().pins.map(p=>p.name)};}},{signal:life.signal})).catch(()=>{});}
}

$('labels').onchange=e=>{state.labels=e.target.checked;};$('isolate').onclick=()=>{state.isolated=!state.isolated;updateVisibility();};$('focus').onclick=focusStep;$('reset').onclick=()=>ready&&(explorerStep?openExplorer():selectStep(state.step));
for(const [id,factor]of [['zoomIn',.8],['zoomOut',1.25]])$(id).onclick=()=>{if(!ready)return;transition=null;const v=camera.position.clone().sub(controls.target);v.setLength(THREE.MathUtils.clamp(v.length()*factor,controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(v);controls.update();};
for(const [id,back]of [['front',false],['back',true]])$(id).onclick=()=>{if(!ready)return;animateCamera(controls.target.clone(),camera.position.distanceTo(controls.target),back);$('front').classList.toggle('active',!back);$('back').classList.toggle('active',back);};
$('body').onclick=()=>{if(!ready)return;state.bones=true;$('bones').checked=true;updateVisibility();animateCamera(new THREE.Vector3(0,.85,0),3);};$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('viewport').requestFullscreen();}catch{}};
$('next').onclick=next;$('previous').onclick=previous;$('nextPin').onclick=()=>state.pin=(state.pin+1)%Math.max(1,pins.length);$('tour').onclick=()=>steps.length&&selectStep(0);$('showSlide').onclick=showSlide;$('expandDiagram').onclick=showSlide;$('credits').onclick=()=>$('creditsDialog').showModal();document.querySelectorAll('.close-dialog').forEach(b=>b.onclick=()=>b.closest('dialog').close());
document.addEventListener('keydown',e=>{if(extras?.quizActive)return;if(document.querySelector('dialog[open]')||/INPUT|BUTTON|SELECT|TEXTAREA/.test(document.activeElement?.tagName))return;if(e.key==='ArrowRight'){e.preventDefault();next();}if(e.key==='ArrowLeft'){e.preventDefault();previous();}},{signal:lifetime.signal});
$('slideDialog').addEventListener('close',()=>$('slideContent').replaceChildren(),{signal:lifetime.signal});
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
function setupLowerControls(){
 if(isLowerBones||isVertebra){const group=el('div',null,'layer-control');group.innerHTML='<label for="ligaments"><span><i class="dot" style="background:#e6bc6b"></i>Ligaments & cartilage</span><input id="ligaments" type="checkbox" role="switch"></label><label class="layer-opacity-label" for="ligamentsOpacity">Ligaments opacity <output id="ligamentsValue">100%</output></label><input id="ligamentsOpacity" type="range" min="0" max="100" value="100" aria-label="Ligaments opacity">';document.querySelector('.layers').append(group);}
 const hud=el('div',null,'lower-scene-tools');const reset=el('button','Study view'),context=el('button','Add context'),bone=el('button','Bone only'),restore=el('button','All lesson structures');
 reset.onclick=()=>{if(!extras?.quizActive)selectStep(state.step);};context.onclick=()=>{if(extras?.quizActive)return;state.spotlight=null;state.lessonContext=!state.lessonContext;context.textContent=state.lessonContext?'Remove context':'Add context';updateVisibility();};bone.onclick=()=>{if(extras?.quizActive)return;state.spotlight=current().focus.find(n=>byName.get(n)?.userData.displayLayer==='bones')||((isLowerVessels||isLowerNerves)?(current().boneContext?.[0]||'Femur.r'):null);updateVisibility();focusStep();};restore.onclick=()=>{if(extras?.quizActive)return;state.spotlight=null;state.lessonContext=false;updateVisibility();focusStep();};hud.append(reset,context,bone,restore);$('viewport').append(hud);
}
$('lectureSelect').value=lectureId;document.body.classList.toggle('lecture-bones',isBones);$('lectureName').textContent=isLowerNerves?'Lower limb nerves · Lecture 10':isLowerVessels?'Lower limb vessels · Lecture 09':isLowerMuscles?'Lower limb muscles · Lecture 08':isLowerBones?'Lower limb bones & joints · Lecture 07':isBones?'Bones & joints · Lecture 01':isNerves?'Upper limb nerves · Lecture 05':isForearm?'Forearm & hand muscles · Lecture 03':isMuscles?'Shoulder & arm muscles · Lecture 02':'Upper limb vessels · Lecture 04';$('lectureSelect').onchange=e=>{if(e.target.value!==lectureId)(()=>{lifetime.dispose();location.assign('/?lecture='+resolveLecture('?lecture='+e.target.value));})();};if(isBones&&!isLower){$('lectureSource').textContent='Upper Limb Bones and Joints — Dr. Yasser Al Harbi. Highlighted lecture points and original diagrams; colored bone regions are educational approximations on the supplied model.';}
if(isMuscles&&!isLowerMuscles){document.body.classList.add('lecture-muscles');$('anatomySearch').placeholder='Muscle or landmark…';$('lectureSource').textContent='Upper limb shoulder and arm muscles — supplied Lecture 2, PDF pages 1–13 (printed 13–25). Roots and abduction ranges follow the lecture. Muscle colors identify structures, not precise attachment footprints. Original diagrams show unmodeled details.';}
if(isForearm){document.body.classList.add('lecture-forearm');$('lectureSource').textContent='Upper limb forearm muscles — Dr Ibrahim Amr, supplied Lecture 3, PDF pages 1–15 (printed 26–40). Includes hand muscles. Colored intact meshes retain their original anatomical placement. Layer and nerve colors are teaching categories; mixed-innervation meshes are not subdivided into measured nerve territories. Lecture-specific summaries are retained; original pages show the source details.';}
if(isNerves){document.body.classList.add('lecture-nerves');$('anatomySearch').placeholder='Nerve, branch or injury…';$('lectureSource').textContent='Lecture 5 — Dr Ibrahim Amr, PDF pages 1–13 (printed 52–64). Source-based plexus, nerves and injury comparisons. Original model geometry is preserved. Circuit diagrams are schematic; skin territories are educational approximations, with original lecture figures available. Lateral/medial cords and some fine branches have no independent mesh. Injury tables are lecture summaries, not predictions at every lesion level.';}
if(isLowerBones){const note=document.createElement('p');note.innerHTML='Lecture 7 uses separate articular models for the labrum, menisci and major ligaments. Colored bone regions and landmark patches are teaching approximations. Structures without dedicated meshes remain explained in the original lecture figures. Visual reference: <a href="https://anatomy.app/encyclopedia/hip-joint" target="_blank" rel="noreferrer">Anatomy.app hip atlas</a>. Isolation and context controls follow the approach documented by <a href="https://support.visiblebody.com/hc/en-us/articles/360003152034-Accessing-detailed-information-on-any-structure" target="_blank" rel="noreferrer">Visible Body</a>.';document.querySelector('.credit-body').append(note);setupLowerControls();document.querySelector('.brand').setAttribute('aria-label','Lower Limb Atlas');document.body.classList.add('lecture-lower');document.title='Lower Limb · Lecture 7 | Aseel Atlas';document.querySelector('.view-heading .eyebrow').textContent='ANATOMY / RIGHT LOWER LIMB';document.querySelector('.brand > span[dir]').childNodes.forEach(n=>{if(n.nodeType===3)n.textContent=n.textContent.replace('UPPER LIMB','LOWER LIMB');});$('anatomySearch').placeholder='Bone, landmark or joint…';$('lectureSource').textContent='';}
if(isLowerMuscles){setupLowerControls();document.querySelector('.brand').setAttribute('aria-label','Lower Limb Atlas');document.body.classList.add('lecture-lower','lecture-lower-muscles','lecture-muscles');document.title='Lower Limb Muscles · Lecture 8 | Aseel Atlas';document.querySelector('.view-heading .eyebrow').textContent='ANATOMY / RIGHT LOWER LIMB';document.querySelector('.brand > span[dir]').childNodes.forEach(n=>{if(n.nodeType===3)n.textContent=n.textContent.replace('UPPER LIMB','LOWER LIMB');});$('anatomySearch').placeholder='Muscle, nerve or landmark…';$('lectureSource').textContent='Lower limb muscles — Dr Ibrahim Amr, supplied PDFs covering printed pages 19–43 (site reference pages 1–25). Teaching facts and diagrams come from these slides. The anatomical meshes preserve their source geometry and position; the two functional parts of adductor magnus share one mesh. Femoral triangle, sheath, adductor canal, popliteal fossa and retinacular order in the visual lab are marked schematics. Fascia, fat, lymph nodes and fine attachment footprints are explained by lecture diagrams rather than invented 3D structures. Sole-muscle origin and insertion are not supplied by the lecture.';}
if(isLowerVessels){setupLowerControls();document.querySelector('.brand').setAttribute('aria-label','Lower Limb Atlas');document.body.classList.add('lecture-lower','lecture-vessels');document.title='Lower Limb Vessels · Lecture 9 | Aseel Atlas';document.querySelector('.view-heading .eyebrow').textContent='ANATOMY / RIGHT LOWER LIMB';document.querySelector('.brand > span[dir]').childNodes.forEach(n=>{if(n.nodeType===3)n.textContent=n.textContent.replace('UPPER LIMB','LOWER LIMB');});$('anatomySearch').placeholder='Vessel, branch or relation…';$('lectureSource').textContent='Lower limb vessels — Dr Ibrahim Amr, supplied Lecture 9, PDF pages 1–12 (printed 44–55). All teaching facts and reference figures come from the supplied lecture. Original vessel meshes retain their source position. Trace mode advances through named vessels and landmarks; it does not simulate flow speed. Fine unmodeled arteries, perforators, lymph nodes and sympathetic pathways use clearly marked lecture diagrams or schematics. The deep plantar mesh represents the penetrating continuation of dorsalis pedis.';const note=document.createElement('p');note.innerHTML='Presentation approach: linked 3D anatomy and schematic connections, with consistent color cues. Design reading: <a href="https://www.nature.com/articles/s41598-023-35046-2" target="_blank" rel="noreferrer">Colour-coding and anatomy learning</a> and <a href="https://link.springer.com/article/10.1007/s00423-024-03463-0" target="_blank" rel="noreferrer">Vascular anatomy teaching pilot study</a>. These inform the interface, not additional examinable content.';document.querySelector('.credit-body').append(note);}
if(isLowerNerves){setupLowerControls();document.querySelector('.brand').setAttribute('aria-label','Lower Limb Atlas');document.body.classList.add('lecture-lower','lecture-lower-nerves');document.title='Lower Limb Nerves · Lecture 10 | Aseel Atlas';document.querySelector('.view-heading .eyebrow').textContent='ANATOMY / RIGHT LOWER LIMB';document.querySelector('.brand > span[dir]').childNodes.forEach(n=>{if(n.nodeType===3)n.textContent=n.textContent.replace('UPPER LIMB','LOWER LIMB');});$('anatomySearch').placeholder='Nerve, skin territory or injury…';$('lectureSource').textContent='Lower limb nerves — Dr Ibrahim Amr, supplied Lecture 10, PDF pages 1–14 (printed 56–69). All teaching facts and clinical summaries come from this lecture. Original nerve meshes preserve their source geometry and location. Peroneal is the lecture term; fibular is the model alias. Plexus circuits are connection schematics. Fine branches with no dedicated mesh use dotted context callouts and original figures. Adductor magnus and lumbricals have shared meshes; the stated part, rather than an invented boundary, defines their nerve supply. Skin maps and injury posture illustrations come from the supplied slides; the skeleton stays in its source pose.';const note=document.createElement('p');note.innerHTML='Presentation design links nerve course, muscular targets, skin territories and lesion findings. Design references: <a href="https://www.elsevier.com/products/complete-anatomy" target="_blank" rel="noreferrer">Complete Anatomy</a> and <a href="https://link.springer.com/article/10.1186/s12909-026-09525-9" target="_blank" rel="noreferrer">Interactive anatomy and clinical reasoning study</a>. They inform the learning interface, not additional examinable facts.';document.querySelector('.credit-body').append(note);}
if(isVertebra){
 const group=el('div',null,'layer-control');group.innerHTML='<label for="ligaments"><span><i class="dot" style="background:#e6bc6b"></i>Ligaments & discs</span><input id="ligaments" type="checkbox" role="switch"></label><label class="layer-opacity-label" for="ligamentsOpacity">Ligaments opacity <output id="ligamentsValue">100%</output></label><input id="ligamentsOpacity" type="range" min="0" max="100" value="100" aria-label="Ligaments opacity">';document.querySelector('.layers').append(group);
 document.body.classList.add('lecture-vertebra');document.querySelector('.brand').setAttribute('aria-label','Vertebra Atlas');document.querySelector('.brand > span[dir]').childNodes.forEach(n=>{if(n.nodeType===3)n.textContent=n.textContent.replace('UPPER LIMB','VERTEBRA');});document.querySelector('.view-heading .eyebrow').textContent='ANATOMY / VERTEBRA & BACK';$('lectureName').textContent={12:'Vertebral column · Lecture 12',13:'Vertebral muscles · Lecture 13',14:'Spinal cord & nerves · Lecture 14'}[lectureId];document.title=$('lectureName').textContent+' | Aseel Atlas';$('sceneTitle').textContent='Preparing '+$('lectureName').textContent;$('sceneSubtitle').textContent='Loading the selected anatomy…';$('anatomySearch').placeholder='Vertebra, part, muscle or nerve…';$('lectureSource').textContent='Supplied Lectures 12–14 — Dr Ibrahim Amr. Teaching statements and figures follow these PDFs, including their stated ages, levels, table labels and root values. Original vertebrae are individually modeled. Colored bone parts are broad educational regions, not measured segmentation. Shape comparison temporarily separates three intact bones at their original scale. Section view clips the original meshes; it does not invent internal structures. Craniovertebral membranes, some fine branches, pia and arachnoid lack independent meshes and are explained with original source figures.';const note=el('p');note.innerHTML='Presentation references: <a href="https://anatomy.app/encyclopedia/cervical-vertebrae" target="_blank" rel="noreferrer">Anatomy.app cervical vertebra atlas</a> and <a href="https://support.visiblebody.com/hc/en-us/articles/360003152034-Accessing-detailed-information-on-any-structure" target="_blank" rel="noreferrer">Visible Body isolation and context controls</a>. These inform how anatomy is presented; the supplied lectures remain the source of study facts.';document.querySelector('.credit-body').append(note);
}
function openVertebraStudy(step){
 if(extras?.quizActive||!ready)return;explorerStep=step;state.pin=0;state.spotlight=null;state.isolated=false;state.lessonContext=false;state.muscleOpacity=0;selected=meshes.filter(m=>step.focus.includes(m.userData.anatomyName));vertebraTeaching.layout(step);vertebraLab.update(step);$('explorerPanel').hidden=true;$('tourDiagram').hidden=true;$('sceneTitle').textContent=step.title;$('sceneSubtitle').textContent='Vertebra study';$('stepTitle').textContent=step.title;$('stepCaption').textContent=step.caption;$('stepChapter').textContent='Vertebra · original model';$('stepCount').textContent='Inspection';$('previous').disabled=false;$('next').textContent='Return to tour';buildPins();updateVisibility();focusStep();
}


function createActionViewer(){
 const textIds=['sceneTitle','sceneSubtitle','stepTitle','stepCaption','stepChapter','stepCount','next'];
 return createMuscleMotionViewer({scene,byName,meshes,camera,controls,host,resize,inspect:openMuscleActionStudy,
  dirty:()=>renderDirty=true,cancelCamera:()=>transition=null,
  hideLabels:()=>{state.labels=false;updatePins();},
  capture:()=>({state:{...state},explorer:explorerStep,selected:[...selected],position:camera.position.clone(),quaternion:camera.quaternion.clone(),up:camera.up.clone(),target:controls.target.clone(),enabled:controls.enabled,
   memory:muscleStudy?.capture(),texts:Object.fromEntries(textIds.map(id=>[id,$(id).textContent])),diagramHidden:$('tourDiagram').hidden,explorerHidden:$('explorerPanel').hidden,previousDisabled:$('previous').disabled}),
  restore:saved=>{if(!saved)return;Object.assign(state,saved.state);explorerStep=saved.explorer;selected=saved.selected;transition=null;camera.position.copy(saved.position);camera.quaternion.copy(saved.quaternion);camera.up.copy(saved.up);controls.target.copy(saved.target);controls.enabled=saved.enabled;
   if(lifetime.disposed)return;
   for(const [id,text]of Object.entries(saved.texts))$(id).textContent=text;$('tourDiagram').hidden=saved.diagramHidden;$('explorerPanel').hidden=saved.explorerHidden;$('previous').disabled=saved.previousDisabled;
   showReferenceDiagram(current());muscleStudy?.update(current());muscleStudy?.restore(saved.memory);lowerMuscleLab?.update(current());vesselLab?.update(current());lowerNerveLab?.update(current());muscleActions?.update(current());buildPins();updateVisibility();controls.update();}
 });
}

function openMuscleActionStudy(muscle,action){
 if(!ready||extras?.quizActive)return;
 extras?.cancelAnimation();transition=null;
 const bones=meshes.filter(m=>m.userData.displayLayer==='bones').map(m=>m.userData.anatomyName);
 // The active lecture retains ownership of all meshes. Inspection creates no
 // geometry outside playback, and does not override a manual
 // layer-off preference. Head/part records may intentionally share a mesh.
 explorerStep={topic:'muscle-action-inspection',profileId:muscle.profile_id,title:muscle.name_en,focus:muscle.mesh_names,
  muscleFocus:muscle.mesh_names,context:bones,boneContext:bones,pages:[muscle.lecture_reference.page],
  sourceReferences:muscle.source_references||[{src:muscle.lecture_reference.src,label:`Lecture ${muscle.lecture_reference.lecture_id} · reference page ${muscle.lecture_reference.page}`}],
  studyView:true,view:muscle.view,pins:muscle.mesh_names.map((target,i)=>({target,name:muscle.mesh_components?.[target]?.label||(muscle.name_en+(muscle.mesh_names.length>1?` · modeled head ${i+1}`:'')),text:action.joint+': '+action.description,color:muscle.mesh_components?.[target]?.color||muscle.color,at:.5}))};
 state.pin=0;state.isolated=false;state.lessonContext=false;state.spotlight=null;state.muscleOpacity=1;state.bones=true;
 selected=meshes.filter(m=>muscle.mesh_names.includes(m.userData.anatomyName));
 $('explorerPanel').hidden=true;$('tourDiagram').hidden=true;$('sceneTitle').textContent=muscle.name_en;
 $('sceneSubtitle').textContent='Muscle action & function';$('stepTitle').textContent=action.movement+' · '+action.joint;
 $('stepCaption').textContent=layerControls?.isDisabledManually('muscles')?'Muscles are hidden in Body layers. Enable that layer to see this muscle.':(muscle.action_section.notes[0]||action.description);
 $('stepChapter').textContent='Reference-checked muscle function · original 3D position';$('stepCount').textContent='Action inspection';$('previous').disabled=false;$('next').textContent='Return to lecture →';
 lowerMuscleLab?.update(explorerStep);vesselLab?.update(explorerStep);lowerNerveLab?.update(explorerStep);
 muscleStudy?.update(explorerStep);muscleActions?.update(explorerStep);buildPins();updateVisibility();focusStep();
}
document.title=$('lectureName').textContent+' | Aseel Atlas';$('sceneTitle').textContent='Preparing '+$('lectureName').textContent;$('sceneSubtitle').textContent='Loading the selected anatomy…';
initialize().catch(err=>{if(lifetime.disposed||err.name==='AbortError')return;lifetime.dispose();console.error(err);$('loading').replaceChildren(el('b','Unable to load the tour'),el('small','Try again in a browser that supports WebGL.'));const b=el('button','Try again');b.onclick=()=>location.reload();$('loading').append(b);});

let explorerEntries=[];
function setupExplorer(){
 const chapter=el('button',null,'topic');chapter.dataset.topic='explorer';chapter.append(el('span',String(topics.length+1),'num'),el('span','Full Lecture Explorer'));chapter.onclick=()=>openExplorer();$('topics').append(chapter);
 const panel=$('explorerPanel');panel.hidden=true;panel.append(el('h2','All lecture structures'));
 const all=el('button','Show everything','outline');all.onclick=()=>openExplorer();panel.append(all);
 for(const topic of topics){const group=el('details');group.append(el('summary',topic.title));
 for(const step of steps.filter(s=>s.topic===topic.id)){for(const pin of step.pins){const entry={step,pin};explorerEntries.push(entry);const b=el('button',pin.name,'explorer-entry');b.onclick=()=>openExplorer(entry);b.title=pin.text;group.append(b);}}
 panel.append(group);}
 $('topics').after(panel);
}
function openExplorer(entry){
 if(extras?.quizActive)return;
 if(!ready)return;extras?.cancelAnimation();
 const allTargets=[...new Set(steps.flatMap(s=>[...s.focus,...s.pins.filter(p=>!p.context).map(p=>p.target)]))];
 explorerStep=entry?{...entry.step,focus:isBones?entry.step.focus:entry.pin.context?entry.step.focus:(entry.step.focusGroups?.[entry.pin.target]||[entry.pin.target]),pins:entry.pin.segment!=null?entry.step.pins:[entry.pin],context:[],title:entry.pin.name}:{topic:'explorer',title:'Full Lecture Explorer',focus:allTargets,pins:[],pages:[...new Set(steps.flatMap(s=>s.pages))].sort((a,b)=>a-b),referencePages:[...new Set(steps.flatMap(s=>s.referencePages||[]))]};
 muscleActions?.update(explorerStep);vertebraTeaching?.layout(explorerStep);vertebraLab?.update(explorerStep);state.pin=0;state.isolated=!!entry;state.lessonContext=false;state.spotlight=null;nerveLab?.update(explorerStep);lowerLab?.update(explorerStep);lowerMuscleLab?.update(explorerStep);vesselLab?.update(explorerStep);lowerNerveLab?.update(explorerStep);if(isMuscles){state.muscleOpacity=1;$('muscleOpacity').value=100;$('muscleValue').value='100%';muscleStudy?.update(explorerStep);forearmLab?.update(explorerStep);}
 selected=meshes.filter(m=>explorerStep.focus.includes(m.userData.anatomyName));
 $('explorerPanel').hidden=false;
 for(const key of ['arteries','veins','bones','muscles','nerves']){state[key]=key==='bones';$(key).checked=state[key];}if(isVertebra){state.muscleOpacity=explorerStep.muscleFocus?.length||lectureId==='13'?1:0;}
 document.querySelectorAll('.topic').forEach(b=>{const active=b.dataset.topic==='explorer';b.classList.toggle('active',active);b.setAttribute('aria-current',active?'step':'false');});
 $('sceneTitle').textContent=entry?entry.pin.name:'Full Lecture Explorer';$('sceneSubtitle').textContent=`Chapter ${topics.length+1} · All lecture structures`;
 $('stepTitle').textContent=entry?entry.pin.name:'Explore the complete lecture';$('stepCaption').textContent=entry?(entry.pin.context?'This detail has no separate 3D mesh. Its parent structure and lecture reference are shown.':entry.pin.text):'Click a structure on the model or choose an item in Full Lecture Explorer to view it separately. Select Show everything to restore the full view.';
 $('stepChapter').textContent=`${topics.length+1} · Full Lecture Explorer`;$('stepCount').textContent='Complete lecture';$('tourProgress').max=steps.length+1;$('tourProgress').value=steps.length+1;$('previous').disabled=false;$('next').textContent='Restart tour ↺';
 $('tourDiagram').hidden=isLower||isVertebra||!explorerStep.diagram;showReferenceDiagram(explorerStep);
 buildPins();updateVisibility();focusStep();
}
