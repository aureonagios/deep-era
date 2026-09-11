---
name: deep-era-serve
description: Run-observe loop: start the app, probe its endpoints, watch the logs, shut down. Use after writing any runnable code. Seeing beats assuming.
---

# Deep-Era Serve Skill

"It works" without running it is a lie. Prove it runs:

1. **Start**: `deep-era serve` — detects the start command, runs it, observes.
2. **Watch**: read the startup log tail. Any Error/Traceback/EADDRINUSE = stop, fix first.
3. **Probe**: hit the detected local URL. Non-2xx = the app is up but broken — fix the route.
4. **No URL?** The app prints nothing listenable — add a startup log line with the port, re-run.
5. **Shut down**: serve kills the process. Never leave dev servers running.
6. **Proof**: paste the probe status line (GET url -> 200) into the final report.
