"""Build the shared function catalog and lecture-local mesh bindings.

Original lecture OINA fields are preserved. Action refinements have their own
references and notes. No animation capability is inferred from a clip name.
"""
from pathlib import Path
import json, struct, copy

ROOT = Path(__file__).parent / 'public'
load = lambda path: json.loads(path.read_text(encoding='utf8'))
profiles = load(ROOT / 'lectures/l8/tour.json')['muscleProfiles']
REFERENCES = {
 'uams': {'title':'UAMS College of Medicine · Lower limb muscle table','url':'https://medicine.uams.edu/neuroscience/education/medical-school-courses/human-structure-module/anatomy-tables/muscle-tables/muscles-of-the-lower-limb/'},
 'loyola': {'title':'Loyola Stritch School of Medicine · Lower extremity muscle table','url':'https://www.stritch.luc.edu/lumen/meded/grossanatomy/homepage/muscletables/lowerextremitymuscletable.pdf'},
 'thigh': {'title':'McGraw Hill · The Big Picture: Gross Anatomy, Chapter 36','url':'https://accessmedicine.mhmedical.com/content.aspx?bookid=381&sectionid=40140047'},
 'gluteal': {'title':'McGraw Hill · The Big Picture: Gross Anatomy, Chapter 35','url':'https://accessmedicine.mhmedical.com/content.aspx?bookid=381&sectionid=40140046'},
 'edb': {'title':'Elsevier Complete Anatomy · Extensor digitorum brevis','url':'https://www.elsevier.com/resources/anatomy/muscular-system/muscles-of-lower-limb/extensor-digitorum-brevis/23982'},
 'ehb': {'title':'Elsevier Complete Anatomy · Extensor hallucis brevis','url':'https://www.elsevier.com/resources/anatomy/muscular-system/muscles-of-lower-limb/extensor-hallucis-brevis/18164'},
 'qp': {'title':'Elsevier Complete Anatomy · Quadratus plantae','url':'https://www.elsevier.com/resources/anatomy/muscular-system/muscles-of-lower-limb/quadratus-plantae-muscle/16690'}
}
JOINTS = {
 'hip': ('Hip Joint','مفصل الورك'), 'knee': ('Knee Joint','مفصل الركبة'),
 'ankle': ('Ankle Joint (talocrural)','مفصل الكاحل'),
 'hindfoot': ('Subtalar & transverse tarsal joints','المفاصل تحت الكاحل والرصغ المستعرضة'),
 'hallux_mtp': ('Great toe MTP Joint','المفصل المشطي السلامي لإبهام القدم'),
 'hallux_ip': ('Great toe IP Joint','المفصل بين سلاميات إبهام القدم'),
 'toes_mtp': ('Lesser toe MTP Joints','المفاصل المشطية السلامية لأصابع القدم'),
 'toes_pip': ('Lesser toe PIP Joints','المفاصل السلامية القريبة لأصابع القدم'),
 'toes_dip': ('Lesser toe DIP Joints','المفاصل السلامية البعيدة لأصابع القدم')
}
MOVES = {'flex':('Flexion','ثني'),'extend':('Extension','بسط'), 'abduct':('Abduction','تبعيد'), 'adduct':('Adduction','تقريب'), 'internal':('Medial rotation','دوران إنسي'), 'external':('Lateral rotation','دوران وحشي'), 'dorsi':('Dorsiflexion','ثني ظهري'), 'plantar':('Plantarflexion','ثني أخمصي'), 'invert':('Inversion','قلب القدم للداخل'), 'evert':('Eversion','قلب القدم للخارج')}

def action(joint, movement, description, digits=None, condition=None, indirect=False):
    en, ar = JOINTS[joint]; move_en, move_ar = MOVES[movement]
    result = dict(joint=en, joint_ar=ar, joint_id=joint+'_right', movement=move_en,
                  movement_ar=f'{move_ar} ({move_en})', movement_id=movement,
                  description=description, plane='transverse' if movement in ['internal','external'] else 'frontal' if movement in ['abduct','adduct','invert','evert'] else 'sagittal',
                  direct=not indirect)
    if digits: result['digits'] = digits
    if condition: result['condition'] = condition
    return result

