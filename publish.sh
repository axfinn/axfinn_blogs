#!/bin/bash
# 发布脚本：构建 Hugo 并同步到 GitHub Pages
set -e

BLOG_DIR="/home/node/.openclaw/workspace/axfinn_blogs"
HUGO_BIN="/home/node/.openclaw/workspace/tools/bin/hugo"
DEPLOY_DIR="/home/node/.openclaw/workspace/axfinn.github.io"
TODAY=$(date +"%Y-%m-%d")

echo "🔨 构建 Hugo..."
cd "$BLOG_DIR"
$HUGO_BIN --config config.toml

echo "📦 同步到部署目录..."
rm -rf "$DEPLOY_DIR"/*
cp -rp public/* "$DEPLOY_DIR/"

echo "🚀 推送到 GitHub Pages..."
cd "$DEPLOY_DIR"
git add -A
git commit -m "chore: 发布 ${TODAY}" || echo "Nothing to commit"
git push origin main

echo "✅ 发布完成!"
