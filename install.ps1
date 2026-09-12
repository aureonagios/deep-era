# Deep-Era one-command PC installer (Windows PowerShell).
# Run (paste ONE line in PowerShell):
#   irm https://raw.githubusercontent.com/aureonagios/deep-era/main/install.ps1 | iex
$ErrorActionPreference = "Stop"
try { $v = node --version } catch { Write-Error "Node.js 18+ required: https://nodejs.org"; exit 1 }
Write-Host "[deep-era] installing globally..."
npm i -g github:aureonagios/deep-era
Write-Host "[deep-era] wiring machine (MCP + skill)..."
deep-era global
Write-Host ""
Write-Host "[deep-era] PC ready. In ANY project run: deep-era onboard"
Write-Host "[deep-era] Give any AI the 1-prompt from https://github.com/aureonagios/deep-era#the-1-prompt--copy-paste-to-any-ai-done"