H = lambda m: action('hip',m,{'flex':'Moves the thigh forward at the hip.','extend':'Moves the thigh backward at the hip.','abduct':'Moves the thigh away from the midline.','adduct':'Moves the thigh toward the midline.','internal':'Turns the thigh inward at the hip.','external':'Turns the thigh outward at the hip.'}[m])
K = lambda m: action('knee',m,{'flex':'Bends the knee.','extend':'Straightens the knee.','internal':'Rotates the tibia medially when the knee is flexed.','external':'Rotates the tibia laterally when the knee is flexed.'}[m],condition='Knee flexed' if m in ['internal','external'] else None)
A = lambda m: action('ankle',m,'Raises the forefoot toward the shin.' if m=='dorsi' else 'Points the foot away from the shin.')
F = lambda m: action('hindfoot',m,'Turns the sole medially.' if m=='invert' else 'Turns the sole laterally.')
def toes(m, digits, joints=('mtp','pip','dip'), indirect=False):
    return [action('toes_'+j,m,f'{"Assists" if indirect else "Produces"} {MOVES[m][0].lower()} of toes {", ".join(map(str,digits))} at the {j.upper()} joints.',digits,indirect=indirect) for j in joints]
def hallux(m, ip=True):
    return [action('hallux_mtp',m,f'{MOVES[m][0]} of the great toe at its MTP joint.',[1])] + ([action('hallux_ip',m,f'{MOVES[m][0]} of the great toe at its single IP joint.',[1])] if ip else [])

