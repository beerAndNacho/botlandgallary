#!/usr/bin/env python3
"""Convert a CMU BVH clip to a compact deterministic 19-joint motion stream.

Pure Python, standard library only.

Output schema:
{
  "v": 1,
  "kind": "mocap",
  "name": str,
  "fps": number,
  "n": int,
  "order": [19 joint names],
  "j": [n * 19 * 3 floats],
  "src": str,
  "mps": optional number
}
"""
from __future__ import annotations

import argparse
import json
import math
import pathlib
import re
import sys
import time
import urllib.request
from dataclasses import dataclass, field
from typing import Iterable, Sequence

ORDER = [
    "pel", "spine", "chest", "neck", "head",
    "L_hip", "L_knee", "L_ank", "L_toe",
    "R_hip", "R_knee", "R_ank", "R_toe",
    "L_sho", "L_elb", "L_hnd",
    "R_sho", "R_elb", "R_hnd",
]

ALIASES = {
    "pel": ["Hips", "Pelvis", "Root"],
    "spine": ["Spine", "LowerBack", "Spine0"],
    "chest": ["Spine1", "Spine2", "UpperBack", "Chest"],
    "neck": ["Neck1", "Neck", "UpperNeck"],
    "head": ["Head"],
    "L_hip": ["LeftUpLeg", "LHip", "LeftHip"],
    "L_knee": ["LeftLeg", "LeftKnee", "LKnee"],
    "L_ank": ["LeftFoot", "LeftAnkle", "LAnkle"],
    "L_toe": ["LeftToeBase", "LeftToe", "LToe"],
    "R_hip": ["RightUpLeg", "RHip", "RightHip"],
    "R_knee": ["RightLeg", "RightKnee", "RKnee"],
    "R_ank": ["RightFoot", "RightAnkle", "RAnkle"],
    "R_toe": ["RightToeBase", "RightToe", "RToe"],
    "L_sho": ["LeftArm", "LeftShoulder", "LShoulder"],
    "L_elb": ["LeftForeArm", "LeftElbow", "LElbow"],
    "L_hnd": ["LeftHand", "LHand", "LeftWrist"],
    "R_sho": ["RightArm", "RightShoulder", "RShoulder"],
    "R_elb": ["RightForeArm", "RightElbow", "RElbow"],
    "R_hnd": ["RightHand", "RHand", "RightWrist"],
}

LEFT_RIGHT_PAIRS = [
    (ORDER.index("L_hip"), ORDER.index("R_hip")),
    (ORDER.index("L_knee"), ORDER.index("R_knee")),
    (ORDER.index("L_ank"), ORDER.index("R_ank")),
    (ORDER.index("L_toe"), ORDER.index("R_toe")),
    (ORDER.index("L_sho"), ORDER.index("R_sho")),
    (ORDER.index("L_elb"), ORDER.index("R_elb")),
    (ORDER.index("L_hnd"), ORDER.index("R_hnd")),
]

Vec3 = tuple[float, float, float]
Mat3 = tuple[tuple[float, float, float], tuple[float, float, float], tuple[float, float, float]]
Frame19 = list[list[float]]


@dataclass
class Joint:
    name: str
    parent: int
    offset: Vec3 = (0.0, 0.0, 0.0)
    channels: list[str] = field(default_factory=list)
    channel_start: int = 0
    children: list[int] = field(default_factory=list)


@dataclass
class BVH:
    joints: list[Joint]
    frames: list[list[float]]
    frame_time: float
    channel_count: int


class ParseError(ValueError):
    pass


def read_text(source: str) -> str:
    if source.startswith(("http://", "https://")):
        last_error = None
        for attempt in range(3):
            try:
                req = urllib.request.Request(source, headers={"User-Agent": "botland-mocap/1.0"})
                with urllib.request.urlopen(req, timeout=90) as response:
                    return response.read().decode("utf-8", errors="replace")
            except Exception as error:  # network retry, still standard-library only
                last_error = error
                if attempt < 2:
                    time.sleep(2 ** attempt)
        raise RuntimeError(f"Failed to download {source}: {last_error}")
    return pathlib.Path(source).read_text(encoding="utf-8", errors="replace")


