"""Lecture 8 only: retain EDL's original four-toe tendon with its muscle belly.

The tendon is copied from the existing licensed atlas asset, without decoding,
rescaling, editing vertices, or adding approximate anatomical geometry.
"""
import copy
import json
from pathlib import Path
import struct

ROOT = Path(__file__).resolve().parent / 'public'
BELLY = 'Extensor digitorum longus.r'
TENDON = 'Tendon of extensor digitorum longus.r'


def read_glb(path):
    raw = path.read_bytes()
    length = struct.unpack_from('<I', raw, 12)[0]
    return json.loads(raw[20:20 + length]), raw[28 + length:]


def append_original_tendon():
    destination = ROOT / 'lectures/l8/models/muscular.glb'
    target, binary = read_glb(destination)
    if any(n.get('name') == TENDON for n in target['nodes']):
        return
    source, source_bin = read_glb(ROOT / 'lectures/l1/models/muscular.glb')
    node = copy.deepcopy(next(n for n in source['nodes'] if n.get('name') == TENDON))
    # Both exported scenes have flat, world-positioned mesh roots. Refuse to
    # silently discard a parent transform if a later source asset changes.
    index = next(i for i, n in enumerate(source['nodes']) if n.get('name') == TENDON)
    assert index in source['scenes'][source.get('scene', 0)]['nodes']
    assert not node.get('children') and not source.get('skins')
    mesh = copy.deepcopy(source['meshes'][node['mesh']])
    binary = bytearray(binary[:target['buffers'][0]['byteLength']])
    views, accessors = {}, {}

    def view(old):
        if old not in views:
            original = source['bufferViews'][old]
            padding = (-len(binary)) % 4
            binary.extend(b'\0' * padding)
            new = copy.deepcopy(original)
            new['buffer'] = 0
            new['byteOffset'] = len(binary)
            start = original.get('byteOffset', 0)
            binary.extend(source_bin[start:start + original['byteLength']])
            views[old] = len(target['bufferViews'])
            target['bufferViews'].append(new)
        return views[old]

    def accessor(old):
        if old not in accessors:
            new = copy.deepcopy(source['accessors'][old])
            assert not new.get('sparse'), 'Sparse accessors need explicit remapping'
            if 'bufferView' in new:
                new['bufferView'] = view(new['bufferView'])
            accessors[old] = len(target['accessors'])
            target['accessors'].append(new)
        return accessors[old]

    for primitive in mesh['primitives']:
        assert not primitive.get('targets'), 'Morph targets need explicit remapping'
        primitive['attributes'] = {k: accessor(v) for k, v in primitive['attributes'].items()}
        if 'indices' in primitive:
            primitive['indices'] = accessor(primitive['indices'])
        compressed = primitive.get('extensions', {}).get('KHR_draco_mesh_compression')
        if compressed:
            compressed['bufferView'] = view(compressed['bufferView'])
        if 'material' in primitive:
            material = copy.deepcopy(source['materials'][primitive['material']])
            assert not source.get('textures'), 'Textured source needs texture remapping'
            primitive['material'] = len(target['materials'])
            target['materials'].append(material)
    node['mesh'] = len(target['meshes'])
    target['meshes'].append(mesh)
    target['scenes'][target.get('scene', 0)]['nodes'].append(len(target['nodes']))
    target['nodes'].append(node)
    target['buffers'][0]['byteLength'] = len(binary)
    encoded = json.dumps(target, separators=(',', ':'), ensure_ascii=False).encode()
    encoded += b' ' * ((-len(encoded)) % 4)
    binary.extend(b'\0' * ((-len(binary)) % 4))
    output = (struct.pack('<III', 0x46546c67, 2, 28 + len(encoded) + len(binary))
              + struct.pack('<II', len(encoded), 0x4e4f534a) + encoded
              + struct.pack('<II', len(binary), 0x004e4942) + binary)
    destination.write_bytes(output)


def bind_edl_components(entries):
    """Called only for L8; shared action facts and other lecture bindings stay intact."""
    entry = next(m for m in entries if m['profile_id'] == 'edl')
    entry['mesh_names'] = [BELLY, TENDON]
    entry['mesh_components'] = {
        BELLY: {'kind': 'belly', 'label': 'Extensor digitorum longus · muscle belly'},
        TENDON: {'kind': 'toe_tendon', 'label': 'EDL · four tendons to toes 2–5',
                 'color': '#f3bd62', 'digits': [2, 3, 4, 5]}
    }
    entry['motion_view'] = {'whole': [-0.3, 0.22, 1], 'joint': [0, 0.9, 0.55]}


def clarify_tour(data):
    bind_edl_components(data['muscles'])
    data.setdefault('assetVersions', {})['muscular'] = '20261005-edl1'
    profile = next(p for p in data['muscleProfiles'] if p['id'] == 'edl')
    profile['targets'] = [BELLY, TENDON]
    data['muscleColors'][TENDON] = profile['color']
    for step in data['steps']:
        if BELLY not in step['focus']:
            continue
        for key in ['focus', 'muscleFocus', 'displayStructures']:
            if BELLY in step.get(key, []) and TENDON not in step[key]:
                step[key].insert(step[key].index(BELLY) + 1, TENDON)
        step.setdefault('structureColors', {})[TENDON] = profile['color']
        step.setdefault('focusGroups', {})[BELLY] = [BELLY, TENDON]
        if step.get('profileId') == 'edl':
            step['cameraTarget'] = [-0.111, 0.215, 0.040]
            step['cameraSpan'] = 0.45
            step['caption'] = 'Follow EDL from the anterior leg across the ankle to four tendons on the dorsum of toes 2–5. Select the tendon callout for a closer view.'
            if not any(p['target'] == TENDON for p in step['pins']):
                step['pins'].append({'name': 'Four tendons → toes 2–5',
                                     'text': 'EDL continues over the ankle and divides toward the lateral four toes. The great toe is not an EDL target.',
                                     'target': TENDON, 'color': profile['color'], 'axis': 'z',
                                     'at': 0.72, 'context': False})
        if step['title'].startswith('Anterior leg'):
            step['cameraTarget'] = [-0.087, 0.216, 0.04]
            step['cameraSpan'] = 0.46


if __name__ == '__main__':
    append_original_tendon()
    path = ROOT / 'lectures/l8/tour.json'
    data = json.loads(path.read_text(encoding='utf8'))
    clarify_tour(data)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    print('Lecture 8 EDL: original belly + four-toe tendon, tour and action bindings updated.')