SPECS = [
 ('psoas','psoas_major','العضلة القطنية الكبيرة',[H('flex')]),
 ('iliacus','iliacus','العضلة الحرقفية',[H('flex')]),
 ('sartorius','sartorius','العضلة الخياطية',[H('flex'),H('abduct'),H('external'),K('flex')]),
 ('pectineus','pectineus','العضلة المشطية',[H('adduct'),H('flex')]),
 ('rectus','rectus_femoris','العضلة المستقيمة الفخذية',[H('flex'),K('extend')]),
 ('vastus-l','vastus_lateralis','العضلة المتسعة الوحشية',[K('extend')]),
 ('vastus-m','vastus_medialis','العضلة المتسعة الإنسية',[K('extend')]),
 ('vastus-i','vastus_intermedius','العضلة المتسعة الوسطى',[K('extend')]),
 ('add-longus','adductor_longus','العضلة المقربة الطويلة',[H('adduct')]),
 ('add-brevis','adductor_brevis','العضلة المقربة القصيرة',[H('adduct')]),
 ('add-magnus-a','adductor_magnus_adductor_part','المقربة الكبيرة — الجزء المقرب',[H('adduct'),H('flex')]),
 ('add-magnus-h','adductor_magnus_hamstring_part','المقربة الكبيرة — الجزء المأبضي',[H('extend')]),
 ('gracilis','gracilis','العضلة الرشيقة',[H('adduct'),K('flex'),K('internal')]),
 ('obturator-e','obturator_externus','العضلة السدادية الخارجية',[H('external')]),
 ('semitendinosus','semitendinosus','العضلة نصف الوترية',[H('extend'),K('flex'),K('internal')]),
 ('semimembranosus','semimembranosus','العضلة نصف الغشائية',[H('extend'),K('flex'),K('internal')]),
 ('biceps-long','biceps_femoris_long_head','ذات الرأسين الفخذية — الرأس الطويل',[H('extend'),K('flex'),K('external')]),
 ('biceps-short','biceps_femoris_short_head','ذات الرأسين الفخذية — الرأس القصير',[K('flex'),K('external')]),
 ('glute-max','gluteus_maximus','العضلة الألوية الكبيرة',[H('extend'),H('external')]),
 ('glute-med','gluteus_medius','العضلة الألوية الوسطى',[H('abduct'),action('hip','internal','Anterior fibers assist medial rotation of the thigh.',condition='Anterior fibers')]),
 ('glute-min','gluteus_minimus','العضلة الألوية الصغيرة',[H('abduct'),H('internal')]),
 ('tfl','tensor_fasciae_latae','العضلة موترة اللفافة العريضة',[H('flex'),H('abduct'),H('internal')]),
 ('piriformis','piriformis','العضلة الكمثرية',[action('hip','external','Laterally rotates the extended thigh.',condition='Hip extended')]),
 ('gemellus-s','gemellus_superior','العضلة التوأمية العلوية',[H('external')]),
 ('obturator-i','obturator_internus','العضلة السدادية الداخلية',[H('external')]),
 ('gemellus-i','gemellus_inferior','العضلة التوأمية السفلية',[H('external')]),
 ('quadratus','quadratus_femoris','العضلة المربعة الفخذية',[H('external')]),
 ('tib-ant','tibialis_anterior','العضلة الظنبوبية الأمامية',[A('dorsi'),F('invert')]),
 ('ehl','extensor_hallucis_longus','العضلة باسطة إبهام القدم الطويلة',hallux('extend')+[A('dorsi')]),
 ('edl','extensor_digitorum_longus','العضلة باسطة الأصابع الطويلة',toes('extend',[2,3,4,5])+[A('dorsi')]),
 ('fib-tertius','fibularis_tertius','العضلة الشظوية الثالثة',[A('dorsi'),F('evert')]),
 ('fib-longus','fibularis_longus','العضلة الشظوية الطويلة',[F('evert'),A('plantar')]),
 ('fib-brevis','fibularis_brevis','العضلة الشظوية القصيرة',[F('evert'),A('plantar')]),
 ('plantaris','plantaris','العضلة الأخمصية',[A('plantar'),K('flex')]),
 ('gastrocnemius','gastrocnemius','العضلة التوأمية الساقية',[A('plantar'),K('flex')]),
 ('soleus','soleus','العضلة النعلية',[A('plantar')]),
 ('popliteus','popliteus','العضلة المأبضية',[action('knee','internal','Unlocks the extended knee: tibia rotates medially with the foot free; femur rotates laterally with the foot fixed.',condition='Open chain: tibia medial; closed chain: femur lateral'),K('flex')]),
 ('tib-post','tibialis_posterior','العضلة الظنبوبية الخلفية',[A('plantar'),F('invert')]),
 ('fdl','flexor_digitorum_longus','العضلة مثنية الأصابع الطويلة',toes('flex',[2,3,4,5])+[A('plantar')]),
 ('fhl','flexor_hallucis_longus','العضلة مثنية إبهام القدم الطويلة',hallux('flex')+[A('plantar')]),
 ('edb','extensor_digitorum_brevis','العضلة باسطة الأصابع القصيرة',toes('extend',[2,3,4])),
 ('ehb','extensor_hallucis_brevis','العضلة باسطة إبهام القدم القصيرة',hallux('extend',False)),
 ('abductor-hallucis','abductor_hallucis','العضلة مبعدة إبهام القدم',[action('hallux_mtp','abduct','Moves the great toe away from the second-toe axis.',[1])]+hallux('flex',False)),
 ('fdb','flexor_digitorum_brevis','العضلة مثنية الأصابع القصيرة',toes('flex',[2,3,4,5],('mtp','pip'))),
 ('abductor-digiti-minimi','abductor_digiti_minimi_foot','العضلة مبعدة الإصبع الصغير للقدم',[action('toes_mtp','abduct','Moves the fifth toe away from the second-toe axis.',[5])]+toes('flex',[5],('mtp',))),
 ('quadratus-plantae','quadratus_plantae','العضلة المربعة الأخمصية',toes('flex',[2,3,4,5],indirect=True)),
 ('foot-lumbricals','lumbricals_foot','العضلات الدودية للقدم',toes('flex',[2,3,4,5],('mtp',))+toes('extend',[2,3,4,5],('pip','dip'))),
 ('fhb','flexor_hallucis_brevis','العضلة مثنية إبهام القدم القصيرة',hallux('flex',False)),
 ('adductor-hallucis','adductor_hallucis','العضلة مقربة إبهام القدم',[action('hallux_mtp','adduct','Moves the great toe toward the second-toe axis.',[1])]),
 ('fdmb','flexor_digiti_minimi_brevis_foot','العضلة مثنية الإصبع الصغير القصيرة للقدم',toes('flex',[5],('mtp',))),
 ('plantar-interossei','plantar_interossei','العضلات بين العظام الأخمصية',[action('toes_mtp','adduct','Moves toes 3–5 toward the second-toe axis (PAD).',[3,4,5])]+toes('flex',[3,4,5],('mtp',))+toes('extend',[3,4,5],('pip','dip'))),
 ('dorsal-interossei','dorsal_interossei_foot','العضلات بين العظام الظهرية للقدم',[action('toes_mtp','abduct','Moves toes 2–4 away from the second-toe axis (DAB); the second toe can move to either side.',[2,3,4])]+toes('flex',[2,3,4],('mtp',))+toes('extend',[2,3,4],('pip','dip')))
]
NOTES = {
 'rectus':'Crosses both hip and knee; the vasti act at the knee only.',
 'biceps-short':'The short head does not cross the hip. It cannot extend the hip.',
 'soleus':'Does not cross the knee. Knee flexion belongs to gastrocnemius, not soleus.',
 'plantaris':'A weak contributor to plantarflexion and knee flexion.',
 'add-magnus-a':'Both functional parts share the intact adductor magnus mesh. No artificial 3D boundary is claimed.',
 'add-magnus-h':'Both functional parts share the intact adductor magnus mesh. This part extends the hip and has tibial-division innervation.',
 'popliteus':'Unlocking reverses the moving bone when the foot is fixed; the guide illustrates the free-tibia case.',
 'edb':'Here EDB means the three lesser-toe slips (2–4); the great-toe component is modeled separately as EHB. The original lecture groups the medial four toes.',
 'ehb':'Acts at the great-toe MTP joint only; it does not cross the IP joint.',
 'fhb':'Acts at the great-toe MTP joint only. FHL also crosses the IP joint.',
 'fdb':'Flexes the MTP and PIP joints, not the distal IP joints. FDL reaches the distal phalanges.',
 'quadratus-plantae':'Acts through the FDL tendons, aligning their pull and assisting toe flexion; it does not itself span the toe joints.',
 'foot-lumbricals':'Four lumbricals share one group mesh: first supplied by medial plantar nerve; remaining three by lateral plantar nerve.',
 'pectineus':'Femoral supply is usual; an obturator contribution is variable. The original lecture lists both.',
 'tib-ant':'Inversion is at the hindfoot joints; dorsiflexion is at the talocrural ankle joint.',
 'tib-post':'Inversion is at the hindfoot joints; plantarflexion is at the talocrural ankle joint.'
}
entries=[]
for legacy_id, muscle_id, name_ar, actions in SPECS:
    p = next(p for p in profiles if p['id']==legacy_id)
    region = 'foot' if p['group'] in ['dorsum','sole'] else 'leg' if p['group'] in ['anterior-leg','lateral-leg','calf','deep'] else 'gluteal' if p['group'] in ['gluteal','deep-hip'] else 'thigh'
    refs = ['uams','loyola'] + (['thigh'] if region=='thigh' else ['gluteal'] if region=='gluteal' else [])
    if legacy_id in ['edb','ehb']: refs.append(legacy_id)
    if legacy_id=='quadratus-plantae': refs.append('qp')
    mesh_names=[p['target']]
    extra = {'gastrocnemius':'Lateral head of gastrocnemius.r','fhb':'Lateral head of flexor hallucis brevis.r','adductor-hallucis':'Transverse head of adductor hallucis.r'}.get(legacy_id)
    if extra: mesh_names.append(extra)
    details=dict(primary_actions=actions,secondary_actions=[],stabilization=[],
        synergists_antagonists=dict(synergists=[],antagonists=[],innervation=p['nerve'],relationship_basis='Examples inferred from shared joint, movement and overlapping toe targets; not a universal muscle pairing.'),
        animation_trigger=dict(has_3d_animation=True,animation_clip_name=muscle_id+'_action_clip',target_joints=list(dict.fromkeys(a['joint_id'] for a in actions)),animation_mode='procedural_joint_motion',accuracy='Illustrative joint pivots and attachment weights, not validated biomechanics.'),
        reference_ids=refs,notes=[NOTES[legacy_id]] if legacy_id in NOTES else [])
    if legacy_id=='rectus': details['synergists_antagonists']['innervation']='Femoral nerve (L2, L3, L4)'
    if legacy_id in ['glute-med','glute-min']: details['stabilization'].append('Keeps the pelvis level over the supporting leg during single-leg stance.')
    if legacy_id in ['piriformis','obturator-i','gemellus-s','gemellus-i']:
        details['secondary_actions'].append(action('hip','abduct','Assists abduction when the hip is flexed.',condition='Hip flexed'))
    if legacy_id in ['add-longus','add-brevis']: details['secondary_actions'].append(H('flex'))
    if legacy_id in ['ehl','fdl','fhl']: details['secondary_actions'].append(F('invert'))
    if legacy_id=='edl': details['secondary_actions'].append(F('evert'))
    entries.append(dict(muscle_id=muscle_id,profile_id=legacy_id,name_en=p['name'].replace(' · ',' — '),name_ar=name_ar,
        region=region,mesh_names=mesh_names,color=p['color'],view=p['view'],aliases=[p['name'],*mesh_names],
        lecture_action=p['action'],lecture_reference=dict(lecture_id='8',page=p['page'],src=f'/lectures/l8/slides/{p["page"]}.jpg'),
        action_section=details,action_details=details))

