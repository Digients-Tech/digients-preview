"""Build browser skeleton data from MANO v2 + official HaWoR camera fields.

Producer: Digients-Tech/digients-hand-reconstruction @ 66da58e, README camera
schema and hawor.py. MANO joints already include translation and left mirroring.
Camera traj is camera-to-world xyz+xyzw; only camera translation needs scale.
The first camera defines the local origin; Rx(pi) converts CV y-down/z-forward
to the viewer's y-up/z-back. No missing hand is interpolated or fabricated.
"""
import numpy as np


def rotations(q):
    q = np.asarray(q, dtype=np.float64)
    norm = np.linalg.norm(q, axis=1, keepdims=True)
    if not np.isfinite(q).all() or np.any(norm < 1e-6):
        raise ValueError('invalid camera quaternion')
    x, y, z, w = (q / norm).T
    return np.stack((1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w),
                     2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w),
                     2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)), axis=1).reshape(-1,3,3)


def build_payload(mano, camera, episode_id):
    if str(mano['schema_version']) != 'digients.mano.v2':
        raise ValueError('requires MANO v2 track schema')
    fps = float(mano['fps'])
    valid = mano['valid']
    joints = mano['joints_3d']
    trajectory = camera['traj']
    n, tracks = valid.shape
    if not (n > 0 and 0 < fps <= 120 and trajectory.shape == (n,7)):
        raise ValueError('unaligned camera/hand frames')
    if joints.shape != (n, tracks, 21, 3) or not np.isfinite(joints[valid]).all():
        raise ValueError('invalid hand joints')
    if not np.allclose(mano['timestamp_sec'], np.arange(n)/fps, atol=1e-5):
        raise ValueError('unexpected hand timestamps')
    scale = float(camera['scale'])
    if not np.isfinite(trajectory).all() or not np.isfinite(scale) or scale <= 0:
        raise ValueError('invalid camera scale/trajectory')
    r = rotations(trajectory[:,3:])
    t = trajectory[:,:3] * scale
    basis = np.diag([1.,-1.,-1.]) @ r[0].T
    positions = (t-t[0]) @ basis.T
    orientations = np.einsum('ij,njk->nik', basis, r)
    world = np.einsum('nij,ntkj->ntki', orientations, joints) + positions[:,None,None,:]
    frames=[]
    for i in range(n):
        hands=[]
        for j in np.flatnonzero(valid[i]):
            side = str(mano['handedness'][i,j])
            if side not in ('left','right'):
                raise ValueError('valid hand without handedness')
            hands.append({'id':int(mano['track_ids'][j]), 'side':side,
                          'j':np.round(world[i,j].reshape(-1),5).tolist()})
        frames.append(hands)
    cloud=np.concatenate([positions,world[valid].reshape(-1,3)])
    # Bounds include every valid joint. The renderer can reset after orbiting.
    bounds=[cloud.min(axis=0).tolist(),cloud.max(axis=0).tolist()]
    cams=np.concatenate([positions,orientations.reshape(n,9)],axis=1)
    return {'version':1,'episodeId':episode_id,'fps':fps,'frameCount':n,
            'coordinateSystem':'clip-local-y-up','headSource':'camera-slam',
            'sourceCommit':'66da58edde58c1813ffa3c5ec4ad247e202c1703',
            'cameraScale':scale,'bounds':bounds,
            'cameras':np.round(cams,6).tolist(),'hands':frames}