def tokenize_hierarchy(text: str) -> list[str]:
    return re.findall(r"[{}]|[^\s{}]+", text)


def parse_bvh(text: str) -> BVH:
    if "MOTION" not in text:
        raise ParseError("BVH is missing MOTION section")
    hierarchy_text, motion_text = text.split("MOTION", 1)
    tokens = tokenize_hierarchy(hierarchy_text)
    pos = 0
    joints: list[Joint] = []
    channel_cursor = 0

    def take(expected: str | None = None) -> str:
        nonlocal pos
        if pos >= len(tokens):
            raise ParseError(f"Unexpected end of hierarchy; expected {expected!r}")
        token = tokens[pos]
        pos += 1
        if expected is not None and token != expected:
            raise ParseError(f"Expected {expected!r}, got {token!r}")
        return token

    def parse_end_site() -> None:
        take("Site")
        take("{")
        while True:
            token = take()
            if token == "}":
                return
            if token == "OFFSET":
                take(); take(); take()
            else:
                raise ParseError(f"Unexpected End Site token: {token!r}")

    def parse_joint(kind: str, parent: int) -> int:
        nonlocal channel_cursor
        name = take()
        index = len(joints)
        joints.append(Joint(name=name, parent=parent))
        if parent >= 0:
            joints[parent].children.append(index)
        take("{")
        while True:
            token = take()
            if token == "}":
                break
            if token == "OFFSET":
                joints[index].offset = (float(take()), float(take()), float(take()))
            elif token == "CHANNELS":
                count = int(take())
                channels = [take() for _ in range(count)]
                joints[index].channels = channels
                joints[index].channel_start = channel_cursor
                channel_cursor += count
            elif token == "JOINT":
                parse_joint("JOINT", index)
            elif token == "End":
                parse_end_site()
            else:
                raise ParseError(f"Unexpected hierarchy token {token!r} in joint {name!r}")
        return index

    if take() != "HIERARCHY":
        raise ParseError("BVH must start with HIERARCHY")
    if take() != "ROOT":
        raise ParseError("BVH hierarchy must contain ROOT")
    parse_joint("ROOT", -1)
    if pos != len(tokens):
        trailing = " ".join(tokens[pos:pos + 8])
        raise ParseError(f"Unexpected hierarchy tail: {trailing}")

    frames_match = re.search(r"Frames\s*:\s*(\d+)", motion_text, re.IGNORECASE)
    time_match = re.search(r"Frame\s+Time\s*:\s*([-+0-9.eE]+)", motion_text, re.IGNORECASE)
    if not frames_match or not time_match:
        raise ParseError("MOTION section is missing Frames or Frame Time")
    frame_count = int(frames_match.group(1))
    frame_time = float(time_match.group(1))
    if frame_count <= 0 or frame_time <= 0:
        raise ParseError("Invalid frame count or frame time")
    data_start = time_match.end()
    numbers = [float(value) for value in re.findall(r"[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?", motion_text[data_start:])]
    expected = frame_count * channel_cursor
    if len(numbers) < expected:
        raise ParseError(f"MOTION has {len(numbers)} values; expected {expected}")
    if len(numbers) > expected:
        numbers = numbers[:expected]
    frames = [numbers[i * channel_cursor:(i + 1) * channel_cursor] for i in range(frame_count)]
    return BVH(joints=joints, frames=frames, frame_time=frame_time, channel_count=channel_cursor)


def mat_identity() -> Mat3:
    return ((1.0, 0.0, 0.0), (0.0, 1.0, 0.0), (0.0, 0.0, 1.0))


