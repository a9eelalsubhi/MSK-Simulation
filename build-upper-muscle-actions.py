"""Bind the existing L2/L3 lecture actions to the original upper-limb meshes.

The lecture's OINA, questions and reference-page mapping remain authoritative.
The university reference checks movement interpretation, not new exam content.
"""
from pathlib import Path
import copy, json, re, struct

ROOT = Path(__file__).parent / 'public'
JOINTS = {'shoulder': ('Shoulder Joint', 'مفصل الكتف'),
 'scapula': ('Shoulder girdle', 'الحزام الكتفي'), 'ribs': ('Ribs 3–5', 'الأضلاع ٣–٥'),
 'elbow': ('Elbow Joint', 'مفصل المرفق'), 'forearm': ('Radioulnar joints', 'المفاصل الكعبرية الزندية'),
 'wrist': ('Wrist Joint', 'مفصل الرسغ'), 'thumb_cmc': ('Thumb CMC Joint', 'المفصل الرسغي المشطي للإبهام'),
 'thumb_mcp': ('Thumb MCP Joint', 'المفصل المشطي السلامي للإبهام'), 'thumb_ip': ('Thumb IP Joint', 'المفصل السلامي للإبهام'),
 'fingers_mcp': ('Finger MCP Joints', 'المفاصل المشطية السلامية للأصابع'),
 'fingers_pip': ('Finger PIP Joints', 'المفاصل السلامية القريبة للأصابع'),
 'fingers_dip': ('Finger DIP Joints', 'المفاصل السلامية البعيدة للأصابع'),
 'fingers_writing': ('MCP + IP joints', 'المفاصل المشطية السلامية وبين السلاميات'),
 'little_cmc': ('Little finger CMC Joint', 'المفصل الرسغي المشطي للخنصر')}
MOVES = {'flex': ('Flexion','ثني'), 'extend': ('Extension','بسط'), 'abduct': ('Abduction','تبعيد'),
 'adduct': ('Adduction','تقريب'), 'internal': ('Medial rotation','دوران إنسي'), 'external': ('Lateral rotation','دوران وحشي'),
 'pronate': ('Pronation','كب'), 'supinate': ('Supination','استلقاء'), 'elevate': ('Elevation','رفع'),
 'depress': ('Depression','خفض'), 'protract': ('Protraction','تقديم'), 'retract': ('Retraction','سحب للخلف'),
 'upward': ('Upward rotation','دوران للأعلى'), 'downward': ('Downward rotation','دوران للأسفل'),
 'oppose': ('Opposition','مقابلة'), 'writing': ('Writing position','وضعية الكتابة')}
def a(joint, move, digits=None, condition=None, **extra):
    en, ar = JOINTS[joint]; me, ma = MOVES[move]
    result = dict(joint_id=joint+'_right', joint=en, joint_ar=ar, movement_id=move, movement=me,
                  movement_ar=f'{ma} ({me})', description=f'{me} at the {en.lower()}.', direct=True,
                  plane='transverse' if move in ['internal','external','pronate','supinate','oppose'] else 'frontal' if move in ['abduct','adduct','upward','downward'] else 'sagittal')
    if digits: result['digits'] = digits
    if condition: result['condition'] = condition
    result.update(extra); return result
S=lambda m,**kw:a('shoulder',m,**kw)
E=lambda m,**kw:a('elbow',m,**kw)
G=lambda m:a('scapula',m)
F=lambda m,**kw:a('forearm',m,**kw)
W=lambda m:a('wrist',m)
D=lambda m,ds=[2,3,4,5],js=['mcp','pip','dip']:[a('fingers_'+j,m,ds) for j in js]
T=lambda m,js=['cmc','mcp','ip']:[a('thumb_'+j,m,[1]) for j in js]

