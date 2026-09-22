"""Numerical checks for camera convention, track visibility and frame alignment."""
import sys, unittest
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'deploy'))
from spatial_payload import build_payload

class SpatialConversion(unittest.TestCase):
    def fixture(self):
        m={'schema_version':'digients.mano.v2','fps':20.,'valid':np.array([[True,False,True],[True,True,False]]),
           'joints_3d':np.tile(np.array([1.,2.,3.]),(2,3,21,1)),
           'timestamp_sec':np.array([0.,.05]),'track_ids':np.array([8,2,11]),
           'handedness':np.array([['left','','right'],['left','right','']])}
        m['joints_3d'][~m['valid']]=np.nan
        c={'traj':np.array([[0,0,0,0,0,0,1],[1,0,0,0,0,np.sqrt(.5),np.sqrt(.5)]]),'scale':2.}
        return m,c
    def test_world_transform_scale_and_no_double_left_mirror(self):
        m,c=self.fixture();p=build_payload(m,c,'test')
        np.testing.assert_allclose(p['hands'][0][0]['j'][:3],[1,-2,-3])
        np.testing.assert_allclose(p['hands'][1][0]['j'][:3],[0,-1,-3])
        np.testing.assert_allclose(p['cameras'][1][:3],[2,0,0])
        self.assertEqual([h['id'] for h in p['hands'][0]],[8,11])
        self.assertEqual([h['id'] for h in p['hands'][1]],[8,2])
    def test_first_camera_defines_origin(self):
        m,c=self.fixture();c['traj'][:,:3]+=[12,4,-6];p=build_payload(m,c,'test')
        np.testing.assert_allclose(p['cameras'][0][:3],[0,0,0])
        np.testing.assert_allclose(p['cameras'][1][:3],[2,0,0])
    def test_rejects_bad_frames_and_invalid_valid_joints(self):
        m,c=self.fixture();c['traj']=c['traj'][:1]
        with self.assertRaises(ValueError):build_payload(m,c,'test')
        m,c=self.fixture();m['joints_3d'][0,0,0,0]=np.nan
        with self.assertRaises(ValueError):build_payload(m,c,'test')
    def test_rejects_bad_time_and_scale(self):
        m,c=self.fixture();m['timestamp_sec'][1]=.1
        with self.assertRaises(ValueError):build_payload(m,c,'test')
        m,c=self.fixture();c['scale']=0
        with self.assertRaises(ValueError):build_payload(m,c,'test')
if __name__=='__main__':unittest.main()