def mat_mul(a: Mat3, b: Mat3) -> Mat3:
    return tuple(
        tuple(sum(a[r][k] * b[k][c] for k in range(3)) for c in range(3))
        for r in range(3)
    )  # type: ignore[return-value]


def mat_vec(m: Mat3, v: Sequence[float]) -> Vec3:
    return (
        m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
        m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
        m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
    )


def rot_x(degrees: float) -> Mat3:
    a = math.radians(degrees); c = math.cos(a); s = math.sin(a)
    return ((1.0, 0.0, 0.0), (0.0, c, -s), (0.0, s, c))


def rot_y(degrees: float) -> Mat3:
    a = math.radians(degrees); c = math.cos(a); s = math.sin(a)
    return ((c, 0.0, s), (0.0, 1.0, 0.0), (-s, 0.0, c))


def rot_z(degrees: float) -> Mat3:
    a = math.radians(degrees); c = math.cos(a); s = math.sin(a)
    return ((c, -s, 0.0), (s, c, 0.0), (0.0, 0.0, 1.0))


ROTATIONS = {"Xrotation": rot_x, "Yrotation": rot_y, "Zrotation": rot_z}
POSITION_AXES = {"Xposition": 0, "Yposition": 1, "Zposition": 2}


def fk_frame(bvh: BVH, values: Sequence[float]) -> list[Vec3]:
    world_pos: list[Vec3] = [(0.0, 0.0, 0.0)] * len(bvh.joints)
    world_rot: list[Mat3] = [mat_identity()] * len(bvh.joints)
    for index, joint in enumerate(bvh.joints):
        local_t = [joint.offset[0], joint.offset[1], joint.offset[2]]
        local_r = mat_identity()
        for offset, channel in enumerate(joint.channels):
            value = values[joint.channel_start + offset]
            if channel in POSITION_AXES:
                local_t[POSITION_AXES[channel]] += value
            elif channel in ROTATIONS:
                local_r = mat_mul(local_r, ROTATIONS[channel](value))
            else:
                raise ParseError(f"Unsupported channel: {channel}")
        if joint.parent < 0:
            world_pos[index] = (local_t[0], local_t[1], local_t[2])
            world_rot[index] = local_r
        else:
            parent_r = world_rot[joint.parent]
            rotated = mat_vec(parent_r, local_t)
            parent_p = world_pos[joint.parent]
            world_pos[index] = (parent_p[0] + rotated[0], parent_p[1] + rotated[1], parent_p[2] + rotated[2])
            world_rot[index] = mat_mul(parent_r, local_r)
    return world_pos


def resolve_mapping(joints: Sequence[Joint]) -> list[int]:
    exact = {joint.name.lower(): i for i, joint in enumerate(joints)}
    result: list[int] = []
    missing: list[str] = []
    for target in ORDER:
        found = None
        for alias in ALIASES[target]:
            if alias.lower() in exact:
                found = exact[alias.lower()]
                break
        if found is None:
            # Conservative contains fallback for skeletons with namespaces/prefixes.
            for alias in ALIASES[target]:
                alias_l = alias.lower()
                candidates = [i for i, joint in enumerate(joints) if joint.name.lower().endswith(alias_l)]
                if candidates:
                    found = candidates[0]
                    break
        if found is None:
            missing.append(target)
            result.append(-1)
        else:
            result.append(found)
    if missing:
        names = ", ".join(joint.name for joint in joints)
        raise ParseError(f"Could not map joints: {', '.join(missing)}. BVH joints: {names}")
    return result


def distance(a: Sequence[float], b: Sequence[float]) -> float:
    return math.sqrt(sum((a[i] - b[i]) ** 2 for i in range(3)))


