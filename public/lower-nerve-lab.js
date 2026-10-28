// Source-led lower-limb nerve maps. No synthetic nerve paths or skin boundaries.
export const PSOAS_EXITS={
 Anterior:[['Genitofemoral','psoas-anterior']],
 Lateral:[['Iliohypogastric','iliohypogastric'],['Ilioinguinal','ilioinguinal'],['Lateral cutaneous nerve of thigh','lateral-cutaneous'],['Femoral','femoral-psoas']],
 Medial:[['Obturator','obturator-course'],['Lumbosacral trunk','psoas-medial']]
};
export const SACRAL_BRANCHES=[['Sciatic','sciatic-origin'],['Superior gluteal','superior-gluteal'],['Inferior gluteal','inferior-gluteal'],['Nerve to quadratus femoris','quadratus-nerve'],['Nerve to obturator internus','obturator-internus-nerve'],['Posterior cutaneous nerve of thigh','sacral-cutaneous'],['Perforating cutaneous','sacral-cutaneous'],['Nerve to piriformis','piriformis-nerve'],['Pudendal','pudendal-course']];
export function createLowerNerveLab({data,select,isQuiz}){
 const $=id=>document.getElementById(id),life=new AbortController(),el=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
 const on=(e,t,f)=>e.addEventListener(t,f,e===document?{signal:life.signal}:undefined),byId=new Map(data.steps.map((s,i)=>[s.id,i]));
 const entry=el('section',null,'ln-entry');entry.append(el('span','NERVE DISCOVERY','ln-kicker'),el('h2','From nerve to function'));
 const label=el('label','Choose a nerve'),choice=el('select');data.nerveProfiles.forEach((p,i)=>{const o=el('option',p.name);o.value=i;choice.append(o);});label.append(choice);entry.append(label);
 const aspects=el('div',null,'ln-actions'),facts=el('p',null,'ln-profile-fact');entry.append(aspects,facts);
 for(const [name,key]of [['Course','scene'],['Muscles','motorScene'],['Skin','skinScene'],['Injury','injuryScene']]){const b=el('button',name);on(b,'click',()=>jump(profile()[key]));aspects.append(b);}
 const open=el('button','Open nerve maps','ln-open'),trace=el('button','Trace a nerve route','ln-open');entry.append(open,trace);$('topics').before(entry);
 const dialog=el('dialog',null,'ln-dialog'),head=el('div',null,'dialog-head'),close=el('button','×');close.setAttribute('aria-label','Close nerve maps');head.append(el('strong','Lecture 10 · nerve, target and deficit'),close);dialog.append(head);
 const nav=el('nav',null,'ln-tabs');nav.setAttribute('aria-label','Lower limb nerve maps');dialog.append(nav);const body=el('div',null,'ln-body');dialog.append(body);document.body.append(dialog);
 const modes={plexus:'Plexus connections',psoas:'Psoas exit map',motor:'Motor targets',sensory:'Sensory territories',lesions:'Injury comparison',routes:'Guided routes'},tabs=new Map();let mode='plexus',current=null,route=null,stage=0,timer=null,jumping=false,plexus='Lumbar',skin='dorsum';
 const inset=el('aside',null,'ln-inset');inset.hidden=true;$('viewport').append(inset);const tracer=el('section',null,'ln-tracer');tracer.hidden=true;tracer.setAttribute('aria-label','Guided nerve route');$('viewport').append(tracer);
 const profile=()=>data.nerveProfiles[Number(choice.value)||0];
 function jump(id){if(isQuiz()||!byId.has(id))return;if(dialog.open)dialog.close();select(byId.get(id));}
 function button(title,id,cls){const b=el('button',title,cls);on(b,'click',()=>jump(id));return b;}
 function source(page,caption,crop){const fig=el('figure',null,'ln-source'),img=el('img');img.src=`/lectures/l10/${crop?'figures/'+crop+'.jpg':'slides/'+page+'.jpg'}`;img.alt=caption;img.loading='lazy';fig.append(img,el('figcaption',caption+' · original lecture, printed p. '+(55+page)));return fig;}
 const note=t=>body.append(el('p',t,'ln-note'));
 function cards(items){const grid=el('div',null,'ln-cards');for(const [name,text,color,id]of items){const c=el('section',null,'ln-card');c.style.setProperty('--nerve',color);c.append(el('h3',name),el('p',text));if(id)c.append(button('Show on model',id));grid.append(c);}body.append(grid);}
 function renderPlexus(){
  body.append(el('h2','Roots → plexus → named branches'),el('p','Select a branch to follow its position on the skeleton. This connection map groups the roots supplied by the lecture; it does not assign unlisted roots to individual branches.'));
  const switches=el('div',null,'ln-actions');for(const name of ['Lumbar','Sacral']){const b=el('button',name+' plexus');b.setAttribute('aria-pressed',String(plexus===name));on(b,'click',()=>{plexus=name;render();});switches.append(b);}body.append(switches);
  const roots=plexus==='Lumbar'?['L1','L2','L3','L4']:['L4','L5','S1','S2','S3','S4'],circuit=el('div',null,'ln-circuit'),rootCol=el('div',null,'ln-roots');roots.forEach(r=>rootCol.append(el('span',r)));
  const hub=el('div',null,'ln-hub');hub.append(el('strong',plexus+' plexus'),el('span',plexus==='Lumbar'?'WITHIN PSOAS MAJOR':'ANTERIOR TO PIRIFORMIS'),button('See plexus region',plexus==='Lumbar'?'lumbar-map':'sacral-map'));
  const branches=el('div',null,'ln-branches');const rows=plexus==='Lumbar'?Object.values(PSOAS_EXITS).flat():SACRAL_BRANCHES;for(const [name,id]of rows)branches.append(button(name,id));circuit.append(rootCol,hub,branches);body.append(circuit);
  cards(data.nerveProfiles.filter(p=>p.plexus===plexus&&['Femoral','Obturator','Sciatic','Pudendal'].includes(p.name)).map(p=>[p.name,p.roots+' · '+p.course,p.color,p.scene]));
  body.append(source(plexus==='Lumbar'?1:6,plexus+' plexus source diagram',plexus==='Lumbar'?'lumbar':'sacral'));note('Ventral rami form both plexuses. Lumbar: L1–L4. Sacral: L4–S4. Independent 3D root/fiber subdivisions are not supplied by this model.');
 }
 function renderPsoas(){
  body.append(el('h2','Use psoas as your reference: 1 · 4 · 2'),el('p','One anterior branch, four lateral branches, two medial structures. Select a name to see its route around the translucent psoas.'));
  const grid=el('div',null,'ln-exits');for(const [side,rows]of Object.entries(PSOAS_EXITS)){const col=el('section');col.append(el('h3',side),el('strong',String(rows.length),'ln-count'));rows.forEach(([name,id])=>col.append(button(name,id)));grid.append(col);}body.append(grid,source(1,'Psoas and the lumbar branches','lumbar'));note('The lumbosacral trunk has no separate mesh; its original diagram remains available. All labels refer to the structure’s relation to psoas major.');
 }
 function renderMotor(){
  const p=profile();body.append(el('h2',p.name+' · follow its targets'));
  const chooser=el('select');chooser.setAttribute('aria-label','Nerve motor map');data.nerveProfiles.forEach((n,i)=>{const o=el('option',n.name);o.value=i;chooser.append(o);});chooser.value=choice.value;on(chooser,'change',()=>{choice.value=chooser.value;render();});body.append(chooser);
  const chain=el('div',null,'ln-function-chain');for(const [h,t]of [['ORIGIN',p.roots],['COURSE',p.course],['MOTOR TARGETS',p.motor],['JOINT BRANCHES',p.joints]]){const c=el('section');c.style.borderColor=p.color;c.append(el('small',h),el('p',t));chain.append(c);}body.append(chain,button('Show nerve and muscles together',p.motorScene));
  if(p.name.includes('plantar')){cards([['Medial · FOUR','1st lumbrical + FDB + FHB + abductor hallucis.','#69d5aa','medial-plantar-motor'],['Lateral · REMAINDER','All other muscles of sole.','#ffac78','lateral-plantar']]);}
  if(p.name==='Obturator'||p.name==='Sciatic')cards([['Magnus: two functional parts','Obturator posterior division → adductor part. Tibial part of sciatic → hamstring part.','#bd9cff','obturator-posterior'],['Biceps: two heads','Tibial part of sciatic → long head. Common peroneal part → short head.','#f4c96b','sciatic-peroneal-motor']]);
  note('Motor scenes color the intact source muscles. Adductor magnus has one shared mesh; all lumbricals share one grouped mesh. The callouts specify the exact part named in the lecture.');
 }
 function renderSensory(){
  body.append(el('h2','Match a skin area to its nerve'));
  const switches=el('div',null,'ln-actions');for(const [k,n]of [['dorsum','Dorsum + first web'],['sole','Sole + toes'],['medial','Medial leg / foot'],['thigh','Anterior thigh']]){const b=el('button',n);b.setAttribute('aria-pressed',String(skin===k));on(b,'click',()=>{skin=k;render();});switches.append(b);}body.append(switches);
  if(skin==='dorsum'){body.append(source(12,'Lecture skin map of ankle and dorsum','dorsum'));cards([['Deep peroneal','Adjacent sides of 1st and 2nd toes: the first web space.','#6dcfee','deep-peroneal-web'],['Superficial peroneal','Lower anterolateral leg and dorsum foot.','#a1b4ff','superficial-peroneal-skin'],['Sural','Back of leg and lateral side of foot.','#e2bf7d','tibial-cutaneous'],['Saphenous','Medial lower limb; anterior to medial malleolus.','#61d9cf','saphenous-foot']]);}
  else if(skin==='sole'){
   const count=el('div',null,'ln-toe-count');count.setAttribute('aria-label','Toe count schematic: medial three and a half, lateral one and a half');count.append(el('p','Toe count schematic · MEDIAL → LATERAL'));
   const toes=el('div');for(let i=1;i<=5;i++){const b=button(i===1?'1 · big toe':String(i),'plantar-territories');b.className='ln-toe toe-'+i;b.setAttribute('aria-label','Toe '+i+(i<4?' · medial plantar':i===4?' · medial and lateral plantar halves':' · lateral plantar'));toes.append(b);}count.append(toes,el('p','Medial plantar: 3½ · Lateral plantar: 1½'));body.append(count,source(10,'Medial and lateral plantar nerve routes','plantar'));cards([['Medial plantar · 3½','Medial sole and medial three-and-a-half toes.','#69d5aa','plantar-territories'],['Lateral plantar · 1½','Lateral sole and lateral one-and-a-half toes.','#ffac78','plantar-territories'],['Medial calcaneal','Heel skin; a tibial cutaneous branch.','#f093bb','tibial-cutaneous']]);}
  else if(skin==='medial'){body.append(source(4,'Saphenous route and skin territory','saphenous'));cards([['Saphenous','Medial knee and leg → front of medial malleolus → medial foot to big-toe MTP.','#61d9cf','saphenous-foot'],['Why sciatic injury spares this strip','Saphenous belongs to femoral, outside the sciatic route.','#f4c96b','sciatic-spared']]);}
  else {body.append(source(4,'Anterior thigh cutaneous branches','femoral'));cards([['Femoral','Intermediate and medial cutaneous branches of thigh; saphenous branch.','#61d9cf','femoral-cutaneous'],['Obturator','Small area of medial thigh.','#bd9cff','obturator-injury'],['Lateral cutaneous nerve','Lecture territory: lateral thigh, knee and buttocks.','#e2bf7d','lateral-cutaneous']]);cards([['Genitofemoral femoral branch','Small anterior superior thigh skin area.','#e2bf7d','genitofemoral']]);}
  note('These are the original lecture drawings. Their colors belong to the source legend; select a named nerve to match it to the 3D route. No new skin boundary is invented.');
 }
 function renderLesions(){
  body.append(el('h2','Predict the deficit, then reveal it'),el('p','Compare the movement lost with the resting position that remains. Choose two injuries, then reveal the lecture findings.'));
  const grid=el('div',null,'ln-lesions');body.append(grid);
  function column(initial){const col=el('section',null,'ln-lesion'),label=el('label','Injured nerve'),selectN=el('select');data.lesions.forEach((l,i)=>{const o=el('option',l.name);o.value=i;selectN.append(o);});selectN.value=initial;label.append(selectN);const content=el('div'),reveal=el('button','Reveal deficit'),go=el('button','Show injured pathway');col.append(label,content,reveal,go);grid.append(col);let shown=false;
   function draw(){const l=data.lesions[Number(selectN.value)];col.style.setProperty('--nerve',l.color);content.replaceChildren(el('h3',l.paralysis),el('p','Cause: '+l.cause));if(shown){for(const [name,key]of [['MOVEMENT LOST','lost'],['POSITION / SIGN','position'],['SENSORY LOSS','skin']]){const c=el('section',null,'ln-deficit');c.append(el('small',name),el('p',l[key]));content.append(c);}}else content.append(el('p','Which movement fails? Which skin area loses sensation?','ln-predict'));reveal.textContent=shown?'Hide deficit':'Reveal deficit';}
   on(selectN,'change',()=>{shown=false;draw();});on(reveal,'click',()=>{shown=!shown;draw();});on(go,'click',()=>jump(data.lesions[Number(selectN.value)].scene));draw();}
  column(3);column(4);body.append(source(14,'Equinovarus and calcaneovalgus · lecture posture illustrations','postures'));note('The lecture’s clubfoot illustration explains the named posture; it is not a simulation of every acquired nerve injury. The 3D skeleton stays in its original pose.');
  cards([['Sciatic injury: spared strip','Below-knee sensory loss except medial saphenous area.','#61d9cf','sciatic-spared'],['Sciatica: pressure and pain','Disc prolapse at roots or tumor at plexus / sciatic. Posterior thigh, posterior + lateral leg, lateral foot.','#f4c96b','sciatica']]);
 }
 function stop(){clearInterval(timer);timer=null;}
 function stopRoute(){stop();route=null;tracer.hidden=true;renderInset(current);}
 function routeStep(index){if(!route||isQuiz())return;stage=Math.max(0,Math.min(route.stages.length-1,index));jumping=true;try{select(byId.get(route.stages[stage]));}finally{jumping=false;}renderTracer();}
 function renderTracer(){if(!route)return;tracer.replaceChildren();tracer.hidden=false;const top=el('div',null,'ln-trace-head'),text=el('div'),end=el('button','×');end.setAttribute('aria-label','End nerve trace');text.append(el('small',route.name),el('strong',`${stage+1} / ${route.stages.length} · ${route.labels[stage]}`));on(end,'click',stopRoute);top.append(text,end);tracer.append(top);
  const progress=el('div',null,'ln-stops');route.labels.forEach((label,i)=>{const b=el('button',String(i+1));b.setAttribute('aria-label',label);b.setAttribute('aria-current',i===stage?'step':'false');on(b,'click',()=>{stop();routeStep(i);});progress.append(b);});tracer.append(progress);
  const actions=el('div',null,'ln-actions'),prev=el('button','Previous'),play=el('button',timer?'Pause':'Auto trace'),next=el('button',stage===route.stages.length-1?'Restart':'Next');prev.disabled=stage===0;on(prev,'click',()=>{stop();routeStep(stage-1);});on(next,'click',()=>{stop();routeStep(stage===route.stages.length-1?0:stage+1);});on(play,'click',()=>{if(timer){stop();renderTracer();return;}if(stage===route.stages.length-1)routeStep(0);timer=setInterval(()=>{if(document.hidden||isQuiz()||stage===route.stages.length-1){stop();renderTracer();return;}routeStep(stage+1);},6000);renderTracer();});actions.append(prev,play,next);tracer.append(actions);
 }
 function renderRoutes(){body.append(el('h2','Follow one connected pathway'));const g=el('div',null,'ln-cards');data.routes.forEach(r=>{const b=el('button',null,'ln-route');b.append(el('strong',r.name),el('span',r.stages.length+' stops'));on(b,'click',()=>{if(isQuiz())return;stop();route=r;stage=0;dialog.close();routeStep(0);});g.append(b);});body.append(g);note('The trace moves through lecture scenes, pausing at each relation or division. It does not animate impulses or invent unmodeled branches.');}
 function render(){body.replaceChildren();for(const [key,b]of tabs){b.setAttribute('aria-pressed',String(mode===key));b.classList.toggle('active',mode===key);}({plexus:renderPlexus,psoas:renderPsoas,motor:renderMotor,sensory:renderSensory,lesions:renderLesions,routes:renderRoutes}[mode])();}
 function renderInset(step){inset.replaceChildren();inset.hidden=true;if(!step||route)return;
  const cues={
   'lumbar-map':['PSOAS EXIT MAP','Anterior 1 · Lateral 4 · Medial 2','psoas'],
   'psoas-lateral':['LATERAL · FOUR','Iliohypogastric · Ilioinguinal · Lateral cutaneous thigh · Femoral','psoas'],
   'femoral-inguinal':['BEHIND THE LIGAMENT','Nerve is lateral to both artery and sheath','psoas'],
   'sacral-map':['SACRAL · NINE BRANCHES','L4–S4 · anterior to piriformis','plexus'],
   'sciatic-tibial-motor':['BICEPS: LONG HEAD','Tibial part also supplies semitendinosus, semimembranosus and magnus hamstring part','motor'],
   'sciatic-peroneal-motor':['BICEPS: SHORT HEAD','Common peroneal part','motor'],
   'medial-plantar-motor':['MEDIAL PLANTAR · FOUR','1st lumbrical · FDB · FHB · abductor hallucis','motor'],
   'plantar-territories':['SOLE · 3½ + 1½','Medial plantar versus lateral plantar','sensory'],
   'deep-peroneal-web':['DEEP · FIRST WEB','Adjacent sides of 1st and 2nd toes','sensory'],
   'sciatic-spared':['WHY IS THIS STRIP SPARED?','Medial saphenous route belongs to FEMORAL','sensory'],
   'peroneal-injury':['EQUINOVARUS','LOST: dorsiflexion + eversion. LEFT: plantarflexed + inverted','lesions'],
   'tibial-injury':['CALCANEOVALGUS','LOST: plantarflexion + inversion. LEFT: dorsiflexed + everted','lesions'],
   'injury-compare':['OPPOSITE FOOT POSTURES','Peroneal: plantarflexed + inverted. Tibial: dorsiflexed + everted','lesions']};
  const cue=cues[step.id];if(cue){inset.hidden=false;inset.append(el('strong',cue[0]),el('p',cue[1]));const b=el('button','Open '+modes[cue[2]].toLowerCase());on(b,'click',()=>show(cue[2]));inset.append(b);}
  else if(step.pins?.some(p=>p.context)&&['pudendal-rectal','pudendal-perineal','pudendal-dorsal','obturator-internus-nerve','inferior-gluteal','psoas-medial','tibial-cutaneous','peroneal-branches'].includes(step.id)){inset.hidden=false;inset.append(el('strong','FINE BRANCH · LECTURE FIGURE'));const b=el('button','See the original branch diagram');on(b,'click',()=>$('showSlide').click());inset.append(b,el('p','Dotted callout = related regional context. The fine branch has no independent mesh.'));}
 }
 function syncProfile(){const p=profile();facts.textContent=p.name+' · '+p.roots;aspects.lastChild.disabled=!p.injuryScene;}
 function show(key){if(isQuiz())return;stop();mode=key;render();if(!dialog.open)dialog.showModal();}
 for(const [key,label]of Object.entries(modes)){const b=el('button',label);on(b,'click',()=>{mode=key;render();});nav.append(b);tabs.set(key,b);}
 on(open,'click',()=>show(current?.lab in modes?current.lab:'plexus'));on(trace,'click',()=>show('routes'));on(close,'click',()=>dialog.close());on(choice,'change',()=>{syncProfile();jump(profile().scene);});on(document,'visibilitychange',()=>{if(document.hidden){stop();if(route)renderTracer();}});syncProfile();
 return {update(step){current=step;if(route&&!jumping&&route.stages[stage]!==step.id)stopRoute();const i=data.nerveProfiles.findIndex(p=>[p.scene,p.motorScene,p.skinScene,p.injuryScene].includes(step.id));if(i>=0)choice.value=i;syncProfile();renderInset(step);},tick(){if(isQuiz()&&timer){stop();renderTracer();}},dispose(){stop();life.abort();entry.remove();dialog.remove();inset.remove();tracer.remove();}};
}
