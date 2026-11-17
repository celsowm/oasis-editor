#!/usr/bin/env python3
"""Fetch exact ECMA publications, verify archive hashes and extract only XSDs."""
import argparse
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import urllib.request
import zipfile

LIMIT = 128 * 1024 * 1024
PINS = Path(__file__).with_name("ecma-sources.json")

def sha(data):
    return hashlib.sha256(data).hexdigest()

def read_bounded(stream, limit=LIMIT):
    data = stream.read(limit + 1)
    if len(data) > limit:
        raise ValueError("Archive or entry exceeds size limit")
    return data

def extract(outer, pin, out):
    if sha(outer) != pin["sha256"]:
        raise ValueError("Archive checksum mismatch: " + pin["archive"])
    with zipfile.ZipFile(io.BytesIO(outer)) as z:
        matches = [i for i in z.infolist() if PurePosixPath(i.filename).name == pin["nested"]]
        if len(matches) != 1:
            raise ValueError("Missing/ambiguous nested archive: " + pin["nested"])
        if matches[0].file_size > LIMIT:
            raise ValueError("Nested archive too large")
        with z.open(matches[0]) as stream:
            inner = read_bounded(stream)
    entries = []
    seen = set()
    with zipfile.ZipFile(io.BytesIO(inner)) as z:
        for i in sorted(z.infolist(), key=lambda x: x.filename):
            name = PurePosixPath(i.filename)
            if i.is_dir() or name.suffix.lower() != ".xsd":
                continue
            if name.is_absolute() or ".." in name.parts or "\\" in i.filename or ":" in i.filename:
                raise ValueError("Unsafe schema path")
            rel = Path(pin["profile"], name.name)
            if rel in seen or i.file_size > 4 * 1024 * 1024:
                raise ValueError("Duplicate or oversized schema")
            seen.add(rel)
            with z.open(i) as stream:
                data = read_bounded(stream, 4 * 1024 * 1024)
            target = out / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            entries.append({"path": rel.as_posix(), "profile": pin["profile"],
                "edition": pin["edition"], "source": pin["url"],
                "license": "https://ecma-international.org/policies/by-ipr/ecma-text-copyright-policy/",
                "sha256": sha(data), "archiveSha256": pin["sha256"]})
    if not entries:
        raise ValueError("No schemas extracted")
    return entries

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="test-results/ooxml/ecma")
    parser.add_argument("--archives", help="Optional directory of previously downloaded official ZIPs")
    args = parser.parse_args()
    pins = json.loads(PINS.read_text())
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    manifest = out / "manifest.json"
    manifest.unlink(missing_ok=True)
    entries = []
    for pin in pins["archives"]:
        if args.archives:
            with (Path(args.archives) / pin["archive"]).open("rb") as stream:
                data = read_bounded(stream)
        else:
            with urllib.request.urlopen(pin["url"], timeout=60) as stream:
                data = read_bounded(stream)
        entries.extend(extract(data, pin, out))
    manifest.write_text(json.dumps({"version":1, "files":entries}, indent=2) + "\n")
    print(f"Verified {len(entries)} XSDs from {len(pins['archives'])} pinned publications: {manifest}")

if __name__ == "__main__":
    main()
