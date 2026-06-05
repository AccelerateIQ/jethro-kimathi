#!/bin/bash
set -e
# Ensure /home data files exist (Azure App Service — /home persists across restarts)
mkdir -p /home 2>/dev/null || true
[ -f /home/posts.json ]    || echo '[]' > /home/posts.json
[ -f /home/settings.json ] || echo '{}' > /home/settings.json
[ -f /home/contacts.json ] || echo '[]' > /home/contacts.json
node server/index.js
