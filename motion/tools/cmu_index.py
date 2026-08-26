#!/usr/bin/env python3
"""Parse the CMU mocap text index into compact JSON."""
from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys
import time
import urllib.request

INDEX_URL = "https://raw.githubusercontent.com/una-dinosauria/cmu-mocap/master/cmu-mocap-index-text.txt"
BVH_ROOT = "https://raw.githubusercontent.com/una-dinosauria/cmu-mocap/master/data"


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


def parse_index(text: str) -> list[dict]:
    subject = None
    subject_label = ""
    result: list[dict] = []
    subject_re = re.compile(r"^Subject\s+#(\d+)\s*(?:\((.*?)\))?", re.IGNORECASE)
    clip_re = re.compile(r"^\s*(\d{1,3})_(\d{1,3})\s+(.+?)\s*$")
    for raw in text.splitlines():
        line = raw.strip("\ufeff\r\n")
        match = subject_re.match(line.strip())
        if match:
            subject = int(match.group(1))
            subject_label = (match.group(2) or "").strip()
            continue
        match = clip_re.match(line)
        if not match:
            continue
        subject_from_id = int(match.group(1))
        clip_num = int(match.group(2))
        current_subject = subject_from_id if subject is None else subject
        # Prefer the ID prefix if the surrounding heading is malformed.
        if current_subject != subject_from_id:
            current_subject = subject_from_id
        clip_id = f"{subject_from_id:02d}_{clip_num:02d}"
        folder = f"{subject_from_id:03d}"
        result.append({
            "id": clip_id,
            "subject": current_subject,
            "subjectLabel": subject_label,
            "description": match.group(3).strip(),
            "bvh": f"{BVH_ROOT}/{folder}/{clip_id}.bvh",
        })
    return result


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Parse CMU mocap index text")
    parser.add_argument("input", nargs="?", default=INDEX_URL)
    parser.add_argument("output", nargs="?")
    args = parser.parse_args(argv)
    data = {
        "v": 1,
        "source": args.input,
        "count": 0,
        "clips": parse_index(read_text(args.input)),
    }
    data["count"] = len(data["clips"])
    encoded = json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n"
    if args.output:
        pathlib.Path(args.output).parent.mkdir(parents=True, exist_ok=True)
        pathlib.Path(args.output).write_text(encoded, encoding="utf-8")
    else:
        sys.stdout.write(encoded)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
