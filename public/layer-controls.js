// Independent overrides persist through tour navigation; untouched layers retain lecture defaults.
export const LAYER_IDS=['arteries','veins','bones','muscles','nerves'];
export function createLayerControls({meshes,refresh,extraLayers=[],isQuiz=()=>false,isIsolated=()=>false,isSelected=()=>false,isEligible=()=>true}){
 const life=new AbortController(),settings=new Map(),ids=k=>k==='muscles'?['muscleOpacity','muscleValue']:[k+'Opacity',k+'Value'];
 const controls=new Map([...LAYER_IDS,...extraLayers].map(k=>{const [sliderId,valueId]=ids(k);return [k,{toggle:document.getElementById(k),slider:document.getElementById(sliderId),value:document.getElementById(valueId)}];}));
 for(const [key,c] of controls){c.toggle.addEventListener('change',()=>{settings.set(key,{...settings.get(key),enabled:c.toggle.checked});refresh();},{signal:life.signal});c.slider.addEventListener('input',()=>{settings.set(key,{...settings.get(key),opacity:Math.max(0,Math.min(1,Number(c.slider.value)/100))});refresh();},{signal:life.signal});}
 function apply(){if(isQuiz())return;
  // Hidden meshes outside this lecture's directory must never reappear when a
  // user enables an entire layer (e.g. foot bones packed with spine assets).
  for(const mesh of meshes)if(!isEligible(mesh))mesh.visible=false;
  for(const [key,c] of controls){const group=meshes.filter(m=>m.userData.displayLayer===key&&isEligible(m)),s=settings.get(key)||{},automatic=group.some(m=>m.visible),enabled=s.enabled??automatic;
   const visible=group.filter(m=>m.visible),base=visible.length?Math.max(...visible.flatMap(m=>(Array.isArray(m.material)?m.material:[m.material]).map(mat=>mat.opacity))):1,value=s.opacity??base;
   c.toggle.checked=enabled;c.slider.value=Math.round(value*100);c.value.value=Math.round(value*100)+'%';c.slider.setAttribute('aria-valuetext',Math.round(value*100)+' percent');
   for(const m of group){if(!enabled)m.visible=false;else if(s.enabled===true)m.visible=!isIsolated()||isSelected(m);
    if(s.opacity!=null)for(const mat of (Array.isArray(m.material)?m.material:[m.material])){const wasTransparent=mat.transparent;mat.opacity=s.opacity;mat.transparent=s.opacity<1;mat.depthWrite=s.opacity===1;if(wasTransparent!==mat.transparent)mat.needsUpdate=true;}
    if(s.opacity===0)m.visible=false;
   }
  }
 }
 return {apply,isEnabledManually:key=>settings.get(key)?.enabled===true,isDisabledManually:key=>settings.get(key)?.enabled===false,dispose(){life.abort();settings.clear();}};
}
