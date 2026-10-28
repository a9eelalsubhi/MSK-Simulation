import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createVesselLab} from './public/vessel-lab.js';
class El{
 constructor(tag){this.tag=tag;this.children=[];this.events={};this.attributes={};this.style={setProperty(){}};this.classList={toggle(){}};}
 append(...e){this.children.push(...e)} replaceChildren(...e){this.children=[...e]} setAttribute(k,v){this.attributes[k]=v}
 before(e){this.panel=e} remove(){this.removed=true} showModal(){this.open=true} close(){this.open=false} addEventListener(t,f){this.events[t]=f}
}
const topics=new El('nav'),viewport=new El('section'),body=new El('body'),events={};
globalThis.document={createElement:t=>new El(t),getElementById:id=>id==='topics'?topics:viewport,body,addEventListener:(t,f)=>events[t]=f};
const data=JSON.parse(fs.readFileSync('public/lectures/l9/tour.json'));
let selected=-1,quiz=false,lab;lab=createVesselLab({data,select:i=>{selected=i;lab.update(data.steps[i])},isQuiz:()=>quiz});
const panel=topics.panel,dialog=body.children[0],tabs=dialog.children[1],content=dialog.children[2],tracer=viewport.children[0],inset=viewport.children[1];
const walk=e=>[e,...e.children.flatMap(walk)],clickText=(node,text)=>{const b=walk(node).find(e=>e.tag==='button'&&e.textContent===text);assert(b,`Missing button ${text}`);b.events.click();};
lab.update(data.steps[0]);panel.children[2].events.click();assert(dialog.open);assert.equal(tabs.children.length,7);
for(const tab of tabs.children){tab.events.click();assert(content.children.length>=3);const jumps=walk(content).filter(e=>e.tag==='button'&&e.textContent==='Show on model');if(jumps.length){jumps[0].events.click();assert(selected>=0);assert.equal(dialog.open,false);panel.children[2].events.click();}}
tabs.children[1].events.click();clickText(content,'Adductor canal');assert(walk(content).some(e=>e.innerHTML?.includes('vein lateral')));clickText(content,'Show this level on the model');assert.equal(data.steps[selected].id,'femoral-canal');assert(!inset.hidden);
panel.children[3].events.click();const routeCards=walk(content).filter(e=>e.className?.startsWith('vessel-route-card'));
assert.equal(routeCards.length,4);routeCards[2].events.click();assert(!tracer.hidden);assert.equal(data.steps[selected].id,'gsv-start');
clickText(tracer,'Next vessel');assert.equal(data.steps[selected].id,'gsv-route');clickText(tracer,'Next vessel');assert.equal(data.steps[selected].id,'gsv-end');clickText(tracer,'Restart route');assert.equal(data.steps[selected].id,'gsv-start');
lab.update(data.steps[0]);assert(tracer.hidden,'External chapter change ends trace');
quiz=true;dialog.close();panel.children[2].events.click();assert.equal(dialog.open,false,'Quiz blocks lab');lab.dispose();assert(panel.removed&&dialog.removed&&tracer.removed&&inset.removed);
console.log('PASS: 7 maps, relation switching, real step jumps, 4 routes, trace navigation, quiz guard and disposal.');
