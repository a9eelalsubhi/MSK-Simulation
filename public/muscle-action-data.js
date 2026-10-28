// No Three.js objects in this module: the same contract is checked at build time
// and before the action UI is enabled. Mesh bindings belong to each lecture.
export const OPPOSITE = Object.freeze({flex:'extend',extend:'flex',abduct:'adduct',adduct:'abduct',internal:'external',external:'internal',dorsi:'plantar',plantar:'dorsi',invert:'evert',evert:'invert',pronate:'supinate',supinate:'pronate',elevate:'depress',depress:'elevate',protract:'retract',retract:'protract',upward:'downward',downward:'upward',oppose:'reposition',reposition:'oppose',writing:'writing_release'});
export function actionRelationships(entry, action, catalog) {
  const matches = movement => catalog.filter(other => other.muscle_id!==entry.muscle_id &&
    !other.mesh_names.some(n=>entry.mesh_names.includes(n)) &&
    other.action_section.primary_actions.some(a => a.joint_id===action.joint_id && a.movement_id===movement &&
      (!action.digits || a.digits?.some(d=>action.digits.includes(d)))));
  return {synergists:matches(action.movement_id),antagonists:matches(OPPOSITE[action.movement_id])};
}
export function validateMuscleActions(data, byName, catalog) {
  if(!data.muscles) return true;
  const errors=[],ids=new Set(),refIds=new Set(Object.keys(catalog?.references||{}));
  for(const m of data.muscles) {
    if(!/^[a-z][a-z0-9_]*$/.test(m.muscle_id)||ids.has(m.muscle_id)) errors.push('Duplicate/invalid muscle_id: '+m.muscle_id);
    ids.add(m.muscle_id);
    if(!m.name_en||!m.name_ar||!m.mesh_names?.length) errors.push(m.muscle_id+': names/meshes missing');
    for(const name of m.mesh_names||[]) if(byName&&!byName.has(name)) errors.push('Missing action mesh: '+name);
    for(const [name,component] of Object.entries(m.mesh_components||{})){
      if(!m.mesh_names.includes(name)||!['belly','toe_tendon'].includes(component.kind)||!component.label)errors.push(m.muscle_id+': invalid mesh component '+name);
      if(component.kind==='toe_tendon'&&(!component.digits?.length||component.digits.some(d=>!Number.isInteger(d)||d<1||d>5)))errors.push(m.muscle_id+': invalid tendon digits');
    }
    const section=m.action_section;
    if(!section?.primary_actions?.length||JSON.stringify(section)!==JSON.stringify(m.action_details)) errors.push(m.muscle_id+': inconsistent action schema');
    for(const a of [...(section?.primary_actions||[]),...(section?.secondary_actions||[])]) {
      if(!a.joint_id?.endsWith('_right')||!a.joint||!a.joint_ar||!a.movement_ar||!OPPOSITE[a.movement_id]||!a.description||typeof a.direct!=='boolean') errors.push(m.muscle_id+': incomplete joint action');
      if(a.digits?.some(d=>!Number.isInteger(d)||d<1||d>5)) errors.push(m.muscle_id+': invalid toe');
    }
    const anim=section?.animation_trigger;
    if(!anim||anim.has_3d_animation!==true||anim.animation_mode!=='procedural_joint_motion'||anim.animation_clip_name!==m.muscle_id+'_action_clip') errors.push(m.muscle_id+': unsupported animation contract');
    const joints=[...new Set(section?.primary_actions?.map(a=>a.joint_id)||[])];
    if(JSON.stringify(anim?.target_joints)!==JSON.stringify(joints)) errors.push(m.muscle_id+': animation joints mismatch');
    if(catalog) {
      const source=catalog.muscles.find(e=>e.muscle_id===m.muscle_id);
      if(!source||JSON.stringify(source.action_section)!==JSON.stringify(section)) errors.push(m.muscle_id+': stale catalog mapping');
      for(const id of section.reference_ids||[]) if(!refIds.has(id)) errors.push('Unknown action reference '+id);
      for(const rel of ['synergists','antagonists']) for(const id of section.synergists_antagonists?.[rel+'_ids']||[]) if(!catalog.muscles.some(e=>e.muscle_id===id)) errors.push('Unknown cooperating muscle '+id);
    }
  }
  if(errors.length) throw Error('Muscle action validation failed:\n'+errors.join('\n'));
  return true;
}

