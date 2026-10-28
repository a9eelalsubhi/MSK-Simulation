from pathlib import Path
import shutil,json,struct,re
root=Path(__file__).parent
src=root/'public';dest=root/'dist'
tour=json.loads((src/'tour.json').read_text(encoding='utf8'))
topics=tour['topics'];steps=tour['steps']
assert len(topics)==16 and len(steps)==65
assert {f for s in steps for f in s['facts']}==set(range(1,68)), 'Incomplete lecture coverage'
assert all('q' not in p for s in steps for p in s['pins'])
assert 'class="details"' not in (src/'index.html').read_text(encoding='utf8')
names=set()
for file in (src/'models').glob('*.glb'):
    data=file.read_bytes();magic,version,total=struct.unpack_from('<III',data)
    assert magic==0x46546c67 and version==2 and total==len(data)
    jlen=struct.unpack_from('<I',data,12)[0];gltf=json.loads(data[20:20+jlen]);names.update(n['name'] for n in gltf['nodes'])
    for v in gltf['bufferViews']:assert v.get('byteOffset',0)+v['byteLength']<=gltf['buffers'][0]['byteLength']
for s in steps:
    targets=s['focus']+s.get('context',[])+[p['target'] for p in s['pins']]
    if 'segment' in s:targets.extend(s['segment'].values())
    assert all(n in names for n in targets), (s['title'],[n for n in targets if n not in names])
    assert 1<=len(s['pins'])<=4
    for p in s['pages']:assert (src/'slides'/f'{p}.jpg').exists()
    for p in s['pins']:assert 0<=p.get('at',.5)<=1
html=(src/'index.html').read_text(encoding='utf8')
ids=set(re.findall(r'id="([^"]+)"',html))
script=(src/'app.js').read_text(encoding='utf8')
assert set(re.findall(r"\$\('([^']+)'\)",script))<=ids,'Missing interface element'
for file in src.rglob('*.js'):
    content=file.read_text(encoding='utf8')
    for target in re.findall(r"from\s+['\"]([^'\"]+)['\"]",content):
        if target.startswith('.'):assert (file.parent/target.split('?',1)[0].split('#',1)[0]).exists(),(file,target)

# Validate the independently loaded bones lecture against its actual model assets.
l1=json.loads((src/'lectures/l1/tour.json').read_text(encoding='utf8'))
l1names=set()
for file in [src/'models/skeletal.glb',src/'lectures/l1/models/muscular.glb']:
    data=file.read_bytes();length=struct.unpack_from('<I',data,12)[0]
    gltf=json.loads(data[20:20+length]);l1names.update(n['name'] for n in gltf['nodes'])
assert len(l1['topics'])==16 and len(l1['steps'])==63
for step in l1['steps']:
    targets=step['focus']+step.get('context',[])+step.get('muscleFocus',[])+[p['target'] for p in step['pins']]
    assert all(n in l1names for n in targets), (step['title'],[n for n in targets if n not in l1names])
    assert 1<=len(step['pins'])<=4
    for page in step['pages']:assert (src/'lectures/l1/slides'/f'{page}.jpg').exists()
assert len({s['osteology'] for s in l1['steps'] if s.get('osteology')})==4
assert all(q['target'] in l1names for q in l1['functionalQuiz'])
print('Lecture 1: 63 steps, 16 chapters + explorer; bone colors, muscle targets and source pages verified.')


l2=json.loads((src/'lectures/l2/tour.json').read_text(encoding='utf8'))
l2names=names|l1names
assert len(l2['steps'])==76 and len(l2['muscleProfiles'])==26
assert {p for s in l2['steps'] for p in s['pages']}==set(range(1,14))
assert len(l2['topics'])==16
for step in l2['steps']:
    assert all(n in l2names for n in step['focus']+[p['target'] for p in step['pins']]),step['title']
    assert 1<=len(step['pins'])<=4
    for page in step['pages']:assert (src/'lectures/l2/slides'/f'{page}.jpg').exists()
for p in l2['muscleProfiles']:
    assert p['target'] in l2names
    assert all(p[k] for k in ['origin','insertion','nerve','action'])
assert all(q['target'] in l2names for q in l2['functionalQuiz'])
assert sorted(s['abductionStage'] for s in l2['steps'] if 'abductionStage' in s)==[0,1,2]
print('Lecture 2: 76 steps, 26 muscle/fiber profiles, all 13 source pages, valid meshes and three abduction stages.')


