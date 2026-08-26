from __future__ import annotations

import json
import math
import pathlib
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
import sys
sys.path.insert(0, str(ROOT / "tools"))

from bvh_to_mocap import (  # noqa: E402
    ORDER,
    autoloop,
    convert,
    make_inplace,
    parse_bvh,
    resolve_mapping,
    settle_and_origin,
    smooth_loop,
)


def synthetic_bvh(frame_count: int = 12, fps: float = 60.0) -> str:
    hierarchy = """HIERARCHY
ROOT Hips
{
 OFFSET 0 0 0
 CHANNELS 6 Xposition Yposition Zposition Zrotation Yrotation Xrotation
 JOINT LeftUpLeg
 {
  OFFSET 0.3 -0.2 0
  CHANNELS 3 Zrotation Yrotation Xrotation
  JOINT LeftLeg
  {
   OFFSET 0 -1 0
   CHANNELS 3 Zrotation Yrotation Xrotation
   JOINT LeftFoot
   {
    OFFSET 0 -1 0
    CHANNELS 3 Zrotation Yrotation Xrotation
    JOINT LeftToeBase
    {
     OFFSET 0 -0.1 0.35
     CHANNELS 3 Zrotation Yrotation Xrotation
     End Site { OFFSET 0 0 0.2 }
    }
   }
  }
 }
 JOINT RightUpLeg
 {
  OFFSET -0.3 -0.2 0
  CHANNELS 3 Zrotation Yrotation Xrotation
  JOINT RightLeg
  {
   OFFSET 0 -1 0
   CHANNELS 3 Zrotation Yrotation Xrotation
   JOINT RightFoot
   {
    OFFSET 0 -1 0
    CHANNELS 3 Zrotation Yrotation Xrotation
    JOINT RightToeBase
    {
     OFFSET 0 -0.1 0.35
     CHANNELS 3 Zrotation Yrotation Xrotation
     End Site { OFFSET 0 0 0.2 }
    }
   }
  }
 }
 JOINT Spine
 {
  OFFSET 0 0.55 0
  CHANNELS 3 Zrotation Yrotation Xrotation
  JOINT Spine1
  {
   OFFSET 0 0.55 0
   CHANNELS 3 Zrotation Yrotation Xrotation
   JOINT Neck1
   {
    OFFSET 0 0.45 0
    CHANNELS 3 Zrotation Yrotation Xrotation
    JOINT Head
    {
     OFFSET 0 0.35 0
     CHANNELS 3 Zrotation Yrotation Xrotation
     End Site { OFFSET 0 0.25 0 }
    }
   }
   JOINT LeftArm
   {
    OFFSET 0.55 0.25 0
    CHANNELS 3 Zrotation Yrotation Xrotation
    JOINT LeftForeArm
    {
     OFFSET 0.65 0 0
     CHANNELS 3 Zrotation Yrotation Xrotation
     JOINT LeftHand
     {
      OFFSET 0.5 0 0
      CHANNELS 3 Zrotation Yrotation Xrotation
      End Site { OFFSET 0.2 0 0 }
     }
    }
   }
   JOINT RightArm
   {
    OFFSET -0.55 0.25 0
    CHANNELS 3 Zrotation Yrotation Xrotation
    JOINT RightForeArm
    {
     OFFSET -0.65 0 0
     CHANNELS 3 Zrotation Yrotation Xrotation
     JOINT RightHand
     {
      OFFSET -0.5 0 0
      CHANNELS 3 Zrotation Yrotation Xrotation
      End Site { OFFSET -0.2 0 0 }
     }
    }
   }
  }
 }
}
"""
    parsed = parse_bvh(hierarchy + "MOTION\nFrames: 1\nFrame Time: 0.0166667\n" + " ".join(["0"] * 60))
    count = parsed.channel_count
    frames = []
    for i in range(frame_count):
        values = [0.0] * count
        values[0] = i * 0.08
        values[1] = 2.2
        values[2] = i * 0.02
        # Root rotation channels are Z, Y, X at indices 3..5.
        values[4] = i * 1.5
        # Alternating leg and arm swing.
        phase = math.sin(i / max(1, frame_count - 1) * math.pi * 2)
        values[6] = phase * 18
        values[18] = -phase * 18
        values[42] = -phase * 22
        values[51] = phase * 22
        frames.append(" ".join(f"{value:.6f}" for value in values))
    return hierarchy + f"MOTION\nFrames: {frame_count}\nFrame Time: {1 / fps:.7f}\n" + "\n".join(frames) + "\n"


