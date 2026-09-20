"""Build a private L4 viewer dataset from verified local captions and S3 inventories.

This command reads source artifacts only. It does not call an API or download media.
The output is runtime data, never a Git-tracked public dataset.
"""
from argparse import ArgumentParser
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import shutil

FEATURED = [
    '53a5c50a-4002-4beb-b8ed-d4d564443063_24500ms_49000ms',
    '03c1a54d-3be6-41d5-9f96-80a68f56815d_252500ms_290000ms',
]
GROUPS = {
    'Home/Life/Office/Food Service': ('daily-life', 'Daily life', '日常生活'),
    'Industry/Factory/Manufacturing': ('craft-industry', 'Craft & industry', '手工与制造'),
    'Warehousing/Logistics/Retail': ('retail-logistics', 'Retail & logistics', '零售与物流'),
}

def read(path):
    return json.loads(path.read_text())

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument('--captions', type=Path, required=True)
    parser.add_argument('--video-inventory', type=Path, required=True)
    parser.add_argument('--pose-inventory', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    objects = {o['key']: o for p in [args.video_inventory, args.pose_inventory] for o in read(p)}
    output = args.output.resolve()
    for folder in ['captions', 'videos', 'posters', 'poses']:
        (output / folder).mkdir(parents=True, exist_ok=True)
    episodes, downloads, source_records, issues = [], [], [], []
    for file in sorted(args.captions.glob('*/L4.en.json')):
        caption = read(file)
        l0_file = file.parent / 'L0.json'
        l0 = read(l0_file)
        clip_id = file.parent.name
        assert caption['video_id'] == l0['video_id'] == clip_id
        assert caption['success'] and l0['success'] and caption['caption_level'] == 'L4'
        duration = float(caption['duration_sec'])
        assert duration > 0 and abs(float(l0['duration_sec']) - duration) < 0.001
        subtasks, actions = caption['subtasks'], caption['actions']
        subtask_ids = {item['subtask_id'] for item in subtasks}
        for kind, entries in [('subtask', subtasks), ('action', actions)]:
            for index, item in enumerate(entries):
                start, end = float(item['start_sec']), float(item['end_sec'])
                if not 0 <= start <= end <= duration + 0.051:
                    issues.append({'id': clip_id, 'kind': kind, 'index': index, 'start': start, 'end': end, 'duration': duration})
                if kind == 'action':
                    assert item['subtask_id'] in subtask_ids
        taxonomy = caption['global']['taxonomy']
        l0_taxonomy = l0['global']['taxonomy']
        group = GROUPS[l0_taxonomy['category_en']]
        titles = taxonomy.get('task_category_en', [])
        titles_zh = taxonomy.get('task_category_zh', [])
        scenes = taxonomy.get('scene_en', [])
        scenes_zh = taxonomy.get('scene_zh', [])
        if isinstance(scenes, str): scenes = [scenes]
        if isinstance(scenes_zh, str): scenes_zh = [scenes_zh]
        keys = {
            'recording': f'delivered/for-1x-first-3h/{clip_id}/low-res.mp4',
            'hand': f'delivered/3h-hand-reconstruction/rendered/{clip_id}__low-res.mp4',
            'mano': f'delivered/3h-hand-reconstruction/mano/{clip_id}__low-res.mano.npz',
        }
        assert all(key in objects and objects[key]['bytes'] > 0 for key in keys.values()), clip_id
        files = {'recording': f'videos/{clip_id}.recording.mp4', 'hand': f'videos/{clip_id}.hand.mp4', 'mano': f'poses/{clip_id}.mano.npz'}
        for mode, key in keys.items():
            downloads.append({'key': key, 'file': files[mode], 'bytes': objects[key]['bytes'], 'id': clip_id, 'mode': mode})
        memory = caption['global'].get('memory', [])
        episode = {
            'id': clip_id,
            'title': titles[0] if titles else subtasks[0]['subtask_en'],
            'titleZh': titles_zh[0] if titles_zh else subtasks[0]['subtask_zh'],
            'scene': scenes[0] if scenes else l0_taxonomy['scene_en'],
            'sceneZh': scenes_zh[0] if scenes_zh else l0_taxonomy['scene_zh'],
            'category': group[0], 'categoryLabel': group[1], 'categoryLabelZh': group[2],
            'tasks': l0_taxonomy.get('task', []), 'duration': duration,
            'subtaskCount': len(subtasks), 'actionCount': len(actions),
            'memoryCount': sum(len(w.get('state', [])) for w in memory),
            'featured': clip_id in FEATURED, 'media': ['recording', 'hand'],
            'captionSha256': digest(file),
            'searchText': ' '.join([*titles, *titles_zh, *scenes, *scenes_zh, *l0_taxonomy.get('task', []),
                                  *(a.get('caption_en', '') for a in actions),
                                  *(a.get('caption_zh', '') for a in actions)]),
        }
        episodes.append(episode)
        shutil.copyfile(file, output / 'captions' / f'{clip_id}.json')
        source_records.append({'id': clip_id, 'caption_sha256': digest(file), 'l0_sha256': digest(l0_file), 's3': keys})
    if issues:
        (output / 'validation-issues.json').write_text(json.dumps(issues, ensure_ascii=False, indent=2))
        raise ValueError(f'{len(issues)} invalid annotation time ranges; see validation-issues.json')
    episodes.sort(key=lambda e: (FEATURED.index(e['id']) if e['id'] in FEATURED else len(FEATURED), e['category'], e['title'], e['id']))
    task_counts = Counter(t for e in episodes for t in e['tasks'])
    catalogue = {'version': 1, 'name': 'Human skill, in context.', 'defaultEpisodeId': episodes[0]['id'],
        'stats': {'episodes': len(episodes), 'duration': sum(e['duration'] for e in episodes),
                  'subtasks': sum(e['subtaskCount'] for e in episodes), 'actions': sum(e['actionCount'] for e in episodes)},
        'categories': [{'id': key, 'name': name, 'nameZh': zh, 'count': sum(e['category'] == key for e in episodes)} for key, name, zh in GROUPS.values()],
        'tasks': [{'id': k, 'name': k.replace('_', ' ').capitalize(), 'count': v} for k, v in task_counts.most_common()],
        'episodes': episodes}
    manifest = {'generated_at': datetime.now(timezone.utc).isoformat(), 'caption_schema': '4.0',
        'head_pose_verified': False, 'source_records': source_records, 'download_items': downloads,
        'total_download_bytes': sum(d['bytes'] for d in downloads), 'validation': {'invalid_time_ranges': 0, 'matched_samples': len(episodes)}}
    (output / 'catalog.json').write_text(json.dumps(catalogue, ensure_ascii=False, separators=(',', ':')) + '\n')
    (output / 'source-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'output': str(output), 'stats': catalogue['stats'], 'download_bytes': manifest['total_download_bytes'], 'source_matching': len(source_records), 'invalid_time_ranges': 0}, ensure_ascii=False))

if __name__ == '__main__':
    main()
