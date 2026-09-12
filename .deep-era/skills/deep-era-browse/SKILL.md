---
name: deep-era-browse
description: Verify in a REAL browser via Playwright MCP. Use after serve is green — drive pages, read console, screenshot proof.
---

# Deep-Era Browse Skill

Seeing beats assuming — drive it like a user:

1. **Wire once**: `deep-era browser`, merge the Playwright entry into your client's MCP config.
2. **Serve first**: `deep-era serve` must be green (200 on probe) before opening any page.
3. **Drive**: navigate to each changed route. Click the critical path (login, submit, pay).
4. **Read console**: any console error = bug, even if the page "looks fine". Paste it into the fix.
5. **Screenshot**: capture the critical path AFTER the fix. Screenshot + probe-200 = proof.
6. **Close**: shut the browser and the dev server. Never leave processes running.
