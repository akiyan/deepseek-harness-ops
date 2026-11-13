#!/usr/bin/env bash
set -euo pipefail
repo=${1:?Usage: check-source.sh /absolute/path/to/deepseek-harness}
git -C "$repo" status --short --branch
git -C "$repo" rev-parse HEAD
git -C "$repo" log --oneline shiguredo/shiguredo..HEAD