class ConverterTests(unittest.TestCase):
    def test_parse_and_map_19_joints(self):
        bvh = parse_bvh(synthetic_bvh())
        mapping = resolve_mapping(bvh.joints)
        self.assertEqual(len(mapping), 19)
        self.assertEqual(len(set(mapping)), 19)
        self.assertEqual(bvh.channel_count, 60)

    def test_convert_schema_resample_floor_and_origin(self):
        with tempfile.TemporaryDirectory() as directory:
            path = pathlib.Path(directory) / "synthetic.bvh"
            path.write_text(synthetic_bvh(frame_count=12, fps=60), encoding="utf-8")
            result = convert(str(path), fps=30, yaw=180, target_leg=0.87)
        self.assertEqual(result["order"], ORDER)
        self.assertEqual(result["kind"], "mocap")
        self.assertEqual(result["fps"], 30)
        self.assertEqual(result["n"], 6)
        self.assertEqual(len(result["j"]), result["n"] * 57)
        first = result["j"][:57]
        self.assertAlmostEqual(first[0], 0.0, places=3)
        self.assertAlmostEqual(first[2], 0.0, places=3)
        ankle_y = []
        for frame in range(result["n"]):
            base = frame * 57
            ankle_y.append(result["j"][base + ORDER.index("L_ank") * 3 + 1])
            ankle_y.append(result["j"][base + ORDER.index("R_ank") * 3 + 1])
        self.assertAlmostEqual(min(ankle_y), 0.0, places=3)
        neck = first[ORDER.index("neck") * 3:ORDER.index("neck") * 3 + 3]
        head = first[ORDER.index("head") * 3:ORDER.index("head") * 3 + 3]
        self.assertGreater(math.dist(neck, head), 0.125)

    def test_mirror_swaps_left_and_right(self):
        with tempfile.TemporaryDirectory() as directory:
            path = pathlib.Path(directory) / "synthetic.bvh"
            path.write_text(synthetic_bvh(frame_count=4), encoding="utf-8")
            normal = convert(str(path), fps=60, yaw=0, mirror=False)
            mirrored = convert(str(path), fps=60, yaw=0, mirror=True)
        n = normal["j"][:57]
        m = mirrored["j"][:57]
        left = ORDER.index("L_sho") * 3
        right = ORDER.index("R_sho") * 3
        self.assertAlmostEqual(m[left], -n[right], places=3)
        self.assertAlmostEqual(m[right], -n[left], places=3)

    def test_inplace_records_speed_and_locks_root(self):
        with tempfile.TemporaryDirectory() as directory:
            path = pathlib.Path(directory) / "synthetic.bvh"
            path.write_text(synthetic_bvh(frame_count=60, fps=60), encoding="utf-8")
            result = convert(str(path), fps=30, yaw=0, inplace=True)
        self.assertGreater(result["mps"], 0.1)
        for frame in range(result["n"]):
            base = frame * 57
            self.assertAlmostEqual(result["j"][base], 0.0, places=3)
            self.assertAlmostEqual(result["j"][base + 2], 0.0, places=3)

    def test_autoloop_prefers_repeated_pose_not_shortest_gap(self):
        frames = []
        for i in range(80):
            phase = (i % 30) / 30 * math.pi * 2
            frame = [[0.0, 1.0, 0.0] for _ in ORDER]
            for joint in range(len(ORDER)):
                frame[joint] = [math.sin(phase + joint * 0.1) * 0.1, 1 + joint * 0.01, math.cos(phase + joint * 0.1) * 0.05]
            frames.append(frame)
        loop, pair = autoloop(frames, 30)
        self.assertIsNotNone(pair)
        self.assertGreaterEqual(len(loop), 18)

    def test_smoothloop_reduces_seam(self):
        frames = []
        for i in range(20):
            frames.append([[i * 0.01, 1 + joint * 0.01, 0.0] for joint in range(len(ORDER))])
        before = math.dist(frames[0][0], frames[-1][0])
        smooth_loop(frames, 5)
        after = math.dist(frames[0][0], frames[-1][0])
        self.assertLess(after, before)


if __name__ == "__main__":
    unittest.main()
