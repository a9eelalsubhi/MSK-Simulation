import assert from 'node:assert/strict';
import {createLayerControls,LAYER_IDS} from './public/layer-controls.js';
class El extends EventTarget{setAttribute(k,v){this[k]=v}}
const els=new Map();globalThis.document={getElementById:id=>{if(!els.has(id))els.set(id,new El());return els.get(id)}};
const meshes=LAYER_IDS.flatMap(layer=>[0,1].map(i=>({userData:{displayLayer:layer},visible:i===0,material:{opacity:1,transparent:false,depthWrite:true}})));
let quiz=false,isolated=false;let controller;const refresh=()=>{for(const m of meshes){m.visible=true;m.material.opacity=1;m.material.transparent=false;m.material.depthWrite=true}controller.apply()};
controller=createLayerControls({meshes,refresh,isQuiz:()=>quiz,isIsolated:()=>isolated,isSelected:m=>meshes.indexOf(m)%2===0});controller.apply();
const fire=(id,type)=>document.getElementById(id).dispatchEvent(new Event(type));
for(const [i,key] of LAYER_IDS.entries()){
 const toggle=document.getElementById(key),slider=document.getElementById(key==='muscles'?'muscleOpacity':key+'Opacity');toggle.checked=false;fire(key,'change');assert(meshes.filter(m=>m.userData.displayLayer===key).every(m=>!m.visible));
 toggle.checked=true;fire(key,'change');slider.value=String((i+1)*10);fire(key==='muscles'?'muscleOpacity':key+'Opacity','input');
 assert(meshes.filter(m=>m.userData.displayLayer===key).every(m=>m.visible&&m.material.opacity===(i+1)/10&&!m.material.depthWrite));
}
refresh();for(const [i,key]of LAYER_IDS.entries())assert(meshes.filter(m=>m.userData.displayLayer===key).every(m=>m.material.opacity===(i+1)/10));
document.getElementById('muscleOpacity').value='0';fire('muscleOpacity','input');assert(!meshes[6].visible);assert.equal(meshes[0].material.opacity,.1);
document.getElementById('muscleOpacity').value='100';fire('muscleOpacity','input');assert(meshes[6].visible&&meshes[6].material.depthWrite);
isolated=true;refresh();assert(meshes.every((m,i)=>m.visible===(i%2===0)));quiz=true;meshes[6].visible=true;document.getElementById('muscles').checked=false;fire('muscles','change');assert(meshes[6].visible);quiz=false;refresh();assert(!meshes[6].visible);
controller.dispose();console.log('PASS: all five layer toggles, independent opacity, zero/100%, navigation persistence, isolation, quiz bypass and cleanup');
// Packed assets can contain structures outside the active lecture. Enabling a
// layer must not bring these back, even when the baseline marked them visible.
const foreign={userData:{displayLayer:'bones'},visible:true,material:{opacity:1,transparent:false,depthWrite:true}};
const scoped=createLayerControls({meshes:[...meshes,foreign],refresh:()=>scoped.apply(),isEligible:m=>m!==foreign});
document.getElementById('bones').checked=true;fire('bones','change');assert(!foreign.visible);scoped.dispose();
