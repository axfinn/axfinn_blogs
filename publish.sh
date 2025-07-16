#!/bin/bash
# Exit immediately if a command exits with a non-zero status.
set -e

echo "INFO: Building site with Hugo..."
hugo -D

echo "INFO: Deploying to axfinn.github.io..."
# The target directory for the built site.
DEPLOY_DIR="../axfinn.github.io"

# Clean and copy new files.
rm -rf ${DEPLOY_DIR}/*
cp -rp ./public/* ${DEPLOY_DIR}/

# Commit and push changes.
cd ${DEPLOY_DIR}
echo "INFO: Committing changes..."
git add .
# Use a consistent commit message format.
git commit -m "chore: Publish site updates at $(date +'%Y-%m-%d %H:%M:%S')"
echo "INFO: Pushing to remote..."
git push origin master

echo "INFO: Deployment successful."
