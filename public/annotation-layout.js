export function overlaps(a,b,gap=0) {
  return a.left < b.left+b.width+gap && a.left+a.width+gap > b.left
    && a.top < b.top+b.height+gap && a.top+a.height+gap > b.top;
}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Screen rectangles are CSS pixels in the annotation overlay, never drawing-
// buffer pixels. DevicePixelRatio changes render sharpness, not label geometry.
export function localRect(rect,overlay,width,height) {
  const sx=width/overlay.width,sy=height/overlay.height;
  return {left:(rect.left-overlay.left)*sx,top:(rect.top-overlay.top)*sy,width:rect.width*sx,height:rect.height*sy};
}
export function projectAnchor(point,camera,canvasRect,overlayRect,width,height,scratch) {
  scratch.copy(point).applyMatrix4(camera.matrixWorldInverse);
  if (scratch.z >= -camera.near) return {visible:false,x:0,y:0};
  scratch.copy(point).project(camera);
  const clientX=canvasRect.left+(scratch.x+1)*canvasRect.width/2;
  const clientY=canvasRect.top+(1-scratch.y)*canvasRect.height/2;
  return {
    x:(clientX-overlayRect.left)*width/overlayRect.width,
    y:(clientY-overlayRect.top)*height/overlayRect.height,
    visible:scratch.z>=-1 && scratch.z<=1 && Math.abs(scratch.x)<=1 && Math.abs(scratch.y)<=1
  };
}
export function cardEdge(point,rect) {
  const candidates=[
    {x:rect.left,y:clamp(point.y,rect.top+8,rect.top+rect.height-8)},
    {x:rect.left+rect.width,y:clamp(point.y,rect.top+8,rect.top+rect.height-8)},
    {x:clamp(point.x,rect.left+8,rect.left+rect.width-8),y:rect.top},
    {x:clamp(point.x,rect.left+8,rect.left+rect.width-8),y:rect.top+rect.height}
  ];
  return candidates.reduce((a,b)=>(a.x-point.x)**2+(a.y-point.y)**2 < (b.x-point.x)**2+(b.y-point.y)**2 ? a:b);
}
// Deterministic rectangle packing with reserved controls, focus, and tour rail.
// When text cannot fit, the caller uses one navigable callout instead of hiding
// information or allowing cards to overlap. Every visible card has a free box.
export function placeCards(cards,width,height,obstacles=[],focus=null,{compact=false}={}) {
  const margin=12,gap=12,result=[],blocked=focus?[...obstacles,focus]:[...obstacles];
  for (const card of cards) {
    const w=Math.min(card.width,width-margin*2),h=Math.min(card.height,height-margin*2);
    const xs=compact?[margin,(width-w)/2,width-w-margin]:[width-w-48,margin,width-w-margin,(width-w)/2];
    const ys=[...new Set([card.y-h/2,132,height-h-210,...blocked.flatMap(r=>[r.top-h-gap,r.top+r.height+gap]),...result.map(r=>r.top+r.height+gap)])]
      .map(y=>clamp(y,margin,height-h-margin));
    const candidates=[];
    for (const left of xs) for (const top of ys) {
      const rect={left:clamp(left,margin,width-w-margin),top,width:w,height:h,id:card.id};
      if (!blocked.some(b=>overlaps(rect,b,gap))) candidates.push(rect);
    }
    candidates.sort((a,b)=>Math.abs(a.top-card.y)*.3+Math.abs(a.left-(width-w-48))
      -(Math.abs(b.top-card.y)*.3+Math.abs(b.left-(width-w-48))));
    const best=candidates[0];
    if (!best) return null;
    result.push(best);blocked.push(best);
  }
  return result;
}
