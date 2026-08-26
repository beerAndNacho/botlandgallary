# Botland Motion Studio

A deterministic 2D motion system built from real CMU Motion Capture Database BVH files.

## What is implemented

- Pure-Python, dependency-free BVH hierarchy parser and forward kinematics
- Exact 19-joint output order:
  `pel spine chest neck head / L_hip L_knee L_ank L_toe / R_hip R_knee R_ank R_toe / L_sho L_elb L_hnd / R_sho R_elb R_hnd`
- Single-scale retargeting to a target thigh+shin length (default `0.87 m`)
- CMU +z front to target -z conversion with default `--yaw 180`
- `--mirror`, head-centre correction, floor settling, root origin, 30 fps resampling and three-decimal output
- `--autoloop`, `--inplace`, `mps`, and `--smoothloop N`
- Canvas `Path2D` renderer with capsule bones, circle joints, torso arc-length resampling, and ±0.10 m depth band
- Actor sequencing with deterministic `render(t)`, cross-clip blending, PCHIP/Fritsch–Carlson paths, yaw unwrapping, speed matching and phase continuity
- Browser demo using selected high-numbered CMU captures
- Python, JavaScript and real-data acceptance tests

## Convert one clip

```bash
python tools/bvh_to_mocap.py \
  https://raw.githubusercontent.com/una-dinosauria/cmu-mocap/master/data/141/141_19.bvh \
  walk.json \
  --target-leg 0.87 \
  --fps 30 \
  --yaw 180 \
  --autoloop \
  --inplace \
  --smoothloop 10
```

Available options:

```text
--start SEC --dur SEC --fps FPS --yaw DEG --mirror
--target-leg METRES --autoloop --inplace --smoothloop N
```

## JSON format

```json
{
  "v": 1,
  "kind": "mocap",
  "name": "Walk / 걷기",
  "fps": 30,
  "n": 180,
  "order": ["pel", "spine", "...", "R_hnd"],
  "j": [0.0, 0.9, 0.0],
  "src": "https://.../141_19.bvh",
  "mps": 1.18
}
```

`j` is a flat `n × 19 × 3` array. `mps` is present for `--inplace` output.

## Sequence model

```js
const actor = {
  seq: [
    { clip: 'idle', at: 0, phaseAt: 0, rate: 1, loop: true, blend: 0.35 },
    { clip: 'walk', at: 2, phaseAt: 2, rate: 1.1, loop: true, blend: 0.35 },
  ],
  path: [
    { t: 0, x: 0, y: 0, z: 0 },
    { t: 8, x: 0, y: 0, z: -7 },
  ],
  face: [],
};
```

`at` selects the current sequence item. `phaseAt` is the clip-phase origin; it keeps selection boundaries fixed while allowing the requested phase-continuity formula:

```text
phaseAt(k+1) = tb - (tb - phaseAt(k)) * rate(k) / rate(k+1)
```

## Tests

```bash
python -m unittest discover -s tests -p 'test_*.py' -v
node --test tests/test_motion_core.mjs
```

After real demo clips are built:

```bash
MOTION_CLIPS_DIR=dist/motion/clips node --test tests/test_real_clips.mjs
```

## Attribution

> The data used in this project was obtained from mocap.cs.cmu.edu. The database was created with funding from NSF EIA-0196217.

The BVH mirror is `una-dinosauria/cmu-mocap`, based on the Bruce Hahne/cgspeed conversion of the CMU database.
