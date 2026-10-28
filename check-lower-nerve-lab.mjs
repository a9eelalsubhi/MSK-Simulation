import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createLowerNerveLab,PSOAS_EXITS,SACRAL_BRANCHES} from './public/lower-nerve-lab.js';
class El{
 constructor(tag){this.tag=tag;this.children=[];this.events={};this.attributes={};this.style={setProperty(){}};this.classList={toggle(){}};this.value='';}
 get lastChild(){return this.children.at(-1)}
 append(...e){this.children.push(...e)}replaceChildren(...e){this.children=[...e]}setAttribute(k,v){this.attributes[k]=v}
 before(e){this.panel=e}remove(){this.removed=true}showModal(){this.open=true}close(){this.open=false}addEventListener(t,f){this.events[t]=f}
}
const topics=new El('nav'),viewport=new El('section'),body=new El('body'),events={};
globalThis.document={createElement:t=>new El(t),getElementById:id=>id==='topics'?topics:viewport,body,addEventListener:(t,f)=>events[t]=f};
let interval=null;globalThis.setInterval=fn=>(interval=fn,1);globalThis.clearInterval=()=>interval=null;
const data=JSON.parse(fs.readFileSync('public/lectures/l10/tour.json'));
let selected=-1,quiz=false,lab;lab=createLowerNerveLab({data,select:i=>{selected=i;lab.update(data.steps[i])},isQuiz:()=>quiz});
const panel=topics.panel,dialog=body.children[0],tabs=dialog.children[1],content=dialog.children[2],inset=viewport.children[0],tracer=viewport.children[1];
const walk=e=>[e,...e.children.flatMap(walk)],find=(node,text)=>walk(node).find(e=>e.tag==='button'&&e.textContent===text),click=(node,text)=>{const b=find(node,text);assert(b,`Missing ${text}`);b.events.click();};
const open=()=>click(panel,'Open nerve maps');lab.update(data.steps[0]);open();assert.equal(tabs.children.length,6);
assert.deepEqual(Object.values(PSOAS_EXITS).map(x=>x.length),[1,4,2]);assert.equal(SACRAL_BRANCHES.length,9);
assert([...Object.values(PSOAS_EXITS).flat(),...SACRAL_BRANCHES].every(([,id])=>data.steps.some(s=>s.id===id)));
for(const tab of tabs.children){tab.events.click();assert(content.children.length>=3);}
click(tabs,'Injury comparison');click(content,'Reveal deficit');assert(walk(content).some(e=>e.textContent?.includes('EQUINOVARUS')));click(content,'Reveal deficit');assert(walk(content).some(e=>e.textContent?.includes('CALCANEOVALGUS')));click(content,'Show injured pathway');assert.equal(data.steps[selected].id,'peroneal-injury');assert.equal(dialog.open,false);
open();click(tabs,'Sensory territories');click(content,'Sole + toes');assert.equal(walk(content).filter(e=>e.className?.startsWith('ln-toe toe-')).length,5);
click(panel,'Trace a nerve route');const routes=walk(content).filter(e=>e.className==='ln-route');assert.equal(routes.length,5);routes[0].events.click();assert(!tracer.hidden);assert.equal(data.steps[selected].id,'femoral-psoas');click(tracer,'Next');assert.equal(data.steps[selected].id,'femoral-inguinal');click(tracer,'Auto trace');assert(interval);interval();assert.equal(data.steps[selected].id,'saphenous-thigh');quiz=true;lab.tick();assert.equal(interval,null,'Quiz pauses playback');quiz=false;lab.update(data.steps[0]);assert(tracer.hidden,'External chapter cancels route');
click(panel,'Trace a nerve route');walk(content).find(e=>e.className==='ln-route').events.click();click(tracer,'Auto trace');document.hidden=true;events.visibilitychange();assert.equal(interval,null,'Hidden page pauses playback');document.hidden=false;
quiz=true;dialog.close();open();assert.equal(dialog.open,false,'Quiz guards navigation');lab.dispose();assert.equal(interval,null);assert([panel,dialog,inset,tracer].every(e=>e.removed));
console.log('PASS: 6 maps, source-only psoas/sacral connections, 5-toe count, opposing injury recall, linked jumps, 5 routes, quiz/visibility pause, cancellation and disposal.');
