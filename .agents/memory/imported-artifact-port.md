---
name: Imported artifact port alignment
description: Port settings that affect imported Replit web artifacts and their Vite workflows.
---

Imported web artifacts may contain an artifact-level `PORT` and `localPort` that override the app's Vite defaults and the workflow wait port. These declarations must agree, and Replit webview services should use port 5000.

**Why:** An imported project can log a healthy Vite server while the workflow still times out if the artifact metadata retains an older port such as 5173.

**How to apply:** When setup logs show Vite listening on a non-webview port, inspect and align the artifact metadata, workflow wait port, and `.replit` port forwarding before changing application code.