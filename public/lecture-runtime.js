// A lecture is a document-sized scene. Navigation deliberately replaces the
// document rather than retaining twelve renderers / model trees in a SPA cache.
export const LECTURE_IDS = ['1','2','3','4','5','7','8','9','10','12','13','14'];
export function resolveLecture(search) {
  const id = new URLSearchParams(search).get('lecture');
  return LECTURE_IDS.includes(id) ? id : '4';
}
export function lectureModelPaths(id, data) {
  const spine = ['12','13','14'].includes(id), lower = ['7','8','9','10'].includes(id);
  const systems = spine ? data.systems : id === '7'
    ? ['skeletal','articular','cardiovascular','muscular','nervous']
    : ['skeletal','cardiovascular','muscular','nervous'];
  return systems.map(system => {
    let base = lower ? `/lectures/l${id}` : '';
    if (id === '5' && system === 'nervous') base = '/lectures/l5';
    if (['1','2','3','5'].includes(id) && system === 'muscular')
      base = ['3','5'].includes(id) ? '/lectures/l3' : '/lectures/l1';
    return {system, path:data.modelPaths?.[system] || `${base}/models/${system}.glb`};
  });
}
export function lectureTargets(data) {
  const names = new Set();
  // Action inspection reuses the active lecture's existing muscle assets.
  for (const muscle of data.muscles || []) for (const name of muscle.mesh_names) names.add(name);
  for (const s of data.steps) {
    for (const key of ['focus','context','boneContext','muscleFocus','ghostMuscles','contextMuscles'])
      for (const name of s[key] || []) names.add(name);
    for (const pin of s.pins) { names.add(pin.target); if (pin.reference) names.add(pin.reference); }
    if (s.region?.target) names.add(s.region.target);
    for (const name of Object.values(s.segment || {})) names.add(name);
  }
  return names;
}
// Fail before enabling interaction. A context annotation still needs a valid
// parent mesh; it must not silently masquerade as independently modeled anatomy.
export function validateLecture(data, byName) {
  const errors = [], topics = new Set(), ids = new Set();
  for (const topic of data.topics || []) {
    if (!topic.id || topics.has(topic.id)) errors.push(`Duplicate/missing chapter: ${topic.id}`);
    topics.add(topic.id);
  }
  for (const [index,s] of (data.steps || []).entries()) {
    const label = s.id || `step ${index+1}`;
    if (s.id && ids.has(s.id)) errors.push(`Duplicate step: ${s.id}`);
    if (s.id) ids.add(s.id);
    if (!topics.has(s.topic)) errors.push(`${label}: unknown chapter ${s.topic}`);
    if (!s.title || !s.focus?.length || !s.pins?.length || !s.pages?.length)
      errors.push(`${label}: missing teaching content`);
    for (const [i,p] of (s.pins || []).entries()) {
      if (!p.name || !p.text || !p.target) errors.push(`${label}/pin ${i+1}: incomplete annotation`);
      if (p.at != null && (!Number.isFinite(p.at) || p.at < 0 || p.at > 1)) errors.push(`${label}: invalid anchor fraction`);
      if (p.point && (p.point.length !== 3 || !p.point.every(Number.isFinite))) errors.push(`${label}: invalid anchor point`);
      if (p.axis && !['x','y','z'].includes(p.axis)) errors.push(`${label}: invalid axis`);
      if (p.segment != null && !s.segment) errors.push(`${label}: missing segment configuration`);
    }
  }
  if (!data.steps?.length) errors.push('Empty lecture');
  if (byName) {
    for (const name of lectureTargets(data)) if (!byName.has(name)) errors.push(`Missing mesh: ${name}`);
    const quiz = new Set(data.quizTargets || data.steps.flatMap(s => s.pins.filter(p=>!p.context).map(p=>p.target)));
    for (const name of quiz) if (!byName.has(name)) errors.push(`Missing quiz mesh: ${name}`);
    for (const q of data.functionalQuiz || []) {
      if (!quiz.has(q.target) || !byName.has(q.target) || !q.prompt || !q.explanation)
        errors.push(`Invalid quiz item: ${q.target}`);
    }
  }
  if (errors.length) throw new Error(`Lecture validation failed:\n${errors.join('\n')}`);
  return true;
}
export function createLifetime() {
  const controller = new AbortController(), cleanups = [];
  let disposed = false;
  return {
    signal: controller.signal,
    get disposed() { return disposed; },
    own(cleanup) { if (disposed) cleanup(); else cleanups.push(cleanup); },
    dispose() {
      if (disposed) return;
      disposed = true; controller.abort();
      // One failed feature cleanup must not keep the WebGL context alive.
      for (const cleanup of cleanups.reverse()) try { cleanup(); } catch (e) { console.error('Scene cleanup',e); }
      cleanups.length = 0;
    }
  };
}
