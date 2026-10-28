export const PART_COLORS=['#61cfdf','#f5bf67','#ef697c'];
export function layoutPins(pins,width,height){
 const w=Math.min(252,Math.max(150,width*.245)),top=132,bottom=Math.max(top,height-202);
 const lanes=[[],[]];pins.forEach((p,i)=>lanes[i%2].push({...p,index:i}));
 const result=[];
 lanes.forEach((lane,side)=>{lane.sort((a,b)=>a.y-b.y);const total=lane.reduce((n,p)=>n+(p.height||110),0)+14*Math.max(0,lane.length-1);let y=Math.max(top,Math.min(bottom-total,lane.reduce((n,p)=>n+p.y,0)/Math.max(1,lane.length)-total/2));lane.forEach(p=>{result.push({...p,left:side?width-w-22:22,top:y,width:w,side});y+=(p.height||110)+14;});});
 return result.sort((a,b)=>a.index-b.index);
}
