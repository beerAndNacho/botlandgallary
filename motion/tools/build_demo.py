#!/usr/bin/env python3
"""Download selected CMU BVH clips and build the static Motion Studio demo."""
from __future__ import annotations

import argparse
import json
import pathlib
import shutil
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

from bvh_to_mocap import ORDER, convert, settle_and_origin, smooth_loop  # noqa: E402
from cmu_index import INDEX_URL, parse_index, read_text  # noqa: E402

CMU_ROOT = "https://raw.githubusercontent.com/una-dinosauria/cmu-mocap/master/data"
ATTRIBUTION = "The data used in this project was obtained from mocap.cs.cmu.edu. The database was created with funding from NSF EIA-0196217."
STRIDE = len(ORDER) * 3

CLIPS = [
    {
        "id": "idle", "sourceId": "140_06", "name": "Idle / 서기", "description": "Getting Up From Ground subject idle capture",
        "dur": 8.0, "autoloop": True, "inplace": True, "smoothloop": 10, "loop": True, "tags": ["stand", "idle", "서기"],
    },
    {
        "id": "walk", "sourceId": "141_19", "name": "Walk / 걷기", "description": "General subject walk",
        "dur": 12.0, "autoloop": True, "inplace": True, "smoothloop": 10, "loop": True, "tags": ["walk", "걷기", "locomotion"],
    },
    {
        "id": "run", "sourceId": "141_01", "name": "Run / 달리기", "description": "General subject run",
        "dur": 10.0, "autoloop": True, "inplace": True, "smoothloop": 8, "loop": True, "tags": ["run", "달리기", "locomotion"],
    },
    {
        "id": "crawl", "sourceId": "133_02", "name": "Walk Crawl / 기어가기", "description": "Baby styled walk-crawl capture",
        "dur": 12.0, "autoloop": False, "inplace": True, "smoothloop": 0, "loop": False, "tags": ["crawl", "기어가기", "spine"],
    },
    {
        "id": "sneak", "sourceId": "142_22", "name": "Sneaky / 살금살금", "description": "Stylized sneaky walk",
        "dur": 12.0, "autoloop": False, "inplace": True, "smoothloop": 0, "loop": False, "tags": ["sneak", "stealth", "살금살금"],
    },
    {
        "id": "wave", "sourceId": "141_16", "name": "Wave Hello / 손 흔들기", "description": "General subject wave hello",
        "dur": 7.0, "autoloop": False, "inplace": True, "smoothloop": 0, "loop": False, "tags": ["wave", "손 흔들기", "gesture"],
    },
    {
        "id": "sitstand", "sourceId": "143_18", "name": "Sit Down & Get Up / 앉았다 일어서기", "description": "Sit down and get up",
        "dur": 14.0, "autoloop": False, "inplace": True, "smoothloop": 0, "loop": False, "tags": ["sit", "stand", "앉기", "일어서기"],
    },
    {
        "id": "jump", "sourceId": "141_04", "name": "Jump Distance / 점프", "description": "Jump distances",
        "dur": 8.0, "autoloop": False, "inplace": True, "smoothloop": 0, "loop": False, "tags": ["jump", "점프"],
    },
]


def source_url(source_id: str) -> str:
    subject = int(source_id.split("_", 1)[0])
    return f"{CMU_ROOT}/{subject:03d}/{source_id}.bvh"


def apply_local_loop_smoothing(clip: dict, count: int) -> None:
    """Smooth an in-place stream without corrupting its recorded mps.

    The converter records mps from the original root trajectory. Folding a translating
    root toward the loop start before --inplace inflates that speed, so the demo applies
    seam smoothing only after root translation has been removed.
    """
    if count <= 0 or clip["n"] < 4:
        return
    frames = []
    for frame_index in range(clip["n"]):
        offset = frame_index * STRIDE
        frame = []
        for joint_index in range(len(ORDER)):
            start = offset + joint_index * 3
            frame.append([float(value) for value in clip["j"][start:start + 3]])
        frames.append(frame)
    smooth_loop(frames, count)
    settle_and_origin(frames)
    clip["j"] = [round(value, 3) for frame in frames for point in frame for value in point]


def build(output: pathlib.Path) -> None:
    output.mkdir(parents=True, exist_ok=True)
    web_dir = ROOT / "web"
    for source in web_dir.iterdir():
        if source.is_file():
            shutil.copy2(source, output / source.name)
    clips_dir = output / "clips"
    clips_dir.mkdir(parents=True, exist_ok=True)

    index_text = read_text(INDEX_URL)
    index_clips = parse_index(index_text)
    index_by_id = {item["id"]: item for item in index_clips}
    (clips_dir / "index.json").write_text(
        json.dumps({"v": 1, "source": INDEX_URL, "count": len(index_clips), "clips": index_clips}, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )

    manifest_entries = []
    for config in CLIPS:
        url = source_url(config["sourceId"])
        clip = convert(
            url,
            name=config["name"],
            target_leg=0.87,
            start=0,
            duration=config["dur"],
            fps=30,
            yaw=180,
            mirror=False,
            auto_loop=config["autoloop"],
            inplace=config["inplace"],
            smoothloop=0,
            src_label=url,
        )
        apply_local_loop_smoothing(clip, config["smoothloop"])
        filename = f"{config['id']}.json"
        (clips_dir / filename).write_text(json.dumps(clip, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
        indexed = index_by_id.get(config["sourceId"], {})
        manifest_entries.append({
            "id": config["id"],
            "sourceId": config["sourceId"],
            "file": filename,
            "name": config["name"],
            "description": indexed.get("description", config["description"]),
            "src": url,
            "fps": clip["fps"],
            "n": clip["n"],
            "mps": clip.get("mps"),
            "loop": config["loop"],
            "inplace": config["inplace"],
            "tags": config["tags"],
        })
        print(f"built {config['id']}: {clip['n']} frames, mps={clip.get('mps')}")

    manifest = {
        "v": 1,
        "kind": "botland-motion-demo",
        "fps": 30,
        "jointCount": 19,
        "attribution": ATTRIBUTION,
        "clips": manifest_entries,
    }
    (clips_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main(argv=None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("output", nargs="?", default=str(ROOT / "dist" / "motion"))
    args = parser.parse_args(argv)
    output = pathlib.Path(args.output)
    if output.exists():
        shutil.rmtree(output)
    build(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