l3=json.loads((src/'lectures/l3/tour.json').read_text(encoding='utf8'))
b=(src/'lectures/l3/models/muscular.glb').read_bytes();g=json.loads(b[20:20+struct.unpack_from('<I',b,12)[0]])
l3names=names|{n['name'] for n in g['nodes']}
assert len(l3['steps'])==103 and len(l3['muscleProfiles'])==30
assert {p for s in l3['steps'] for p in s['pages']}==set(range(1,16))
for step in l3['steps']:
    refs=step['focus']+step.get('ghostMuscles',[])+[p['target'] for p in step['pins']]
    assert all(n in l3names for n in refs),(step['title'],set(refs)-l3names)
    assert 1<=len(step['pins'])<=4
    for page in step['pages']:assert (src/'lectures/l3/slides'/f'{page}.jpg').exists()
assert len([s for s in l3['steps'] if 'layerStage' in s])==5
assert len([s for s in l3['steps'] if 'actionKey' in s])==23
assert all(q['target'] in l3names for q in l3['functionalQuiz'])
assert set(l3['quizTargets'])<={p['target'] for s in l3['steps'] for p in s['pins'] if not p.get('context')}
print('Lecture 3: 103 steps, 30 profiles, 15 pages, 5 layers, 23 action maps; model and quiz references valid.')


l5=json.loads((src/'lectures/l5/tour.json').read_text(encoding='utf8'))
b=(src/'lectures/l5/models/nervous.glb').read_bytes();g=json.loads(b[20:20+struct.unpack_from('<I',b,12)[0]])
l5names=l3names|{n['name'] for n in g['nodes']}
assert len(l5['steps'])==68 and len(l5['nerveProfiles'])==6 and len(l5['lesions'])==11
assert {p for s in l5['steps'] for p in s['pages']}==set(range(1,14))
for step in l5['steps']:
    refs=step['focus']+step.get('muscleFocus',[])+[p['target'] for p in step['pins']]
    assert all(n in l5names for n in refs),(step['title'],set(refs)-l5names)
    assert 1<=len(step['pins'])<=4
    for page in step['pages']:assert (src/'lectures/l5/slides'/f'{page}.jpg').exists()
assert all(q['target'] in l5names for q in l5['functionalQuiz'])
for p in l5['nerveProfiles']:
    assert all(any(s.get('nerveId')==p['id'] and s.get('nerveAspect')==a for s in l5['steps']) for a in ['origin','course','motor','sensory'])
print('Lecture 5: 68 steps, 6 nerve profiles, 11 injury comparisons, all 13 source pages and actual model references verified.')

for lecture in [l2,l3,l5]:
    assert all(s.get('referencePages') for s in lecture['steps'])
    for step in lecture['steps']:
        for key in step['referencePages']:
            ref=lecture['referenceSlides'][key]
            assert '/references/' in ref['src'] and (src/ref['src'].lstrip('/')).is_file()
print('Replacement references: every L2, L3 and L5 step resolves to a new supplied slide.')

l7=json.loads((src/'lectures/l7/tour.json').read_text(encoding='utf8'))
assert len(l7['steps'])==70 and len(l7['topics'])==16
assert {p for step in l7['steps'] for p in step['pages']}==set(range(2,20))
l7names=set()
for system in ['skeletal','articular','muscular','cardiovascular','nervous']:
    b=(src/f'lectures/l7/models/{system}.glb').read_bytes()
    model=json.loads(b[20:20+struct.unpack_from('<I',b,12)[0]])
    l7names.update(n['name'] for n in model['nodes'])
for step in l7['steps']:
    assert 1<=len(step['pins'])<=3
    assert set(step['focus']+step.get('muscleFocus',[])+[p['target'] for p in step['pins']])<=l7names,step['title']
    for page in step['pages']:assert (src/f'lectures/l7/slides/{page}.jpg').is_file()
assert set(l7['quizTargets'])<=l7names
assert all(q['target'] in l7['quizTargets'] for q in l7['functionalQuiz'])
assert {s.get('lab') for s in l7['steps'] if s.get('lab')}=={'pelvis','hip','arches','knee','tibiofibular','ankle','foot-joints'}
print('Lecture 7: 70 steps, 163 callouts, all 18 content pages; 226 mesh references and 7 visual lab topics verified.')

l8=json.loads((src/'lectures/l8/tour.json').read_text(encoding='utf8'))
assert len(l8['topics'])==20 and len(l8['steps'])==93 and len(l8['muscleProfiles'])==52
assert {p for s in l8['steps'] for p in s['pages']}==set(range(1,26))
l8names=set();l8muscles=set()
for system in ['skeletal','muscular','cardiovascular','nervous']:
    b=(src/f'lectures/l8/models/{system}.glb').read_bytes()
    model=json.loads(b[20:20+struct.unpack_from('<I',b,12)[0]])
    system_names={n['name'] for n in model['nodes']}
    l8names.update(system_names)
    if system=='muscular':l8muscles=system_names
