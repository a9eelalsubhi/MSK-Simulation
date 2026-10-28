export const PLEXUS_NODES=[
 ['C5','C5',60,55],['C6','C6',60,105],['C7','C7',60,175],['C8','C8',60,245],['T1','T1',60,295],
 ['upper','Upper',220,80],['middle','Middle',220,175],['lower','Lower',220,270],
 ['ua','Anterior',370,55],['up','Posterior',370,105],['ma','Anterior',370,150],['mp','Posterior',370,200],['la','Anterior',370,245],['lp','Posterior',370,295],
 ['lateral','Lateral',520,90],['posterior','Posterior',520,185],['medial','Medial',520,280],
 ['axillary','Axillary',715,45],['musculocutaneous','Musculocutaneous',715,105],['median','Median',715,165],['ulnar','Ulnar',715,235],['radial','Radial',715,305]
];
export const PLEXUS_EDGES=[['C5','upper'],['C6','upper'],['C7','middle'],['C8','lower'],['T1','lower'],['upper','ua'],['upper','up'],['middle','ma'],['middle','mp'],['lower','la'],['lower','lp'],['ua','lateral'],['ma','lateral'],['la','medial'],['up','posterior'],['mp','posterior'],['lp','posterior'],['lateral','musculocutaneous'],['lateral','median'],['medial','median'],['medial','ulnar'],['posterior','axillary'],['posterior','radial']];
export function plexusRoute(id){const nodes=new Set([id]);let changed=true;while(changed){changed=false;for(const [a,b]of PLEXUS_EDGES)if(nodes.has(b)&&!nodes.has(a)){nodes.add(a);changed=true;}}return nodes;}
export function createNerveLab({data,select}){
 const on=(e,t,f)=>{e['on'+t]=f;},el=(t,text)=>{const e=document.createElement(t);if(text)e.textContent=text;return e;};
 const panel=el('section');panel.className='nerve-lab';panel.append(el('h2','Nerve discovery lab'));
 const label=el('label','Choose a nerve'),chooser=el('select');for(const p of data.nerveProfiles){const o=el('option',p.name);o.value=p.id;chooser.append(o);}label.append(chooser);panel.append(label);
 const routeButtons=el('div');routeButtons.className='nerve-tabs';for(const aspect of ['origin','course','motor','sensory']){const b=el('button',aspect[0].toUpperCase()+aspect.slice(1));on(b,'click',()=>jump(chooser.value,aspect));routeButtons.append(b);}panel.append(routeButtons);
 const facts=el('p');facts.className='nerve-facts';panel.append(facts);
 const tools=el('div');tools.className='nerve-tools';for(const [id,title]of [['plexus','Plexus circuit map'],['sensory','Palm / dorsum map'],['injury','Compare injury levels']]){const b=el('button',title);on(b,'click',()=>open(id));tools.append(b);}panel.append(tools);document.getElementById('topics').before(panel);
 const dialog=el('dialog');dialog.className='nerve-dialog';const header=el('div');header.className='nerve-dialog-head';const heading=el('h2'),close=el('button','Close ×');header.append(heading,close);dialog.append(header);const body=el('div');body.className='nerve-dialog-body';dialog.append(body);document.body.append(dialog);on(close,'click',()=>dialog.close());
 function jump(id,aspect){const i=data.steps.findIndex(s=>s.nerveId===id&&s.nerveAspect===aspect);if(i>=0)select(i);}
 const svgEl=(t,attrs={})=>{const e=document.createElementNS('http://www.w3.org/2000/svg',t);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);return e;};
 function open(mode){body.replaceChildren();heading.textContent=mode==='plexus'?'Plexus circuit map':mode==='sensory'?'Hand sensory territories':'Compare injury levels';if(mode==='plexus')drawPlexus();else if(mode==='sensory')drawSensory('palmar');else drawInjury();if(!dialog.open)dialog.showModal();}
 function drawPlexus(){
  const note=el('p','Roots → trunks → divisions → cords → branches. Select a terminal nerve to trace its cord connections. This is a wiring diagram, not anatomical scale or individual fiber/root proportions.');body.append(note);
  const buttons=el('div');buttons.className='nerve-tabs';const svg=svgEl('svg',{viewBox:'0 0 840 350',role:'img','aria-label':'Brachial plexus roots, trunks, divisions, cords and terminal nerves'});const text=el('p');
  function render(id){svg.replaceChildren();const route=plexusRoute(id),profile=data.nerveProfiles.find(p=>p.id===id);const color=profile?.color||'#c89ef5';for(const [title,x]of [['Roots',60],['Trunks',220],['Divisions',370],['Cords',520],['Branches',715]]){const t=svgEl('text',{x,y:17,'text-anchor':'middle',fill:'#a9bed0','font-size':13});t.textContent=title;svg.append(t);}
   for(const[a,b]of PLEXUS_EDGES){const from=PLEXUS_NODES.find(n=>n[0]===a),to=PLEXUS_NODES.find(n=>n[0]===b);svg.append(svgEl('path',{d:`M${from[2]+35},${from[3]} C${(from[2]+to[2])/2},${from[3]} ${(from[2]+to[2])/2},${to[3]} ${to[2]-40},${to[3]}`,fill:'none',stroke:route.has(a)&&route.has(b)?color:'#304557','stroke-width':route.has(a)&&route.has(b)?3:1.5}));}
   for(const[id,title,x,y]of PLEXUS_NODES){svg.append(svgEl('rect',{x:x-(x===715?80:46),y:y-15,width:x===715?160:92,height:30,rx:7,fill:route.has(id)?'#223e50':'#132537',stroke:route.has(id)?color:'#3d5469'}));const t=svgEl('text',{x,y:y+5,'text-anchor':'middle',fill:route.has(id)?'#ffffff':'#b1c2d0','font-size':13});t.textContent=title;svg.append(t);}
   text.textContent=profile?profile.name+' — origin: '+profile.origin+'. Root values listed in lecture: '+profile.roots+'. Highlighting shows the parent cord connections, not exclusive root contributions.':'';
  }
  for(const p of data.nerveProfiles.filter(p=>p.cords.length)){const b=el('button',p.name);on(b,'click',()=>{render(p.id);chooser.value=p.id;jump(p.id,'origin');});buttons.append(b);}body.append(buttons,svg,text);render(chooser.value==='long'?'median':chooser.value);
 }
 function drawSensory(side){
  body.replaceChildren();const tabs=el('div');tabs.className='nerve-tabs';for(const s of ['palmar','dorsal']){const b=el('button',s==='palmar'?'Palm':'Dorsum');b.setAttribute('aria-pressed',String(side===s));on(b,'click',()=>drawSensory(s));tabs.append(b);}body.append(tabs);
  body.append(el('p','Simplified right-hand territory map. Lateral = thumb side; medial = little-finger side. Boundaries are schematic; use the original lecture page for the anatomical drawing.'));
  const svg=svgEl('svg',{viewBox:'0 0 420 370',role:'img','aria-label':side+' sensory map: median, ulnar and radial territories'}),median='#ff798c',ulnar='#57d9d1',radial='#79b4ff',lateral=side==='palmar'?median:radial;
  const g=svgEl('g',{transform:side==='dorsal'?'translate(420 0) scale(-1 1)':''});svg.append(g);
  g.append(svgEl('path',{d:'M125 165 Q102 165 103 200 L70 149 Q57 134 44 147 Q32 157 42 176 L97 265 Q107 300 128 314 L132 345 L282 345 L285 300 Q306 275 306 226 L306 161 Z',fill:lateral,stroke:'#dceaf1','stroke-width':2}));
  g.append(svgEl('path',{d:'M245 166 L306 161 L306 226 Q306 275 285 300 L282 345 L245 345 Z',fill:ulnar}));
  for(const[x,top,h,width,fill]of [[117,56,135,40,lateral],[165,30,160,41,lateral],[213,50,140,40,lateral],[261,88,108,39,ulnar]]){g.append(svgEl('rect',{x,y:top,width,height:h,rx:18,fill,stroke:'#dceaf1','stroke-width':2}));if(x===213)g.append(svgEl('path',{d:`M233 ${top} Q253 ${top} 253 ${top+18} L253 ${top+h} L233 ${top+h} Z`,fill:ulnar}));if(side==='dorsal'&&x<261)g.append(svgEl('path',{d:`M${x+1} ${top+31} L${x+1} ${top+19} Q${x+1} ${top+1} ${x+20} ${top+1} Q${x+width-1} ${top+1} ${x+width-1} ${top+19} L${x+width-1} ${top+31} Z`,fill:median}));if(side==='dorsal'&&x===213)g.append(svgEl('path',{d:`M233 ${top+1} Q252 ${top+1} 252 ${top+19} L252 ${top+31} L233 ${top+31} Z`,fill:ulnar}));}
  if(side==='dorsal')g.append(svgEl('ellipse',{cx:52,cy:158,rx:15,ry:18,fill:median,transform:'rotate(-35 52 158)'}));body.append(svg);
  const legend=el('div');legend.className='sensory-legend';for(const[id,color,description]of [['median',median,side==='palmar'?'Lateral ⅔ palm + lateral 3½ fingers':'Terminal phalanges of lateral 3½ fingers'],['ulnar',ulnar,'Medial ⅓ + medial 1½ fingers'],...(side==='dorsal'?[['radial',radial,'Lateral ⅔ dorsum + lateral 3½ fingers, except terminal phalanges']]:[])]){const b=el('button',id[0].toUpperCase()+id.slice(1)+': '+description);b.style.borderLeft='5px solid '+color;on(b,'click',()=>jump(id,'sensory'));legend.append(b);}body.append(legend);
  const source=el('button','Show original lecture map');on(source,'click',()=>{const i=data.steps.findIndex(s=>s.sensorySide===side);select(i);dialog.close();});body.append(source);
 }
 function drawInjury(){
  const grid=el('div');grid.className='injury-grid';body.append(el('p','Compare the lecture findings by injury level. The 3D anatomy stays in its normal pose; injury postures are shown in the original slides.'),grid);
  function column(defaultId){const col=el('section'),label=el('label','Injury level'),input=el('select');for(const l of data.lesions){const o=el('option',l.title);o.value=l.id;input.append(o);}input.value=defaultId;label.append(input);const detail=el('div'),go=el('button','Show on model');col.append(label,detail,go);grid.append(col);function render(){const l=data.lesions.find(l=>l.id===input.value);detail.replaceChildren();for(const[k,title]of [['motor','Motor'],['sensory','Sensory'],['cause','Cause / context']]){detail.append(el('h3',title),el('p',l[k]));}}on(input,'change',render);on(go,'click',()=>{select(data.steps.findIndex(s=>s.lesionId===input.value));dialog.close();});render();}
  column('median-wrist');column('median-elbow');
 }
 function update(step){if(step.nerveId&&data.nerveProfiles.some(p=>p.id===step.nerveId))chooser.value=step.nerveId;const p=data.nerveProfiles.find(p=>p.id===chooser.value)||data.nerveProfiles[0];facts.textContent=p.name+' · '+p.roots+' · '+p.origin;}
 on(chooser,'change',()=>jump(chooser.value,'origin'));chooser.value=data.nerveProfiles[0].id;
 return {update,dispose(){panel.remove();dialog.remove();}};
}