OPPOSITES={'flex':'extend','extend':'flex','abduct':'adduct','adduct':'abduct','internal':'external','external':'internal','dorsi':'plantar','plantar':'dorsi','invert':'evert','evert':'invert'}
for entry in entries:
    coop=entry['action_section']['synergists_antagonists']
    for relation in ['synergists','antagonists']:
        ids=[]
        for candidate in entries:
            if candidate==entry or set(candidate['mesh_names'])&set(entry['mesh_names']): continue
            for a in entry['action_section']['primary_actions']:
                if any(a['joint_id']==b['joint_id'] and b['movement_id']==(a['movement_id'] if relation=='synergists' else OPPOSITES[a['movement_id']]) and (not a.get('digits') or bool(set(a['digits'])&set(b.get('digits',[])))) for b in candidate['action_section']['primary_actions']):
                    ids.append(candidate['muscle_id']);break
        coop[relation+'_ids']=ids
        coop[relation]=[next(m['name_en'] for m in entries if m['muscle_id']==i) for i in ids]

catalog=dict(schema_version=1,verified_date='2026-10-03',references=REFERENCES,muscles=entries)
path=ROOT/'lectures/lower-limb/muscle-actions.json';path.parent.mkdir(exist_ok=True)
path.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
for lecture_id in ['7','8','9','10']:
    path=ROOT/f'lectures/l{lecture_id}/tour.json';data=load(path)
    model_path=ROOT/(data.get('modelPaths',{}).get('muscular',f'/lectures/l{lecture_id}/models/muscular.glb').lstrip('/'))
    raw=model_path.read_bytes();gltf=json.loads(raw[20:20+struct.unpack_from('<I',raw,12)[0]])
    assert not gltf.get('skins') and not gltf.get('animations'), 'Revisit animation capability for a newly rigged model'
    names={n.get('extras',{}).get('anatomyName',n.get('name')) for n in gltf['nodes'] if 'mesh' in n}
    bound=[]
    for entry in entries:
        if not any(n in names for n in entry['mesh_names']): continue
        local=copy.deepcopy(entry);local['mesh_names']=[n for n in local['mesh_names'] if n in names];bound.append(local)
    data['muscles']=bound
    data['muscleActionCatalog']={'path':'/lectures/lower-limb/muscle-actions.json','schema_version':1,'reference_ids':list(REFERENCES)}
    if lecture_id=='8':
        for p in data['muscleProfiles']:
            match=next(e for e in bound if e['profile_id']==p['id'])
            for key in ['muscle_id','name_en','name_ar','action_section','action_details']:p[key]=match[key]
        # Keep the lecture-local EDL tendon association on catalog regeneration.
        from l8_edl import append_original_tendon, clarify_tour
        append_original_tendon()
        clarify_tour(data)
    path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print(f'Lecture {lecture_id}: {len(bound)} muscle records / {len(set(n for m in bound for n in m["mesh_names"]))} contractile meshes')
