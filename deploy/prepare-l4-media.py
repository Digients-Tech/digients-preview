"""Receive short-lived read URLs on stdin, download into an isolated release dataset.

URLs/credentials are never persisted or logged. Only declared relative files are
accepted. Verify sizes, hash all assets, probe both videos, and generate posters.
"""
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import os
import subprocess
import sys
import time
import urllib.request

root = Path(sys.argv[1]).resolve()
assert root.parent == Path('/opt/digients-preview-data'), 'Use the dedicated dev data directory'
request = json.load(sys.stdin)
items = request['items']
root.mkdir(parents=True, exist_ok=True)

def download(item):
    target = (root / item['file']).resolve()
    assert target.is_relative_to(root) and target.suffix in {'.mp4', '.npz'}
    target.parent.mkdir(exist_ok=True)
    expected = item['bytes']
    for attempt in range(3):
        try:
            if not target.is_file() or target.stat().st_size != expected:
                temp = target.with_suffix(target.suffix + '.partial')
                with urllib.request.urlopen(item['url'], timeout=60) as response, temp.open('wb') as output:
                    while block := response.read(1024 * 1024): output.write(block)
                assert temp.stat().st_size == expected, 'Size mismatch'
                os.replace(temp, target)
            sha = hashlib.sha256()
            with target.open('rb') as f:
                while block := f.read(1024 * 1024): sha.update(block)
            return {'file': item['file'], 'bytes': expected, 'sha256': sha.hexdigest(), 'key': item['key'], 'ok': True}
        except Exception as exc:
            if attempt == 2: return {'file': item['file'], 'ok': False, 'error_type': type(exc).__name__}
            time.sleep(attempt + 1)

results = []
with ThreadPoolExecutor(max_workers=4) as executor:
    pending = [executor.submit(download, item) for item in items]
    for f in as_completed(pending):
        results.append(f.result())
        if len(results) % 100 == 0: print(json.dumps({'downloaded': len(results), 'total': len(items)}), flush=True)
receipt = {'checked_at_utc': datetime.now(timezone.utc).isoformat(), 'files': results}
(root / 'download-verification.json').write_text(json.dumps(receipt, indent=2))
failures = [r for r in results if not r['ok']]
if failures:
    print(json.dumps({'failures': failures}), flush=True)
    raise SystemExit(1)

catalog = json.loads((root / 'catalog.json').read_text())
def verify(episode):
    checked = {'id': episode['id'], 'videos': {}}
    for mode in ['recording', 'hand']:
        file = root / 'videos' / f'{episode["id"]}.{mode}.mp4'
        raw = subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries',
            'format=duration:stream=codec_name,codec_type,width,height,r_frame_rate', '-of', 'json', str(file)])
        probe = json.loads(raw)
        assert abs(float(probe['format']['duration']) - episode['duration']) <= 0.15, episode['id']
        assert any(s['codec_type'] == 'video' and s['codec_name'] == 'h264' for s in probe['streams'])
        checked['videos'][mode] = probe
    poster = root / 'posters' / f'{episode["id"]}.jpg'
    if not poster.is_file():
        subprocess.run(['ffmpeg', '-v', 'error', '-threads', '1', '-ss', str(min(2, episode['duration'] / 4)),
            '-i', str(root / 'videos' / f'{episode["id"]}.recording.mp4'), '-frames:v', '1',
            '-vf', 'scale=640:-2', '-q:v', '3', '-threads', '1', '-y', str(poster)], check=True)
    assert poster.stat().st_size > 0
    checked['poster_sha256'] = hashlib.sha256(poster.read_bytes()).hexdigest()
    return checked

verified = []
with ThreadPoolExecutor(max_workers=2) as executor:
    for f in as_completed([executor.submit(verify, episode) for episode in catalog['episodes']]):
        verified.append(f.result())
        if len(verified) % 50 == 0: print(json.dumps({'verified_episodes': len(verified)}), flush=True)
(root / 'media-verification.json').write_text(json.dumps({'checked_at_utc': datetime.now(timezone.utc).isoformat(), 'episodes': verified}, indent=2))
print(json.dumps({'complete': True, 'assets': len(results), 'episodes': len(verified), 'bytes': sum(r['bytes'] for r in results)}), flush=True)
