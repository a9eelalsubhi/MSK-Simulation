// Compact muscle playback with optional directory and camera controls.
// The existing renderer is
// mounted here by the viewer; the panel never owns an animation loop or model.
export function createMuscleActions({data,isQuiz,inspectActive,viewer}) {
  const life=new AbortController(),signal=life.signal,entries=data.muscles;
  const byId=new Map(entries.map(m=>[m.muscle_id,m]));
  let current=entries.find(m=>m.profile_id==='rectus')||entries[0],actionIndex=0,disposed=false,scrollPosition=null;
  const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
  const button=(text,fn,cls)=>{const b=node('button',text,cls);b.type='button';b.addEventListener('click',fn,{signal});return b;};
  const launch=node('section',null,'muscle-action-launch');
  launch.append(button('Muscle actions',()=>open()));document.querySelector('.search-wrap').after(launch);
  const dialog=node('dialog',null,'muscle-action-panel');dialog.id='muscleActionDialog';dialog.setAttribute('aria-labelledby','muscleActionHeading');
  const head=node('div',null,'ma-head'),title=node('h2','Muscle actions');title.id='muscleActionHeading';
  const close=button('×',closePanel);close.setAttribute('aria-label','Close muscle actions');head.append(title,close);
  const filters=node('div',null,'ma-filters');
  const regionLabel=node('label','Region'),region=node('select');region.setAttribute('aria-label','Muscle action region');
  const regionNames={shoulder:'Shoulder & chest',arm:'Arm',forearm:'Forearm',hand:'Hand',gluteal:'Gluteal region',thigh:'Thigh',leg:'Leg',foot:'Foot'};
  for(const [value,label]of [['all','All regions'],...Object.entries(regionNames).filter(([key])=>entries.some(m=>m.region===key))]){const option=node('option',label);option.value=value;region.append(option);}regionLabel.append(region);
  const searchLabel=node('label','Find a muscle'),search=node('input');search.type='search';search.placeholder=entries.some(m=>m.anatomy_region==='upper')?'English, Arabic or muscle name…':'English, Arabic or peroneus…';search.setAttribute('aria-label','Find muscle action');searchLabel.append(search);filters.append(regionLabel,searchLabel);
  const toolbar=node('div',null,'ma-toolbar');
  const chooseLabel=node('label','Muscle'),chooser=node('select');chooser.setAttribute('aria-label','Muscle action muscle');
  chooseLabel.append(chooser);
  const actionLabel=node('label','Action'),actionSelect=node('select');actionSelect.setAttribute('aria-label','Muscle movement');actionLabel.append(actionSelect);
  const play=button('▶ Play',()=>{if(viewer.playing)stop();else start();},'ma-play');play.setAttribute('aria-pressed','false');
  toolbar.append(chooseLabel,actionLabel,play);
  const slot=node('div',null,'ma-3d-slot');slot.setAttribute('aria-label','Selected muscle with skeletal context');
  const empty=node('p','No matching muscles.','ma-empty');empty.hidden=true;empty.setAttribute('role','status');slot.append(empty);
  const navigation=node('div',null,'ma-navigation'),cameraButtons=node('nav',null,'ma-camera');cameraButtons.setAttribute('aria-label','Muscle action camera');
  for(const [label,whole,view]of [['Whole muscle',true,null],['Joint close-up',false,null],['Front',undefined,'front'],['Back',undefined,'back'],['Side',undefined,'side']])cameraButtons.append(button(label,()=>viewer.frame(whole,view)));
  const context=node('p',null,'ma-context');
  const phaseLabel=node('label','Movement phase','ma-phase'),phase=node('input');phase.type='range';phase.min=0;phase.max=100;phase.step=1;phase.value=0;phase.setAttribute('aria-label','3D movement phase');phaseLabel.append(phase);
  navigation.append(cameraButtons,context,phaseLabel);dialog.append(head,filters,toolbar,slot,navigation);document.body.append(dialog);
  const allActions=()=>[...current.action_section.primary_actions,...current.action_section.secondary_actions];
  const activeAction=()=>allActions()[actionIndex]||allActions()[0];
  function onPhase(value,isPlaying,description){
    const rounded=String(Math.round(value*100));if(phase.value!==rounded)phase.value=rounded;
    if(description!==undefined&&context.textContent!==description)context.textContent=description;
    updatePlayback(isPlaying);
  }
  function updatePlayback(isPlaying){
    // Called by the render loop: only mutate DOM on playback state changes.
    const label=isPlaying?'❚❚ Pause':'▶ Play',pressed=String(isPlaying);
    if(play.textContent!==label)play.textContent=label;
    if(play.getAttribute('aria-pressed')!==pressed)play.setAttribute('aria-pressed',pressed);
  }
  function stop(){viewer.pause();updatePlayback(false);}
  function start(){if(!dialog.open||isQuiz()||play.disabled)return;viewer.play();updatePlayback(true);}
  function populate(){
    const query=search.value.trim().toLocaleLowerCase();
    const found=entries.filter(m=>(region.value==='all'||m.region===region.value)&&[m.name_en,m.name_ar,...m.aliases].join(' ').toLocaleLowerCase().includes(query));
    chooser.replaceChildren(...found.map(m=>{const option=node('option',m.name_en);option.value=m.muscle_id;return option;}));
    const noMatches=!found.length;
    for(const control of [chooser,actionSelect,play,phase,...cameraButtons.querySelectorAll('button')])control.disabled=noMatches;
    empty.hidden=!noMatches;slot.classList.toggle('ma-no-results',noMatches);context.hidden=noMatches;
    if(noMatches){stop();chooser.append(node('option','No matching muscles'));return;}
    if(!found.some(m=>m.muscle_id===current.muscle_id)){current=found[0];actionIndex=0;render();}
    chooser.value=current.muscle_id;
  }
  function render(){
    stop();chooser.value=current.muscle_id;actionIndex=Math.min(actionIndex,allActions().length-1);
    actionSelect.replaceChildren(...allActions().map((a,i)=>{
      // The joint and posture constraint distinguish actions of muscles
      // crossing more than one joint. No extra information cards are needed.
      const option=node('option',`${a.joint} · ${a.movement}${a.condition?' · '+a.condition:''}${a.direct===false?' (assists)':''}`);option.value=i;return option;
    }));
    actionSelect.value=String(actionIndex);if(viewer.active)viewer.configure(current,activeAction());
  }
  function open(id){
    if(disposed||isQuiz())return;
    if(id&&byId.has(id)){current=byId.get(id);actionIndex=0;}region.value='all';search.value='';populate();render();
    if(!dialog.open){scrollPosition=[window.scrollX,window.scrollY];document.documentElement.classList.add('muscle-action-open');dialog.showModal();viewer.mount(slot,current,activeAction(),onPhase);}chooser.focus({preventScroll:true});
  }
  chooser.addEventListener('change',()=>{current=byId.get(chooser.value);actionIndex=0;render();},{signal});
  region.addEventListener('change',populate,{signal});search.addEventListener('input',populate,{signal});
  actionSelect.addEventListener('change',()=>{stop();actionIndex=Number(actionSelect.value);viewer.configure(current,activeAction());},{signal});
  phase.addEventListener('input',()=>{if(!phase.disabled){stop();viewer.pose(Number(phase.value)/100);}},{signal});
  function unlockPage(){document.documentElement.classList.remove('muscle-action-open');if(scrollPosition){window.scrollTo(...scrollPosition);scrollPosition=null;}}
  // Native dialog close events can wait for a browser rendering opportunity.
  // Restore the canvas and page synchronously, including in a background tab.
  function closePanel(){stop();unlockPage();viewer.unmount();if(dialog.open)dialog.close();}
  dialog.addEventListener('close',()=>{if(!dialog.open)closePanel();},{signal});
  dialog.addEventListener('cancel',event=>{event.preventDefault();closePanel();},{signal});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();},{signal});
  // Quiz activation also removes muscle names and stops the mixer.
  const quizToggle=document.getElementById('quizToggle');
  const quizObserver=new MutationObserver(()=>{launch.hidden=isQuiz();if(isQuiz()&&dialog.open)closePanel();});
  quizObserver.observe(quizToggle,{attributes:true,attributeFilter:['aria-pressed']});
  populate();render();
  return {
    open,
    update(step){if(!inspectActive()&&!viewer.active){const m=entries.find(m=>m.profile_id===step.profileId)||entries.find(m=>step.focus.includes(m.mesh_names[0]));if(m&&m!==current){current=m;actionIndex=0;}}},
    pick(name){if(!inspectActive()||isQuiz())return false;const m=entries.find(m=>m.mesh_names.includes(name));if(!m)return false;open(m.muscle_id);return true;},
    dispose(){disposed=true;stop();unlockPage();viewer.unmount();life.abort();quizObserver.disconnect();dialog.remove();launch.remove();}
  };
}
