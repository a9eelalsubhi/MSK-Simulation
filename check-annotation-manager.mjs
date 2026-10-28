import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from './public/vendor/three.module.js';
import {overlaps} from './public/annotation-layout.js';
class Element {
  constructor(rect={left:0,top:0,width:1000,height:820}){this.rect=rect;this.hidden=false;this.children=[];this.dataset={};this.attributes={};this.style={setProperty:(k,v)=>this.style[k]=v};}
  get clientWidth(){return this.rect.width;}get clientHeight(){return this.card?this.offsetHeight:this.rect.height;}
  get offsetHeight(){return this.card?Math.min(112,Number.parseFloat(this.style['max-height']||'112')):this.rect.height;}
  get scrollHeight(){return this.card?112:this.rect.height;}
  getBoundingClientRect(){return this.rect;}
  getClientRects(){return this.hidden?[]:[this.rect];}
  setAttribute(k,v){this.attributes[k]=v;}contains(e){return e===this||this.children.includes(e);}replaceChildren(){this.children=[];}
}
class Observer {
  static instances=[];
  constructor(callback){this.callback=callback;this.observed=new Set();this.disconnected=false;Observer.instances.push(this);}
  observe(e){this.observed.add(e);}unobserve(e){this.observed.delete(e);}disconnect(){this.disconnected=true;this.observed.clear();}
}
globalThis.ResizeObserver=Observer;globalThis.MutationObserver=Observer;
globalThis.window=new EventTarget();window.visualViewport=new EventTarget();globalThis.document=new EventTarget();
const source=(await readFile(new URL('./public/annotation-manager.js',import.meta.url),'utf8'))
  .replace("'three'",JSON.stringify(new URL('./public/vendor/three.module.js',import.meta.url).href))
  .replace(/'\.\/annotation-layout\.js[^']*'/,JSON.stringify(new URL('./public/annotation-layout.js',import.meta.url).href));
const {createAnnotationManager}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const viewport=new Element(),overlay=new Element(),svg=new Element(),canvas=new Element();
const heading=new Element({left:12,top:12,width:300,height:80}),hud=new Element({left:760,top:80,width:228,height:62}),rail=new Element({left:150,top:650,width:700,height:158});
const obstacles=[heading,hud,rail];viewport.querySelectorAll=()=>obstacles;
const camera=new THREE.PerspectiveCamera(45,1000/820,.01,100);camera.position.set(0,0,5);camera.lookAt(0,0,0);camera.updateMatrixWorld();
const state={labels:true,pin:0};let paging=false;
function pin(index){const mesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());mesh.position.set((index-1)*.9,.5-index*.5,0);mesh.updateMatrixWorld();const card=new Element();card.card=true;return {index,mesh,localPosition:new THREE.Vector3(),position:mesh.position.clone(),card,dot:new Element(),line:new Element()};}
let pins=[0,1,2].map(pin);overlay.children=pins.map(p=>p.card);
const manager=createAnnotationManager({viewport,canvas,overlay,svg,camera,controls:{target:new THREE.Vector3()},getPins:()=>pins,getState:()=>state,onPaging:v=>paging=v});manager.setFocus(new THREE.Vector3());manager.reset();manager.update();
function verify(){const visible=pins.filter(p=>!p.card.hidden);assert(visible.length>0);for(const p of visible){const box={left:Number.parseFloat(p.card.style.left),top:Number.parseFloat(p.card.style.top),width:Number.parseFloat(p.card.style.width),height:p.card.offsetHeight};assert(!obstacles.some(o=>overlaps(box,o.rect)),JSON.stringify(box));assert.equal(Number(p.line.attributes.x2),Number.parseFloat(p.dot.style.left));assert.equal(Number(p.line.attributes.y2),Number.parseFloat(p.dot.style.top));}return visible;}
verify();camera.position.set(5,0,0);camera.lookAt(0,0,0);camera.updateMatrixWorld();manager.update();verify();
// A late source-image load can enlarge an obstacle without resizing the canvas.
const sourceImage=new Element({left:12,top:160,width:220,height:320});obstacles.push(sourceImage);Observer.instances.find(o=>o.observed.has(viewport)).callback();manager.update();assert(Observer.instances.some(o=>o.observed.has(sourceImage)));verify();
sourceImage.rect.height=400;Observer.instances.find(o=>o.observed.has(sourceImage)).callback();manager.update();verify();
state.labels=false;manager.update();assert(pins.every(p=>p.card.hidden&&p.dot.hidden));state.labels=true;manager.update();verify();
const old=pins[0].card;pins=[pin(0)];overlay.children=[pins[0].card];manager.reset();assert(!Observer.instances.some(o=>o.observed.has(old)));manager.update();verify();
manager.dispose();assert(Observer.instances.every(o=>o.disconnected));
console.log('PASS: annotation integration, camera orbit, exact dot endpoints, asynchronous image resizing, label hiding/restoration, stale-card observation cleanup and disposal.');