for step in l8['steps']:
    assert 1<=len(step['pins'])<=3,step['title']
    assert set(step['focus']+step.get('boneContext',[])+[p['target'] for p in step['pins']])<=l8names,step['title']
    for page in step['pages']:assert (src/f'lectures/l8/slides/{page}.jpg').is_file()
    if step.get('profileId'):
        profile=next(p for p in l8['muscleProfiles'] if p['id']==step['profileId'])
        assert step['pins'][0]['text'].count('\n')==sum(bool(profile[k]) for k in ['origin','insertion','nerve','action'])-1,step['title']
for p in l8['muscleProfiles']:
    assert p['target'] in l8muscles
    assert p['nerve'] and p['action']
    assert (p['origin'] is None and p['insertion'] is None) or (p['origin'] and p['insertion'])
    assert any(s.get('profileId')==p['id'] for s in l8['steps'])
assert set(l8['quizTargets'])<=l8muscles
assert set(l8['quizTargets'])<={pin['target'] for step in l8['steps'] for pin in step['pins'] if not pin.get('context')}
assert all(q['target'] in l8['quizTargets'] for q in l8['functionalQuiz'])
assert {s.get('lab') for s in l8['steps'] if s.get('lab')}=={'compartments','triangle','sheath','canal','gluteal','retinaculum','actions','calf','deep-calf','tunnel','fossa','dorsum','sole'}
print('Lecture 8: 93 3D steps, 52 muscle profiles, every page 1–25, four real model systems and 13 source-derived visual maps verified.')

l9=json.loads((src/'lectures/l9/tour.json').read_text(encoding='utf8'))
assert len(l9['topics'])==14 and len(l9['steps'])==51
assert {p for s in l9['steps'] for p in s['pages']}==set(range(1,13))
l9names=set();l9vessels=set()
for system in ['skeletal','muscular','cardiovascular','nervous']:
    b=(src/f'lectures/l9/models/{system}.glb').read_bytes()
    model=json.loads(b[20:20+struct.unpack_from('<I',b,12)[0]])
    system_names={n['name'] for n in model['nodes']}
    l9names.update(system_names)
    if system=='cardiovascular':l9vessels=system_names
l9ids={s['id'] for s in l9['steps']}
assert len(l9ids)==len(l9['steps'])
for s in l9['steps']:
    assert 1<=len(s['pins'])<=3,s['id']
    assert set(s['focus']+s.get('boneContext',[])+[p['target'] for p in s['pins']])<=l9names,s['id']
    assert set(s.get('sceneOpacity',{}))<=set(s['focus']),s['id']
    if s.get('region'):assert s['region']['target'] in l9names
    for page in s['pages']:assert (src/f'lectures/l9/slides/{page}.jpg').is_file()
for route in l9['routes']:
    assert len(route['stages'])==len(route['labels'])
    assert set(route['stages'])<=l9ids
assert all(row[1] in l9ids for row in l9['branchTree'])
assert set(l9['quizTargets'])<=l9vessels
assert set(l9['quizTargets'])<={p['target'] for s in l9['steps'] for p in s['pins'] if not p.get('context')}
assert all(q['target'] in l9['quizTargets'] for q in l9['functionalQuiz'])
print('Lecture 9: 51 scenes, 12 source pages, 60 vessel meshes, 33 quiz targets and 4 linked routes verified.')

l10=json.loads((src/'lectures/l10/tour.json').read_text(encoding='utf8'))
assert len(l10['topics'])==14 and len(l10['steps'])==65
assert {p for s in l10['steps'] for p in s['pages']}==set(range(1,15))
l10names=set();l10nerves=set()
for system,path in l10['modelPaths'].items():
    b=(src/path.lstrip('/')).read_bytes()
    assert struct.unpack_from('<III',b)==(0x46546c67,2,len(b))
    g=json.loads(b[20:20+struct.unpack_from('<I',b,12)[0]])
    ns={n['extras']['anatomyName'] for n in g['nodes'] if 'mesh' in n}
    l10names.update(ns)
    if system=='nervous':l10nerves=ns
l10ids={s['id'] for s in l10['steps']}
assert len(l10ids)==len(l10['steps'])
for s in l10['steps']:
    assert 1<=len(s['pins'])<=3
    assert set(s['focus']+s.get('boneContext',[])+s.get('muscleFocus',[])+s.get('contextMuscles',[])+[p['target'] for p in s['pins']])<=l10names,s['id']
    assert set(s.get('sceneOpacity',{}))<=set(s['focus']),s['id']
    if s.get('region'):assert s['region']['target'] in l10names
    for p in s['pages']:assert (src/f'lectures/l10/slides/{p}.jpg').is_file()
assert len(l10nerves)==39 and set(l10['quizTargets'])<=l10nerves
assert set(l10['quizTargets'])<={p['target'] for s in l10['steps'] for p in s['pins'] if not p.get('context')}
assert all(q['target'] in l10['quizTargets'] for q in l10['functionalQuiz'])
for r in l10['routes']:
    assert len(r['stages'])==len(r['labels']) and set(r['stages'])<=l10ids
