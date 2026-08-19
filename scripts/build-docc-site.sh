#!/usr/bin/env bash
set -euo pipefail

output_path="${1:-build/SceneKitToRealityKit.doccarchive}"
mkdir -p "$(dirname "$output_path")"

xcrun docc convert Tutorials/SceneKitToRealityKit.docc \
  --fallback-display-name "씬킷에서 리얼리티킷으로" \
  --fallback-bundle-identifier "com.techmap.scenekittorealitykit" \
  --fallback-bundle-version "1.0" \
  --hosting-base-path /2026-C5-T10-Enzo \
  --output-path "$output_path"

test -f "$output_path/index.html"
test -f "$output_path/data/tutorials/scenekittorealitykit.json"
