#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/githooks/post-commit"
DST="$(git -C "$ROOT" rev-parse --git-dir)/hooks/post-commit"

cp "$SRC" "$DST"
chmod +x "$DST"
echo "已安装 post-commit 钩子：$DST"
echo "之后每次执行 git commit，会自动 git push。"
