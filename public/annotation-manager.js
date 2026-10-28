import * as THREE from 'three';
import {projectAnchor,localRect,placeCards,cardEdge} from './annotation-layout.js?v=20261003-audit4';

export function createAnnotationManager({viewport,canvas,overlay,svg,camera,controls,getPins,getState,onPaging}) {
  const life=new AbortController(),scratch=new THREE.Vector3(),world=new THREE.Vector3(),focusAnchor=new THREE.Vector3();
  const originalMinHeight=viewport.style.minHeight;let expanded=false;
  const obstacleSelectors='.view-heading,.camera-hud,.tour-orientation,.view-tools,.tour-rail,#tourDiagram,.lower-scene-tools,.vb-scene-tools,.vb-legend,.vb-source-inset,.ln-inset,.ln-tracer,.vessel-inset,.vessel-tracer,.orbit-lock,.gesture-hint,.search-detail';
  let dirty=true,signature='',rects=[],width=0,height=0,overlayRect,canvasRect,previousVisible='',observed=[],layoutPaging=false,obstaclesObserved=new Set();
  const observer=new ResizeObserver(()=>dirty=true);
  observer.observe(viewport);
  const mutation=new MutationObserver(records=>{if(records.some(r=>!overlay.contains(r.target)&&!svg.contains(r.target))) dirty=true;});
  mutation.observe(viewport,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class','style']});
  window.addEventListener('resize',()=>dirty=true,{signal:life.signal});
  window.addEventListener('orientationchange',()=>dirty=true,{signal:life.signal});
  window.addEventListener('scroll',()=>dirty=true,{passive:true,signal:life.signal});
  window.visualViewport?.addEventListener('resize',()=>dirty=true,{signal:life.signal});
  window.visualViewport?.addEventListener('scroll',()=>dirty=true,{signal:life.signal});
  document.addEventListener('fullscreenchange',()=>dirty=true,{signal:life.signal});
  function reset() {
    dirty=true; signature=''; previousVisible='';
    observed.forEach(card=>observer.unobserve(card));observed=getPins().map(p=>p.card);
    observed.forEach(card=>observer.observe(card));
  }
  function update() {
    const pins=getPins(),state=getState();
    if (!pins.length) { onPaging(false); return; }
    if (dirty) {
      width=overlay.clientWidth;height=overlay.clientHeight;
      if (!width || !height) return;
      overlayRect=overlay.getBoundingClientRect();canvasRect=canvas.getBoundingClientRect();
      svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
      const elements=[...viewport.querySelectorAll(obstacleSelectors)].filter(e=>!e.hidden && e.getClientRects().length),next=new Set(elements);
      for(const element of obstaclesObserved)if(!next.has(element))observer.unobserve(element);
      for(const element of next)if(!obstaclesObserved.has(element))observer.observe(element);
      obstaclesObserved=next;
      rects=elements.map(e=>localRect(e.getBoundingClientRect(),overlayRect,width,height));
      dirty=false;signature='';
    }
    const compact=width<760,cardWidth=compact?Math.min(310,width-24):Math.min(260,Math.max(210,width*.23));
    const projected=pins.map(pin=>{
      // Store the anchor in mesh-local space so nested parents, comparison
      // translations and later transforms cannot detach its pointer.
      if (pin.mesh && pin.localPosition) world.copy(pin.localPosition).applyMatrix4(pin.mesh.matrixWorld);
      else world.copy(pin.position);
      return {...pin,...projectAnchor(world,camera,canvasRect,overlayRect,width,height,scratch)};
    });
    const active=projected.filter(p=>state.labels && p.mesh?.visible && p.visible);
    let paging=compact,visible=compact?active.filter(p=>p.index===state.pin):active;
    // Limit the reserved focus rectangle: anatomy may fill the screen, but the
    // central teaching target stays unobscured; callouts use peripheral space.
    const focusPoint=projectAnchor(focusAnchor,camera,canvasRect,overlayRect,width,height,scratch);
    const focus={left:focusPoint.x-width*.16,top:focusPoint.y-height*.14,width:width*.32,height:height*.28};
    function layout(items,maxHeight=compact?190:Math.max(120,Math.min(270,height*.34))) {
      for (const p of items) {
        p.card.style.setProperty('width',cardWidth+'px','important');
        p.card.style.setProperty('max-height',maxHeight+'px','important');
        p.card.hidden=false;
      }
      const targets=active.map(p=>({left:p.x-28,top:p.y-28,width:56,height:56}));
      return placeCards(items.map(p=>({id:p.index,width:cardWidth,height:p.card.offsetHeight,y:p.y})),width,height,[...rects,...targets],focus,{compact});
    }
    const key=active.map(p=>[p.index,Math.round(p.x/20),Math.round(p.y/20)].join(':')).join(',')+'|'+state.pin+'|'+cardWidth+'|'+Math.round(focusPoint.x/20)+','+Math.round(focusPoint.y/20);
    // Camera orbit changes pointer endpoints every frame. Card packing only runs
    // on a changed layout, preventing continuous read/write layout thrashing.
    if (key!==signature) {
      for(const p of projected) p.card.hidden=true;
      let boxes=layout(visible);
      if (!boxes && visible.length>1) { paging=true;visible=active.filter(p=>p.index===state.pin);boxes=layout(visible); }
      if (!boxes) { paging=true;visible=active.filter(p=>p.index===state.pin);for(const h of [150,120,96]){boxes=layout(visible,h);if(boxes)break;} }
      if (!boxes && width>=240 && height<1600 && active.length) {
        // At enlarged text sizes, create reading space rather than covering the
        // anatomy. ResizeObserver updates camera aspect and reruns the packing.
        viewport.style.minHeight=Math.min(1600,height+160)+'px';expanded=true;
        projected.forEach(p=>p.card.hidden=true);signature='';previousVisible='';return;
      }
      if (!boxes) { visible=[];boxes=[]; }
      const byIndex=new Map(boxes.map(b=>[b.id,b]));
      for(const p of projected) {
        const b=byIndex.get(p.index);p.card.hidden=!b;p.layout=b;
        if(b) { p.card.style.setProperty('left',b.left+'px','important');p.card.style.setProperty('top',b.top+'px','important');p.card.style.setProperty('bottom','auto','important');const scrollable=p.card.scrollHeight>p.card.clientHeight;p.card.dataset.scrollable=String(scrollable);p.card.tabIndex=scrollable?0:-1; }
        // Keep the live pin object, rather than the temporary projection record.
        pins[p.index].layout=b;
      }
      previousVisible=boxes.map(b=>b.id).join(',');signature=key;layoutPaging=paging;
    } else visible=active.filter(p=>previousVisible.split(',').includes(String(p.index)));
    onPaging(layoutPaging);
    for(const p of projected) {
      const enabled=state.labels&&p.mesh?.visible&&p.visible,b=pins[p.index].layout;
      if(p.dot.hidden===enabled)p.dot.hidden=!enabled;const hide=!(enabled&&b);if(p.card.hidden!==hide)p.card.hidden=hide;p.line.style.display=enabled&&b?'':'none';
      if(!enabled) continue;
      p.dot.style.left=p.x+'px';p.dot.style.top=p.y+'px';
      if(b){const end=cardEdge(p,b);p.line.setAttribute('x1',end.x);p.line.setAttribute('y1',end.y);p.line.setAttribute('x2',p.x);p.line.setAttribute('y2',p.y);}
    }
  }
  return {reset,update,setFocus(point){focusAnchor.copy(point);signature='';},invalidate(){dirty=true;},dispose(){life.abort();observer.disconnect();mutation.disconnect();overlay.replaceChildren();svg.replaceChildren();if(expanded)viewport.style.minHeight=originalMinHeight;}};
}
