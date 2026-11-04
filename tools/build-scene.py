"""Write public/model/scene.json: what the homepage runtime (public/assets/home.js) reads.

It combines the asset manifest (public/model/manifest.json, from tools/build-model-assets.py)
with the camera framings and room points from the approved concept videos (middle3-hy7 for
phones, desktop5 for wide screens). All coordinates are camera px (1520 x 2734).
Usage: python3 -I tools/build-scene.py
"""
import json, os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'model')
m = json.load(open(os.path.join(ROOT, 'manifest.json')))
tvq = json.load(open(os.path.join(ROOT, 'tv', 'tvq.json')))
st = m['stills']
scene = {
    'v': 1,
    'cam': m['camera'],
    'wideRect': [st['roofOff']['rect'][k] for k in ('x', 'y', 'w', 'h')],
    # phone: storefront cover framing, then the whole model for the night stops (screen y given for an 844 px tall screen)
    'phone': {'cover': {'fx': 758, 'fy': 1367, 's': .3155, 'sy': 422}, 'night': {'fx': 780, 'fy': 1370, 's': .285, 'sy': 426}},
    # wide screens: code zoom from the storefront to the model, words on the left (1440 x 900 reference)
    'wide': {'hook': {'fx': 860, 'fy': 1820, 's': .82, 'sx': 1150, 'sy': 470}, 'model': {'fx': 760, 'fy': 1367, 's': .5, 'sx': 1010, 'sy': 500},
             'hookRect': [m['hook']['d']['rect'][k] for k in ('x', 'y', 'w', 'h')]},
    'rooms': [[480, 1640], [960, 1018], [578, 650], [560, 1200]],   # website, client list, automation, reminder texts
    'labels': [[9, 0], [9, -12], [9, 0], [9, 12]],                   # pill offset from the room point, screen px
    'tv': {'w': m['tv']['texture']['w'], 'h': m['tv']['texture']['h']},
    'tvq': {k: tvq[k] for k in ('shop', 'pull', 'lift', 'roofOff')},
    'files': {k: {'p': st[k]['p']['src'], 'd': st[k]['d']['src']} for k in ('shop', 'roofOff', 'night', 'predawn')},
    'seq': {k: {'n': m['sequences'][k]['count'], 'pattern': {v: m['sequences'][k]['pattern'][v].replace('%03d', '{i}') for v in ('p', 'd')}} for k in ('pull', 'lift')},
}
scene['files']['hook'] = m['hook']['d']['src']
scene['files']['tv'] = m['tv']['texture']['src']
json.dump(scene, open(os.path.join(ROOT, 'scene.json'), 'w'), separators=(',', ':'))
print('scene.json', os.path.getsize(os.path.join(ROOT, 'scene.json')), 'bytes')