def measure_leg_length(mapped: Sequence[Sequence[float]]) -> float:
    li = ORDER.index("L_hip"); lk = ORDER.index("L_knee"); la = ORDER.index("L_ank")
    ri = ORDER.index("R_hip"); rk = ORDER.index("R_knee"); ra = ORDER.index("R_ank")
    left = distance(mapped[li], mapped[lk]) + distance(mapped[lk], mapped[la])
    right = distance(mapped[ri], mapped[rk]) + distance(mapped[rk], mapped[ra])
    value = (left + right) * 0.5
    if value <= 1e-8:
        raise ParseError("Measured leg length is zero")
    return value


def rotate_y_point(point: Sequence[float], degrees: float) -> list[float]:
    a = math.radians(degrees); c = math.cos(a); s = math.sin(a)
    x, y, z = point
    return [c * x + s * z, y, -s * x + c * z]


def normalize(v: Sequence[float]) -> list[float]:
    length = math.sqrt(sum(x * x for x in v))
    if length <= 1e-9:
        return [0.0, 1.0, 0.0]
    return [x / length for x in v]


def transform_mapped(mapped: Sequence[Sequence[float]], scale: float, yaw: float, mirror: bool) -> Frame19:
    frame: Frame19 = []
    for point in mapped:
        scaled = [point[0] * scale, point[1] * scale, point[2] * scale]
        rotated = rotate_y_point(scaled, yaw)
        if mirror:
            rotated[0] = -rotated[0]
        frame.append(rotated)
    if mirror:
        for left, right in LEFT_RIGHT_PAIRS:
            frame[left], frame[right] = frame[right], frame[left]
    neck = frame[ORDER.index("neck")]
    head = frame[ORDER.index("head")]
    direction = normalize([head[i] - neck[i] for i in range(3)])
    frame[ORDER.index("head")] = [head[i] + direction[i] * 0.125 for i in range(3)]
    return frame


def lerp_frame(a: Frame19, b: Frame19, t: float) -> Frame19:
    return [[a[j][k] + (b[j][k] - a[j][k]) * t for k in range(3)] for j in range(len(ORDER))]


def resample(frames: Sequence[Frame19], source_fps: float, target_fps: float, start: float, duration: float | None) -> list[Frame19]:
    if not frames:
        raise ParseError("No source frames")
    total_duration = len(frames) / source_fps
    start = max(0.0, min(start, max(0.0, total_duration - 1.0 / source_fps)))
    end = total_duration if duration is None else min(total_duration, start + max(0.0, duration))
    count_float = max(1.0, max(1.0 / target_fps, end - start) * target_fps)
    nearest = round(count_float)
    sample_count = max(1, int(nearest if abs(count_float - nearest) < 1e-4 else math.ceil(count_float - 1e-9)))
    output: list[Frame19] = []
    for i in range(sample_count):
        t = min(start + i / target_fps, (len(frames) - 1) / source_fps)
        source_index = t * source_fps
        lo = min(len(frames) - 1, int(math.floor(source_index)))
        hi = min(len(frames) - 1, lo + 1)
        alpha = source_index - lo
        output.append(lerp_frame(frames[lo], frames[hi], alpha) if hi != lo else [[*p] for p in frames[lo]])
    return output


def relative_vector(frame: Frame19) -> list[float]:
    pel = frame[0]
    vector: list[float] = []
    for point in frame:
        vector.extend((point[0] - pel[0], point[1] - pel[1], point[2] - pel[2]))
    return vector


def rms_distance(a: Sequence[float], b: Sequence[float]) -> float:
    return math.sqrt(sum((a[i] - b[i]) ** 2 for i in range(len(a))) / max(1, len(a)))


def velocity_vector(vectors: Sequence[Sequence[float]], index: int) -> list[float]:
    if len(vectors) == 1:
        return [0.0] * len(vectors[0])
    before = vectors[max(0, index - 1)]
    after = vectors[min(len(vectors) - 1, index + 1)]
    divisor = 2.0 if 0 < index < len(vectors) - 1 else 1.0
    return [(after[i] - before[i]) / divisor for i in range(len(before))]


