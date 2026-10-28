// Lecture 9: source-based topological maps linked to the original 3D vessel meshes.
export function createVesselLab({data,select,isQuiz}) {
 const $=id=>document.getElementById(id),life=new AbortController();
 const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
 // Only the document listener needs explicit teardown. Replaced controls are
 // collected with their listeners instead of being retained by a long-lived signal.
 const on=(e,type,fn)=>e.addEventListener(type,fn,e===document?{signal:life.signal}:undefined);
 const byId=new Map(data.steps.map((s,i)=>[s.id,i]));
 const panel=el('section',null,'vessel-entry');panel.append(el('span','VESSEL LAB','vessel-kicker'),el('h2','Follow the connections'));
 const open=el('button','Open vessel map'),traceOpen=el('button','Trace a route');panel.append(open,traceOpen);$('topics').before(panel);
 const dialog=el('dialog',null,'vessel-dialog'),head=el('div',null,'dialog-head'),close=el('button','×');close.setAttribute('aria-label','Close vessel lab');head.append(el('strong','Lecture 9 · vessels in context'),close);dialog.append(head);
 const nav=el('nav',null,'vessel-tabs');nav.setAttribute('aria-label','Vessel learning maps');dialog.append(nav);const body=el('div',null,'vessel-body');dialog.append(body);document.body.append(dialog);
 const modes={routes:'Routes & branches',relations:'Changing relations',networks:'Hip networks',knee:'Knee · 10 arteries',veins:'Venous return',sympathetic:'Sympathetic supply',lymph:'Lymph drainage'};
 let mode='routes',current=null,route=null,stage=0,timer=null,jumping=false,level=0;
 const tabs=new Map();
 const tracer=el('section',null,'vessel-tracer');tracer.hidden=true;tracer.setAttribute('aria-label','Guided vessel route');$('viewport').append(tracer);
 const inset=el('aside',null,'vessel-inset');inset.hidden=true;inset.setAttribute('aria-label','Lecture relationship diagram');$('viewport').append(inset);
 function jump(id){if(isQuiz()||!byId.has(id))return;dialog.close();select(byId.get(id));}
 function button(label,id,cls){const b=el('button',label,cls);on(b,'click',()=>jump(id));return b;}
 const note=t=>body.append(el('p',t,'vessel-note'));
 function cards(items){const g=el('div',null,'vessel-card-grid');for(const [title,text,color,id]of items){const c=el('section',null,'vessel-card');c.style.setProperty('--vessel-color',color);c.append(el('h3',title),el('p',text));if(id)c.append(button('Show on model',id));g.append(c);}body.append(g);}
 function stop(){clearInterval(timer);timer=null;}
 function stopRoute(){stop();route=null;tracer.hidden=true;renderInset(current);}
 function routeStep(index){if(!route||isQuiz())return;stage=Math.max(0,Math.min(route.stages.length-1,index));jumping=true;select(byId.get(route.stages[stage]));jumping=false;renderTracer();}
 function renderTracer(){
  if(!route)return;tracer.hidden=false;tracer.replaceChildren();const top=el('div',null,'vessel-trace-top'),text=el('div');text.append(el('small',route.name),el('strong',`${stage+1} / ${route.stages.length} · ${route.labels[stage]}`));const end=el('button','×');end.setAttribute('aria-label','End route trace');on(end,'click',stopRoute);top.append(text,end);tracer.append(top);
  const progress=el('div',null,'vessel-trace-progress');route.labels.forEach((label,i)=>{const b=el('button',String(i+1));b.title=label;b.setAttribute('aria-label',label);b.setAttribute('aria-current',i===stage?'step':'false');b.classList.toggle('passed',i<stage);on(b,'click',()=>{stop();routeStep(i);});progress.append(b);});tracer.append(progress);
  const actions=el('div',null,'vessel-trace-actions'),prev=el('button','Previous vessel'),play=el('button',timer?'Pause':'Auto trace'),next=el('button',stage===route.stages.length-1?'Restart route':'Next vessel');prev.disabled=stage===0;
  on(prev,'click',()=>{stop();routeStep(stage-1);});on(next,'click',()=>{stop();routeStep(stage===route.stages.length-1?0:stage+1);});
  on(play,'click',()=>{if(timer){stop();renderTracer();return;}if(stage===route.stages.length-1)routeStep(0);timer=setInterval(()=>{if(document.hidden||isQuiz()){stop();renderTracer();return;}if(stage===route.stages.length-1){stop();renderTracer();return;}routeStep(stage+1);},5200);renderTracer();});actions.append(prev,play,next);tracer.append(actions);
 }
 function startRoute(r){if(isQuiz())return;stop();route=r;stage=0;dialog.close();routeStep(0);}
 function relationDiagram(which){
  const x=[304,200,96][which],y=[120,192,120][which];
  return `<svg viewBox="0 0 400 290" role="img" aria-label="Schematic femoral relation: vein ${['medial','posterior','lateral'][which]} to artery"><text x="200" y="23" class="axis">ANTERIOR</text><text x="200" y="277" class="axis">POSTERIOR</text><text x="47" y="245" class="axis">LATERAL</text><text x="353" y="245" class="axis">MEDIAL</text><path d="M55 120H345M200 48V233" class="axis-line"/><circle cx="200" cy="120" r="30" fill="#ed4d66"/><text x="200" y="126">A</text><circle cx="${x}" cy="${y}" r="28" fill="#458ddd"/><text x="${x}" y="${y+6}">V</text>${which===0?'<circle cx="91" cy="120" r="21" fill="#e6b64d"/><text x="91" y="126" class="dark-label">N</text>':''}</svg>`;
 }
 function renderRelation(){
  body.append(el('h2','The vein changes sides as you descend'),el('p','Keep the artery as your reference. Switch the level, then show that level on the 3D model.','vessel-intro'));
  const controls=el('div',null,'vessel-levels');['Triangle base','Triangle apex','Adductor canal'].forEach((label,i)=>{const b=el('button',label);b.setAttribute('aria-pressed',String(level===i));on(b,'click',()=>{level=i;render();});controls.append(b);});body.append(controls);
  const g=el('div',null,'vessel-relation');g.innerHTML=relationDiagram(level);body.append(g);
  const summary=['Vein MEDIAL; nerve LATERAL to the artery.','Vein DEEP / POSTERIOR to the artery.','Vein LATERAL to the artery.'][level];body.append(el('p',summary,'vessel-key-fact'),button('Show this level on the model',['femoral-base','femoral-apex','femoral-canal'][level]));note('A = artery · V = vein · N = nerve. Schematic relationship, not a measured cross-section. Source: printed page 44.');
  cards([['Popliteal depth','Superficial → deep: tibial nerve, popliteal vein, popliteal artery. The vein stays between artery and nerve.','#ffcf6b','popliteal-depth'],['Popliteal crossing','Vein and nerve begin lateral to the artery, cross superficial to it and become medial.','#6daeff','popliteal-cross'],['Anterior ankle','Vessels and deep peroneal nerve run between EHL and EDL, beneath the superior extensor retinaculum.','#64d8d0','at-band']]);
 }
 function render(){
  body.replaceChildren();for(const [k,b]of tabs){b.classList.toggle('active',mode===k);b.setAttribute('aria-pressed',String(mode===k));}
  if(mode==='routes'){
   body.append(el('h2','A route first. Branches second.'),el('p','Choose a journey to move through connected 3D scenes. The route pauses at each landmark where a vessel changes its name or divides.','vessel-intro'));
   const routes=el('div',null,'vessel-route-grid');for(const r of data.routes){const b=el('button',null,'vessel-route-card '+r.kind);b.append(el('small',r.kind==='artery'?'ARTERIAL SUPPLY':'VENOUS RETURN'),el('strong',r.name),el('span',`${r.stages.length} stops · begin trace`));on(b,'click',()=>startRoute(r));routes.append(b);}body.append(routes);
   body.append(el('h3','Branch directory'));const list=el('div',null,'vessel-tree');
   function branch(parent,depth=0){for(const [label,id,up]of data.branchTree.filter(v=>v[2]===parent)){const row=button(label,id,'vessel-tree-node');row.style.setProperty('--depth',Math.min(depth,3));row.title='Locate '+label;list.append(row);branch(label,depth+1);}}
   branch(null);body.append(list);note('The directory shows parent–branch connections; it is not a scale drawing. Dorsalis pedis also joins the deep plantar arch. Small unmodeled branches remain available in the original figures.');
  }else if(mode==='relations')renderRelation();
  else if(mode==='networks'){
   body.append(el('h2','Three shared contributors. One changes.'));
   const table=el('table',null,'vessel-network-table');table.innerHTML='<caption>Hip anastomoses · lecture comparison</caption><thead><tr><th scope="col">Contributor</th><th scope="col">Trochanteric</th><th scope="col">Cruciate</th></tr></thead><tbody><tr><th scope="row">Inferior gluteal</th><td>● Shared</td><td>● Shared</td></tr><tr><th scope="row">Medial circumflex femoral</th><td>● Shared</td><td>● Shared</td></tr><tr><th scope="row">Lateral circumflex femoral</th><td>● Shared</td><td>● Shared</td></tr><tr class="network-difference"><th scope="row">Superior gluteal</th><td>Included</td><td>—</td></tr><tr class="network-difference"><th scope="row">First perforating</th><td>—</td><td>Included</td></tr></tbody>';body.append(table);
   cards([['Trochanteric','Provides the main blood supply to the head of femur in the lecture.','#ff9b6a','trochanteric'],['Cruciate','Situated at the level of the lesser trochanter.','#bd9aff','cruciate']]);note('Fine interconnections are shown on printed page 47. Select a network to highlight its available contributors around the real femur.');
  }else if(mode==='knee'){
   body.append(el('h2','Count the knee network by origin'),el('div','2 + 2 + 1 + 5 = 10','vessel-equation'));
   cards([['2 · descending routes','Descending genicular (femoral); descending branch of lateral circumflex femoral.','#ff9b6a','knee-overview'],['2 · recurrent routes','Anterior and posterior tibial recurrent arteries, from anterior tibial.','#ffd16c','at-branches'],['1 · circumflex route','Circumflex fibular artery, from posterior tibial.','#bd9aff','pt-branches'],['5 · genicular routes','Superior medial + lateral; middle; inferior medial + lateral. All from popliteal.','#ff6078','popliteal-genicular-upper']]);
   const row=el('div',null,'vessel-levels');row.append(button('Show upper genicular pair','popliteal-genicular-upper'),button('Show lower genicular pair','popliteal-genicular-lower'));body.append(row);note('All ten are listed on printed page 52. The five genicular arteries have separate meshes; the fine recurrent, descending and circumflex fibular connections use the lecture diagram.');
  }else if(mode==='veins'){
   body.append(el('h2','Medial and long · lateral and short'));
   const grid=el('div',null,'vessel-venous-grid');
   for(const [name,items,r]of [['Great saphenous',['Medial dorsal venous arch','In FRONT of medial malleolus','Medial leg and thigh','Saphenous nerve companion','Through saphenous opening','FEMORAL VEIN'],data.routes[2]],['Small saphenous',['Lateral dorsal venous arch','BEHIND lateral malleolus','Lateral to calcaneal tendon','Between gastrocnemius heads','Sural nerve companion','POPLITEAL VEIN'],data.routes[3]]]){const c=el('section',null,'vessel-venous-path');c.append(el('h3',name));const ol=el('ol');items.forEach(x=>ol.append(el('li',x)));c.append(ol);const b=el('button','Trace this vein');on(b,'click',()=>startRoute(r));c.append(b);grid.append(c);}body.append(grid);
   cards([['Anastomotic branches','Connect great and small saphenous veins.','#51d9d0','venous-links'],['Perforating branches','Connect great saphenous with the deep veins.','#6daeff','venous-links'],['Great saphenous tributaries','Superficial circumflex iliac, superficial epigastric, superficial external pudendal, accessory and subcutaneous veins.','#bd9aff','gsv-tributaries']]);note('Both superficial routes and their named relations are from printed page 53.');
  }else if(mode==='sympathetic'){
   body.append(el('h2','One chain, then peripheral nerve routes'));
   const flow=el('ol',null,'vessel-flow');for(const [h,t]of [['T10–L2 spinal segments','Preganglionic sympathetic fibers arise here.'],['Lumbar + sacral sympathetic ganglia','Origin of the postganglionic fibers.'],['Lumbar + sacral plexus peripheral nerves','Carry the fibers to the blood vessels.']]){const li=el('li');li.append(el('strong',h),el('p',t));flow.append(li);}body.append(flow);
   cards([['Femoral artery','Femoral and obturator nerves.','#ff6078','sympathetic-arteries'],['Anterior / posterior tibial','Sciatic branches: common peroneal and tibial nerves.','#ff9b6a','sympathetic-arteries'],['Great saphenous','Saphenous nerve.','#51d9d0','sympathetic-veins'],['Small saphenous','Sural nerve.','#6daeff','sympathetic-veins']]);note('Schematic pathway from printed page 54. The 3D view shows the named peripheral nerves and vessels, not individual sympathetic fibers.');
  }else if(mode==='lymph'){
   body.append(el('h2','Follow the drainage into the deep inguinal nodes'));
   const flow=el('div',null,'vessel-lymph-tree');
   cards([['Popliteal nodes','Small-saphenous lymphatics; lateral foot; lateral and posterior leg.','#6daeff','lymph-popliteal'],['Superficial inguinal · vertical','Along terminal great saphenous. Receives lymphatics accompanying that vein.','#51d9d0','lymph-vertical'],['Superficial inguinal · horizontal','Just below inguinal ligament. Lower anterior abdominal wall, perineum, buttock and external genitalia.','#bd9aff','lymph-horizontal']]);
   flow.innerHTML='<div class="vessel-lymph-inputs"><span>Superficial inguinal nodes</span><span>Popliteal nodes</span><span>Deep lymphatics</span></div><div class="vessel-connector" aria-hidden="true">↓</div><strong>DEEP INGUINAL NODES<br><small>in the femoral canal</small></strong><div class="vessel-connector" aria-hidden="true">↓</div><strong>EXTERNAL ILIAC NODES</strong>';body.append(flow,button('Show the inguinal region','lymph-deep'));note('Superficial and deep lymphatic vessels follow their corresponding blood vessels. This is a drainage schematic from printed pages 54–55; original figures show the node locations.');
  }
 }
 function renderInset(step){
  inset.replaceChildren();inset.hidden=true;if(!step||route)return;
  const i=['femoral-base','femoral-apex','femoral-canal'].indexOf(step.id);
  if(i>=0){inset.hidden=false;inset.append(el('strong',['BASE · V medial','APEX · V posterior','CANAL · V lateral'][i]));const g=el('div');g.innerHTML=relationDiagram(i);inset.append(g,el('small','Lecture relationship · schematic'));}
  else if(step.id==='popliteal-depth'){inset.hidden=false;inset.append(el('strong','SUPERFICIAL → DEEP'));const order=el('ol',null,'vessel-depth-order');['Tibial nerve','Popliteal vein','Popliteal artery'].forEach((t,i)=>{const li=el('li',t);li.style.borderColor=['#ffd16c','#6daeff','#ff6078'][i];order.append(li);});inset.append(order,el('small','Vein always between nerve and artery'));}
  else if(step.id==='knee-overview'){inset.hidden=false;inset.append(el('strong','KNEE NETWORK'),el('div','2 + 2 + 1 + 5','vessel-equation'),el('p','Descending + recurrent + circumflex fibular + genicular = 10'));}
 }
 for(const [key,label]of Object.entries(modes)){const b=el('button',label);on(b,'click',()=>{mode=key;render();});tabs.set(key,b);nav.append(b);}
 on(open,'click',()=>{if(isQuiz())return;stop();mode=current?.lab in modes?current.lab:'routes';render();dialog.showModal();});
 on(traceOpen,'click',()=>{if(isQuiz())return;stop();mode='routes';render();dialog.showModal();});on(close,'click',()=>dialog.close());
 on(document,'visibilitychange',()=>{if(document.hidden){stop();if(route)renderTracer();}});
 return {update(step){current=step;if(route&&!jumping&&route.stages[stage]!==step.id)stopRoute();renderInset(step);},tick(){if(isQuiz()&&timer){stop();if(route)renderTracer();}},dispose(){stopRoute();life.abort();panel.remove();dialog.remove();tracer.remove();inset.remove();}};
}
