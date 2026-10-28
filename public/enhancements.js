import * as THREE from 'three';
export function createEnhancements(api){
 const {camera,controls,canvas,meshes,steps,byName}=api,$=id=>document.getElementById(id),life=new AbortController(),on=(e,t,f)=>e.addEventListener(t,f,{signal:life.signal});
 let tween=null,pulse=null,locked=false,quiz=null,question=null,answered=false,number=0,hintTimer;
 const materials=m=>Array.isArray(m.material)?m.material:[m.material];
 // The universal loader owns one material per mesh; no second clone is needed.
 const entries=[];const seen=new Set();steps.forEach((step,index)=>step.pins.forEach(pin=>{const key=pin.target+'|'+pin.name;if(!seen.has(key)){seen.add(key);entries.push({pin,step,index,name:pin.name,target:pin.target});}}));
 const studyLayer=api.studyLayer||'arteries';
 const arteries=[...new Set(entries.filter(e=>(!api.quizTargets||api.quizTargets.includes(e.target))&&!e.pin.context&&(api.quizLayers||[studyLayer]).includes(byName.get(e.target)?.userData.displayLayer)).map(e=>e.target))];
 const nameOf=n=>api.targetNames?.[n]||(n==='Deep brachial artery.r'?'Profunda brachii (deep brachial artery)':n.replace(/\.r$/,''));
 function bounds(names){const b=new THREE.Box3();names.forEach(n=>{const m=byName.get(n);if(m)b.union(new THREE.Box3().setFromObject(m));});return b;}
 const limbNames=[...new Set(steps.flatMap(s=>s.focus))];
 function move(names,side='Anterior'){
  const b=bounds(names);if(b.isEmpty())return;const center=b.getCenter(new THREE.Vector3()),sphere=b.getBoundingSphere(new THREE.Sphere());
  const angle=Math.min(THREE.MathUtils.degToRad(camera.fov)/2,Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)*camera.aspect));
  const distance=Math.max(.12,sphere.radius/Math.sin(angle)*1.3),dir={Anterior:[0,0,1],Posterior:[0,0,-1],Medial:[1,0,0],Lateral:[-1,0,0],Superior:[0,1,.001],Inferior:[0,-1,.001]}[side];
  api.setFocus?.(center);api.cancelCamera();tween={start:performance.now(),from:camera.position.clone(),fromTarget:controls.target.clone(),to:center.clone().addScaledVector(new THREE.Vector3(...dir),distance),center};
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){camera.position.copy(tween.to);controls.target.copy(center);tween=null;controls.update();}
 }
 document.querySelectorAll('[data-view]').forEach(b=>on(b,'click',()=>{if(!quiz&&api.viewSelection)api.viewSelection(b.dataset.view);else move(quiz&&question?question.targets:limbNames,b.dataset.view);}));
 on($('resetView'),'click',()=>{if(!quiz&&api.viewSelection)api.viewSelection();else move(quiz&&question?question.targets:limbNames);});
 on(controls,'start',()=>{tween=null;hideHint();});
 function ghost(){const value=Number($('muscleOpacity').value)/100;$('muscleValue').value=Math.round(value*100)+'%';api.state.muscleOpacity=value;api.refresh();}
 if(!api.independentLayers)on($('muscleOpacity'),'input',ghost);
 function applyMuscles(){
  const step=api.getCurrent?.(),ghosts=api.state.ghostOverlay===false?[]:(step?.ghostMuscles||[]),showContext=studyLayer==='muscles'&&api.state.lessonContext;
  const scope=api.muscleScope==='relations'?step?.muscleFocus:api.muscleScope==='focus'?step?.focus:(studyLayer==='bones'||studyLayer==='nerves')?step?.muscleFocus:studyLayer==='muscles'&&!showContext?step?.focus:null;
  for(const m of meshes){if(m.userData.displayLayer!=='muscles')continue;const name=m.userData.anatomyName,isGhost=ghosts.includes(name)&&!scope?.includes(name),isContextGhost=showContext&&!step?.focus?.includes(name),v=isContextGhost?Math.min(api.state.muscleOpacity??0,.16):isGhost?Math.min(api.state.muscleOpacity??0,.1):(api.state.muscleOpacity??0);
   m.visible=!quiz&&v>0&&(!scope?.length||scope.includes(name)||isGhost);m.renderOrder=v<1?2:0;
   for(const mat of materials(m)){mat.transparent=true;mat.opacity=v;mat.depthWrite=v===1;mat.depthTest=true;mat.side=THREE.FrontSide;}
  }
 }

 function hideHint(){clearTimeout(hintTimer);$('gestureHint').hidden=true;}
 function setLock(v){locked=v;controls.enabled=!v;canvas.style.touchAction=v?'pan-y':'none';$('orbitLock').textContent=v?'🔄 Rotate 3D':'🔒 Lock 3D / Scroll Page';$('orbitLock').setAttribute('aria-pressed',String(v));}
 controls.touches.ONE=THREE.TOUCH.ROTATE;controls.touches.TWO=THREE.TOUCH.DOLLY_PAN;
 on($('orbitLock'),'click',()=>{setLock(!locked);if(!locked){$('gestureHint').hidden=false;hintTimer=setTimeout(hideHint,3000);}});on($('dismissHint'),'click',hideHint);on(canvas,'pointerdown',hideHint);
 setLock(matchMedia('(pointer: coarse)').matches);$('gestureHint').hidden=locked;hintTimer=setTimeout(hideHint,3000);
 const input=$('anatomySearch'),list=$('searchResults');let results=[],active=-1;
 function closeSearch(){list.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');active=-1;}
 function choose(entry){closeSearch();input.value=entry.name;api.select(entry.index);if(!api.frameSearch?.(entry))move([entry.target]);flash(byName.get(entry.target),'#e8b750');$('searchDetail').hidden=false;$('searchDetailTitle').textContent=entry.name;$('searchDetailText').textContent=entry.pin.text+(entry.pin.context?' This detail has no separate mesh; its related structure is framed.':'');}
 function setActive(i){active=(i+results.length)%results.length;[...list.children].forEach((b,j)=>b.setAttribute('aria-selected',String(j===active)));input.setAttribute('aria-activedescendant','result-'+active);list.children[active]?.scrollIntoView({block:'nearest'});}
 on(input,'input',()=>{const q=input.value.toLowerCase().trim();results=q?entries.filter(e=>(e.name+' '+e.target+' '+e.pin.text).toLowerCase().includes(q)).slice(0,12):[];active=-1;list.replaceChildren();results.forEach((e,i)=>{const b=document.createElement('li');b.id='result-'+i;b.role='option';b.textContent=e.name;b.setAttribute('aria-selected','false');b.onpointerdown=ev=>ev.preventDefault();b.onclick=()=>choose(e);list.append(b);});list.hidden=!q;input.setAttribute('aria-expanded',String(!!q));$('searchStatus').textContent=q?`${results.length} results` :'';});
 on(input,'keydown',e=>{if(e.key==='Escape'){closeSearch();return;}if(!results.length)return;if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setActive(active+(e.key==='ArrowDown'?1:-1));}if(e.key==='Enter'){e.preventDefault();choose(results[active<0?0:active]);}});on(input,'blur',closeSearch);on($('closeSearchDetail'),'click',()=>$('searchDetail').hidden=true);
 function flash(mesh,color){if(!mesh)return;if(pulse)restorePulse();pulse={mesh,start:performance.now(),saved:materials(mesh).map(m=>({color:m.emissive.clone(),intensity:m.emissiveIntensity})),color:new THREE.Color(color)};}
 function restorePulse(){if(!pulse)return;materials(pulse.mesh).forEach((m,i)=>{m.emissive.copy(pulse.saved[i].color);m.emissiveIntensity=pulse.saved[i].intensity;});pulse=null;}
 function paint(m,color){if(!m)return;for(const mat of materials(m)){mat.vertexColors=false;mat.color.set(color);mat.emissive.set(color);mat.emissiveIntensity=.35;mat.opacity=1;mat.transparent=false;mat.depthWrite=true;mat.needsUpdate=true;}}
 const functional=(api.functionalQuiz||[{target:'Deep brachial artery.r',prompt:'Click the largest branch of the brachial artery.',explanation:'Profunda brachii is the largest brachial branch; the model calls it the deep brachial artery.'},{target:'Radial artery.r',prompt:'Click the artery that mainly supplies the thumb and lateral side of the index finger.',explanation:'The lecture assigns this territory mainly to the radial artery.'}]).filter(q=>arteries.includes(q.target));
 function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
 function nextQuestion(){restorePulse();number++;answered=false;$('quizFeedback').textContent='';$('nextQuestion').hidden=true;$('quizOptions').replaceChildren();const type=number%2===0&&functional.length?'B':'A',source=type==='B'?functional[(number/2-1)%functional.length]:null,target=type==='A'?shuffle(arteries)[0]:source.target;
 question={type,target,source,targets:type==='A'?[target]:((api.quizTargets||studyLayer!=='arteries')?[target,...shuffle(arteries.filter(n=>n!==target)).slice(0,3)]:[target,'Brachial artery.r','Radial artery.r','Ulnar artery.r']).filter(n=>byName.has(n))};
 api.refresh();for(const m of meshes){const layer=m.userData.displayLayer;m.visible=question.targets.includes(m.userData.anatomyName)||(layer==='bones'&&(api.isQuizContext?.(m)??true));if(layer==='bones'&&!question.targets.includes(m.userData.anatomyName))for(const mat of materials(m)){mat.opacity=.08;mat.transparent=true;mat.depthWrite=false;}else if(m.visible)paint(m,'#d94759');}
 $('quizCounter').textContent=`Question ${number} · ${type==='A'?'Identify':'Select on model'}`;
 if(type==='A'){paint(byName.get(target),'#f0b94c');$('quizPrompt').textContent=studyLayer==='bones'?'Identify this highlighted bone':studyLayer==='muscles'?'Identify this highlighted muscle':studyLayer==='nerves'?'Identify this highlighted nerve':'Identify this highlighted vessel';for(const n of shuffle([target,...shuffle(arteries.filter(n=>n!==target)).slice(0,3)])){const b=document.createElement('button');b.textContent=nameOf(n);b.onclick=()=>answer(n);$('quizOptions').append(b);}}
 else $('quizPrompt').textContent=question.source.prompt;
 move(question.targets);
 }
 function answer(n){if(!quiz||answered)return;answered=true;const correct=n===question.target;paint(byName.get(n),correct?'#42dc95':'#fb5569');flash(byName.get(n),correct?'#42dc95':'#fb5569');const e=entries.find(e=>e.target===question.target&&!e.pin.context);$('quizFeedback').textContent=(correct?'Correct. ':'Not quite. The answer is '+nameOf(question.target)+'. ')+(question.type==='B'?question.source.explanation:e?.pin.text||nameOf(question.target));$('quizFeedback').dataset.correct=String(correct);[...$('quizOptions').children].forEach(b=>b.disabled=true);$('nextQuestion').hidden=false;}
 function exitQuiz(){if(!quiz)return;const saved=quiz;quiz=null;tween=null;restorePulse();document.body.classList.remove('quiz-active');$('quizPanel').hidden=true;$('quizToggle').textContent='Enter Quiz Mode';$('quizToggle').setAttribute('aria-pressed','false');document.querySelector('.controls').inert=false;api.restore(saved);}
 on($('quizToggle'),'click',()=>{if(!arteries.length)return;if(quiz){exitQuiz();return;}quiz=api.capture();closeSearch();$('searchDetail').hidden=true;document.body.classList.add('quiz-active');document.querySelector('.controls').inert=true;$('quizPanel').hidden=false;$('quizToggle').textContent='Exit Quiz Mode';$('quizToggle').setAttribute('aria-pressed','true');number=0;nextQuestion();});on($('nextQuestion'),'click',nextQuestion);
 on(document,'keydown',e=>{if(e.key==='Escape'&&quiz)exitQuiz();});
 return {get animating(){return !!tween||!!pulse;},cancelAnimation(){tween=null;restorePulse();},isPickable:name=>!!question?.targets.includes(name),get quizActive(){return !!quiz;},applyMuscles,handlePick(name){if(!quiz)return false;if(question.type==='B')answer(name);return true;},tick(now){if(tween){let t=Math.min(1,(now-tween.start)/700);t=t*t*(3-2*t);camera.position.lerpVectors(tween.from,tween.to,t);controls.target.lerpVectors(tween.fromTarget,tween.center,t);if(t>=1)tween=null;}if(pulse){const t=(now-pulse.start)/1100;if(t>=1)restorePulse();else for(const mat of materials(pulse.mesh)){mat.emissive.copy(pulse.color);mat.emissiveIntensity=.3+.5*Math.sin(Math.PI*t);}}},dispose(){life.abort();clearTimeout(hintTimer);restorePulse();}};
}
