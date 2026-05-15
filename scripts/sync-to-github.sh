#!/usr/bin/env bash
# 一键：暂存问卷相关文件 → 有改动则提交 → 推送到 GitHub
# 用法：在项目根目录执行  ./scripts/sync-to-github.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

git add index.html README.md 2>/dev/null || true
git add -u

if git diff --staged --quiet; then
  echo "没有需要提交的暂存改动。"
else
  git commit -m "Update ($(date '+%Y-%m-%d %H:%M'))"
fi

git push -u origin "$(git branch --show-current)"
echo "已与 GitHub 同步（或已是最新）。"
