#!/usr/bin/env python3
"""Extract frontend API guide artifacts from the local backend guide files.

Usage:
  python3 backend/api/scripts/extract_backend_api_guides.py
  python3 backend/api/scripts/extract_backend_api_guides.py --backend-root backend/constructionHelperBackendMain
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_BACKEND_ROOT = SCRIPT_DIR.parents[1] / "constructionHelperBackendMain"
DEFAULT_OUTPUT_DIR = SCRIPT_DIR.parents[0] / "api-list"
SECTION_RE = re.compile(r"^##\s+(?P<title>.+?)\s+\(`(?P<base_path>/[^`]+)`\)")
INDEXED_ROW_RE = re.compile(
    r"^\|\s*(?P<index>\d+)\s*\|\s*(?P<method>[A-Z]+)\s*\|\s*`(?P<endpoint>[^`]+)`\s*\|"
)
GUIDE_ROW_RE = re.compile(
    r"^\|\s*(?P<method>[A-Z]+)\s*\|\s*`(?P<endpoint>[^`]+)`\s*\|\s*(?P<description>[^|]+?)\s*\|"
)
DETAIL_FILE_RE = re.compile(r"^(?P<index>\d+)_(?P<name>.+)\.json$")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extract API endpoint and guide JSON artifacts from backend/constructionHelperBackendMain.",
    )
    parser.add_argument(
        "--backend-root",
        default=str(DEFAULT_BACKEND_ROOT),
        help=f"Backend root directory. Defaults to {DEFAULT_BACKEND_ROOT}",
    )
    parser.add_argument(
        "--output-dir",
        default=str(DEFAULT_OUTPUT_DIR),
        help=f"Output directory. Defaults to {DEFAULT_OUTPUT_DIR}",
    )
    return parser.parse_args()


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def endpoint_action(endpoint: str) -> str:
    parts = [part for part in endpoint.split("/") if part and not part.startswith("{")]
    return parts[-1] if parts else endpoint.strip("/")


def parse_endpoints(markdown_path: Path) -> list[dict[str, Any]]:
    endpoints: list[dict[str, Any]] = []
    current_section: dict[str, str] | None = None
    pending_description: str | None = None
    in_table = False

    for line in markdown_path.read_text(encoding="utf-8").splitlines():
        section_match = SECTION_RE.match(line)
        if section_match:
            current_section = {
                "name": section_match.group("title").strip(),
                "basePath": section_match.group("base_path").strip(),
            }
            pending_description = None
            in_table = False
            continue

        if not current_section:
            continue

        stripped = line.strip()
        if stripped.startswith("|"):
            in_table = True
            indexed_match = INDEXED_ROW_RE.match(stripped)
            if indexed_match:
                endpoints.append(
                    {
                        "index": int(indexed_match.group("index")),
                        "method": indexed_match.group("method"),
                        "endpoint": indexed_match.group("endpoint"),
                        "section": current_section["name"],
                        "basePath": current_section["basePath"],
                        "description": pending_description or "",
                    }
                )
                continue

            guide_match = GUIDE_ROW_RE.match(stripped)
            if guide_match and "`" in stripped:
                endpoints.append(
                    {
                        "index": None,
                        "method": guide_match.group("method"),
                        "endpoint": guide_match.group("endpoint"),
                        "section": current_section["name"],
                        "basePath": current_section["basePath"],
                        "description": guide_match.group("description").strip(),
                    }
                )
            continue

        if stripped and not in_table:
            pending_description = stripped

    return endpoints


def collect_detail_files(
    guide_dir: Path,
) -> tuple[dict[int, list[Path]], dict[tuple[str, str], Path], list[dict[str, str]]]:
    detail_files_by_index: dict[int, list[Path]] = defaultdict(list)
    detail_files_by_method_path: dict[tuple[str, str], Path] = {}
    invalid_json_files: list[dict[str, str]] = []

    for path in sorted(guide_dir.rglob("*.json")):
        match = DETAIL_FILE_RE.match(path.name)
        if not match:
            continue

        try:
            detail = read_json(path)
        except json.JSONDecodeError as error:
            invalid_json_files.append(
                {
                    "sourcePath": str(path),
                    "error": str(error),
                }
            )
            continue

        detail_files_by_index[int(match.group("index"))].append(path)
        method = detail.get("method")
        detail_path = detail.get("path")
        if isinstance(method, str) and isinstance(detail_path, str):
            detail_files_by_method_path[(method.upper(), detail_path)] = path

    return detail_files_by_index, detail_files_by_method_path, invalid_json_files


def select_detail_file(
    endpoint: dict[str, Any],
    candidates: list[Path],
    detail_files_by_method_path: dict[tuple[str, str], Path],
) -> tuple[Path | None, str]:
    exact_match = detail_files_by_method_path.get((endpoint["method"], endpoint["endpoint"]))
    if exact_match:
        return exact_match, "method-and-path"

    if not candidates:
        return None, "missing"

    action = endpoint_action(endpoint["endpoint"])
    action_matches = [
        path for path in candidates if path.stem.split("_", 1)[-1] == action
    ]
    if len(action_matches) == 1:
        return action_matches[0], "index-and-action"
    if len(candidates) == 1:
        return candidates[0], "index-only"
    return None, "ambiguous"


def copy_detail_files(guide_dir: Path, output_dir: Path) -> dict[str, str]:
    detail_output_dir = output_dir / "details"
    if detail_output_dir.exists():
        shutil.rmtree(detail_output_dir)

    copied_paths: dict[str, str] = {}
    for source_path in sorted(guide_dir.rglob("*.json")):
        relative_path = source_path.relative_to(guide_dir)
        target_path = detail_output_dir / relative_path
        target_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source_path, target_path)
        copied_paths[str(source_path)] = str(target_path)
    return copied_paths


def build_index(
    endpoints: list[dict[str, Any]],
    detail_files_by_index: dict[int, list[Path]],
    detail_files_by_method_path: dict[tuple[str, str], Path],
    copied_paths: dict[str, str],
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    index_counts = Counter(
        endpoint["index"] for endpoint in endpoints if endpoint["index"] is not None
    )
    duplicate_indices = sorted(index for index, count in index_counts.items() if count > 1)

    indexed_endpoints: list[dict[str, Any]] = []
    report = {
        "endpointCount": len(endpoints),
        "indexedEndpointCount": sum(1 for endpoint in endpoints if endpoint["index"] is not None),
        "duplicateIndices": duplicate_indices,
        "missingDetailEndpoints": [],
        "ambiguousDetailEndpoints": [],
        "indexOnlyDetailMatches": [],
        "methodPathDetailMatches": 0,
        "unusedDetailFiles": [],
    }
    used_detail_files: set[str] = set()

    for endpoint in endpoints:
        item = dict(endpoint)
        index = endpoint["index"]
        candidates = detail_files_by_index.get(index, []) if index is not None else []
        selected_detail, detail_match = select_detail_file(
            endpoint,
            candidates,
            detail_files_by_method_path,
        )
        item["detailMatch"] = detail_match
        item["detailFile"] = None
        item["detailSourceFile"] = None
        item["detailCandidates"] = [str(path) for path in candidates]

        if selected_detail:
            selected_source = str(selected_detail)
            item["detailSourceFile"] = selected_source
            item["detailFile"] = copied_paths.get(selected_source)
            used_detail_files.add(selected_source)

        if detail_match == "missing" and index is not None:
            report["missingDetailEndpoints"].append(item)
        elif detail_match == "ambiguous":
            report["ambiguousDetailEndpoints"].append(item)
        elif detail_match == "index-only":
            report["indexOnlyDetailMatches"].append(item)
        elif detail_match == "method-and-path":
            report["methodPathDetailMatches"] += 1

        indexed_endpoints.append(item)

    for candidates in detail_files_by_index.values():
        for detail_file in candidates:
            source = str(detail_file)
            if source not in used_detail_files:
                report["unusedDetailFiles"].append(source)

    return indexed_endpoints, report


def main() -> int:
    args = parse_args()
    backend_root = Path(args.backend_root)
    output_dir = Path(args.output_dir)
    guide_dir = backend_root / "docs" / "GUIDE"
    endpoints_markdown = guide_dir / "API_ENDPOINTS.md"

    if not endpoints_markdown.exists():
        print(f"API endpoints markdown not found: {endpoints_markdown}", file=sys.stderr)
        return 1

    endpoints = parse_endpoints(endpoints_markdown)
    detail_files_by_index, detail_files_by_method_path, invalid_json_files = collect_detail_files(guide_dir)
    copied_paths = copy_detail_files(guide_dir, output_dir)
    indexed_endpoints, report = build_index(
        endpoints,
        detail_files_by_index,
        detail_files_by_method_path,
        copied_paths,
    )
    report["invalidJsonFiles"] = invalid_json_files

    write_json(output_dir / "endpoints.json", endpoints)
    write_json(output_dir / "api-guide-index.json", {"endpoints": indexed_endpoints})
    write_json(output_dir / "extraction-report.json", report)

    print(f"Parsed endpoints: {report['endpointCount']}")
    print(f"Copied guide JSON files: {len(copied_paths)}")
    print(f"Method/path detail matches: {report['methodPathDetailMatches']}")
    print(f"Duplicate indices: {len(report['duplicateIndices'])}")
    print(f"Missing detail matches: {len(report['missingDetailEndpoints'])}")
    print(f"Ambiguous detail matches: {len(report['ambiguousDetailEndpoints'])}")
    print(f"Output: {output_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
