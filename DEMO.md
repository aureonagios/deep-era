# AI Deep Era — 5-Minute Demo Script (video + live)

Goal: prove karo andha AI vs Deep-Era AI ka farq, 5 minute me.

## Act 1 (0:00-1:00) — Masla dikhao
1. Kisi bhi project me AI se kaho: "login page banao" (bina Deep Era).
2. Dikhao: AI ne files banayi, magar test nahi chalaya, proof nahi diya.
3. Bolo: "Pata nahi kya kiya, dar lag raha hai — yehi andha dev hai."

## Act 2 (1:00-2:30) — Install (1 command)
```bash
npx deep-era init
node bin/cli.js setup-ide   # Cursor/Copilot/Antigravity/Windsurf/OpenCode me MCP add
```
Dikhao: `AGENTS.md` + `.deep-era/map.json` bana. Bolo: "Ab ye rules 50+ IDEs me auto-lagu."

## Act 3 (2:30-4:00) — Wahi kaam, ab aankhon ke saath
AI ko ye 1 prompt do:
```
AGENTS.md parho aur uske rules follow karo. Kaam se pehle snapshot lo,
get_context se relevant files lo, har step log_step me likho, akhir me
verify_work + security_check + audit_work chalao. Proof do.
```
Dikhao: `.deep-era/logs/steps.log` live bharta hai — har step nazar ata hai.

## Act 4 (4:00-5:00) — Check (30 second)
```bash
node bin/cli.js check
```
- PASS dikhao → "accept karo".
- Phir `tests/fixtures/bad-project` pe chalao → SQL-injection + nakli win-rate claim + unpinned dep pakra jata hai → "andha AI pass kar deta, Deep Era pakarta hai."

## Closing line
"Andhe AI dev ko aankhein do — `npx deep-era init`."

## Publish (maintainer only)
```bash
npm login
npm publish
```