L2 = [
 ('supraspinatus','فوق الشوكة',[S('abduct',excursion=15)]),
 ('infraspinatus','تحت الشوكة',[S('external')]), ('teres_minor','المدورة الصغيرة',[S('external')]),
 ('subscapularis','تحت الكتف',[S('adduct'),S('internal')]),
 ('teres_major','المدورة الكبيرة',[S('extend'),S('adduct'),S('internal')]),
 ('deltoid_anterior','الدالية — الألياف الأمامية',[S('flex'),S('internal')]),
 ('deltoid_middle','الدالية — الألياف الوسطى',[S('abduct',initial=15,excursion=60)]),
 ('deltoid_posterior','الدالية — الألياف الخلفية',[S('extend'),S('external')]),
 ('coracobrachialis','الغرابية العضدية',[S('flex'),S('adduct')]),
 ('levator_scapulae','رافعة الكتف',[G('elevate')]),
 ('rhomboid_minor','المعينية الصغيرة',[G('retract'),G('downward')]),
 ('rhomboid_major','المعينية الكبيرة',[G('retract'),G('downward')]),
 ('serratus_anterior','المنشارية الأمامية',[G('protract'),G('upward')]),
 ('pectoralis_minor','الصدرية الصغيرة',[G('protract'),G('depress'),a('ribs','elevate',condition='Scapula fixed')]),
 ('trapezius_upper','شبه المنحرفة — الألياف العلوية',[G('elevate')]),
 ('trapezius_middle','شبه المنحرفة — الألياف الوسطى',[G('retract')]),
 ('trapezius_lower','شبه المنحرفة — الألياف السفلية',[G('depress')]),
 ('pectoralis_major','الصدرية الكبيرة',[S('flex'),S('adduct'),S('internal')]),
 ('latissimus_dorsi','الظهرية العريضة',[S('extend'),S('adduct'),S('internal')]),
 ('biceps_short_head','ذات الرأسين — الرأس القصير',[E('flex'),F('supinate',condition='Elbow flexed')]),
 ('biceps_long_head','ذات الرأسين — الرأس الطويل',[E('flex'),F('supinate',condition='Elbow flexed')]),
 ('brachialis','العضدية',[E('flex')]),
 ('brachioradialis_l2','العضدية الكعبرية',[E('flex',condition='Mid-pronation')]),
 ('triceps_long_head','ثلاثية الرؤوس — الرأس الطويل',[E('extend')]),
 ('triceps_lateral_head','ثلاثية الرؤوس — الرأس الوحشي',[E('extend')]),
 ('triceps_medial_head','ثلاثية الرؤوس — الرأس الإنسي',[E('extend')])]
L3 = [
 ('pronator_teres','الكابة المدورة',[E('flex'),F('pronate')]),
 ('palmaris_longus','الراحية الطويلة',[W('flex')]),
 ('flexor_carpi_radialis','مثنية الرسغ الكعبرية',[W('flex'),W('abduct')]),
 ('flexor_carpi_ulnaris','مثنية الرسغ الزندية',[W('flex'),W('adduct')]),
 ('flexor_digitorum_superficialis','مثنية الأصابع السطحية',[W('flex'),*D('flex',js=['mcp','pip'])]),
 ('flexor_pollicis_longus','مثنية الإبهام الطويلة',T('flex',js=['mcp','ip'])),
 ('flexor_digitorum_profundus','مثنية الأصابع العميقة',[W('flex'),*D('flex')]),
 ('pronator_quadratus','الكابة المربعة',[F('pronate')]),
 ('brachioradialis_l3','العضدية الكعبرية',[E('flex',condition='Mid-pronation')]),
 ('extensor_carpi_radialis_longus','باسطة الرسغ الكعبرية الطويلة',[W('extend'),W('abduct')]),
 ('anconeus','المرفقية',[E('extend')]),
 ('extensor_carpi_radialis_brevis','باسطة الرسغ الكعبرية القصيرة',[W('extend'),W('abduct')]),
 ('extensor_carpi_ulnaris','باسطة الرسغ الزندية',[W('extend'),W('adduct')]),
 ('extensor_digitorum','باسطة الأصابع',[W('extend'),*D('extend')]),
 ('extensor_digiti_minimi','باسطة الخنصر',[W('extend'),*D('extend',[5])]),
 ('supinator','المستلقية',[F('supinate')]),
 ('abductor_pollicis_longus','مبعدة الإبهام الطويلة',[a('thumb_cmc','abduct',[1],abduction_mode='radial'),*T('extend',['cmc'])]),
 ('extensor_pollicis_brevis','باسطة الإبهام القصيرة',T('extend',['cmc','mcp'])),
 ('extensor_pollicis_longus','باسطة الإبهام الطويلة',T('extend')),
 ('extensor_indicis','باسطة السبابة',D('extend',[2])),
 ('flexor_pollicis_brevis','مثنية الإبهام القصيرة',T('flex',['cmc','mcp'])),
 ('abductor_pollicis_brevis','مبعدة الإبهام القصيرة',[a('thumb_cmc','abduct',[1],abduction_mode='palmar')]),
 ('opponens_pollicis','مقابلة الإبهام',T('oppose',['cmc'])),
 ('adductor_pollicis','مقربة الإبهام',T('adduct',['cmc'])),
 ('flexor_digiti_minimi','مثنية الخنصر',D('flex',[5],['mcp'])),
 ('abductor_digiti_minimi','مبعدة الخنصر',D('abduct',[5],['mcp'])),
 ('opponens_digiti_minimi','مقابلة الخنصر',[a('little_cmc','oppose',[5])]),
 ('lumbricals_hand','العضلات الدودية لليد',[a('fingers_writing','writing',[2,3,4,5])]),
 ('palmar_interossei','العضلات بين العظام الراحية',D('adduct',[2,4,5],['mcp'])),
 ('dorsal_interossei','العضلات بين العظام الظهرية',D('abduct',[2,3,4],['mcp']))]