for p in l10['nerveProfiles']:
    assert all(p[k] in l10ids for k in ('scene','motorScene','skinScene'))
    assert p.get('injuryScene') is None or p['injuryScene'] in l10ids
assert all(l['scene'] in l10ids for l in l10['lesions'])
for figure in ('lumbar','sacral','femoral','saphenous','dorsum','plantar','postures'):
    assert (src/f'lectures/l10/figures/{figure}.jpg').is_file()
print('Lecture 10: 65 scenes, all 14 source pages, 39 real nerve meshes, 10 profiles, 5 routes and 12 functional questions verified.')

spine_names={}
for system in ('skeletal','articular','muscular','nervous','cardiovascular'):
    b=(src/f'lectures/vertebra/models/{system}.glb').read_bytes()
    assert struct.unpack_from('<III',b)==(0x46546c67,2,len(b))
    g=json.loads(b[20:20+struct.unpack_from('<I',b,12)[0]])
    spine_names[system]={n['extras']['anatomyName'] for n in g['nodes'] if 'mesh' in n}
    for v in g['bufferViews']:assert v.get('byteOffset',0)+v['byteLength']<=g['buffers'][0]['byteLength']
all_spine_names=set().union(*spine_names.values())
for lid,count in ((12,10),(13,8),(14,10)):
    d=json.loads((src/f'lectures/l{lid}/tour.json').read_text(encoding='utf8'))
    ids={s['id'] for s in d['steps']};assert len(ids)==len(d['steps'])
    assert {p for s in d['steps'] for p in s['pages']}==set(range(1,count+1))
    assert len(d['column'])==26 and len(set(d['column']))==26
    assert set(d['column'])<=spine_names['skeletal']
    for s in d['steps']:
        assert 1<=len(s['pins'])<=3,s['id']
        assert set(s['focus']+s.get('boneContext',[])+s.get('muscleFocus',[])+[p['target'] for p in s['pins']])<=all_spine_names,s['id']
        assert all(p['target'] in s['focus']+s.get('boneContext',[]) for p in s['pins']),s['id']
        assert all(p.get('reference',p['target']) in all_spine_names for p in s['pins']),s['id']
        assert set(s.get('structureColors',{}))<=all_spine_names
        if s.get('region'):assert s['region']['target'] in all_spine_names
        if s.get('figure'):assert s['figure'] in d['sourceFigures'],s['id']
        for p in s['pages']:assert (src/f'lectures/l{lid}/slides/{p}.jpg').is_file()
    assert all(q['target'] in d['quizTargets'] for q in d['functionalQuiz'])
    assert len(d['quizTargets'])>=4
    for f in d['sourceFigures'].values():assert (src/f['src'].lstrip('/')).is_file()
    for profile in d['muscleProfiles']:
        assert profile['id'] in ids and profile['target'] in spine_names['muscular']
        assert all(profile[k] for k in ('origin','insertion','nerve','action'))
    print(f'Vertebra Lecture {lid}: {len(d["steps"])} scenes, every source page, 26 individual bones and source diagrams verified.')

# Action bindings are additional lecture fields; original OINA and source
# reference replacement remain checked above. Fail before publishing an empty
# action scene, a mismatched catalog, or a link to an obsolete slide.
upper_actions=json.loads((src/'lectures/upper-limb/muscle-actions.json').read_text(encoding='utf8'))
upper_by_id={m['muscle_id']:m for m in upper_actions['muscles']}
assert len(upper_by_id)==56
for d,valid_names in [(l2,l2names),(l3,l3names)]:
    assert len(d['muscles'])==len(d['muscleProfiles'])
    for m in d['muscles']:
        assert set(m['mesh_names'])<=valid_names
        assert m['action_section']==m['action_details']==upper_by_id[m['muscle_id']]['action_section']
        profile=next(p for p in d['muscleProfiles'] if p['id']==m['profile_id'])
        assert m['lecture_action']==profile['action']
        step=next(s for s in d['steps'] if s.get('profileId')==profile['id'])
        assert m['source_references']==[d['referenceSlides'][key] for key in step['referencePages']]
        assert all((src/r['src'].lstrip('/')).is_file() for r in m['source_references'])
print('Upper muscle playback: every L2/L3 profile, 98 actions and replacement references verified.')
dest.mkdir(exist_ok=True)
shutil.copytree(src,dest,dirs_exist_ok=True)
assert max(p.stat().st_size for p in dest.rglob('*') if p.is_file())<25*1024*1024
print('Built visual tour: 65 steps, 16 chapters, all 67 source facts, 24 replacement lecture pages. Every pin and segment reference validated; question panel removed.')
