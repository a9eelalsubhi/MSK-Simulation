export const PART_COLORS={body:'#59d9d0',pedicle:'#ff7d9b',lamina:'#f1c75b',spinous:'#ff7d9b',transverse:'#aa9df1','superior-facet':'#76bafb','inferior-facet':'#76bafb','anterior-arch':'#59d9d0','posterior-arch':'#ff7d9b','lateral-mass':'#76bafb',dens:'#f1c75b'};
// Broad teaching regions on intact meshes, not segmented anatomical landmarks.
export function vertebraPart(name,[x,y,z]){
 const a=Math.abs(x-.5);
 if(name==='Atlas (C1)')return a>.33?'transverse':a>.15&&z>.25&&z<.76?'lateral-mass':z>.60?'anterior-arch':'posterior-arch';
 if(name==='Axis (C2)'&&y>.69&&a<.18&&z>.52)return 'dens';
 if(z>.66&&a<.31)return 'body';
 if(a>.32)return 'transverse';
 if(z<.2&&a<.20)return 'spinous';
 if(a>.15&&a<.32&&z>.30&&z<.62&&(y>.72||y<.20))return y>.5?'superior-facet':'inferior-facet';
 if(z>.46)return 'pedicle';
 return 'lamina';
}
export const LANDMARKS={body:[.5,.55,.85],pedicle:[.72,.5,.55],lamina:[.65,.5,.30],spinous:[.5,.45,.04],transverse:[.97,.5,.45],'superior-facet':[.72,.90,.43],'inferior-facet':[.72,.08,.43],foramen:[.5,.5,.48],notch:[.70,.25,.60],'anterior-arch':[.5,.5,.93],'posterior-arch':[.5,.5,.07],'lateral-mass':[.73,.7,.50],'artery-groove':[.77,.84,.27],'transverse-foramen':[.79,.55,.60],tubercle:[.87,.55,.69],dens:[.5,.97,.74],'costal-body':[.74,.77,.76],promontory:[.5,.97,.93],ala:[.92,.83,.67],'anterior-foramina':[.73,.59,.8],'posterior-foramina':[.73,.55,.15],crest:[.5,.60,.01],hiatus:[.5,.12,.17],auricular:[.95,.71,.39],tuberosity:[.8,.83,.14],cornua:[.78,.92,.25],s2:[.5,.74,.5]};
export function normalizePoint(p,min,max){return p.map((v,i)=>(v-min[i])/Math.max(1e-8,max[i]-min[i]));}