REFS={'uams_upper':{'title':'UAMS College of Medicine · Upper limb muscle table','url':'https://medicine.uams.edu/neuroscience/education/medical-school-courses/human-structure-module/anatomy-tables/muscle-tables/muscles-of-the-upper-limb/'}}
entries=[]
for lid, specs in [(2,L2),(3,L3)]:
    path=ROOT/f'lectures/l{lid}/tour.json'; data=json.loads(path.read_text(encoding='utf8'))
    assert len(specs)==len(data['muscleProfiles'])
    bound=[]
    for p,(mid,ar,actions) in zip(data['muscleProfiles'],specs):
        step=next(s for s in data['steps'] if s.get('profileId')==p['id'])
        source_refs=[data['referenceSlides'][key] for key in step['referencePages']]
        details=dict(primary_actions=actions,secondary_actions=[],stabilization=[],
                     synergists_antagonists=dict(synergists=[],antagonists=[],innervation=p['nerve']),
                     animation_trigger=dict(has_3d_animation=True,animation_mode='procedural_joint_motion',animation_clip_name=mid+'_action_clip',
                                            target_joints=list(dict.fromkeys(x['joint_id'] for x in actions)),accuracy='Illustrative pivots and tissue weights, not validated biomechanics.'),
                     reference_ids=list(REFS),notes=[])
        if mid=='serratus_anterior':details['stabilization']=['Holds the scapula against the chest wall.']
        meshes=p.get('targets',[p['target']])
        region=('shoulder' if int(p['id'][1:])<19 else 'arm') if lid==2 else ('forearm' if data['muscleProfiles'].index(p)<20 else 'hand')
        entry=dict(muscle_id=mid,profile_id=p['id'],name_en=p['name'],name_ar=ar,region=region,anatomy_region='upper',
                   mesh_names=meshes,color=p['color'],view=step.get('view','front'),aliases=[p['name'],*meshes],
                   lecture_action=p['action'],lecture_reference=dict(lecture_id=str(lid),page=p['page'],**source_refs[0]),source_references=source_refs,
                   action_section=details,action_details=details)
        bound.append(entry); entries.append(copy.deepcopy(entry))
        for key in ['muscle_id','name_en','name_ar','action_section','action_details']:p[key]=entry[key]
    data['muscles']=bound
    data['muscleActionCatalog']={'path':'/lectures/upper-limb/muscle-actions.json','schema_version':1,'reference_ids':list(REFS)}
    path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print(f'Lecture {lid}: {len(bound)} muscles; {sum(len(m["action_section"]["primary_actions"]) for m in bound)} actions')
target=ROOT/'lectures/upper-limb/muscle-actions.json';target.parent.mkdir(exist_ok=True)
target.write_text(json.dumps(dict(schema_version=1,verified_date='2026-10-04',references=REFS,muscles=entries),ensure_ascii=False,indent=2)+'\n',encoding='utf8')
