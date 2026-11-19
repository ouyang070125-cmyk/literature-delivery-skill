#!/usr/bin/env python3
"""Find locally stored PDFs that match reference DOIs or titles.

This is the "do I already have it?" step before downloading anything. It scans
the first pages and metadata of PDFs, so it also catches files with useless
names such as `1-s2.0-S0017931024011967-main.pdf`.

Examples:
  python scripts/scan-local-pdfs.py --root D:/papers --root ~/Downloads \
      --doi 10.1016/j.ijheatmasstransfer.2024.126367

  python scripts/scan-local-pdfs.py --manifest references.json \
      --root D:/papers --root ~/Downloads --json inventory.json
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path

try:
    import pypdf
except Exception as exc:  # pragma: no cover - dependency error path
    print(f"scan-local-pdfs: pypdf is required ({exc})", file=sys.stderr)
    print("Install it with: python -m pip install pypdf", file=sys.stderr)
    raise SystemExit(2)


def normalize(value: str) -> str:
    value = unicodedata.normalize("NFKC", value or "").lower()
    return re.sub(r"[^a-z0-9\u4e00-\u9fff]+", "", value)


def title_similarity(left: str, right: str) -> float:
    a, b = normalize(left), normalize(right)
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    if a in b or b in a:
        return min(len(a), len(b)) / max(len(a), len(b))
    return SequenceMatcher(None, a, b).ratio()


def load_targets(args: argparse.Namespace) -> list[dict]:
    targets: list[dict] = []
    if args.manifest:
        raw = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
        if isinstance(raw, dict):
            raw = raw.get("references", [])
        for index, item in enumerate(raw, 1):
            targets.append({
                "id": str(item.get("id") or f"ref{index}"),
                "doi": (item.get("doi") or "").strip(),
                "title": (item.get("title") or "").strip(),
            })
    if args.doi or args.title:
        targets.append({
            "id": args.id or "cli",
            "doi": (args.doi or "").strip(),
            "title": (args.title or "").strip(),
        })
    return targets


def iter_pdfs(roots: list[Path]):
    seen = set()
    for root in roots:
        if not root.exists():
            continue
        for path in root.rglob("*.pdf"):
            try:
                key = str(path.resolve()).lower()
            except OSError:
                key = str(path).lower()
            if key not in seen:
                seen.add(key)
                yield path


def inspect_pdf(path: Path, max_pages: int) -> dict:
    reader = pypdf.PdfReader(str(path))
    pages = len(reader.pages)
    text = "\n".join(
        (reader.pages[i].extract_text() or "")
        for i in range(min(max_pages, pages))
    )
    meta = " ".join(str(value) for value in (reader.metadata or {}).values())
    return {
        "path": str(path),
        "pages": pages,
        "size": path.stat().st_size,
        "text": text,
        "meta": meta,
    }


def match_target(target: dict, pdf: dict) -> list[str]:
    haystack = f"{pdf['text']}\n{pdf['meta']}"
    reasons = []
    doi = target.get("doi", "").lower()
    if doi and doi in haystack.lower():
        reasons.append("doi")
    title = target.get("title", "")
    if title:
        score = title_similarity(title, pdf["text"][:20000])
        if score >= 0.86:
            reasons.append(f"title:{score:.2f}")
    return reasons


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", action="append", default=[], help="directory to scan (repeatable)")
    parser.add_argument("--manifest", help="JSON list of {id, doi, title} references")
    parser.add_argument("--doi", help="single DOI to match")
    parser.add_argument("--title", help="single title to match")
    parser.add_argument("--id", help="id for the single --doi/--title target")
    parser.add_argument("--json", dest="json_out", help="write full JSON here ('-' for stdout)")
    parser.add_argument("--max-pages", type=int, default=2, help="pages to extract per PDF")
    args = parser.parse_args()

    roots = [Path(item).expanduser() for item in args.root] or [Path.cwd()]
    targets = load_targets(args)
    if not targets:
        print("scan-local-pdfs: provide --manifest or --doi/--title", file=sys.stderr)
        return 2

    pdfs = list(iter_pdfs(roots))
    print(f"scan-local-pdfs: {len(pdfs)} PDFs under {', '.join(str(r) for r in roots)}", file=sys.stderr)

    results = {t["id"]: [] for t in targets}
    failed = 0
    for index, path in enumerate(pdfs, 1):
        try:
            pdf = inspect_pdf(path, args.max_pages)
        except Exception:
            failed += 1
            continue
        for target in targets:
            reasons = match_target(target, pdf)
            if reasons:
                results[target["id"]].append({
                    "path": pdf["path"],
                    "pages": pdf["pages"],
                    "size": pdf["size"],
                    "matched_by": reasons,
                })
        if index % 50 == 0:
            print(f"scan-local-pdfs: {index}/{len(pdfs)}", file=sys.stderr)

    payload = {
        "roots": [str(root) for root in roots],
        "pdf_count": len(pdfs),
        "unreadable_pdf_count": failed,
        "targets": [
            {
                "id": target["id"],
                "doi": target["doi"],
                "title": target["title"],
                "matches": results[target["id"]],
            }
            for target in targets
        ],
        "missing": [t["id"] for t in targets if not results[t["id"]]],
    }

    if args.json_out == "-":
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        for target in payload["targets"]:
            if target["matches"]:
                print(f"FOUND {target['id']} ({len(target['matches'])})")
                for match in target["matches"]:
                    print(f"  {match['path']} pages={match['pages']} size={match['size']} by={','.join(match['matched_by'])}")
            else:
                print(f"MISSING {target['id']}")
        if args.json_out:
            Path(args.json_out).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
            print(f"WROTE {args.json_out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
