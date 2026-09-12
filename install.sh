#!/bin/sh
# Deep-Era one-command PC installer (macOS/Linux).
# Run (paste ONE line in terminal):
#   curl -fsSL https://raw.githubusercontent.com/aureonagios/deep-era/main/install.sh | sh
set -e
command -v node >/dev/null || { echo "Node.js 18+ required: https://nodejs.org"; exit 1; }
echo "[deep-era] installing globally..."
npm i -g github:aureonagios/deep-era
echo "[deep-era] wiring machine (MCP + skill)..."
deep-era global
echo ""
echo "[deep-era] PC ready. In ANY project run: deep-era onboard"
echo "[deep-era] Give any AI the 1-prompt from https://github.com/aureonagios/deep-era#the-1-prompt--copy-paste-to-any-ai-done"
