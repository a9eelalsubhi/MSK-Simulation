// Lecture-scoped learning controls. Geometry never moves during layer or action selection.
export function createForearmLab({data,select,state,getCurrent,refresh}){
 const life=new AbortController(),on=(el,type,fn)=>el.addEventListener(type,fn,{signal:life.signal});
 const make=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
 const panel=make('section');panel.className='forearm-lab';panel.setAttribute('aria-label','Forearm discovery lab');panel.append(make('h2','Forearm discovery lab'));
 const intro=make('p','Reveal a layer, follow an action, or recolor by nerve.');intro.className='lab-intro';panel.append(intro);
 function selectField(title,items){const label=make('label',title),input=make('select');for(const [value,text] of items){const o=make('option',text);o.value=value;input.append(o);}label.append(input);panel.append(label);return input;}
 let mode='muscle';const modeInput=selectField('Color by',[['muscle','Muscle identity'],['layer','Muscle layer'],['nerve','Nerve supply']]);
 const legend=make('div');legend.className='forearm-legend';legend.setAttribute('aria-live','polite');panel.append(legend);
 const layerInput=selectField('Layer reveal',[['','Choose a layer…'],...data.steps.filter(s=>Number.isInteger(s.layerStage)).map(s=>[String(s.layerStage),s.title])]);
 const ghostLabel=make('label','Ghost overlying layers'),ghost=make('input');ghost.type='checkbox';ghost.checked=true;state.ghostOverlay=true;ghostLabel.append(ghost);panel.append(ghostLabel);
 const actionInput=selectField('Action spotlight',[['','Choose an action…'],...Object.entries(data.actionLabels)]);
 const roster=make('div');roster.className='forearm-roster';roster.setAttribute('aria-label','Visible muscle directory');panel.append(roster);
 const detail=make('p');detail.className='lab-detail';detail.setAttribute('aria-live','polite');panel.append(detail);
 const challenge=make('details');challenge.append(make('summary','New: insertion challenge'));const question=make('p'),options=make('div'),feedback=make('p'),next=make('button','Next challenge');options.className='insertion-options';feedback.setAttribute('role','status');challenge.append(question,options,feedback,next);panel.append(challenge);
 const pool=data.muscleProfiles.filter(p=>!p.insertion.startsWith('Not specified'));let round=0;
 function newChallenge(){const p=pool[round++%pool.length];question.textContent='Where does '+p.name+' insert?';feedback.textContent='';options.replaceChildren();const wrong=[...new Set(pool.filter(x=>x.insertion!==p.insertion).map(x=>x.insertion))];const choices=[p.insertion,wrong[(round*3)%wrong.length],wrong[(round*3+1)%wrong.length]];choices.sort((a,b)=>a.localeCompare(b));for(const answer of choices){const b=make('button',answer);b.onclick=()=>{const correct=answer===p.insertion;feedback.textContent=(correct?'Correct. ':'Review: ')+p.name+' → '+p.insertion+'.';feedback.dataset.correct=String(correct);for(const child of options.children)child.disabled=true;select(data.steps.findIndex(s=>s.profileId===p.id));};options.append(b);}}
 on(next,'click',newChallenge);newChallenge();
 document.getElementById('topics').before(panel);
 function color(name,fallback){name=getCurrent()?.insertionOwners?.[name]||name;const map=mode==='layer'?data.layerColors:mode==='nerve'?data.nerveColors:data.muscleColors;return map[name]||fallback;}
 function legendRow(name,c){const line=make('div'),swatch=make('i');swatch.style.background=c;line.append(swatch,make('span',name));legend.append(line);}
 function update(step){
  layerInput.value=Number.isInteger(step.layerStage)?String(step.layerStage):'';actionInput.value=step.actionKey||'';
  const visible=data.muscleProfiles.filter(p=>p.targets.some(t=>step.focus.includes(t)));roster.replaceChildren();legend.replaceChildren();
  if(mode==='nerve')for(const [label,c] of Object.entries(data.nerveLegend))legendRow(label,c);
  else if(mode==='layer')for(const g of Object.values(data.groups))legendRow(g.label,g.color);
  for(const p of visible){const b=make('button',p.name);b.style.setProperty('--muscle-color',color(p.target));b.onclick=()=>select(data.steps.findIndex(s=>s.profileId===p.id));roster.append(b);}
  detail.textContent=mode==='nerve'?'Nerve groups follow the lecture. Pink means mixed supply: FDP and lumbricals are whole meshes, not mapped nerve territories.':mode==='layer'?'Color shows the lecture group. Names remain available so color is never the only cue.':'Each muscle keeps its identity color across tour steps and comparisons. Tap its name to isolate and study it.';
 }
 on(modeInput,'change',()=>{mode=modeInput.value;update(getCurrent());refresh();});
 on(layerInput,'change',()=>{if(layerInput.value!=='')select(data.steps.findIndex(s=>s.layerStage===Number(layerInput.value)));});
 on(actionInput,'change',()=>{if(actionInput.value)select(data.steps.findIndex(s=>s.actionKey===actionInput.value));});
 on(ghost,'change',()=>{state.ghostOverlay=ghost.checked;refresh();});
 return {update,color,dispose(){life.abort();panel.remove();}};
}