def autoloop(frames: list[Frame19], fps: float) -> tuple[list[Frame19], tuple[int, int] | None]:
    n = len(frames)
    min_gap = max(4, int(round(fps * 0.6)))
    if n < min_gap + 2:
        return frames, None
    vectors = [relative_vector(frame) for frame in frames]
    step = max(1, n // 550)
    candidates = list(range(0, n, step))
    if candidates[-1] != n - 1:
        candidates.append(n - 1)
    best_score = float("inf")
    best = (0, n - 1)
    shortlist: list[tuple[float, int, int]] = []
    velocities: dict[int, list[float]] = {}

    def score_pair(i: int, j: int) -> float:
        pose = rms_distance(vectors[i], vectors[j])
        if i not in velocities:
            velocities[i] = velocity_vector(vectors, i)
        if j not in velocities:
            velocities[j] = velocity_vector(vectors, j)
        velocity = rms_distance(velocities[i], velocities[j])
        length_bonus = 0.0025 * math.log1p((j - i) / fps)
        return pose + 0.15 * velocity - length_bonus

    for ai, i in enumerate(candidates):
        for j in candidates[ai + 1:]:
            if j - i < min_gap:
                continue
            score = score_pair(i, j)
            if score < best_score:
                best_score, best = score, (i, j)
            shortlist.append((score, i, j))
    shortlist.sort(key=lambda item: item[0])
    for _, ci, cj in shortlist[:16]:
        for i in range(max(0, ci - step), min(n, ci + step + 1)):
            low_j = max(i + min_gap, cj - step)
            for j in range(low_j, min(n, cj + step + 1)):
                score = score_pair(i, j)
                if score < best_score:
                    best_score, best = score, (i, j)
    start, end = best
    if end - start < min_gap:
        return frames, None
    # Exclude the duplicate-like end frame so the loop seam is end-1 -> start.
    return [[[value for value in point] for point in frame] for frame in frames[start:end]], best


def smoothstep(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return t * t * (3.0 - 2.0 * t)


def smooth_loop(frames: list[Frame19], count: int) -> None:
    if count <= 0 or len(frames) < 4:
        return
    count = min(count, len(frames) // 2)
    original_start = [[[*point] for point in frame] for frame in frames[:count]]
    original_end = [[[*point] for point in frame] for frame in frames[-count:]]
    seam_delta = [
        [original_start[0][joint][axis] - original_end[-1][joint][axis] for axis in range(3)]
        for joint in range(len(ORDER))
    ]
    for i in range(count):
        end_w = 0.5 * smoothstep((i + 1) / count)
        start_w = 0.5 * smoothstep((count - i) / count)
        for joint in range(len(ORDER)):
            for axis in range(3):
                frames[len(frames) - count + i][joint][axis] = original_end[i][joint][axis] + seam_delta[joint][axis] * end_w
                frames[i][joint][axis] = original_start[i][joint][axis] - seam_delta[joint][axis] * start_w


def settle_and_origin(frames: list[Frame19]) -> None:
    if not frames:
        return
    left_ank = ORDER.index("L_ank"); right_ank = ORDER.index("R_ank")
    floor = min(frame[index][1] for frame in frames for index in (left_ank, right_ank))
    origin_x, origin_z = frames[0][0][0], frames[0][0][2]
    for frame in frames:
        for point in frame:
            point[0] -= origin_x
            point[1] -= floor
            point[2] -= origin_z


def make_inplace(frames: list[Frame19], fps: float) -> float:
    if not frames:
        return 0.0
    roots = [(frame[0][0], frame[0][2]) for frame in frames]
    path_length = sum(math.hypot(roots[i][0] - roots[i - 1][0], roots[i][1] - roots[i - 1][1]) for i in range(1, len(roots)))
    duration = max(1.0 / fps, (len(frames) - 1) / fps)
    mps = path_length / duration
    for frame, (root_x, root_z) in zip(frames, roots):
        for point in frame:
            point[0] -= root_x
            point[2] -= root_z
    return mps


def convert(
    source: str,
    *,
    name: str | None = None,
    target_leg: float = 0.87,
    start: float = 0.0,
    duration: float | None = None,
    fps: float = 30.0,
    yaw: float = 180.0,
    mirror: bool = False,
    auto_loop: bool = False,
    inplace: bool = False,
    smoothloop: int = 0,
    src_label: str | None = None,
) -> dict:
    text = read_text(source)
    bvh = parse_bvh(text)
    mapping = resolve_mapping(bvh.joints)
    first_world = fk_frame(bvh, bvh.frames[0])
    first_mapped = [first_world[index] for index in mapping]
    raw_leg = measure_leg_length(first_mapped)
    scale = target_leg / raw_leg
    source_frames: list[Frame19] = []
    for values in bvh.frames:
        world = fk_frame(bvh, values)
        mapped = [world[index] for index in mapping]
        source_frames.append(transform_mapped(mapped, scale, yaw, mirror))
    resampled = resample(source_frames, 1.0 / bvh.frame_time, fps, start, duration)
    if auto_loop:
        resampled, _ = autoloop(resampled, fps)
    # Measure the original horizontal root trajectory before any loop seam blend.
    # Blending a translating root toward frame zero inflates mps and causes foot slip.
    settle_and_origin(resampled)
    mps = make_inplace(resampled, fps) if inplace else None
    if smoothloop:
        smooth_loop(resampled, smoothloop)
        settle_and_origin(resampled)
    flat: list[float] = []
    for frame in resampled:
        for point in frame:
            flat.extend(round(value, 3) for value in point)
    if name is None:
        parsed = pathlib.PurePosixPath(source.split("?", 1)[0])
        name = parsed.stem or "motion"
    result = {
        "v": 1,
        "kind": "mocap",
        "name": name,
        "fps": int(fps) if float(fps).is_integer() else round(fps, 3),
        "n": len(resampled),
        "order": ORDER,
        "j": flat,
        "src": src_label or source,
    }
    if mps is not None:
        result["mps"] = round(mps, 3)
    return result


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Convert CMU BVH to a deterministic 19-joint JSON stream")
    parser.add_argument("input", help="BVH file path or http(s) URL")
    parser.add_argument("output", nargs="?", help="Output JSON path; defaults to stdout")
    parser.add_argument("--name")
    parser.add_argument("--src", help="Source string written to output JSON")
    parser.add_argument("--target-leg", type=float, default=0.87, help="Target thigh+shin length in metres (default: 0.87)")
    parser.add_argument("--start", type=float, default=0.0, help="Start time in seconds")
    parser.add_argument("--dur", type=float, help="Duration in seconds")
    parser.add_argument("--fps", type=float, default=30.0)
    parser.add_argument("--yaw", type=float, default=180.0, help="Yaw degrees; 180 converts CMU +z front to target -z")
    parser.add_argument("--mirror", action="store_true")
    parser.add_argument("--autoloop", action="store_true")
    parser.add_argument("--inplace", action="store_true")
    parser.add_argument("--smoothloop", type=int, default=0, metavar="N")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.fps <= 0 or args.target_leg <= 0:
        raise SystemExit("--fps and --target-leg must be positive")
    data = convert(
        args.input,
        name=args.name,
        target_leg=args.target_leg,
        start=args.start,
        duration=args.dur,
        fps=args.fps,
        yaw=args.yaw,
        mirror=args.mirror,
        auto_loop=args.autoloop,
        inplace=args.inplace,
        smoothloop=args.smoothloop,
        src_label=args.src,
    )
    encoded = json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n"
    if args.output:
        pathlib.Path(args.output).parent.mkdir(parents=True, exist_ok=True)
        pathlib.Path(args.output).write_text(encoded, encoding="utf-8")
    else:
        sys.stdout.write(encoded)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
