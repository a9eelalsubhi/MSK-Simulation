import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createMuscleStudy} from './public/muscle-study.js';
class El extends EventTarget{constructor(){super();this.children=[];this.attributes={};this.style={setProperty(){}};}append(...e){this.children.push(...e)}replaceChildren(){this.children=[]}setAttribute(k,v){this.attributes[k]=v}getAttribute(k){return this.attributes[k]}before(e){this.panel=e}remove(){this.removed=true}}
const layers=new El();globalThis.document={createElement:()=>new El(),querySelector:()=>layers};
const data=JSON.parse(await readFile(new URL('./public/lectures/l2/tour.json',import.meta.url)));let selected;const lab=createMuscleStudy({data,select:i=>selected=i});const panel=layers.panel,chooser=panel.children[1].children[0],cards=panel.children[2],slider=panel.children[4].children[0];
assert.equal(chooser.children.length,26);assert.equal(cards.children.length,4);const card=cards.children[0];card.onclick();assert.equal(card.getAttribute('aria-expanded'),'true');assert(card.textContent.includes('Supraspinous'));card.onclick();assert.equal(card.getAttribute('aria-expanded'),'false');
chooser.value='m12';chooser.dispatchEvent(new Event('change'));assert.equal(data.steps[selected].profileId,'m12');lab.update(data.steps[selected]);assert.equal(chooser.value,'m12');assert.equal(cards.children.length,4);
for(let stage=0;stage<3;stage++){slider.value=String(stage);slider.dispatchEvent(new Event('input'));assert.equal(data.steps[selected].abductionStage,stage);lab.update(data.steps[selected]);assert.equal(slider.getAttribute('aria-valuetext'),data.steps[selected].title)}
cards.children[0].onclick();const saved=lab.capture();lab.update(data.steps.find(s=>s.profileId&&s.profileId!==saved.profileId));lab.restore(saved);assert.equal(chooser.value,saved.profileId);assert.equal(cards.children[0].getAttribute('aria-expanded'),'true');
lab.dispose();assert(panel.removed);console.log('PASS: muscle profile navigation, OINA reveal/reset, three stage jumps and module disposal');
