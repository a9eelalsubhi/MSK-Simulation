import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from './public/vendor/three.module.js';
import {resolveLecture,createLifetime} from './public/lecture-runtime.js';
import {projectAnchor,placeCards,overlaps,localRect,cardEdge} from './public/annotation-layout.js';
const threeURL=new URL('./public/vendor/three.module.js',import.meta.url).href;
const source=(await readFile(new URL('./public/mesh-resources.js',import.meta.url),'utf8')).replace("'three'",JSON.stringify(threeURL));
const {prepareAnatomyModel,disposeObjectTree,loadAnatomyModel}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
assert.equal(resolveLecture('?lecture=12'),'12');assert.equal(resolveLecture('?lecture=4'),'4');assert.equal(resolveLecture('?lecture=bogus'),'4');assert.equal(resolveLecture('?lecture=../5'),'4');
let calls=0;const life=createLifetime();life.own(()=>calls++);life.dispose();life.dispose();assert.equal(calls,1);assert(life.signal.aborted);life.own(()=>calls++);assert.equal(calls,2);
const parent=new THREE.Group();parent.position.set(2,3,4);parent.scale.set(2,3,4);
const geometry=new THREE.BoxGeometry(),material=new THREE.MeshStandardMaterial();let oldMaterial=0,oldGeometry=0;
geometry.addEventListener('dispose',()=>oldGeometry++);material.addEventListener('dispose',()=>oldMaterial++);
const a=new THREE.Mesh(geometry,material),b=new THREE.Mesh(geometry,material);a.name='A';b.name='B';b.position.x=2;parent.add(a,b);parent.updateMatrixWorld(true);
const before=a.matrixWorld.clone();prepareAnatomyModel(parent,'muscular');assert(a.matrixWorld.equals(before));assert.notEqual(a.material,b.material);assert.notEqual(a.geometry,b.geometry);assert.equal(oldMaterial,1);assert.equal(oldGeometry,1);a.material.opacity=.2;assert.equal(b.material.opacity,1);
const invalidRoot=new THREE.Group(),validFirst=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial()),invalidLast=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());
const firstGeometry=validFirst.geometry,firstMaterial=validFirst.material;invalidLast.scale.x=0;invalidRoot.add(validFirst,invalidLast);
assert.throws(()=>prepareAnatomyModel(invalidRoot,'skeletal'),/Invalid mesh transform/);assert.equal(validFirst.geometry,firstGeometry);assert.equal(validFirst.material,firstMaterial);disposeObjectTree(invalidRoot);
let disposed=0;a.geometry.addEventListener('dispose',()=>disposed++);b.geometry.addEventListener('dispose',()=>disposed++);disposeObjectTree(parent);assert.equal(disposed,2);
const camera=new THREE.PerspectiveCamera(45,2,.01,100);camera.position.set(0,0,5);camera.lookAt(0,0,0);camera.updateMatrixWorld();
const scratch=new THREE.Vector3(),canvas={left:80,top:70,width:800,height:400},overlay={left:60,top:50,width:1000,height:600};
const p=projectAnchor(new THREE.Vector3(),camera,canvas,overlay,500,300,scratch);assert(p.visible);assert.equal(p.x,210);assert.equal(p.y,110);
assert(!projectAnchor(new THREE.Vector3(0,0,6),camera,canvas,overlay,500,300,scratch).visible);
assert(!projectAnchor(new THREE.Vector3(100,0,0),camera,canvas,overlay,500,300,scratch).visible);
assert.deepEqual(localRect(canvas,overlay,500,300),{left:10,top:10,width:400,height:200});
const mesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());parent.add(mesh);parent.updateMatrixWorld(true);const local=new THREE.Vector3(.5,0,0),world=mesh.localToWorld(local.clone());assert(world.distanceTo(local)>.1);assert(mesh.worldToLocal(world.clone()).distanceTo(local)<1e-9);
for(const width of [390,650,760,1000,1500])for(const height of [820,1000,1200]){
  const obstacles=[{left:12,top:12,width:250,height:90},{left:width-260,top:110,width:240,height:70},{left:18,top:height-180,width:width-36,height:162}],focus={left:width*.38,top:height*.38,width:width*.25,height:height*.2};
  const cards=[0,1,2,3].map(id=>({id,width:Math.min(230,width-24),height:100+id*25,y:250+id*80}));
  const boxes=placeCards(cards,width,height,obstacles,focus,{compact:width<760});
  if(boxes){for(const box of boxes){assert(box.left>=0&&box.left+box.width<=width);assert(box.top>=0&&box.top+box.height<=height);assert(!obstacles.some(o=>overlaps(box,o,12)));assert(!overlaps(box,focus,12));}for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)assert(!overlaps(boxes[i],boxes[j],12));}
  else assert.equal(boxes,null); // Explicit paging fallback; never overlapping rectangles.
}
assert.deepEqual(cardEdge({x:10,y:50},{left:40,top:20,width:100,height:100}),{x:40,y:50});
const abort=new AbortController();let lateDisposed=0;const late=new THREE.Group(),lateMesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());late.add(lateMesh);lateMesh.geometry.addEventListener('dispose',()=>lateDisposed++);
globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});
await assert.rejects(loadAnatomyModel({parseAsync:async()=>{abort.abort();return {scene:late};}},'/models/test.glb',abort.signal),{name:'AbortError'});assert.equal(lateDisposed,1);
console.log('PASS: routing, idempotent teardown, cancelled late loads, shared resource ownership, nested transforms, CSS-scaled projection, behind-camera clipping, safe label packing and exact leader endpoints.');
